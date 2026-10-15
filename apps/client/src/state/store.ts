import type { LobbyPlayer, Phase, ResultsPayload } from './types';

export type Screen = 'menu' | 'lobby' | 'game' | 'results';
export interface AppState {
  screen: Screen;
  phase: Phase;
  name: string;
  roomCode: string;
  lobby: { code: string; phase: Phase; levelId: string; hostId: string; players: LobbyPlayer[]; solo?: boolean } | null;
  results: ResultsPayload | null;
  error: string | null;
  ping: number;
  loading: boolean;
}

export type LobbyPayload = NonNullable<AppState['lobby']>;

export type Store<T extends object> = { get(): T; set(patch: Partial<T>): void; subscribe(listener: (state: T) => void): () => void; };

export function createStore<T extends object>(initial: T): Store<T> {
  let state = { ...initial };
  const listeners = new Set<(value: T) => void>();
  return {
    get: () => state,
    set: (patch) => {
      state = { ...state, ...patch };
      listeners.forEach((listener) => {
        try {
          listener(state);
        } catch (err) {
          console.error('[Store] Error in subscriber listener:', err);
        }
      });
    },
    subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
  };
}

export const appStore = createStore<AppState>({ screen: 'menu', phase: 'lobby', name: '', roomCode: '', lobby: null, results: null, error: null, ping: 0, loading: false });
