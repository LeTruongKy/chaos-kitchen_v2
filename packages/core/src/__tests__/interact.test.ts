import { describe, it, expect, beforeEach } from 'vitest';
import { interact, getTargetTile } from '../sim/interact';
import { GameState, PlayerState, StationState, PlateItem } from '../types';
import { makeIngredient, makePlate } from '../recipes';
import { SPRINT_MAX } from '../constants';

describe('getTargetTile (T21)', () => {
  it('calculates correct tile for 8 directions and at wall bounds', () => {
    // Math.floor(x + fx * 0.8), Math.floor(y + fy * 0.8)
    const p: PlayerState = { id: 'p', x: 1.5, y: 1.5, fx: 0, fy: 0, held: null, acting: false, ackSeq: 0, vx: 0, vy: 0, dashT: 0, dashCd: 0, throwCd: 0, sprintEnergy: SPRINT_MAX };
    
    // R (1, 0) => x + 0.8 = 2.3 => 2
    p.fx = 1; p.fy = 0;
    expect(getTargetTile(p)).toEqual({ tx: 2, ty: 1 });
    
    // L (-1, 0) => x - 0.8 = 0.7 => 0
    p.fx = -1; p.fy = 0;
    expect(getTargetTile(p)).toEqual({ tx: 0, ty: 1 });
    
    // U (0, -1) => y - 0.8 = 0.7 => 0
    p.fx = 0; p.fy = -1;
    expect(getTargetTile(p)).toEqual({ tx: 1, ty: 0 });
    
    // D (0, 1) => y + 0.8 = 2.3 => 2
    p.fx = 0; p.fy = 1;
    expect(getTargetTile(p)).toEqual({ tx: 1, ty: 2 });
    
    // TR (0.707, -0.707) => x + 0.56 = 2.06 => 2; y - 0.56 = 0.94 => 0
    p.fx = 0.707; p.fy = -0.707;
    expect(getTargetTile(p)).toEqual({ tx: 2, ty: 0 });
    
    // BL (-0.707, 1) but normalized...
    p.fx = -0.707; p.fy = 0.707;
    expect(getTargetTile(p)).toEqual({ tx: 0, ty: 2 });
    
    // against wall: x = 0.5, L
    p.x = 0.5; p.fx = -1; p.fy = 0;
    expect(getTargetTile(p)).toEqual({ tx: -1, ty: 1 }); // caller will bounds-check
  });
});

