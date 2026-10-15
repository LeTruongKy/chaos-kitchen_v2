import { describe, it, expect } from 'vitest';
import { GameState, PlayerState } from '../types';
import { step } from '../sim/step';
import { THROW_SPEED, THROW_MAX_RANGE, CATCH_RADIUS } from '../constants';

function createMockState(tiles: string[], width: number, height: number): GameState {
  return {
    width,
    height,
    tiles: tiles as any[],
    stations: [
      { x: 2, y: 0, type: 'counter', item: null, progress: 0, dirtyCount: 0, cleanCount: 0, pendingReturns: [], onFire: false, fireTimer: 0, burntTimer: 0 },
      { x: 3, y: 0, type: 'trash', item: null, progress: 0, dirtyCount: 0, cleanCount: 0, pendingReturns: [], onFire: false, fireTimer: 0, burntTimer: 0 },
      { x: 4, y: 0, type: 'counter', item: { type: 'plate', dirty: false, contents: [] }, progress: 0, dirtyCount: 0, cleanCount: 0, pendingReturns: [], onFire: false, fireTimer: 0, burntTimer: 0 },
    ],
    players: [
      { id: 'p1', x: 0.5, y: 0.5, vx: 0, vy: 0, fx: 1, fy: 0, dashT: 0, dashCd: 0, throwCd: 0, acting: false, held: null, ackSeq: 0 },
      { id: 'p2', x: 2.5, y: 0.5, vx: 0, vy: 0, fx: -1, fy: 0, dashT: 0, dashCd: 0, throwCd: 0, acting: false, held: null, ackSeq: 0 },
    ],
    projectiles: [],
    nextProjectileId: 1,
    orders: [],
    customers: [],
    score: 0,
    streak: 0,
    timeLeft: 100,
    tick: 0,
    ended: false,
  } as unknown as GameState;
}

function simTime(state: GameState, time: number) {
  const dt = 1/30;
  const steps = Math.ceil(time / dt);
  for (let i = 0; i < steps; i++) {
    step(state, {}, dt);
  }
}

describe('B07 - Throw and Catch', () => {
  it('should allow player to throw ingredient', () => {
    const state = createMockState(['floor','floor','wall','floor','floor'], 5, 1);
    const p1 = state.players[0]!;
    p1.held = { type: 'ingredient', id: 'tomato', state: 'raw' };
    
    // Throw
    step(state, { p1: { seq: 1, mx: 0, my: 0, interact: false, act: false, dash: false, throw: true } }, 1/30);
    
    expect(p1.held).toBeNull();
    expect(state.projectiles.length).toBe(1);
    const proj = state.projectiles[0]!;
    expect(proj.item.id).toBe('tomato');
    expect(proj.vx).toBe(THROW_SPEED); // fx = 1
  });

  it('should travel and splat on floor', () => {
    const state = createMockState(['floor','floor','floor','floor','floor','floor','floor','floor'], 8, 1);
    state.players[1]!.x = 99; // Move p2 out of the way
    const p1 = state.players[0]!;
    p1.held = { type: 'ingredient', id: 'tomato', state: 'raw' };
    
    step(state, { p1: { seq: 1, mx: 0, my: 0, interact: false, act: false, dash: false, throw: true } }, 1/30);
    
    // Sim enough time for THROW_MAX_RANGE
    simTime(state, 0.6);

    // Should splat
    expect(state.projectiles.length).toBe(0);
    // There should be a new floor station with the splat
    const floorSplat = state.stations.find(s => s.type === 'floor');
    expect(floorSplat).toBeDefined();
    expect(floorSplat!.item!.type).toBe('ingredient');
    expect((floorSplat!.item as any).state).toBe('splat');
  });

  it('should allow catching by another player', () => {
    const state = createMockState(['floor','floor','floor','floor','floor'], 5, 1);
    const p1 = state.players[0]!; // x = 0.5
    const p2 = state.players[1]!; // x = 2.5
    p1.held = { type: 'ingredient', id: 'tomato', state: 'raw' };
    
    step(state, { p1: { seq: 1, mx: 0, my: 0, interact: false, act: false, dash: false, throw: true } }, 1/30);
    
    // Move projectile to near p2
    // Dist = 2.0. Speed = THROW_SPEED (9). time = 2.0 / 9 = 0.22s
    simTime(state, 0.25);

    expect(state.projectiles.length).toBe(0);
    expect(p2.held).toBeDefined();
    expect(p2.held!.type).toBe('ingredient');
    expect((p2.held as any).id).toBe('tomato');
  });

  it('should land on valid counter', () => {
    const state = createMockState(['floor','floor','counter','wall','wall'], 5, 1);
    state.players[1]!.x = 99; // Move p2 out of the way
    const p1 = state.players[0]!; // x = 0.5
    // counter at x=2
    p1.held = { type: 'ingredient', id: 'tomato', state: 'raw' };
    
    step(state, { p1: { seq: 1, mx: 0, my: 0, interact: false, act: false, dash: false, throw: true } }, 1/30);
    
    simTime(state, 0.6); // enough time to hit wall

    expect(state.projectiles.length).toBe(0);
    const counter = state.stations.find(s => s.x === 2);
    expect(counter!.item).toBeDefined();
    expect(counter!.item!.type).toBe('ingredient');
  });

  it('should disappear into pit', () => {
    const state = createMockState(['floor','floor','floor','floor','floor','floor','floor'], 7, 1);
    const p1 = state.players[0]!; // x = 0.5
    p1.held = { type: 'ingredient', id: 'tomato', state: 'raw' };
    
    // make max range end exactly on pit
    // THROW_MAX_RANGE is 4.5.
    // If it starts at x=1.0, it will end at x=5.5. So tile tx=5 should be pit.
    state.tiles[5] = 'pit' as any;

    step(state, { p1: { seq: 1, mx: 0, my: 0, interact: false, act: false, dash: false, throw: true } }, 1/30);
    
    simTime(state, 0.6); // enough time to travel 4.5

    expect(state.projectiles.length).toBe(0);
    const splat = state.stations.find(s => s.type === 'floor');
    expect(splat).toBeUndefined(); // no splat because it's pit
  });

  it('can pick up splat from floor', () => {
    const state = createMockState(['floor','floor','floor','floor','floor'], 5, 1);
    const p1 = state.players[0]!; // x = 0.5
    p1.x = 1.5; // So that fx=-1 targets x=0.5 -> tx=0
    
    state.stations.push({
      x: 0, y: 0, type: 'floor',
      item: { type: 'ingredient', id: 'tomato', state: 'splat' },
      progress: 0, dirtyCount: 0, cleanCount: 0, pendingReturns: [], onFire: false, fireTimer: 0, burntTimer: 0
    });

    p1.fx = -1; // face left to x=0
    step(state, { p1: { seq: 1, mx: 0, my: 0, interact: true, act: false, dash: false, throw: false } }, 1/30);
    
    expect(p1.held).toBeDefined();
    expect(p1.held!.type).toBe('ingredient');
    expect((p1.held as any).state).toBe('splat');
  });
});
