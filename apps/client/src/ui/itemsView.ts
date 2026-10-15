import * as THREE from 'three';
import { createItemModel } from '../game/renderer3d/items';
import { AssetLoader } from '../game/assets/AssetLoader';
import { AssetManifest } from '../game/assets/AssetManifest';

export async function mountItemsView(root: HTMLElement) {
  root.innerHTML = '';
  
  const manifestKeys = Object.keys(AssetManifest);
  await Promise.all(manifestKeys.map(k => AssetLoader.getInstance().loadAsset(k)));
  
  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  root.appendChild(canvas);
  
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x333333);
  
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 5, 10);
  camera.lookAt(0, 0, 0);
  
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(5, 10, 5);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0x404040));
  
  const grid = new THREE.GridHelper(20, 20);
  scene.add(grid);
  
  const items = [
    // Ingredients
    { type: 'ingredient', id: 'tomato', state: 'raw' },
    { type: 'ingredient', id: 'tomato', state: 'chopped' },
    { type: 'ingredient', id: 'lettuce', state: 'raw' },
    { type: 'ingredient', id: 'lettuce', state: 'chopped' },
    { type: 'ingredient', id: 'meat', state: 'raw' },
    { type: 'ingredient', id: 'meat', state: 'cooked' },
    { type: 'ingredient', id: 'meat', state: 'burnt' },
    { type: 'ingredient', id: 'bun', state: 'raw' },
    
    // Tools
    { type: 'tool', tool: 'extinguisher' },
    { type: 'tool', tool: 'pan', contents: [] },
    { type: 'tool', tool: 'pan', contents: [{ type: 'ingredient', id: 'meat', state: 'cooked' }] },
    { type: 'tool', tool: 'pot', contents: [{ type: 'ingredient', id: 'tomato', state: 'raw' }] },
    
    // Plates
    { type: 'plate', dirty: false, contents: [] },
    { type: 'plate', dirty: true, contents: [] },
    { type: 'plate', dirty: false, contents: [
        { type: 'ingredient', id: 'lettuce', state: 'chopped' },
        { type: 'ingredient', id: 'tomato', state: 'chopped' }
    ] },
    { type: 'plate', dirty: false, contents: [
        { type: 'ingredient', id: 'bun', state: 'raw' },
        { type: 'ingredient', id: 'meat', state: 'cooked' },
        { type: 'ingredient', id: 'lettuce', state: 'raw' },
        { type: 'ingredient', id: 'tomato', state: 'chopped' },
        { type: 'ingredient', id: 'bun', state: 'raw' }
    ] }
  ];
  
  const cols = 4;
  let i = 0;
  for (const itemDef of items) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const x = (col - cols / 2 + 0.5) * 2;
    const z = (row - cols / 2 + 0.5) * 2;
    
    const group = createItemModel(itemDef as any);
    group.position.set(x, 0, z);
    scene.add(group);
    
    // Let's add a label
    const label = document.createElement('div');
    label.style.position = 'absolute';
    label.style.color = 'white';
    label.style.fontSize = '12px';
    label.style.backgroundColor = 'rgba(0,0,0,0.5)';
    label.style.padding = '2px 4px';
    label.textContent = `${itemDef.type === 'ingredient' ? itemDef.id + ' ' + (itemDef as any).state : (itemDef as any).tool || 'plate'}`;
    root.appendChild(label);
    
    // Update label pos in render loop
    group.userData.label = label;
    i++;
  }
  
  function animate() {
    requestAnimationFrame(animate);
    
    const tempV = new THREE.Vector3();
    scene.traverse(child => {
      if (child.userData.label) {
        tempV.copy(child.position);
        tempV.project(camera);
        const x = (tempV.x *  .5 + .5) * window.innerWidth;
        const y = (tempV.y * -.5 + .5) * window.innerHeight;
        child.userData.label.style.transform = `translate(-50%, -50%) translate(${x}px,${y - 30}px)`;
      }
    });
    
    renderer.render(scene, camera);
  }
  animate();
}
