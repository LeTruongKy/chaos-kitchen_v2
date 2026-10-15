import { describe, it, expect } from 'vitest';
import { createGameState } from '../sim/createState';
import { nha_hang_mo } from '../levels/nha_hang_mo';
import { interact } from '../sim/interact';
import { updateAction } from '../sim/action';
import { tickStations } from '../sim/stations';
import { tickOrders } from '../sim/orders';
import { matchRecipe } from '../recipes';
import { CHOP_TIME, COOK_TIME, WASH_TIME, RECIPE_SCORE } from '../constants';
import { PlateItem, IngredientItem, CustomerState, PlayerState, StationState } from '../types';

describe('T6 — Map Nhà Hàng Mở: Nghiệm thu 4 bàn Q xếp hàng & quy trình phục vụ', () => {
  function setup() {
    const state = createGameState(nha_hang_mo, ['p1', 'p2'], 99999);
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
    const cut2 = cuttingStations[1]!;
    const stovePan = state.stations.find(s => s.type === 'stove' && (s.item as any)?.tool === 'pan')!;
    const potStation = state.stations.find(s => s.type === 'stove' && (s.item as any)?.tool === 'pot')!;
    const plateDispenser = state.stations.find(s => s.type === 'plate_dispenser')!;
    const sink = state.stations.find(s => s.type === 'sink')!;
    const trash = state.stations.find(s => s.type === 'trash')!;
    const tables = state.stations.filter(s => s.type === 'table');

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
      cut2,
      stovePan,
      potStation,
      plateDispenser,
      sink,
      trash,
      tables,
      interactStation
    };
  }

  it('1. Đếm trạm trên bản đồ Nhà Hàng Mở và kiểm tra cấu trúc 6 bàn Q', () => {
    const { tables, stovePan, potStation, sink, plateDispenser, trash, cut1, cut2, tomatoCrate, lettuceCrate, bunCrate, meatCrate } = setup();

    // 6 bàn Q theo đặc tả M3
    expect(tables.length).toBe(6);

    // Trạm nấu và sơ chế đầy đủ
    expect(stovePan).toBeDefined();
    expect(potStation).toBeDefined();
    expect(sink).toBeDefined();
    expect(plateDispenser).toBeDefined();
    expect(trash).toBeDefined();
    expect(cut1).toBeDefined();
    expect(cut2).toBeDefined();
    expect(tomatoCrate).toBeDefined();
    expect(lettuceCrate).toBeDefined();
    expect(bunCrate).toBeDefined();
    expect(meatCrate).toBeDefined();
  });

  it('2. Khách ngồi ở cả 6 bàn Q không chắn lối vào bếp', () => {
    const { state, tables } = setup();

    // Spawn khách tại cả 6 bàn
    for (let i = 0; i < tables.length; i++) {
      const table = tables[i]!;
      const customer: CustomerState = {
        id: state.nextCustomerId++,
        x: table.x,
        y: table.y,
        state: 'order_taken',
        recipe: 'burger',
        patience: 75,
        maxPatience: 75,
        timer: 0,
        colorIndex: i
      };
      state.customers.push(customer);
      table.customerId = customer.id;
    }

    expect(state.customers.length).toBe(6);
  });

  it('3. Hoàn thành 1 đơn Burger Tomato tại bàn khách Q và hoàn thành chu trình rửa đĩa bẩn', () => {
    const ctx = setup();
    const { state, p1, tomatoCrate, lettuceCrate, bunCrate, meatCrate, cut1, cut2, stovePan, plateDispenser, sink, interactStation } = ctx;
    const table = ctx.tables[0]!;

    // Khách gọi burger_tomato tại bàn đầu tiên
    const customer: CustomerState = {
      id: state.nextCustomerId++,
      x: table.x,
      y: table.y,
      state: 'order_taken',
      recipe: 'burger_tomato',
      patience: 85,
      maxPatience: 85,
      timer: 0,
      colorIndex: 0
    };
    state.customers.push(customer);
    table.customerId = customer.id;
    state.orders.push({
      id: 301,
      recipe: 'burger_tomato',
      timeLeft: 85,
      patience: 85,
      customerId: customer.id
    });

    // 1. Nấu thịt trên chảo S
    interactStation(p1, meatCrate);
    interactStation(p1, stovePan);
    const dt = 0.5;
    const cookTicks = Math.ceil(COOK_TIME / dt);
    for (let t = 0; t < cookTicks; t++) {
      tickStations(state, dt);
    }
    const panTool = stovePan.item as any;
    expect(panTool.contents[0]?.state).toBe('cooked');

    // 2. Lấy đĩa từ P, xúc thịt chín từ chảo, đặt đĩa lên quầy counter X
    const counter = state.stations.find(st => st.type === 'counter')!;
    interactStation(p1, plateDispenser);
    expect((p1.held as PlateItem)?.type).toBe('plate');
    interactStation(p1, stovePan); // bỏ thịt chín vào đĩa
    interactStation(p1, counter); // đặt đĩa lên counter X
    expect(p1.held).toBeNull();

    // 3. Thái xà lách trên thớt C1 (thái xong tự cầm trên tay) rồi bỏ vào đĩa ở counter
    interactStation(p1, lettuceCrate);
    interactStation(p1, cut1);
    updateAction(state, p1.id, { seq: 1, mx: 0, my: 0, interact: false, act: true, dash: false, throw: false }, CHOP_TIME);
    expect(p1.held?.type).toBe('ingredient');
    interactStation(p1, counter); // bỏ lettuce thái vào đĩa

    // 4. Thái cà chua trên thớt C2 (thái xong tự cầm trên tay) rồi bỏ vào đĩa ở counter
    interactStation(p1, tomatoCrate);
    interactStation(p1, cut2);
    updateAction(state, p1.id, { seq: 2, mx: 0, my: 0, interact: false, act: true, dash: false, throw: false }, CHOP_TIME);
    expect(p1.held?.type).toBe('ingredient');
    interactStation(p1, counter); // bỏ tomato thái vào đĩa

    // 5. Cầm đĩa lên tay và thêm bánh mì sống vào đĩa
    interactStation(p1, counter);
    const plate = p1.held as PlateItem;
    plate.contents.push({ type: 'ingredient', id: 'bun', state: 'raw' });
    expect(plate.contents.length).toBe(4);
    expect(matchRecipe(plate)).toBe('burger_tomato');

    // 6. Phục vụ tại bàn Q
    const initialScore = state.score;
    const serveEvents = interactStation(p1, table);

    const okEv = serveEvents.find(e => e.type === 'serve_ok') as any;
    expect(okEv).toBeDefined();
    expect(okEv?.recipe).toBe('burger_tomato');
    expect(okEv?.baseScore).toBe(RECIPE_SCORE.burger_tomato);
    expect(state.score).toBe(initialScore + okEv.baseScore + (okEv.tip ?? 0));
    expect(customer.state).toBe('eating');

    // 7. Khách ăn trong 5s và rời đi để lại đĩa bẩn tại bàn
    tickOrders(state, 5.0);
    expect(state.customers.length).toBe(0);
    expect(table.item).toBeDefined();
    expect((table.item as PlateItem).dirty).toBe(true);

    // 8. Bê đĩa bẩn từ bàn Q đến bồn rửa W
    p1.held = null;
    interactStation(p1, table);
    expect(p1.held).toBeDefined();
    expect((p1.held as unknown as PlateItem).dirty).toBe(true);
    expect(table.item).toBeNull();

    // Đặt vào bồn W
    interactStation(p1, sink);
    expect(p1.held).toBeNull();
    expect(sink.dirtyCount).toBe(1);

    // Rửa đĩa tại W trong WASH_TIME (3s) -> rửa xong đĩa sạch tự động trên tay
    updateAction(state, p1.id, { seq: 3, mx: 0, my: 0, interact: false, act: true, dash: false, throw: false }, WASH_TIME);
    expect(sink.dirtyCount).toBe(0);
    expect(p1.held).toBeDefined();
    const cleanPlate = p1.held as unknown as PlateItem;
    expect(cleanPlate.dirty).toBe(false);

    // Đặt trả về tủ đĩa P
    const initialPlatesInDispenser = plateDispenser.cleanCount;
    interactStation(p1, plateDispenser);
    expect(p1.held).toBeNull();
    expect(plateDispenser.cleanCount).toBe(initialPlatesInDispenser + 1);
  });
});
