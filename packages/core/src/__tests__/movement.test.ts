import { describe, it, expect } from 'vitest';
import { simulateMove, MoveState, resolvePlayerCollisions } from '../sim/movement';
import { TileType, GameState } from '../types';
import { PLAYER_MAX_SPEED, PLAYER_ACCEL, PLAYER_FRICTION, ICE_ACCEL, ICE_FRICTION, PLAYER_RADIUS } from '../constants';

describe('movement V2 (B02)', () => {
  const width = 5;
  const height = 5;
  const tiles: TileType[] = new Array(width * height).fill('floor');
  
  for (let x = 0; x < width; x++) {
    tiles[0 * width + x] = 'wall';
    tiles[(height - 1) * width + x] = 'wall';
  }
  for (let y = 0; y < height; y++) {
    tiles[y * width + 0] = 'wall';
    tiles[y * width + (width - 1)] = 'wall';
  }

  const bigWidth = 20;
  const bigHeight = 20;
  const bigTiles: TileType[] = new Array(bigWidth * bigHeight).fill('floor');

  it('Giữ phím phải từ đứng yên: sau thời gian t đạt tốc độ tối đa; không vượt quá', () => {
    let state: MoveState = { x: 10, y: 10, vx: 0, vy: 0, fx: 0, fy: 1, dashT: 0, dashCd: 0 };
    const dt = 1/30;
    let ticks = 0;
    while (state.vx < PLAYER_MAX_SPEED && ticks < 100) {
      state = simulateMove(state, 1, 0, false, bigTiles, bigWidth, bigHeight, dt);
      ticks++;
    }
    const expectedTime = PLAYER_MAX_SPEED / PLAYER_ACCEL;
    expect(ticks * dt).toBeCloseTo(expectedTime, 1);
    expect(state.vx).toBeCloseTo(PLAYER_MAX_SPEED, 3);
    
    // Tiếp tục giữ không vượt quá
    state = simulateMove(state, 1, 0, false, bigTiles, bigWidth, bigHeight, dt);
    expect(state.vx).toBe(PLAYER_MAX_SPEED);
  });

  it('Thả phím: dừng hẳn sau PLAYER_MAX_SPEED/PLAYER_FRICTION giây', () => {
    let state: MoveState = { x: 10, y: 10, vx: PLAYER_MAX_SPEED, vy: 0, fx: 1, fy: 0, dashT: 0, dashCd: 0 };
    const dt = 1/30;
    let ticks = 0;
    while (state.vx > 0 && ticks < 100) {
      state = simulateMove(state, 0, 0, false, bigTiles, bigWidth, bigHeight, dt);
      ticks++;
    }
    const expectedTime = PLAYER_MAX_SPEED / PLAYER_FRICTION;
    expect(ticks * dt).toBeCloseTo(expectedTime, 1);
    expect(state.vx).toBe(0);
  });

  it('Trên băng: tăng tốc chậm hơn, trượt xa hơn (so sánh quãng đường dừng ≥ 5 lần sàn thường)', () => {
    // Sàn thường
    let sNormal: MoveState = { x: 10, y: 10, vx: PLAYER_MAX_SPEED, vy: 0, fx: 1, fy: 0, dashT: 0, dashCd: 0 };
    let dNormal = 0;
    while (sNormal.vx > 0) {
      const oldX = sNormal.x;
      sNormal = simulateMove(sNormal, 0, 0, false, bigTiles, bigWidth, bigHeight, 1/30);
      dNormal += (sNormal.x - oldX);
    }

    // Băng
    const iceTiles = [...bigTiles];
    iceTiles.fill('ice');
    let sIce: MoveState = { x: 10, y: 10, vx: PLAYER_MAX_SPEED, vy: 0, fx: 1, fy: 0, dashT: 0, dashCd: 0 };
    let dIce = 0;
    let ticks = 0;
    while (sIce.vx > 0 && ticks < 1000) {
      const oldX = sIce.x;
      sIce = simulateMove(sIce, 0, 0, false, iceTiles, bigWidth, bigHeight, 1/30);
      dIce += (sIce.x - oldX);
      ticks++;
    }

    expect(dIce).toBeGreaterThanOrEqual(5 * dNormal);
  });

  it('Đổi hướng đột ngột không teleport: vận tốc liên tục', () => {
    let state: MoveState = { x: 10, y: 10, vx: PLAYER_MAX_SPEED, vy: 0, fx: 1, fy: 0, dashT: 0, dashCd: 0 };
    state = simulateMove(state, -1, 0, false, bigTiles, bigWidth, bigHeight, 1/30);
    // Vận tốc chỉ giảm 1 lượng accel, chưa đổi hướng ngay
    expect(state.vx).toBeGreaterThan(0);
    expect(state.vx).toBeLessThan(PLAYER_MAX_SPEED);
  });

  it('Hai người chạy ngược chiều vào nhau: tách ra, không chồng nhau', () => {
    const mockState = {
      players: [
        { id: '1', x: 2, y: 2, vx: PLAYER_MAX_SPEED, vy: 0, fx: 1, fy: 0, dashT: 0, dashCd: 0, throwCd: 0, ackSeq: 0, held: null, acting: false },
        { id: '2', x: 2.2, y: 2, vx: -PLAYER_MAX_SPEED, vy: 0, fx: -1, fy: 0, dashT: 0, dashCd: 0, throwCd: 0, ackSeq: 0, held: null, acting: false }
      ],
      tiles, width, height
    } as unknown as GameState;

    resolvePlayerCollisions(mockState);
    const p1 = mockState.players[0]!;
    const p2 = mockState.players[1]!;
    const dist = Math.abs(p1.x - p2.x);
    expect(dist).toBeGreaterThanOrEqual(2 * PLAYER_RADIUS - 1e-6);
  });

  it('Không bao giờ vào tile không walkable', () => {
    // Test pit
    const pitTiles = [...tiles];
    pitTiles[2 * width + 3] = 'pit'; // (3, 2) is pit
    
    let state: MoveState = { x: 2.5, y: 2.5, vx: PLAYER_MAX_SPEED, vy: 0, fx: 1, fy: 0, dashT: 0, dashCd: 0 };
    for (let i = 0; i < 30; i++) {
      state = simulateMove(state, 1, 0, false, pitTiles, width, height, 1/30);
    }
    expect(state.x).toBeLessThanOrEqual(3 - PLAYER_RADIUS + 1e-6);
  });

  it('Đường chéo vẫn không nhanh hơn', () => {
    let s1: MoveState = { x: 10, y: 10, vx: 0, vy: 0, fx: 1, fy: 0, dashT: 0, dashCd: 0 };
    let s2: MoveState = { x: 10, y: 10, vx: 0, vy: 0, fx: 1, fy: 1, dashT: 0, dashCd: 0 };
    for (let i = 0; i < 30; i++) {
      s1 = simulateMove(s1, 1, 0, false, bigTiles, bigWidth, bigHeight, 1/30);
      s2 = simulateMove(s2, 1, 1, false, bigTiles, bigWidth, bigHeight, 1/30);
    }
    const d1 = s1.x - 10;
    const dx2 = s2.x - 10;
    const dy2 = s2.y - 10;
    const d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
    expect(d2).toBeCloseTo(d1, 3);
  });
});
