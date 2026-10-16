import * as THREE from 'three';

let sharedRenderer: THREE.WebGLRenderer | null = null;
let sharedRendererCreatedCount = 0;

export function getSharedRendererCreatedCount(): number {
  return sharedRendererCreatedCount;
}

export function setSharedWebGLRendererForTesting(renderer: THREE.WebGLRenderer | null) {
  sharedRenderer = renderer;
}

export function getSharedWebGLRenderer(): THREE.WebGLRenderer {
  if (!sharedRenderer) {
    // 1. Thử tạo WebGLRenderer với antialiasing tiêu chuẩn
    try {
      sharedRenderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        failIfMajorPerformanceCaveat: false,
      });
      sharedRendererCreatedCount++;
      sharedRenderer.shadowMap.enabled = false;
      return sharedRenderer;
    } catch (e1) {
      console.warn('[SharedWebGL] WebGL antialias không khả dụng, thử chế độ cơ bản...', e1);
    }

    // 2. Thử tạo không có antialiasing
    try {
      sharedRenderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: true,
        powerPreference: 'high-performance',
        failIfMajorPerformanceCaveat: false,
      });
      sharedRendererCreatedCount++;
      sharedRenderer.shadowMap.enabled = false;
      return sharedRenderer;
    } catch (e2) {
      console.warn('[SharedWebGL] WebGL cơ bản không khả dụng, thử lấy context canvas...', e2);
    }

    // 3. Thử context cụ thể từ canvas
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('webgl2') || canvas.getContext('webgl') || (canvas as any).getContext('experimental-webgl');
      if (ctx) {
        sharedRenderer = new THREE.WebGLRenderer({
          canvas,
          context: ctx as any,
          alpha: true,
        });
        sharedRendererCreatedCount++;
        return sharedRenderer;
      }
    } catch (e3) {
      console.warn('[SharedWebGL] Canvas context fallback không thành công:', e3);
    }

    throw new Error('WebGLNotSupported');
  }
  return sharedRenderer;
}

export function disposeSharedWebGLRenderer() {
  if (sharedRenderer) {
    sharedRenderer.dispose();
    sharedRenderer = null;
  }
}

