import { expect, it } from 'vitest';
import { isPlayerInput } from '../protocol';

it('isPlayerInput validates inputs correctly', () => {
  expect(isPlayerInput({ seq: 0, mx: 0, my: 0, act: false, interact: false, dash: false, throw: false })).toBe(true);
  expect(isPlayerInput({ seq: 10, mx: -1, my: 1, act: true, interact: true, dash: true, throw: false })).toBe(true);
  
  expect(isPlayerInput(null)).toBe(false);
  expect(isPlayerInput(undefined)).toBe(false);
  expect(isPlayerInput('string')).toBe(false);
  
  // missing field
  expect(isPlayerInput({ mx: 0, my: 0, act: false, interact: false, dash: false, throw: false })).toBe(false);
  
  // wrong seq
  expect(isPlayerInput({ seq: -1, mx: 0, my: 0, act: false, interact: false, dash: false, throw: false })).toBe(false);
  expect(isPlayerInput({ seq: 1.5, mx: 0, my: 0, act: false, interact: false, dash: false, throw: false })).toBe(false);
  expect(isPlayerInput({ seq: NaN, mx: 0, my: 0, act: false, interact: false, dash: false, throw: false })).toBe(false);
  
  // wrong mx
  expect(isPlayerInput({ seq: 1, mx: 2, my: 0, act: false, interact: false, dash: false, throw: false })).toBe(false);
  
  // wrong type for act
  expect(isPlayerInput({ seq: 1, mx: 0, my: 0, act: 1, interact: false, dash: false, throw: false })).toBe(false);
});
