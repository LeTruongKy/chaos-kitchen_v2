import { ParsedLevel, TileType, canChop, getTargetTile } from '@kitchen/core';
import { RenderFrame } from './render/IGameRenderer';

export interface PilotInput {
  mx: -1 | 0 | 1;
  my: -1 | 0 | 1;
  act: boolean;
  interact: boolean;
}

interface PilotTask {
  type: 'walk_to' | 'interact_station' | 'extinguish';
  /** Target tile (station or floor tile) */
  tx: number;
  ty: number;
  /** Destination walkable tile to stand on */
  standX: number;
  standY: number;
  /** Waypoints of walkable tile coordinates [(x,y), ...] */
  path: { x: number; y: number }[];
  /** Whether we have sent the 1-tick turn towards (tx, ty) */
  turned: boolean;
}

function isWalkableTile(tile: TileType | undefined): boolean {
  return tile === 'floor' || tile === 'ice';
}

export class TapPilot {
  private level: ParsedLevel | null = null;
  private tasks: PilotTask[] = [];
  private waitTicks = 0;
  private activeVisualTarget: { tx: number; ty: number } | null = null;

  public setLevel(level: ParsedLevel) {
    this.level = level;
    this.cancel();
  }

  public cancel() {
    this.tasks = [];
    this.waitTicks = 0;
    this.activeVisualTarget = null;
  }

  public isActive(): boolean {
    return this.tasks.length > 0;
  }

  public getVisualTarget(): { tx: number; ty: number } | null {
    return this.activeVisualTarget;
  }

  /**
   * Called when the player taps/clicks a tile (tx, ty) on the 3D scene.
   */
  public setTargetTile(tx: number, ty: number, frame: RenderFrame | null): boolean {
    if (!this.level || !frame) return false;
    if (tx < 0 || tx >= this.level.width || ty < 0 || ty >= this.level.height) return false;

    const activeId = frame.activeChefId || frame.localPlayerId;
    const player = frame.players.find(p => p.id === activeId) || frame.players[0];
    if (!player) return false;

    this.cancel();
    this.activeVisualTarget = { tx, ty };

    const startX = Math.max(0, Math.min(this.level.width - 1, Math.floor(player.x)));
    const startY = Math.max(0, Math.min(this.level.height - 1, Math.floor(player.y)));

    const tappedStation = frame.stations.find((s: any) => s.x === tx && s.y === ty);
    const tileType = this.level.tiles[ty * this.level.width + tx];

    // 1. Check if tapped on a burning station -> Smart Fire Extinguish Chain
    if (tappedStation && tappedStation.onFire) {
      const holdingExtinguisher =
        player.held && player.held.type === 'tool' && player.held.tool === 'extinguisher';

      if (!holdingExtinguisher) {
        // Find extinguisher station or floor/counter holding the extinguisher tool
        const extStation = frame.stations.find(
          (s: any) =>
            !s.onFire &&
            ((s.item && s.item.type === 'tool' && s.item.tool === 'extinguisher') ||
              (s.type === 'extinguisher' && s.item))
        );

        let curX = startX;
        let curY = startY;

        if (extStation) {
          // If currently holding something else, drop it on the nearest empty counter first
          if (player.held) {
            const emptyCounters = frame.stations
              .filter((s: any) => s.type === 'counter' && !s.item && !s.onFire)
              .sort((a: any, b: any) => {
                const da = Math.hypot(a.x - curX, a.y - curY);
                const db = Math.hypot(b.x - curX, b.y - curY);
                return da - db;
              });

            for (const cnt of emptyCounters) {
              const dropTask = this.buildStationTask('interact_station', curX, curY, cnt.x, cnt.y, player.x, player.y);
              if (dropTask) {
                this.tasks.push(dropTask);
                curX = dropTask.standX;
                curY = dropTask.standY;
                break;
              }
            }
          }

          const pickupExtTask = this.buildStationTask(
            'interact_station',
            curX,
            curY,
            extStation.x,
            extStation.y,
            curX + 0.5,
            curY + 0.5
          );
          if (pickupExtTask) {
            this.tasks.push(pickupExtTask);
            curX = pickupExtTask.standX;
            curY = pickupExtTask.standY;
          }
        }

        const extTask = this.buildStationTask('extinguish', curX, curY, tx, ty, curX + 0.5, curY + 0.5);
        if (extTask) {
          this.tasks.push(extTask);
          return true;
        }
      } else {
        const extTask = this.buildStationTask('extinguish', startX, startY, tx, ty, player.x, player.y);
        if (extTask) {
          this.tasks.push(extTask);
          return true;
        }
      }
    }

    // 2. If tapped a walkable tile (and not a station, or a floor station without item)
    if (isWalkableTile(tileType) && (!tappedStation || (tappedStation.type === 'floor' && !tappedStation.item))) {
      const path = this.findPath(startX, startY, tx, ty);
      if (path) {
        this.tasks.push({
          type: 'walk_to',
          tx,
          ty,
          standX: tx,
          standY: ty,
          path,
          turned: true
        });
        return true;
      }
      this.activeVisualTarget = null;
      return false;
    }

    // 3. If tapped a floor tile that has a dropped item on it
    if (tappedStation && tappedStation.type === 'floor' && tappedStation.item) {
      const task = this.buildStationTask('interact_station', startX, startY, tx, ty, player.x, player.y);
      if (task) {
        this.tasks.push(task);
        return true;
      }
    }

    // 4. Tapped a station (crate, cutting, stove, oven, counter, plate_dispenser, sink, trash, table, etc.)
    if (tappedStation) {
      const task = this.buildStationTask('interact_station', startX, startY, tx, ty, player.x, player.y);
      if (task) {
        this.tasks.push(task);
        return true;
      }
    }

    this.activeVisualTarget = null;
    return false;
  }

