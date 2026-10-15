import { describe, it, expect } from 'vitest';
import { 
  canAddToPlate, addToPlate, matchRecipe, 
  makePlate
} from '../recipes';

describe('recipes', () => {
  it('canAddToPlate truth table', () => {
    let plate = makePlate();
    
    // đĩa rỗng + bun:raw -> true
    expect(canAddToPlate(plate, { type: 'ingredient', id: 'bun', state: 'raw' })).toBe(true);
    
    // đĩa rỗng + bun:cooked -> false
    expect(canAddToPlate(plate, { type: 'ingredient', id: 'bun', state: 'cooked' })).toBe(false);
    
    // đĩa rỗng + meat:raw -> false
    expect(canAddToPlate(plate, { type: 'ingredient', id: 'meat', state: 'raw' })).toBe(false);
    
    // đĩa rỗng + meat:burnt -> false
    expect(canAddToPlate(plate, { type: 'ingredient', id: 'meat', state: 'burnt' })).toBe(false);
    
    // đĩa rỗng + lettuce:raw -> false
    expect(canAddToPlate(plate, { type: 'ingredient', id: 'lettuce', state: 'raw' })).toBe(false);
    
    // đĩa có bun + thêm bun -> false
    plate = makePlate();
    addToPlate(plate, { type: 'ingredient', id: 'bun', state: 'raw' });
    expect(canAddToPlate(plate, { type: 'ingredient', id: 'bun', state: 'raw' })).toBe(false);
    
    // đĩa có bun + tomato:chopped -> true (tập con burger_tomato)
    expect(canAddToPlate(plate, { type: 'ingredient', id: 'tomato', state: 'chopped' })).toBe(true);
    
    // đĩa có lettuce + tomato
    plate = makePlate();
    addToPlate(plate, { type: 'ingredient', id: 'lettuce', state: 'chopped' });
    addToPlate(plate, { type: 'ingredient', id: 'tomato', state: 'chopped' });
    // Thêm bun vào đĩa có lettuce + tomato -> true vì là tập con của burger_tomato
    // Theo 02_TASKS.md ghi là false nhưng theo 01_CODING_RULES.md mục 5.4 là đúng vì thuộc burger_tomato.
    expect(canAddToPlate(plate, { type: 'ingredient', id: 'bun', state: 'raw' })).toBe(true);
    
    // đĩa bẩn
    plate = makePlate(true);
    expect(canAddToPlate(plate, { type: 'ingredient', id: 'bun', state: 'raw' })).toBe(false);
  });

  it('matchRecipe truth table', () => {
    // salad đủ bất kể thứ tự thêm
    let plate = makePlate();
    addToPlate(plate, { type: 'ingredient', id: 'tomato', state: 'chopped' });
    addToPlate(plate, { type: 'ingredient', id: 'lettuce', state: 'chopped' });
    expect(matchRecipe(plate)).toBe('salad');

    // burger thiếu lettuce -> null
    plate = makePlate();
    addToPlate(plate, { type: 'ingredient', id: 'bun', state: 'raw' });
    addToPlate(plate, { type: 'ingredient', id: 'meat', state: 'cooked' });
    expect(matchRecipe(plate)).toBe(null);

    // burger_tomato đủ -> burger_tomato
    plate = makePlate();
    addToPlate(plate, { type: 'ingredient', id: 'bun', state: 'raw' });
    addToPlate(plate, { type: 'ingredient', id: 'meat', state: 'cooked' });
    addToPlate(plate, { type: 'ingredient', id: 'lettuce', state: 'chopped' });
    addToPlate(plate, { type: 'ingredient', id: 'tomato', state: 'chopped' });
    expect(matchRecipe(plate)).toBe('burger_tomato');

    // đĩa bẩn -> null
    plate = makePlate(true);
    expect(matchRecipe(plate)).toBe(null);
  });

  it('contents luôn đúng thứ tự bun, meat, lettuce, tomato', () => {
    const plate = makePlate();
    // Thêm lộn xộn
    addToPlate(plate, { type: 'ingredient', id: 'tomato', state: 'chopped' });
    addToPlate(plate, { type: 'ingredient', id: 'bun', state: 'raw' });
    addToPlate(plate, { type: 'ingredient', id: 'lettuce', state: 'chopped' });
    addToPlate(plate, { type: 'ingredient', id: 'meat', state: 'cooked' });

    expect(plate.contents.map(c => c.id)).toEqual(['bun', 'meat', 'lettuce', 'tomato']);
  });
});
