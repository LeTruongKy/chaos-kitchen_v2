import { GameState, PlayerInput, TileType } from '../types';
import {
  PLAYER_MAX_SPEED,
  PLAYER_ACCEL,
  PLAYER_FRICTION,
  ICE_ACCEL,
  ICE_FRICTION,
  PLAYER_RADIUS,
  PLAYER_COLLIDE,
  SPRINT_MULTIPLIER,
  SPRINT_MAX,
  SPRINT_DRAIN_RATE,
  SPRINT_REGEN_RATE,
  SPRINT_REGEN_DELAY,
  SPRINT_RESTART_THRESHOLD
} from '../constants';

export interface MoveState {
  x: number; y: number;
  vx: number; vy: number;
  fx: number; fy: number;
  dashT: number;
  dashCd: number;
  sprintEnergy?: number;
  sprintCooldown?: number;
  sprintExhausted?: boolean;
}

function isWalkable(tile: TileType): boolean {
  return tile === 'floor' || tile === 'ice';
}

export function simulateMove(
  state: MoveState,
  mx: number, my: number, dash: boolean,
  tiles: TileType[], width: number, height: number,
  dt: number
): MoveState {
  let { x, y, vx, vy, fx, fy } = state;
  let sprintEnergy = state.sprintEnergy !== undefined ? state.sprintEnergy : SPRINT_MAX;
  let sprintCooldown = state.sprintCooldown !== undefined ? state.sprintCooldown : 0;
  let sprintExhausted = state.sprintExhausted !== undefined ? state.sprintExhausted : false;

  // Lấy tile dưới chân
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  let currentTile: TileType = 'floor';
  if (tx >= 0 && tx < width && ty >= 0 && ty < height) {
    currentTile = tiles[ty * width + tx] ?? 'floor';
  }

  const isIce = currentTile === 'ice';
  const accel = isIce ? ICE_ACCEL : PLAYER_ACCEL;
  const fric = isIce ? ICE_FRICTION : PLAYER_FRICTION;

  // Nếu trước đó cạn kiệt, cần hồi phục lên >= SPRINT_RESTART_THRESHOLD (0.2) mới mở lại
  if (sprintExhausted && sprintEnergy >= SPRINT_RESTART_THRESHOLD - 1e-5) {
    sprintExhausted = false;
  }

  const isMoving = mx !== 0 || my !== 0;
  const wantsSprint = Boolean(dash) && isMoving;
  const canSprint = wantsSprint && !sprintExhausted && sprintEnergy > 0;

  let isSprinting = false;

  if (canSprint) {
    isSprinting = true;
    sprintEnergy -= SPRINT_DRAIN_RATE * dt;
    if (sprintEnergy <= 1e-5) {
      sprintEnergy = 0;
      sprintExhausted = true;
      isSprinting = false; // Khi sprintEnergy = 0 thì dừng ngay, tốc độ về bình thường
      sprintCooldown = 0;
    } else {
      sprintCooldown = SPRINT_REGEN_DELAY;
    }
  } else {
    // Không sprint (nhả Shift hoặc đứng yên): sprintEnergy hồi 1 đơn vị/giây, tối đa SPRINT_MAX = 3.0
    // Trễ SPRINT_REGEN_DELAY (0.5s) trước khi bắt đầu hồi
    if (sprintCooldown > 0) {
      sprintCooldown = Math.max(0, sprintCooldown - dt);
    } else {
      sprintEnergy = Math.min(SPRINT_MAX, sprintEnergy + SPRINT_REGEN_RATE * dt);
      if (sprintExhausted && sprintEnergy >= SPRINT_RESTART_THRESHOLD - 1e-5) {
        sprintExhausted = false;
      }
    }
  }

  const dashT = isSprinting ? 0.2 : 0;
  const dashCd = 0;

  if (isMoving) {
    const len = Math.sqrt(mx * mx + my * my);
    const maxSpeed = isSprinting ? (PLAYER_MAX_SPEED * SPRINT_MULTIPLIER) : PLAYER_MAX_SPEED;
    const targetVx = (mx / len) * maxSpeed;
    const targetVy = (my / len) * maxSpeed;

    // move v towards targetV by accel * dt
    const dx = targetVx - vx;
    const dy = targetVy - vy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0) {
      const step = accel * dt;
      if (step >= dist) {
        vx = targetVx;
        vy = targetVy;
      } else {
        vx += (dx / dist) * step;
        vy += (dy / dist) * step;
      }
    }

    // Update facing
    fx = mx / len;
    fy = my / len;
  } else {
    // Friction
    const vLen = Math.sqrt(vx * vx + vy * vy);
    if (vLen > 0) {
      const step = fric * dt;
      if (step >= vLen) {
        vx = 0;
        vy = 0;
      } else {
        vx -= (vx / vLen) * step;
        vy -= (vy / vLen) * step;
      }
    }
  }

  let newX = x + vx * dt;
  let newY = y + vy * dt;

  const resX = resolveCollision(x, newX, y, y, PLAYER_RADIUS, tiles, width, height, 'x');
  if (resX !== newX) {
    vx = 0;
    newX = resX;
  }

  const resY = resolveCollision(newX, newX, y, newY, PLAYER_RADIUS, tiles, width, height, 'y');
  if (resY !== newY) {
    vy = 0;
    newY = resY;
  }

  newX = Math.max(PLAYER_RADIUS, Math.min(width - PLAYER_RADIUS, newX));
  newY = Math.max(PLAYER_RADIUS, Math.min(height - PLAYER_RADIUS, newY));

  return {
    x: newX,
    y: newY,
    vx,
    vy,
    fx,
    fy,
    dashT,
    dashCd,
    sprintEnergy,
    sprintCooldown,
    sprintExhausted
  };
}

