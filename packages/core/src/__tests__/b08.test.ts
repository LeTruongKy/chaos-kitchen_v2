import { describe, it, expect } from 'vitest';
import { createGameState, getStationAt } from '../sim/createState';
import { step } from '../sim/step';
import { interact } from '../sim/interact';
import { LevelDef, GameState, PlateItem, Order } from '../types';
import { CONVEYOR_SPEED } from '../constants';

const levelB08: LevelDef = {
  id: 'b08',
  name: 'Conveyors',
  ascii: [
    '#########',
    '#1234...#',
    '#>>>X...#',
    '#v......#',
    '#Q......#',
    '#P.X.W..#',
    '#D.C.S..#',
    '#L.T....#',
    '#########'
  ],
  duration: 200,
  plates: 2,
  recipes: [{ id: 'salad', weight: 1 }],
  stars: [10, 20, 30],
  world: 1,
  theme: 'diner'
};

function simTime(state: GameState, seconds: number) {
  const ticks = Math.round(seconds * 30);
  for (let i = 0; i < ticks; i++) {
    step(state, {});
  }
}

describe('B08 - Conveyors', () => {
  it('Item on a 3-cell conveyor moves to the counter at the end', () => {
    const state = createGameState(levelB08, ['p1'], 1);
    
    // Put a tomato on the first conveyor (1, 2)
    const conv1 = getStationAt(state, 1, 2)!;
    expect(conv1.type).toBe('conveyor');
    expect(conv1.dir).toBe('right');
    
    conv1.item = { type: 'ingredient', id: 'tomato', state: 'raw' };
    conv1.progress = 0;
    
    // Advance time: it takes 1 / 0.6 = 1.666s per cell.
    // 3 cells takes 3 / 0.6 = 5 seconds.
    // However, there are only 3 conveyors: (1,2), (2,2), (3,2).
    // The first one is at 1,2. It will move to 2,2 after 1.666s.
    // Then to 3,2 after another 1.666s.
    // Then to 4,2 (the counter) after another 1.666s.
    // Total 5 seconds.
    simTime(state, 4.8);
    
    // Not yet on the counter
    const counter = getStationAt(state, 4, 2)!;
    expect(counter.item).toBeNull();
    
    // After a little more time, it should be on the counter
    simTime(state, 0.4);
    expect(counter.item).not.toBeNull();
    expect(counter.item!.type).toBe('ingredient');
    
    // The conveyors should be empty
    expect(getStationAt(state, 1, 2)!.item).toBeNull();
    expect(getStationAt(state, 2, 2)!.item).toBeNull();
    expect(getStationAt(state, 3, 2)!.item).toBeNull();
  });

  it('Waits at the end if the counter is full, moves when empty', () => {
    const state = createGameState(levelB08, ['p1'], 1);
    
    const conv3 = getStationAt(state, 3, 2)!; // Last conveyor
    conv3.item = { type: 'ingredient', id: 'tomato', state: 'raw' };
    
    const counter = getStationAt(state, 4, 2)!;
    counter.item = { type: 'ingredient', id: 'lettuce', state: 'raw' };
    
    simTime(state, 2.0); // More than enough for 1 cell
    
    // Tomato is stuck on the conveyor at progress 1
    expect(conv3.item).not.toBeNull();
    expect(conv3.progress).toBe(1);
    expect(counter.item!.type).toBe('ingredient');
    
    // Free the counter
    counter.item = null;
    
    // Advance 1 tick
    step(state, {});
    
    // Now it moves
    expect(conv3.item).toBeNull();
    expect(counter.item).not.toBeNull();
    expect(counter.item!.type).toBe('ingredient');
  });

  it('Conveyor to serve works if matching order', () => {
    const state = createGameState(levelB08, ['p1'], 1);
    const table = getStationAt(state, 1, 4)!;
    const cId = state.nextCustomerId++;
    state.customers.push({ id: cId, x: table.x, y: table.y, state: 'order_taken', recipe: 'salad', patience: 100, maxPatience: 100, timer: 0, colorIndex: 0 });
    table.customerId = cId;
    state.orders = [{ id: 999, recipe: 'salad', timeLeft: 100, patience: 100, customerId: cId }];
    state.nextOrderIn = 9999;
    
    const conv = getStationAt(state, 1, 3)!; // v at (1,3)
    expect(conv.dir).toBe('down');
    
    // Make a salad on a plate
    conv.item = { 
      type: 'plate', 
      dirty: false, 
      contents: [
        { type: 'ingredient', id: 'tomato', state: 'chopped' },
        { type: 'ingredient', id: 'lettuce', state: 'chopped' }
      ] 
    };
    
    simTime(state, 1.7); // Takes 1.666s
    
    // Should be served
    expect(conv.item).toBeNull();
    expect(state.served).toBe(1);
    expect(state.orders.some(o => o.id === 999)).toBe(false);
  });

  it('Player can interact with conveyor (pick up and put down)', () => {
    const state = createGameState(levelB08, ['p1'], 1);
    const player = state.players[0]!;
    player.x = 1.5;
    player.y = 1.5; // Facing (1,2)
    player.fx = 0;
    player.fy = 1; // Facing down (1, 2)
    
    player.held = { type: 'ingredient', id: 'tomato', state: 'raw' };
    
    // Drop onto conveyor
    interact(state, 'p1');
    const conv = getStationAt(state, 1, 2)!;
    expect(player.held).toBeNull();
    expect(conv.item).not.toBeNull();
    expect(conv.progress).toBe(0); // Progress is 0 after drop
    
    simTime(state, 0.5); // Moves a bit
    expect(conv.progress).toBeGreaterThan(0);
    
    // Pick up
    interact(state, 'p1');
    expect(player.held).not.toBeNull();
    expect(conv.item).toBeNull();
  });
});
