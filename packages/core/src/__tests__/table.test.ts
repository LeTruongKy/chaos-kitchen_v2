import { describe, it, expect } from 'vitest';
import { createGameState } from '../sim/createState';
import { tickOrders, serveCustomerOrder } from '../sim/orders';
import { interact } from '../sim/interact';
import { level1 } from '../levels/level1';
import { PlayerInput, CustomerState, GameState, PlateItem, IngredientItem } from '../types';
import { updateAction } from '../sim/action';
import { WASH_TIME } from '../constants';

describe('Table and Customer State Machine', () => {
  const seed = 12345;
  
  function setup() {
    const state = createGameState(level1, ['p1'], seed);
    // Remove all initially spawned customers so we can control it
    state.customers = [];
    state.orders = [];
    state.stations.filter(s => s.type === 'table').forEach(s => s.customerId = undefined);
    
    // Pick the first table for our test
    const table = state.stations.find(s => s.type === 'table')!;
    // Block all other tables so they don't spawn customers
    state.stations.filter(s => s.type === 'table' && s !== table).forEach(s => {
      s.customerId = 9999;
    });

    const player = state.players[0]!;
    player.x = table.x;
    player.y = table.y; // Exactly on table to guarantee interact hits it
    player.fx = 0; player.fy = 0;
    
    state.nextOrderIn = 99999; // Prevent random spawns
    return { state, table, player };
  }

  function spawnCustomer(state: GameState, x: number, y: number): CustomerState {
    const c: CustomerState = {
      id: state.nextCustomerId++,
      x, y,
      state: 'seated_waiting_order',
      recipe: 'salad',
      patience: 60,
      maxPatience: 60,
      timer: 0,
      colorIndex: 0
    };
    state.customers.push(c);
    const table = state.stations.find(s => s.x === x && s.y === y)!;
    table.customerId = c.id;
    return c;
  }

  function makeSaladPlate(): PlateItem {
    return {
      type: 'plate',
      dirty: false,
      contents: [
        { type: 'ingredient', id: 'lettuce', state: 'chopped' },
        { type: 'ingredient', id: 'tomato', state: 'chopped' }
      ]
    };
  }

  function makeBurgerPlate(): PlateItem {
    return {
      type: 'plate',
      dirty: false,
      contents: [
        { type: 'ingredient', id: 'bun', state: 'raw' },
        { type: 'ingredient', id: 'meat', state: 'cooked' },
        { type: 'ingredient', id: 'lettuce', state: 'chopped' }
      ]
    };
  }

  it('empty -> seated_waiting_order (handled by tickOrders)', () => {
    const { state, table } = setup();
    state.nextOrderIn = 0; // trigger spawn
    tickOrders(state, 1);
    
    expect(state.customers.length).toBe(1); // Only 1 unblocked table
    expect(state.customers[0]!.state).toBe('seated_waiting_order');
    expect(table.customerId).toBe(state.customers[0]!.id);
  });

  it('seated_waiting_order -> order_taken requires empty hands', () => {
    const { state, table, player } = setup();
    const c = spawnCustomer(state, table.x, table.y);
    
    // Hold an item
    player.held = { type: 'ingredient', id: 'tomato', state: 'raw' };
    interact(state, player.id);
    
    // State should not change because hand is not empty
    expect(c.state).toBe('seated_waiting_order');
    expect(state.orders.length).toBe(0);
    
    // Empty hands
    player.held = null;
    interact(state, player.id);
    
    // State should change
    expect(c.state).toBe('order_taken');
    expect(state.orders.length).toBe(1);
    expect(state.orders[0]!.customerId).toBe(c.id);
  });

  it('order_taken -> eating requires correct food', () => {
    const { state, table, player } = setup();
    const c = spawnCustomer(state, table.x, table.y);
    c.state = 'order_taken';
    state.orders.push({ id: 1, recipe: 'salad', timeLeft: 60, patience: 60, customerId: c.id });
    
    // Wrong food
    const wrongFood: PlateItem = { type: 'plate', dirty: false, contents: [] }; // empty plate
    player.held = wrongFood;
    interact(state, player.id);
    
    // Should be rejected
    expect(c.state).toBe('order_taken');
    expect(player.held).toBe(wrongFood); // still holding
    
    // Correct food (salad requires chopped tomato and chopped lettuce)
    const correctFood: PlateItem = { 
      type: 'plate', dirty: false, 
      contents: [
        { type: 'ingredient', id: 'lettuce', state: 'chopped' },
        { type: 'ingredient', id: 'tomato', state: 'chopped' }
      ]
    };
    player.held = correctFood;
    interact(state, player.id);
    
    // Should be accepted
    expect(c.state).toBe('eating');
    expect(player.held).toBeNull(); // consumed
    expect(state.orders.length).toBe(0);
  });

  it('eating -> dirty_plate after 5s', () => {
    const { state, table } = setup();
    const c = spawnCustomer(state, table.x, table.y);
    c.state = 'eating';
    
    // Tick < 5s
    tickOrders(state, 4.9);
    expect(state.customers.length).toBe(1);
    expect(table.item).toBeNull();
    
    // Tick >= 5s
    tickOrders(state, 0.2);
    expect(state.customers.length).toBe(0); // left
    expect(table.customerId).toBeUndefined();
    expect(table.item).toBeDefined();
    expect(table.item!.type).toBe('plate');
    expect((table.item as PlateItem).dirty).toBe(true);
  });

  it('dirty_plate allows customer spawn and can be picked up with empty hands', () => {
    const { state, table, player } = setup();
    table.item = { type: 'plate', dirty: true, contents: [] };
    
    // Tick to spawn - customer CAN spawn at a table with a dirty plate (Ready, Set, Cook! style)
    state.nextOrderIn = 0;
    tickOrders(state, 1);
    expect(state.customers.length).toBe(1);
    
    // Try to pick up with full hands
    player.held = { type: 'ingredient', id: 'tomato', state: 'raw' };
    interact(state, player.id);
    expect(table.item).toBeDefined(); // still there
    
    // Try to pick up with empty hands -> picks up dirty plate AND takes the seated customer's order
    player.held = null;
    interact(state, player.id);
    expect(table.item).toBeNull();
    expect(player.held!.type).toBe('plate');
    expect((player.held as unknown as PlateItem).dirty).toBe(true);
    expect(state.customers[0]!.state).toBe('order_taken');
  });

  describe('T2 Serving Rules at Customer Table Q', () => {
    it('1. giao đúng món đúng bàn -> serve_ok, điểm tăng, đĩa bẩn tại Q sau khi ăn', () => {
      const { state, table, player } = setup();
      const c = spawnCustomer(state, table.x, table.y);
      c.state = 'order_taken';
      state.orders.push({ id: 101, recipe: 'salad', timeLeft: 60, patience: 60, customerId: c.id });

      const salad = makeSaladPlate();
      player.held = salad;
      const initialScore = state.score;

      const events = interact(state, player.id);

      const okEv = events.find(e => e.type === 'serve_ok');
      expect(okEv).toBeDefined();
      expect(state.score).toBeGreaterThan(initialScore);
      expect(player.held).toBeNull();
      expect(state.orders.length).toBe(0);
      expect(c.state).toBe('eating');

      // Tick 5s for customer to finish eating and leave behind a dirty plate at Q
      tickOrders(state, 5.0);
      expect(state.customers.length).toBe(0);
      expect(table.customerId).toBeUndefined();
      expect(table.item).toBeDefined();
      expect(table.item!.type).toBe('plate');
      expect((table.item as PlateItem).dirty).toBe(true);
    });

    it('2. đúng món, bàn không có khách -> no_customer, đĩa còn trong tay', () => {
      const { state, table, player } = setup();
      table.customerId = undefined; // Bàn trống không có khách

      const salad = makeSaladPlate();
      player.held = salad;
      const initialScore = state.score;

      const events = interact(state, player.id);

      const failEv = events.find(e => e.type === 'serve_fail');
      expect(failEv).toBeDefined();
      expect(failEv?.reason).toBe('no_customer');
      expect(player.held).toBe(salad); // Đĩa còn trong tay
      expect(state.score).toBe(initialScore); // Điểm không đổi
    });

    it('3. bàn có khách, không có đơn -> no_order', () => {
      const { state, table, player } = setup();
      const c = spawnCustomer(state, table.x, table.y);
      c.state = 'seated_waiting_order'; // Khách ngồi nhưng chưa nhận order (chưa có đơn trong state.orders)
      // Không có đơn nào trong state.orders

      const salad = makeSaladPlate();
      player.held = salad;
      const initialScore = state.score;

      const events = interact(state, player.id);

      const failEv = events.find(e => e.type === 'serve_fail');
      expect(failEv).toBeDefined();
      expect(failEv?.reason).toBe('no_order');
      expect(player.held).toBe(salad);
      expect(state.score).toBe(initialScore);
    });

    it('4. sai món bàn đúng -> wrong_dish', () => {
      const { state, table, player } = setup();
      const c = spawnCustomer(state, table.x, table.y);
      c.state = 'order_taken';
      state.orders.push({ id: 102, recipe: 'salad', timeLeft: 60, patience: 60, customerId: c.id });

      // Đĩa trống (không khớp bất kỳ recipe nào)
      const emptyPlate: PlateItem = { type: 'plate', dirty: false, contents: [] };
      player.held = emptyPlate;
      const initialScore = state.score;

      const events = interact(state, player.id);

      const failEv = events.find(e => e.type === 'serve_fail');
      expect(failEv).toBeDefined();
      expect(failEv?.reason).toBe('wrong_dish');
      expect(player.held).toBe(emptyPlate);
      expect(state.score).toBe(initialScore);
    });

    it('5. đúng món của khách khác -> wrong_table', () => {
      const { state, player } = setup();
      const tables = state.stations.filter(s => s.type === 'table');
      const table1 = tables[0]!;
      const table2 = tables[1]!;

      // Khách 1 tại bàn 1 gọi salad
      const c1 = spawnCustomer(state, table1.x, table1.y);
      c1.state = 'order_taken';
      state.orders.push({ id: 201, recipe: 'salad', timeLeft: 60, patience: 60, customerId: c1.id });

      // Khách 2 tại bàn 2 gọi burger
      const c2 = spawnCustomer(state, table2.x, table2.y);
      c2.state = 'order_taken';
      state.orders.push({ id: 202, recipe: 'burger', timeLeft: 60, patience: 60, customerId: c2.id });

      // Người chơi đứng tại bàn 1 nhưng cầm burger (món của khách 2)
      player.x = table1.x;
      player.y = table1.y;
      const burger = makeBurgerPlate();
      player.held = burger;
      const initialScore = state.score;

      const events = interact(state, player.id);

      const failEv = events.find(e => e.type === 'serve_fail');
      expect(failEv).toBeDefined();
      expect(failEv?.reason).toBe('wrong_table');
      expect(player.held).toBe(burger);
      expect(state.score).toBe(initialScore);
      expect(state.orders.length).toBe(2); // Cả 2 đơn vẫn còn
    });

    it('6. hai khách, hai đơn cùng món: giao cho ai thì người đó được tính', () => {
      const { state, player } = setup();
      const tables = state.stations.filter(s => s.type === 'table');
      const table1 = tables[0]!;
      const table2 = tables[1]!;

      // Cả 2 khách đều gọi salad
      const c1 = spawnCustomer(state, table1.x, table1.y);
      c1.state = 'order_taken';
      state.orders.push({ id: 301, recipe: 'salad', timeLeft: 60, patience: 60, customerId: c1.id });

      const c2 = spawnCustomer(state, table2.x, table2.y);
      c2.state = 'order_taken';
      state.orders.push({ id: 302, recipe: 'salad', timeLeft: 60, patience: 60, customerId: c2.id });

      // Người chơi giao salad cho bàn 1
      player.x = table1.x;
      player.y = table1.y;
      player.held = makeSaladPlate();
      const ev1 = interact(state, player.id);

      expect(ev1.some(e => e.type === 'serve_ok')).toBe(true);
      expect(c1.state).toBe('eating');
      expect(c2.state).toBe('order_taken'); // C2 vẫn chờ
      expect(state.orders.length).toBe(1);
      expect(state.orders[0]!.customerId).toBe(c2.id);

      // Người chơi giao salad cho bàn 2
      player.x = table2.x;
      player.y = table2.y;
      player.held = makeSaladPlate();
      const ev2 = interact(state, player.id);

      expect(ev2.some(e => e.type === 'serve_ok')).toBe(true);
      expect(c2.state).toBe('eating');
      expect(state.orders.length).toBe(0);
    });

    it('7. đặt đĩa lên tile không phải Q -> không đổi state', () => {
      const { state, player } = setup();
      // Đặt người chơi quay mặt vào tường '#'
      player.x = 0; player.y = 1;
      player.fx = -1; player.fy = 0; // facing wall at x=-1
      const salad = makeSaladPlate();
      player.held = salad;
      const initialScore = state.score;

      const events = interact(state, player.id);

      // Không phát sinh serve_ok hay serve_fail
      expect(events.some(e => e.type === 'serve_ok' || e.type === 'serve_fail')).toBe(false);
      expect(player.held).toBe(salad);
      expect(state.score).toBe(initialScore);
    });
  });

  describe('T3 — Chu trình đĩa bẩn tại bàn và rửa đĩa', () => {
    it('chuỗi đầy đủ: giao món -> ăn 5s -> đĩa bẩn tại Q -> nhặt -> rửa tại W -> đĩa sạch trả về P', () => {
      const { state, table, player } = setup();
      const sink = state.stations.find(s => s.type === 'sink')!;
      const dispenser = state.stations.find(s => s.type === 'plate_dispenser')!;
      expect(sink).toBeDefined();
      expect(dispenser).toBeDefined();

      const initialCleanPlates = dispenser.cleanCount;

      // 1. Khách gọi salad tại bàn table Q
      const customer = spawnCustomer(state, table.x, table.y);
      customer.state = 'order_taken';
      state.orders.push({ id: 901, recipe: 'salad', timeLeft: 60, patience: 60, customerId: customer.id });

      // 2. Giao salad cho khách
      player.x = table.x;
      player.y = table.y;
      player.held = makeSaladPlate();
      const serveEvents = interact(state, player.id);
      expect(serveEvents.some(e => e.type === 'serve_ok')).toBe(true);
      expect(customer.state).toBe('eating');
      expect(player.held).toBeNull();
      expect(table.item).toBeNull();

      // 3. Khách ăn trong 5s -> rời đi, để lại đĩa bẩn tại bàn
      tickOrders(state, 5.0);
      expect(state.customers.length).toBe(0);
      expect(table.customerId).toBeUndefined();
      expect(table.item).toBeDefined();
      expect(table.item?.type).toBe('plate');
      expect((table.item as PlateItem).dirty).toBe(true);

      // Bàn có đĩa bẩn vẫn cho phép khách mới vào ngồi (theo phong cách Ready, Set, Cook!)
      state.nextOrderIn = 0;
      tickOrders(state, 1);
      expect(state.customers.length).toBe(1);

      // 4. Người chơi tay trống đến nhặt đĩa bẩn tại bàn Q (và nhận luôn order của khách mới)
      player.x = table.x;
      player.y = table.y;
      player.held = null;
      const pickupEvents = interact(state, player.id);
      expect(pickupEvents.some(e => e.type === 'pickup')).toBe(true);
      expect(table.item).toBeNull();
      expect(player.held).toBeDefined();
      const dirtyPlate = player.held as unknown as PlateItem;
      expect(dirtyPlate?.type).toBe('plate');
      expect(dirtyPlate.dirty).toBe(true);
      expect(state.customers.length).toBe(1);

      // 5. Mang đĩa bẩn đến bồn rửa W/sink
      player.x = sink.x;
      player.y = sink.y;
      const dropToSinkEvents = interact(state, player.id);
      expect(dropToSinkEvents.some(e => e.type === 'drop')).toBe(true);
      expect(player.held).toBeNull();
      expect(sink.dirtyCount).toBe(1);

      // 6. Giữ hành động act rửa đĩa trong WASH_TIME (3s)
      const input: PlayerInput = {
        seq: 1,
        mx: 0, my: 0,
        interact: false,
        act: true,
        dash: false,
        throw: false
      };
      // Đứng tại bồn rửa
      player.x = sink.x;
      player.y = sink.y;
      player.fx = 0; player.fy = 0;
      const washEvents = updateAction(state, player.id, input, WASH_TIME);
      expect(washEvents.some(e => e.type === 'wash_done')).toBe(true);
      expect(sink.dirtyCount).toBe(0);

      // 7. Đĩa sạch đã tự động cầm trên tay sau khi rửa
      expect(player.held).toBeDefined();
      const cleanPlate = player.held as unknown as PlateItem;
      expect(cleanPlate?.type).toBe('plate');
      expect(cleanPlate.dirty).toBe(false);

      // 8. Đặt đĩa sạch trả về tủ đĩa dispenser P
      player.x = dispenser.x;
      player.y = dispenser.y;
      const returnEvents = interact(state, player.id);
      expect(returnEvents.some(e => e.type === 'drop')).toBe(true);
      expect(player.held).toBeNull();
      expect(dispenser.cleanCount).toBe(initialCleanPlates + 1);
    });

    it('không có đĩa bẩn trôi hoặc không nhặt được sau khi nhiều khách ăn xong', () => {
      const { state, player } = setup();
      const tables = state.stations.filter(s => s.type === 'table');
      // Bỏ block cho 2 bàn đầu
      tables[0]!.customerId = undefined;
      tables[1]!.customerId = undefined;

      // Tạo 2 khách ở 2 bàn
      const c1 = spawnCustomer(state, tables[0]!.x, tables[0]!.y);
      c1.state = 'order_taken';
      state.orders.push({ id: 911, recipe: 'salad', timeLeft: 60, patience: 60, customerId: c1.id });

      const c2 = spawnCustomer(state, tables[1]!.x, tables[1]!.y);
      c2.state = 'order_taken';
      state.orders.push({ id: 912, recipe: 'salad', timeLeft: 60, patience: 60, customerId: c2.id });

      // Giao cả 2 khách
      player.x = tables[0]!.x; player.y = tables[0]!.y; player.held = makeSaladPlate();
      interact(state, player.id);

      player.x = tables[1]!.x; player.y = tables[1]!.y; player.held = makeSaladPlate();
      interact(state, player.id);

      // Cả 2 ăn xong sau 5s
      tickOrders(state, 5.0);
      expect(state.customers.length).toBe(0);

      // Cả 2 bàn đều có đĩa bẩn và KHÔNG CÓ BÀN NÀO BỊ KẸT customerId
      expect(tables[0]!.item).toBeDefined();
      expect((tables[0]!.item as PlateItem).dirty).toBe(true);
      expect(tables[0]!.customerId).toBeUndefined();

      expect(tables[1]!.item).toBeDefined();
      expect((tables[1]!.item as PlateItem).dirty).toBe(true);
      expect(tables[1]!.customerId).toBeUndefined();

      // Người chơi nhặt lần lượt cả 2 đĩa bẩn
      player.held = null;
      player.x = tables[0]!.x; player.y = tables[0]!.y;
      interact(state, player.id);
      expect(player.held).toBeDefined();
      const plate1 = player.held as unknown as PlateItem;
      expect(plate1?.dirty).toBe(true);
      expect(tables[0]!.item).toBeNull();

      // Vứt đi hoặc cất tạm để tay trống nhặt bàn 2
      player.held = null;
      player.x = tables[1]!.x; player.y = tables[1]!.y;
      interact(state, player.id);
      expect(player.held).toBeDefined();
      const plate2 = player.held as unknown as PlateItem;
      expect(plate2?.dirty).toBe(true);
      expect(tables[1]!.item).toBeNull();
    });
  });
});

