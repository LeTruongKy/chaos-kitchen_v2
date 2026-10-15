import { describe, it, expect } from 'vitest';
import { validateUsability } from '../level';
import { tutorial } from '../levels/tutorial';
import { level1 } from '../levels/level1';
import { bep_doi } from '../levels/bep_doi';
import { LevelDef } from '../types';

describe('Level Usability Rules (R1–R6)', () => {
  it('1. Báo lỗi R1 khi một map thiếu quầy X kề cạnh thớt C (khoảng cách > 4 bước)', () => {
    const badMapR1: LevelDef = {
      id: 'bad_r1',
      name: 'Bad R1',
      duration: 180,
      plates: 4,
      world: 1,
      theme: 'diner',
      stars: [50, 100, 150],
      recipes: [{ id: 'salad', weight: 1 }],
      ascii: [
        '##########',
        '#C.......#',
        '#........#',
        '#........#',
        '#........#',
        '#........#',
        '#........#',
        '#........#',
        '#........#',
        '#XX.....1#',
        '##########',
      ]
    };

    const res = validateUsability(badMapR1);
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.startsWith('R1: Thớt C'))).toBe(true);
  });

  it('2. Báo lỗi R2 khi bàn khách Q kề cạnh thùng nguyên liệu T', () => {
    const badMapR2: LevelDef = {
      id: 'bad_r2',
      name: 'Bad R2',
      duration: 180,
      plates: 4,
      world: 1,
      theme: 'diner',
      stars: [50, 100, 150],
      recipes: [{ id: 'salad', weight: 1 }],
      ascii: [
        '######',
        '#QTXX#',
        '#..1.#',
        '######',
      ]
    };

    const res = validateUsability(badMapR2);
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.startsWith('R2: Bàn khách Q'))).toBe(true);
  });

  it('3. Báo lỗi R6 khi tổng số quầy X < ngưỡng tối thiểu (X < 2)', () => {
    const badMapR6: LevelDef = {
      id: 'bad_r6',
      name: 'Bad R6',
      duration: 180,
      plates: 4,
      world: 1,
      theme: 'diner',
      stars: [50, 100, 150],
      recipes: [{ id: 'salad', weight: 1 }],
      ascii: [
        '######',
        '#X...#',
        '#..1.#',
        '######',
      ]
    };

    const res = validateUsability(badMapR6);
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.startsWith('R6: Map thiếu quầy X'))).toBe(true);
  });

  it('4. Các map đã xanh (tutorial, level1, bep_doi) VẪN PASS validateUsability', () => {
    const tutRes = validateUsability(tutorial);
    expect(tutRes.errors, `tutorial errors: ${tutRes.errors.join(', ')}`).toEqual([]);
    expect(tutRes.valid).toBe(true);

    const l1Res = validateUsability(level1);
    expect(l1Res.errors, `level1 errors: ${l1Res.errors.join(', ')}`).toEqual([]);
    expect(l1Res.valid).toBe(true);

    const bdRes = validateUsability(bep_doi);
    expect(bdRes.errors, `bep_doi errors: ${bdRes.errors.join(', ')}`).toEqual([]);
    expect(bdRes.valid).toBe(true);
  });
});