  /**
   * Produces the next 30Hz input command for the active chef, or null if idle.
   */
  public nextInput(frame: RenderFrame | null): PilotInput | null {
    if (!this.level || !frame || this.tasks.length === 0) {
      this.activeVisualTarget = null;
      return null;
    }

    if (this.waitTicks > 0) {
      this.waitTicks--;
      return { mx: 0, my: 0, act: false, interact: false };
    }

    const activeId = frame.activeChefId || frame.localPlayerId;
    const player = frame.players.find(p => p.id === activeId) || frame.players[0];
    if (!player) {
      this.cancel();
      return null;
    }

    const task = this.tasks[0]!;

    // Prune intermediate waypoints that we have already reached
    while (task.path.length > 1) {
      const wp = task.path[0]!;
      const distWp = Math.hypot((wp.x + 0.5) - player.x, (wp.y + 0.5) - player.y);
      if (distWp <= 0.24) {
        task.path.shift();
      } else {
        break;
      }
    }

    const currentWp = task.path[0] || { x: task.standX, y: task.standY };
    const targetX = currentWp.x + 0.5;
    const targetY = currentWp.y + 0.5;
    const dx = targetX - player.x;
    const dy = targetY - player.y;
    const dist = Math.hypot(dx, dy);

    const isFinalWaypoint = task.path.length <= 1 && currentWp.x === task.standX && currentWp.y === task.standY;
    const arrivalRadius = isFinalWaypoint ? 0.16 : 0.24;

    if (dist > arrivalRadius) {
      return this.computeSteering(player.x, player.y, currentWp.x, currentWp.y);
    }

    // Arrived at final stand tile (standX, standY)
    if (task.type === 'walk_to') {
      this.tasks.shift();
      if (this.tasks.length === 0) {
        this.activeVisualTarget = null;
      }
      return { mx: 0, my: 0, act: false, interact: false };
    }

    // Check if the chef is facing the target station (tx, ty)
    const facingTile = getTargetTile(player as any);
    const isFacingStation = facingTile.tx === task.tx && facingTile.ty === task.ty;

    if (!task.turned || !isFacingStation) {
      const turnMx = Math.sign(task.tx - task.standX) as -1 | 0 | 1;
      const turnMy = Math.sign(task.ty - task.standY) as -1 | 0 | 1;
      task.turned = true;
      if (turnMx !== 0 || turnMy !== 0) {
        // Send 1 tick of movement toward the station to set player.fx / player.fy without cancelling autoAction on the next tick
        return { mx: turnMx, my: turnMy, act: false, interact: false };
      }
    }

    // Now facing the target station!
    const station = frame.stations.find((s: any) => s.x === task.tx && s.y === task.ty);

    if (task.type === 'extinguish') {
      if (!station || !station.onFire) {
        this.tasks.shift();
        if (this.tasks.length === 0) {
          this.activeVisualTarget = null;
        }
        return { mx: 0, my: 0, act: false, interact: false };
      }
      // Hold act=true until the fire is extinguished
      return { mx: 0, my: 0, act: true, interact: false };
    }

    // task.type === 'interact_station'
    this.tasks.shift();
    if (this.tasks.length > 0) {
      // Small pause between chained tasks so server state updates player.held
      this.waitTicks = 3;
    } else {
      this.activeVisualTarget = null;
    }

    // Decide whether to send `act` (resume chopping/washing with empty hands) or `interact`
    if (station && !player.held) {
      if (
        station.type === 'cutting' &&
        station.item &&
        station.item.type === 'ingredient' &&
        station.item.state === 'raw' &&
        canChop(station.item)
      ) {
        return { mx: 0, my: 0, act: true, interact: false };
      }
      if (station.type === 'sink' && station.dirtyCount > 0 && station.cleanCount === 0) {
        return { mx: 0, my: 0, act: true, interact: false };
      }
    }

    return { mx: 0, my: 0, act: false, interact: true };
  }

