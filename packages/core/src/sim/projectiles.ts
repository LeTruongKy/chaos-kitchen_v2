import { GameState, GameEvent, PlayerState, Projectile, IngredientItem } from '../types';
import { THROW_SPEED, THROW_MAX_RANGE, THROW_COOLDOWN, CATCH_RADIUS } from '../constants';
import { canChop, canAddToPlate } from '../recipes';

export function tryThrow(state: GameState, player: PlayerState): GameEvent[] {
  if (player.throwCd > 0) return [];
  if (!player.held || player.held.type !== 'ingredient') return []; // Chỉ ném nguyên liệu

  // Tạo đạn
  const proj: Projectile = {
    id: state.nextProjectileId++,
    item: player.held,
    x: player.x + player.fx * 0.5,
    y: player.y + player.fy * 0.5,
    vx: player.fx * THROW_SPEED,
    vy: player.fy * THROW_SPEED,
    traveled: 0,
    ownerId: player.id
  };
  state.projectiles.push(proj);
  player.held = null;
  player.throwCd = THROW_COOLDOWN;

  return [{ type: 'throw', playerId: player.id, x: player.x, y: player.y }];
}

export function tickProjectiles(state: GameState, dt: number): GameEvent[] {
  const events: GameEvent[] = [];
  const toRemove = new Set<number>();

  for (let i = 0; i < state.projectiles.length; i++) {
    const p = state.projectiles[i]!;
    
    // Di chuyển
    const dDist = THROW_SPEED * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.traveled += dDist;

    let stopped = false;
    let placed = false; // đánh dấu là rơi vào nồi/chảo thành công

    // 1. Kiểm tra giới hạn tầm ném
    if (p.traveled >= THROW_MAX_RANGE) {
      stopped = true;
    }

    // 2. Kiểm tra bắt
    if (!stopped) {
      for (const player of state.players) {
        if (player.id === p.ownerId && p.traveled < 1.0) continue; 
        
        if (!player.held) {
          const dx = player.x - p.x;
          const dy = player.y - p.y;
          if (dx*dx + dy*dy <= CATCH_RADIUS * CATCH_RADIUS) {
            player.held = p.item;
            stopped = true;
            placed = true; // Bắt thành công nên không splat
            events.push({ type: 'catch', playerId: player.id, x: p.x, y: p.y });
            break;
          }
        }
      }
    }

    // 3. Kiểm tra va chạm tường/station
    if (!stopped) {
      const tx = Math.floor(p.x);
      const ty = Math.floor(p.y);
      if (tx < 0 || tx >= state.width || ty < 0 || ty >= state.height) {
        stopped = true;
      } else {
        const tile = state.tiles[ty * state.width + tx];
        if (tile === 'wall') {
          stopped = true;
        } else if (tile !== 'floor' && tile !== 'ice' && tile !== 'pit') {
          const st = state.stations.find(s => s.x === tx && s.y === ty);
          if (st) {
            stopped = true;
            if (st.type === 'counter' && !st.item) {
              st.item = p.item;
              placed = true;
            } else if (st.type === 'counter' && st.item && st.item.type === 'plate') {
              if (canAddToPlate(st.item, p.item)) {
                st.item.contents.push(p.item);
                placed = true;
              }
            } else if (st.type === 'cutting' && st.item == null && p.item.state === 'raw' && canChop(p.item)) {
              st.item = p.item;
              placed = true;
            } else if (st.type === 'stove' && st.item && st.item.type === 'tool' && !st.onFire) {
              const tool = st.item;
              if (tool.tool === 'pan' && p.item.id === 'meat' && p.item.state === 'raw' && tool.contents.length === 0) {
                tool.contents.push(p.item);
                tool.progress = 0;
                placed = true;
              } else if (tool.tool === 'pot' && tool.contents.length < 3 && p.item.state === 'chopped' && (p.item.id === 'tomato' || p.item.id === 'onion' || p.item.id === 'mushroom')) {
                if (tool.contents.length === 0 || tool.contents[0]!.id === p.item.id) {
                  tool.contents.push(p.item);
                  placed = true;
                }
              }
            } else if (st.type === 'trash') {
              placed = true; // bị vứt luôn
            }
          }
        }
      }
    }

    if (stopped) {
      toRemove.add(i);
      if (!placed) {
        const tx = Math.floor(p.x);
        const ty = Math.floor(p.y);
        if (tx >= 0 && tx < state.width && ty >= 0 && ty < state.height) {
          const tile = state.tiles[ty * state.width + tx];
          if (tile !== 'pit' && tile !== 'wall') {
            events.push({ type: 'splat', x: p.x, y: p.y });
            createSplatAt(state, tx, ty, p.item);
          }
        }
      }
    }
  }

  if (toRemove.size > 0) {
    state.projectiles = state.projectiles.filter((_, i) => !toRemove.has(i));
  }

  return events;
}

function createSplatAt(state: GameState, x: number, y: number, item: IngredientItem) {
  item.state = 'splat';
  const existing = state.stations.find(s => s.x === x && s.y === y && s.type === 'floor');
  if (existing) {
    existing.item = item;
  } else {
    state.stations.push({
      x, y,
      type: 'floor',
      item,
      progress: 0,
      dirtyCount: 0,
      cleanCount: 0,
      pendingReturns: [],
      onFire: false,
      fireTimer: 0,
      burntTimer: 0
    });
  }
}
