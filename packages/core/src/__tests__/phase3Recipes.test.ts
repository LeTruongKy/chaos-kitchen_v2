import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { RECIPES, makePlate, addToPlate, matchRecipe } from '../recipes';
import { PLAYABLE_LEVELS } from '../levels';
import { createGameState, getStationAt } from '../sim/createState';
import { step } from '../sim/step';
import { CustomerState, RecipeId } from '../types';
import { POT_COOK_TIME, OVEN_COOK_TIME } from '../constants';

describe('Phase 3 - Recipe Verification & Thumbnails', () => {
  const allRecipeIds = Object.keys(RECIPES) as RecipeId[];

  it('1. Mỗi recipe có file thumbnail tồn tại trong public/thumbs/recipes', () => {
    const rootDir = process.cwd().includes('packages')
      ? path.resolve(process.cwd(), '../..')
      : process.cwd();
    const thumbsDir = path.resolve(rootDir, 'apps/client/public/thumbs/recipes');

    expect(fs.existsSync(thumbsDir)).toBe(true);

    for (const recipeId of allRecipeIds) {
      const thumbFile = path.resolve(thumbsDir, `${recipeId}.png`);
      const exists = fs.existsSync(thumbFile);
      expect(exists, `Thumbnail for recipe "${recipeId}" must exist at ${thumbFile}`).toBe(true);

      const stat = fs.statSync(thumbFile);
      expect(stat.size, `Thumbnail for "${recipeId}" should not be empty`).toBeGreaterThan(100);
    }
  });

  it('2. Mỗi recipe có name tiếng Anh không rỗng', () => {
    for (const recipe of Object.values(RECIPES)) {
      expect(typeof recipe.name).toBe('string');
      expect(recipe.name.trim().length).toBeGreaterThan(0);
      expect(/^[\x20-\x7E]+$/.test(recipe.name), `Recipe name "${recipe.name}" should be in English`).toBe(true);
    }
  });

  describe('3. Hoàn thành công thức bằng mô phỏng hoặc kiểm tra công thức', () => {
    it('salad: hoàn thành được bằng mô phỏng trên map bep_doi', () => {
      const level = PLAYABLE_LEVELS.find(l => l.id === 'bep_doi')!;
      const state = createGameState(level, ['p1'], 12345);
      const p1 = state.players[0]!;

      // Setup customer at table Q
      const table = state.stations.find(s => s.type === 'table')!;
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
        id: state.nextOrderId++,
        recipe: 'salad',
        timeLeft: 60,
        patience: 60,
        customerId: customer.id
      });

      // Assemble salad on plate
      p1.held = {
        type: 'plate',
        dirty: false,
        contents: [
          { type: 'ingredient', id: 'lettuce', state: 'chopped' },
          { type: 'ingredient', id: 'tomato', state: 'chopped' }
        ]
      };

      const deltas = [
        { dx: 0, dy: -1, fx: 0, fy: 1 },
        { dx: 0, dy: 1, fx: 0, fy: -1 },
        { dx: -1, dy: 0, fx: 1, fy: 0 },
        { dx: 1, dy: 0, fx: -1, fy: 0 }
      ];
      const adj = deltas.find(d => {
        const c = level.ascii[table.y + d.dy]?.[table.x + d.dx];
        return c === '.' || c === '1' || c === '2';
      })!;
      p1.x = table.x + adj.dx + 0.5;
      p1.y = table.y + adj.dy + 0.5;
      p1.fx = adj.fx;
      p1.fy = adj.fy;
      step(state, { p1: { seq: state.tick, mx: 0, my: 0, interact: true, act: false, dash: false, throw: false } });

      expect(customer.state).toBe('eating');
      expect(state.score).toBeGreaterThan(0);
    });

    it('burger: hoàn thành được bằng mô phỏng trên map bep_doi', () => {
      const level = PLAYABLE_LEVELS.find(l => l.id === 'bep_doi')!;
      const state = createGameState(level, ['p1'], 12345);
      const p1 = state.players[0]!;

      const table = state.stations.find(s => s.type === 'table')!;
      const customer: CustomerState = {
        id: state.nextCustomerId++,
        x: table.x,
        y: table.y,
        state: 'order_taken',
        recipe: 'burger',
        patience: 75,
        maxPatience: 75,
        timer: 0,
        colorIndex: 0
      };
      state.customers.push(customer);
      table.customerId = customer.id;
      state.orders.push({
        id: state.nextOrderId++,
        recipe: 'burger',
        timeLeft: 75,
        patience: 75,
        customerId: customer.id
      });

      p1.held = {
        type: 'plate',
        dirty: false,
        contents: [
          { type: 'ingredient', id: 'bun', state: 'raw' },
          { type: 'ingredient', id: 'meat', state: 'cooked' },
          { type: 'ingredient', id: 'lettuce', state: 'chopped' }
        ]
      };

      const deltas = [
        { dx: 0, dy: -1, fx: 0, fy: 1 },
        { dx: 0, dy: 1, fx: 0, fy: -1 },
        { dx: -1, dy: 0, fx: 1, fy: 0 },
        { dx: 1, dy: 0, fx: -1, fy: 0 }
      ];
      const adj = deltas.find(d => {
        const c = level.ascii[table.y + d.dy]?.[table.x + d.dx];
        return c === '.' || c === '1' || c === '2';
      })!;
      p1.x = table.x + adj.dx + 0.5;
      p1.y = table.y + adj.dy + 0.5;
      p1.fx = adj.fx;
      p1.fy = adj.fy;
      step(state, { p1: { seq: state.tick, mx: 0, my: 0, interact: true, act: false, dash: false, throw: false } });

      expect(customer.state).toBe('eating');
      expect(state.score).toBeGreaterThan(0);
    });

    it('burger_tomato: hoàn thành được bằng mô phỏng trên map nha_hang_mo', () => {
      const level = PLAYABLE_LEVELS.find(l => l.id === 'nha_hang_mo')!;
      const state = createGameState(level, ['p1'], 12345);
      const p1 = state.players[0]!;

      // Dynamic table lookup
      const table = state.stations.find(s => s.type === 'table')!;
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
        id: state.nextOrderId++,
        recipe: 'burger_tomato',
        timeLeft: 85,
        patience: 85,
        customerId: customer.id
      });

      p1.held = {
        type: 'plate',
        dirty: false,
        contents: [
          { type: 'ingredient', id: 'bun', state: 'raw' },
          { type: 'ingredient', id: 'meat', state: 'cooked' },
          { type: 'ingredient', id: 'lettuce', state: 'chopped' },
          { type: 'ingredient', id: 'tomato', state: 'chopped' }
        ]
      };

      p1.x = table.x + 0.5; p1.y = table.y - 0.5; p1.fx = 0; p1.fy = 1;
      step(state, { p1: { seq: state.tick, mx: 0, my: 0, interact: true, act: false, dash: false, throw: false } });

      expect(customer.state).toBe('eating');
      expect(state.score).toBeGreaterThan(0);
    });

    it('tomato_soup: hoàn thành được bằng mô phỏng trên map bep_doi (nấu nồi s -> múc đĩa -> giao bàn Q)', () => {
      const level = PLAYABLE_LEVELS.find(l => l.id === 'bep_doi')!;
      const state = createGameState(level, ['p1'], 12345);
      const p1 = state.players[0]!;

      const table = state.stations.find(s => s.type === 'table')!;
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
        id: state.nextOrderId++,
        recipe: 'tomato_soup',
        timeLeft: 90,
        patience: 90,
        customerId: customer.id
      });

      const deltas = [
        { dx: 0, dy: -1, fx: 0, fy: 1 },
        { dx: 0, dy: 1, fx: 0, fy: -1 },
        { dx: -1, dy: 0, fx: 1, fy: 0 },
        { dx: 1, dy: 0, fx: -1, fy: 0 }
      ];

      // Pot station
      const potStation = state.stations.find(s => (s.item as any)?.tool === 'pot')!;
      potStation.item = {
        type: 'tool',
        tool: 'pot',
        contents: [
          { type: 'ingredient', id: 'tomato', state: 'chopped' },
          { type: 'ingredient', id: 'tomato', state: 'chopped' },
          { type: 'ingredient', id: 'tomato', state: 'chopped' }
        ],
        progress: 0
      };

      // Advance ticks for pot to cook (POT_COOK_TIME = 15s)
      for (let i = 0; i < Math.ceil((POT_COOK_TIME + 0.5) * 30); i++) {
        step(state, { p1: { seq: state.tick, mx: 0, my: 0, interact: false, act: false, dash: false, throw: false } });
      }

      // Pot is now cooked. Pick soup with clean plate
      p1.held = makePlate(false);
      const potAdj = deltas.find(d => {
        const c = level.ascii[potStation.y + d.dy]?.[potStation.x + d.dx];
        return c === '.' || c === '1' || c === '2';
      })!;
      p1.x = potStation.x + potAdj.dx + 0.5;
      p1.y = potStation.y + potAdj.dy + 0.5;
      p1.fx = potAdj.fx;
      p1.fy = potAdj.fy;
      step(state, { p1: { seq: state.tick, mx: 0, my: 0, interact: true, act: false, dash: false, throw: false } });

      expect(p1.held).not.toBeNull();
      expect(p1.held?.type).toBe('plate');
      expect(matchRecipe(p1.held as any)).toBe('tomato_soup');

      // Serve at table
      const tableAdj = deltas.find(d => {
        const c = level.ascii[table.y + d.dy]?.[table.x + d.dx];
        return c === '.' || c === '1' || c === '2';
      })!;
      p1.x = table.x + tableAdj.dx + 0.5;
      p1.y = table.y + tableAdj.dy + 0.5;
      p1.fx = tableAdj.fx;
      p1.fy = tableAdj.fy;
      step(state, { p1: { seq: state.tick, mx: 0, my: 0, interact: true, act: false, dash: false, throw: false } });

      expect(customer.state).toBe('eating');
      expect(state.score).toBeGreaterThan(0);
    });

    it('pizza: hoàn thành được bằng mô phỏng trên map bep_lo_nuong (nướng lò U -> múc đĩa -> giao bàn Q)', () => {
      const level = PLAYABLE_LEVELS.find(l => l.id === 'bep_lo_nuong')!;
      const state = createGameState(level, ['p1'], 12345);
      const p1 = state.players[0]!;

      // Dynamic table lookup
      const table = state.stations.find(s => s.type === 'table')!;
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
        id: state.nextOrderId++,
        recipe: 'pizza',
        timeLeft: 90,
        patience: 90,
        customerId: customer.id
      });

      // Oven U lookup
      const ovenStation = state.stations.find(s => s.type === 'oven')!;
      ovenStation.item = {
        type: 'ingredient',
        id: 'pizza',
        state: 'raw'
      };
      ovenStation.progress = 0;

      // Cook in oven (OVEN_COOK_TIME = 12s)
      for (let i = 0; i < Math.ceil(OVEN_COOK_TIME * 30); i++) {
        step(state, { p1: { seq: state.tick, mx: 0, my: 0, interact: false, act: false, dash: false, throw: false } });
      }

      // Pizza is now cooked. Pick with clean plate
      p1.held = makePlate(false);
      p1.x = ovenStation.x + 0.5; p1.y = ovenStation.y + 1.5; p1.fx = 0; p1.fy = -1;
      step(state, { p1: { seq: state.tick, mx: 0, my: 0, interact: true, act: false, dash: false, throw: false } });

      expect(p1.held).not.toBeNull();
      expect(p1.held?.type).toBe('plate');
      expect(matchRecipe(p1.held as any)).toBe('pizza');

      // Serve at table
      p1.x = table.x + 0.5; p1.y = table.y - 0.5; p1.fx = 0; p1.fy = 1;
      step(state, { p1: { seq: state.tick, mx: 0, my: 0, interact: true, act: false, dash: false, throw: false } });

      expect(customer.state).toBe('eating');
      expect(state.score).toBeGreaterThan(0);
    });

    it('onion_soup: kích hoạt trong PLAYABLE_LEVELS và ghép đĩa đúng công thức', () => {
      const mapsWithOnionSoup = PLAYABLE_LEVELS.filter(l => l.recipes.some(r => r.id === 'onion_soup'));
      expect(mapsWithOnionSoup.length).toBeGreaterThanOrEqual(2);

      // Kiểm tra công thức và logic ghép đĩa cho onion_soup
      const recipe = RECIPES.onion_soup;
      expect(recipe).toBeDefined();
      expect(recipe.ingredients).toEqual([{ id: 'soup_onion', state: 'cooked' }]);
      expect(recipe.score).toBe(40);

      const plate = makePlate();
      addToPlate(plate, { type: 'ingredient', id: 'soup_onion', state: 'cooked' });
      expect(matchRecipe(plate)).toBe('onion_soup');
    });

    it('mushroom_soup: kích hoạt trong PLAYABLE_LEVELS và ghép đĩa đúng công thức', () => {
      const mapsWithMushroomSoup = PLAYABLE_LEVELS.filter(l => l.recipes.some(r => r.id === 'mushroom_soup'));
      expect(mapsWithMushroomSoup.length).toBeGreaterThanOrEqual(1);

      // Kiểm tra công thức và logic ghép đĩa cho mushroom_soup
      const recipe = RECIPES.mushroom_soup;
      expect(recipe).toBeDefined();
      expect(recipe.ingredients).toEqual([{ id: 'soup_mushroom', state: 'cooked' }]);
      expect(recipe.score).toBe(40);

      const plate = makePlate();
      addToPlate(plate, { type: 'ingredient', id: 'soup_mushroom', state: 'cooked' });
      expect(matchRecipe(plate)).toBe('mushroom_soup');
    });

    it('cheese_salad & mushroom_steak: kích hoạt trong PLAYABLE_LEVELS và ghép đĩa đúng công thức', () => {
      const mapsWithCheeseSalad = PLAYABLE_LEVELS.filter(l => l.recipes.some(r => r.id === 'cheese_salad'));
      const mapsWithMushroomSteak = PLAYABLE_LEVELS.filter(l => l.recipes.some(r => r.id === 'mushroom_steak'));
      expect(mapsWithCheeseSalad.length).toBeGreaterThanOrEqual(2);
      expect(mapsWithMushroomSteak.length).toBeGreaterThanOrEqual(2);

      const saladPlate = makePlate();
      addToPlate(saladPlate, { type: 'ingredient', id: 'lettuce', state: 'chopped' });
      addToPlate(saladPlate, { type: 'ingredient', id: 'tomato', state: 'chopped' });
      addToPlate(saladPlate, { type: 'ingredient', id: 'cheese', state: 'chopped' });
      expect(matchRecipe(saladPlate)).toBe('cheese_salad');

      const steakPlate = makePlate();
      addToPlate(steakPlate, { type: 'ingredient', id: 'meat', state: 'cooked' });
      addToPlate(steakPlate, { type: 'ingredient', id: 'mushroom', state: 'chopped' });
      expect(matchRecipe(steakPlate)).toBe('mushroom_steak');
    });
  });

  it('4. Tiêu chí loại bỏ burger trùng lặp khỏi PLAYABLE_LEVELS (chỉ giữ burger_tomato và cheese_burger)', () => {
    const mapsWithPlainBurger = PLAYABLE_LEVELS.filter(l => l.recipes.some(r => r.id === 'burger'));
    expect(mapsWithPlainBurger.length).toBe(0);
  });
});
