import { describe, it, expect } from 'vitest';
import { simulateMove, MoveState, resolvePlayerCollisions } from '../sim/movement';
import { GameState, TileType } from '../types';
import { step } from '../sim/step';
import {
  PLAYER_MAX_SPEED,
  SPRINT_MULTIPLIER,
  SPRINT_MAX,
  SPRINT_DRAIN_RATE,
  SPRINT_REGEN_RATE,
  SPRINT_REGEN_DELAY,
  SPRINT_RESTART_THRESHOLD
} from '../constants';

describe('Sprint Mechanics (Bảng chân trị)', () => {
  const width = 50;
  const height = 50;
  const tiles: TileType[] = new Array(width * height).fill('floor');
  for (let i = 0; i < width; i++) {
    tiles[0 * width + i] = 'wall';
    tiles[(height - 1) * width + i] = 'wall';
    tiles[i * width + 0] = 'wall';
    tiles[i * width + (width - 1)] = 'wall';
  }

  it('Giữ Shift khi đang đứng yên: thanh không giảm, không sprint', () => {
    let state: MoveState = {
      x: 10, y: 10, vx: 0, vy: 0, fx: 1, fy: 0,
      dashT: 0, dashCd: 0,
      sprintEnergy: SPRINT_MAX, sprintCooldown: 0, sprintExhausted: false
    };

    // Đứng yên (mx = 0, my = 0), giữ Shift (dash = true) trong 1s (30 ticks)
    for (let i = 0; i < 30; i++) {
      state = simulateMove(state, 0, 0, true, tiles, width, height, 1 / 30);
    }

    // Thanh không giảm, không sprint
    expect(state.sprintEnergy).toBe(SPRINT_MAX);
    expect(state.dashT).toBe(0);
    expect(state.vx).toBe(0);
    expect(state.vy).toBe(0);
  });

  it('Giữ Shift + di chuyển từ đầy (SPRINT_MAX): sau 1s còn SPRINT_MAX - 1.0; sprint tốc độ ≈ 1.25× (±5%)', () => {
    let state: MoveState = {
      x: 10, y: 10, vx: 0, vy: 0, fx: 1, fy: 0,
      dashT: 0, dashCd: 0,
      sprintEnergy: SPRINT_MAX, sprintCooldown: 0, sprintExhausted: false
    };

    // Di chuyển (mx = 1, my = 0), giữ Shift (dash = true) trong 1s (30 ticks)
    // Công thức: sprintEnergy_sau_1s = SPRINT_MAX - (1.0s * SPRINT_DRAIN_RATE) = 2.0 - 1.0 = 1.0
    for (let i = 0; i < 30; i++) {
      state = simulateMove(state, 1, 0, true, tiles, width, height, 1 / 30);
    }

    // Sau 1s còn SPRINT_MAX - 1.0 (với SPRINT_MAX = 2.0, SPRINT_DRAIN_RATE = 1.0 -> 2.0 - 1.0 = 1.0)
    expect(state.sprintEnergy).toBeCloseTo(SPRINT_MAX - 1.0 * SPRINT_DRAIN_RATE, 2);

    // Sprint tốc độ ≈ SPRINT_MULTIPLIER (±5%)
    const expectedSpeed = PLAYER_MAX_SPEED * SPRINT_MULTIPLIER;
    expect(state.vx).toBeGreaterThanOrEqual(expectedSpeed * 0.95);
    expect(state.vx).toBeLessThanOrEqual(expectedSpeed * 1.05);
  });

  it('Giữ Shift liên tục từ đầy (SPRINT_MAX): đến 0 thì sprint dừng ở đúng thời điểm (±1 tick), tốc độ về bình thường', () => {
    let state: MoveState = {
      x: 10, y: 10, vx: 0, vy: 0, fx: 1, fy: 0,
      dashT: 0, dashCd: 0,
      sprintEnergy: SPRINT_MAX, sprintCooldown: 0, sprintExhausted: false
    };

    // Công thức tính số tick để cạn kiệt từ đầy:
    // drainDuration = SPRINT_MAX / SPRINT_DRAIN_RATE = 2.0s / 1.0 = 2.0s
    // drainTicks = drainDuration * 30 ticks/s = 2.0 * 30 = 60 ticks
    const drainTicks = Math.round((SPRINT_MAX / SPRINT_DRAIN_RATE) * 30);

    // Trước tick cạn kiệt (drainTicks - 1 ticks): vẫn còn năng lượng, vẫn đang sprint
    for (let i = 0; i < drainTicks - 1; i++) {
      state = simulateMove(state, 1, 0, true, tiles, width, height, 1 / 30);
    }
    expect(state.sprintEnergy).toBeGreaterThan(0);
    expect(state.dashT).toBeGreaterThan(0);
    expect(state.sprintExhausted).toBe(false);

    // Tick thứ drainTicks: năng lượng cạn về 0, sprint dừng ngay
    state = simulateMove(state, 1, 0, true, tiles, width, height, 1 / 30);
    expect(state.sprintEnergy).toBe(0);
    expect(state.dashT).toBe(0);
    expect(state.sprintExhausted).toBe(true);

    // Sau 1-2 ticks tiếp theo: tốc độ giảm về PLAYER_MAX_SPEED
    state = simulateMove(state, 1, 0, true, tiles, width, height, 1 / 30);
    state = simulateMove(state, 1, 0, true, tiles, width, height, 1 / 30);
    expect(state.vx).toBeCloseTo(PLAYER_MAX_SPEED, 2);
  });

  it('Sau khi về 0, giữ Shift: không sprint cho đến khi thanh ≥ 0.2 (sau khoảng 0.2s hồi)', () => {
    // Trạng thái vừa cạn kiệt năng lượng về 0
    let state: MoveState = {
      x: 10, y: 10, vx: PLAYER_MAX_SPEED, vy: 0, fx: 1, fy: 0,
      dashT: 0, dashCd: 0,
      sprintEnergy: 0, sprintCooldown: 0, sprintExhausted: true
    };

    // Tiếp tục giữ Shift + di chuyển
    // Trong 5 ticks đầu (t < 0.2s, năng lượng < 0.2): không sprint
    for (let i = 0; i < 5; i++) {
      state = simulateMove(state, 1, 0, true, tiles, width, height, 1 / 30);
      expect(state.sprintEnergy).toBeLessThan(SPRINT_RESTART_THRESHOLD);
      expect(state.dashT).toBe(0);
      expect(state.sprintExhausted).toBe(true);
    }

    // Tick thứ 6 (t = 6/30 = 0.2s hồi): năng lượng hồi lên >= 0.2 (SPRINT_RESTART_THRESHOLD)
    state = simulateMove(state, 1, 0, true, tiles, width, height, 1 / 30);
    expect(state.sprintEnergy).toBeGreaterThanOrEqual(SPRINT_RESTART_THRESHOLD - 1e-5);
    expect(state.sprintExhausted).toBe(false);

    // Tick tiếp theo có thể sprint lại vì đã vượt ngưỡng 0.2
    state = simulateMove(state, 1, 0, true, tiles, width, height, 1 / 30);
    expect(state.dashT).toBeGreaterThan(0);
  });

  it('Nhả Shift: sau 0.5s thanh bắt đầu hồi, đầy sau khoảng 2s (SPRINT_MAX / SPRINT_REGEN_RATE); không vượt SPRINT_MAX', () => {
    // Đang sprint từ SPRINT_MAX tiêu hao 1.0s (30 ticks)
    // Công thức: energy = SPRINT_MAX - (1.0s * SPRINT_DRAIN_RATE) = 2.0 - 1.0 = 1.0
    let state: MoveState = {
      x: 10, y: 10, vx: 0, vy: 0, fx: 1, fy: 0,
      dashT: 0, dashCd: 0,
      sprintEnergy: SPRINT_MAX, sprintCooldown: 0, sprintExhausted: false
    };
    for (let i = 0; i < 30; i++) {
      state = simulateMove(state, 1, 0, true, tiles, width, height, 1 / 30);
    }
    const currentEnergy = SPRINT_MAX - 1.0 * SPRINT_DRAIN_RATE;
    expect(state.sprintEnergy).toBeCloseTo(currentEnergy, 2);

    // Nhả Shift (dash = false)
    // Trong SPRINT_REGEN_DELAY = 0.5s (15 ticks): thanh chưa hồi do trễ SPRINT_REGEN_DELAY
    const delayTicks = Math.round(SPRINT_REGEN_DELAY * 30);
    for (let i = 0; i < delayTicks; i++) {
      state = simulateMove(state, 1, 0, false, tiles, width, height, 1 / 30);
      expect(state.sprintEnergy).toBeCloseTo(currentEnergy, 2);
    }

    // Sau delayTicks (0.5s) và hết trễ, thanh bắt đầu hồi phục
    state = simulateMove(state, 1, 0, false, tiles, width, height, 1 / 30);
    state = simulateMove(state, 1, 0, false, tiles, width, height, 1 / 30);
    expect(state.sprintEnergy).toBeGreaterThan(1.0);

    // Hồi phục phần còn lại (1.0 đơn vị): regenDuration = (SPRINT_MAX - currentEnergy) / SPRINT_REGEN_RATE = 1.0s (30 ticks)
    // Chạy thêm 60 ticks để đảm bảo hồi đầy về SPRINT_MAX
    for (let i = 0; i < 60; i++) {
      state = simulateMove(state, 1, 0, false, tiles, width, height, 1 / 30);
    }
    // Đầy và không vượt SPRINT_MAX
    expect(state.sprintEnergy).toBe(SPRINT_MAX);

    // Tiếp tục chạy thêm để đảm bảo không vượt SPRINT_MAX
    for (let i = 0; i < 30; i++) {
      state = simulateMove(state, 1, 0, false, tiles, width, height, 1 / 30);
    }
    expect(state.sprintEnergy).toBe(SPRINT_MAX);
  });

  it('Sprint ở mức năng lượng dở dang rồi nhả và bấm lại: sprint ngay (không cần hồi đầy)', () => {
    let state: MoveState = {
      x: 10, y: 10, vx: PLAYER_MAX_SPEED, vy: 0, fx: 1, fy: 0,
      dashT: 0, dashCd: 0,
      sprintEnergy: SPRINT_MAX * 0.5, sprintCooldown: SPRINT_REGEN_DELAY, sprintExhausted: false
    };

    // Nhả Shift trong 5 ticks (năng lượng vẫn khoảng SPRINT_MAX * 0.5, chưa hồi đầy)
    for (let i = 0; i < 5; i++) {
      state = simulateMove(state, 1, 0, false, tiles, width, height, 1 / 30);
    }
    expect(state.sprintEnergy).toBeCloseTo(SPRINT_MAX * 0.5, 2);

    // Bấm lại Shift: sprint ngay lập tức (không cần chờ đầy SPRINT_MAX)
    state = simulateMove(state, 1, 0, true, tiles, width, height, 1 / 30);
    expect(state.dashT).toBeGreaterThan(0);
    expect(state.sprintEnergy).toBeLessThan(SPRINT_MAX * 0.5); // tiêu hao ngay
  });

  it('Ném và tương tác hoạt động bình thường khi đang sprint', () => {
    const mockState = {
      tick: 0,
      timeLeft: 120,
      timeElapsed: 0,
      score: 0,
      streak: 0,
      players: [
        {
          id: 'p1',
          x: 1.5,
          y: 1.5,
          vx: 0,
          vy: 0,
          fx: 1,
          fy: 0,
          dashT: 0.2,
          dashCd: 0,
          throwCd: 0,
          sprintEnergy: SPRINT_MAX,
          sprintCooldown: 0,
          sprintExhausted: false,
          acting: false,
          held: { type: 'ingredient', id: 'tomato', state: 'raw' },
          ackSeq: 0
        }
      ],
      stations: [
        { type: 'counter', x: 2, y: 1, item: null, progress: 0, dirtyCount: 0, cleanCount: 0, pendingReturns: [], onFire: false, fireTimer: 0, burntTimer: 0 }
      ],
      orders: [],
      customers: [],
      projectiles: [],
      tiles,
      width,
      height
    };

    // Khi đang sprint (dash = true), ném hoạt động bình thường
    const events = step(mockState as unknown as GameState, {
      p1: { seq: 1, mx: 1, my: 0, act: false, interact: false, dash: true, throw: true }
    });

    const throwEvent = events.find(e => e.type === 'throw');
    expect(throwEvent).toBeDefined();
    expect(mockState.projectiles.length).toBe(1);
    expect(mockState.players[0]!.held).toBeNull();
  });

  it('Xung đẩy người khác khi sprint va chạm', () => {
    const mockState = {
      players: [
        { id: '1', x: 2, y: 2, vx: 0, vy: 0, fx: 1, fy: 0, dashT: 0.2, dashCd: 0, throwCd: 0, ackSeq: 0, held: null, acting: false },
        { id: '2', x: 2.2, y: 2, vx: 0, vy: 0, fx: -1, fy: 0, dashT: 0, dashCd: 0, throwCd: 0, ackSeq: 0, held: null, acting: false }
      ],
      tiles, width, height
    } as unknown as GameState;
    resolvePlayerCollisions(mockState);
    const p1 = mockState.players[0]!;
    const p2 = mockState.players[1]!;
    // p1 đang sprint đẩy p2
    expect(p2.vx).toBe(4);
    expect(p1.vx).toBe(0);
  });
});
