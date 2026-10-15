import { describe, it, expect } from 'vitest';
import { createGameState } from '../sim/createState';
import { bep_lo_nuong } from '../levels/bep_lo_nuong';
import { interact } from '../sim/interact';
import { updateAction } from '../sim/action';
import { tickStations } from '../sim/stations';
import { getLevel } from '../levels';
import { CHOP_TIME, OVEN_COOK_TIME, OVEN_BURN_TIME, EXTINGUISH_TIME, RECIPE_SCORE } from '../constants';
import { PlateItem, ToolItem, IngredientItem, CustomerState, PlayerState, StationState } from '../types';

describe('T7: Pizza & Oven Mechanics', () => {
  function setup() {
    const state = createGameState(bep_lo_nuong, ['p1', 'p2'], 99999);
    state.customers = [];
    state.orders = [];
    state.nextOrderIn = 99999;

    const p1 = state.players[0]!;
    const p2 = state.players[1]!;

    const oven = state.stations.find(s => s.type === 'oven')!;
    const doughCrate = state.stations.find(s => s.type === 'crate' && s.crate === 'dough')!;
    const cheeseCrate = state.stations.find(s => s.type === 'crate' && s.crate === 'cheese')!;
    const tomatoCrate = state.stations.find(s => s.type === 'crate' && s.crate === 'tomato')!;
    const cuttingStations = state.stations.filter(s => s.type === 'cutting');
    const cut1 = cuttingStations[0]!;
    const plateDispenser = state.stations.find(s => s.type === 'plate_dispenser')!;
    let extinguisherStation = state.stations.find(s => s.type === 'extinguisher');
    if (!extinguisherStation) {
      extinguisherStation = {
        type: 'extinguisher',
        x: 0,
        y: 0,
        item: { type: 'tool', tool: 'extinguisher', contents: [], progress: 0 },
        progress: 0,
        dirtyCount: 0,
        cleanCount: 0,
        pendingReturns: [],
        onFire: false
      } as unknown as StationState;
      state.stations.push(extinguisherStation);
    }
    const tables = state.stations.filter(s => s.type === 'table');
    let counter = state.stations.find(s => s.type === 'counter');
    if (!counter) {
      counter = {
        type: 'counter',
        x: 0,
        y: 1,
        item: null,
        progress: 0,
        dirtyCount: 0,
        cleanCount: 0,
        pendingReturns: [],
        onFire: false
      } as unknown as StationState;
      state.stations.push(counter);
    }

    function interactStation(p: PlayerState, st: StationState | { x: number; y: number }) {
      p.x = st.x;
      p.y = st.y;
      p.fx = 0;
      p.fy = 0;
      return interact(state, p.id);
    }

    return {
      state,
      p1,
      p2,
      oven,
      doughCrate,
      cheeseCrate,
      tomatoCrate,
      cut1,
      plateDispenser,
      extinguisherStation: extinguisherStation as StationState,
      tables,
      counter: counter as StationState,
      interactStation
    };
  }

  it('1. Trạm và nguyên liệu map Bếp Lò Nướng đầy đủ cấu hình', () => {
    const { oven, doughCrate, cheeseCrate, tomatoCrate, tables, cut1, plateDispenser } = setup();

    expect(oven).toBeDefined();
    expect(oven.type).toBe('oven');
    expect(doughCrate).toBeDefined();
    expect(cheeseCrate).toBeDefined();
    expect(tomatoCrate).toBeDefined();
    expect(cut1).toBeDefined();
    expect(plateDispenser).toBeDefined();
    expect(tables.length).toBeGreaterThanOrEqual(2);

    const level = getLevel('bep_lo_nuong');
    expect(level).toBeDefined();
    expect(level!.recipes.some(r => r.id === 'pizza')).toBe(true);
  });

  it('2. Sơ chế bột và phô mai trên thớt C', () => {
    const { state, p1, doughCrate, cheeseCrate, cut1, interactStation } = setup();

    // Lấy bột từ thùng K
    interactStation(p1, doughCrate);
    expect(p1.held).toEqual({ type: 'ingredient', id: 'dough', state: 'raw' });

    // Đặt bột lên thớt C
    interactStation(p1, cut1);
    expect(p1.held).toBeNull();
    expect(cut1.item).toEqual({ type: 'ingredient', id: 'dough', state: 'raw' });

    // Nhào bột trên thớt -> cắt xong tự cầm trên tay
    updateAction(state, p1.id, { seq: 1, mx: 0, my: 0, interact: false, act: true, dash: false, throw: false }, CHOP_TIME);
    expect(p1.held).toEqual({ type: 'ingredient', id: 'dough', state: 'chopped' });
    expect(cut1.item).toBeNull();
    p1.held = null; // dọn tay để test phô mai

    // Lấy phô mai từ thùng Z
    interactStation(p1, cheeseCrate);
    expect(p1.held).toEqual({ type: 'ingredient', id: 'cheese', state: 'raw' });

    // Đặt phô mai lên thớt C
    interactStation(p1, cut1);
    expect(cut1.item).toEqual({ type: 'ingredient', id: 'cheese', state: 'raw' });

    // Băm phô mai -> cắt xong tự cầm trên tay
    updateAction(state, p1.id, { seq: 2, mx: 0, my: 0, interact: false, act: true, dash: false, throw: false }, CHOP_TIME);
    expect(p1.held).toEqual({ type: 'ingredient', id: 'cheese', state: 'chopped' });
    expect(cut1.item).toBeNull();
  });

  it('3. Lắp ráp bánh pizza sống trên quầy counter X', () => {
    const { p1, counter, interactStation } = setup();

    // 1. Đặt đế bột đã nhào lên counter
    p1.held = { type: 'ingredient', id: 'dough', state: 'chopped' };
    interactStation(p1, counter);
    expect(p1.held).toBeNull();
    expect(counter.item).toEqual({ type: 'ingredient', id: 'dough', state: 'chopped' });

    // 2. Thêm cà chua đã băm
    p1.held = { type: 'ingredient', id: 'tomato', state: 'chopped' };
    interactStation(p1, counter);
    expect(p1.held).toBeNull();
    expect(counter.item).toEqual({
      type: 'ingredient',
      id: 'dough',
      state: 'chopped',
      contents: [{ type: 'ingredient', id: 'tomato', state: 'chopped' }]
    });

    // 3. Thêm phô mai đã băm -> tự động biến thành bánh pizza sống raw pizza!
    p1.held = { type: 'ingredient', id: 'cheese', state: 'chopped' };
    interactStation(p1, counter);
    expect(p1.held).toBeNull();
    expect(counter.item).toEqual({
      type: 'ingredient',
      id: 'pizza',
      state: 'raw'
    });

    // 4. Cầm pizza sống lên tay
    interactStation(p1, counter);
    expect(p1.held).toEqual({
      type: 'ingredient',
      id: 'pizza',
      state: 'raw'
    });
  });

  it('4. Nướng bánh trong lò U (12s), lấy ra bằng đĩa và phục vụ tại bàn Q (+55 điểm)', () => {
    const { state, p1, oven, plateDispenser, tables, interactStation } = setup();
    const table = tables[0]!;

    // Tạo đơn hàng pizza cho khách tại bàn table Q
    const customer: CustomerState = {
      id: state.nextCustomerId++,
      x: table.x,
      y: table.y,
      state: 'order_taken',
      recipe: 'pizza',
      patience: 90,
      maxPatience: 90,
      timer: 0,
      colorIndex: 0
    };
    state.customers.push(customer);
    table.customerId = customer.id;
    state.orders.push({
      id: 301,
      recipe: 'pizza',
      timeLeft: 90,
      patience: 90,
      customerId: customer.id
    });

    // Đặt pizza sống vào lò nướng U
    p1.held = { type: 'ingredient', id: 'pizza', state: 'raw' };
    interactStation(p1, oven);
    expect(p1.held).toBeNull();
    expect(oven.item).toEqual({ type: 'ingredient', id: 'pizza', state: 'raw' });
    expect(oven.progress).toBe(0);

    // Lò nướng nướng trong 12s
    const dt = 1.0;
    for (let i = 0; i < OVEN_COOK_TIME; i++) {
      tickStations(state, dt);
    }
    expect(oven.item).toEqual({ type: 'ingredient', id: 'pizza', state: 'cooked' });

    // Lấy đĩa sạch từ P
    interactStation(p1, plateDispenser);
    expect(p1.held?.type).toBe('plate');

    // Dùng đĩa vớt pizza chín từ lò nướng
    interactStation(p1, oven);
    expect(oven.item).toBeNull();
    expect(p1.held).toEqual({
      type: 'plate',
      dirty: false,
      contents: [{ type: 'ingredient', id: 'pizza', state: 'cooked' }]
    });

    // Mang đến bàn khách Q phục vụ
    interactStation(p1, table);

    // Kiểm tra kết quả phục vụ: baseScore (55) + tip (10) = 65 điểm
    expect(state.score).toBeGreaterThanOrEqual(RECIPE_SCORE['pizza']);
    expect(state.orders).toHaveLength(0); // đơn hoàn thành
    expect(customer.state).toBe('eating'); // khách chuyển sang ăn
  });

  it('5. Để quên trong lò bị cháy (18s) và phát hỏa (22s), dập tắt bằng bình chữa cháy', () => {
    const { state, p1, oven, extinguisherStation, interactStation } = setup();

    oven.item = { type: 'ingredient', id: 'pizza', state: 'raw' };
    oven.progress = 0;

    const dt = 1.0;
    // Nướng 12s -> chín
    for (let i = 0; i < OVEN_COOK_TIME; i++) {
      tickStations(state, dt);
    }
    expect(oven.item?.state).toBe('cooked');

    // Để quên tiếp 6s (tổng 18s) -> cháy
    for (let i = 0; i < OVEN_BURN_TIME; i++) {
      tickStations(state, dt);
    }
    expect(oven.item?.state).toBe('burnt');

    // Để quên tiếp 4s (tổng 22s) -> phát hỏa
    for (let i = 0; i < 4; i++) {
      tickStations(state, dt);
    }
    expect(oven.onFire).toBe(true);

    // Lấy bình cứu hỏa
    interactStation(p1, extinguisherStation);
    expect((p1.held as ToolItem)?.tool).toBe('extinguisher');

    // Dập lửa tại lò nướng
    p1.x = oven.x;
    p1.y = oven.y + 1;
    p1.fx = 0;
    p1.fy = -1;
    updateAction(state, p1.id, { seq: 3, mx: 0, my: 0, interact: false, act: true, dash: false, throw: false }, EXTINGUISH_TIME);
    expect(oven.onFire).toBe(false);
  });
});
