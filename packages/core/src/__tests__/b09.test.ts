import { describe, it, expect } from 'vitest';
import { createGameState } from '../sim/createState';
import { serveCustomerOrder, tickOrders } from '../sim/orders';
import { GameState, LevelDef, PlateItem, Order } from '../types';

const levelB09: LevelDef = {
  id: 'b09',
  name: 'Test B09',
  duration: 180,
  plates: 4,
  world: 1,
  theme: 'diner',
  recipes: [
    { id: 'salad', weight: 1 },
    { id: 'burger', weight: 1 }
  ],
  stars: [40, 100, 160],
  orderScript: [
    { at: 1, recipe: 'burger' },
    { at: 2, recipe: 'salad' },
  ],
  ascii: [
    '############',
    '#XTLBMXXQWX#',
    '#C........X#',
    '#C...12...D#',
    '#X...34...Q#',
    '#S........Q#',
    '#S........X#',
    '#XXPXXXXXXX#',
    '############'
  ]
};

describe('B09 - Orders and Streak', () => {
  it('Spawns script orders correctly', () => {
    const state = createGameState(levelB09, ['p1'], 1);
    
    // tick to 0.9s -> no customers
    state.tick = 27; // 0.9s
    state.timeElapsed = 0.9;
    tickOrders(state, 0.9);
    expect(state.customers.length).toBe(0);
    
    // tick to 1.1s -> 1 customer (burger)
    state.tick = 33; // 1.1s
    state.timeElapsed = 1.1;
    tickOrders(state, 0.2); // total 1.1s
    expect(state.customers.length).toBe(1);
    expect(state.customers[0]!.recipe).toBe('burger');
    expect(state.customers[0]!.patience).toBe(75);
    
    // tick to 2.1s -> 2 customers (salad)
    state.tick = 63;
    state.timeElapsed = 2.1;
    tickOrders(state, 1.0);
    expect(state.customers.length).toBe(2);
    expect(state.customers[1]!.recipe).toBe('salad');
    expect(state.customers[1]!.patience).toBe(60);
  });

  it('Calculates streak and rewards properly', () => {
    const state = createGameState(levelB09, ['p1'], 1);
    
    state.customers = [];
    state.orders = [];
    for (let i = 1; i <= 5; i++) {
      state.customers.push({
        id: i, x: 8, y: 4, state: 'order_taken', recipe: 'salad', timer: 0, patience: 60, maxPatience: 60, colorIndex: 0
      });
      state.orders.push({ id: i, customerId: i, recipe: 'salad', timeLeft: 60, patience: 60 });
    }
    
    const p = { id: 'p1', x: 7.5, y: 4.5, dir: 'right', held: null } as any;
    const st = { x: 8, y: 4, type: 'table' as const, item: null, progress: 0, dirtyCount: 0, cleanCount: 0, pendingReturns: [], onFire: false, fireTimer: 0, burntTimer: 0 };
    
    const serve = (id: number) => {
      let plate = { type: 'plate', dirty: false, contents: [{ type: 'ingredient', id: 'lettuce', state: 'chopped' }, { type: 'ingredient', id: 'tomato', state: 'chopped' }] } as PlateItem;
      serveCustomerOrder(state, plate, st, p, id);
    };

    serve(1);
    expect(state.streak).toBe(1);
    expect(state.score).toBe(20 + 10);
    
    state.score = 0;
    serve(2);
    expect(state.streak).toBe(2);
    expect(state.score).toBe(20 + 10 * 2);
    
    state.score = 0;
    serve(3);
    expect(state.streak).toBe(3);
    expect(state.score).toBe(20 + 10 * 3);
    
    state.score = 0;
    serve(4);
    expect(state.streak).toBe(4);
    expect(state.score).toBe(20 + 10 * 4);
    
    state.score = 0;
    serve(5);
    expect(state.streak).toBe(4);
    expect(state.score).toBe(20 + 10 * 4);
  });

  it('Resets streak on expire', () => {
    const state = createGameState(levelB09, ['p1'], 1);
    state.streak = 4;
    state.customers.push({ id: 1, x: 8, y: 4, state: 'order_taken', recipe: 'salad', timer: 0, patience: 0, maxPatience: 60, colorIndex: 0 });
    state.orders = [{ id: 1, customerId: 1, recipe: 'salad', timeLeft: 0, patience: 60 }];
    
    tickOrders(state, 0.1);
    expect(state.orders.length).toBe(0);
    expect(state.streak).toBe(0);
  });
});
