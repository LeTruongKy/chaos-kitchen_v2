import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  getSettings, 
  updateSettings, 
  loadSettingsFromStorage, 
  getDefaultSettings, 
  subscribe,
  DEFAULT_KEYBINDS
} from '../state/settings';

describe('Settings State', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(),
      setItem: vi.fn(),
    });
    // Mock userAgent for default quality fallback
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0',
      hardwareConcurrency: 4,
    });
    vi.stubGlobal('window', {
      devicePixelRatio: 1,
      location: { search: '' }
    });
    loadSettingsFromStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('provides default settings when storage is empty or invalid', () => {
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    loadSettingsFromStorage();
    const settings = getSettings();
    expect(settings.quality).toBe('low'); // hc=4 -> low based on logic
    expect(settings.renderer).toBe('3d');
    expect(settings.master).toBe(50);
  });

  it('handles invalid data and falls back to default', () => {
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({
      quality: 'super-high',
      renderer: '4d',
      master: 'loud',
      showFps: 'yes'
    }));
    loadSettingsFromStorage();
    const settings = getSettings();
    
    // Default quality fallback logic will make it 'low' for our stub
    expect(settings.quality).toBe('low');
    expect(settings.renderer).toBe('3d');
    expect(settings.master).toBe(50);
    expect(settings.showFps).toBe(false);
  });

  it('applies valid patch and saves to localStorage', () => {
    updateSettings({ quality: 'high', master: 80 });
    const settings = getSettings();
    
    expect(settings.quality).toBe('high');
    expect(settings.master).toBe(80);
    
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'ck_settings_v2',
      expect.stringContaining('"quality":"high"')
    );
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'ck_settings_v2',
      expect.stringContaining('"master":80')
    );
  });

  it('url override does not save to local storage', () => {
    updateSettings({ renderer: '2d' });
    
    vi.stubGlobal('window', {
      devicePixelRatio: 1,
      location: { search: '?r=3d&q=high&fps=1' }
    });

    const settings = getSettings();
    expect(settings.renderer).toBe('3d');
    expect(settings.quality).toBe('high');
    expect(settings.showFps).toBe(true);

    // Call updateSettings with something else, verify the memory state didn't persist URL overrides
    updateSettings({ master: 99 });
    
    // Since URL is still there, getSettings returns overridden
    expect(getSettings().renderer).toBe('3d');

    // But if we clear the URL, it should fall back to base
    vi.stubGlobal('window', {
      devicePixelRatio: 1,
      location: { search: '' }
    });
    const baseSettings = getSettings();
    expect(baseSettings.renderer).toBe('2d');
    expect(baseSettings.master).toBe(99);
  });

  it('subscribes to changes', () => {
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);
    
    updateSettings({ sfx: 10 });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ sfx: 10 }));
    
    unsubscribe();
    updateSettings({ sfx: 20 });
    expect(listener).toHaveBeenCalledTimes(1); // Not called again
  });
});
