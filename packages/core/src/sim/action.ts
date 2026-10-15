import { GameState, PlayerInput, GameEvent, StationState } from '../types';
import { CHOP_TIME, WASH_TIME, INTERACT_REACH, EXTINGUISH_RANGE, EXTINGUISH_TIME } from '../constants';
import { getStationAt } from './createState';
import { canChop, makePlate } from '../recipes';

export function updateAction(state: GameState, playerId: string, input: PlayerInput, dt: number): GameEvent[] {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return [];

  const isExtinguishing = player.held && player.held.type === 'tool' && player.held.tool === 'extinguisher';

  if (!isExtinguishing && !input.act && !player.autoAction) {
    player.acting = false;
    return [];
  }

  if (!isExtinguishing && (input.mx !== 0 || input.my !== 0)) {
    player.acting = false;
    player.autoAction = undefined;
    return [];
  }

  if (isExtinguishing) {
    if (!input.act) {
      player.acting = false;
      return [];
    }
    player.acting = true;
    let bestDist = Infinity;
    let targetStation: StationState | null = null;
    
    for (const st of state.stations) {
      if (st.onFire) {
        const dx = (st.x + 0.5) - player.x;
        const dy = (st.y + 0.5) - player.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist <= EXTINGUISH_RANGE) {
          const angle = Math.atan2(dy, dx);
          const pAngle = Math.atan2(player.fy, player.fx);
          let diff = Math.abs(angle - pAngle);
          while (diff > Math.PI) diff = 2 * Math.PI - diff;
          if (diff <= Math.PI / 3 + 1e-3) {
            if (dist < bestDist) {
              bestDist = dist;
              targetStation = st;
            }
          }
        }
      }
    }
    
    if (targetStation) {
      if (targetStation.lastActTick !== state.tick) {
        targetStation.lastActTick = state.tick;
        targetStation.progress += 2 * dt; // counteracts the -1*dt in tickStations
        if (targetStation.progress >= EXTINGUISH_TIME - 1e-5) {
          targetStation.onFire = false;
          targetStation.burntTimer = 0;
          targetStation.progress = 0;
          return [{ type: 'extinguish', x: targetStation.x + 0.5, y: targetStation.y + 0.5 }];
        }
      }
      return [];
    }
    return [];
  }

  const targetX = player.x + player.fx * INTERACT_REACH;
  const targetY = player.y + player.fy * INTERACT_REACH;
  const tx = Math.floor(targetX);
  const ty = Math.floor(targetY);

  if (tx < 0 || tx >= state.width || ty < 0 || ty >= state.height) {
    player.acting = false;
    player.autoAction = undefined;
    return [];
  }

  const station = getStationAt(state, tx, ty);
  if (!station || station.onFire) {
    player.acting = false;
    player.autoAction = undefined;
    return [];
  }

  // Chopping at cutting station
  if (station.type === 'cutting') {
    const item = station.item;
    if (item && item.type === 'ingredient' && item.state === 'raw' && canChop(item) && !player.held) {
      if (input.act) {
        player.autoAction = 'chop';
      }
      if (player.autoAction === 'chop' || input.act) {
        player.acting = true;
        station.progress += dt;
        if (station.progress >= CHOP_TIME - 1e-5) {
          station.progress = 0;
          item.state = 'chopped';
          if (!player.held) {
            player.held = item;
            station.item = null;
          }
          player.autoAction = undefined;
          player.acting = false;
          return [{ type: 'chop_done', x: station.x + 0.5, y: station.y + 0.5, playerId: player.id }];
        }
        return [];
      }
    }
    player.acting = false;
    player.autoAction = undefined;
    return [];
  }

  // Washing dishes at sink
  if (station.type === 'sink') {
    if (station.dirtyCount > 0 && !player.held) {
      if (input.act) {
        player.autoAction = 'wash';
      }
      if (player.autoAction === 'wash' || input.act) {
        player.acting = true;
        station.progress += dt;
        if (station.progress >= WASH_TIME - 1e-5) {
          station.progress = 0;
          station.dirtyCount--;
          if (!player.held) {
            player.held = makePlate(false);
          } else {
            station.cleanCount++;
          }
          player.autoAction = undefined;
          player.acting = false;
          return [{ type: 'wash_done', x: station.x + 0.5, y: station.y + 0.5, playerId: player.id }];
        }
        return [];
      }
    }
    player.acting = false;
    player.autoAction = undefined;
    return [];
  }

  player.acting = false;
  player.autoAction = undefined;
  return [];
}
