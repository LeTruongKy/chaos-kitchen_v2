import { LevelDef } from '../types';

export const tau_hai_tac: LevelDef = {
  id: 'tau_hai_tac',
  name: 'Boong Tàu Hải Tặc',
  theme: 'ship',
  world: 2,
  duration: 180,
  plates: 4,
  recipes: [
    { id: 'steak_dinner', weight: 2 },
    { id: 'burger_tomato', weight: 2 }
  ],
  stars: [60, 140, 220],
  ascii: [
    '####################',
    '#TLBM.XCXSXWPX..D..#',
    '#.1..............2.#',
    '#.~~~~~~~~~~~~~~~~.#',
    '#.~~~~~~~~~~~~~~~~.#',
    '#.~~~~~~~~~~~~~~~~.#',
    '#.3..............4.#',
    '#.......Q.....Q....#',
    '####################'
  ]
};
