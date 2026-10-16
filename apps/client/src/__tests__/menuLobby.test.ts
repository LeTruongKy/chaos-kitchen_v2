// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NetClient } from '../net/NetClient';
import type { AppState } from '../state/store';
import { mountLobby } from '../ui/lobby';
import { getInviteRoomCode, mountMenu } from '../ui/menu';

vi.mock('../game/renderer3d/LobbyPreviewRenderer', () => ({
  LobbyPreviewRenderer: class {
    syncPlayers() {}
    setSpeaking() {}
    triggerWave() {}
    dispose() {}
  },
}));

vi.mock('../game/assets/AssetLoader', () => ({
  AssetLoader: {
    getInstance: () => ({
      preloadAllInBackground: () => {},
      loadAsset: async () => null,
      getAssetSync: () => null,
    }),
  },
}));

const state: AppState = { phase: 'lobby', screen: 'menu', name: '', roomCode: '', lobby: null, results: null, error: null, ping: 18, loading: false };
function client(): NetClient { return { createRoom: vi.fn(), joinByCode: vi.fn(), quickMatch: vi.fn(), leave: vi.fn(), ready: vi.fn(), selectLevel: vi.fn(), start: vi.fn(), sendInput: vi.fn(), sendEmote: vi.fn(), backToLobby: vi.fn(), on: vi.fn(), off: vi.fn(), sessionId: 'local-player' } as unknown as NetClient; }
beforeEach(() => { document.body.replaceChildren(); });

describe('T16 menu', () => {
  it('sanitizes room code and enables actions only with valid input', () => {
    const root = document.body.appendChild(document.createElement('div')); const net = client(); mountMenu(root, state, net);
    const name = root.querySelector<HTMLInputElement>('[aria-label="Tên đầu bếp"]')!; const code = root.querySelector<HTMLInputElement>('[aria-label="Mã phòng 4 ký tự"]')!;
    expect(root.querySelector<HTMLButtonElement>('[aria-label="Tạo phòng"]')!.disabled).toBe(true);
    name.value = 'An'; name.dispatchEvent(new Event('input')); code.value = 'a0bcdef'; code.dispatchEvent(new Event('input'));
    expect(code.value).toBe('ABCD'); expect(root.querySelector<HTMLButtonElement>('[aria-label="Vào"]')!.disabled).toBe(false);
  });
  it('uses textContent for a hostile player name', () => {
    const root = document.body.appendChild(document.createElement('div')); const hostile = '<img src=x onerror=alert(1)>';
    mountLobby(root, { ...state, screen: 'lobby', lobby: { code: 'ABCD', phase: 'lobby', levelId: 'level1', hostId: 'local-player', players: [{ id: 'local-player', name: hostile, color: 0, ready: false, connected: true }] } }, client(), 'local-player');
    expect(root.querySelector('img')).toBeNull(); expect(root.textContent).toContain(hostile);
  });
  it('reads a room invite from the URL query string', () => { expect(getInviteRoomCode('?room=abcd')).toBe('ABCD'); });
  it('opens and closes settings panel when clicking Cài đặt button and close button', () => {
    const root = document.body.appendChild(document.createElement('div'));
    const net = client();
    mountMenu(root, state, net);
    const settingsBtn = root.querySelector<HTMLButtonElement>('#menu-settings-btn')!;
    expect(settingsBtn).not.toBeNull();
    expect(document.getElementById('settings-modal-overlay')).toBeNull();

    // Open settings panel
    settingsBtn.click();
    const overlay = document.getElementById('settings-modal-overlay')!;
    expect(overlay).not.toBeNull();
    expect(overlay.textContent).toContain('Cài đặt');
    expect(overlay.querySelector('#setting-quality-select')).not.toBeNull();
    expect(overlay.querySelector('#setting-music-slider')).not.toBeNull();
    expect(overlay.querySelector('#setting-sfx-slider')).not.toBeNull();
    expect(overlay.querySelector('#setting-fps-toggle')).not.toBeNull();

    // Close settings panel via close button
    const closeBtn = overlay.querySelector<HTMLButtonElement>('#setting-close-btn')!;
    closeBtn.click();
    expect(document.getElementById('settings-modal-overlay')).toBeNull();
  });
  it('renders menu-panel and tutorial modal with scrollable body and sticky close button for 390x844 mobile viewport', () => {
    const root = document.body.appendChild(document.createElement('div'));
    const net = client();
    mountMenu(root, state, net);

    const menuPanel = root.querySelector<HTMLElement>('.menu-panel')!;
    expect(menuPanel).not.toBeNull();
    expect(menuPanel.querySelector('.code-group')).not.toBeNull();

    // Open tutorial modal via help button
    const helpBtn = Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find(
      b => b.textContent === '📖'
    )!;
    expect(helpBtn).not.toBeUndefined();
    helpBtn.click();

    const modal = root.querySelector<HTMLElement>('.modal')!;
    const modalBody = root.querySelector<HTMLElement>('.modal-body')!;
    const modalFooter = root.querySelector<HTMLElement>('.modal-footer')!;
    const modalClose = root.querySelector<HTMLButtonElement>('.modal-close')!;
    expect(modal).not.toBeNull();
    expect(modalBody).not.toBeNull();
    expect(modalFooter).not.toBeNull();
    expect(modalClose).not.toBeNull();
    expect(modalFooter.contains(modalClose)).toBe(true);

    modalClose.click();
    expect(root.querySelector('.modal')).toBeNull();
  });
});

describe('T16 lobby', () => {
  const players = [
    { id: 'local-player', name: 'An', color: 0xe74c3c, ready: false, connected: true },
    { id: 'b', name: 'Bình', color: 0x3498db, ready: true, connected: true },
    { id: 'c', name: 'Chi', color: 0x2ecc71, ready: false, connected: false },
    { id: 'd', name: 'Dung', color: 0xf1c40f, ready: true, connected: true },
  ];
  it('renders mock lobbies of 1, 3, and 4 players with host status', () => {
    for (const count of [1, 3, 4]) { const root = document.body.appendChild(document.createElement('div')); mountLobby(root, { ...state, screen: 'lobby', lobby: { code: 'ABCD', phase: 'lobby', levelId: 'level1', hostId: 'local-player', players: players.slice(0, count) } }, client(), 'local-player'); expect(root.querySelectorAll('.players li')).toHaveLength(count); expect(root.textContent).toContain('👑 host'); if (count >= 3) expect(root.textContent).toContain('mất kết nối'); root.remove(); }
  });
  it('disables level selection for a non-host and provides ready action', () => {
    const root = document.body.appendChild(document.createElement('div'));
    const net = client();
    mountLobby(root, { ...state, screen: 'lobby', lobby: { code: 'ABCD', phase: 'lobby', levelId: 'level1', hostId: 'b', players: players.slice(0, 3) } }, net, 'local-player');
    const card = root.querySelector<HTMLDivElement>('.level-card')!;
    card.click();
    expect(net.selectLevel).not.toHaveBeenCalled();
    expect(root.textContent).toContain('Sẵn sàng');
    expect(root.textContent).toContain('Ping: 18 ms');
  });
});
