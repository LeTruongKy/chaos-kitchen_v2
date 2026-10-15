import { describe, it, expect, vi } from 'vitest';
import { GameLoop } from '../rooms/gameLoop.js';
import { GameState } from '@kitchen/core';

describe('GameLoop', () => {
  it('advance(100ms) runs 3 ticks (at 30Hz)', () => {
    const gameState = { ended: false, players: [], stations: [], orders: [], customers: [], timeElapsed: 0, nextCustomerId: 1, streak: 0 } as unknown as GameState;
    const inputQueues = {};
    const onEvents = vi.fn();
    const onSnapshot = vi.fn();
    const onEnd = vi.fn();
    const isConnected = () => true;
    const hasAnyConnected = () => true;

    const loop = new GameLoop(gameState, inputQueues, onEvents, onSnapshot, onEnd, isConnected, hasAnyConnected);
    
    // 1 tick = 1000/30 = 33.33ms. 100ms = exactly 3 ticks.
    loop.advance(100);
    // 3 ticks means ticksSinceSnapshot reached 2 -> 1 snapshot triggered, and then ticksSinceSnapshot is 1.
    expect(onSnapshot).toHaveBeenCalledTimes(1);
  });

  it('advance(1000ms) runs max 5 ticks', () => {
    const gameState = { ended: false, players: [], stations: [], orders: [], customers: [], timeElapsed: 0, nextCustomerId: 1, streak: 0 } as unknown as GameState;
    const inputQueues = {};
    const onEvents = vi.fn();
    const onSnapshot = vi.fn();
    const onEnd = vi.fn();
    const isConnected = () => true;
    const hasAnyConnected = () => true;

    const loop = new GameLoop(gameState, inputQueues, onEvents, onSnapshot, onEnd, isConnected, hasAnyConnected);
    
    // 1000ms is way more than 5 ticks, but advance should clamp to 5 ticks.
    loop.advance(1000);
    // 5 ticks: snapshot at tick 2, snapshot at tick 4. So 2 snapshots.
    expect(onSnapshot).toHaveBeenCalledTimes(2);
  });
});