function resolveCollision(
  oldX: number, nextX: number, oldY: number, nextY: number, radius: number,
  tiles: TileType[], width: number, height: number, axis: 'x' | 'y'
): number {
  let val = axis === 'x' ? nextX : nextY;

  const minTX = Math.floor(nextX - radius);
  const maxTX = Math.floor(nextX + radius);
  const minTY = Math.floor(nextY - radius);
  const maxTY = Math.floor(nextY + radius);

  for (let ty = minTY; ty <= maxTY; ty++) {
    for (let tx = minTX; tx <= maxTX; tx++) {
      if (tx < 0 || tx >= width || ty < 0 || ty >= height) continue;
      const tile = tiles[ty * width + tx];
      if (!tile || !isWalkable(tile)) {
        const bMinX = tx;
        const bMaxX = tx + 1;
        const bMinY = ty;
        const bMaxY = ty + 1;

        const closeX = Math.max(bMinX, Math.min(nextX, bMaxX));
        const closeY = Math.max(bMinY, Math.min(nextY, bMaxY));
        
        const dx = nextX - closeX;
        const dy = nextY - closeY;
        const dist2 = dx * dx + dy * dy;
        
        if (dist2 < radius * radius - 1e-6) {
          if (axis === 'x') {
            const cY = Math.max(bMinY, Math.min(oldY, bMaxY));
            const dY = oldY - cY;
            const reqDx = Math.sqrt(Math.max(0, radius * radius - dY * dY));
            if (oldX <= bMinX) {
              val = Math.min(val, bMinX - reqDx);
            } else if (oldX >= bMaxX) {
              val = Math.max(val, bMaxX + reqDx);
            } else {
              if (oldX < tx + 0.5) val = Math.min(val, bMinX - reqDx);
              else val = Math.max(val, bMaxX + reqDx);
            }
          } else {
            const cX = Math.max(bMinX, Math.min(oldX, bMaxX));
            const dX = oldX - cX;
            const reqDy = Math.sqrt(Math.max(0, radius * radius - dX * dX));
            if (oldY <= bMinY) {
              val = Math.min(val, bMinY - reqDy);
            } else if (oldY >= bMaxY) {
              val = Math.max(val, bMaxY + reqDy);
            } else {
              if (oldY < ty + 0.5) val = Math.min(val, bMinY - reqDy);
              else val = Math.max(val, bMaxY + reqDy);
            }
          }
        }
      }
    }
  }

  return val;
}

