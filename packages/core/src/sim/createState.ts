import { GameState, LevelDef, PlayerState, StationState, Item } from '../types';
import { parseLevel, validateLevel } from '../level';
import { ORDER_FIRST_AT, SPRINT_MAX } from '../constants';

export function createGameState(level: LevelDef, playerIds: string[], seed: number): GameState {
  if (playerIds.length < 1 || playerIds.length > 4) {
    throw new Error('playerIds must be between 1 and 4');
  }

  const { errors: errs } = validateLevel(level);
  if (errs.length > 0) {
    throw new Error(`Invalid level: ${errs.join(', ')}`);
  }

  const parsed = parseLevel(level);

  const players: PlayerState[] = playerIds.map((id, index) => {
    const spawn = parsed.spawns[index];
    if (!spawn) throw new Error(`Not enough spawns for player ${index}`);
    return {
      id,
      x: spawn.x,
      y: spawn.y,
      fx: 0,
      fy: 1,
      held: null,
      acting: false,
      ackSeq: 0,
      vx: 0,
      vy: 0,
      dashT: 0,
      dashCd: 0,
      throwCd: 0,
      sprintEnergy: SPRINT_MAX,
      sprintCooldown: 0,
      sprintExhausted: false
    };
  });

  const stations: StationState[] = parsed.stations.map(st => {
    let item: Item | null = null;
    if (st.type === 'stove' && st.stoveTool) {
      item = {
        type: 'tool',
        tool: st.stoveTool,
        contents: [],
        progress: 0
      };
    } else if (st.type === 'extinguisher') {
      item = {
        type: 'tool',
        tool: 'extinguisher',
        contents: [],
        progress: 0
      };
    }
    return {
      x: st.x,
      y: st.y,
      type: st.type,
      crate: st.crate,
      item,
      progress: 0,
      dirtyCount: 0,
      cleanCount: st.type === 'plate_dispenser' ? level.plates : 0,
      pendingReturns: [],
      onFire: false,
      fireTimer: 0,
      burntTimer: 0,
      dir: st.dir
    };
  });

  return {
    levelId: level.id,
    width: parsed.width,
    height: parsed.height,
    tiles: parsed.tiles,
    stations,
    players,
    orders: [],
    nextOrderId: 1,
    nextOrderIn: ORDER_FIRST_AT,
    score: 0,
    served: 0,
    expired: 0,
    timeLeft: level.duration,
    tick: 0,
    timeElapsed: 0,
    rngState: seed,
    ended: false,
    recipeWeights: structuredClone(level.recipes),
    starThresholds: [...level.stars],
    projectiles: [],
    nextProjectileId: 1,
    customers: [],
    nextCustomerId: 1,
    streak: 0,
    maxStreak: 0,
    servedByPlayer: {},
    orderScript: level.orderScript ? structuredClone(level.orderScript) : undefined,
    nextScriptIdx: level.orderScript ? 0 : undefined
  };
}

export function getStationAt(state: GameState, tx: number, ty: number): StationState | undefined {
  return state.stations.find(s => s.x === tx && s.y === ty);
}
