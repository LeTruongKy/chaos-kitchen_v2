import { LevelDef } from '../types';

export const levelB08: LevelDef = {
  id: 'b08',
  name: 'Băng Chuyền (B08)',
  duration: 180,
  plates: 4,
  world: 1,
  theme: 'diner',
  recipes: [
    { id: 'salad', weight: 1 }
  ],
  stars: [20, 60, 100],
  ascii: [
    '############',
    '##T.>..XW..#',
    '#L..v..>P.3#',
    '#C.1v..XQ.4#',
    '#...S..D..2#',
    '#..........#',
    '############'
  ]
};
