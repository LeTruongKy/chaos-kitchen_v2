import { Client, Room } from 'colyseus.js';
import { getServerUrl, saveCustomServerUrl } from './serverUrl';
import { translateError } from './errors';
import type { AppState, Store, LobbyPayload } from '../state/store';
import type { PlayerInput, Snapshot, GameEvent, Phase, PlayerCosmetic } from '@kitchen/core';
import type { ResultsPayload } from '../state/types';
import { showToast } from '../ui/toast';
import { loadCosmetic } from '../state/cosmetic';

export function screenForPhase(phase: Phase, hasResults: boolean): AppState['screen'] {
  if (phase === 'lobby') return 'lobby';
  if (phase === 'countdown' || phase === 'playing') return 'game';
  if (phase === 'finished') return hasResults ? 'results' : 'game';
  return 'lobby';
}

type EmitterMap = {
  lobby: (payload: LobbyPayload) => void;
  phase: (payload: { phase: Phase; countdown?: number }) => void;
  snapshot: (payload: Snapshot) => void;
  event: (payload: GameEvent) => void;
  results: (payload: ResultsPayload) => void;
  emote: (payload: { playerId: string; id: 0 | 1 | 2 | 3 }) => void;
  voice_signal: (payload: { fromId: string; signal: unknown }) => void;
  voice_state: (payload: { playerId: string; muted: boolean; speaking: boolean }) => void;
  error: (payload: { code: string; message: string }) => void;
  disconnect: () => void;
  ping: (rtt: number) => void;
};

export class NetClient {
  private client: Client;
  private currentEndpoint: string;
  private room?: Room;
  public sessionId?: string;
  private reconnectInterval?: number;
  private pingInterval?: number;
  private listeners: { [K in keyof EmitterMap]?: EmitterMap[K][] } = {};
  private reconnecting = false;

  constructor(private readonly store: Store<AppState>) {
    this.currentEndpoint = getServerUrl();
    this.client = new Client(this.currentEndpoint);
  }

  public setServerUrl(url: string): string {
    const saved = saveCustomServerUrl(url);
    this.refreshEndpoint();
    return this.currentEndpoint;
  }

  public getEndpoint(): string {
    return this.currentEndpoint;
  }

  private refreshEndpoint() {
    const nextUrl = getServerUrl();
    if (nextUrl !== this.currentEndpoint) {
      this.currentEndpoint = nextUrl;
      this.client = new Client(this.currentEndpoint);
    }
  }

  on<K extends keyof EmitterMap>(event: K, cb: EmitterMap[K]) {
    if (!this.listeners[event]) this.listeners[event] = [];
    (this.listeners[event] as unknown as EmitterMap[K][]).push(cb);
  }

  off<K extends keyof EmitterMap>(event: K, cb: EmitterMap[K]) {
    if (!this.listeners[event]) return;
    const filtered = (this.listeners[event] as unknown as EmitterMap[K][]).filter((l) => l !== cb);
    (this.listeners as Record<string, unknown>)[event as string] = filtered;
  }

  private emit<K extends keyof EmitterMap>(event: K, ...args: Parameters<EmitterMap[K]>) {
    (this.listeners[event] as unknown as EmitterMap[K][])?.forEach(cb => {
      const fn = cb as (...a: unknown[]) => void;
      fn(...args);
    });
  }

  private attachRoomHandlers(room: Room) {
    this.room = room;
    this.sessionId = room.sessionId;

    // Save token for reconnection
    if (typeof globalThis.sessionStorage !== 'undefined') {
      globalThis.sessionStorage.setItem('reconnectionToken', room.reconnectionToken);
    }

    room.onMessage('lobby', (payload: LobbyPayload) => {
      const updates: Partial<AppState> = {
        lobby: payload,
        roomCode: payload.code,
        phase: payload.phase,
        screen: screenForPhase(payload.phase, this.store.get().results !== null)
      };
      if (payload.phase === 'lobby') {
        updates.results = null;
      }
      this.store.set(updates);
      this.emit('lobby', payload);
    });

    room.onMessage('phase', (payload: { phase: Phase; countdown?: number }) => {
      const hasResults = this.store.get().results !== null;
      const updates: Partial<AppState> = {
        phase: payload.phase,
        screen: screenForPhase(payload.phase, hasResults)
      };
      if (payload.phase === 'lobby') {
        updates.results = null;
      }
      this.store.set(updates);
      this.emit('phase', payload);
    });

    room.onMessage('snapshot', (payload: Snapshot) => {
      this.emit('snapshot', payload);
    });

    room.onMessage('event', (payload: GameEvent) => {
      this.emit('event', payload);
    });

    room.onMessage('results', (payload: ResultsPayload) => {
      this.store.set({ results: payload, screen: 'results' });
      this.emit('results', payload);
    });

    room.onMessage('emote', (payload: { playerId: string; id: 0 | 1 | 2 | 3 }) => {
      this.emit('emote', payload);
    });

    room.onMessage('voice_signal', (payload: { fromId: string; signal: unknown }) => {
      this.emit('voice_signal', payload);
    });

    room.onMessage('voice_state', (payload: { playerId: string; muted: boolean; speaking: boolean }) => {
      this.emit('voice_state', payload);
    });

    room.onMessage('pong', (payload: { t: number }) => {
      const rtt = globalThis.performance.now() - payload.t;
      const state = this.store.get();
      const currentPing = state.ping || rtt;
      const smoothedPing = Math.round(currentPing * 0.8 + rtt * 0.2);
      this.store.set({ ping: smoothedPing });
      this.emit('ping', smoothedPing);
    });

    room.onMessage('error', (payload: { code: string; message: string }) => {
      this.store.set({ error: translateError(payload.code, payload.message) });
      this.emit('error', payload);
    });

    room.onLeave((code) => {
      this.stopPing();
      this.emit('disconnect');
      if (code !== 1000 && code !== 4000) {
        if (!this.reconnecting) {
          this.reconnecting = true;
          this.tryReconnect();
        }
      } else {
        this.store.set({ screen: 'menu', lobby: null, roomCode: '', results: null });
      }
    });

    room.onError((code, message) => {
      this.store.set({ error: translateError(code, message) });
    });

    this.startPing();
  }

