import { GameState, step, toSnapshot, PlayerInput, SIM_HZ, SNAPSHOT_EVERY_N_TICKS, GameEvent, Snapshot } from '@kitchen/core';
import { InputQueue } from './inputQueue.js';

export class GameLoop {
  private accumulator = 0;
  private ticksSinceSnapshot = 0;

  constructor(
    private gameState: GameState,
    private inputQueues: Record<string, InputQueue>,
    private onEvents: (events: GameEvent[]) => void,
    private onSnapshot: (snapshot: Snapshot) => void,
    private onEnd: () => void,
    private isConnected: (playerId: string) => boolean,
    private hasAnyConnected: () => boolean
  ) {}

  advance(deltaMs: number) {
    if (this.gameState.ended) {
      this.onEnd();
      return;
    }
    if (!this.hasAnyConnected()) return;

    this.accumulator += deltaMs;
    const tickMs = 1000 / SIM_HZ;
    let ticks = 0;
    const maxTicks = 5;

    while (this.accumulator >= tickMs) {
      if (ticks >= maxTicks) {
        this.accumulator = 0;
        break;
      }
      this.accumulator -= tickMs;
      ticks++;

      const inputs: Record<string, PlayerInput> = {};
      for (const id of this.gameState.players.map((p) => p.id)) {
        if (!this.isConnected(id)) continue;
        const input = this.inputQueues[id]?.next();
        if (input) inputs[id] = input;
      }

      const events = step(this.gameState, inputs);
      if (events.length > 0) {
        this.onEvents(events);
      }

      this.ticksSinceSnapshot++;
      if (this.ticksSinceSnapshot >= SNAPSHOT_EVERY_N_TICKS) {
        this.ticksSinceSnapshot = 0;
        this.onSnapshot(toSnapshot(this.gameState));
      }

      if (this.gameState.ended) {
        this.onEnd();
        break;
      }
    }
  }
}
