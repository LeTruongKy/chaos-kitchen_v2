import type { LobbyPlayer, Phase } from '@kitchen/core';
export type { LobbyPlayer, Phase };
export interface ResultsPayload { score: number; stars: number; served: number; expired: number; maxStreak: number; servedByPlayer: Record<string, number>; }
