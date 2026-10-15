import * as THREE from 'three';
import { Item } from '@kitchen/core';
import { createItemModel } from './items';
import { AssetLoader, resolvePublicUrl } from '../assets/AssetLoader';

const thumbnailCache = new Map<string, string>();
let generated = false;

export const LIVE_RECIPE_ITEMS: Record<string, Item> = {
  salad: {
    type: 'plate',
    dirty: false,
    contents: [
      { type: 'ingredient', id: 'lettuce', state: 'chopped' },
      { type: 'ingredient', id: 'tomato', state: 'chopped' },
    ],
  },
  burger: {
    type: 'plate',
    dirty: false,
    contents: [
      { type: 'ingredient', id: 'bun', state: 'raw' },
      { type: 'ingredient', id: 'meat', state: 'cooked' },
      { type: 'ingredient', id: 'lettuce', state: 'chopped' },
    ],
  },
  burger_tomato: {
    type: 'plate',
    dirty: false,
    contents: [
      { type: 'ingredient', id: 'bun', state: 'raw' },
      { type: 'ingredient', id: 'meat', state: 'cooked' },
      { type: 'ingredient', id: 'lettuce', state: 'chopped' },
      { type: 'ingredient', id: 'tomato', state: 'chopped' },
    ],
  },
  cheese_burger: {
    type: 'plate',
    dirty: false,
    contents: [
      { type: 'ingredient', id: 'bun', state: 'raw' },
      { type: 'ingredient', id: 'meat', state: 'cooked' },
      { type: 'ingredient', id: 'cheese', state: 'chopped' },
    ],
  },
  cheese_salad: {
    type: 'plate',
    dirty: false,
    contents: [
      { type: 'ingredient', id: 'lettuce', state: 'chopped' },
      { type: 'ingredient', id: 'tomato', state: 'chopped' },
      { type: 'ingredient', id: 'cheese', state: 'chopped' },
    ],
  },
  steak_dinner: {
    type: 'plate',
    dirty: false,
    contents: [
      { type: 'ingredient', id: 'meat', state: 'cooked' },
      { type: 'ingredient', id: 'tomato', state: 'chopped' },
    ],
  },
  mushroom_steak: {
    type: 'plate',
    dirty: false,
    contents: [
      { type: 'ingredient', id: 'meat', state: 'cooked' },
      { type: 'ingredient', id: 'mushroom', state: 'chopped' },
    ],
  },
  tomato_soup: {
    type: 'plate',
    dirty: false,
    contents: [
      { type: 'ingredient', id: 'soup_tomato' as any, state: 'cooked' },
    ],
  },
  onion_soup: {
    type: 'plate',
    dirty: false,
    contents: [
      { type: 'ingredient', id: 'soup_onion' as any, state: 'cooked' },
    ],
  },
  mushroom_soup: {
    type: 'plate',
    dirty: false,
    contents: [
      { type: 'ingredient', id: 'soup_mushroom' as any, state: 'cooked' },
    ],
  },
  pizza: {
    type: 'plate',
    dirty: false,
    contents: [
      { type: 'ingredient', id: 'pizza', state: 'cooked' },
    ],
  },
};

const LIVE_STEP_ITEMS: Record<string, Item | 'cutting_board'> = {
  '/thumbs/steps/lettuce.png': { type: 'ingredient', id: 'lettuce', state: 'raw' },
  '/thumbs/steps/tomato.png': { type: 'ingredient', id: 'tomato', state: 'raw' },
  '/thumbs/steps/tomato-slice.png': { type: 'ingredient', id: 'tomato', state: 'chopped' },
  '/thumbs/steps/meat-raw.png': { type: 'ingredient', id: 'meat', state: 'raw' },
  '/thumbs/steps/meat-cooked.png': { type: 'ingredient', id: 'meat', state: 'cooked' },
  '/thumbs/steps/bun.png': { type: 'ingredient', id: 'bun', state: 'raw' },
  '/thumbs/steps/cheese-cut.png': { type: 'ingredient', id: 'cheese', state: 'chopped' },
  '/thumbs/steps/mushroom.png': { type: 'ingredient', id: 'mushroom', state: 'raw' },
  '/thumbs/steps/onion.png': { type: 'ingredient', id: 'onion', state: 'raw' },
  '/thumbs/steps/dough.svg': { type: 'ingredient', id: 'dough', state: 'raw' },
  '/thumbs/steps/pizza.png': { type: 'ingredient', id: 'pizza', state: 'cooked' },
  '/thumbs/steps/plate.png': { type: 'plate', dirty: false, contents: [] },
  '/thumbs/steps/frying-pan.png': {
    type: 'tool',
    tool: 'pan',
    contents: [{ type: 'ingredient', id: 'meat', state: 'cooked' }],
    progress: 8,
  },
  '/thumbs/steps/pot-stew.png': {
    type: 'tool',
    tool: 'pot',
    contents: [
      { type: 'ingredient', id: 'tomato', state: 'chopped' },
      { type: 'ingredient', id: 'tomato', state: 'chopped' },
      { type: 'ingredient', id: 'tomato', state: 'chopped' },
    ],
    progress: 12,
  },
  '/thumbs/steps/cutting-board.png': 'cutting_board',
};

