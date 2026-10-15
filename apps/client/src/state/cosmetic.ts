import type { PlayerCosmetic } from '@kitchen/core';

export const COSMETIC_STORAGE_KEY = 'ck_cosmetic';

export const DEFAULT_COSMETIC: PlayerCosmetic = {
  color: 0,
  hat: 0,
  species: 0
};

export function loadCosmetic(): PlayerCosmetic {
  try {
    if (typeof localStorage === 'undefined') return { ...DEFAULT_COSMETIC };
    const raw = localStorage.getItem(COSMETIC_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_COSMETIC };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_COSMETIC };
    const color = typeof parsed.color === 'number' && Number.isInteger(parsed.color) && parsed.color >= 0 && parsed.color <= 3 ? parsed.color : 0;
    const hat = typeof parsed.hat === 'number' && Number.isInteger(parsed.hat) && parsed.hat >= 0 && parsed.hat <= 2 ? parsed.hat : 0;
    const species = typeof parsed.species === 'number' && Number.isInteger(parsed.species) && parsed.species >= 0 && parsed.species <= 1 ? parsed.species : 0;
    return { color, hat, species };
  } catch {
    return { ...DEFAULT_COSMETIC };
  }
}

export function saveCosmetic(cosmetic: PlayerCosmetic): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(COSMETIC_STORAGE_KEY, JSON.stringify(cosmetic));
    }
  } catch {
    // Ignore storage errors
  }
}
