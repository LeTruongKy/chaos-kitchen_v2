import { LevelDef } from '../types';

export const dai_tiec_ngan_ha: LevelDef = {
  id: 'dai_tiec_ngan_ha',
  name: 'Đại Tiệc Ngân Hà',
  theme: 'space',
  world: 3,
  duration: 210,
  plates: 5,
  recipes: [
    { id: 'pizza', weight: 3 },
    { id: 'cheese_burger', weight: 2 },
    { id: 'mushroom_steak', weight: 2 },
    { id: 'onion_soup', weight: 2 }
  ],
  stars: [90, 190, 300],
  ascii: [
    '####################',
    '#KZTB.XUUXXSsX...ED#',
    '#...1........2.....#',
    '#M..XCX....XCX.....#',
    '#H.........P..W..Q.#',
    '#N...>>>>>>X..X....#',
    '#..3...............#',
    '#..........X..W..Q.#',
    '#..4.......X..X....#',
    '#.............Q..Q.#',
    '####################'
  ]
};
