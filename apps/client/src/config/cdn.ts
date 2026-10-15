/**
 * Quản lý tập trung tài nguyên tĩnh CDN (jsDelivr) cho Chaos Kitchen.
 * Giúp Render (Free tier) không bị tràn RAM hoặc nghẽn băng thông
 * bằng cách tải toàn bộ 3D models, textures, animations, audio và thumbnails từ jsDelivr CDN.
 */

export const CDN_BASE_URL = 'https://cdn.jsdelivr.net/gh/LeTruongKy/chaos-kitchen_v2@09c2dbf/apps/client/public/';
export const OVERCOOKED_ASSET_VERSION = 'overcooked_v5';

/**
 * Kiểm tra xem client có nên tải tài nguyên từ jsDelivr CDN hay không:
 * - Khi build production (Render, GitHub Pages, v.v.): luôn dùng CDN_BASE_URL
 * - Khi bật cờ VITE_FORCE_CDN hoặc VITE_USE_CDN
 * - Khi chạy local (import.meta.env.DEV trên localhost/127.0.0.1): fallback về thư mục public cục bộ trừ khi ép buộc CDN
 */
export function shouldUseCdn(): boolean {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
    // Trong môi trường Vitest / Node test, không bắt buộc CDN nếu mock
    return false;
  }
  const force = (import.meta as any).env?.VITE_FORCE_CDN === 'true' || (import.meta as any).env?.VITE_USE_CDN === 'true';
  if (force) return true;

  const isDev = Boolean((import.meta as any).env?.DEV);
  if (isDev) {
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      return false;
    }
  }
  return true;
}

export function getCdnBaseUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_CDN_BASE_URL;
  const base = envUrl && envUrl.trim() ? envUrl.trim() : CDN_BASE_URL;
  return base.endsWith('/') ? base : `${base}/`;
}

/**
 * Chuyển đổi đường dẫn tĩnh tương đối (ví dụ: '/models/...', '/assets/...', '/audio/...', '/thumbs/...')
 * thành URL CDN jsDelivr trong môi trường production, hoặc đường dẫn Vite base trong môi trường dev.
 */
export function resolvePublicUrl(p: string): string {
  if (!p) return '';
  if (/^(https?:|data:|blob:)/i.test(p)) return p;

  const cleanPath = p.startsWith('/') ? p.slice(1) : p;

  if (shouldUseCdn()) {
    const cdnBase = getCdnBaseUrl();
    const fullUrl = `${cdnBase}${cleanPath}`;
    if (/\.(gltf|glb|fbx|bin)$/i.test(fullUrl) && !fullUrl.includes('?')) {
      return `${fullUrl}?v=${OVERCOOKED_ASSET_VERSION}`;
    }
    return fullUrl;
  }

  // Fallback môi trường local development
  const base = (import.meta as any).env?.BASE_URL || '/';
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  const fullUrl = `${cleanBase}${cleanPath}`;
  if (/\.(gltf|glb|fbx|bin)$/i.test(fullUrl) && !fullUrl.includes('?')) {
    return `${fullUrl}?v=${OVERCOOKED_ASSET_VERSION}`;
  }
  return fullUrl;
}
