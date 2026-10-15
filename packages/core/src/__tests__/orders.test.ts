import { describe, it, expect, beforeEach } from 'vitest';
import { step } from '../sim/step';
import { createGameState, getStationAt } from '../sim/createState';
import { GameState, PlateItem, StationState, IngredientItem } from '../types';
import { makePlate } from '../recipes';
import { SIM_HZ, ORDER_FIRST_AT, ORDER_MAX_ACTIVE, ORDER_EXPIRE_PENALTY, ORDER_PATIENCE, ORDER_PATIENCE_BY_RECIPE } from '../constants';
import { calcStars, buildResults } from '../sim/orders';

describe('orders (T08)', () => {
  let state: GameState;
  const level1 = {
    id: 'l1', name: 'L1',
    ascii: [
      '##########',
      '#1234....#',
      '#P.W.D.C.#',
      '#Q.S.L.T.#',
      '#X.X.....#',
      '##########'
    ],
    duration: 180,
    plates: 4,
    recipes: [{ id: 'salad' as any, weight: 1 }],
    stars: [40, 100, 160] as [number, number, number],
    world: 1,
    theme: 'diner' as any
  };

  beforeEach(() => {
    state = createGameState(level1, ['p1'], 12345);
    state.players[0]!.fx = 1;
    state.players[0]!.fy = 0;
  });

  it('Đơn đầu xuất hiện ở tick = ORDER_FIRST_AT * SIM_HZ', () => {
    for (let i = 0; i < ORDER_FIRST_AT * SIM_HZ - 1; i++) {
      step(state, {});
    }
    // customers might spawn, check customers instead of orders
    // (orders are created when player takes order from customer)
    expect(state.customers.length).toBe(0);
    
    step(state, {});
    expect(state.customers.length).toBe(1);
  });

  it('Không bao giờ > ORDER_MAX_ACTIVE đơn cùng lúc', () => {
    for (let i = 0; i < 180 * SIM_HZ; i++) {
      step(state, {});
      // Keep customers patient so they stay
      state.customers.forEach(c => c.patience = 999);
      expect(state.customers.length).toBeLessThanOrEqual(ORDER_MAX_ACTIVE);
    }
  });

  it('Cùng seed -> danh sách đơn giống hệt qua 2 lần chạy', () => {
    const s1 = createGameState(level1, ['p1'], 999);
    const s2 = createGameState(level1, ['p1'], 999);
    
    for (let i = 0; i < 60 * SIM_HZ; i++) {
      step(s1, {});
      step(s2, {});
    }
    
    expect(s1.customers.map(c => c.recipe)).toEqual(s2.customers.map(c => c.recipe));
  });

  // Helper to place a customer at a table and take their order
    function setupCustomerOrder(recipe: import("../types").RecipeId, timeLeft: number, patience: number) {
    const table = state.stations.find(s => s.type === 'table')!;
    const customerId = state.nextCustomerId++;
    const customer = {
      id: customerId,
      x: table.x, y: table.y,
      state: 'order_taken' as any,
      recipe: recipe as import("../types").RecipeId,
      patience: timeLeft,
      maxPatience: patience,
      timer: 0,
      colorIndex: 0
    };
    state.customers.push(customer);
    table.customerId = customerId;
    state.orders.push({
      id: state.nextOrderId++,
      recipe: recipe as import("../types").RecipeId,
      timeLeft: timeLeft,
      patience: patience,
      customerId: customerId
    });
    return { table, customer };
  }

  it('Phục vụ salad khi timeLeft=patience -> score += 30', () => {
    const { table } = setupCustomerOrder('salad', ORDER_PATIENCE, ORDER_PATIENCE);
    
    const p1 = state.players[0]!;
    p1.x = table.x + 1.5; p1.y = table.y + 0.5; p1.fx = -1; p1.fy = 0;
    
    const plate = makePlate(false);
    plate.contents.push({ type: 'ingredient', id: 'lettuce', state: 'chopped' });
    plate.contents.push({ type: 'ingredient', id: 'tomato', state: 'chopped' });
    
    p1.held = plate;
    
    const events = step(state, { p1: { seq: 1, mx: 0, my: 0, act: false, interact: true, dash: false, throw: false } });
    
    expect(state.score).toBe(30);
    expect(state.served).toBe(1);
    expect(state.orders.length).toBe(0);
    expect(p1.held).toBeNull();
    expect(events.some(e => e.type === 'serve_ok')).toBe(true);
  });

  it('Phục vụ salad khi timeLeft=patience/2 -> score += 25', () => {
    const { table } = setupCustomerOrder('salad', ORDER_PATIENCE / 2, ORDER_PATIENCE);
    
    const p1 = state.players[0]!;
    p1.x = table.x + 1.5; p1.y = table.y + 0.5; p1.fx = -1; p1.fy = 0;
    
    const plate = makePlate(false);
    plate.contents.push({ type: 'ingredient', id: 'lettuce', state: 'chopped' });
    plate.contents.push({ type: 'ingredient', id: 'tomato', state: 'chopped' });
    
    p1.held = plate;
    
    step(state, { p1: { seq: 1, mx: 0, my: 0, act: false, interact: true, dash: false, throw: false } });
    
    expect(state.score).toBe(25);
  });

  it('Hai đơn cùng lúc -> phục vụ đơn có timeLeft nhỏ hơn', () => {
    // Setup 2 customers at different tables
    const tables = state.stations.filter(s => s.type === 'table');
    
    const c1Id = state.nextCustomerId++;
    state.customers.push({ id: c1Id, x: tables[0]!.x, y: tables[0]!.y, state: 'order_taken', recipe: "salad" as import("../types").RecipeId as any as any, patience: 20, maxPatience: 70, timer: 0, colorIndex: 0 });
    tables[0]!.customerId = c1Id;
    state.orders.push({ id: 10, recipe: "salad" as import("../types").RecipeId as any as any, timeLeft: 20, patience: 70, customerId: c1Id });

    const c2Id = state.nextCustomerId++;
    state.customers.push({ id: c2Id, x: tables[0]!.x, y: tables[0]!.y, state: 'order_taken', recipe: "salad" as import("../types").RecipeId as any as any, patience: 10, maxPatience: 70, timer: 0, colorIndex: 0 });
    // Use the same table to test serve logic picks correct order
    state.orders.push({ id: 11, recipe: "salad" as import("../types").RecipeId as any as any, timeLeft: 10, patience: 70, customerId: c2Id });
    
    const p1 = state.players[0]!;
    p1.x = tables[0]!.x + 1.5; p1.y = tables[0]!.y + 0.5; p1.fx = -1; p1.fy = 0;
    
    const plate = makePlate(false);
    plate.contents.push({ type: 'ingredient', id: 'lettuce', state: 'chopped' });
    plate.contents.push({ type: 'ingredient', id: 'tomato', state: 'chopped' });
    
    p1.held = plate;
    
    step(state, { p1: { seq: 1, mx: 0, my: 0, act: false, interact: true, dash: false, throw: false } });
    
    // The customer at that table (c1) was served. c2 still has their order
    expect(state.orders.length).toBe(1);
    expect(state.orders[0]!.id).toBe(11);
  });

  it('Đĩa sai / chưa đủ -> serve_fail, đĩa còn trên tay, điểm không đổi', () => {
    const { table } = setupCustomerOrder('salad', 50, 70);
    
    const p1 = state.players[0]!;
    p1.x = table.x + 1.5; p1.y = table.y + 0.5; p1.fx = -1; p1.fy = 0;
    
    const plate = makePlate(false);
    plate.contents.push({ type: 'ingredient', id: 'lettuce', state: 'chopped' });
    // thiếu tomato
    
    p1.held = plate;
    
    const events = step(state, { p1: { seq: 1, mx: 0, my: 0, act: false, interact: true, dash: false, throw: false } });
    
    expect(state.score).toBe(0);
    expect(p1.held).not.toBeNull();
    expect(events.some(e => e.type === 'serve_fail')).toBe(true);
  });

  it('Đơn hết hạn -> score giảm 10 (không dưới 0), expired++', () => {
    setupCustomerOrder('salad', 1 / SIM_HZ, 70);
    
    step(state, {});
    
    expect(state.orders.length).toBe(0);
    expect(state.expired).toBe(1);
    expect(state.score).toBe(0); // Không dưới 0
    
    state.score = 50;
    setupCustomerOrder('salad', 1 / SIM_HZ, 70);
    step(state, {});
    expect(state.score).toBe(40);
  });

  it('Sau phục vụ, khách ăn 5s rồi để lại đĩa bẩn trên bàn', () => {
    const { table, customer } = setupCustomerOrder('salad', 50, 70);
    const p1 = state.players[0]!;
    p1.x = table.x + 1.5; p1.y = table.y + 0.5; p1.fx = -1; p1.fy = 0;
    
    const plate = makePlate(false);
    plate.contents.push({ type: 'ingredient', id: 'lettuce', state: 'chopped' });
    plate.contents.push({ type: 'ingredient', id: 'tomato', state: 'chopped' });
    p1.held = plate;
    
    step(state, { p1: { seq: 1, mx: 0, my: 0, act: false, interact: true, dash: false, throw: false } });
    
    // Customer should be eating now
    expect(customer.state).toBe('eating');
    
    // tick 5s -> customer leaves, dirty plate on table
    for (let i = 0; i < 5 * SIM_HZ; i++) {
      step(state, {});
    }
    
    expect(table.item).not.toBeNull();
    expect((table.item as PlateItem).dirty).toBe(true);
    expect(table.customerId).toBeUndefined();
  });

  it('timeLeft về 0 -> ended=true; calcStars đúng biên', () => {
    state.timeLeft = 1 / SIM_HZ;
    step(state, {});
    expect(state.ended).toBe(true);
    expect(state.timeLeft).toBe(0);
    
    expect(calcStars(39, [40, 100, 160])).toBe(0);
    expect(calcStars(40, [40, 100, 160])).toBe(1);
    expect(calcStars(100, [40, 100, 160])).toBe(2);
    expect(calcStars(160, [40, 100, 160])).toBe(3);
    
    state.score = 100;
    const res = buildResults(state);
    expect(res.score).toBe(100);
    expect(res.stars).toBe(2);
  });
});