export function movePlayer(state: GameState, playerId: string, input: PlayerInput | undefined, dt: number): void {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return;

  if (input) {
    if (input.seq !== undefined && input.seq > player.ackSeq) {
      player.ackSeq = input.seq;
    }
  }

  const mx = (input && input.mx !== undefined) ? input.mx : 0;
  const my = (input && input.my !== undefined) ? input.my : 0;

  const moveState: MoveState = {
    x: player.x, y: player.y,
    vx: player.vx, vy: player.vy,
    fx: player.fx, fy: player.fy,
    dashT: player.dashT, dashCd: player.dashCd,
    sprintEnergy: player.sprintEnergy ?? SPRINT_MAX,
    sprintCooldown: player.sprintCooldown ?? 0,
    sprintExhausted: player.sprintExhausted ?? false
  };

  const dash = input ? input.dash : false;

  const res = simulateMove(moveState, mx, my, dash, state.tiles, state.width, state.height, dt);
  
  player.x = res.x;
  player.y = res.y;
  player.vx = res.vx;
  player.vy = res.vy;
  player.dashT = res.dashT;
  player.dashCd = res.dashCd;
  player.sprintEnergy = res.sprintEnergy ?? SPRINT_MAX;
  player.sprintCooldown = res.sprintCooldown ?? 0;
  player.sprintExhausted = res.sprintExhausted ?? false;
  if (mx !== 0 || my !== 0) {
    player.fx = res.fx;
    player.fy = res.fy;
  }
}

export function resolvePlayerCollisions(state: GameState): void {
  if (!PLAYER_COLLIDE) return;
  const players = state.players;
  const oldPos = players.map(p => ({ x: p.x, y: p.y }));
  
  for (let loop = 0; loop < 2; loop++) {
    let collided = false;
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const p1 = players[i];
        const p2 = players[j];
        if (!p1 || !p2) continue;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist2 = dx * dx + dy * dy;
        const minDist = 2 * PLAYER_RADIUS;
        if (dist2 < minDist * minDist - 1e-6) {
          collided = true;
          const dist = Math.sqrt(dist2) || 0.001; // prevent div by zero
          const overlap = minDist - dist;
          const nx = dx / dist;
          const ny = dy / dist;
          
          p1.x -= nx * overlap * 0.5;
          p1.y -= ny * overlap * 0.5;
          p2.x += nx * overlap * 0.5;
          p2.y += ny * overlap * 0.5;

          if (loop === 0) {
            if (p1.dashT > 0) {
              p2.vx += p1.fx * 4;
              p2.vy += p1.fy * 4;
            }
            if (p2.dashT > 0) {
              p1.vx += p2.fx * 4;
              p1.vy += p2.fy * 4;
            }
          }
        }
      }
    }
    
    if (collided) {
      for (let i = 0; i < players.length; i++) {
        const p = players[i];
        if (!p) continue;
        const op = oldPos[i]!;
        p.x = resolveCollision(op.x, p.x, p.y, p.y, PLAYER_RADIUS, state.tiles, state.width, state.height, 'x');
        p.y = resolveCollision(p.x, p.x, op.y, p.y, PLAYER_RADIUS, state.tiles, state.width, state.height, 'y');
        p.x = Math.max(PLAYER_RADIUS, Math.min(state.width - PLAYER_RADIUS, p.x));
        p.y = Math.max(PLAYER_RADIUS, Math.min(state.height - PLAYER_RADIUS, p.y));
      }
    } else {
      break;
    }
  }
}
