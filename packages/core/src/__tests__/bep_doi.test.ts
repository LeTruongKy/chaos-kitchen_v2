import { describe, it, expect } from 'vitest';
import { createGameState } from '../sim/createState';
import { bep_doi } from '../levels/bep_doi';
import { interact } from '../sim/interact';
import { updateAction } from '../sim/action';
import { tickStations } from '../sim/stations';
import { matchRecipe } from '../recipes';
import { CHOP_TIME, COOK_TIME, RECIPE_SCORE } from '../constants';
import { PlateItem, IngredientItem, CustomerState, PlayerState, StationState } from '../types';

describe('T5 — Map Bếp Đôi: Nghiệm thu hoàn thành đơn Salad & Burger', () => {
  function setup() {
    const state = createGameState(bep_doi, ['p1', 'p2'], 99999);
    state.customers = [];
    state.orders = [];
    state.nextOrderIn = 99999;

    const p1 = state.players[0]!;
    const p2 = state.players[1]!;

    const tomatoCrate = state.stations.find(s => s.type === 'crate' && s.crate === 'tomato')!;
    const lettuceCrate = state.stations.find(s => s.type === 'crate' && s.crate === 'lettuce')!;
    const bunCrate = state.stations.find(s => s.type === 'crate' && s.crate === 'bun')!;
    const meatCrate = state.stations.find(s => s.type === 'crate' && s.crate === 'meat')!;

    const cuttingStations = state.stations.filter(s => s.type === 'cutting');
    const cut1 = cuttingStations[0]!;
    const stovePan = state.stations.find(s => s.type === 'stove' && (s.item as any)?.tool === 'pan')!;
    const potStation = state.stations.find(s => s.type === 'stove' && (s.item as any)?.tool === 'pot')!;
    const plateDispenser = state.stations.find(s => s.type === 'plate_dispenser')!;
    const sink = state.stations.find(s => s.type === 'sink')!;
    const tables = state.stations.filter(s => s.type === 'table');
    const passCounter = state.stations.find(s => s.type === 'counter' && s.x === 5 && s.y === 3)!;

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
      tomatoCrate,
      lettuceCrate,
      bunCrate,
      meatCrate,
      cut1,
      stovePan,
      potStation,
      plateDispenser,
      sink,
      tables,
      passCounter,
      interactStation
    };
  }

  it('1. Đếm trạm trên bản đồ Bếp Đôi đúng cấu hình', () => {
    const { tables, stovePan, potStation, sink, plateDispenser, cut1, tomatoCrate, lettuceCrate, bunCrate, meatCrate } = setup();

    expect(tables.length).toBe(3); // Q×3 theo đặc tả Bếp Đôi
    expect(stovePan).toBeDefined(); // bếp S

    expect(potStation).toBeDefined(); // nồi s
    expect(sink).toBeDefined(); // bồn rửa W
    expect(plateDispenser).toBeDefined(); // máy cấp đĩa P
    expect(cut1).toBeDefined(); // thớt C
    expect(tomatoCrate).toBeDefined(); // thùng T
    expect(lettuceCrate).toBeDefined(); // thùng L
    expect(bunCrate).toBeDefined(); // thùng B
    expect(meatCrate).toBeDefined(); // thùng M
  });

  it('2. Hoàn thành 1 đơn SALAD tại bàn khách Q', () => {
    const ctx = setup();
    const { state, p1, tomatoCrate, lettuceCrate, cut1, plateDispenser, interactStation } = ctx;
    const table = ctx.tables[0]!;

    // Khách đến ngồi tại table Q và gọi món salad
    const customer: CustomerState = {
      id: state.nextCustomerId++,
      x: table.x,
      y: table.y,
      state: 'order_taken',
      recipe: 'salad',
      patience: 60,
      maxPatience: 60,
      timer: 0,
      colorIndex: 0
    };
    state.customers.push(customer);
    table.customerId = customer.id;
    state.orders.push({
      id: 201,
      recipe: 'salad',
      timeLeft: 60,
      patience: 60,
      customerId: customer.id
    });

    // 1. Lấy xà lách từ thùng L -> thớt C -> thái -> lấy lại
    interactStation(p1, lettuceCrate);
    expect((p1.held as IngredientItem)?.id).toBe('lettuce');

    interactStation(p1, cut1);
    expect(p1.held).toBeNull();

    updateAction(state, p1.id, { seq: 1, mx: 0, my: 0, interact: false, act: true, dash: false, throw: false }, CHOP_TIME);
    const choppedLettuce = p1.held as IngredientItem;
    expect(choppedLettuce.id).toBe('lettuce');
    expect(choppedLettuce.state).toBe('chopped');

    // 2. Đặt tạm xà lách lên bàn quầy pass counter X tại (5, 3)
    p1.x = 4.5;
    p1.y = 3.5;
    p1.fx = 1;
    p1.fy = 0;
    interact(state, p1.id);
    expect(p1.held).toBeNull();
    expect(ctx.passCounter.item).toBeDefined();

    // Lấy đĩa từ P
    interactStation(p1, plateDispenser);
    expect((p1.held as PlateItem)?.type).toBe('plate');

    // Nhặt xà lách từ quầy pass counter vào đĩa
    p1.x = 4.5;
    p1.y = 3.5;
    p1.fx = 1;
    p1.fy = 0;
    interact(state, p1.id);
    let plate = p1.held as unknown as PlateItem;
    expect(plate.contents.length).toBe(1);
    expect(plate.contents[0]?.id).toBe('lettuce');

    // 3. Đặt tạm đĩa lên quầy X (5, 3)
    interact(state, p1.id);
    expect(p1.held).toBeNull();

    // Lấy cà chua từ T -> thớt C -> thái
    interactStation(p1, tomatoCrate);
    expect((p1.held as IngredientItem)?.id).toBe('tomato');

    interactStation(p1, cut1);
    updateAction(state, p1.id, { seq: 2, mx: 0, my: 0, interact: false, act: true, dash: false, throw: false }, CHOP_TIME);
    expect((p1.held as IngredientItem)?.id).toBe('tomato');
    expect((p1.held as IngredientItem)?.state).toBe('chopped');

    // Đến quầy X (5, 3) bỏ cà chua vào đĩa đang nằm trên quầy
    p1.x = 4.5;
    p1.y = 3.5;
    p1.fx = 1;
    p1.fy = 0;
    interact(state, p1.id); // bỏ tomato vào plate trên counter
    expect(p1.held).toBeNull();

    // Cầm đĩa hoàn chỉnh lên
    interact(state, p1.id);
    plate = p1.held as unknown as PlateItem;
    expect(plate.type).toBe('plate');
    expect(plate.contents.length).toBe(2);
    expect(matchRecipe(plate)).toBe('salad');

    // 4. Phục vụ tại bàn Q
    const initialScore = state.score;
    const events = interactStation(p1, table);

    const okEv = events.find(e => e.type === 'serve_ok') as any;
    expect(okEv).toBeDefined();
    expect(okEv?.recipe).toBe('salad');
    expect(okEv?.baseScore).toBe(RECIPE_SCORE.salad);
    expect(state.score).toBe(initialScore + okEv.baseScore + (okEv.tip ?? 0));
    expect(customer.state).toBe('eating');
  });

  it('3. Hoàn thành 1 đơn BURGER tại bàn khách Q', () => {
    const ctx = setup();
    const { state, p1, meatCrate, bunCrate, lettuceCrate, cut1, stovePan, plateDispenser, passCounter, interactStation } = ctx;
    const table = ctx.tables[1]!;

    // Khách gọi burger
    const customer: CustomerState = {
      id: state.nextCustomerId++,
      x: table.x,
      y: table.y,
      state: 'order_taken',
      recipe: 'burger',
      patience: 75,
      maxPatience: 75,
      timer: 0,
      colorIndex: 1
    };
    state.customers.push(customer);
    table.customerId = customer.id;
    state.orders.push({
      id: 202,
      recipe: 'burger',
      timeLeft: 75,
      patience: 75,
      customerId: customer.id
    });

    // 1. Nấu thịt trên chảo S
    interactStation(p1, meatCrate);
    expect((p1.held as IngredientItem)?.id).toBe('meat');

    interactStation(p1, stovePan);
    expect(p1.held).toBeNull();

    // Chờ thịt chín COOK_TIME (8s)
    const dt = 0.5;
    const ticks = Math.ceil(COOK_TIME / dt);
    for (let t = 0; t < ticks; t++) {
      tickStations(state, dt);
    }
    const panTool = stovePan.item as any;
    expect(panTool.contents[0]?.state).toBe('cooked');

    // 2. Thái xà lách
    interactStation(p1, lettuceCrate);
    interactStation(p1, cut1);
    updateAction(state, p1.id, { seq: 3, mx: 0, my: 0, interact: false, act: true, dash: false, throw: false }, CHOP_TIME);
    interactStation(p1, cut1); // cầm xà lách thái

    // Đặt xà lách lên quầy passCounter
    interactStation(p1, passCounter);
    expect(p1.held).toBeNull();

    // 3. Lấy đĩa từ P
    interactStation(p1, plateDispenser);
    expect((p1.held as PlateItem)?.type).toBe('plate');

    // Nhặt thịt chín từ chảo vào đĩa
    interactStation(p1, stovePan);
    let plate = p1.held as unknown as PlateItem;
    expect(plate.contents.some(c => c.id === 'meat' && c.state === 'cooked')).toBe(true);

    // Nhặt lettuce thái từ passCounter vào đĩa
    interactStation(p1, passCounter);
    plate = p1.held as unknown as PlateItem;
    expect(plate.contents.some(c => c.id === 'lettuce' && c.state === 'chopped')).toBe(true);

    // Đặt tạm đĩa lên passCounter
    interactStation(p1, passCounter);
    expect(p1.held).toBeNull();

    // 4. Lấy bánh mì bun
    interactStation(p1, bunCrate);
    expect((p1.held as IngredientItem)?.id).toBe('bun');

    // Thêm bánh mì bun vào đĩa đang nằm trên passCounter
    interactStation(p1, passCounter);
    expect(p1.held).toBeNull();

    // Cầm đĩa burger hoàn chỉnh lên
    interactStation(p1, passCounter);
    plate = p1.held as unknown as PlateItem;
    expect(plate.contents.length).toBe(3);
    expect(matchRecipe(plate)).toBe('burger');

    // 5. Phục vụ đĩa burger tại bàn table Q
    const initialScore = state.score;
    const events = interactStation(p1, table);

    const okEv = events.find(e => e.type === 'serve_ok') as any;
    expect(okEv).toBeDefined();
    expect(okEv?.recipe).toBe('burger');
    expect(okEv?.baseScore).toBe(RECIPE_SCORE.burger);
    expect(state.score).toBe(initialScore + okEv.baseScore + (okEv.tip ?? 0));
    expect(customer.state).toBe('eating');
  });

  it('4. Phối hợp hai người chơi chuyền đồ qua quầy giữa (pass counter)', () => {
    const ctx = setup();
    const { state, p1, p2, tomatoCrate, passCounter, interactStation } = ctx;

    // Player 1 lấy cà chua từ crate T
    interactStation(p1, tomatoCrate);
    expect((p1.held as IngredientItem)?.id).toBe('tomato');

    // Player 1 đứng ở bên trái (x=4.5, y=3.5) nhìn sang phải (fx=1, fy=0) đặt cà chua lên quầy (5, 3)
    p1.x = 4.5;
    p1.y = 3.5;
    p1.fx = 1;
    p1.fy = 0;
    interact(state, p1.id);
    expect(p1.held).toBeNull();
    expect(passCounter.item).toBeDefined();
    expect((passCounter.item as IngredientItem).id).toBe('tomato');

    // Player 2 đứng ở phía trên (x=5.5, y=2.5) nhìn xuống dưới (fx=0, fy=1) nhặt cà chua từ quầy (5, 3)
    p2.x = 5.5;
    p2.y = 2.5;
    p2.fx = 0;
    p2.fy = 1;
    interact(state, p2.id);
    expect(passCounter.item).toBeNull();
    expect((p2.held as IngredientItem)?.id).toBe('tomato');
  });
});
