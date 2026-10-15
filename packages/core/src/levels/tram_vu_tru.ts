import { LevelDef } from '../types';

export const tram_vu_tru: LevelDef = {
  id: 'tram_vu_tru',
  name: 'Trạm Vũ Trụ',
  theme: 'space',
  world: 3,
  duration: 180,
  plates: 4,
  recipes: [
    { id: 'steak_dinner', weight: 2 },
    { id: 'burger_tomato', weight: 2 }
  ],
  stars: [70, 160, 250],
  ascii: [
    '################',
    '#TLBMS.....PWD.#',
    '#..............#',
    '#....C....Q....#',
    '#....vXXXX^...Q#',
    '#..1.vXXXX^.2..#',
    '#....vXXXX^...Q#',
    '#..3.vXXXX^.4..#',
    '#....>>>>>^....#',
    '#..............#',
    '#..............#',
    '################'
  ]
};
