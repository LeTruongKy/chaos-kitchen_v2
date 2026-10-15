import { describe, it, expect } from 'vitest';
import { parseLevel, validateLevel } from '../level';
import { tutorial } from '../levels/tutorial';
import { level1 } from '../levels/level1';
import { bep_doi } from '../levels/bep_doi';
import { nha_hang_mo } from '../levels/nha_hang_mo';
import { bep_lo_nuong } from '../levels/bep_lo_nuong';
import { tau_hai_tac } from '../levels/tau_hai_tac';
import { tram_vu_tru } from '../levels/tram_vu_tru';
import { createGameState, getStationAt } from '../sim/createState';
import { step } from '../sim/step';
import { interact } from '../sim/interact';
import { updateAction } from '../sim/action';
import { tickStations } from '../sim/stations';
import { simulateMove } from '../sim/movement';
import { matchRecipe, makePlate } from '../recipes';
import { CHOP_TIME, COOK_TIME, POT_COOK_TIME, OVEN_COOK_TIME, RECIPE_SCORE, ICE_FRICTION, SIM_HZ, CONVEYOR_SPEED } from '../constants';
import { PlateItem, IngredientItem, CustomerState, PlayerState, StationState, LevelDef } from '../types';


const DIRS = [
  [1, 0] as const,
  [-1, 0] as const,
  [0, 1] as const,
  [0, -1] as const,
] as const;

