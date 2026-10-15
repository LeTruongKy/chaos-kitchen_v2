import { describe, it, expect } from 'vitest';
import { createGameState } from '../sim/createState';
import { bep_doi } from '../levels/bep_doi';
import { interact } from '../sim/interact';
import { updateAction } from '../sim/action';
import { tickStations } from '../sim/stations';
import { tickOrders } from '../sim/orders';
import { matchRecipe } from '../recipes';
import { CHOP_TIME, POT_COOK_TIME, POT_BURN_TIME, RECIPE_SCORE } from '../constants';
import { PlateItem, ToolItem, CustomerState } from '../types';

describe('T4 — Súp Cà Chua trong map Bếp Đôi', () => {
  function setup() {
    const state = createGameState(bep_doi, ['p1'], 99999);
    state.customers = [];
    state.orders = [];
    state.nextOrderIn = 99999;

    const player = state.players[0]!;
    const potStation = state.stations.find(s => s.type === 'stove' && (s.item as ToolItem)?.tool === 'pot')!;
    const tomatoCrate = state.stations.find(s => s.type === 'crate' && s.crate === 'tomato')!;
    const cuttingStation = state.stations.find(s => s.type === 'cutting')!;
    const plateDispenser = state.stations.find(s => s.type === 'plate_dispenser')!;
    const tables = state.stations.filter(s => s.type === 'table');
    const table = tables[0]!;

    return {
      state,
      player,
      potStation,
      tomatoCrate,
      cuttingStation,
      plateDispenser,
      table,
      tables
    };
  }

  it('1. map Bếp Đôi tồn tại nồi s và tomato_soup trong danh sách recipe', () => {
    const { state, potStation } = setup();
    expect(potStation).toBeDefined();
    expect(potStation.item).toBeDefined();
    expect((potStation.item as ToolItem).tool).toBe('pot');

    const soupRecipe = state.recipeWeights.find(r => r.id === 'tomato_soup');
    expect(soupRecipe).toBeDefined();
    expect(soupRecipe?.weight).toBeGreaterThan(0);
  });

  it('2. quy trình hoàn chỉnh: 3 cà chua -> thớt thái -> cho vào nồi -> nấu 15s -> múc ra đĩa -> giao bàn đúng order', () => {
    const { state, player, potStation, tomatoCrate, cuttingStation, plateDispenser, table } = setup();

    // Khách tại bàn Q gọi món tomato_soup
    const customer: CustomerState = {
      id: state.nextCustomerId++,
      x: table.x,
      y: table.y,
      state: 'order_taken',
      recipe: 'tomato_soup',
      patience: 90,
      maxPatience: 90,
      timer: 0,
      colorIndex: 1
    };
    state.customers.push(customer);
    table.customerId = customer.id;
    state.orders.push({
      id: 101,
      recipe: 'tomato_soup',
      timeLeft: 90,
      patience: 90,
      customerId: customer.id
    });

    const pot = potStation.item as ToolItem;
    expect(pot.contents.length).toBe(0);

    // Chuẩn bị 3 cà chua thái và cho vào nồi
    for (let i = 0; i < 3; i++) {
      // Lấy cà chua từ thùng T
      player.x = tomatoCrate.x;
      player.y = tomatoCrate.y;
      player.held = null;
      interact(state, player.id);
      expect(player.held).toBeDefined();
      const heldIng = player.held as any;
      expect(heldIng?.type).toBe('ingredient');
      expect(heldIng?.id).toBe('tomato');
      expect(heldIng?.state).toBe('raw');

      // Đặt lên thớt C
      player.x = cuttingStation.x;
      player.y = cuttingStation.y;
      interact(state, player.id);
      expect(player.held).toBeNull();
      expect(cuttingStation.item).toBeDefined();

      // Thái trên thớt trong CHOP_TIME (3s) -> cắt xong tự cầm trên tay
      updateAction(state, player.id, { seq: 1, mx: 0, my: 0, interact: false, act: true, dash: false, throw: false }, CHOP_TIME);
      expect(player.held).toBeDefined();
      expect((player.held as any).state).toBe('chopped');

      // Thả vào nồi s
      player.x = potStation.x;
      player.y = potStation.y;
      interact(state, player.id);
      expect(player.held).toBeNull();
      expect(pot.contents.length).toBe(i + 1);
    }

    // Nồi đã đủ 3 cà chua thái
    expect(pot.contents.length).toBe(3);
    expect(pot.contents.every(c => c.id === 'tomato' && c.state === 'chopped')).toBe(true);

    // Nồi tự nấu trên bếp trong POT_COOK_TIME (15s)
    const dt = 0.5;
    const ticks = Math.ceil(POT_COOK_TIME / dt);
    for (let t = 0; t < ticks; t++) {
      tickStations(state, dt);
    }

    expect(pot.progress).toBeGreaterThanOrEqual(POT_COOK_TIME);
    expect(pot.contents.every(c => c.state !== 'burnt')).toBe(true);

    // Lấy đĩa sạch từ tủ đĩa P
    player.x = plateDispenser.x;
    player.y = plateDispenser.y;
    player.held = null;
    interact(state, player.id);
    expect(player.held).toBeDefined();
    const cleanPlate = player.held as unknown as PlateItem;
    expect(cleanPlate?.type).toBe('plate');
    expect(cleanPlate.dirty).toBe(false);

    // Dùng đĩa sạch múc súp từ nồi s
    player.x = potStation.x;
    player.y = potStation.y;
    interact(state, player.id);
    expect(pot.contents.length).toBe(0); // Nồi đã được múc sạch
    const plateWithSoup = player.held as unknown as PlateItem;
    expect(plateWithSoup.contents.length).toBe(1);
    expect(plateWithSoup.contents[0]?.id).toBe('soup_tomato');
    expect(plateWithSoup.contents[0]?.state).toBe('cooked');

    // Khớp công thức tomato_soup
    expect(matchRecipe(plateWithSoup)).toBe('tomato_soup');

    // Mang đĩa súp đến bàn Q của khách
    player.x = table.x;
    player.y = table.y;
    const initialScore = state.score;
    const serveEvents = interact(state, player.id);

    const okEv = serveEvents.find(e => e.type === 'serve_ok');
    expect(okEv).toBeDefined();
    expect(okEv?.recipe).toBe('tomato_soup');
    expect(okEv?.baseScore).toBe(RECIPE_SCORE['tomato_soup']); // 40 điểm
    expect(state.score).toBeGreaterThan(initialScore);
    expect(player.held).toBeNull();
    expect(state.orders.length).toBe(0);
    expect(customer.state).toBe('eating');

    // Khách ăn trong 5s và rời đi để lại đĩa bẩn tại bàn
    tickOrders(state, 5.0);
    expect(state.customers.length).toBe(0);
    expect(table.item).toBeDefined();
    expect(table.item?.type).toBe('plate');
    expect((table.item as PlateItem).dirty).toBe(true);
  });

  it('3. nồi không bắt đầu nấu khi chưa đủ 3 nguyên liệu', () => {
    const { state, potStation } = setup();
    const pot = potStation.item as ToolItem;
    pot.contents = [
      { type: 'ingredient', id: 'tomato', state: 'chopped' },
      { type: 'ingredient', id: 'tomato', state: 'chopped' }
    ];

    tickStations(state, 5.0);
    expect(pot.progress).toBe(0);
    expect(pot.contents.every(c => c.state === 'chopped')).toBe(true);
  });

  it('4. nồi cháy nếu để quên sau khi nấu chín quá POT_BURN_TIME', () => {
    const { state, potStation } = setup();
    const pot = potStation.item as ToolItem;
    pot.contents = [
      { type: 'ingredient', id: 'tomato', state: 'chopped' },
      { type: 'ingredient', id: 'tomato', state: 'chopped' },
      { type: 'ingredient', id: 'tomato', state: 'chopped' }
    ];

    // Nấu chín trong 15s
    tickStations(state, POT_COOK_TIME);
    expect(pot.progress).toBeGreaterThanOrEqual(POT_COOK_TIME);
    expect(pot.contents.every(c => c.state !== 'burnt')).toBe(true);

    // Để quên tiếp quá POT_BURN_TIME (10s), kiểm tra ngay khi vừa cháy trước khi bắt lửa
    for (let t = 0; t < Math.ceil(POT_BURN_TIME / 0.5); t++) {
      tickStations(state, 0.5);
    }
    expect(pot.contents[0]?.state).toBe('burnt');
  });
});
