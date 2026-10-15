import { LevelDef } from '../types';

export const dao_kho_bau: LevelDef = {
  id: 'dao_kho_bau',
  name: 'Vịnh Hải Tặc Pizza',
  theme: 'ship',
  world: 2,
  duration: 180,
  plates: 4,
  recipes: [
    { id: 'pizza', weight: 3 },
    { id: 'mushroom_steak', weight: 2 },
    { id: 'onion_soup', weight: 2 }
  ],
  stars: [80, 170, 270],
  ascii: [
    '###################',
    '#KZTMHN.XUUXXSsX.D#',
    '#..1........2.....#',
    '#..XCX..~~~..P....#',
    '#.......~~~..X..Q.#',
    '#..XCX..~~~.......#',
    '#..3....~~~..W..Q.#',
    '#.......4....X....#',
    '#E...........X..Q.#',
    '###################'
  ]
};