  /**
   * Computes corner-safe 8-way steering from (px, py) toward tile center (wx + 0.5, wy + 0.5).
   */
  private computeSteering(px: number, py: number, wx: number, wy: number): PilotInput {
    const targetX = wx + 0.5;
    const targetY = wy + 0.5;
    const dx = targetX - px;
    const dy = targetY - py;

    const curTileX = Math.floor(px);
    const curTileY = Math.floor(py);

    // If moving horizontally into a new tile, ensure Y is centered within the corridor if adjacent tiles are blocked
    if (wx !== curTileX && wy === curTileY && Math.abs(dy) > 0.14) {
      const blockedAbove = !this.isTileWalkable(wx, wy - 1) || !this.isTileWalkable(curTileX, wy - 1);
      const blockedBelow = !this.isTileWalkable(wx, wy + 1) || !this.isTileWalkable(curTileX, wy + 1);
      if ((dy > 0 && blockedAbove) || (dy < 0 && blockedBelow)) {
        return {
          mx: 0,
          my: (dy > 0 ? 1 : -1) as -1 | 0 | 1,
          act: false,
          interact: false
        };
      }
    }

    // If moving vertically into a new tile, ensure X is centered within the corridor if adjacent tiles are blocked
    if (wy !== curTileY && wx === curTileX && Math.abs(dx) > 0.14) {
      const blockedLeft = !this.isTileWalkable(wx - 1, wy) || !this.isTileWalkable(wx - 1, curTileY);
      const blockedRight = !this.isTileWalkable(wx + 1, wy) || !this.isTileWalkable(wx + 1, curTileY);
      if ((dx > 0 && blockedLeft) || (dx < 0 && blockedRight)) {
        return {
          mx: (dx > 0 ? 1 : -1) as -1 | 0 | 1,
          my: 0,
          act: false,
          interact: false
        };
      }
    }

    const mx = (Math.abs(dx) > 0.08 ? Math.sign(dx) : 0) as -1 | 0 | 1;
    const my = (Math.abs(dy) > 0.08 ? Math.sign(dy) : 0) as -1 | 0 | 1;

    return { mx, my, act: false, interact: false };
  }

