import type { PlayerCosmetic } from '@kitchen/core';

export function sanitizeName(raw: unknown): string {
  if (typeof raw !== 'string') return 'Player';
  const sanitized = [...raw].filter((character) => { const code = character.charCodeAt(0); return code >= 32 && (code < 127 || code > 159); }).join('').trim().replace(/\s+/g, ' ').slice(0, 16);
  return sanitized.length > 0 ? sanitized : 'Player';
}

export function sanitizeCosmetic(raw: unknown): PlayerCosmetic {
  const defaultCosmetic: PlayerCosmetic = { color: 0, hat: 0, species: 0 };
  if (!raw || typeof raw !== 'object') return defaultCosmetic;
  const c = raw as Record<string, unknown>;
  const color = typeof c.color === 'number' && Number.isInteger(c.color) && c.color >= 0 && c.color <= 3 ? c.color : 0;
  const hat = typeof c.hat === 'number' && Number.isInteger(c.hat) && c.hat >= 0 && c.hat <= 2 ? c.hat : 0;
  const species = typeof c.species === 'number' && Number.isInteger(c.species) && c.species >= 0 && c.species <= 1 ? c.species : 0;
  return { color, hat, species };
}
