import { LevelDef } from '../types';

export const level1: LevelDef = {
  id: 'level1',
  name: 'Quán Burger Đầu Tiên',
  duration: 180,
  plates: 4,
  world: 1,
  theme: 'diner',
  recipes: [
    { id: 'salad', weight: 1 },
    { id: 'burger_tomato', weight: 2 }
  ],
  stars: [40, 100, 160],
  ascii: [
    '################',
    '#TLBMXSE.......#',
    '#......P..Q..Q.#',
    '#C.1.2.X.......#',
    '#X.............#',
    '#C.3.4.W.......#',
    '#......X..Q..Q.#',
    '#D....XX.......#',
    '################'
  ]
};