/**
 * Trả về URL ảnh chụp trực tiếp từ model 3D trong game (nếu đã khởi tạo),
 * hoặc fallback về đường dẫn ảnh tĩnh ban đầu.
 */
export function resolveLiveThumbUrl(thumbPath: string): string {
  const cached = thumbnailCache.get(thumbPath);
  if (cached) return cached;
  return resolvePublicUrl(thumbPath);
}

/**
 * Gắn thuộc tính data-thumb-path để tự động cập nhật ảnh 3D ngay khi AssetLoader nạp xong.
 */
export function applyLiveThumbToImg(img: HTMLImageElement, thumbPath: string): void {
  img.dataset.thumbPath = thumbPath;
  img.src = resolveLiveThumbUrl(thumbPath);
}

/**
 * Cập nhật toàn bộ thẻ <img data-thumb-path="..."> đang hiển thị trên HUD và Sổ tay công thức.
 */
export function refreshDomLiveThumbnails(): void {
  if (typeof document === 'undefined') return;
  const imgs = document.querySelectorAll<HTMLImageElement>('img[data-thumb-path]');
  imgs.forEach((img) => {
    const path = img.dataset.thumbPath;
    if (path && thumbnailCache.has(path)) {
      const dataUrl = thumbnailCache.get(path)!;
      if (img.src !== dataUrl) {
        img.src = dataUrl;
        img.style.display = '';
      }
    }
  });
}

function renderObjectToDataUrl(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  model: THREE.Object3D,
  ctx2d: CanvasRenderingContext2D,
  size: number
): string {
  const holder = new THREE.Group();
  holder.add(model);
  holder.rotation.y = Math.PI * 0.18;
  scene.add(holder);

  holder.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(holder);
  const center = box.getCenter(new THREE.Vector3());
  const boxSize = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(boxSize.x, boxSize.y, boxSize.z, 12);

  const fovRad = THREE.MathUtils.degToRad(camera.fov);
  const dist = (maxDim / (2 * Math.tan(fovRad / 2))) * 1.18;

  const elevRad = THREE.MathUtils.degToRad(38);
  camera.position.set(
    center.x,
    center.y + Math.sin(elevRad) * dist,
    center.z + Math.cos(elevRad) * dist
  );
  camera.lookAt(center);
  camera.updateProjectionMatrix();

  renderer.clear();
  renderer.render(scene, camera);

  ctx2d.clearRect(0, 0, size, size);
  ctx2d.drawImage(renderer.domElement, 0, 0, size, size);
  scene.remove(holder);

  return ctx2d.canvas.toDataURL('image/png');
}

/**
 * Chụp trực tiếp toàn bộ 11 món ăn trên đĩa và 15 nguyên liệu/dụng cụ từ đúng model 3D trong game.
 * Chỉ chạy đúng 1 lần duy nhất trong suốt phiên chơi (< 10ms).
 */
export function generateLiveThumbnails(renderer: THREE.WebGLRenderer): void {
  if (generated || typeof document === 'undefined') return;
  generated = true;

  try {
    const SIZE = 128;
    const canvas2d = document.createElement('canvas');
    canvas2d.width = SIZE;
    canvas2d.height = SIZE;
    const ctx2d = canvas2d.getContext('2d');
    if (!ctx2d) return;

    const prevClearColor = renderer.getClearColor(new THREE.Color());
    const prevClearAlpha = renderer.getClearAlpha();

    renderer.setPixelRatio(1);
    renderer.setSize(SIZE, SIZE, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setClearColor(0x000000, 0);

    const thumbScene = new THREE.Scene();
    const amb = new THREE.AmbientLight(0xfff5e6, 0.95);
    const hemi = new THREE.HemisphereLight(0xfff8eb, 0x8c6239, 0.65);
    const dir = new THREE.DirectionalLight(0xffe8c2, 1.45);
    dir.position.set(60, 120, 80);
    thumbScene.add(amb, hemi, dir);

    const camera = new THREE.PerspectiveCamera(32, 1, 0.5, 1000);

    // 1. Chụp toàn bộ 11 món ăn trên đĩa (/thumbs/recipes/<id>.png)
    for (const [recipeId, itemDef] of Object.entries(LIVE_RECIPE_ITEMS)) {
      const model = createItemModel(itemDef);
      const dataUrl = renderObjectToDataUrl(renderer, thumbScene, camera, model, ctx2d, SIZE);
      thumbnailCache.set(`/thumbs/recipes/${recipeId}.png`, dataUrl);
    }

    // 2. Chụp toàn bộ nguyên liệu & dụng cụ (/thumbs/steps/<name>.png)
    for (const [stepPath, stepDef] of Object.entries(LIVE_STEP_ITEMS)) {
      let model: THREE.Object3D | null = null;
      if (stepDef === 'cutting_board') {
        const board = AssetLoader.getInstance().getAssetSync('station_chopping');
        if (board) model = board.scene;
      } else {
        model = createItemModel(stepDef);
      }
      if (model) {
        const dataUrl = renderObjectToDataUrl(renderer, thumbScene, camera, model, ctx2d, SIZE);
        thumbnailCache.set(stepPath, dataUrl);
      }
    }

    renderer.setClearColor(prevClearColor, prevClearAlpha);
    refreshDomLiveThumbnails();
  } catch (err) {
    console.warn('[ThumbnailCache] Lỗi khởi tạo ảnh 3D trực tiếp:', err);
  }
}
