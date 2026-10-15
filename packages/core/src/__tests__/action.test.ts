import { describe, it, expect, beforeEach } from 'vitest';
import { step } from '../sim/step';
import { GameState, PlayerState, StationState, IngredientItem, ToolItem } from '../types';
import { makeIngredient } from '../recipes';
import { SIM_HZ, SPRINT_MAX } from '../constants';

describe('action & stations (T07)', () => {
  let state: GameState;
  let player: PlayerState;
  const dt = 1 / SIM_HZ;

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
      recipeWeights: [{ id: 'salad', weight: 1 }], starThresholds: [0, 0, 0],
      projectiles: [], nextProjectileId: 1, streak: 0, maxStreak: 0, servedByPlayer: {}, timeElapsed: 0, customers: [], nextCustomerId: 1
    };
  });

  function addStation(x: number, y: number, type: StationState['type'], extra?: Partial<StationState>): StationState {
    const s: StationState = { x, y, type, item: null, progress: 0, cleanCount: 0, dirtyCount: 0, pendingReturns: [], onFire: false, fireTimer: 0, burntTimer: 0, ...extra };
    state.stations.push(s);
    state.tiles[y * state.width + x] = type;
    return s;
  }

  it('Thái: 3.0s hoàn thành khi giữ act', () => {
    const cutting = addStation(2, 1, 'cutting', { item: makeIngredient('tomato') });
    
    // tick 89 lần với act: true
    for (let i = 0; i < 89; i++) {
      step(state, { p1: { seq: i, mx: 0, my: 0, act: true, interact: false, dash: false, throw: false } });
    }
    expect((cutting.item as IngredientItem).state).toBe('raw');

    // tick lần 90
    const events = step(state, { p1: { seq: 90, mx: 0, my: 0, act: true, interact: false, dash: false, throw: false } });
    expect(player.held).not.toBeNull();
    expect((player.held as IngredientItem).state).toBe('chopped');
    expect(cutting.item).toBeNull();
    expect(cutting.progress).toBe(0);
    expect(events.some(e => e.type === 'chop_done')).toBe(true);
  });

  it('Rửa đĩa: sink.dirtyCount=2, giữ act rửa 1 đĩa sau 3s, đĩa 2 sau 3s nữa', () => {
    const sink = addStation(2, 1, 'sink', { dirtyCount: 2 });
    
    for (let i = 0; i < 90; i++) { // 3s
      step(state, { p1: { seq: i, mx: 0, my: 0, act: true, interact: false, dash: false, throw: false } });
    }
    expect(sink.dirtyCount).toBe(1);
    expect(player.held).not.toBeNull();
    expect((player.held as any).dirty).toBe(false);

    // Cất đĩa sạch thứ nhất để tay rỗng rửa tiếp đĩa 2
    player.held = null;

    for (let i = 90; i < 180; i++) { // 3s
      step(state, { p1: { seq: i, mx: 0, my: 0, act: true, interact: false, dash: false, throw: false } });
    }
    expect(sink.dirtyCount).toBe(0);
    expect(player.held).not.toBeNull();
    expect((player.held as any).dirty).toBe(false);
  });

  it('Thịt trên bếp: 8s cooked, thêm 6s burnt', () => {
    const stove = addStation(2, 1, 'stove', { item: { type: 'tool', tool: 'pan', contents: [makeIngredient('meat')], progress: 0 } });
    
    let events: any[] = [];
    for (let i = 0; i < 8 * 30; i++) { // 8s
      const ev = step(state, { p1: { seq: i, mx: 0, my: 0, act: false, interact: false, dash: false, throw: false } });
      events.push(...ev);
    }
    expect((stove.item as ToolItem).contents[0]!.state).toBe('cooked');
    expect(events.some(e => e.type === 'cook_done')).toBe(true);

    events = [];
    for (let i = 0; i < 6 * 30; i++) { // 6s
      const ev = step(state, { p1: { seq: i, mx: 0, my: 0, act: false, interact: false, dash: false, throw: false } });
      events.push(...ev);
    }
    expect((stove.item as ToolItem).contents[0]!.state).toBe('burnt');
    expect(events.some(e => e.type === 'burnt')).toBe(true);
  });

  it('pendingReturns sau 5s -> dirtyCount++ và mảng rỗng', () => {
    const ret = addStation(2, 1, 'dish_return', { pendingReturns: [5.0] });
    
    for (let i = 0; i < 150; i++) { // 5s
      step(state, { p1: { seq: i, mx: 0, my: 0, act: false, interact: false, dash: false, throw: false } });
    }
    expect(ret.pendingReturns.length).toBe(0);
    expect(ret.dirtyCount).toBe(1);
  });



  it('Thịt lấy ra ở giây 10 thì còn cooked và progress=0', () => {
    const stove = addStation(2, 1, 'stove', { item: { type: 'tool', tool: 'pan', contents: [makeIngredient('meat')], progress: 0 } });
    
    for (let i = 0; i < 10 * 30; i++) { // 10s
      step(state, { p1: { seq: i, mx: 0, my: 0, act: false, interact: false, dash: false, throw: false } });
    }
    // Ở giây 10 (8s cook, 2s burn), thịt là cooked. Lấy ra.
    expect((stove.item as ToolItem).contents[0]!.state).toBe('cooked');
    
    // Nhặt pan (tương tác)
    step(state, { p1: { seq: 300, mx: 0, my: 0, act: false, interact: true, dash: false, throw: false } });
    expect(stove.item).toBeNull();
    const held = player.held as ToolItem;
    expect(held.contents[0]!.state).toBe('cooked');
  });

});
