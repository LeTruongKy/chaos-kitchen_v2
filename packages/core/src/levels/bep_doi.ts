import { LevelDef } from '../types';

export const bep_doi: LevelDef = {
  id: 'bep_doi',
  name: 'Bếp Đôi Súp Nóng',
  duration: 180,
  plates: 4,
  world: 1,
  theme: 'diner',
  recipes: [
    { id: 'burger_tomato', weight: 2 },
    { id: 'tomato_soup', weight: 2 },
    { id: 'cheese_salad', weight: 1 }
  ],
  stars: [60, 140, 220],
  ascii: [
    '################',
    '#XCX.XSsX.P....#',
    '#..1......X..Q.#',
    '#T...XX........#',
    '#L...XX...W..Q.#',
    '#B........X....#',
    '#M...XX......Q.#',
    '#Z...XX...X....#',
    '#D.C....2.X....#',
    '################'
  ]
};
