import { LevelDef } from '../types';

export const bep_lo_nuong: LevelDef = {
  id: 'bep_lo_nuong',
  name: 'Tiệm Pizza Đút Lò',
  duration: 180,
  plates: 4,
  world: 1,
  theme: 'diner',
  recipes: [
    { id: 'pizza', weight: 3 },
    { id: 'cheese_burger', weight: 2 },
    { id: 'tomato_soup', weight: 2 }
  ],
  stars: [80, 160, 260],
  ascii: [
    '##################',
    '#KZT.XUUX.XSsX..D#',
    '#....1.....2.....#',
    '#B..XCX...XCX....#',
    '#M...............#',
    '#L....PXWXX......#',
    '#................#',
    '#....Q.....Q.....#',
    '##################'
  ]
};
