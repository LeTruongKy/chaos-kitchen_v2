import { describe, it, expect } from 'vitest';
import { createGameState, getStationAt } from '../sim/createState';
import { step } from '../sim/step';
import { toSnapshot } from '../sim/snapshot';
import { level1 } from '../levels/level1';

describe('sim T04', () => {
  it('createGameState đúng', () => {
    const state = createGameState(level1, ['a', 'b'], 1);
    
    expect(state.players.length).toBe(2);
    expect(state.players[0]!.id).toBe('a');
    const spawn1 = state.players[0]!;
    const spawn2 = state.players[1]!;
    expect(spawn1.x).toBeGreaterThan(0);
    expect(spawn2.x).toBeGreaterThan(0);

    const plateDispensers = state.stations.filter(s => s.type === 'plate_dispenser');
    expect(plateDispensers.length).toBeGreaterThan(0);
    expect(plateDispensers[0]!.cleanCount).toBe(4);

    const tomatoCrate = state.stations.find(s => s.type === 'crate' && s.crate === 'tomato');
    expect(tomatoCrate).toBeDefined();
    
    if (tomatoCrate) {
      const found = getStationAt(state, tomatoCrate.x, tomatoCrate.y);
      expect(found).toBe(tomatoCrate);
    }
  });

  it('throw khi 0 hoặc 5 người chơi', () => {
    expect(() => createGameState(level1, [], 1)).toThrow();
    expect(() => createGameState(level1, ['a','b','c','d','e'], 1)).toThrow();
  });

  it('step update đúng', () => {
    const state = createGameState(level1, ['a'], 1);
    const initialTimeLeft = state.timeLeft;
    
    for (let i = 0; i < 30; i++) {
      step(state, {});
    }

    expect(state.tick).toBe(30);
    expect(Math.abs(state.timeLeft - (initialTimeLeft - 1))).toBeLessThan(1e-9);
  });

  it('step khi ended không đổi state', () => {
    const state = createGameState(level1, ['a'], 1);
    state.ended = true;
    const initialTimeLeft = state.timeLeft;
    
    step(state, {});

    expect(state.tick).toBe(0);
    expect(state.timeLeft).toBe(initialTimeLeft);
  });

  it('toSnapshot deep clone', () => {
    const state = createGameState(level1, ['a'], 1);
    const snapshot = toSnapshot(state);

    // mutate state
    state.score = 100;
    state.players[0]!.x = 999;
    state.stations[0]!.progress = 999;

    expect(snapshot.score).toBe(0);
    expect(snapshot.players[0]!.x).not.toBe(999);
    expect(snapshot.stations[0]!.progress).not.toBe(999);
  });
});
