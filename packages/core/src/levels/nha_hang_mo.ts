import { LevelDef } from '../types';

export const nha_hang_mo: LevelDef = {
  id: 'nha_hang_mo',
  name: 'Nhà Hàng Sân Vườn',
  duration: 180,
  plates: 4,
  world: 1,
  theme: 'diner',
  recipes: [
    { id: 'burger_tomato', weight: 2 },
    { id: 'steak_dinner', weight: 2 },
    { id: 'onion_soup', weight: 2 }
  ],
  stars: [80, 160, 260],
  ascii: [
    '##################',
    '#TLBMN.XCXCX.SsXD#',
    '#...1........2...#',
    '#................#',
    '#...XX.PXXWXX.XX.#',
    '#................#',
    '#..Q....Q....Q...#',
    '#................#',
    '#....Q....Q....Q.#',
    '##################'
  ]
};
