import { describe, it, expect } from 'vitest';
import { tau_hai_tac } from '../levels/tau_hai_tac';
import { tram_vu_tru } from '../levels/tram_vu_tru';
import { PLAYABLE_LEVELS } from '../levels';
import { validateLevel, parseLevel } from '../level';
import { createGameState, getStationAt } from '../sim/createState';
import { step } from '../sim/step';
import { interact } from '../sim/interact';
import { updateAction } from '../sim/action';
import { simulateMove } from '../sim/movement';
import { matchRecipe } from '../recipes';
import { ICE_FRICTION, SIM_HZ, CHOP_TIME } from '../constants';
import { TileType, PlayerState, PlateItem } from '../types';
import { walkTo, interactWith, holdAct } from './helpers';

describe('Phase 2b - Maps & Mechanics Tests', () => {
  it('1. Với mỗi cặp map chơi cùng kích thước liên quan đến map mới: tỉ lệ ô có cùng ký tự cùng tọa độ < 0.5', () => {
    const newMaps = [tau_hai_tac, tram_vu_tru];
    for (const newMap of newMaps) {
      for (const other of PLAYABLE_LEVELS) {
        if (other.id === newMap.id) continue;
        const nW = newMap.ascii[0]!.length;
        const nH = newMap.ascii.length;
        const oW = other.ascii[0]!.length;
        const oH = other.ascii.length;
        if (nW === oW && nH === oH) {
          let matches = 0;
          const total = nW * nH;
          for (let y = 0; y < nH; y++) {
            for (let x = 0; x < nW; x++) {
              if (newMap.ascii[y]![x] === other.ascii[y]![x]) matches++;
            }
          }
          const similarity = matches / total;
          expect(
            similarity,
            `Map mới ${newMap.id} và ${other.id} (${nW}x${nH}) có độ tương đồng ${similarity.toFixed(3)} phải < 0.5`
          ).toBeLessThan(0.5);
        }
      }
    }
  });

  it('2. Kích thước 2 map mới không trùng kích thước bất kỳ map chơi nào khác', () => {
    const otherLevels = PLAYABLE_LEVELS.filter(l => l.id !== 'tau_hai_tac' && l.id !== 'tram_vu_tru');
    const tauW = tau_hai_tac.ascii[0]!.length;
    const tauH = tau_hai_tac.ascii.length;
    const tramW = tram_vu_tru.ascii[0]!.length;
    const tramH = tram_vu_tru.ascii.length;

    for (const other of otherLevels) {
      const oW = other.ascii[0]!.length;
      const oH = other.ascii.length;
      expect(
        tauW === oW && tauH === oH,
        `tau_hai_tac (20x9) không được trùng kích thước với ${other.id} (${oW}x${oH})`
      ).toBe(false);
      expect(
        tramW === oW && tramH === oH,
        `tram_vu_tru (16x12) không được trùng kích thước với ${other.id} (${oW}x${oH})`
      ).toBe(false);
    }
    expect(tauW === tramW && tauH === tramH).toBe(false);
  });

  it('3. tau_hai_tac: có dải ~ rộng đúng 3 hàng liên tục, trải tối thiểu 18 ô mỗi hàng', () => {
    const parsed = parseLevel(tau_hai_tac);
    expect(parsed.width).toBe(20);
    expect(parsed.height).toBe(9);

    // Hàng 3, 4, 5: các cột 3 đến 18 (0-indexed: 2..17) là ~, cột 2 và 19 (0-indexed: 1 và 18) là sàn .
    for (const y of [3, 4, 5]) {
      const row = tau_hai_tac.ascii[y]!;
      const iceCount = (row.match(/~/g) || []).length;
      expect(iceCount, `Hàng ${y} phải có 16 ô ~`).toBe(16);
      expect(row[1], `Cột 2 (index 1) tại hàng ${y} phải là sàn .`).toBe('.');
      expect(row[18], `Cột 19 (index 18) tại hàng ${y} phải là sàn .`).toBe('.');
      for (let x = 2; x <= 17; x++) {
        expect(row[x], `Tọa độ (${x}, ${y}) phải là ~`).toBe('~');
      }
    }
    expect((tau_hai_tac.ascii[2]!.match(/~/g) || []).length).toBe(0);
    expect((tau_hai_tac.ascii[6]!.match(/~/g) || []).length).toBe(0);
  });

  it('4. tram_vu_tru: có >= 10 ô conveyor, mọi conveyor có ô kế tiếp hợp lệ, một đầu băng kết thúc tại Q', () => {
    const parsed = parseLevel(tram_vu_tru);
    expect(parsed.width).toBe(16);
    expect(parsed.height).toBe(12);

    const conveyors = parsed.stations.filter(s => s.type === 'conveyor');
    expect(conveyors.length).toBeGreaterThanOrEqual(10);

    let endsAtQ = false;
    for (const conv of conveyors) {
      let nx = conv.x;
      let ny = conv.y;
      if (conv.dir === 'right') nx++;
      if (conv.dir === 'left') nx--;
      if (conv.dir === 'up') ny--;
      if (conv.dir === 'down') ny++;

      expect(nx >= 0 && nx < parsed.width && ny >= 0 && ny < parsed.height).toBe(true);
      const nextChar = tram_vu_tru.ascii[ny]![nx];
      expect(nextChar, `Conveyor tại (${conv.x},${conv.y}) không được hướng vào tường`).not.toBe('#');

      if (nextChar === 'Q') {
        endsAtQ = true;
      }
    }

    expect(endsAtQ, 'Phải có ít nhất 1 đầu băng chuyền kết thúc tại bàn Q').toBe(true);
  });

  it('5. validateLevel không lỗi, validate:levels 0 unreachable, bot đi được từ mọi spawn tới mọi trạm', () => {
    const resShip = validateLevel(tau_hai_tac);
    expect(resShip.errors).toEqual([]);
    expect(resShip.warnings.filter(w => w.includes('unreachable'))).toEqual([]);

    const resSpace = validateLevel(tram_vu_tru);
    expect(resSpace.errors).toEqual([]);
    expect(resSpace.warnings).toEqual([]);

    const maps = [tau_hai_tac, tram_vu_tru];
    for (const level of maps) {
      const parsed = parseLevel(level);
      const isWalkable = (t: TileType) => t === 'floor' || t === 'ice';
      const functionalStations = parsed.stations.filter(s => s.type !== 'counter' && s.type !== 'conveyor');

      for (let sIdx = 0; sIdx < parsed.spawns.length; sIdx++) {
        const spawn = parsed.spawns[sIdx]!;
        const startX = Math.floor(spawn.x);
        const startY = Math.floor(spawn.y);

        for (const station of functionalStations) {
          const queue: { x: number; y: number }[] = [{ x: startX, y: startY }];
          const visited = new Set<string>([`${startX},${startY}`]);
          const targetNeighbors = new Set([
            `${station.x + 1},${station.y}`,
            `${station.x - 1},${station.y}`,
            `${station.x},${station.y + 1}`,
            `${station.x},${station.y - 1}`,
          ]);

          let reachable = false;
          while (queue.length > 0) {
            const curr = queue.shift()!;
            if (targetNeighbors.has(`${curr.x},${curr.y}`)) {
              reachable = true;
              break;
            }

            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const nx = curr.x + dx!;
              const ny = curr.y + dy!;
              const key = `${nx},${ny}`;
              if (nx >= 0 && nx < parsed.width && ny >= 0 && ny < parsed.height && !visited.has(key)) {
                visited.add(key);
                if (isWalkable(parsed.tiles[ny * parsed.width + nx]!)) {
                  queue.push({ x: nx, y: ny });
                }
              }
            }
          }

          expect(reachable, `Spawn ${sIdx + 1} (${startX},${startY}) in map "${level.id}" should reach ${station.type} at (${station.x},${station.y})`).toBe(true);
        }
      }
    }
  });

  it('6. Test băng trơn: đứng trên ~ rồi thả phím, nhân vật trượt rồi dừng (dùng ICE_FRICTION)', () => {
    const parsed = parseLevel(tau_hai_tac);
    const iceTile = parsed.tiles[4 * parsed.width + 7];
    expect(iceTile).toBe('ice');

    let moveState = {
      x: 7.5,
      y: 4.5,
      vx: 0,
      vy: 0,
      fx: 1,
      fy: 0,
      dashT: 0,
      dashCd: 0
    };

    const dt = 1 / SIM_HZ;
    for (let i = 0; i < 5; i++) {
      moveState = simulateMove(moveState, 1, 0, false, parsed.tiles, parsed.width, parsed.height, dt);
    }
    expect(moveState.vx).toBeGreaterThan(0.5);

    const initialSlideVx = moveState.vx;
    moveState = simulateMove(moveState, 0, 0, false, parsed.tiles, parsed.width, parsed.height, dt);
    expect(moveState.vx).toBeGreaterThan(initialSlideVx * 0.85);

    for (let i = 0; i < Math.ceil(1.5 * SIM_HZ); i++) {
      moveState = simulateMove(moveState, 0, 0, false, parsed.tiles, parsed.width, parsed.height, dt);
    }
    expect(Math.abs(moveState.vx)).toBeLessThan(0.01);
  });

  it('7. Test băng chuyền: đồ trên băng trôi liên tục (tram_vu_tru)', () => {
    const state = createGameState(tram_vu_tru, ['p1'], 12345);
    const conv1 = getStationAt(state, 8, 8)!;
    const conv2 = getStationAt(state, 9, 8)!;
    const conv3 = getStationAt(state, 10, 8)!;

    expect(conv1.type).toBe('conveyor');
    expect(conv1.dir).toBe('right');
    expect(conv2.type).toBe('conveyor');
    expect(conv2.dir).toBe('right');
    expect(conv3.type).toBe('conveyor');
    expect(conv3.dir).toBe('up');

    conv1.item = { type: 'ingredient', id: 'tomato', state: 'raw' };
    conv1.progress = 0;

    // Trôi từ conv1 (11,9) sang conv2 (12,9)
    for (let i = 0; i < 54; i++) {
      step(state, {});
    }
    expect(conv1.item).toBeNull();
    expect(conv2.item).not.toBeNull();
    expect((conv2.item as any)?.id).toBe('tomato');

    // Trôi từ conv2 (12,9) sang conv3 (13,9)
    for (let i = 0; i < 54; i++) {
      step(state, {});
    }
    expect(conv2.item).toBeNull();
    expect(conv3.item).not.toBeNull();
    expect((conv3.item as any)?.id).toBe('tomato');
  });

  it('8. Hoàn thành 1 món salad trên map Tàu Hải Tặc mới (tau_hai_tac 20x9)', () => {
    const state = createGameState(tau_hai_tac, ['p1', 'p2'], 999);
    const table = state.stations.find(st => st.type === 'table')!;
    table.customerId = 1;
    state.customers.push({
      id: 1, x: table.x, y: table.y, state: 'order_taken',
      recipe: 'salad', patience: 100, maxPatience: 100,
      timer: 0, colorIndex: 0
    });
    state.orders.push({
      id: 1, recipe: 'salad', timeLeft: 100, patience: 100, customerId: 1
    });

    const p1 = state.players[0]!;
    const p2 = state.players[1]!;
    const plateDispenser = state.stations.find(st => st.type === 'plate_dispenser')!;
    const lettuceCrate = state.stations.find(st => st.type === 'crate' && st.crate === 'lettuce')!;
    const tomatoCrate = state.stations.find(st => st.type === 'crate' && st.crate === 'tomato')!;
    const cut = state.stations.find(st => st.type === 'cutting')!;

    function doInteract(p: PlayerState, st: { x: number; y: number }) {
      p.x = st.x;
      p.y = st.y;
      p.fx = 0;
      p.fy = 0;
      return interact(state, p.id);
    }

    const counter = state.stations.find(st => st.type === 'counter')!;

    // 1. P2 lấy lettuce và thái trên thớt C (thái xong tự cầm trên tay)
    doInteract(p2, lettuceCrate);
    doInteract(p2, cut);
    updateAction(state, p2.id, { seq: 1, mx: 0, my: 0, interact: false, act: true, dash: false, throw: false }, CHOP_TIME);
    expect(p2.held?.type).toBe('ingredient');
    // P2 đặt xà lách thái lên counter X
    doInteract(p2, counter);
    expect(p2.held).toBeNull();

    // 2. P1 lấy đĩa từ P và xúc xà lách thái từ counter X
    doInteract(p1, plateDispenser);
    expect(p1.held?.type).toBe('plate');
    doInteract(p1, counter);

    // 3. P2 lấy tomato và thái trên thớt C (thái xong tự cầm trên tay)
    doInteract(p2, tomatoCrate);
    doInteract(p2, cut);
    updateAction(state, p2.id, { seq: 2, mx: 0, my: 0, interact: false, act: true, dash: false, throw: false }, CHOP_TIME);
    expect(p2.held?.type).toBe('ingredient');
    // P2 đặt cà chua thái lên counter X
    doInteract(p2, counter);
    expect(p2.held).toBeNull();

    // 4. P1 xúc cà chua thái từ counter X vào đĩa
    doInteract(p1, counter);
    const plate = p1.held as unknown as PlateItem;
    expect(plate.contents.length).toBe(2);
    expect(matchRecipe(plate)).toBe('salad');

    // 5. P1 phục vụ tại bàn Q
    doInteract(p1, table);
    expect(p1.held).toBeNull();
    expect(state.score).toBeGreaterThan(0);
  });

  it('9. Hoàn thành 1 món salad trên map Trạm Vũ Trụ mới (tram_vu_tru 16x12)', () => {
    const state = createGameState(tram_vu_tru, ['p1'], 999);
    const table = state.stations.find(st => st.type === 'table')!;
    table.customerId = 1;
    state.customers.push({
      id: 1, x: table.x, y: table.y, state: 'order_taken',
      recipe: 'salad', patience: 100, maxPatience: 100,
      timer: 0, colorIndex: 0
    });
    state.orders.push({
      id: 1, recipe: 'salad', timeLeft: 100, patience: 100, customerId: 1
    });

    const p1 = state.players[0]!;
    const plateDispenser = state.stations.find(st => st.type === 'plate_dispenser')!;
    const lettuceCrate = state.stations.find(st => st.type === 'crate' && st.crate === 'lettuce')!;
    const tomatoCrate = state.stations.find(st => st.type === 'crate' && st.crate === 'tomato')!;
    const cut = state.stations.find(st => st.type === 'cutting')!;
    const counter = state.stations.find(st => st.type === 'counter' && st.x === 6 && st.y === 4)!;

    function doInteract(p: PlayerState, st: { x: number; y: number }) {
      p.x = st.x;
      p.y = st.y;
      p.fx = 0;
      p.fy = 0;
      return interact(state, p.id);
    }

    // 1. Lấy đĩa từ P đặt lên counter X
    doInteract(p1, plateDispenser);
    expect(p1.held?.type).toBe('plate');
    doInteract(p1, counter);
    expect(p1.held).toBeNull();

    // 2. Lấy lettuce thái ở C rồi cho vào đĩa ở counter X
    doInteract(p1, lettuceCrate);
    doInteract(p1, cut);
    updateAction(state, p1.id, { seq: 1, mx: 0, my: 0, interact: false, act: true, dash: false, throw: false }, CHOP_TIME);
    doInteract(p1, cut);
    doInteract(p1, counter);

    // 3. Lấy tomato thái ở C rồi cho vào đĩa ở counter X
    doInteract(p1, tomatoCrate);
    doInteract(p1, cut);
    updateAction(state, p1.id, { seq: 2, mx: 0, my: 0, interact: false, act: true, dash: false, throw: false }, CHOP_TIME);
    doInteract(p1, cut);
    doInteract(p1, counter);

    // 4. Nhặt đĩa salad hoàn chỉnh
    doInteract(p1, counter);
    const plate = p1.held as unknown as PlateItem;
    expect(plate?.type).toBe('plate');
    expect(matchRecipe(plate)).toBe('salad');

    // 5. Phục vụ tại bàn Q
    doInteract(p1, table);
    expect(p1.held).toBeNull();
    expect(state.score).toBeGreaterThan(0);
  });
});
