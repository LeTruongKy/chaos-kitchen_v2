// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NetClient } from '../net/NetClient';
import type { AppState } from '../state/store';
import { mountLobby } from '../ui/lobby';
import { LEVEL_META } from '../game/levelMeta';
import { loadCosmetic, saveCosmetic } from '../state/cosmetic';
import {
  setSharedWebGLRendererForTesting,
  getSharedRendererCreatedCount
} from '../game/renderer3d/SharedWebGL';

const baseState: AppState = {
  phase: 'lobby',
  screen: 'lobby',
  name: 'LocalPlayer',
  roomCode: 'ABCD',
  lobby: null,
  results: null,
  error: null,
  ping: 24,
  loading: false
};

function createMockNetClient(): NetClient {
  return {
    createRoom: vi.fn(),
    joinByCode: vi.fn(),
    quickMatch: vi.fn(),
    leave: vi.fn(),
    ready: vi.fn(),
    selectLevel: vi.fn(),
    start: vi.fn(),
    sendInput: vi.fn(),
    sendEmote: vi.fn(),
    backToLobby: vi.fn(),
    setCosmetic: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    sessionId: 'p1'
  } as unknown as NetClient;
}

beforeEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
});

describe('Lobby Automated Requirements', () => {
  it('Lobby 4 người: 4 slot có tên, màu, host; slot trống là placeholder', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const net = createMockNetClient();

    // Test with 2 players (2 slots filled, 2 placeholders)
    const lobby2 = {
      code: 'TEST',
      phase: 'lobby' as const,
      levelId: 'level1',
      hostId: 'p1',
      players: [
        { id: 'p1', name: 'Chef1', color: 0, ready: true, connected: true, cosmetic: { color: 0, hat: 1, species: 0 } },
        { id: 'p2', name: 'Chef2', color: 1, ready: false, connected: true, cosmetic: { color: 1, hat: 0, species: 1 } }
      ]
    };

    let handle = mountLobby(root, { ...baseState, lobby: lobby2 }, net, 'p1');
    const slots = root.querySelectorAll('.players .player-slot');
    const placeholders = root.querySelectorAll('.placeholders .slot-empty');
    expect(slots.length).toBe(2);
    expect(placeholders.length).toBe(2);

    expect(slots[0]?.textContent).toContain('Chef1');
    expect(slots[0]?.textContent).toContain('👑 host');
    expect(slots[0]?.textContent?.toUpperCase()).toContain('BẠN');
    expect(slots[1]?.textContent).toContain('Chef2');
    expect(placeholders[0]?.textContent).toContain('Đang chờ');
    expect(placeholders[1]?.textContent).toContain('Đang chờ');
    handle.unmount();

    // Test with full 4 players
    root.replaceChildren();
    const lobby4 = {
      code: 'TEST',
      phase: 'lobby' as const,
      levelId: 'level1',
      hostId: 'p1',
      players: [
        { id: 'p1', name: 'Chef1', color: 0, ready: true, connected: true },
        { id: 'p2', name: 'Chef2', color: 1, ready: true, connected: true },
        { id: 'p3', name: 'Chef3', color: 2, ready: true, connected: true },
        { id: 'p4', name: 'Chef4', color: 3, ready: true, connected: true }
      ]
    };
    handle = mountLobby(root, { ...baseState, lobby: lobby4 }, net, 'p1');
    const slots4 = root.querySelectorAll('.players .player-slot');
    const placeholders4 = root.querySelectorAll('.placeholders .slot-empty');
    expect(slots4.length).toBe(4);
    expect(placeholders4.length).toBe(0);
    handle.unmount();
  });

  it('Chỉ host đổi map (client); khách bấm không gửi select_level', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const net = createMockNetClient();

    // Guest view: host is p2, local is p1
    const guestLobby = {
      code: 'TEST',
      phase: 'lobby' as const,
      levelId: 'level1',
      hostId: 'p2',
      players: [
        { id: 'p1', name: 'Guest', color: 0, ready: false, connected: true },
        { id: 'p2', name: 'Host', color: 1, ready: false, connected: true }
      ]
    };

    const handleGuest = mountLobby(root, { ...baseState, lobby: guestLobby }, net, 'p1');
    const card = root.querySelector<HTMLDivElement>('.level-card[data-level-id="bep_doi"]')!;
    expect(card).not.toBeNull();
    card.click();
    expect(net.selectLevel).not.toHaveBeenCalled();
    handleGuest.unmount();

    // Host view: host is p1
    root.replaceChildren();
    const hostLobby = { ...guestLobby, hostId: 'p1' };
    const handleHost = mountLobby(root, { ...baseState, lobby: hostLobby }, net, 'p1');
    const cardForHost = root.querySelector<HTMLDivElement>('.level-card[data-level-id="bep_doi"]')!;
    expect(cardForHost).not.toBeNull();
    cardForHost.click();
    expect(net.selectLevel).toHaveBeenCalledWith('bep_doi');
    handleHost.unmount();
  });

  it('START disabled khi có người chưa sẵn sàng; enabled khi tất cả sẵn sàng', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const net = createMockNetClient();

    // Host view, guest not ready
    const lobbyNotReady = {
      code: 'TEST',
      phase: 'lobby' as const,
      levelId: 'level1',
      hostId: 'p1',
      players: [
        { id: 'p1', name: 'Host', color: 0, ready: true, connected: true },
        { id: 'p2', name: 'Guest', color: 1, ready: false, connected: true }
      ]
    };

    let handle = mountLobby(root, { ...baseState, lobby: lobbyNotReady }, net, 'p1');
    const startBtn = root.querySelector<HTMLButtonElement>('#lobby-start-btn')!;
    expect(startBtn).not.toBeNull();
    expect(startBtn.disabled).toBe(true);
    expect(startBtn.title).toContain('Waiting for players to be ready');
    handle.unmount();

    // Host view, all ready
    root.replaceChildren();
    const lobbyReady = {
      code: 'TEST',
      phase: 'lobby' as const,
      levelId: 'level1',
      hostId: 'p1',
      players: [
        { id: 'p1', name: 'Host', color: 0, ready: true, connected: true },
        { id: 'p2', name: 'Guest', color: 1, ready: true, connected: true }
      ]
    };
    handle = mountLobby(root, { ...baseState, lobby: lobbyReady }, net, 'p1');
    const startBtnReady = root.querySelector<HTMLButtonElement>('#lobby-start-btn')!;
    expect(startBtnReady).not.toBeNull();
    expect(startBtnReady.disabled).toBe(false);
    handle.unmount();
  });

  it('Map thẻ hiển thị đúng nhóm world và độ khó từ levelMeta', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const net = createMockNetClient();

    const lobby = {
      code: 'TEST',
      phase: 'lobby' as const,
      levelId: 'level1',
      hostId: 'p1',
      players: [{ id: 'p1', name: 'Host', color: 0, ready: true, connected: true }]
    };

    const handle = mountLobby(root, { ...baseState, lobby }, net, 'p1');

    // 3 worlds should be rendered
    const worldGroups = root.querySelectorAll('.world-group');
    expect(worldGroups.length).toBe(3);
    expect(worldGroups[0]?.textContent).toContain('THẾ GIỚI 1');
    expect(worldGroups[1]?.textContent).toContain('THẾ GIỚI 2');
    expect(worldGroups[2]?.textContent).toContain('THẾ GIỚI 3');

    // Check specific difficulties from LEVEL_META
    for (const meta of Object.values(LEVEL_META)) {
      const card = root.querySelector(`.level-card[data-level-id="${meta.id}"]`);
      expect(card).not.toBeNull();
      const diffTag = card?.querySelector('.badge-diff');
      expect(diffTag?.textContent).toBe(meta.difficulty);
    }

    // Verify test_carry is NOT present
    const testCarryCard = root.querySelector('.level-card[data-level-id="test_carry"]');
    expect(testCarryCard).toBeNull();

    handle.unmount();
  });

  it('cosmetic lạ bị sanitize về mặc định; cosmetic hợp lệ được lưu và nạp đúng', () => {
    // Corrupt localStorage
    localStorage.setItem('ck_cosmetic', JSON.stringify({ color: 99, hat: 'xyz', species: -1 }));
    const sanitized = loadCosmetic();
    expect(sanitized).toEqual({ color: 0, hat: 0, species: 0 });

    // Valid save & load
    saveCosmetic({ color: 2, hat: 1, species: 1 });
    const loaded = loadCosmetic();
    expect(loaded).toEqual({ color: 2, hat: 1, species: 1 });
  });

  it('Khung xem trước: 20 lần vào/ra lobby không tăng số WebGLRenderer', () => {
    const mockRenderer = {
      domElement: document.createElement('canvas'),
      setSize: vi.fn(),
      setClearColor: vi.fn(),
      render: vi.fn(),
      dispose: vi.fn(),
      shadowMap: { enabled: false, type: 0 }
    } as any;

    setSharedWebGLRendererForTesting(mockRenderer);
    const initialCreatedCount = getSharedRendererCreatedCount();

    const root = document.createElement('div');
    document.body.appendChild(root);
    const net = createMockNetClient();

    const lobby = {
      code: 'TEST',
      phase: 'lobby' as const,
      levelId: 'level1',
      hostId: 'p1',
      players: [{ id: 'p1', name: 'Host', color: 0, ready: true, connected: true }]
    };

    for (let i = 0; i < 20; i++) {
      root.replaceChildren();
      const handle = mountLobby(root, { ...baseState, lobby }, net, 'p1');
      handle.unmount();
    }

    // Renderer created count must not have increased
    expect(getSharedRendererCreatedCount()).toBe(initialCreatedCount);
    // Shared renderer itself should never be disposed when exiting lobby
    expect(mockRenderer.dispose).not.toHaveBeenCalled();
  });

  it('Không có chữ nào của người chơi được render bằng innerHTML', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const net = createMockNetClient();

    const hostileName = '<script>window.pwned=1</script><img src=x onerror="alert(1)"><b>BOLD_TEXT</b>';
    const lobby = {
      code: 'TEST',
      phase: 'lobby' as const,
      levelId: 'level1',
      hostId: 'p1',
      players: [
        { id: 'p1', name: hostileName, color: 0, ready: false, connected: true }
      ]
    };

    const handle = mountLobby(root, { ...baseState, lobby }, net, 'p1');

    // No script or img or injected bold elements should exist in the DOM
    expect(root.querySelectorAll('script').length).toBe(0);
    expect(root.querySelectorAll('img').length).toBe(0);
    const boldTags = Array.from(root.querySelectorAll('b')).filter(el => el.textContent === 'BOLD_TEXT');
    expect(boldTags.length).toBe(0);

    // Hostile string is safely rendered as raw text inside player slot
    const slot = root.querySelector('.players .player-slot');
    expect(slot).not.toBeNull();
    expect(slot?.textContent).toContain(hostileName);

    handle.unmount();
  });
});
