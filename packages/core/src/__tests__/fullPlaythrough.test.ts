import { describe, it, expect, beforeEach } from 'vitest';
import { createGameState } from '../sim/createState';
import { GameState } from '../types';
import { walkTo, interactWith, holdAct } from './helpers';
import { SIM_HZ } from '../constants';
import { step } from '../sim/step';
import { LEVELS } from '../levels';

describe('T09 - full playthrough', () => {
  let state: GameState;
  
  const level1 = {
    id: 'l1', name: 'L1',
    ascii: [
      '############',
      '#1234.X.B.M#',
      '#P........C#',
      '#Q........T#',
      '#X..W.D.S.L#',
      '############'
    ],
    duration: 180,
    plates: 4,
    recipes: [
      { id: 'salad' as const, weight: 1 },
      { id: 'burger' as const, weight: 1 },
      { id: 'burger_tomato' as const, weight: 1 }
    ],
    stars: [40, 100, 160] as [number, number, number],
    world: 1,
    theme: 'diner' as const
  };

  const level2 = { ...level1, id: 'l2', name: 'L2' };
  const level3 = { ...level1, id: 'l3', name: 'L3' };

  function placeCustomer(s: GameState, recipe: string, tableX: number, tableY: number) {
    const table = s.stations.find(st => st.x === tableX && st.y === tableY && st.type === 'table');
    if (!table) throw new Error(`No table at ${tableX},${tableY}`);
    const customerId = s.nextCustomerId++;
    s.customers.push({
      id: customerId,
      x: tableX, y: tableY,
      state: 'order_taken',
      recipe: recipe as import("../types").RecipeId,
      patience: 100,
      maxPatience: 100,
      timer: 0,
      colorIndex: 0
    });
    table.customerId = customerId;
    s.orders.push({
      id: s.nextOrderId++,
      recipe: recipe as import("../types").RecipeId,
      timeLeft: 100,
      patience: 100,
      customerId: customerId
    });
    return { table, customerId };
  }

  beforeEach(() => {
    state = createGameState(level1, ['p1'], 12345);
  });

  it('salad playthrough', () => {
    // Place customer at Q(1,3)
    const { table } = placeCustomer(state, 'salad', 1, 3);

    // 1. Lấy đĩa (P ở 1,2)
    walkTo(state, 'p1', 1, 2);
    interactWith(state, 'p1');
    expect(state.players[0]!.held?.type).toBe('plate');

    // 2. Đặt đĩa lên bàn X (6,1)
    walkTo(state, 'p1', 6, 2);
    walkTo(state, 'p1', 6, 1);
    interactWith(state, 'p1');
    expect(state.players[0]!.held).toBeNull();

    // 3. Lấy lettuce L (10,4)
    walkTo(state, 'p1', 10, 3);
    walkTo(state, 'p1', 10, 4);
    interactWith(state, 'p1');
    expect(state.players[0]!.held?.type).toBe('ingredient');
    expect((state.players[0]!.held as any).id).toBe('lettuce');

    // 4. Thái lettuce ở C (10,2)
    walkTo(state, 'p1', 10, 2);
    interactWith(state, 'p1');
    expect(state.players[0]!.held).toBeNull();
    holdAct(state, 'p1', 3 * SIM_HZ + 5);
    
    // 5. Nhặt lettuce đã thái
    interactWith(state, 'p1');
    expect((state.players[0]!.held as any)?.state).toBe('chopped');

    // 6. Cho vào đĩa ở X (6,1)
    walkTo(state, 'p1', 6, 2);
    walkTo(state, 'p1', 6, 1);
    interactWith(state, 'p1');
    expect(state.players[0]!.held).toBeNull();

    // 7. Lấy tomato T (10,3)
    walkTo(state, 'p1', 10, 3);
    interactWith(state, 'p1');
    expect(state.players[0]!.held?.type).toBe('ingredient');
    expect((state.players[0]!.held as any).id).toBe('tomato');

    // 8. Thái tomato ở C (10,2)
    walkTo(state, 'p1', 10, 2);
    interactWith(state, 'p1');
    holdAct(state, 'p1', 3 * SIM_HZ + 5);

    // 9. Nhặt tomato đã thái
    interactWith(state, 'p1');
    expect((state.players[0]!.held as any).state).toBe('chopped');

    // 10. Cho vào đĩa ở X (6,1)
    walkTo(state, 'p1', 6, 2);
    walkTo(state, 'p1', 6, 1);
    interactWith(state, 'p1');
    expect(state.players[0]!.held).toBeNull();

    // 11. Nhặt đĩa từ X (6,1)
    interactWith(state, 'p1');
    expect(state.players[0]!.held?.type).toBe('plate');

    // 12. Phục vụ ở table Q (1,3)
    walkTo(state, 'p1', 2, 3);
    interactWith(state, 'p1');
    expect(state.players[0]!.held).toBeNull();
    expect(state.score).toBeGreaterThan(0);

    // 13. Đợi 5s cho khách ăn xong, sẽ để lại đĩa bẩn trên bàn
    for (let i = 0; i < 5 * SIM_HZ + 5; i++) step(state, {});
    
    // 14. Nhặt đĩa bẩn từ bàn Q (1,3)
    interactWith(state, 'p1');
    expect(state.players[0]!.held?.type).toBe('plate');
    expect((state.players[0]!.held as any)?.dirty).toBe(true);

    // 15. Rửa đĩa ở bồn W (4,4)
    walkTo(state, 'p1', 4, 3);
    walkTo(state, 'p1', 4, 4);
    interactWith(state, 'p1');
    expect(state.players[0]!.held).toBeNull();
    
    holdAct(state, 'p1', 3 * SIM_HZ + 5);
    
    // 16. Nhặt đĩa sạch
    interactWith(state, 'p1');
    expect(state.players[0]!.held?.type).toBe('plate');
    expect((state.players[0]!.held as any)?.dirty).toBe(false);
  });

  it('burger playthrough', () => {
    const { table } = placeCustomer(state, 'burger', 1, 3);

    // 1. Lấy đĩa (P ở 1,2)
    walkTo(state, 'p1', 1, 2);
    interactWith(state, 'p1');
    
    // 2. Đặt đĩa lên bàn X (6,1)
    walkTo(state, 'p1', 6, 2);
    walkTo(state, 'p1', 6, 1);
    interactWith(state, 'p1');

    // 3. Lấy bun B (8,1)
    walkTo(state, 'p1', 8, 2);
    walkTo(state, 'p1', 8, 1);
    interactWith(state, 'p1');
    expect((state.players[0]!.held as any)?.id).toBe('bun');

    // 4. Cho vào đĩa ở X (6,1)
    walkTo(state, 'p1', 6, 1);
    interactWith(state, 'p1');

    // 5. Lấy lettuce L (10,4)
    walkTo(state, 'p1', 10, 4);
    interactWith(state, 'p1');

    // 6. Thái lettuce ở C (10,2)
    walkTo(state, 'p1', 10, 2);
    interactWith(state, 'p1');
    holdAct(state, 'p1', 3 * SIM_HZ + 5);
    interactWith(state, 'p1');

    // 7. Cho vào đĩa ở X (6,1)
    walkTo(state, 'p1', 6, 1);
    interactWith(state, 'p1');

    // 8. Lấy meat M (10,1)
    walkTo(state, 'p1', 10, 1);
    interactWith(state, 'p1');
    expect((state.players[0]!.held as any)?.id).toBe('meat');

    // 9. Đặt lên bếp S (8,4)
    walkTo(state, 'p1', 8, 4);
    interactWith(state, 'p1');

    // 10. Chờ thịt chín (8s)
    for (let i = 0; i < 8 * SIM_HZ + 5; i++) step(state, {});

    // 11. Nhặt thịt chín (sẽ nhặt luôn cả chảo)
    interactWith(state, 'p1');
    expect((state.players[0]!.held as any)?.type).toBe('tool');
    expect((state.players[0]!.held as any)?.contents[0].state).toBe('cooked');

    // 12. Đổ vào đĩa ở X (6,1)
    walkTo(state, 'p1', 6, 1);
    interactWith(state, 'p1');
    
    // Đặt chảo lại lên bếp S (8,4)
    walkTo(state, 'p1', 8, 4);
    interactWith(state, 'p1');

    // 13. Lấy đĩa từ X (6,1)
    walkTo(state, 'p1', 6, 1);
    interactWith(state, 'p1');
    expect(state.players[0]!.held?.type).toBe('plate');

    // 14. Phục vụ ở table Q (1,3)
    walkTo(state, 'p1', 2, 3);
    interactWith(state, 'p1');
    expect(state.score).toBeGreaterThan(0);
  });

  it('soup playthrough', () => {
    const fuzzLevel = {
      id: 'fuzz', name: 'Fuzz',
      ascii: [
        '##############',
        '#1234sS>_E.._#',
        '#P...T<~L..X_#',
        '#Q...^M.X..C.#',
        '#X..W.D.N.H.B#',
        '##############'
      ],
      duration: 180,
      plates: 5,
      recipes: [
        { id: 'salad' as const, weight: 1 },
        { id: 'burger' as const, weight: 1 },
        { id: 'tomato_soup' as const, weight: 1 }
      ],
      stars: [40, 100, 160] as [number, number, number],
      world: 1,
      theme: 'diner' as const
    };
    const s = createGameState(fuzzLevel, ['p1'], 123);
    placeCustomer(s, 'tomato_soup', 1, 3);

    // 1. Get 3 chopped tomatoes into the pot
    for (let i = 0; i < 3; i++) {
      walkTo(s, 'p1', 5, 2);
      interactWith(s, 'p1');
      walkTo(s, 'p1', 11, 3);
      interactWith(s, 'p1');
      holdAct(s, 'p1', 3 * SIM_HZ + 5);
      interactWith(s, 'p1');
      walkTo(s, 'p1', 5, 1);
      interactWith(s, 'p1');
    }

    // Pot should now start cooking. Takes 15s.
    for (let i = 0; i < 15 * SIM_HZ + 5; i++) step(s, {});

    // 2. Take a plate P(1,2)
    walkTo(s, 'p1', 1, 2);
    interactWith(s, 'p1');

    // 3. Scoop soup from pot to plate
    walkTo(s, 'p1', 5, 1);
    interactWith(s, 'p1');

    expect(s.players[0]!.held?.type).toBe('plate');
    expect((s.players[0]!.held as any)?.contents[0].id).toBe('soup_tomato');
    expect((s.players[0]!.held as any)?.contents[0].state).toBe('cooked');

    // 4. Serve at table Q(1,3)
    walkTo(s, 'p1', 2, 3);
    interactWith(s, 'p1');
    
    expect(s.score).toBeGreaterThan(0);
  });
  
  const fuzzLevel = {
    id: 'fuzz', name: 'Fuzz',
    ascii: [
      '##############',
      '#1234sS>_E.._#',
      '#P...T<~L..X_#',
      '#Q...^M.X..C.#',
      '#X..W.D.N.H.B#',
      '##############'
    ],
    duration: 180,
    plates: 5,
    recipes: [
      { id: 'salad' as const, weight: 1 },
      { id: 'burger' as const, weight: 1 },
      { id: 'tomato_soup' as const, weight: 1 }
    ],
    stars: [40, 100, 160] as [number, number, number],
    world: 1,
    theme: 'diner' as const
  };

  function countThings(st: GameState) {
    let plates = 0;
    let tools = 0;
    
    const countItem = (item: any) => {
      if (!item) return;
      if (item.type === 'plate') plates++;
      if (item.type === 'tool') tools++;
    };
    
    for (const p of st.players) {
      countItem(p.held);
    }
    for (const s of st.stations) {
      countItem(s.item);
      if (s.type === 'plate_dispenser') plates += s.cleanCount;
      if (s.type === 'sink') plates += s.cleanCount + s.dirtyCount;
    }
    for (const p of st.projectiles) {
      countItem(p.item);
    }
    return { plates, tools };
  }


  it('fuzz test', () => {
    const totalRuns = 200;
    const allLevels = [fuzzLevel, ...LEVELS];
    
    for (const level of allLevels) {
      for (let run = 0; run < totalRuns; run++) {
        const players = level.id === 'tutorial' || level.id === 'test_carry' ? ['p1'] : ['p1', 'p2'];
        const s = createGameState(level, players, run);
        const initialCounts = countThings(s);

        for (let tick = 0; tick < 60 * SIM_HZ; tick++) {
          const p1Inputs = { mx: 0 as 0|1|-1, my: 0 as 0|1|-1, act: false, interact: false, dash: false, throw: false };
          const p2Inputs = { mx: 0 as 0|1|-1, my: 0 as 0|1|-1, act: false, interact: false, dash: false, throw: false };
          
          const r1 = Math.random();
          if (r1 < 0.2) p1Inputs.mx = 1;
          else if (r1 < 0.4) p1Inputs.mx = -1;
          else if (r1 < 0.6) p1Inputs.my = 1;
          else if (r1 < 0.8) p1Inputs.my = -1;
          
          if (Math.random() < 0.1) p1Inputs.interact = true;
          if (Math.random() < 0.2) p1Inputs.act = true;
          if (Math.random() < 0.05) p1Inputs.dash = true;
          if (Math.random() < 0.05) p1Inputs.throw = true;

          const r2 = Math.random();
          if (r2 < 0.2) p2Inputs.mx = 1;
          else if (r2 < 0.4) p2Inputs.mx = -1;
          else if (r2 < 0.6) p2Inputs.my = 1;
          else if (r2 < 0.8) p2Inputs.my = -1;
          
          if (Math.random() < 0.1) p2Inputs.interact = true;
          if (Math.random() < 0.2) p2Inputs.act = true;
          if (Math.random() < 0.05) p2Inputs.dash = true;
          if (Math.random() < 0.05) p2Inputs.throw = true;

          step(s, { 
            p1: { seq: tick, ...p1Inputs },
            p2: { seq: tick, ...p2Inputs }
          });
        }
        
        expect(s.score).toBeGreaterThanOrEqual(0);
        expect(s.orders.length).toBeLessThanOrEqual(4);
        expect(s.streak).toBeLessThanOrEqual(4);
        
        for (const p of s.players) {
          expect(Number.isNaN(p.x)).toBe(false);
          expect(Number.isNaN(p.y)).toBe(false);
          expect(p.x).toBeGreaterThanOrEqual(0);
          expect(p.y).toBeGreaterThanOrEqual(0);
          expect(p.x).toBeLessThan(s.width);
          expect(p.y).toBeLessThan(s.height);
          
          if (p.held && p.held.type === 'plate') {
            const contents = p.held.contents.map(c => c.id);
            const unique = new Set(contents);
            expect(unique.size).toBe(contents.length);
          }
          
          const tileIdx = Math.floor(p.y) * s.width + Math.floor(p.x);
          const tile = s.tiles[tileIdx];
        }
      }
    }
  });
});