describe('interact (T06)', () => {
  let state: GameState;
  let player: PlayerState;

  beforeEach(() => {
    // Tạo 1 state giả định 1 người chơi ềE(1.5, 1.5) nhìn sang phải (fx=1, fy=0).
    // Xung quanh có thềEđặt các station đềEtest.
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
      orders: [], nextOrderId: 1, nextOrderIn: 10,
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
      customers: [], nextCustomerId: 1, streak: 0, maxStreak: 0, servedByPlayer: {}, timeElapsed: 0
    };
  });

  function addStation(x: number, y: number, type: StationState['type'], extra?: Partial<StationState>): StationState {
    const s: StationState = { x, y, type, item: null, progress: 0, cleanCount: 0, dirtyCount: 0, pendingReturns: [], onFire: false, fireTimer: 0, burntTimer: 0, ...extra };
    state.stations.push(s);
    state.tiles[y * state.width + x] = type; // gán type vào map, dù không cần thiết lắm vì hàm getStationAt quét stations
    return s;
  }

  it('crate: tay rỗng -> nhận raw; tay có đềE-> không đổi', () => {
    const crate = addStation(2, 1, 'crate', { crate: 'tomato' });
    const events = interact(state, player.id);
    expect(events.length).toBe(1);
    expect(events[0]!.type).toBe('pickup');
    expect(player.held).toEqual(makeIngredient('tomato'));
    
    // tay có đồ
    player.held = makePlate(false);
    const events2 = interact(state, player.id);
    expect(events2.length).toBe(0);
  });

  it('counter: đặt/nhặt; đặt khi đã có vật -> không đổi', () => {
    const counter = addStation(2, 1, 'counter');
    
    // player có đềE-> đặt
    player.held = makeIngredient('tomato');
    let events = interact(state, player.id);
    expect(events[0]!.type).toBe('drop');
    expect(player.held).toBeNull();
    expect(counter.item).toEqual(makeIngredient('tomato'));

    // player có đềEkhác, counter có đềE-> không đổi
    player.held = makeIngredient('bun');
    events = interact(state, player.id);
    expect(events.length).toBe(0);

    // player rỗng, counter có đềE-> nhặt
    player.held = null;
    events = interact(state, player.id);
    expect(events[0]!.type).toBe('pickup');
    expect(player.held).toEqual(makeIngredient('tomato'));
    expect(counter.item).toBeNull();
  });

  it('counter: đĩa sạch trên bàn + tomato chopped tay -> vào đĩa', () => {
    const counter = addStation(2, 1, 'counter');
    counter.item = makePlate(false);
    const tomato = makeIngredient('tomato');
    tomato.state = 'chopped';
    player.held = tomato;

    const events = interact(state, player.id);
    expect(events[0]!.type).toBe('drop');
    expect(player.held).toBeNull();
    const plate = counter.item as PlateItem;
    expect(plate.contents[0]).toEqual(tomato);
  });

  it('counter: đĩa trong tay + tomato chopped trên bàn -> vào đĩa', () => {
    const counter = addStation(2, 1, 'counter');
    const tomato = makeIngredient('tomato');
    tomato.state = 'chopped';
    counter.item = tomato;
    player.held = makePlate(false);

    const events = interact(state, player.id);
    expect(events[0]!.type).toBe('pickup');
    expect(counter.item).toBeNull();
    const plate = player.held as PlateItem;
    expect(plate.contents[0]).toEqual(tomato);
  });

  it('counter: nguyên liệu không hợp lềE(cà chua raw) -> không đổi', () => {
    const counter = addStation(2, 1, 'counter');
    const rawTomato = makeIngredient('tomato');
    counter.item = rawTomato;
    player.held = makePlate(false);

    const events = interact(state, player.id);
    expect(events.length).toBe(0);
    expect(counter.item).toEqual(rawTomato);
  });

  it('cutting: chềEđặt được lettuce/tomato raw', () => {
    const cutting = addStation(2, 1, 'cutting');
    
    // thử đặt bun -> không được
    player.held = makeIngredient('bun');
    let events = interact(state, player.id);
    expect(events.length).toBe(0);
    expect(cutting.item).toBeNull();

    // thử đặt tomato raw -> được
    player.held = makeIngredient('tomato');
    events = interact(state, player.id);
    expect(events[0]!.type).toBe('drop');
    expect(cutting.item).toEqual(makeIngredient('tomato'));

    // không cho phép lấy đồ trên thớt đang cắt dở (progress > 0) để tránh mất tiến độ
    cutting.progress = 5;
    player.held = null;
    events = interact(state, player.id);
    expect(events.length).toBe(0);
    expect(cutting.progress).toBe(5);

    // nếu progress = 0 thì nhặt được bình thường
    cutting.progress = 0;
    player.autoAction = undefined;
    events = interact(state, player.id);
    expect(events[0]!.type).toBe('pickup');
    expect(cutting.progress).toBe(0);
  });

  it('stove: chềEđặt meat raw; nhặt được thịt cháy; đĩa + thịt chín trên bếp', () => {
    const stove = addStation(2, 1, 'stove');
    stove.item = { type: 'tool', tool: 'pan', contents: [], progress: 0 };
    
    // thử đặt bun -> không được
    player.held = makeIngredient('bun');
    let events = interact(state, player.id);
    expect(events.length).toBe(0);

    // đặt meat raw -> được
    player.held = makeIngredient('meat');
    events = interact(state, player.id);
    expect(events[0]!.type).toBe('drop');
    
    // nhặt thịt cháy (thực ra là cầm cả pan đang chứa thịt cháy lên)
    const burntMeat = makeIngredient('meat');
    burntMeat.state = 'burnt';
    (stove.item as any).contents = [burntMeat];
    player.held = null;
    events = interact(state, player.id);
    expect(events[0]!.type).toBe('pickup');
    expect((player.held as any).contents[0]).toEqual(burntMeat);

    // đĩa sạch + thịt chín trên bếp -> vào đĩa
    // Bỏ lại chảo lên bếp
    stove.item = player.held;
    player.held = null;

    const cookedMeat = makeIngredient('meat');
    cookedMeat.state = 'cooked';
    (stove.item as any).contents = [cookedMeat];
    player.held = makePlate(false);
    events = interact(state, player.id);
    expect(events[0]!.type).toBe('pickup'); // Because scooped into plate
    expect((stove.item as any).contents.length).toBe(0); // Pan is now empty
    const plate = player.held as PlateItem;
    expect(plate.contents[0]).toEqual(cookedMeat);

    // đĩa + thịt cháy -> không đổi
    (stove.item as any).contents = [burntMeat];
    player.held = makePlate(false);
    events = interact(state, player.id);
    expect(events.length).toBe(0);
  });

  it('plate_dispenser: giảm/tăng cleanCount', () => {
    const disp = addStation(2, 1, 'plate_dispenser', { cleanCount: 1 });
    
    // nhận đĩa
    let events = interact(state, player.id);
    expect(events[0]!.type).toBe('pickup');
    expect(disp.cleanCount).toBe(0);
    expect(player.held!.type).toBe('plate');

    // hết đĩa không nhận được
    player.held = null;
    events = interact(state, player.id);
    expect(events.length).toBe(0);

    // trả đĩa rỗng -> tăng count
    player.held = makePlate(false);
    events = interact(state, player.id);
    expect(events[0]!.type).toBe('drop');
    expect(disp.cleanCount).toBe(1);

    // đĩa có đềE-> không trả được
    const plate = makePlate(false);
    plate.contents.push(makeIngredient('tomato'));
    player.held = plate;
    events = interact(state, player.id);
    expect(events.length).toBe(0);
    expect(disp.cleanCount).toBe(1);
  });

  it('table dirty plate pickup, sink', () => {
    // Table with dirty plate (after customer ate)
    const table = addStation(2, 1, 'table', { item: { type: 'plate', dirty: true, contents: [] } as any });
    const sink = addStation(2, 1, 'sink', { cleanCount: 1 });

    // pickup dirty plate from table
    let events = interact(state, player.id);
    expect(events[0]!.type).toBe('pickup');
    expect(table.item).toBeNull();
    const dirtyPlate = player.held as PlateItem;
    expect(dirtyPlate.dirty).toBe(true);

    // bring dirty plate to sink
    player.fx = 0; player.fy = -1;
    sink.y = 0; sink.x = 1;
    events = interact(state, player.id);
    expect(events[0]!.type).toBe('drop');
    expect(sink.dirtyCount).toBe(1);
    expect(player.held).toBeNull();
  });

  it('trash: đúng luật', () => {
    const trash = addStation(2, 1, 'trash');
    
    // nguyên liệu -> mất
    player.held = makeIngredient('tomato');
    let events = interact(state, player.id);
    expect(events[0]!.type).toBe('trash');
    expect(player.held).toBeNull();

    // đĩa sạch có đềE-> còn đĩa rỗng
    const plate = makePlate(false);
    plate.contents.push(makeIngredient('bun'));
    player.held = plate;
    events = interact(state, player.id);
    expect(events[0]!.type).toBe('trash');
    expect((player.held as PlateItem).contents.length).toBe(0);

    // đĩa bẩn -> không đổi
    player.held = makePlate(true);
    events = interact(state, player.id);
    expect(events.length).toBe(0);
    expect((player.held as PlateItem).dirty).toBe(true);
  });

  it('Hướng nhìn sang tile floor -> không làm gì', () => {
    // Không có station ềE(2,1)
    player.held = makeIngredient('bun');
    const events = interact(state, player.id);
    expect(events.length).toBe(0);
    expect(player.held).not.toBeNull();
  });

});
