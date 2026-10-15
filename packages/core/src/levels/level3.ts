import { LevelDef } from '../types';

export const level3: LevelDef = {
  id: 'level3',
  name: 'Bếp Hỗn Loạn',
  duration: 210,
  plates: 5,
  world: 1,
  theme: 'diner',
  recipes: [
    { id: 'salad', weight: 1 },
    { id: 'burger', weight: 2 },
    { id: 'burger_tomato', weight: 2 }
  ],
  stars: [80, 180, 280],
  ascii: [
    '################',
    '#XTLBMXXXCCCXXX#',
    '#D....X.......X#',
    '#X.1..X..S.S..W#',
    '#X..XXXX..XXXXX#',
    '#Q..3......4..Q#',
    '#Q............Q#',
    '#X..XXXX..XXXXX#',
    '#X.2..X....S..X#',
    '#X....X.......W#',
    '#XXEXXXXPXXXXEX#'
  ]
};
