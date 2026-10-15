import { LevelDef } from '../types.js';
import { tutorial } from './tutorial.js';
import { level1 } from './level1.js';
import { bep_doi } from './bep_doi.js';
import { nha_hang_mo } from './nha_hang_mo.js';
import { bep_lo_nuong } from './bep_lo_nuong.js';
import { quan_an_duong_pho } from './quan_an_duong_pho.js';
import { tau_hai_tac } from './tau_hai_tac.js';
import { dao_kho_bau } from './dao_kho_bau.js';
import { tram_vu_tru } from './tram_vu_tru.js';
import { dai_tiec_ngan_ha } from './dai_tiec_ngan_ha.js';
import { level2 } from './level2.js';
import { level3 } from './level3.js';
import { levelB08 } from './levelB08.js';
import { test_carry } from './test_carry.js';

export const PLAYABLE_LEVELS: LevelDef[] = [
  tutorial,
  level1,
  bep_doi,
  nha_hang_mo,
  bep_lo_nuong,
  quan_an_duong_pho,
  tau_hai_tac,
  dao_kho_bau,
  tram_vu_tru,
  dai_tiec_ngan_ha,
];

export const ALL_LEVELS: LevelDef[] = [
  ...PLAYABLE_LEVELS,
  level2,
  level3,
  levelB08,
  test_carry,
];

// Giữ export LEVELS trỏ về PLAYABLE_LEVELS để tương thích ngược với code cũ
export const LEVELS: LevelDef[] = PLAYABLE_LEVELS;

export function getLevel(id: string): LevelDef | undefined {
  return ALL_LEVELS.find(l => l.id === id);
}

export {
  tutorial,
  level1,
  bep_doi,
  nha_hang_mo,
  bep_lo_nuong,
  quan_an_duong_pho,
  tau_hai_tac,
  dao_kho_bau,
  tram_vu_tru,
  dai_tiec_ngan_ha,
  level2,
  level3,
  levelB08,
  test_carry,
};
