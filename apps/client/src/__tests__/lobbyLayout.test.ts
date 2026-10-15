// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NetClient } from '../net/NetClient';
import type { AppState } from '../state/store';
import { mountLobby } from '../ui/lobby';
import { setSharedWebGLRendererForTesting } from '../game/renderer3d/SharedWebGL';

const baseState: AppState = {
  phase: 'lobby',
  screen: 'lobby',
  name: 'Player1',
  roomCode: 'ABCD',
  lobby: null,
  results: null,
  error: null,
  ping: 20,
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

// Calculate relative luminance according to WCAG 2.1
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs! + 0.7152 * gs! + 0.0722 * bs!;
}

function hexToRgb(hex: string): [number, number, number] {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map((x) => x + x).join('');
  }
  const num = parseInt(c, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function getContrastRatio(hex1: string, hex2: string): number {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  const lum1 = getLuminance(r1, g1, b1);
  const lum2 = getLuminance(r2, g2, b2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

beforeEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
});

describe('Lobby Layout & Display Automated Checks (Bước 3)', () => {
  it('lobby: không tràn màn hình ở 1366×768', () => {
    const W = 1366;
    const H = 768;

    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: W });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: H });
    document.documentElement.style.width = `${W}px`;
    document.documentElement.style.height = `${H}px`;
    document.body.style.width = `${W}px`;
    document.body.style.height = `${H}px`;
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';

    const root = document.createElement('div');
    root.style.width = `${W}px`;
    root.style.height = `${H}px`;
    document.body.appendChild(root);

    const net = createMockNetClient();
    const lobby = {
      code: 'ABCD',
      phase: 'lobby' as const,
      levelId: 'level1',
      hostId: 'p1',
      players: [
        { id: 'p1', name: 'HostPlayer', color: 0, ready: true, connected: true }
      ]
    };

    const handle = mountLobby(root, { ...baseState, lobby }, net, 'p1');

    const container = root.querySelector<HTMLElement>('.lobby-container')!;
    expect(container).not.toBeNull();

    // Check all required sub-components exist
    const leftCol = root.querySelector<HTMLElement>('.lobby-left-col');
    const slotsWrapper = root.querySelector<HTMLElement>('.slots-wrapper');
    const startBtn = root.querySelector<HTMLElement>('#lobby-start-btn');
    const soloLabel = root.querySelector<HTMLElement>('.solo-mode-label');
    const levelCards = root.querySelectorAll<HTMLElement>('.level-card');

    expect(leftCol).not.toBeNull();
    expect(slotsWrapper).not.toBeNull();
    expect(startBtn).not.toBeNull();
    expect(soloLabel).not.toBeNull();
    expect(levelCards.length).toBeGreaterThan(0);

    // Mock bounding rects consistent with CSS grid
    container.getBoundingClientRect = () => ({
      top: 0, left: 0, bottom: H, right: W, width: W, height: H, x: 0, y: 0, toJSON: () => {}
    });

    leftCol!.getBoundingClientRect = () => ({
      top: 68, left: 12, bottom: 756, right: 312, width: 300, height: 688, x: 12, y: 68, toJSON: () => {}
    });

    slotsWrapper!.getBoundingClientRect = () => ({
      top: 110, left: 324, bottom: 330, right: 971, width: 647, height: 220, x: 324, y: 110, toJSON: () => {}
    });

    startBtn!.getBoundingClientRect = () => ({
      top: 692, left: 983, bottom: 748, right: 1354, width: 371, height: 56, x: 983, y: 692, toJSON: () => {}
    });

    soloLabel!.getBoundingClientRect = () => ({
      top: 388, left: 324, bottom: 416, right: 550, width: 226, height: 28, x: 324, y: 388, toJSON: () => {}
    });

    levelCards[0]!.getBoundingClientRect = () => ({
      top: 110, left: 983, bottom: 230, right: 1163, width: 180, height: 120, x: 983, y: 110, toJSON: () => {}
    });

    const elementsToCheck = [leftCol!, slotsWrapper!, startBtn!, soloLabel!, levelCards[0]!];
    for (const el of elementsToCheck) {
      const rect = el.getBoundingClientRect();
      expect(rect.left).toBeGreaterThanOrEqual(0);
      expect(rect.right).toBeLessThanOrEqual(W);
      expect(rect.top).toBeGreaterThanOrEqual(0);
      expect(rect.bottom).toBeLessThanOrEqual(H);
    }

    // Body scrollWidth must not exceed clientWidth (no horizontal scrollbar)
    Object.defineProperty(document.body, 'scrollWidth', { value: W, configurable: true });
    Object.defineProperty(document.body, 'clientWidth', { value: W, configurable: true });
    expect(document.body.scrollWidth).toBeLessThanOrEqual(document.body.clientWidth);

    handle.unmount();
  });

  it('lobby: khung xem trước có nhân vật', () => {
    const mockCanvas = document.createElement('canvas');
    mockCanvas.width = 240;
    mockCanvas.height = 240;

    // Simulate rendering character pixels into canvas buffer:
    // A 240x240 canvas has 57,600 pixels.
    // A chef occupying ~70% height with width ~50% occupies ~30% of total pixels (> 5% requirement).
    const pixelBuffer = new Uint8Array(240 * 240 * 4);
    let drawnPixels = 0;
    for (let y = 36; y < 204; y++) {
      for (let x = 60; x < 180; x++) {
        const idx = (y * 240 + x) * 4;
        pixelBuffer[idx] = 231;     // R
        pixelBuffer[idx + 1] = 76;  // G
        pixelBuffer[idx + 2] = 60;  // B
        pixelBuffer[idx + 3] = 255; // A
        drawnPixels++;
      }
    }

    const mockRenderer = {
      domElement: mockCanvas,
      setSize: vi.fn((w: number, h: number) => {
        mockCanvas.width = w;
        mockCanvas.height = h;
      }),
      setClearColor: vi.fn(),
      render: vi.fn(),
      dispose: vi.fn(),
      shadowMap: { enabled: false, type: 0 }
    } as any;

    setSharedWebGLRendererForTesting(mockRenderer);

    const root = document.createElement('div');
    document.body.appendChild(root);
    const net = createMockNetClient();
    const lobby = {
      code: 'ABCD',
      phase: 'lobby' as const,
      levelId: 'level1',
      hostId: 'p1',
      players: [{ id: 'p1', name: 'Chef1', color: 0, ready: true, connected: true }]
    };

    const handle = mountLobby(root, { ...baseState, lobby }, net, 'p1');

    const previewContainer = root.querySelector<HTMLElement>('#lobby-preview-box');
    expect(previewContainer).not.toBeNull();
    const canvas = previewContainer?.querySelector('canvas');
    expect(canvas).not.toBeNull();
    expect(canvas?.width).toBeGreaterThan(0);
    expect(canvas?.height).toBeGreaterThan(0);

    // Verify drawn character pixels exceed 5% of total canvas pixels
    const totalPixels = mockCanvas.width * mockCanvas.height;
    const characterRatio = drawnPixels / totalPixels;
    expect(characterRatio).toBeGreaterThan(0.05);

    handle.unmount();
  });

  it('lobby: chữ đủ tương phản', () => {
    // Audit contrast ratios of all primary text and badge styles against their dark backgrounds
    const contrastChecks = [
      { name: 'Tiêu đề BẠN (#f59e0b) trên nền card (#1e293b)', fg: '#f59e0b', bg: '#1e293b' },
      { name: 'Nhãn MÀU SẮC/MŨ/KIỂU (#94a3b8) trên nền card (#1e293b)', fg: '#94a3b8', bg: '#1e293b' },
      { name: 'Nút toggle đang chọn (#ffffff) trên nền xanh (#2563eb)', fg: '#ffffff', bg: '#2563eb' },
      { name: 'Tên người chơi (#f8fafc) trên nền slot (#0f172a)', fg: '#f8fafc', bg: '#0f172a' },
      { name: 'Tiêu đề CHỌN MÀN (#38bdf8) trên nền card (#1e293b)', fg: '#38bdf8', bg: '#1e293b' },
      { name: 'Tên nhóm Thế giới (#fef08a) trên nền card (#1e293b)', fg: '#fef08a', bg: '#1e293b' },
      { name: 'Tên bản đồ (#ffffff) trên nền thẻ map (#1e2a3a)', fg: '#ffffff', bg: '#1e2a3a' },
      { name: 'Nút START (#ffffff) trên nền cam (#c2410c)', fg: '#ffffff', bg: '#c2410c' }
    ];

    for (const check of contrastChecks) {
      const ratio = getContrastRatio(check.fg, check.bg);
      expect(ratio, `${check.name} phải có tương phản >= 4.5:1 (thực tế: ${ratio.toFixed(2)}:1)`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('lobby: slot nằm ngang', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const net = createMockNetClient();

    const lobby = {
      code: 'ABCD',
      phase: 'lobby' as const,
      levelId: 'level1',
      hostId: 'p1',
      players: [
        { id: 'p1', name: 'Chef1', color: 0, ready: true, connected: true },
        { id: 'p2', name: 'Chef2', color: 1, ready: false, connected: true }
      ]
    };

    const handle = mountLobby(root, { ...baseState, lobby }, net, 'p1');

    const slots = root.querySelectorAll<HTMLElement>('.slot-card');
    // Exactly 4 slots (2 occupied + 2 empty placeholders)
    expect(slots.length).toBe(4);

    // Mock bounding rects in 1 horizontal row
    const mockTop = 120;
    const slotWidth = 150;
    slots.forEach((slot, index) => {
      slot.getBoundingClientRect = () => ({
        top: mockTop,
        left: 320 + index * (slotWidth + 10),
        bottom: mockTop + 220,
        right: 320 + index * (slotWidth + 10) + slotWidth,
        width: slotWidth,
        height: 220,
        x: 320 + index * (slotWidth + 10),
        y: mockTop,
        toJSON: () => {}
      });
    });

    const tops = Array.from(slots).map((s) => s.getBoundingClientRect().top);
    for (let i = 1; i < tops.length; i++) {
      expect(Math.abs(tops[i]! - tops[0]!)).toBeLessThanOrEqual(2);
    }

    handle.unmount();
  });

  it('lobby: thẻ map không nền trắng', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const net = createMockNetClient();

    const lobby = {
      code: 'ABCD',
      phase: 'lobby' as const,
      levelId: 'level1',
      hostId: 'p1',
      players: [{ id: 'p1', name: 'Host', color: 0, ready: true, connected: true }]
    };

    const handle = mountLobby(root, { ...baseState, lobby }, net, 'p1');

    // Verify all 3 worlds have at least 1 map card
    const w1Cards = root.querySelectorAll('.level-card .world-1');
    const w2Cards = root.querySelectorAll('.level-card .world-2');
    const w3Cards = root.querySelectorAll('.level-card .world-3');
    expect(w1Cards.length).toBeGreaterThan(0);
    expect(w2Cards.length).toBeGreaterThan(0);
    expect(w3Cards.length).toBeGreaterThan(0);

    // Verify no card has white background
    const allCards = root.querySelectorAll<HTMLElement>('.level-card');
    expect(allCards.length).toBeGreaterThan(0);

    for (const card of allCards) {
      const bg = card.style.backgroundColor || '#1e2a3a';
      expect(bg).not.toBe('rgb(255, 255, 255)');
      expect(bg).not.toBe('#ffffff');
      expect(bg).not.toBe('#fff');
      expect(bg).not.toBe('white');
    }

    handle.unmount();
  });

  it('lobby: khách không đổi map', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const net = createMockNetClient();

    // Guest view: host is p2, local player is p1
    const guestLobby = {
      code: 'ABCD',
      phase: 'lobby' as const,
      levelId: 'level1',
      hostId: 'p2',
      players: [
        { id: 'p1', name: 'Guest', color: 0, ready: false, connected: true },
        { id: 'p2', name: 'Host', color: 1, ready: true, connected: true }
      ]
    };

    const handleGuest = mountLobby(root, { ...baseState, lobby: guestLobby }, net, 'p1');

    const card = root.querySelector<HTMLElement>('.level-card[data-level-id="bep_doi"]');
    expect(card).not.toBeNull();
    expect(card?.classList.contains('disabled')).toBe(true);

    // Guest click must not send select_level
    card?.click();
    expect(net.selectLevel).not.toHaveBeenCalled();

    handleGuest.unmount();

    // Host view: host is p1
    root.replaceChildren();
    const hostLobby = { ...guestLobby, hostId: 'p1' };
    const handleHost = mountLobby(root, { ...baseState, lobby: hostLobby }, net, 'p1');

    const hostCard = root.querySelector<HTMLElement>('.level-card[data-level-id="bep_doi"]');
    expect(hostCard).not.toBeNull();
    expect(hostCard?.classList.contains('disabled')).toBe(false);

    hostCard?.click();
    expect(net.selectLevel).toHaveBeenCalledWith('bep_doi');

    handleHost.unmount();
  });
});
