import { describe, it, expect, beforeEach } from 'vitest';
import { step } from '../sim/step';
import { createGameState } from '../sim/createState';
import { GameState } from '../types';
import { makePlate } from '../recipes';
import { SIM_HZ, CUSTOMER_ORDER_WAIT, CUSTOMER_LEAVE_DURATION, ORDER_EXPIRE_PENALTY } from '../constants';

describe('Phase 1 - Customer Lifecycle', () => {
  let state: GameState;
  const testLevel = {
    id: 'test_lifecycle',
    name: 'Test Lifecycle',
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
    state = createGameState(testLevel, ['p1'], 12345);
    state.customers = [];
    state.orders = [];
    state.stations.filter(s => s.type === 'table').forEach(s => s.customerId = undefined);
    state.nextOrderIn = 99999; // Ngăn random spawn trong test
    state.score = 50;
    state.streak = 3;
    state.expired = 0;
  });

  function spawnCustomer(waitLeft = CUSTOMER_ORDER_WAIT) {
    const table = state.stations.find(s => s.type === 'table')!;
    const customerId = state.nextCustomerId++;
    const customer = {
      id: customerId,
      x: table.x,
      y: table.y,
      state: 'seated_waiting_order' as const,
      recipe: 'salad' as const,
      patience: 60,
      maxPatience: 60,
      timer: 0,
      colorIndex: 0,
      waitLeft,
      angry: false
    };
    state.customers.push(customer);
    table.customerId = customerId;
    return { table, customer };
  }

  function doInteract(pId = 'p1') {
    return step(state, { [pId]: { seq: 0, mx: 0, my: 0, act: false, interact: true, dash: false, throw: false } });
  }

  it('1. Khách không nhận order trong 30s -> giận, rời, -10 điểm, expired++, streak = 0, reason "no_order_taken"', () => {
    const { table, customer } = spawnCustomer(30);

    // Chạy 29.5 giây: khách vẫn đang đợi
    for (let i = 0; i < 29.5 * SIM_HZ; i++) {
      step(state, {});
    }
    expect(customer.state).toBe('seated_waiting_order');
    expect(customer.waitLeft).toBeCloseTo(0.5, 1);
    expect(state.score).toBe(50);
    expect(state.expired).toBe(0);
    expect(state.streak).toBe(3);

    // Chạy thêm 0.5s (tổng cộng 30s) -> khách chuyển sang leaving
    let leaveEvent: any;
    for (let i = 0; i < 0.5 * SIM_HZ; i++) {
      const evs = step(state, {});
      const found = evs.find(e => e.type === 'customer_leave');
      if (found) leaveEvent = found;
    }
    expect(customer.state).toBe('leaving');
    expect(customer.angry).toBe(true);
    expect(state.score).toBe(40); // 50 - 10
    expect(state.expired).toBe(1);
    expect(state.streak).toBe(0);

    // Kiểm tra event customer_leave với reason 'no_order_taken'
    expect(leaveEvent).toBeDefined();
    expect(leaveEvent?.reason).toBe('no_order_taken');
    expect(leaveEvent?.customerId).toBe(customer.id);

    // Trong thời gian leaving (0.6s), bàn vẫn có customerId
    expect(table.customerId).toBe(customer.id);

    // Chạy tiếp 0.6s để hoàn tất leaving
    for (let i = 0; i < CUSTOMER_LEAVE_DURATION * SIM_HZ; i++) {
      step(state, {});
    }
    // Khách đã bị xóa khỏi game, bàn trống
    expect(state.customers.find(c => c.id === customer.id)).toBeUndefined();
    expect(table.customerId).toBeUndefined();
  });

  it('2. Nhận order trong 29s -> không rời, chuyển sang order_taken, xóa waitLeft', () => {
    const { table, customer } = spawnCustomer(30);

    // Chạy 29 giây
    for (let i = 0; i < 29 * SIM_HZ; i++) {
      step(state, {});
    }
    expect(customer.state).toBe('seated_waiting_order');
    expect(customer.waitLeft).toBeCloseTo(1.0, 1);

    // Người chơi đứng ở ô sàn cạnh bàn Q và bấm interact để lấy order
    const p1 = state.players[0]!;
    p1.x = table.x + 1.5;
    p1.y = table.y + 0.5;
    p1.fx = -1;
    p1.fy = 0;
    p1.held = null;

    doInteract();

    expect(customer.state).toBe('order_taken');
    expect(customer.waitLeft).toBeUndefined();
    expect(customer.angry).toBe(false);
    expect(state.orders.length).toBe(1);
    expect(state.orders[0]?.customerId).toBe(customer.id);

    // Chạy thêm 5 giây: khách không bị timeout theo waitLeft
    for (let i = 0; i < 5 * SIM_HZ; i++) {
      step(state, {});
    }
    expect(customer.state).toBe('order_taken');
    expect(state.customers.find(c => c.id === customer.id)).toBeDefined();
  });

  it('3. Angry khi patience < 20%', () => {
    const { table, customer } = spawnCustomer(30);
    // Lấy order
    const p1 = state.players[0]!;
    p1.x = table.x + 1.5;
    p1.y = table.y + 0.5;
    p1.fx = -1;
    p1.fy = 0;
    p1.held = null;
    doInteract();

    const order = state.orders[0]!;
    expect(order).toBeDefined();

    // Đặt patience ở mức 25% (> 20%) -> chưa giận
    order.timeLeft = order.patience * 0.25;
    customer.patience = order.timeLeft;
    step(state, {});
    expect(customer.angry).toBe(false);

    // Đặt patience ở mức 19% (< 20%) -> giận
    order.timeLeft = order.patience * 0.19;
    customer.patience = order.timeLeft;
    step(state, {});
    expect(customer.angry).toBe(true);
  });

  it('4. Đơn hết hạn (patience <= 0) -> giận, rời, -10 điểm, expired++, streak = 0, reason "expired"', () => {
    const { table, customer } = spawnCustomer(30);
    // Lấy order
    const p1 = state.players[0]!;
    p1.x = table.x + 1.5;
    p1.y = table.y + 0.5;
    p1.fx = -1;
    p1.fy = 0;
    p1.held = null;
    doInteract();

    const order = state.orders[0]!;
    expect(order).toBeDefined();
    order.timeLeft = 0.05; // Gần hết hạn
    customer.patience = 0.05;

    // Chạy vài tick cho hết hạn
    let leaveEvent: any;
    for (let i = 0; i < 3; i++) {
      const evs = step(state, {});
      const found = evs.find(e => e.type === 'customer_leave');
      if (found) leaveEvent = found;
    }

    expect(customer.state).toBe('leaving');
    expect(customer.angry).toBe(true);
    expect(state.score).toBe(40);
    expect(state.expired).toBe(1);
    expect(state.streak).toBe(0);

    expect(leaveEvent).toBeDefined();
    expect(leaveEvent?.reason).toBe('expired');
    expect(leaveEvent?.customerId).toBe(customer.id);
  });

  it('5. Phục vụ thành công -> ăn 5s -> rời với reason "served", để lại đĩa bẩn', () => {
    const { table, customer } = spawnCustomer(30);
    // Lấy order
    const p1 = state.players[0]!;
    p1.x = table.x + 1.5;
    p1.y = table.y + 0.5;
    p1.fx = -1;
    p1.fy = 0;
    p1.held = null;
    doInteract();

    // Cầm đĩa salad hoàn chỉnh
    const plate = makePlate(false);
    plate.contents = [
      { type: 'ingredient', id: 'lettuce', state: 'chopped' } as any,
      { type: 'ingredient', id: 'tomato', state: 'chopped' } as any
    ];
    p1.held = plate;

    // Giao món
    doInteract();
    expect(customer.state).toBe('eating');

    // Trong khi ăn 5s
    for (let i = 0; i < 4.9 * SIM_HZ; i++) {
      step(state, {});
    }
    expect(customer.state).toBe('eating');

    // Hết 5s ăn
    let leaveEvent: any;
    for (let i = 0; i < 0.2 * SIM_HZ; i++) {
      const evs = step(state, {});
      const found = evs.find(e => e.type === 'customer_leave');
      if (found) leaveEvent = found;
    }
    expect(leaveEvent).toBeDefined();
    expect(leaveEvent?.reason).toBe('served');
    expect(leaveEvent?.customerId).toBe(customer.id);

    // Đĩa bẩn tại bàn
    expect(table.item).toBeDefined();
    expect((table.item as any)?.dirty).toBe(true);
  });
});
