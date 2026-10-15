export type Difficulty = 'Introduction' | 'Easy' | 'Medium' | 'Hard';

export interface LevelMetadata {
  id: string;
  world: number;
  difficulty: Difficulty;
  label: string;
}

export const LEVEL_META: Record<string, LevelMetadata> = {
  tutorial: { id: 'tutorial', world: 1, difficulty: 'Introduction', label: 'Học Việc' },
  level1: { id: 'level1', world: 1, difficulty: 'Easy', label: 'Quán Burger Đầu Tiên' },
  bep_doi: { id: 'bep_doi', world: 1, difficulty: 'Easy', label: 'Bếp Đôi Súp Nóng' },
  nha_hang_mo: { id: 'nha_hang_mo', world: 1, difficulty: 'Medium', label: 'Nhà Hàng Sân Vườn' },
  bep_lo_nuong: { id: 'bep_lo_nuong', world: 1, difficulty: 'Medium', label: 'Tiệm Pizza Đút Lò' },
  quan_an_duong_pho: { id: 'quan_an_duong_pho', world: 2, difficulty: 'Medium', label: 'Quán Nướng Bến Cảng' },
  tau_hai_tac: { id: 'tau_hai_tac', world: 2, difficulty: 'Hard', label: 'Boong Tàu Hải Tặc' },
  dao_kho_bau: { id: 'dao_kho_bau', world: 2, difficulty: 'Hard', label: 'Vịnh Hải Tặc Pizza' },
  tram_vu_tru: { id: 'tram_vu_tru', world: 3, difficulty: 'Hard', label: 'Trạm Vũ Trụ' },
  dai_tiec_ngan_ha: { id: 'dai_tiec_ngan_ha', world: 3, difficulty: 'Hard', label: 'Đại Tiệc Ngân Hà' },
};

export function getLevelMeta(id: string): LevelMetadata {
  return LEVEL_META[id] ?? {
    id,
    world: 1,
    difficulty: 'Easy',
    label: id
  };
}
