const STORAGE_KEY = 'ck_server_url';

export function normalizeServerUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  if (trimmed.startsWith('https://')) {
    return 'wss://' + trimmed.slice('https://'.length);
  }
  if (trimmed.startsWith('http://')) {
    return 'ws://' + trimmed.slice('http://'.length);
  }
  if (!trimmed.startsWith('ws://') && !trimmed.startsWith('wss://')) {
    const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
    return `${isSecure ? 'wss' : 'ws'}://${trimmed}`;
  }
  return trimmed;
}

export function saveCustomServerUrl(url: string): string {
  const normalized = normalizeServerUrl(url);
  try {
    if (typeof localStorage !== 'undefined') {
      if (normalized) {
        localStorage.setItem(STORAGE_KEY, normalized);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  } catch {
    // ignore storage errors
  }
  return normalized;
}

export function getCustomServerUrl(): string {
  try {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const fromQuery = params.get('server');
      if (fromQuery && fromQuery.trim()) {
        return saveCustomServerUrl(fromQuery);
      }
    }
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && saved.trim()) {
        return normalizeServerUrl(saved);
      }
    }
  } catch {
    // ignore
  }
  return '';
}

export function getServerUrl(): string {
  const custom = getCustomServerUrl();
  if (custom) {
    return custom;
  }
  if (import.meta.env.VITE_SERVER_URL) {
    return normalizeServerUrl(import.meta.env.VITE_SERVER_URL);
  }
  if (import.meta.env.DEV) {
    return 'ws://localhost:2567';
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}`;
}

