import { PlayerState, StationState, Order, PlayerInput, RecipeId, EventType, Projectile } from './types';

export const MSG = {
  READY: 'ready',
  SELECT_LEVEL: 'select_level',
  START: 'start',
  INPUT: 'input',
  EMOTE: 'emote',
  PING: 'ping',
  BACK_TO_LOBBY: 'back_to_lobby',
  LOBBY: 'lobby',
  PHASE: 'phase',
  SNAPSHOT: 'snapshot',
  EVENT: 'event',
  RESULTS: 'results',
  PONG: 'pong',
  ERROR: 'error',
  SWITCH_CHEF: 'switch_chef',
  SET_SOLO: 'set_solo',
  SET_COSMETIC: 'set_cosmetic',
  VOICE_SIGNAL: 'voice_signal',
  VOICE_STATE: 'voice_state'
} as const;

export interface PlayerCosmetic {
  color: number;    // 0..3 index in PLAYER_COLORS
  hat: number;      // 0..2 (0=tall chef hat, 1=beret/flat, 2=no hat)
  species: number;  // 0..1 (0=human, 1=cat)
}

export interface Snapshot {
  tick: number; timeLeft: number; score: number;
  players: PlayerState[];
  stations: StationState[];
  orders: Order[];
  projectiles: Projectile[];
  customers: import('./types').CustomerState[];
  streak: number;
  activeChefId?: string;
}

export interface LobbyPlayer {
  id: string;
  name: string;
  color: number;
  ready: boolean;
  connected: boolean;
  cosmetic?: PlayerCosmetic;
}

export type Phase = 'lobby' | 'countdown' | 'playing' | 'finished';

export interface ClientMessages {
  [MSG.READY]: { ready: boolean };
  [MSG.SELECT_LEVEL]: { levelId: string };
  [MSG.START]: Record<string, never>; // {}
  [MSG.INPUT]: PlayerInput;
  [MSG.EMOTE]: { id: 0 | 1 | 2 | 3 };
  [MSG.PING]: { t: number };
  [MSG.BACK_TO_LOBBY]: Record<string, never>; // {}
  [MSG.SWITCH_CHEF]: Record<string, never>; // {}
  [MSG.SET_SOLO]: { solo: boolean };
  [MSG.SET_COSMETIC]: PlayerCosmetic;
  [MSG.VOICE_SIGNAL]: { targetId: string; signal: unknown };
  [MSG.VOICE_STATE]: { muted: boolean; speaking: boolean };
}

export interface ServerMessages {
  [MSG.LOBBY]: {
    code: string;
    phase: Phase;
    levelId: string;
    hostId: string;
    players: LobbyPlayer[];
    solo: boolean;
  };
  [MSG.PHASE]: { phase: Phase; countdown?: number };
  [MSG.SNAPSHOT]: Snapshot;
  [MSG.EVENT]: { type: EventType; x?: number; y?: number; playerId?: string; recipe?: RecipeId };
  [MSG.RESULTS]: { score: number; stars: number; served: number; expired: number };
  [MSG.EMOTE]: { playerId: string; id: 0 | 1 | 2 | 3 };
  [MSG.PONG]: { t: number };
  [MSG.ERROR]: { code: string; message: string };
  [MSG.VOICE_SIGNAL]: { fromId: string; signal: unknown };
  [MSG.VOICE_STATE]: { playerId: string; muted: boolean; speaking: boolean };
}

export function isPlayerInput(x: unknown): x is PlayerInput {
  if (typeof x !== 'object' || x === null) return false;
  const obj = x as Record<string, unknown>;

  if (typeof obj.seq !== 'number' || !Number.isInteger(obj.seq) || obj.seq < 0) return false;
  if (obj.mx !== -1 && obj.mx !== 0 && obj.mx !== 1) return false;
  if (obj.my !== -1 && obj.my !== 0 && obj.my !== 1) return false;
  if (typeof obj.act !== 'boolean') return false;
  if (typeof obj.interact !== 'boolean') return false;
  if (typeof obj.dash !== 'boolean') return false;
  if (typeof obj.throw !== 'boolean') return false;

  return true;
}