  private startPing() {
    this.stopPing();
    this.pingInterval = globalThis.setInterval(() => {
      this.room?.send('ping', { t: globalThis.performance.now() });
    }, 2000) as unknown as number;
  }

  private stopPing() {
    if (this.pingInterval) {
      globalThis.clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }
  }

  private async tryReconnect() {
    let attempts = 0;
    if (typeof globalThis.sessionStorage === 'undefined') return;
    const token = globalThis.sessionStorage.getItem('reconnectionToken');
    if (!token) return;

    showToast('Đang kết nối lại…');

    const tryConnecting = async () => {
      if (attempts >= 6) {
        this.store.set({ error: 'Không thể kết nối lại', screen: 'menu', lobby: null, roomCode: '' });
        this.reconnecting = false;
        return;
      }
      attempts++;
      try {
        const room = await this.client.reconnect(token);
        this.reconnecting = false;
        this.attachRoomHandlers(room);
        showToast('Đã kết nối lại');

        // Restore screen if phase is known from lobby message, which should be sent automatically upon reconnect
      } catch {
        setTimeout(tryConnecting, 2000);
      }
    };
    tryConnecting();
  }

  private cleanupPreviousSession(clearUrlInvite = false) {
    this.stopPing();
    this.reconnecting = false;
    if (typeof globalThis.sessionStorage !== 'undefined') {
      globalThis.sessionStorage.removeItem('reconnectionToken');
    }
    const currentRoom = this.room;
    this.room = undefined;
    if (currentRoom) {
      try {
        currentRoom.removeAllListeners();
        currentRoom.leave(true);
      } catch {
        // Ignore
      }
    }
    if (clearUrlInvite && typeof window !== 'undefined' && window.location.search.includes('room=')) {
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('room');
        window.history.replaceState({}, '', url.pathname + url.search + url.hash);
      } catch {
        // Ignore
      }
    }
  }

  async createRoom(name: string, isPublic = false) {
    this.cleanupPreviousSession(true);
    this.refreshEndpoint();
    this.store.set({ loading: true, error: null, lobby: null, results: null });
    try {
      const room = await Promise.race([
        this.client.create('kitchen', { name, public: isPublic, version: 2, cosmetic: loadCosmetic() }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))
      ]);
      this.store.set({ name, roomCode: room.roomId, error: null, loading: false });
      this.attachRoomHandlers(room);
    } catch (e) {
      const err = e as { code?: number; message?: string };
      this.store.set({ error: err.message === 'timeout' ? 'Không thể kết nối máy chủ' : translateError(err.code || 0, err.message), loading: false });
    }
  }

  async joinByCode(name: string, code: string) {
    this.cleanupPreviousSession(false);
    this.refreshEndpoint();
    this.store.set({ loading: true, error: null, lobby: null, results: null });
    try {
      const room = await Promise.race([
        this.client.joinById(code.toUpperCase(), { name, version: 2, cosmetic: loadCosmetic() }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))
      ]);
      this.store.set({ name, roomCode: room.roomId, error: null, loading: false });
      this.attachRoomHandlers(room);
    } catch (e) {
      const err = e as { code?: number; message?: string };
      this.store.set({ error: err.message === 'timeout' ? 'Không thể kết nối máy chủ' : translateError(err.code || 0, err.message), loading: false });
    }
  }

  async quickMatch(name: string) {
    this.cleanupPreviousSession(true);
    this.refreshEndpoint();
    this.store.set({ loading: true, error: null, lobby: null, results: null });
    try {
      const room = await Promise.race([
        this.client.joinOrCreate('kitchen', { name, public: true, version: 2, cosmetic: loadCosmetic() }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))
      ]);
      this.store.set({ name, roomCode: room.roomId, error: null, loading: false });
      this.attachRoomHandlers(room);
    } catch (e) {
      const err = e as { code?: number; message?: string };
      this.store.set({ error: err.message === 'timeout' ? 'Không thể kết nối máy chủ' : translateError(err.code || 0, err.message), loading: false });
    }
  }

  leave() {
    this.cleanupPreviousSession(true);
    this.store.set({ screen: 'menu', phase: 'lobby', lobby: null, roomCode: '', results: null });
  }

  ready(ready: boolean) {
    this.room?.send('ready', { ready });
  }

  selectLevel(levelId: string) {
    this.room?.send('select_level', { levelId });
  }

  setCosmetic(cosmetic: PlayerCosmetic) {
    this.room?.send('set_cosmetic', cosmetic);
  }

  start() {
    this.room?.send('start', {});
  }

  sendInput(input: PlayerInput) {
    this.room?.send('input', input);
  }

  sendEmote(id: 0 | 1 | 2 | 3) {
    this.room?.send('emote', { id });
  }

  backToLobby(nextLevelId?: string) {
    this.room?.send('back_to_lobby', nextLevelId ? { nextLevelId } : {});
  }

  sendSwitchChef() {
    this.room?.send('switch_chef', {});
  }

  setSolo(solo: boolean) {
    this.room?.send('set_solo', { solo });
  }

  sendVoiceSignal(toId: string, signal: unknown) {
    this.room?.send('voice_signal', { toId, signal });
  }

  sendVoiceState(muted: boolean, speaking: boolean) {
    this.room?.send('voice_state', { muted, speaking });
  }
}
