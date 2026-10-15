export type Quality = 'low' | 'medium' | 'high';
export type RendererType = '2d' | '3d';

export interface Settings {
  quality: Quality;
  renderer: RendererType;
  master: number;
  music: number;
  sfx: number;
  showFps: boolean;
  keybinds: Record<string, string>;
}

const SETTINGS_KEY = 'ck_settings_v2';

export const DEFAULT_KEYBINDS: Record<string, string> = {
  up: 'KeyW',
  down: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  interact: 'Space',
  act: 'KeyF',
  dash: 'ShiftLeft',
  throw: 'KeyJ',
  switch_chef: 'Tab',
  emote1: 'Digit1',
  emote2: 'Digit2',
  emote3: 'Digit3',
  emote4: 'Digit4'
};

function detectDefaultQuality(): Quality {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') {
    return 'medium'; // Fallback for tests
  }
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  if (isMobile) return 'low';
  
  const hardwareConcurrency = navigator.hardwareConcurrency || 4;
  const dpr = window.devicePixelRatio || 1;
  
  if (hardwareConcurrency <= 4) return 'low';
  if (hardwareConcurrency >= 8 && dpr <= 2) return 'high';
  return 'medium';
}

export function getDefaultSettings(): Settings {
  return {
    quality: detectDefaultQuality(),
    renderer: '3d',
    master: 50,
    music: 50,
    sfx: 80,
    showFps: false,
    keybinds: { ...DEFAULT_KEYBINDS }
  };
}

let currentSettings: Settings = getDefaultSettings();
const listeners = new Set<(settings: Settings) => void>();

function validateSettings(raw: any): Settings {
  const def = getDefaultSettings();
  if (!raw || typeof raw !== 'object') return def;

  const validQuality = ['low', 'medium', 'high'].includes(raw.quality) ? raw.quality : def.quality;
  const validRenderer = ['2d', '3d'].includes(raw.renderer) ? raw.renderer : def.renderer;
  
  const parseNum = (val: any, fallback: number) => {
    const num = Number(val);
    return !Number.isNaN(num) && num >= 0 && num <= 100 ? num : fallback;
  };

  const master = parseNum(raw.master, def.master);
  const music = parseNum(raw.music, def.music);
  const sfx = parseNum(raw.sfx, def.sfx);
  const showFps = typeof raw.showFps === 'boolean' ? raw.showFps : def.showFps;
  
  const keybinds = typeof raw.keybinds === 'object' && raw.keybinds !== null 
    ? { ...def.keybinds, ...raw.keybinds } 
    : def.keybinds;

  // Sanitize keybinds to strings
  for (const key of Object.keys(keybinds)) {
    if (typeof keybinds[key] !== 'string') {
      keybinds[key] = def.keybinds[key] || '';
    }
  }

  return {
    quality: validQuality,
    renderer: validRenderer,
    master,
    music,
    sfx,
    showFps,
    keybinds
  };
}

export function loadSettingsFromStorage(): void {
  let loaded: any = null;
  if (typeof localStorage !== 'undefined') {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        loaded = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load settings from localStorage', e);
    }
  }
  
  const validated = validateSettings(loaded);
  currentSettings = validated;
}

export function getSettings(): Settings {
  // Always apply URL overrides on top of current memory state
  const overridden = { ...currentSettings };
  
  if (typeof window !== 'undefined') {
    try {
      const params = new URLSearchParams(window.location.search);
      const r = params.get('r');
      if (r === '2d' || r === '3d') overridden.renderer = r;
      
      const q = params.get('q');
      if (q === 'low' || q === 'medium' || q === 'high') overridden.quality = q;
      
      const fps = params.get('fps');
      if (fps === '1') overridden.showFps = true;
      if (fps === '0') overridden.showFps = false;
    } catch (e) {
      // ignore
    }
  }
  
  return overridden;
}

export function updateSettings(patch: Partial<Settings>): void {
  // We apply patch to the in-memory base settings, not the URL-overridden ones
  const newSettings = { ...currentSettings };
  
  if (patch.quality !== undefined) newSettings.quality = patch.quality;
  if (patch.renderer !== undefined) newSettings.renderer = patch.renderer;
  if (patch.master !== undefined) newSettings.master = patch.master;
  if (patch.music !== undefined) newSettings.music = patch.music;
  if (patch.sfx !== undefined) newSettings.sfx = patch.sfx;
  if (patch.showFps !== undefined) newSettings.showFps = patch.showFps;
  if (patch.keybinds !== undefined) {
    newSettings.keybinds = { ...newSettings.keybinds, ...patch.keybinds };
  }

  currentSettings = validateSettings(newSettings);

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(currentSettings));
    } catch (e) {
      console.warn('Failed to save settings to localStorage', e);
    }
  }

  notifyListeners();
}

export function subscribe(listener: (settings: Settings) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners() {
  const current = getSettings();
  listeners.forEach(fn => fn(current));
}

// Initial load
loadSettingsFromStorage();
