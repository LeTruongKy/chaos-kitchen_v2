import { LevelDef } from '../types';

export const level2: LevelDef = {
  id: 'level2',
  name: 'Hai Bên Quầy',
  duration: 180,
  plates: 4,
  world: 1,
  theme: 'diner',
  recipes: [
    { id: 'salad', weight: 1 },
    { id: 'burger', weight: 2 },
    { id: 'burger_tomato', weight: 1 }
  ],
  stars: [60, 140, 220],
  ascii: [
    '##############',
    '#.TLBMXW.....#',
    '#............#',
    '#D..1....2..Q#',
    '#............#',
    '#C..3....4..P#',
    '#............#',
    '#.XXE.XSSXX.Q#',
    '##############'
  ]
};
