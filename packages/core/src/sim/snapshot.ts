import { GameState } from '../types';
import { Snapshot } from '../protocol';

export function toSnapshot(state: GameState): Snapshot {
  return structuredClone({
    tick: state.tick,
    timeLeft: state.timeLeft,
    score: state.score,
    players: state.players,
    stations: state.stations,
    orders: state.orders,
    projectiles: state.projectiles,
    customers: state.customers,
    streak: state.streak
  });
}
