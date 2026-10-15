import { describe, it, expect, beforeEach } from 'vitest';
import { step } from '../sim/step';
import { GameState, PlayerState, StationState, IngredientItem, PlateItem } from '../types';
import { makeIngredient, makePlate } from '../recipes';
import { SIM_HZ, SPRINT_MAX } from '../constants';

describe('Auto-Action (Auto-Chop and Auto-Wash QoL)', () => {
  let state: GameState;
  let player: PlayerState;

  beforeEach(() => {
    player = {
      id: 'p1',
      x: 1.5,
      y: 1.5,
      fx: 1,
      fy: 0,
      held: null,
      acting: false,
      ackSeq: 0,
      vx: 0,
      vy: 0,
      dashT: 0,
      dashCd: 0,
      throwCd: 0,
      sprintEnergy: SPRINT_MAX
    };
    state = {
      levelId: 'test',
      width: 5,
      height: 5,
      tiles: new Array(25).fill('floor'),
      stations: [],
      players: [player],
      orders: [],
      nextOrderId: 1,
      nextOrderIn: 10,
      score: 0,
      served: 0,
      expired: 0,
      timeLeft: 100,
      tick: 0,
      rngState: 1,
      ended: false,
      recipeWeights: [{ id: 'salad', weight: 1 }],
      starThresholds: [0, 0, 0],
      projectiles: [],
      nextProjectileId: 1,
      streak: 0,
      maxStreak: 0,
      servedByPlayer: {},
      timeElapsed: 0,
      customers: [],
      nextCustomerId: 1
    };
  });

  function addStation(x: number, y: number, type: StationState['type'], extra?: Partial<StationState>): StationState {
    const s: StationState = {
      x,
      y,
      type,
      item: null,
      progress: 0,
      cleanCount: 0,
      dirtyCount: 0,
      pendingReturns: [],
      onFire: false,
      fireTimer: 0,
      burntTimer: 0,
      ...extra
    };
    state.stations.push(s);
    state.tiles[y * state.width + x] = type;
    return s;
  }

  it('Auto-chop: Bỏ đồ lên thớt tự động cắt không cần bấm F, cắt xong tự cầm trên tay', () => {
    const cutting = addStation(2, 1, 'cutting');
    player.held = makeIngredient('tomato');

    // Tick 0: bấm interact (Space) để bỏ cà chua lên thớt (act: false)
    step(state, {
      p1: { seq: 0, mx: 0, my: 0, act: false, interact: true, dash: false, throw: false }
    });

    expect(cutting.item).not.toBeNull();
    expect((cutting.item as IngredientItem).id).toBe('tomato');
    expect(player.held).toBeNull();
    expect(player.acting).toBe(true);

    // 88 ticks tiếp theo với act: false, mx: 0, my: 0 (tổng 89 ticks)
    for (let i = 1; i <= 88; i++) {
      step(state, {
        p1: { seq: i, mx: 0, my: 0, act: false, interact: false, dash: false, throw: false }
      });
      expect(player.acting).toBe(true);
    }
    expect(cutting.item).not.toBeNull();
    expect((cutting.item as IngredientItem).state).toBe('raw');

    // Tick 89 (tổng 90 ticks = 3.0s) hoàn thành cắt
    const events = step(state, {
      p1: { seq: 89, mx: 0, my: 0, act: false, interact: false, dash: false, throw: false }
    });

    expect(events.some(e => e.type === 'chop_done')).toBe(true);
    // Cắt xong: đồ đã cắt tự động trên tay người chơi, thớt trống
    expect(player.held).not.toBeNull();
    expect(player.held?.type).toBe('ingredient');
    expect((player.held as IngredientItem).id).toBe('tomato');
    expect((player.held as IngredientItem).state).toBe('chopped');
    expect(cutting.item).toBeNull();
    expect(cutting.progress).toBe(0);
    expect(player.acting).toBe(false);
  });

  it('Ngắt giữa chừng thì giữ lại tiến độ và không cho phép lấy đồ đang cắt dở', () => {
    const cutting = addStation(2, 1, 'cutting');
    player.held = makeIngredient('tomato');

    // Bỏ đồ lên thớt
    step(state, {
      p1: { seq: 0, mx: 0, my: 0, act: false, interact: true, dash: false, throw: false }
    });

    // Cắt trong 45 ticks (1.5s)
    for (let i = 1; i <= 44; i++) {
      step(state, {
        p1: { seq: i, mx: 0, my: 0, act: false, interact: false, dash: false, throw: false }
      });
    }
    const savedProgress = cutting.progress;
    expect(savedProgress).toBeGreaterThan(1.4);

    // Ngắt giữa chừng bằng cách di chuyển
    step(state, {
      p1: { seq: 45, mx: 0, my: 1, act: false, interact: false, dash: false, throw: false }
    });
    expect(player.acting).toBe(false);
    // Tiến độ cắt được giữ nguyên
    expect(cutting.progress).toBeCloseTo(savedProgress, 3);

    // Người chơi đứng đối diện thớt thử lấy đồ đang cắt dở
    player.x = 1.5;
    player.y = 1.5;
    player.fx = 1;
    player.fy = 0;
    // Bấm interact để nhặt: không được phép lấy vì đang cắt dở
    step(state, {
      p1: { seq: 46, mx: 0, my: 0, act: false, interact: true, dash: false, throw: false }
    });
    expect(player.held).toBeNull();
    expect(cutting.item).not.toBeNull();
    expect((cutting.item as IngredientItem).state).toBe('raw');
    expect(cutting.progress).toBeCloseTo(savedProgress, 3);
  });

  it('Người chơi lại và ấn F thì tiếp tục tự động cắt từ tiến độ cũ', () => {
    const cutting = addStation(2, 1, 'cutting', {
      item: makeIngredient('tomato'),
      progress: 1.5 // đã cắt dở 1.5s
    });

    // Ấn F (act: true) trong 1 tick để kích hoạt tiếp tục tự động cắt
    step(state, {
      p1: { seq: 0, mx: 0, my: 0, act: true, interact: false, dash: false, throw: false }
    });
    expect(player.acting).toBe(true);

    // Nhả phím F (act: false) các tick sau đó, nhân vật vẫn tiếp tục tự động cắt
    for (let i = 1; i < 44; i++) {
      step(state, {
        p1: { seq: i, mx: 0, my: 0, act: false, interact: false, dash: false, throw: false }
      });
      expect(player.acting).toBe(true);
    }

    // Hoàn thành 1.5s còn lại
    const events = step(state, {
      p1: { seq: 44, mx: 0, my: 0, act: false, interact: false, dash: false, throw: false }
    });
    expect(events.some(e => e.type === 'chop_done')).toBe(true);
    expect(player.held).not.toBeNull();
    expect((player.held as IngredientItem).state).toBe('chopped');
    expect(cutting.item).toBeNull();
  });

  it('Auto-wash: Bỏ đĩa vào bồn tự động rửa, rửa xong tự cầm đĩa sạch trên tay', () => {
    const sink = addStation(2, 1, 'sink');
    player.held = makePlate(true); // đĩa bẩn

    // Bấm interact (Space) bỏ đĩa bẩn vào bồn (act: false)
    step(state, {
      p1: { seq: 0, mx: 0, my: 0, act: false, interact: true, dash: false, throw: false }
    });
    expect(sink.dirtyCount).toBe(1);
    expect(player.held).toBeNull();
    expect(player.acting).toBe(true);

    // 88 ticks tiếp theo với act: false
    for (let i = 1; i <= 88; i++) {
      step(state, {
        p1: { seq: i, mx: 0, my: 0, act: false, interact: false, dash: false, throw: false }
      });
      expect(player.acting).toBe(true);
    }

    // Tick 89 (đủ 3.0s)
    const events = step(state, {
      p1: { seq: 89, mx: 0, my: 0, act: false, interact: false, dash: false, throw: false }
    });
    expect(events.some(e => e.type === 'wash_done')).toBe(true);
    expect(sink.dirtyCount).toBe(0);
    // Rửa xong: nhân vật tự động cầm đĩa sạch trên tay
    expect(player.held).not.toBeNull();
    expect(player.held?.type).toBe('plate');
    expect((player.held as PlateItem).dirty).toBe(false);
    expect(sink.cleanCount).toBe(0); // vì đã ở trên tay người chơi
    expect(player.acting).toBe(false);
  });

  it('Rửa chén ngắt giữa chừng giữ lại tiến độ và ấn F tiếp tục tự động rửa', () => {
    const sink = addStation(2, 1, 'sink', { dirtyCount: 1 });

    // Đứng trước bồn bấm F để bắt đầu tự động rửa
    step(state, {
      p1: { seq: 0, mx: 0, my: 0, act: true, interact: false, dash: false, throw: false }
    });
    expect(player.acting).toBe(true);

    // Tự động rửa 30 ticks (1s) với act: false
    for (let i = 1; i <= 29; i++) {
      step(state, {
        p1: { seq: i, mx: 0, my: 0, act: false, interact: false, dash: false, throw: false }
      });
    }
    const savedProgress = sink.progress;
    expect(savedProgress).toBeGreaterThan(0.9);

    // Di chuyển ngắt giữa chừng
    step(state, {
      p1: { seq: 30, mx: -1, my: 0, act: false, interact: false, dash: false, throw: false }
    });
    expect(player.acting).toBe(false);
    expect(sink.progress).toBeCloseTo(savedProgress, 3);

    // Quay lại trước bồn
    player.x = 1.5;
    player.y = 1.5;
    player.fx = 1;
    player.fy = 0;

    // Ấn F tiếp tục tự động rửa
    step(state, {
      p1: { seq: 31, mx: 0, my: 0, act: true, interact: false, dash: false, throw: false }
    });
    expect(player.acting).toBe(true);

    // Nhả F, tự động rửa nốt 59 ticks
    for (let i = 32; i < 90; i++) {
      step(state, {
        p1: { seq: i, mx: 0, my: 0, act: false, interact: false, dash: false, throw: false }
      });
    }

    const events = step(state, {
      p1: { seq: 90, mx: 0, my: 0, act: false, interact: false, dash: false, throw: false }
    });
    expect(events.some(e => e.type === 'wash_done')).toBe(true);
    expect(player.held).not.toBeNull();
    expect((player.held as PlateItem).dirty).toBe(false);
    expect(sink.dirtyCount).toBe(0);
  });
});