describe('Redesign Maps: Tutorial (Học Việc) & Level 1 (Bếp Nhỏ)', () => {
  it('1. validateLevel không lỗi và không có ô floor unreachable trên cả 2 map', () => {
    for (const lvl of [tutorial, level1]) {
      const val = validateLevel(lvl);
      expect(val.errors, `Level ${lvl.id} has validation errors: ${val.errors.join(', ')}`).toEqual([]);

      const parsed = parseLevel(lvl);
      const width = parsed.width;
      const height = parsed.height;
      const isFloor = (x: number, y: number) => {
        if (x < 0 || x >= width || y < 0 || y >= height) return false;
        const ch = lvl.ascii[y]![x]!;
        return ch === '.' || ['1', '2', '3', '4'].includes(ch);
      };

      // Count total floor tiles
      let totalFloor = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (isFloor(x, y)) totalFloor++;
        }
      }

      // BFS from spawn 1
      const s1 = parsed.spawns[0]!;
      const sx = Math.floor(s1.x);
      const sy = Math.floor(s1.y);
      const visited = new Set<string>();
      const queue: [number, number][] = [[sx, sy]];
      visited.add(`${sx},${sy}`);

      while (queue.length > 0) {
        const [cx, cy] = queue.shift()!;
        for (const [dx, dy] of DIRS) {
          const nx = cx + dx;
          const ny = cy + dy;
          const key = `${nx},${ny}`;
          if (isFloor(nx, ny) && !visited.has(key)) {
            visited.add(key);
            queue.push([nx, ny]);
          }
        }
      }

      expect(visited.size, `Level ${lvl.id} has unreachable floor tiles!`).toBe(totalFloor);
    }
  });

  it('2. Đếm trạm theo đặc tả (T, L, B, M, C, S, P, W, D, Q)', () => {
    function countChars(lvl: LevelDef): Record<string, number> {
      const counts: Record<string, number> = {};
      for (const row of lvl.ascii) {
        for (const ch of row) {
          counts[ch] = (counts[ch] || 0) + 1;
        }
      }
      return counts;
    }

    const tutCounts = countChars(tutorial);
    expect(tutCounts['T'] || 0).toBe(1);
    expect(tutCounts['L'] || 0).toBe(1);
    expect(tutCounts['B'] || 0).toBe(0);
    expect(tutCounts['M'] || 0).toBe(0);
    expect(tutCounts['C'] || 0).toBe(1);
    expect(tutCounts['S'] || 0).toBe(0);
    expect(tutCounts['P'] || 0).toBe(1);
    expect(tutCounts['W'] || 0).toBe(1);
    expect(tutCounts['D'] || 0).toBe(1);
    expect(tutCounts['Q'] || 0).toBe(1);

    const l1Counts = countChars(level1);
    expect(l1Counts['T'] || 0).toBe(1);
    expect(l1Counts['L'] || 0).toBe(1);
    expect(l1Counts['B'] || 0).toBe(1);
    expect(l1Counts['M'] || 0).toBe(1);
    expect(l1Counts['C'] || 0).toBe(2);
    expect(l1Counts['S'] || 0).toBe(1);
    expect(l1Counts['P'] || 0).toBe(1);
    expect(l1Counts['W'] || 0).toBe(1);
    expect(l1Counts['D'] || 0).toBe(1);
    expect(l1Counts['Q'] || 0).toBe(4);
  });

  it('3. Bot đi được từ mọi spawn tới mọi trạm và mọi Q', () => {
    for (const lvl of [tutorial, level1]) {
      const parsed = parseLevel(lvl);
      const width = parsed.width;
      const height = parsed.height;
      const isFloor = (x: number, y: number) => {
        if (x < 0 || x >= width || y < 0 || y >= height) return false;
        const ch = lvl.ascii[y]![x]!;
        return ch === '.' || ['1', '2', '3', '4'].includes(ch);
      };

      for (let sIdx = 0; sIdx < parsed.spawns.length; sIdx++) {
        const spawn = parsed.spawns[sIdx]!;
        const sx = Math.floor(spawn.x);
        const sy = Math.floor(spawn.y);
        const visited = new Set<string>();
        const queue: [number, number][] = [[sx, sy]];
        visited.add(`${sx},${sy}`);

        while (queue.length > 0) {
          const [cx, cy] = queue.shift()!;
          for (const [dx, dy] of DIRS) {
            const nx = cx + dx;
            const ny = cy + dy;
            const key = `${nx},${ny}`;
            if (isFloor(nx, ny) && !visited.has(key)) {
              visited.add(key);
              queue.push([nx, ny]);
            }
          }
        }

        // Verify every station (including Q) has at least 1 adjacent visited floor tile
        for (const st of parsed.stations) {
          let canReach = false;
          for (const [dx, dy] of DIRS) {
            if (visited.has(`${st.x + dx},${st.y + dy}`)) {
              canReach = true;
              break;
            }
          }
          expect(canReach, `Level ${lvl.id} spawn ${sIdx + 1} cannot reach station ${st.type} at (${st.x}, ${st.y})`).toBe(true);
        }
      }
    }
  });

  it('4. Từ Q bất kỳ đi được tới W trong vòng 10 giây đi bộ', () => {
    for (const lvl of [tutorial, level1]) {
      const parsed = parseLevel(lvl);
      const width = parsed.width;
      const height = parsed.height;
      const isFloor = (x: number, y: number) => {
        if (x < 0 || x >= width || y < 0 || y >= height) return false;
        const ch = lvl.ascii[y]![x]!;
        return ch === '.' || ['1', '2', '3', '4'].includes(ch);
      };

      const wStation = parsed.stations.find(s => s.type === 'sink')!;
      expect(wStation).toBeDefined();

      const qStations = parsed.stations.filter(s => s.type === 'table');
      expect(qStations.length).toBeGreaterThanOrEqual(1);

      for (const q of qStations) {
        const visited = new Map<string, number>();
        const queue: [number, number, number][] = [];
        for (const [dx, dy] of DIRS) {
          const fx = q.x + dx, fy = q.y + dy;
          if (isFloor(fx, fy)) {
            visited.set(`${fx},${fy}`, 0);
            queue.push([fx, fy, 0]);
          }
        }

        let minDist = -1;
        while (queue.length > 0) {
          const [cx, cy, d] = queue.shift()!;
          for (const [dx, dy] of DIRS) {
            if (cx + dx === wStation.x && cy + dy === wStation.y) {
              minDist = d;
              break;
            }
          }
          if (minDist !== -1) break;

          for (const [dx, dy] of DIRS) {
            const nx = cx + dx, ny = cy + dy;
            const key = `${nx},${ny}`;
            if (isFloor(nx, ny) && !visited.has(key)) {
              visited.set(key, d + 1);
              queue.push([nx, ny, d + 1]);
            }
          }
        }

        expect(minDist).toBeGreaterThanOrEqual(0);
        const walkingTimeSeconds = minDist / 2.6;
        expect(walkingTimeSeconds, `Walking time from table (${q.x},${q.y}) to sink (${wStation.x},${wStation.y}) is ${walkingTimeSeconds}s, must be < 10s`).toBeLessThan(10);
      }
    }
  });

  it('5. Hai map không giống nhau: tỉ lệ trạm chức năng có cùng ký tự cùng tọa độ < 0.5', () => {
    const minW = Math.min(tutorial.ascii[0]!.length, level1.ascii[0]!.length);
    const minH = Math.min(tutorial.ascii.length, level1.ascii.length);
    let matches = 0;
    let totalFunctional = 0;

    for (let y = 0; y < minH; y++) {
      for (let x = 0; x < minW; x++) {
        const a = tutorial.ascii[y]![x]!;
        const b = level1.ascii[y]![x]!;
        if ((a !== '.' && a !== '#') || (b !== '.' && b !== '#')) {
          totalFunctional++;
          if (a === b) {
            matches++;
          }
        }
      }
    }

    const overlapRatio = matches / Math.max(1, totalFunctional);
    expect(overlapRatio).toBeLessThan(0.5);
  });

  function interactStation(state: any, p: PlayerState, st: StationState | { x: number; y: number }) {
    p.x = st.x;
    p.y = st.y;
    p.fx = 0;
    p.fy = 0;
    return interact(state, p.id);
  }

  it('6. Bot hoàn thành 1 đơn SALAD trên tutorial', () => {
    const state = createGameState(tutorial, ['p1'], 12345);
    state.customers = [];
    state.orders = [];
    state.nextOrderIn = 99999;
    const p1 = state.players[0]!;

    const tomatoCrate = state.stations.find(s => s.type === 'crate' && s.crate === 'tomato')!;
    const lettuceCrate = state.stations.find(s => s.type === 'crate' && s.crate === 'lettuce')!;
    const cut = state.stations.find(s => s.type === 'cutting')!;
    const plateDispenser = state.stations.find(s => s.type === 'plate_dispenser')!;
    const table = state.stations.find(s => s.type === 'table')!;
    const counters = state.stations.filter(s => s.type === 'counter');
    const c1 = counters[0]!;
    const c2 = counters[1]!;

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
      id: 101,
      recipe: 'salad',
      timeLeft: 60,
      patience: 60,
      customerId: customer.id
    });

    // 1. Lettuce -> Cut -> Counter 1
    interactStation(state, p1, lettuceCrate);
    expect((p1.held as IngredientItem)?.id).toBe('lettuce');
    interactStation(state, p1, cut);
    updateAction(state, p1.id, { seq: 1, mx: 0, my: 0, interact: false, act: true, dash: false, throw: false }, CHOP_TIME);
    expect((p1.held as IngredientItem)?.state).toBe('chopped');
    interactStation(state, p1, c1);
    expect(c1.item).toBeDefined();

    // 2. Tomato -> Cut -> Counter 2
    interactStation(state, p1, tomatoCrate);
    expect((p1.held as IngredientItem)?.id).toBe('tomato');
    interactStation(state, p1, cut);
    updateAction(state, p1.id, { seq: 2, mx: 0, my: 0, interact: false, act: true, dash: false, throw: false }, CHOP_TIME);
    expect((p1.held as IngredientItem)?.state).toBe('chopped');
    interactStation(state, p1, c2);
    expect(c2.item).toBeDefined();

    // 3. Plate -> Add lettuce -> Add tomato
    interactStation(state, p1, plateDispenser);
    expect((p1.held as PlateItem)?.type).toBe('plate');
    interactStation(state, p1, c1); // add lettuce
    interactStation(state, p1, c2); // add tomato

    const saladPlate = p1.held as unknown as PlateItem;
    expect(saladPlate.type).toBe('plate');
    expect(saladPlate.contents.length).toBe(2);
    expect(matchRecipe(saladPlate)).toBe('salad');

    // 4. Serve to table Q
    const initialScore = state.score;
    const events = interactStation(state, p1, table);
    const serveEv = events.find(e => e.type === 'serve_ok') as any;
    expect(serveEv).toBeDefined();
    expect(serveEv?.recipe).toBe('salad');
    expect(serveEv?.baseScore).toBe(RECIPE_SCORE.salad);
    expect(state.score).toBe(initialScore + serveEv.baseScore + (serveEv.tip ?? 0));
    expect(customer.state).toBe('eating');
  });

  it('7. Bot hoàn thành 1 đơn BURGER trên level1', () => {
    const state = createGameState(level1, ['p1'], 12345);
    state.customers = [];
    state.orders = [];
    state.nextOrderIn = 99999;
    const p1 = state.players[0]!;

    const meatCrate = state.stations.find(s => s.type === 'crate' && s.crate === 'meat')!;
    const bunCrate = state.stations.find(s => s.type === 'crate' && s.crate === 'bun')!;
    const lettuceCrate = state.stations.find(s => s.type === 'crate' && s.crate === 'lettuce')!;
    const cut = state.stations.find(s => s.type === 'cutting')!;
    const stove = state.stations.find(s => s.type === 'stove')!;
    const plateDispenser = state.stations.find(s => s.type === 'plate_dispenser')!;
    const table = state.stations.find(s => s.type === 'table')!;
    const counters = state.stations.filter(s => s.type === 'counter');
    const c1 = counters[0]!;
    const c2 = counters[1]!;

    const customer: CustomerState = {
      id: state.nextCustomerId++,
      x: table.x,
      y: table.y,
      state: 'order_taken',
      recipe: 'burger',
      patience: 80,
      maxPatience: 80,
      timer: 0,
      colorIndex: 0
    };
    state.customers.push(customer);
    table.customerId = customer.id;
    state.orders.push({
      id: 201,
      recipe: 'burger',
      timeLeft: 80,
      patience: 80,
      customerId: customer.id
    });

    // 1. Meat -> Stove
    interactStation(state, p1, meatCrate);
    expect((p1.held as IngredientItem)?.id).toBe('meat');
    interactStation(state, p1, stove);
    expect(p1.held).toBeNull();
    tickStations(state, COOK_TIME);

    // 2. Lettuce -> Cut -> Counter 1
    interactStation(state, p1, lettuceCrate);
    interactStation(state, p1, cut);
    updateAction(state, p1.id, { seq: 1, mx: 0, my: 0, interact: false, act: true, dash: false, throw: false }, CHOP_TIME);
    expect((p1.held as IngredientItem)?.state).toBe('chopped');
    interactStation(state, p1, c1);

    // 3. Bun -> Counter 2
    interactStation(state, p1, bunCrate);
    interactStation(state, p1, c2);

    // 4. Plate -> Bun -> Lettuce -> Cooked Meat
    interactStation(state, p1, plateDispenser);
    interactStation(state, p1, c2); // add bun
    interactStation(state, p1, c1); // add lettuce
    interactStation(state, p1, stove); // add cooked meat

    const burgerPlate = p1.held as unknown as PlateItem;
    expect(burgerPlate.type).toBe('plate');
    expect(burgerPlate.contents.length).toBe(3);
    expect(matchRecipe(burgerPlate)).toBe('burger');

    // 5. Serve to table Q
    const initialScore = state.score;
    const events = interactStation(state, p1, table);
    const serveEv = events.find(e => e.type === 'serve_ok') as any;
    expect(serveEv).toBeDefined();
    expect(serveEv?.recipe).toBe('burger');
    expect(serveEv?.baseScore).toBe(RECIPE_SCORE.burger);
    expect(state.score).toBe(initialScore + serveEv.baseScore + (serveEv.tip ?? 0));
    expect(customer.state).toBe('eating');
  });

  it('8. Bếp Nhỏ: làm burger và salad, giao 2 bàn khác nhau', () => {
    const state = createGameState(level1, ['p1'], 99999);
    state.customers = [];
    state.orders = [];
    state.nextOrderIn = 99999;
    const p1 = state.players[0]!;

    const tomatoCrate = state.stations.find(s => s.type === 'crate' && s.crate === 'tomato')!;
    const lettuceCrate = state.stations.find(s => s.type === 'crate' && s.crate === 'lettuce')!;
    const bunCrate = state.stations.find(s => s.type === 'crate' && s.crate === 'bun')!;
    const meatCrate = state.stations.find(s => s.type === 'crate' && s.crate === 'meat')!;
    const cut = state.stations.find(s => s.type === 'cutting')!;
    const stove = state.stations.find(s => s.type === 'stove')!;
    const plateDispenser = state.stations.find(s => s.type === 'plate_dispenser')!;
    const tables = state.stations.filter(s => s.type === 'table');
    const tableA = tables[0]!;
    const tableB = tables[1]!;
    expect(tableA).not.toBe(tableB);

    const counters = state.stations.filter(s => s.type === 'counter');
    const c1 = counters[0]!;
    const c2 = counters[1]!;

    // Table A calls Salad, Table B calls Burger
    const custA: CustomerState = {
      id: state.nextCustomerId++,
      x: tableA.x,
      y: tableA.y,
      state: 'order_taken',
      recipe: 'salad',
      patience: 60,
      maxPatience: 60,
      timer: 0,
      colorIndex: 0
    };
    state.customers.push(custA);
    tableA.customerId = custA.id;
    state.orders.push({ id: 301, recipe: 'salad', timeLeft: 60, patience: 60, customerId: custA.id });

    const custB: CustomerState = {
      id: state.nextCustomerId++,
      x: tableB.x,
      y: tableB.y,
      state: 'order_taken',
      recipe: 'burger',
      patience: 80,
      maxPatience: 80,
      timer: 0,
      colorIndex: 1
    };
    state.customers.push(custB);
    tableB.customerId = custB.id;
    state.orders.push({ id: 302, recipe: 'burger', timeLeft: 80, patience: 80, customerId: custB.id });

    // Make and serve Salad to Table A
    interactStation(state, p1, lettuceCrate);
    interactStation(state, p1, cut);
    updateAction(state, p1.id, { seq: 1, mx: 0, my: 0, interact: false, act: true, dash: false, throw: false }, CHOP_TIME);
    interactStation(state, p1, cut);
    interactStation(state, p1, c1);

    interactStation(state, p1, tomatoCrate);
    interactStation(state, p1, cut);
    updateAction(state, p1.id, { seq: 2, mx: 0, my: 0, interact: false, act: true, dash: false, throw: false }, CHOP_TIME);
    interactStation(state, p1, cut);
    interactStation(state, p1, c2);

    interactStation(state, p1, plateDispenser);
    interactStation(state, p1, c1);
    interactStation(state, p1, c2);

    const evA = interactStation(state, p1, tableA);
    expect(evA.find(e => e.type === 'serve_ok')).toBeDefined();
    expect(custA.state).toBe('eating');

    // Make and serve Burger to Table B
    interactStation(state, p1, meatCrate);
    interactStation(state, p1, stove);
    tickStations(state, COOK_TIME);

    interactStation(state, p1, lettuceCrate);
    interactStation(state, p1, cut);
    updateAction(state, p1.id, { seq: 3, mx: 0, my: 0, interact: false, act: true, dash: false, throw: false }, CHOP_TIME);
    interactStation(state, p1, cut);
    interactStation(state, p1, c1);

    interactStation(state, p1, bunCrate);
    interactStation(state, p1, c2);

    interactStation(state, p1, plateDispenser);
    interactStation(state, p1, c2);
    interactStation(state, p1, c1);
    interactStation(state, p1, stove);

    const evB = interactStation(state, p1, tableB);
    expect(evB.find(e => e.type === 'serve_ok')).toBeDefined();
    expect(custB.state).toBe('eating');
  });

  it('9. Bếp Đôi: validateLevel không lỗi và không có ô floor unreachable', () => {
    const val = validateLevel(bep_doi);
    expect(val.errors, `Level bep_doi has validation errors: ${val.errors.join(', ')}`).toEqual([]);

    const parsed = parseLevel(bep_doi);
    const width = parsed.width;
    const height = parsed.height;
    expect(width).toBe(16);
    expect(height).toBe(10);

    const isFloor = (x: number, y: number) => {
      if (x < 0 || x >= width || y < 0 || y >= height) return false;
      const ch = bep_doi.ascii[y]![x]!;
      return ch === '.' || ['1', '2', '3', '4'].includes(ch);
    };

    let totalFloor = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (isFloor(x, y)) totalFloor++;
      }
    }

    // BFS from spawn 1
    const s1 = parsed.spawns[0]!;
    const sx = Math.floor(s1.x);
    const sy = Math.floor(s1.y);
    const visited = new Set<string>();
    const queue: [number, number][] = [[sx, sy]];
    visited.add(`${sx},${sy}`);

    while (queue.length > 0) {
      const [cx, cy] = queue.shift()!;
      for (const [dx, dy] of DIRS) {
        const nx = cx + dx;
        const ny = cy + dy;
        const key = `${nx},${ny}`;
        if (isFloor(nx, ny) && !visited.has(key)) {
          visited.add(key);
          queue.push([nx, ny]);
        }
      }
    }

    expect(visited.size, `Level bep_doi has unreachable floor tiles!`).toBe(totalFloor);
  });

  it('10. Bếp Đôi: Đếm trạm đúng đặc tả (T, L, B, M, C×2, S, s, P, W, D, Q×3, spawns 2, không O, R, _)', () => {
    const counts: Record<string, number> = {};
    for (const row of bep_doi.ascii) {
      for (const ch of row) {
        counts[ch] = (counts[ch] || 0) + 1;
      }
    }

    expect(counts['T'] || 0).toBe(1);
    expect(counts['L'] || 0).toBe(1);
    expect(counts['B'] || 0).toBe(1);
    expect(counts['M'] || 0).toBe(1);
    expect(counts['C'] || 0).toBe(2);
    expect(counts['S'] || 0).toBe(1);
    expect(counts['s'] || 0).toBe(1);
    expect(counts['P'] || 0).toBe(1);
    expect(counts['W'] || 0).toBe(1);
    expect(counts['D'] || 0).toBe(1);
    expect(counts['Q'] || 0).toBe(3);
    expect(counts['1'] || 0).toBe(1);
    expect(counts['2'] || 0).toBe(1);

    // Forbidden characters
    expect(counts['O'] || 0).toBe(0);
    expect(counts['R'] || 0).toBe(0);
    expect(counts['_'] || 0).toBe(0);
  });

  it('11. Bếp Đôi: Bot đi được từ mỗi spawn tới mọi trạm và mọi Q (đi qua khe chuyền không kẹt)', () => {
    const parsed = parseLevel(bep_doi);
    const width = parsed.width;
    const height = parsed.height;
    const isFloor = (x: number, y: number) => {
      if (x < 0 || x >= width || y < 0 || y >= height) return false;
      const ch = bep_doi.ascii[y]![x]!;
      return ch === '.' || ['1', '2', '3', '4'].includes(ch);
    };

    expect(parsed.spawns.length).toBe(2);

    for (let sIdx = 0; sIdx < parsed.spawns.length; sIdx++) {
      const spawn = parsed.spawns[sIdx]!;
      const sx = Math.floor(spawn.x);
      const sy = Math.floor(spawn.y);
      const visited = new Set<string>();
      const queue: [number, number][] = [[sx, sy]];
      visited.add(`${sx},${sy}`);

      while (queue.length > 0) {
        const [cx, cy] = queue.shift()!;
        for (const [dx, dy] of DIRS) {
          const nx = cx + dx;
          const ny = cy + dy;
          const key = `${nx},${ny}`;
          if (isFloor(nx, ny) && !visited.has(key)) {
            visited.add(key);
            queue.push([nx, ny]);
          }
        }
      }

      // Verify every station (including Q) has at least 1 adjacent visited floor tile
      for (const st of parsed.stations) {
        let canReach = false;
        for (const [dx, dy] of DIRS) {
          if (visited.has(`${st.x + dx},${st.y + dy}`)) {
            canReach = true;
            break;
          }
        }
        expect(canReach, `Level bep_doi spawn ${sIdx + 1} cannot reach station ${st.type} at (${st.x}, ${st.y})`).toBe(true);
      }
    }
  });

  it('12. Bếp Đôi: Từ mỗi Q đi được tới W trong vòng 4 ô đi bộ', () => {
    const parsed = parseLevel(bep_doi);
    const width = parsed.width;
    const height = parsed.height;
    const isFloor = (x: number, y: number) => {
      if (x < 0 || x >= width || y < 0 || y >= height) return false;
      const ch = bep_doi.ascii[y]![x]!;
      return ch === '.' || ['1', '2', '3', '4'].includes(ch);
    };

    const wStation = parsed.stations.find(s => s.type === 'sink')!;
    expect(wStation).toBeDefined();

    const qStations = parsed.stations.filter(s => s.type === 'table');
    expect(qStations.length).toBe(3);

    for (const q of qStations) {
      const visited = new Map<string, number>();
      const queue: [number, number, number][] = [];
      for (const [dx, dy] of DIRS) {
        const fx = q.x + dx, fy = q.y + dy;
        if (isFloor(fx, fy)) {
          visited.set(`${fx},${fy}`, 0);
          queue.push([fx, fy, 0]);
        }
      }

      let minDist = -1;
      while (queue.length > 0) {
        const [cx, cy, d] = queue.shift()!;
        for (const [dx, dy] of DIRS) {
          if (cx + dx === wStation.x && cy + dy === wStation.y) {
            minDist = d;
            break;
          }
        }
        if (minDist !== -1) break;

        for (const [dx, dy] of DIRS) {
          const nx = cx + dx, ny = cy + dy;
          const key = `${nx},${ny}`;
          if (isFloor(nx, ny) && !visited.has(key)) {
            visited.set(key, d + 1);
            queue.push([nx, ny, d + 1]);
          }
        }
      }

      expect(minDist).toBeGreaterThanOrEqual(0);
      expect(minDist, `Table Q at (${q.x}, ${q.y}) distance to W is ${minDist} steps, must be <= 4`).toBeLessThanOrEqual(4);
    }
  });

  it('13. Bếp Đôi khác Bếp Nhỏ: tỉ lệ trạm chức năng cùng ký tự cùng tọa độ < 0.5', () => {
    const minW = Math.min(bep_doi.ascii[0]!.length, level1.ascii[0]!.length);
    const minH = Math.min(bep_doi.ascii.length, level1.ascii.length);
    let matches = 0;
    let totalFunctional = 0;

    for (let y = 0; y < minH; y++) {
      for (let x = 0; x < minW; x++) {
        const a = bep_doi.ascii[y]![x]!;
        const b = level1.ascii[y]![x]!;
        if ((a !== '.' && a !== '#') || (b !== '.' && b !== '#')) {
          totalFunctional++;
          if (a === b) {
            matches++;
          }
        }
      }
    }

    const overlapRatio = matches / Math.max(1, totalFunctional);
    expect(overlapRatio, `Overlap ratio ${overlapRatio.toFixed(4)} (${matches}/${totalFunctional}) must be < 0.5`).toBeLessThan(0.5);
  });

  it('14. Bot hoàn thành 1 đơn TOMATO SOUP trên bep_doi (nấu 3 cà chua trong s, múc ra đĩa, giao Q)', () => {
    const state = createGameState(bep_doi, ['p1'], 12345);
    state.customers = [];
    state.orders = [];
    state.nextOrderIn = 99999;
    const p1 = state.players[0]!;

    const tomatoCrate = state.stations.find(s => s.type === 'crate' && s.crate === 'tomato')!;
    const cutStations = state.stations.filter(s => s.type === 'cutting');
    const cut = cutStations[0]!;
    const potStation = state.stations.find(s => s.type === 'stove' && (s.item as any)?.tool === 'pot')!;
    const plateDispenser = state.stations.find(s => s.type === 'plate_dispenser')!;
    const tables = state.stations.filter(s => s.type === 'table');
    const table = tables[0]!;

    const customer: CustomerState = {
      id: state.nextCustomerId++,
      x: table.x,
      y: table.y,
      state: 'order_taken',
      recipe: 'tomato_soup',
      patience: 90,
      maxPatience: 90,
      timer: 0,
      colorIndex: 0
    };
    state.customers.push(customer);
    table.customerId = customer.id;
    state.orders.push({
      id: 401,
      recipe: 'tomato_soup',
      timeLeft: 90,
      patience: 90,
      customerId: customer.id
    });

    const pot = potStation.item as any;
    expect(pot.contents.length).toBe(0);

    // Chuẩn bị 3 cà chua thái và cho vào nồi s
    for (let i = 0; i < 3; i++) {
      // 1. Cà chua từ thùng T
      interactStation(state, p1, tomatoCrate);
      expect((p1.held as IngredientItem)?.id).toBe('tomato');

      // 2. Thái trên thớt C (thái xong tự cầm trên tay)
      interactStation(state, p1, cut);
      updateAction(state, p1.id, { seq: i + 1, mx: 0, my: 0, interact: false, act: true, dash: false, throw: false }, CHOP_TIME);
      expect((p1.held as IngredientItem)?.state).toBe('chopped');

      // 3. Thả vào nồi s
      interactStation(state, p1, potStation);
      expect(p1.held).toBeNull();
      expect(pot.contents.length).toBe(i + 1);
    }

    expect(pot.contents.length).toBe(3);

    // 4. Chờ nồi nấu chín POT_COOK_TIME
    const dt = 0.5;
    const ticks = Math.ceil(POT_COOK_TIME / dt);
    for (let t = 0; t < ticks; t++) {
      tickStations(state, dt);
    }
    expect(pot.progress).toBeGreaterThanOrEqual(POT_COOK_TIME);

    // 5. Lấy đĩa sạch từ P
    interactStation(state, p1, plateDispenser);
    expect((p1.held as PlateItem)?.type).toBe('plate');

    // 6. Múc súp từ nồi s vào đĩa
    interactStation(state, p1, potStation);
    const soupPlate = p1.held as unknown as PlateItem;
    expect(soupPlate.type).toBe('plate');
    expect(soupPlate.contents[0]?.id).toBe('soup_tomato');
    expect(soupPlate.contents[0]?.state).toBe('cooked');
    expect(matchRecipe(soupPlate)).toBe('tomato_soup');

    // 7. Giao đến bàn khách Q
    const initialScore = state.score;
    const events = interactStation(state, p1, table);
    const serveEv = events.find(e => e.type === 'serve_ok') as any;
    expect(serveEv).toBeDefined();
    expect(serveEv?.recipe).toBe('tomato_soup');
    expect(serveEv?.baseScore).toBe(RECIPE_SCORE.tomato_soup);
    expect(state.score).toBe(initialScore + serveEv.baseScore + (serveEv.tip ?? 0));
    expect(customer.state).toBe('eating');
  });

  describe('M3: nha_hang_mo (Nhà Hàng Mở) Redesign', () => {
    it('15. nha_hang_mo: validateLevel không lỗi và không có ô floor unreachable', () => {
      const val = validateLevel(nha_hang_mo);
      expect(val.errors, `Level nha_hang_mo has validation errors: ${val.errors.join(', ')}`).toEqual([]);

      const parsed = parseLevel(nha_hang_mo);
      expect(parsed.width).toBe(18);
      expect(parsed.height).toBe(10);

      const isFloor = (x: number, y: number) => {
        if (x < 0 || x >= parsed.width || y < 0 || y >= parsed.height) return false;
        const ch = nha_hang_mo.ascii[y]![x]!;
        return ch === '.' || ['1', '2', '3', '4'].includes(ch);
      };

      let totalFloor = 0;
      for (let y = 0; y < parsed.height; y++) {
        for (let x = 0; x < parsed.width; x++) {
          if (isFloor(x, y)) totalFloor++;
        }
      }

      const s1 = parsed.spawns[0]!;
      const sx = Math.floor(s1.x);
      const sy = Math.floor(s1.y);
      const visited = new Set<string>();
      const queue: [number, number][] = [[sx, sy]];
      visited.add(`${sx},${sy}`);

      while (queue.length > 0) {
        const [cx, cy] = queue.shift()!;
        for (const [dx, dy] of DIRS) {
          const nx = cx + dx;
          const ny = cy + dy;
          const key = `${nx},${ny}`;
          if (isFloor(nx, ny) && !visited.has(key)) {
            visited.add(key);
            queue.push([nx, ny]);
          }
        }
      }

      expect(visited.size, `Level nha_hang_mo has unreachable floor tiles!`).toBe(totalFloor);
    });

    it('16. nha_hang_mo: Đếm trạm đúng đặc tả (T, L, B, M, C×2, S, s, P, W, D, Q×6, spawn 1 và 2, không O, R, _)', () => {
      const counts: Record<string, number> = {};
      for (const row of nha_hang_mo.ascii) {
        for (const ch of row) {
          counts[ch] = (counts[ch] || 0) + 1;
        }
      }

      expect(counts['T'] || 0).toBe(1);
      expect(counts['L'] || 0).toBe(1);
      expect(counts['B'] || 0).toBe(1);
      expect(counts['M'] || 0).toBe(1);
      expect(counts['C'] || 0).toBe(2);
      expect(counts['S'] || 0).toBe(1);
      expect(counts['s'] || 0).toBe(1);
      expect(counts['P'] || 0).toBe(1);
      expect(counts['W'] || 0).toBe(1);
      expect(counts['D'] || 0).toBe(1);
      expect(counts['Q'] || 0).toBe(6);
      expect(counts['1'] || 0).toBe(1);
      expect(counts['2'] || 0).toBe(1);

      // Cấm O, R, _
      expect(counts['O'] || 0).toBe(0);
      expect(counts['R'] || 0).toBe(0);
      expect(counts['_'] || 0).toBe(0);
    });

    it('17. nha_hang_mo: Bot đi được từ mọi spawn tới mọi trạm và mọi Q', () => {
      const parsed = parseLevel(nha_hang_mo);
      const isFloor = (x: number, y: number) => {
        if (x < 0 || x >= parsed.width || y < 0 || y >= parsed.height) return false;
        const ch = nha_hang_mo.ascii[y]![x]!;
        return ch === '.' || ['1', '2', '3', '4'].includes(ch);
      };

      expect(parsed.spawns.length).toBe(2);

      for (let sIdx = 0; sIdx < parsed.spawns.length; sIdx++) {
        const spawn = parsed.spawns[sIdx]!;
        const sx = Math.floor(spawn.x);
        const sy = Math.floor(spawn.y);
        const visited = new Set<string>();
        const queue: [number, number][] = [[sx, sy]];
        visited.add(`${sx},${sy}`);

        while (queue.length > 0) {
          const [cx, cy] = queue.shift()!;
          for (const [dx, dy] of DIRS) {
            const nx = cx + dx;
            const ny = cy + dy;
            const key = `${nx},${ny}`;
            if (isFloor(nx, ny) && !visited.has(key)) {
              visited.add(key);
              queue.push([nx, ny]);
            }
          }
        }

        for (const st of parsed.stations) {
          let canReach = false;
          for (const [dx, dy] of DIRS) {
            if (visited.has(`${st.x + dx},${st.y + dy}`)) {
              canReach = true;
              break;
            }
          }
          expect(canReach, `Level nha_hang_mo spawn ${sIdx + 1} cannot reach station ${st.type} at (${st.x}, ${st.y})`).toBe(true);
        }
      }
    });

    it('18. nha_hang_mo: Mọi Q đi bộ tới W trong tối đa 8 ô (BFS)', () => {
      const parsed = parseLevel(nha_hang_mo);
      const isFloor = (x: number, y: number) => {
        if (x < 0 || x >= parsed.width || y < 0 || y >= parsed.height) return false;
        const ch = nha_hang_mo.ascii[y]![x]!;
        return ch === '.' || ['1', '2', '3', '4'].includes(ch);
      };

      const wStation = parsed.stations.find(s => s.type === 'sink')!;
      expect(wStation).toBeDefined();

      const qStations = parsed.stations.filter(s => s.type === 'table');
      expect(qStations.length).toBe(6);

      for (const q of qStations) {
        const visited = new Map<string, number>();
        const queue: [number, number, number][] = [];
        for (const [dx, dy] of DIRS) {
          const fx = q.x + dx, fy = q.y + dy;
          if (isFloor(fx, fy)) {
            visited.set(`${fx},${fy}`, 0);
            queue.push([fx, fy, 0]);
          }
        }

        let minDist = -1;
        while (queue.length > 0) {
          const [cx, cy, d] = queue.shift()!;
          for (const [dx, dy] of DIRS) {
            if (cx + dx === wStation.x && cy + dy === wStation.y) {
              minDist = d;
              break;
            }
          }
          if (minDist !== -1) break;

          for (const [dx, dy] of DIRS) {
            const nx = cx + dx, ny = cy + dy;
            const key = `${nx},${ny}`;
            if (isFloor(nx, ny) && !visited.has(key)) {
              visited.set(key, d + 1);
              queue.push([nx, ny, d + 1]);
            }
          }
        }

        expect(minDist).toBeGreaterThanOrEqual(0);
        expect(minDist, `Table Q at (${q.x}, ${q.y}) distance to W is ${minDist} steps, must be <= 8`).toBeLessThanOrEqual(8);
      }
    });

    it('19. nha_hang_mo khác mọi map đã xanh: kích thước độc nhất hoặc độ tương đồng < 0.5', () => {
      const greenMaps = [tutorial, level1, bep_doi];
      const nW = nha_hang_mo.ascii[0]!.length;
      const nH = nha_hang_mo.ascii.length;

      for (const other of greenMaps) {
        const oW = other.ascii[0]!.length;
        const oH = other.ascii.length;
        if (nW === oW && nH === oH) {
          let matches = 0;
          for (let y = 0; y < nH; y++) {
            for (let x = 0; x < nW; x++) {
              if (nha_hang_mo.ascii[y]![x] === other.ascii[y]![x]) matches++;
            }
          }
          const similarity = matches / (nW * nH);
          expect(similarity).toBeLessThan(0.5);
        } else {
          // Khác kích thước
          expect(nW === oW && nH === oH).toBe(false);
        }
      }
    });

    it('20. nha_hang_mo: Bot hoàn thành 1 đơn TOMATO SOUP (nấu 3 cà chua trong nồi s, múc ra đĩa, giao Q)', () => {
      const state = createGameState(nha_hang_mo, ['p1'], 12345);
      state.customers = [];
      state.orders = [];
      state.nextOrderIn = 99999;
      const p1 = state.players[0]!;

      const tomatoCrate = state.stations.find(s => s.type === 'crate' && s.crate === 'tomato')!;
      const cutStations = state.stations.filter(s => s.type === 'cutting');
      const cut = cutStations[0]!;
      const potStation = state.stations.find(s => s.type === 'stove' && (s.item as any)?.tool === 'pot')!;
      const plateDispenser = state.stations.find(s => s.type === 'plate_dispenser')!;
      const tables = state.stations.filter(s => s.type === 'table');
      const table = tables[0]!;

      const customer: CustomerState = {
        id: state.nextCustomerId++,
        x: table.x,
        y: table.y,
        state: 'order_taken',
        recipe: 'tomato_soup',
        patience: 90,
        maxPatience: 90,
        timer: 0,
        colorIndex: 0
      };
      state.customers.push(customer);
      table.customerId = customer.id;
      state.orders.push({
        id: 501,
        recipe: 'tomato_soup',
        timeLeft: 90,
        patience: 90,
        customerId: customer.id
      });

      const pot = potStation.item as any;
      expect(pot.contents.length).toBe(0);

      // Chuẩn bị 3 cà chua thái và cho vào nồi s
      for (let i = 0; i < 3; i++) {
        interactStation(state, p1, tomatoCrate);
        expect((p1.held as IngredientItem)?.id).toBe('tomato');

        interactStation(state, p1, cut);
        updateAction(state, p1.id, { seq: i + 1, mx: 0, my: 0, interact: false, act: true, dash: false, throw: false }, CHOP_TIME);
        expect((p1.held as IngredientItem)?.state).toBe('chopped');

        interactStation(state, p1, potStation);
        expect(p1.held).toBeNull();
        expect(pot.contents.length).toBe(i + 1);
      }

      expect(pot.contents.length).toBe(3);

      // Chờ nồi nấu chín
      const dt = 0.5;
      const ticks = Math.ceil(POT_COOK_TIME / dt);
      for (let t = 0; t < ticks; t++) {
        tickStations(state, dt);
      }
      expect(pot.progress).toBeGreaterThanOrEqual(POT_COOK_TIME);

      // Lấy đĩa từ P
      interactStation(state, p1, plateDispenser);
      expect((p1.held as PlateItem)?.type).toBe('plate');

      // Múc súp từ nồi s
      interactStation(state, p1, potStation);
      const soupPlate = p1.held as unknown as PlateItem;
      expect(soupPlate.type).toBe('plate');
      expect(soupPlate.contents[0]?.id).toBe('soup_tomato');
      expect(soupPlate.contents[0]?.state).toBe('cooked');
      expect(matchRecipe(soupPlate)).toBe('tomato_soup');

      // Giao đến bàn khách Q
      const initialScore = state.score;
      const events = interactStation(state, p1, table);
      const serveEv = events.find(e => e.type === 'serve_ok') as any;
      expect(serveEv).toBeDefined();
      expect(serveEv?.recipe).toBe('tomato_soup');
      expect(serveEv?.baseScore).toBe(RECIPE_SCORE.tomato_soup);
      expect(state.score).toBe(initialScore + serveEv.baseScore + (serveEv.tip ?? 0));
      expect(customer.state).toBe('eating');
    });
  });

  describe('M4: bep_lo_nuong (Bếp Lò Nướng) Redesign', () => {
    it('21. bep_lo_nuong: validateLevel không lỗi và không có ô floor unreachable', () => {
      const val = validateLevel(bep_lo_nuong);
      expect(val.errors, `Level bep_lo_nuong has validation errors: ${val.errors.join(', ')}`).toEqual([]);

      const parsed = parseLevel(bep_lo_nuong);
      expect(parsed.width).toBe(18);
      expect(parsed.height).toBe(9);

      const isFloor = (x: number, y: number) => {
        if (x < 0 || x >= parsed.width || y < 0 || y >= parsed.height) return false;
        const ch = bep_lo_nuong.ascii[y]![x]!;
        return ch === '.' || ['1', '2', '3', '4'].includes(ch);
      };

      let totalFloor = 0;
      for (let y = 0; y < parsed.height; y++) {
        for (let x = 0; x < parsed.width; x++) {
          if (isFloor(x, y)) totalFloor++;
        }
      }

      const s1 = parsed.spawns[0]!;
      const sx = Math.floor(s1.x);
      const sy = Math.floor(s1.y);
      const visited = new Set<string>();
      const queue: [number, number][] = [[sx, sy]];
      visited.add(`${sx},${sy}`);

      while (queue.length > 0) {
        const [cx, cy] = queue.shift()!;
        for (const [dx, dy] of DIRS) {
          const nx = cx + dx;
          const ny = cy + dy;
          const key = `${nx},${ny}`;
          if (isFloor(nx, ny) && !visited.has(key)) {
            visited.add(key);
            queue.push([nx, ny]);
          }
        }
      }

      expect(visited.size, `Level bep_lo_nuong has unreachable floor tiles!`).toBe(totalFloor);
    });

    it('22. bep_lo_nuong: Đếm trạm đúng đặc tả (K, Z, T, L, B, M, C×2, S, s, U×2, P, W, D, Q×2, spawn 1 và 2, không O, R, _)', () => {
      const counts: Record<string, number> = {};
      for (const row of bep_lo_nuong.ascii) {
        for (const ch of row) {
          counts[ch] = (counts[ch] || 0) + 1;
        }
      }

      expect(counts['K'] || 0).toBe(1);
      expect(counts['Z'] || 0).toBe(1);
      expect(counts['T'] || 0).toBe(1);
      expect(counts['L'] || 0).toBe(1);
      expect(counts['B'] || 0).toBe(1);
      expect(counts['M'] || 0).toBe(1);
      expect(counts['C'] || 0).toBe(2);
      expect(counts['S'] || 0).toBe(1);
      expect(counts['s'] || 0).toBe(1);
      expect(counts['U'] || 0).toBe(2);
      expect(counts['P'] || 0).toBe(1);
      expect(counts['W'] || 0).toBe(1);
      expect(counts['D'] || 0).toBe(1);
      expect(counts['Q'] || 0).toBe(2);
      expect(counts['1'] || 0).toBe(1);
      expect(counts['2'] || 0).toBe(1);

      // Cấm O, R, _
      expect(counts['O'] || 0).toBe(0);
      expect(counts['R'] || 0).toBe(0);
      expect(counts['_'] || 0).toBe(0);
    });

    it('23. bep_lo_nuong: Bot đi được từ mọi spawn tới mọi trạm và mọi Q; mỗi lò U có ô sàn kề cạnh', () => {
      const parsed = parseLevel(bep_lo_nuong);
      const isFloor = (x: number, y: number) => {
        if (x < 0 || x >= parsed.width || y < 0 || y >= parsed.height) return false;
        const ch = bep_lo_nuong.ascii[y]![x]!;
        return ch === '.' || ['1', '2', '3', '4'].includes(ch);
      };

      expect(parsed.spawns.length).toBe(2);

      // Kiểm tra mỗi lò U có ít nhất một ô sàn kề cạnh
      const ovens = parsed.stations.filter(s => s.type === 'oven');
      expect(ovens.length).toBe(2);
      for (const ov of ovens) {
        let hasAdjacentFloor = false;
        for (const [dx, dy] of DIRS) {
          if (isFloor(ov.x + dx, ov.y + dy)) {
            hasAdjacentFloor = true;
            break;
          }
        }
        expect(hasAdjacentFloor, `Lò nướng U tại (${ov.x}, ${ov.y}) phải có ô sàn kề cạnh để đứng`).toBe(true);
      }

      for (let sIdx = 0; sIdx < parsed.spawns.length; sIdx++) {
        const spawn = parsed.spawns[sIdx]!;
        const sx = Math.floor(spawn.x);
        const sy = Math.floor(spawn.y);
        const visited = new Set<string>();
        const queue: [number, number][] = [[sx, sy]];
        visited.add(`${sx},${sy}`);

        while (queue.length > 0) {
          const [cx, cy] = queue.shift()!;
          for (const [dx, dy] of DIRS) {
            const nx = cx + dx;
            const ny = cy + dy;
            const key = `${nx},${ny}`;
            if (isFloor(nx, ny) && !visited.has(key)) {
              visited.add(key);
              queue.push([nx, ny]);
            }
          }
        }

        for (const st of parsed.stations) {
          let canReach = false;
          for (const [dx, dy] of DIRS) {
            if (visited.has(`${st.x + dx},${st.y + dy}`)) {
              canReach = true;
              break;
            }
          }
          expect(canReach, `Level bep_lo_nuong spawn ${sIdx + 1} cannot reach station ${st.type} at (${st.x}, ${st.y})`).toBe(true);
        }
      }
    });

    it('24. bep_lo_nuong: Mọi Q đi bộ tới W trong tối đa 8 ô (BFS)', () => {
      const parsed = parseLevel(bep_lo_nuong);
      const isFloor = (x: number, y: number) => {
        if (x < 0 || x >= parsed.width || y < 0 || y >= parsed.height) return false;
        const ch = bep_lo_nuong.ascii[y]![x]!;
        return ch === '.' || ['1', '2', '3', '4'].includes(ch);
      };

      const wStation = parsed.stations.find(s => s.type === 'sink')!;
      expect(wStation).toBeDefined();

      const qStations = parsed.stations.filter(s => s.type === 'table');
      expect(qStations.length).toBe(2);

      for (const q of qStations) {
        const visited = new Map<string, number>();
        const queue: [number, number, number][] = [];
        for (const [dx, dy] of DIRS) {
          const fx = q.x + dx, fy = q.y + dy;
          if (isFloor(fx, fy)) {
            visited.set(`${fx},${fy}`, 0);
            queue.push([fx, fy, 0]);
          }
        }

        let minDist = -1;
        while (queue.length > 0) {
          const [cx, cy, d] = queue.shift()!;
          for (const [dx, dy] of DIRS) {
            if (cx + dx === wStation.x && cy + dy === wStation.y) {
              minDist = d;
              break;
            }
          }
          if (minDist !== -1) break;

          for (const [dx, dy] of DIRS) {
            const nx = cx + dx, ny = cy + dy;
            const key = `${nx},${ny}`;
            if (isFloor(nx, ny) && !visited.has(key)) {
              visited.set(key, d + 1);
              queue.push([nx, ny, d + 1]);
            }
          }
        }

        expect(minDist).toBeGreaterThanOrEqual(0);
        expect(minDist, `Table Q at (${q.x}, ${q.y}) distance to W is ${minDist} steps, must be <= 8`).toBeLessThanOrEqual(8);
      }
    });

    it('25. bep_lo_nuong khác mọi map đã xanh: kích thước độc nhất hoặc độ tương đồng < 0.5', () => {
      const greenMaps = [tutorial, level1, bep_doi, nha_hang_mo];
      const nW = bep_lo_nuong.ascii[0]!.length;
      const nH = bep_lo_nuong.ascii.length;

      for (const other of greenMaps) {
        const oW = other.ascii[0]!.length;
        const oH = other.ascii.length;
        if (nW === oW && nH === oH) {
          let matches = 0;
          for (let y = 0; y < nH; y++) {
            for (let x = 0; x < nW; x++) {
              if (bep_lo_nuong.ascii[y]![x] === other.ascii[y]![x]) matches++;
            }
          }
          const similarity = matches / (nW * nH);
          expect(similarity).toBeLessThan(0.5);
        } else {
          expect(nW === oW && nH === oH).toBe(false);
        }
      }
    });

    it('26. bep_lo_nuong: Bot hoàn thành 1 đơn PIZZA (nướng pizza sống trong lò U, múc ra đĩa, giao Q)', () => {
      const state = createGameState(bep_lo_nuong, ['p1'], 12345);
      state.customers = [];
      state.orders = [];
      state.nextOrderIn = 99999;
      const p1 = state.players[0]!;

      const ovenStation = state.stations.find(s => s.type === 'oven')!;
      const plateDispenser = state.stations.find(s => s.type === 'plate_dispenser')!;
      const tables = state.stations.filter(s => s.type === 'table');
      const table = tables[0]!;

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
        id: 601,
        recipe: 'pizza',
        timeLeft: 90,
        patience: 90,
        customerId: customer.id
      });

      // 1. Đặt bánh pizza sống vào lò U
      p1.held = { type: 'ingredient', id: 'pizza', state: 'raw' };
      interactStation(state, p1, ovenStation);
      expect(p1.held).toBeNull();
      expect(ovenStation.item).toEqual({ type: 'ingredient', id: 'pizza', state: 'raw' });

      // 2. Chờ nướng chín trong OVEN_COOK_TIME
      const dt = 0.5;
      const ticks = Math.ceil(OVEN_COOK_TIME / dt);
      for (let t = 0; t < ticks; t++) {
        tickStations(state, dt);
      }
      expect((ovenStation.item as IngredientItem)?.state).toBe('cooked');

      // 3. Lấy đĩa từ P
      interactStation(state, p1, plateDispenser);
      expect((p1.held as unknown as PlateItem)?.type).toBe('plate');

      // 4. Múc pizza chín từ lò nướng vào đĩa
      interactStation(state, p1, ovenStation);
      const pizzaPlate = p1.held as unknown as PlateItem;
      expect(pizzaPlate.type).toBe('plate');
      expect(pizzaPlate.contents[0]?.id).toBe('pizza');
      expect(pizzaPlate.contents[0]?.state).toBe('cooked');
      expect(matchRecipe(pizzaPlate)).toBe('pizza');

      // 5. Giao đến bàn khách Q
      const initialScore = state.score;
      const events = interactStation(state, p1, table);
      const serveEv = events.find(e => e.type === 'serve_ok') as any;
      expect(serveEv).toBeDefined();
      expect(serveEv?.recipe).toBe('pizza');
      expect(serveEv?.baseScore).toBe(RECIPE_SCORE.pizza);
      expect(state.score).toBe(initialScore + serveEv.baseScore + (serveEv.tip ?? 0));
      expect(customer.state).toBe('eating');
    });
  });

  describe('M5: tau_hai_tac (Tàu Hải Tặc) Redesign', () => {
    it('27. tau_hai_tac: validateLevel không lỗi và không có ô floor/ice unreachable', () => {
      const val = validateLevel(tau_hai_tac);
      expect(val.errors, `Level tau_hai_tac has validation errors: ${val.errors.join(', ')}`).toEqual([]);

      const parsed = parseLevel(tau_hai_tac);
      expect(parsed.width).toBe(20);
      expect(parsed.height).toBe(9);

      const isWalkable = (x: number, y: number) => {
        if (x < 0 || x >= parsed.width || y < 0 || y >= parsed.height) return false;
        const ch = tau_hai_tac.ascii[y]![x]!;
        return ch === '.' || ch === '~' || ['1', '2', '3', '4'].includes(ch);
      };

      let totalWalkable = 0;
      for (let y = 0; y < parsed.height; y++) {
        for (let x = 0; x < parsed.width; x++) {
          if (isWalkable(x, y)) totalWalkable++;
        }
      }

      const s1 = parsed.spawns[0]!;
      const sx = Math.floor(s1.x);
      const sy = Math.floor(s1.y);
      const visited = new Set<string>();
      const queue: [number, number][] = [[sx, sy]];
      visited.add(`${sx},${sy}`);

      while (queue.length > 0) {
        const [cx, cy] = queue.shift()!;
        for (const [dx, dy] of DIRS) {
          const nx = cx + dx;
          const ny = cy + dy;
          const key = `${nx},${ny}`;
          if (isWalkable(nx, ny) && !visited.has(key)) {
            visited.add(key);
            queue.push([nx, ny]);
          }
        }
      }

      expect(visited.size, `Level tau_hai_tac has unreachable walkable tiles!`).toBe(totalWalkable);
    });

    it('28. tau_hai_tac: Đếm trạm đúng đặc tả (T, L, B, M, C×1, S×1, P, W, D, Q×2, spawn 1–4, băng ~ đúng 3 hàng)', () => {
      const counts: Record<string, number> = {};
      for (const row of tau_hai_tac.ascii) {
        for (const ch of row) {
          counts[ch] = (counts[ch] || 0) + 1;
        }
      }

      expect(counts['T'] || 0).toBe(1);
      expect(counts['L'] || 0).toBe(1);
      expect(counts['B'] || 0).toBe(1);
      expect(counts['M'] || 0).toBe(1);
      expect(counts['C'] || 0).toBe(1);
      expect(counts['S'] || 0).toBe(1);
      expect(counts['P'] || 0).toBe(1);
      expect(counts['W'] || 0).toBe(1);
      expect(counts['D'] || 0).toBe(1);
      expect(counts['Q'] || 0).toBe(2);
      expect(counts['1'] || 0).toBe(1);
      expect(counts['2'] || 0).toBe(1);
      expect(counts['3'] || 0).toBe(1);
      expect(counts['4'] || 0).toBe(1);

      // Cấm O, R, _ và s
      expect(counts['O'] || 0).toBe(0);
      expect(counts['R'] || 0).toBe(0);
      expect(counts['_'] || 0).toBe(0);
      expect(counts['s'] || 0).toBe(0);

      // Băng trơn ~: đúng 3 hàng (hàng index 3, 4, 5), mỗi hàng 16 ô (~ ở x=2..17), x=1 và x=18 là sàn
      expect(counts['~'] || 0).toBe(48); // 3 * 16 = 48
      for (let y = 3; y <= 5; y++) {
        expect(tau_hai_tac.ascii[y]![1]).toBe('.');
        expect(tau_hai_tac.ascii[y]![18]).toBe('.');
        for (let x = 2; x <= 17; x++) {
          expect(tau_hai_tac.ascii[y]![x]).toBe('~');
        }
      }
    });

    it('29. tau_hai_tac: Bot đi được từ mọi spawn (1–4) tới mọi trạm và mọi Q', () => {
      const parsed = parseLevel(tau_hai_tac);
      const isWalkable = (x: number, y: number) => {
        if (x < 0 || x >= parsed.width || y < 0 || y >= parsed.height) return false;
        const ch = tau_hai_tac.ascii[y]![x]!;
        return ch === '.' || ch === '~' || ['1', '2', '3', '4'].includes(ch);
      };

      expect(parsed.spawns.length).toBe(4);

      for (let sIdx = 0; sIdx < parsed.spawns.length; sIdx++) {
        const spawn = parsed.spawns[sIdx]!;
        const sx = Math.floor(spawn.x);
        const sy = Math.floor(spawn.y);
        const visited = new Set<string>();
        const queue: [number, number][] = [[sx, sy]];
        visited.add(`${sx},${sy}`);

        while (queue.length > 0) {
          const [cx, cy] = queue.shift()!;
          for (const [dx, dy] of DIRS) {
            const nx = cx + dx;
            const ny = cy + dy;
            const key = `${nx},${ny}`;
            if (isWalkable(nx, ny) && !visited.has(key)) {
              visited.add(key);
              queue.push([nx, ny]);
            }
          }
        }

        for (const st of parsed.stations) {
          let canReach = false;
          for (const [dx, dy] of DIRS) {
            if (visited.has(`${st.x + dx},${st.y + dy}`)) {
              canReach = true;
              break;
            }
          }
          expect(canReach, `Level tau_hai_tac spawn ${sIdx + 1} cannot reach station ${st.type} at (${st.x}, ${st.y})`).toBe(true);
        }
      }
    });

    it('30. tau_hai_tac: Mọi Q đi bộ tới W trong tối đa 8 ô (BFS)', () => {
      const parsed = parseLevel(tau_hai_tac);
      const isWalkable = (x: number, y: number) => {
        if (x < 0 || x >= parsed.width || y < 0 || y >= parsed.height) return false;
        const ch = tau_hai_tac.ascii[y]![x]!;
        return ch === '.' || ch === '~' || ['1', '2', '3', '4'].includes(ch);
      };

      const wStation = parsed.stations.find(s => s.type === 'sink')!;
      expect(wStation).toBeDefined();

      const qStations = parsed.stations.filter(s => s.type === 'table');
      expect(qStations.length).toBe(2);

      for (const q of qStations) {
        const visited = new Map<string, number>();
        const queue: [number, number, number][] = [];
        for (const [dx, dy] of DIRS) {
          const fx = q.x + dx, fy = q.y + dy;
          if (isWalkable(fx, fy)) {
            visited.set(`${fx},${fy}`, 0);
            queue.push([fx, fy, 0]);
          }
        }

        let minDist = -1;
        while (queue.length > 0) {
          const [cx, cy, d] = queue.shift()!;
          for (const [dx, dy] of DIRS) {
            if (cx + dx === wStation.x && cy + dy === wStation.y) {
              minDist = d;
              break;
            }
          }
          if (minDist !== -1) break;

          for (const [dx, dy] of DIRS) {
            const nx = cx + dx, ny = cy + dy;
            const key = `${nx},${ny}`;
            if (isWalkable(nx, ny) && !visited.has(key)) {
              visited.set(key, d + 1);
              queue.push([nx, ny, d + 1]);
            }
          }
        }

        expect(minDist).toBeGreaterThanOrEqual(0);
        expect(minDist, `Table Q at (${q.x}, ${q.y}) distance to W is ${minDist} steps, must be <= 8`).toBeLessThanOrEqual(8);
      }
    });

    it('31. tau_hai_tac khác mọi map đã xanh: kích thước độc nhất hoặc độ tương đồng < 0.5', () => {
      const greenMaps = [tutorial, level1, bep_doi, nha_hang_mo, bep_lo_nuong];
      const nW = tau_hai_tac.ascii[0]!.length;
      const nH = tau_hai_tac.ascii.length;

      for (const other of greenMaps) {
        const oW = other.ascii[0]!.length;
        const oH = other.ascii.length;
        if (nW === oW && nH === oH) {
          let matches = 0;
          for (let y = 0; y < nH; y++) {
            for (let x = 0; x < nW; x++) {
              if (tau_hai_tac.ascii[y]![x] === other.ascii[y]![x]) matches++;
            }
          }
          const similarity = matches / (nW * nH);
          expect(similarity).toBeLessThan(0.5);
        } else {
          expect(nW === oW && nH === oH).toBe(false);
        }
      }
    });

    it('32. tau_hai_tac: Băng trơn ~ trượt đúng với ICE_FRICTION', () => {
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

    it('33. tau_hai_tac: Bot hoàn thành 1 đơn SALAD (thái cà chua, thái xà lách, đĩa, giao Q)', () => {
      const state = createGameState(tau_hai_tac, ['p1', 'p2'], 12345);
      state.customers = [];
      state.orders = [];
      state.nextOrderIn = 99999;
      const p1 = state.players[0]!;
      const p2 = state.players[1]!;

      const tomatoCrate = state.stations.find(s => s.type === 'crate' && s.crate === 'tomato')!;
      const lettuceCrate = state.stations.find(s => s.type === 'crate' && s.crate === 'lettuce')!;
      const cut = state.stations.find(s => s.type === 'cutting')!;
      const plateDispenser = state.stations.find(s => s.type === 'plate_dispenser')!;
      const tables = state.stations.filter(s => s.type === 'table');
      const table = tables[0]!;

      const customer: CustomerState = {
        id: state.nextCustomerId++,
        x: table.x,
        y: table.y,
        state: 'order_taken',
        recipe: 'salad',
        patience: 90,
        maxPatience: 90,
        timer: 0,
        colorIndex: 0
      };
      state.customers.push(customer);
      table.customerId = customer.id;
      state.orders.push({
        id: 701,
        recipe: 'salad',
        timeLeft: 90,
        patience: 90,
        customerId: customer.id
      });

      const counter = state.stations.find(st => st.type === 'counter')!;

      // 1. p1 lấy cà chua, thái ở C (thái xong tự cầm trên tay)
      interactStation(state, p1, tomatoCrate);
      interactStation(state, p1, cut);
      updateAction(state, p1.id, { seq: 1, mx: 0, my: 0, interact: false, act: true, dash: false, throw: false }, CHOP_TIME);
      expect((p1.held as IngredientItem)?.state).toBe('chopped');
      interactStation(state, p1, counter); // đặt cà chua thái lên counter

      // 2. p1 lấy đĩa ở P, xúc cà chua từ counter -> p1 cầm đĩa chứa cà chua thái
      interactStation(state, p1, plateDispenser);
      interactStation(state, p1, counter);
      expect((p1.held as PlateItem)?.contents.length).toBe(1);

      // 3. p2 lấy xà lách từ L, đặt lên thớt C và thái (thái xong tự cầm trên tay)
      interactStation(state, p2, lettuceCrate);
      interactStation(state, p2, cut);
      updateAction(state, p2.id, { seq: 2, mx: 0, my: 0, interact: false, act: true, dash: false, throw: false }, CHOP_TIME);
      expect((p2.held as IngredientItem)?.state).toBe('chopped');
      interactStation(state, p2, counter); // đặt xà lách thái lên counter

      // 4. p1 mang đĩa tới counter xúc xà lách vào đĩa
      interactStation(state, p1, counter);
      const saladPlate = p1.held as PlateItem;
      expect(saladPlate.type).toBe('plate');
      expect(saladPlate.contents.length).toBe(2);
      expect(matchRecipe(saladPlate)).toBe('salad');

      // 5. p1 giao đĩa salad cho bàn khách Q
      const initialScore = state.score;
      const events = interactStation(state, p1, table);
      const serveEv = events.find(e => e.type === 'serve_ok') as any;
      expect(serveEv).toBeDefined();
      expect(serveEv?.recipe).toBe('salad');
      expect(serveEv?.baseScore).toBe(RECIPE_SCORE.salad);
      expect(state.score).toBe(initialScore + serveEv.baseScore + (serveEv.tip ?? 0));
      expect(customer.state).toBe('eating');
    });
  });

  describe('M6: tram_vu_tru (Trạm Vũ Trụ) Redesign', () => {
    it('34. tram_vu_tru: validateLevel không lỗi và không có ô floor unreachable', () => {
      const val = validateLevel(tram_vu_tru);
      expect(val.errors, `Level tram_vu_tru has validation errors: ${val.errors.join(', ')}`).toEqual([]);

      const parsed = parseLevel(tram_vu_tru);
      expect(parsed.width).toBe(16);
      expect(parsed.height).toBe(12);

      const isFloor = (x: number, y: number) => {
        if (x < 0 || x >= parsed.width || y < 0 || y >= parsed.height) return false;
        const ch = tram_vu_tru.ascii[y]![x]!;
        return ch === '.' || ['1', '2', '3', '4'].includes(ch);
      };

      let totalFloor = 0;
      for (let y = 0; y < parsed.height; y++) {
        for (let x = 0; x < parsed.width; x++) {
          if (isFloor(x, y)) totalFloor++;
        }
      }

      const s1 = parsed.spawns[0]!;
      const sx = Math.floor(s1.x);
      const sy = Math.floor(s1.y);
      const visited = new Set<string>();
      const queue: [number, number][] = [[sx, sy]];
      visited.add(`${sx},${sy}`);

      while (queue.length > 0) {
        const [cx, cy] = queue.shift()!;
        for (const [dx, dy] of DIRS) {
          const nx = cx + dx;
          const ny = cy + dy;
          const key = `${nx},${ny}`;
          if (isFloor(nx, ny) && !visited.has(key)) {
            visited.add(key);
            queue.push([nx, ny]);
          }
        }
      }

      expect(visited.size, `Level tram_vu_tru has unreachable floor tiles!`).toBe(totalFloor);
    });

    it('35. tram_vu_tru: Đếm trạm đúng đặc tả (T, L, B, M, C×1, S×1, P×1, W×1, D×1, Q×3, spawn 1–4, khối X 4×4, băng chuyền >= 10 ô)', () => {
      const counts: Record<string, number> = {};
      for (const row of tram_vu_tru.ascii) {
        for (const ch of row) {
          counts[ch] = (counts[ch] || 0) + 1;
        }
      }

      expect(counts['T'] || 0).toBe(1);
      expect(counts['L'] || 0).toBe(1);
      expect(counts['B'] || 0).toBe(1);
      expect(counts['M'] || 0).toBe(1);
      expect(counts['C'] || 0).toBe(1);
      expect(counts['S'] || 0).toBe(1);
      expect(counts['P'] || 0).toBe(1);
      expect(counts['W'] || 0).toBe(1);
      expect(counts['D'] || 0).toBe(1);
      expect(counts['Q'] || 0).toBe(3);
      expect(counts['1'] || 0).toBe(1);
      expect(counts['2'] || 0).toBe(1);
      expect(counts['3'] || 0).toBe(1);
      expect(counts['4'] || 0).toBe(1);

      // Cấm O, R, _, s
      expect(counts['O'] || 0).toBe(0);
      expect(counts['R'] || 0).toBe(0);
      expect(counts['_'] || 0).toBe(0);
      expect(counts['s'] || 0).toBe(0);

      // Khối X 4×4 = 16 ô
      expect(counts['X'] || 0).toBe(16);

      // Băng chuyền có >= 10 ô
      const conveyorCount = (counts['>'] || 0) + (counts['<'] || 0) + (counts['^'] || 0) + (counts['v'] || 0);
      expect(conveyorCount).toBeGreaterThanOrEqual(10);
      expect(conveyorCount).toBe(14);
    });

    it('36. tram_vu_tru: Bot đi được từ mọi spawn (1–4) tới mọi functional station và mọi Q', () => {
      const parsed = parseLevel(tram_vu_tru);
      const isFloor = (x: number, y: number) => {
        if (x < 0 || x >= parsed.width || y < 0 || y >= parsed.height) return false;
        const ch = tram_vu_tru.ascii[y]![x]!;
        return ch === '.' || ['1', '2', '3', '4'].includes(ch);
      };

      expect(parsed.spawns.length).toBe(4);
      const functionalStations = parsed.stations.filter(s => s.type !== 'counter' && s.type !== 'conveyor');

      for (let sIdx = 0; sIdx < parsed.spawns.length; sIdx++) {
        const spawn = parsed.spawns[sIdx]!;
        const sx = Math.floor(spawn.x);
        const sy = Math.floor(spawn.y);
        const visited = new Set<string>();
        const queue: [number, number][] = [[sx, sy]];
        visited.add(`${sx},${sy}`);

        while (queue.length > 0) {
          const [cx, cy] = queue.shift()!;
          for (const [dx, dy] of DIRS) {
            const nx = cx + dx;
            const ny = cy + dy;
            const key = `${nx},${ny}`;
            if (isFloor(nx, ny) && !visited.has(key)) {
              visited.add(key);
              queue.push([nx, ny]);
            }
          }
        }

        for (const st of functionalStations) {
          let canReach = false;
          for (const [dx, dy] of DIRS) {
            if (visited.has(`${st.x + dx},${st.y + dy}`)) {
              canReach = true;
              break;
            }
          }
          expect(canReach, `Level tram_vu_tru spawn ${sIdx + 1} cannot reach station ${st.type} at (${st.x}, ${st.y})`).toBe(true);
        }
      }
    });

    it('37. tram_vu_tru: Mọi Q đi bộ tới W trong tối đa 8 ô (BFS)', () => {
      const parsed = parseLevel(tram_vu_tru);
      const isFloor = (x: number, y: number) => {
        if (x < 0 || x >= parsed.width || y < 0 || y >= parsed.height) return false;
        const ch = tram_vu_tru.ascii[y]![x]!;
        return ch === '.' || ['1', '2', '3', '4'].includes(ch);
      };

      const wStation = parsed.stations.find(s => s.type === 'sink')!;
      expect(wStation).toBeDefined();

      const qStations = parsed.stations.filter(s => s.type === 'table');
      expect(qStations.length).toBe(3);

      for (const q of qStations) {
        const visited = new Map<string, number>();
        const queue: [number, number, number][] = [];
        for (const [dx, dy] of DIRS) {
          const fx = q.x + dx, fy = q.y + dy;
          if (isFloor(fx, fy)) {
            visited.set(`${fx},${fy}`, 0);
            queue.push([fx, fy, 0]);
          }
        }

        let minDist = -1;
        while (queue.length > 0) {
          const [cx, cy, d] = queue.shift()!;
          for (const [dx, dy] of DIRS) {
            if (cx + dx === wStation.x && cy + dy === wStation.y) {
              minDist = d;
              break;
            }
          }
          if (minDist !== -1) break;

          for (const [dx, dy] of DIRS) {
            const nx = cx + dx, ny = cy + dy;
            const key = `${nx},${ny}`;
            if (isFloor(nx, ny) && !visited.has(key)) {
              visited.set(key, d + 1);
              queue.push([nx, ny, d + 1]);
            }
          }
        }

        expect(minDist).toBeGreaterThanOrEqual(0);
        expect(minDist, `Table Q at (${q.x}, ${q.y}) distance to W is ${minDist} steps, must be <= 8`).toBeLessThanOrEqual(8);
      }
    });

    it('38. tram_vu_tru khác mọi map đã xanh: kích thước độc nhất hoặc độ tương đồng < 0.5', () => {
      const greenMaps = [tutorial, level1, bep_doi, nha_hang_mo, bep_lo_nuong, tau_hai_tac];
      const nW = tram_vu_tru.ascii[0]!.length;
      const nH = tram_vu_tru.ascii.length;

      for (const other of greenMaps) {
        const oW = other.ascii[0]!.length;
        const oH = other.ascii.length;
        if (nW === oW && nH === oH) {
          let matches = 0;
          for (let y = 0; y < nH; y++) {
            for (let x = 0; x < nW; x++) {
              if (tram_vu_tru.ascii[y]![x] === other.ascii[y]![x]) matches++;
            }
          }
          const similarity = matches / (nW * nH);
          expect(similarity).toBeLessThan(0.5);
        } else {
          expect(nW === oW && nH === oH).toBe(false);
        }
      }
    });

    it('39. tram_vu_tru: Băng chuyền có ô kế tiếp hợp lệ; đồ đặt lên băng đầu vòng đi tới Q cuối trong số tick từ CONVEYOR_SPEED', () => {
      const parsed = parseLevel(tram_vu_tru);
      const conveyors = parsed.stations.filter(s => s.type === 'conveyor');
      expect(conveyors.length).toBeGreaterThanOrEqual(10);

      // 1. Mọi conveyor có ô kế tiếp hợp lệ (không hướng vào tường)
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
      }

      // 2. Một đầu kết thúc tại Q (10, 3), đầu kia bắt đầu sát C (5, 3)
      const lastConv = getStationAt(createGameState(tram_vu_tru, ['p1'], 1), 10, 4)!;
      expect(lastConv.type).toBe('conveyor');
      expect(lastConv.dir).toBe('up');
      const qStation = getStationAt(createGameState(tram_vu_tru, ['p1'], 1), 10, 3)!;
      expect(qStation.type).toBe('table');

      // 3. Đồ đặt lên băng ở đầu vòng (5, 4) đi tới Q cuối (10, 3) và phục vụ thành công
      const state = createGameState(tram_vu_tru, ['p1'], 12345);
      state.customers = [];
      state.orders = [];

      const qTable = getStationAt(state, 10, 3)!;
      const customer: CustomerState = {
        id: 801,
        x: qTable.x,
        y: qTable.y,
        state: 'order_taken',
        recipe: 'salad',
        patience: 999,
        maxPatience: 999,
        timer: 0,
        colorIndex: 0
      };
      state.customers.push(customer);
      qTable.customerId = customer.id;
      state.orders.push({ id: 801, recipe: 'salad', timeLeft: 999, patience: 999, customerId: customer.id });

      const startConv = getStationAt(state, 5, 4)!;
      startConv.item = {
        type: 'plate',
        dirty: false,
        contents: [
          { type: 'ingredient', id: 'lettuce', state: 'chopped' },
          { type: 'ingredient', id: 'tomato', state: 'chopped' }
        ]
      };
      startConv.progress = 0;

      // 14 conveyor tiles, mỗi tile mất 50 ticks (1 / (CONVEYOR_SPEED / SIM_HZ) = 50)
      let served = false;
      for (let tick = 1; tick <= 750; tick++) {
        const events = step(state, {});
        if (events.some(e => e.type === 'serve_ok')) {
          served = true;
          break;
        }
      }

      expect(served, 'Món salad trên băng chuyền phải tới bàn Q và tự động giao cho khách').toBe(true);
      expect(customer.state).toBe('eating');
    });

    it('40. tram_vu_tru: Bot hoàn thành 1 đơn BURGER_TOMATO (món chính: thịt chín, xà lách thái, cà chua thái, bánh mì, đĩa, giao Q)', () => {
      const state = createGameState(tram_vu_tru, ['p1', 'p2'], 12345);
      state.customers = [];
      state.orders = [];
      state.nextOrderIn = 99999;
      const p1 = state.players[0]!;
      const p2 = state.players[1]!;

      const tomatoCrate = state.stations.find(s => s.type === 'crate' && s.crate === 'tomato')!;
      const lettuceCrate = state.stations.find(s => s.type === 'crate' && s.crate === 'lettuce')!;
      const meatCrate = state.stations.find(s => s.type === 'crate' && s.crate === 'meat')!;
      const bunCrate = state.stations.find(s => s.type === 'crate' && s.crate === 'bun')!;
      const cut = state.stations.find(s => s.type === 'cutting')!;
      const stove = state.stations.find(s => s.type === 'stove')!;
      const plateDispenser = state.stations.find(s => s.type === 'plate_dispenser')!;
      const tables = state.stations.filter(s => s.type === 'table');
      const table = tables[0]!;
      const counter = state.stations.find(s => s.type === 'counter' && s.x === 6 && s.y === 4)!;

      const customer: CustomerState = {
        id: state.nextCustomerId++,
        x: table.x,
        y: table.y,
        state: 'order_taken',
        recipe: 'burger_tomato',
        patience: 120,
        maxPatience: 120,
        timer: 0,
        colorIndex: 0
      };
      state.customers.push(customer);
      table.customerId = customer.id;
      state.orders.push({
        id: 901,
        recipe: 'burger_tomato',
        timeLeft: 120,
        patience: 120,
        customerId: customer.id
      });

      // 1. Nấu thịt trên bếp S
      interactStation(state, p1, meatCrate);
      interactStation(state, p1, stove);
      tickStations(state, COOK_TIME);
      const pan = stove.item as any;
      expect(pan.contents?.[0]?.state).toBe('cooked');

      // 2. Thái cà chua trên thớt C (thái xong tự cầm trên tay)
      interactStation(state, p2, tomatoCrate);
      interactStation(state, p2, cut);
      updateAction(state, p2.id, { seq: 1, mx: 0, my: 0, interact: false, act: true, dash: false, throw: false }, CHOP_TIME);
      expect((p2.held as IngredientItem)?.state).toBe('chopped');
      interactStation(state, p2, counter); // đặt cà chua thái lên counter

      // 3. Lấy đĩa từ P, xúc cà chua từ counter
      interactStation(state, p1, plateDispenser);
      interactStation(state, p1, counter);
      expect((p1.held as PlateItem)?.contents.length).toBe(1);

      // 4. Thái xà lách trên thớt C (thái xong tự cầm trên tay)
      interactStation(state, p2, lettuceCrate);
      interactStation(state, p2, cut);
      updateAction(state, p2.id, { seq: 2, mx: 0, my: 0, interact: false, act: true, dash: false, throw: false }, CHOP_TIME);
      expect((p2.held as IngredientItem)?.state).toBe('chopped');
      interactStation(state, p2, counter); // đặt xà lách thái lên counter

      // 5. Xúc xà lách từ counter, xúc thịt từ bếp
      interactStation(state, p1, counter);
      interactStation(state, p1, stove);

      // 6. Lấy bánh mì từ B đặt lên counter X, xúc vào đĩa
      interactStation(state, p2, bunCrate);
      interactStation(state, p2, counter);
      interactStation(state, p1, counter);

      const plate = p1.held as PlateItem;
      expect(plate.type).toBe('plate');
      expect(plate.contents.length).toBe(4);
      expect(matchRecipe(plate)).toBe('burger_tomato');

      // 7. Giao đến bàn khách Q
      const initialScore = state.score;
      const events = interactStation(state, p1, table);
      const serveEv = events.find(e => e.type === 'serve_ok') as any;
      expect(serveEv).toBeDefined();
      expect(serveEv?.recipe).toBe('burger_tomato');
      expect(serveEv?.baseScore).toBe(RECIPE_SCORE.burger_tomato);
      expect(state.score).toBe(initialScore + serveEv.baseScore + (serveEv.tip ?? 0));
      expect(customer.state).toBe('eating');
    });
  });
});

