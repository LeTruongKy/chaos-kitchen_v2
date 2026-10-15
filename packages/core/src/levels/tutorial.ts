import { LevelDef } from '../types.js';

export const tutorial: LevelDef = {
  id: 'tutorial',
  name: 'Học Việc',
  duration: 9999,
  plates: 4,
  world: 1,
  theme: 'diner',
  recipes: [
    { id: 'salad', weight: 1 }
  ],
  stars: [1, 2, 3],
  ascii: [
    '##############',
    '#TLXCX.X.....#',
    '#......P.....#',
    '#..1..2...Q..#',
    '#............#',
    '#......W.....#',
    '#D.....X.....#',
    '##############'
  ]
};
