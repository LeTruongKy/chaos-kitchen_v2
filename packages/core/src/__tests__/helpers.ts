import { GameState } from '../types';
import { step } from '../sim/step';

export function walkTo(state: GameState, playerId: string, tx: number, ty: number) {
  const p = state.players.find(pl => pl.id === playerId);
  if (!p) return;

  // BFS to find path
  const startX = Math.floor(p.x);
  const startY = Math.floor(p.y);
  
  let targetX = tx;
  let targetY = ty;
  if (state.tiles[ty * state.width + tx] !== 'floor') {
    let bestDist = Infinity;
    const dirs: [number, number][] = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    for (const [dx, dy] of dirs) {
      const nx = tx + dx;
      const ny = ty + dy;
      if (nx >= 0 && nx < state.width && ny >= 0 && ny < state.height) {
        if (state.tiles[ny * state.width + nx] === 'floor') {
          const dist = Math.hypot(nx + 0.5 - p.x, ny + 0.5 - p.y);
          if (dist < bestDist) {
            bestDist = dist;
            targetX = nx;
            targetY = ny;
          }
        }
      }
    }
  }

  const queue = [{ x: startX, y: startY, path: [] as {x: number, y: number}[] }];
  const visited = new Set<string>();
  visited.add(`${startX},${startY}`);
  let path: {x: number, y: number}[] = [];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (curr.x === targetX && curr.y === targetY) {
      path = curr.path;
      break;
    }

    const dirs: [number, number][] = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    for (const [dx, dy] of dirs) {
      const nx = curr.x + dx;
      const ny = curr.y + dy;
      if (nx >= 0 && nx < state.width && ny >= 0 && ny < state.height) {
        if (state.tiles[ny * state.width + nx] === 'floor') {
          const key = `${nx},${ny}`;
          if (!visited.has(key)) {
            visited.add(key);
            queue.push({ x: nx, y: ny, path: [...curr.path, { x: nx, y: ny }] });
          }
        }
      }
    }
  }

  path.push({ x: targetX, y: targetY });

  for (const stepPt of path) {
    const fx = stepPt.x + 0.5;
    const fy = stepPt.y + 0.5;
    
    let maxIter = 100;
    while (maxIter-- > 0) {
      const dx = fx - p.x;
      const dy = fy - p.y;
      
      if (Math.abs(dx) <= 0.1 && Math.abs(dy) <= 0.1) break;
      
      let mx = 0, my = 0;
      if (Math.abs(dx) > 0.1) mx = Math.sign(dx);
      if (Math.abs(dy) > 0.1) my = Math.sign(dy);
      
      if (Math.abs(dx) > Math.abs(dy)) my = 0; else mx = 0;

      const prevX = p.x;
      const prevY = p.y;
      step(state, { [playerId]: { seq: 0, mx: mx as 0|1|-1, my: my as 0|1|-1, act: false, interact: false, dash: false, throw: false } });
      if (p.x === prevX && p.y === prevY) {
        step(state, { [playerId]: { seq: 0, mx: (mx === 0 ? Math.sign(dx)||1 : 0) as 0|1|-1, my: (my === 0 ? Math.sign(dy)||1 : 0) as 0|1|-1, act: false, interact: false, dash: false, throw: false } });
      }
    }
    p.x = fx;
    p.y = fy;
  }

  // Face the target
  const dx = tx + 0.5 - p.x;
  const dy = ty + 0.5 - p.y;
  let mx = 0, my = 0;
  if (Math.abs(dx) > Math.abs(dy)) mx = Math.sign(dx); else my = Math.sign(dy);
  
  step(state, { [playerId]: { seq: 0, mx: mx as 0|1|-1, my: my as 0|1|-1, act: false, interact: false, dash: false, throw: false } });
  step(state, { [playerId]: { seq: 0, mx: 0, my: 0, act: false, interact: false, dash: false, throw: false } });
}

export function interactWith(state: GameState, playerId: string) {
  step(state, { [playerId]: { seq: 0, mx: 0, my: 0, act: false, interact: true, dash: false, throw: false } });
}

export function holdAct(state: GameState, playerId: string, ticks: number) {
  for (let i = 0; i < ticks; i++) {
    step(state, { [playerId]: { seq: 0, mx: 0, my: 0, act: true, interact: false, dash: false, throw: false } });
  }
}
