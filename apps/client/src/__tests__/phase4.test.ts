// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { 
  getSettings, 
  updateSettings, 
  loadSettingsFromStorage 
} from '../state/settings';
import { openSettingsModal } from '../ui/settingsModal';
import { translateError } from '../net/errors';
import { sfx } from '../game/audio/Sfx';
import { MenuRenderer } from '../game/renderer3d/MenuRenderer';
import { 
  disposeSharedWebGLRenderer, 
  setSharedWebGLRendererForTesting,
  getSharedRendererCreatedCount 
} from '../game/renderer3d/SharedWebGL';
import { AssetLoader } from '../game/assets/AssetLoader';

describe('Phase 4 Requirements', () => {
  beforeEach(() => {
    document.body.replaceChildren();

    // Mock AssetLoader to avoid relative network requests in jsdom
    vi.spyOn(AssetLoader.getInstance(), 'loadAsset').mockResolvedValue({ 
      scene: new THREE.Group(), 
      animations: [] 
    } as any);
    vi.spyOn(AssetLoader.getInstance(), 'getAssetSync').mockReturnValue({ 
      scene: new THREE.Group(), 
      animations: [] 
    } as any);

    vi.stubGlobal('localStorage', {
      getItem: vi.fn(),
      setItem: vi.fn(),
    });
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0',
      hardwareConcurrency: 4,
    });
    loadSettingsFromStorage();
  });

  afterEach(() => {
    disposeSharedWebGLRenderer();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // 1. Settings save / read / defaults when invalid
  it('settings lưu, đọc, và fallback về mặc định khi giá trị sai hoặc hỏng', () => {
    // Corrupted JSON in localStorage
    vi.mocked(localStorage.getItem).mockReturnValue('{corrupted-json-content');
    loadSettingsFromStorage();
    let settings = getSettings();
    expect(settings.quality).toBeDefined();
    expect(settings.music).toBe(50);
    expect(settings.sfx).toBe(80);
    expect(settings.showFps).toBe(false);

    // Invalid range and wrong types in localStorage
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({
      quality: 'ultra-super',
      music: 9999,
      sfx: -100,
      showFps: 'truthy-string'
    }));
    loadSettingsFromStorage();
    settings = getSettings();
    expect(['low', 'medium', 'high']).toContain(settings.quality);
    expect(settings.music).toBe(50); // fallback
    expect(settings.sfx).toBe(80); // fallback
    expect(settings.showFps).toBe(false); // fallback

    // Valid update persists to localStorage
    updateSettings({ quality: 'high', music: 75, sfx: 90, showFps: true });
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'ck_settings_v2',
      expect.stringContaining('"quality":"high"')
    );
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'ck_settings_v2',
      expect.stringContaining('"music":75')
    );
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'ck_settings_v2',
      expect.stringContaining('"showFps":true')
    );
  });

  // 2. Settings button opens and closes panel
  it('nút Cài đặt mở và đóng panel modal DOM', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    expect(document.getElementById('settings-modal-overlay')).toBeNull();
    const modal = openSettingsModal(container);
    expect(document.getElementById('settings-modal-overlay')).not.toBeNull();
    expect(modal.textContent).toContain('Cài đặt');

    // Close via close button
    const closeBtn = modal.querySelector<HTMLButtonElement>('#setting-close-btn')!;
    expect(closeBtn).not.toBeNull();
    closeBtn.click();
    expect(document.getElementById('settings-modal-overlay')).toBeNull();
  });

  // 3. Client toast message when map maxPlayers exceeded
  it('client chuyển mã lỗi too_many_players thành toast tiếng Anh', () => {
    // (a) server gửi "This map allows up to 2 players" thì toast giữ nguyên
    const errorMsg2 = translateError('too_many_players', 'This map allows up to 2 players');
    expect(errorMsg2).toBe('This map allows up to 2 players');

    // (b) server gửi "... up to 3 players" thì toast hiện đúng 3
    const errorMsg3 = translateError('too_many_players', 'This map allows up to 3 players');
    expect(errorMsg3).toBe('This map allows up to 3 players');

    // (c) không có message thì hiện fallback không có số
    const fallbackMsg = translateError('too_many_players');
    expect(fallbackMsg).toBe('This map has a player limit.');
    expect(fallbackMsg).not.toMatch(/\d+/);
  });

  // 4. settings.music = 0 does not play music
  it('settings.music = 0 thì không phát nhạc WebAudio', () => {
    updateSettings({ music: 0 });
    const createOscSpy = vi.fn();
    const createGainSpy = vi.fn().mockReturnValue({
      connect: vi.fn(),
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }
    });

    (sfx as any).ctx = {
      currentTime: 0,
      state: 'running',
      createOscillator: createOscSpy,
      createGain: createGainSpy,
      destination: {},
      resume: vi.fn()
    };

    sfx.playMenuMusic();
    expect(createOscSpy).not.toHaveBeenCalled();
    expect((sfx as any).menuMusicTimer).toBeUndefined();

    // Turn music back on (e.g. 60%)
    updateSettings({ music: 60 });
    expect((sfx as any).isPlayingMenuMusic).toBe(true);
    expect(createOscSpy).toHaveBeenCalled();

    // Turn music back to 0 -> stops immediately
    createOscSpy.mockClear();
    updateSettings({ music: 0 });
    expect((sfx as any).menuMusicTimer).toBeUndefined();
    expect(createOscSpy).not.toHaveBeenCalled();

    sfx.stopMenuMusic();
  });

  // 5. Entering and leaving menu 20 times does not increase WebGLRenderer count
  it('vào/ra menu 20 lần không tăng số WebGLRenderer', () => {
    const mockCanvas = document.createElement('canvas');
    const mockRenderer = {
      domElement: mockCanvas,
      setSize: vi.fn(),
      setPixelRatio: vi.fn(),
      render: vi.fn(),
      dispose: vi.fn(),
      shadowMap: { enabled: false, type: 0 }
    } as any;

    setSharedWebGLRendererForTesting(mockRenderer);
    const initialCreatedCount = getSharedRendererCreatedCount();

    const container = document.createElement('div');
    document.body.appendChild(container);

    const instances: any[] = [];
    for (let i = 0; i < 20; i++) {
      const menu = new MenuRenderer(container);
      instances.push((menu as any).renderer);
      menu.dispose();
    }

    // All 20 entries received the exact same shared renderer instance
    for (const inst of instances) {
      expect(inst).toBe(mockRenderer);
    }

    // The shared renderer was never disposed when leaving the menu
    expect(mockRenderer.dispose).not.toHaveBeenCalled();

    // No new WebGLRenderer was created during these 20 visits
    expect(getSharedRendererCreatedCount()).toBe(initialCreatedCount);
  });
});
