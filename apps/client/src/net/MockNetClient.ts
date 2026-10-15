import { ROOM_CODE_ALPHABET, PLAYER_COLORS, type LobbyPlayer, type PlayerCosmetic } from '@kitchen/core';
import type { AppState, LobbyPayload, Store } from '../state/store';

export interface MenuLobbyClient { createRoom(name: string): void; joinByCode(name: string, code: string): void; quickMatch(name: string): void; leave(): void; ready(ready: boolean): void; selectLevel(levelId: string): void; start(): void; setCosmetic?(cosmetic: PlayerCosmetic): void; }
const LOCAL_PLAYER_ID = 'local-player';
function localPlayer(name: string): LobbyPlayer { return { id: LOCAL_PLAYER_ID, name, color: 0xe74c3c, ready: false, connected: true, cosmetic: { color: 0, hat: 0, species: 0 } }; }
function codeFromName(name: string): string { let code = ''; for (const character of name.toUpperCase()) { if (ROOM_CODE_ALPHABET.includes(character)) code += character; if (code.length === 4) return code; } return 'ABCD'; }

/** Temporary UI-only implementation; T17 replaces it with the real network client. */
export class MockNetClient implements MenuLobbyClient {
  constructor(private readonly store: Store<AppState>) {}
  createRoom(name: string): void { this.openLobby(name, codeFromName(name)); }
  joinByCode(name: string, code: string): void {
    const normalizedCode = code.toUpperCase();
    if (normalizedCode.length !== 4) { this.store.set({ error: 'Mã phòng phải gồm 4 ký tự.' }); return; }
    const host: LobbyPlayer = { id: 'mock-host', name: 'Đầu bếp trưởng', color: 0x3498db, ready: true, connected: true, cosmetic: { color: 1, hat: 1, species: 0 } };
    this.store.set({ screen: 'lobby', name, roomCode: normalizedCode, lobby: { code: normalizedCode, phase: 'lobby', levelId: 'level1', hostId: host.id, players: [host, localPlayer(name)] }, error: null });
  }
  quickMatch(name: string): void { this.openLobby(name, 'QUICK'); }
  leave(): void { this.store.set({ screen: 'menu', lobby: null, roomCode: '' }); }
  ready(ready: boolean): void { this.updateLocalPlayer({ ready }); }
  selectLevel(levelId: string): void { const lobby = this.store.get().lobby; if (lobby?.hostId === LOCAL_PLAYER_ID) this.store.set({ lobby: { ...lobby, levelId } }); }
  start(): void { const lobby = this.store.get().lobby; if (lobby?.hostId === LOCAL_PLAYER_ID && lobby.players.every((player) => player.id === LOCAL_PLAYER_ID || player.ready)) this.store.set({ error: 'Bản dựng giao diện: T17 sẽ bắt đầu ván qua mạng.' }); }
  setCosmetic(cosmetic: PlayerCosmetic): void {
    const colorHex = PLAYER_COLORS[cosmetic.color] ?? PLAYER_COLORS[0]!;
    this.updateLocalPlayer({ color: colorHex, cosmetic });
  }
  private openLobby(name: string, code: string): void { const player = localPlayer(name); const lobby: LobbyPayload = { code, phase: 'lobby', levelId: 'level1', hostId: player.id, players: [player] }; this.store.set({ screen: 'lobby', name, roomCode: code, lobby, error: null }); }
  private updateLocalPlayer(patch: Partial<LobbyPlayer>): void { const lobby = this.store.get().lobby; if (!lobby) return; this.store.set({ lobby: { ...lobby, players: lobby.players.map((player) => player.id === LOCAL_PLAYER_ID ? { ...player, ...patch } : player) } }); }
}
export { LOCAL_PLAYER_ID };
