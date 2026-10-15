import { GameState, PlayerInput, GameEvent } from '../types';
import { SIM_HZ } from '../constants';
import { movePlayer, resolvePlayerCollisions } from './movement';
import { interact } from './interact';
import { updateAction } from './action';
import { tickStations } from './stations';
import { tickOrders } from './orders';
import { tickProjectiles, tryThrow } from './projectiles';


export function step(state: GameState, inputs: Record<string, PlayerInput | undefined>, dt = 1/SIM_HZ): GameEvent[] {
  if (state.ended) {
    return [];
  }

  state.tick++;
  state.timeLeft -= dt;
  state.timeElapsed += dt;
  const events: GameEvent[] = [];

  for (const player of state.players) {
    const input = inputs[player.id];
    if (input) {
      const oldDashT = player.dashT;
      movePlayer(state, player.id, input, dt);
      if (player.dashT > 0 && oldDashT <= 0) {
        events.push({ type: 'dash', playerId: player.id, x: player.x, y: player.y });
      }
    }
  }

  resolvePlayerCollisions(state);

  for (const player of state.players) {
    let input = inputs[player.id];
    if (!input && player.autoAction) {
      input = { seq: player.ackSeq, mx: 0, my: 0, act: false, interact: false, dash: false, throw: false };
    }
    if (input) {
      if (input.interact) {
        events.push(...interact(state, player.id));
      }
      if (input.throw) {
        events.push(...tryThrow(state, player));
      }
      events.push(...updateAction(state, player.id, input, dt));
      if (player.throwCd > 0) {
        player.throwCd -= dt;
      }
    }
  }

  events.push(...tickStations(state, dt));
  events.push(...tickOrders(state, dt));
  if (state.projectiles) {
    events.push(...tickProjectiles(state, dt));
  }

  if (state.timeLeft <= 0) {
    state.timeLeft = 0;
    state.ended = true;
  }

  return events;
}
