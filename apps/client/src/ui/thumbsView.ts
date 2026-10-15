import * as THREE from 'three';
import { createItemModel } from '../game/renderer3d/items';
import { AssetLoader } from '../game/assets/AssetLoader';
import { AssetManifest } from '../game/assets/AssetManifest';
import { Item } from '@kitchen/core';

export const RECIPE_ITEM_DEFS: Record<string, Item> = {
  salad: {
    type: 'plate',
    dirty: false,
    contents: [
      { type: 'ingredient', id: 'lettuce', state: 'chopped' },
      { type: 'ingredient', id: 'tomato', state: 'chopped' }
    ]
  },
  burger: {
    type: 'plate',
    dirty: false,
    contents: [
      { type: 'ingredient', id: 'bun', state: 'raw' },
      { type: 'ingredient', id: 'meat', state: 'cooked' },
      { type: 'ingredient', id: 'lettuce', state: 'chopped' }
    ]
  },
  burger_tomato: {
    type: 'plate',
    dirty: false,
    contents: [
      { type: 'ingredient', id: 'bun', state: 'raw' },
      { type: 'ingredient', id: 'meat', state: 'cooked' },
      { type: 'ingredient', id: 'lettuce', state: 'chopped' },
      { type: 'ingredient', id: 'tomato', state: 'chopped' }
    ]
  },
  tomato_soup: {
    type: 'tool',
    tool: 'pot',
    contents: [
      { type: 'ingredient', id: 'tomato', state: 'chopped' },
      { type: 'ingredient', id: 'tomato', state: 'chopped' },
      { type: 'ingredient', id: 'tomato', state: 'chopped' }
    ],
    progress: 15
  },
  onion_soup: {
    type: 'tool',
    tool: 'pot',
    contents: [
      { type: 'ingredient', id: 'onion', state: 'chopped' },
      { type: 'ingredient', id: 'onion', state: 'chopped' },
      { type: 'ingredient', id: 'onion', state: 'chopped' }
    ],
    progress: 15
  },
  mushroom_soup: {
    type: 'tool',
    tool: 'pot',
    contents: [
      { type: 'ingredient', id: 'mushroom', state: 'chopped' },
      { type: 'ingredient', id: 'mushroom', state: 'chopped' },
      { type: 'ingredient', id: 'mushroom', state: 'chopped' }
    ],
    progress: 15
  },
  pizza: {
    type: 'plate',
    dirty: false,
    contents: [
      { type: 'ingredient', id: 'pizza', state: 'cooked' }
    ]
  }
};

export async function mountThumbsView(root: HTMLElement) {
  root.innerHTML = '';
  root.style.background = '#222';
  root.style.color = '#fff';
  root.style.padding = '20px';
  root.style.overflowY = 'auto';

  const heading = document.createElement('h2');
  heading.textContent = '3D Recipe Thumbnails Generator';
  root.appendChild(heading);

  const container = document.createElement('div');
  container.style.display = 'flex';
  container.style.flexWrap = 'wrap';
  container.style.gap = '20px';
  root.appendChild(container);

  // Preload assets
  const loader = AssetLoader.getInstance();
  await Promise.all(Object.keys(AssetManifest).map(k => loader.loadAsset(k)));

  // Setup offscreen/render canvas 256x256
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  canvas.style.display = 'none';
  document.body.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true
  });
  renderer.setSize(256, 256, false);
  renderer.setClearColor(0x000000, 0); // Transparent

  // Camera: ~35 degree elevation looking at center
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 1000);

  async function renderSingleThumb(recipeId: string): Promise<string> {
    const itemDef = RECIPE_ITEM_DEFS[recipeId];
    if (!itemDef) throw new Error(`Unknown recipeId: ${recipeId}`);

    const singleScene = new THREE.Scene();

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(30, 60, 40);
    singleScene.add(dirLight);

    const ambLight = new THREE.AmbientLight(0xffffff, 0.85);
    singleScene.add(ambLight);

    const modelGroup = createItemModel(itemDef);
    singleScene.add(modelGroup);

    // Wait for internal async GLTF loads to finish
    await new Promise(r => setTimeout(r, 600));

    // Calculate bounding box and center slightly if needed
    const bbox = new THREE.Box3().setFromObject(modelGroup);
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    modelGroup.position.x -= center.x;
    modelGroup.position.z -= center.z;

    // Camera adjustment for pot vs plate
    if (itemDef.type === 'tool' && itemDef.tool === 'pot') {
      camera.position.set(0, 52, 70);
      camera.lookAt(0, 10, 0);
    } else {
      camera.position.set(0, 56, 82);
      camera.lookAt(0, 10, 0);
    }

    renderer.render(singleScene, camera);
    return canvas.toDataURL('image/png');
  }

  const results: Record<string, string> = {};

  async function renderAllThumbs(): Promise<Record<string, string>> {
    const keys = Object.keys(RECIPE_ITEM_DEFS);
    container.innerHTML = '';
    for (const id of keys) {
      const dataUrl = await renderSingleThumb(id);
      results[id] = dataUrl;

      const card = document.createElement('div');
      card.style.display = 'flex';
      card.style.flexDirection = 'column';
      card.style.alignItems = 'center';
      card.style.background = '#333';
      card.style.padding = '10px';
      card.style.borderRadius = '8px';

      const img = document.createElement('img');
      img.src = dataUrl;
      img.width = 128;
      img.height = 128;
      img.style.background = 'radial-gradient(circle, #555 0%, #222 100%)';
      img.style.borderRadius = '4px';

      const label = document.createElement('span');
      label.textContent = id;
      label.style.marginTop = '6px';
      label.style.fontWeight = 'bold';

      card.appendChild(img);
      card.appendChild(label);
      container.appendChild(card);
    }
    return results;
  }

  (window as any).renderAllThumbs = renderAllThumbs;
  (window as any).renderSingleThumb = renderSingleThumb;
  (window as any).thumbsReady = true;
}
