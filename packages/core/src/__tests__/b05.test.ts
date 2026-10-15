import { describe, it, expect, beforeEach } from 'vitest';
import { GameState, PlayerState, StationState, ToolItem, PlateItem } from '../types';
import { makeIngredient, makePlate, matchRecipe } from '../recipes';
import { interact } from '../sim/interact';
import { step } from '../sim/step';
import { POT_COOK_TIME, POT_BURN_TIME, SIM_HZ, SPRINT_MAX } from '../constants';

describe('B05 - Soups', () => {
  let state: GameState;
  let player: PlayerState;
  
  beforeEach(() => {
    player = {
      id: 'p1', x: 1.5, y: 1.5, fx: 1, fy: 0,
      held: null, acting: false, ackSeq: 0,
      vx: 0, vy: 0, dashT: 0, dashCd: 0, throwCd: 0, sprintEnergy: SPRINT_MAX
    };
    state = {
      levelId: 'test', width: 5, height: 5,
      tiles: new Array(25).fill('floor'), stations: [], players: [player],
      orders: [], nextOrderId: 1, nextOrderIn: 10,
      score: 0, served: 0, expired: 0, timeLeft: 100, tick: 0, rngState: 1, ended: false,
      recipeWeights: [{ id: 'tomato_soup', weight: 1 }], starThresholds: [0, 0, 0],
      projectiles: [], nextProjectileId: 1, streak: 0, maxStreak: 0, servedByPlayer: {}, timeElapsed: 0, customers: [], nextCustomerId: 1
    };
  });

  function addStation(x: number, y: number, type: StationState['type'], extra?: Partial<StationState>): StationState {
    const s: StationState = { x, y, type, item: null, progress: 0, cleanCount: 0, dirtyCount: 0, pendingReturns: [], onFire: false, fireTimer: 0, burntTimer: 0, ...extra };
    state.stations.push(s);
    state.tiles[y * state.width + x] = type;
    return s;
  }

  it('Nồi nhận 3 cà chua đã thái; không nhận cà chua raw, không nhận loại khác, không nhận quá 3', () => {
    const counter = addStation(2, 1, 'counter', { item: { type: 'tool', tool: 'pot', contents: [], progress: 0 } });
    
    // Thử cho cà chua raw -> không được
    player.held = makeIngredient('tomato');
    interact(state, player.id);
    expect((counter.item as ToolItem).contents.length).toBe(0);
    
    // Cà chua đã thái
    const choppedTomato = makeIngredient('tomato');
    choppedTomato.state = 'chopped';
    
    // Cho 1 vào
    player.held = { ...choppedTomato };
    interact(state, player.id);
    expect((counter.item as ToolItem).contents.length).toBe(1);
    expect(player.held).toBeNull();

    // Thử cho onion đã thái -> không được (khác loại)
    const choppedOnion = makeIngredient('onion');
    choppedOnion.state = 'chopped';
    player.held = choppedOnion;
    interact(state, player.id);
    expect((counter.item as ToolItem).contents.length).toBe(1);

    // Cho thêm 2 tomato chopped
    player.held = { ...choppedTomato };
    interact(state, player.id);
    player.held = { ...choppedTomato };
    interact(state, player.id);
    expect((counter.item as ToolItem).contents.length).toBe(3);

    // Cho thêm 1 tomato chopped nữa -> đầy, không được
    player.held = { ...choppedTomato };
    interact(state, player.id);
    expect((counter.item as ToolItem).contents.length).toBe(3);
    expect(player.held).not.toBeNull();
  });

  it('Nồi chưa đủ 3 không nấu, đủ 3 thì 15s chín, +10s cháy', () => {
    const stove = addStation(2, 1, 'stove', { item: { type: 'tool', tool: 'pot', contents: [], progress: 0 } });
    
    const choppedTomato = makeIngredient('tomato');
    choppedTomato.state = 'chopped';
    
    (stove.item as ToolItem).contents.push({ ...choppedTomato });
    (stove.item as ToolItem).contents.push({ ...choppedTomato });
    
    // 2 cái trên bếp
    for (let i = 0; i < 30; i++) step(state, {});
    expect((stove.item as ToolItem).progress).toBe(0); // Không tăng

    // Cho cái thứ 3
    player.held = { ...choppedTomato };
    interact(state, player.id);
    expect((stove.item as ToolItem).contents.length).toBe(3);

    // 15s chín
    let events: any[] = [];
    for (let i = 0; i < POT_COOK_TIME * SIM_HZ; i++) {
      events.push(...step(state, {}));
    }
    expect(events.some(e => e.type === 'pot_done')).toBe(true);
    // Vẫn là 3 cái tomato bên trong, nhưng nồi được coi là chín nếu lấy ra đĩa
    expect((stove.item as ToolItem).contents.every(c => c.state !== 'burnt')).toBe(true);

    // +10s cháy
    events = [];
    for (let i = 0; i < POT_BURN_TIME * SIM_HZ; i++) {
      events.push(...step(state, {}));
    }
    expect(events.some(e => e.type === 'soup_burnt')).toBe(true);
    expect((stove.item as ToolItem).contents[0]!.state).toBe('burnt');
  });

  it('Đĩa nhận súp chín thành soup_tomato:cooked, matchRecipe đúng', () => {
    const counter = addStation(2, 1, 'counter');
    const pot: ToolItem = { type: 'tool', tool: 'pot', contents: [], progress: POT_COOK_TIME };
    for (let i = 0; i < 3; i++) {
      const t = makeIngredient('tomato');
      t.state = 'chopped';
      pot.contents.push(t);
    }
    counter.item = pot;

    player.held = makePlate(false);
    interact(state, player.id); // Tương tác đĩa với nồi

    // Nồi rỗng
    expect((counter.item as ToolItem).contents.length).toBe(0);
    // Đĩa có soup_tomato
    const plate = player.held as PlateItem;
    expect(plate.contents.length).toBe(1);
    expect(plate.contents[0]!.id).toBe('soup_tomato');
    expect(plate.contents[0]!.state).toBe('cooked');
    
    expect(matchRecipe(plate)).toBe('tomato_soup');
  });

  it('Súp cháy không lên đĩa được', () => {
    const counter = addStation(2, 1, 'counter');
    const pot: ToolItem = { type: 'tool', tool: 'pot', contents: [], progress: POT_COOK_TIME + POT_BURN_TIME };
    for (let i = 0; i < 3; i++) {
      const t = makeIngredient('tomato');
      t.state = 'burnt';
      pot.contents.push(t);
    }
    counter.item = pot;

    player.held = makePlate(false);
    const ev = interact(state, player.id);
    expect(ev.length).toBe(0); // Không làm gì
    expect((counter.item as ToolItem).contents.length).toBe(3);
    expect((player.held as PlateItem).contents.length).toBe(0);
  });
});
