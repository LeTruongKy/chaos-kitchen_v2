import { describe, it, expect } from 'vitest';
import { validateLevel } from '../level';
import { tutorial } from '../levels/tutorial';
import { LevelDef } from '../types';

describe('validateLevel - recipe-based station requirements', () => {
  it('1. tutorial (salad) không cảnh báo S và không lỗi', () => {
    const res = validateLevel(tutorial);
    expect(res.errors).toEqual([]);
    expect(res.warnings.some(w => w.includes('missing S'))).toBe(false);
  });

  it('2. burger thiếu S → lỗi', () => {
    const def: LevelDef = {
      id: 'test_burger_no_s',
      name: 'Test Burger Missing Pan',
      duration: 100,
      plates: 4,
      world: 1,
      theme: 'diner',
      recipes: [{ id: 'burger', weight: 1 }],
      stars: [1, 2, 3],
      ascii: [
        '#######',
        '#BML..#',
        '#1..2.#',
        '#C..WQ#',
        '#P..D.#',
        '#######'
      ]
    };
    const res = validateLevel(def);
    expect(res.errors.some(e => e.includes('missing S'))).toBe(true);
  });

  it('3. soup thiếu s → lỗi', () => {
    const def: LevelDef = {
      id: 'test_soup_no_s',
      name: 'Test Soup Missing Pot',
      duration: 100,
      plates: 4,
      world: 1,
      theme: 'diner',
      recipes: [{ id: 'tomato_soup', weight: 1 }],
      stars: [1, 2, 3],
      ascii: [
        '#######',
        '#T....#',
        '#1..2.#',
        '#C..WQ#',
        '#P..D.#',
        '#######'
      ]
    };
    const res = validateLevel(def);
    expect(res.errors.some(e => e.includes('missing s'))).toBe(true);
  });

  it('4. salad có đủ C, P, W, D, Q → không lỗi', () => {
    const def: LevelDef = {
      id: 'test_salad_valid',
      name: 'Test Salad Valid',
      duration: 100,
      plates: 4,
      world: 1,
      theme: 'diner',
      recipes: [{ id: 'salad', weight: 1 }],
      stars: [1, 2, 3],
      ascii: [
        '#######',
        '#TL...#',
        '#1..2.#',
        '#C..WQ#',
        '#P..D.#',
        '#######'
      ]
    };
    const res = validateLevel(def);
    expect(res.errors).toEqual([]);
    expect(res.warnings.some(w => w.includes('missing S'))).toBe(false);
  });
});
