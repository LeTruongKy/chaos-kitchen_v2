import { expect, it } from 'vitest';
import { nextRandom, randomInt, pickWeighted } from '../rng';

it('nextRandom produces same sequence for same seed', () => {
  const seed = 12345;
  let s1 = seed;
  const seq1: number[] = [];
  for (let i = 0; i < 100; i++) {
    const r = nextRandom(s1);
    seq1.push(r.value);
    s1 = r.state;
  }
  
  let s2 = seed;
  const seq2: number[] = [];
  for (let i = 0; i < 100; i++) {
    const r = nextRandom(s2);
    seq2.push(r.value);
    s2 = r.state;
  }
  
  expect(seq1).toEqual(seq2);
});

it('randomInt is within bounds', () => {
  let s = 999;
  for (let i = 0; i < 10000; i++) {
    const { value, state } = randomInt(s, 5, 10);
    s = state;
    expect(value).toBeGreaterThanOrEqual(5);
    expect(value).toBeLessThanOrEqual(10);
  }
});

it('pickWeighted selects correctly with [1, 0] weight', () => {
  let s = 42;
  const items = ['A', 'B'];
  for (let i = 0; i < 100; i++) {
    const { value, state } = pickWeighted(s, items, [1, 0]);
    s = state;
    expect(value).toBe('A');
  }
});
