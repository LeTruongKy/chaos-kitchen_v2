import { LevelDef } from '../types';

export const quan_an_duong_pho: LevelDef = {
  id: 'quan_an_duong_pho',
  name: 'Quán Nướng Bến Cảng',
  theme: 'ship',
  world: 2,
  duration: 180,
  plates: 4,
  recipes: [
    { id: 'mushroom_steak', weight: 2 },
    { id: 'mushroom_soup', weight: 2 },
    { id: 'cheese_salad', weight: 1 }
  ],
  stars: [70, 150, 240],
  ascii: [
    '#################',
    '#MHTLZXSsX......#',
    '#..1.....P..Q...#',
    '#........X......#',
    '#.XCXCX......Q..#',
    '#..2...3........#',
    '#......4.W..Q...#',
    '#DE......X......#',
    '#################'
  ]
};