  private isTileWalkable(x: number, y: number): boolean {
    if (!this.level) return false;
    if (x < 0 || x >= this.level.width || y < 0 || y >= this.level.height) return false;
    return isWalkableTile(this.level.tiles[y * this.level.width + x]);
  }

  private buildStationTask(
    type: 'interact_station' | 'extinguish',
    startX: number,
    startY: number,
    sx: number,
    sy: number,
    exactStartX: number,
    exactStartY: number
  ): PilotTask | null {
    if (!this.level) return null;

    const dirs = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 }
    ];

    let bestCandidate: { adjX: number; adjY: number; path: { x: number; y: number }[]; score: number } | null = null;

    for (const d of dirs) {
      const adjX = sx + d.dx;
      const adjY = sy + d.dy;
      if (!this.isTileWalkable(adjX, adjY)) continue;

      const path = this.findPath(startX, startY, adjX, adjY);
      if (!path) continue;

      const euclid = Math.hypot((adjX + 0.5) - exactStartX, (adjY + 0.5) - exactStartY);
      const score = path.length * 10 + euclid;
      if (!bestCandidate || score < bestCandidate.score) {
        bestCandidate = { adjX, adjY, path, score };
      }
    }

    if (!bestCandidate) return null;

    return {
      type,
      tx: sx,
      ty: sy,
      standX: bestCandidate.adjX,
      standY: bestCandidate.adjY,
      path: bestCandidate.path,
      turned: false
    };
  }

  /**
   * 4-connected BFS pathfinding on walkable tiles, returning the list of tiles from start to goal.
   */
  private findPath(startX: number, startY: number, goalX: number, goalY: number): { x: number; y: number }[] | null {
    if (!this.level) return null;
    if (!this.isTileWalkable(goalX, goalY)) return null;
    if (startX === goalX && startY === goalY) {
      return [{ x: goalX, y: goalY }];
    }

    const w = this.level.width;
    const h = this.level.height;
    const visited = new Uint8Array(w * h);
    const parent = new Int32Array(w * h).fill(-1);

    const startIdx = startY * w + startX;
    const goalIdx = goalY * w + goalX;
    visited[startIdx] = 1;

    const queue: number[] = [startIdx];
    const dirs = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 }
    ];

    let found = false;
    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (curr === goalIdx) {
        found = true;
        break;
      }
      const cx = curr % w;
      const cy = Math.floor(curr / w);

      for (const d of dirs) {
        const nx = cx + d.dx;
        const ny = cy + d.dy;
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        const nIdx = ny * w + nx;
        if (visited[nIdx]) continue;
        if (!this.isTileWalkable(nx, ny)) continue;

        visited[nIdx] = 1;
        parent[nIdx] = curr;
        queue.push(nIdx);
      }
    }

    if (!found) return null;

    const rawPath: { x: number; y: number }[] = [];
    let cur = goalIdx;
    while (cur !== -1 && cur !== startIdx) {
      rawPath.push({ x: cur % w, y: Math.floor(cur / w) });
      cur = parent[cur]!;
    }
    rawPath.reverse();

    // Smooth diagonal steps where both orthogonal neighbors are open floor
    const smoothed: { x: number; y: number }[] = [];
    let prevX = startX;
    let prevY = startY;
    let i = 0;
    while (i < rawPath.length) {
      const curr = rawPath[i]!;
      const next = rawPath[i + 1];
      if (
        next &&
        Math.abs(next.x - prevX) === 1 &&
        Math.abs(next.y - prevY) === 1 &&
        this.isTileWalkable(next.x, prevY) &&
        this.isTileWalkable(prevX, next.y)
      ) {
        smoothed.push(next);
        prevX = next.x;
        prevY = next.y;
        i += 2;
      } else {
        smoothed.push(curr);
        prevX = curr.x;
        prevY = curr.y;
        i += 1;
      }
    }

    return smoothed;
  }
}
