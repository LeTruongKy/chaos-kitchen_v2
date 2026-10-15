import * as THREE from 'three';
import { AssetManifest } from '../game/assets/AssetManifest';
import { AssetLoader } from '../game/assets/AssetLoader';

export async function mountAssetsView(root: HTMLElement) {
  root.innerHTML = '';
  
  const logDiv = document.createElement('div');
  logDiv.id = 'asset-log';
  logDiv.style.position = 'absolute';
  logDiv.style.top = '10px';
  logDiv.style.left = '10px';
  logDiv.style.color = 'lime';
  logDiv.style.fontFamily = 'monospace';
  logDiv.style.zIndex = '9999';
  logDiv.style.pointerEvents = 'none';
  logDiv.style.whiteSpace = 'pre-wrap';
  root.appendChild(logDiv);
  
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
  
  const loader = AssetLoader.getInstance();
  const keys = Object.keys(AssetManifest);
  
  const cols = Math.ceil(Math.sqrt(keys.length));
  
  let i = 0;
  for (const key of keys) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const x = (col - cols / 2 + 0.5) * 2;
    const z = (row - cols / 2 + 0.5) * 2;
    
    const glb = await loader.loadAsset(key);
    if (glb) {
      const group = glb.scene;
      group.position.set(x, 0, z);
      scene.add(group);
      
      const box = new THREE.Box3().setFromObject(group);
      const size = box.getSize(new THREE.Vector3());
      logDiv.innerText += `\n${key}: size=(${size.x.toFixed(2)}, ${size.y.toFixed(2)}, ${size.z.toFixed(2)})`;
      
      let polyCount = 0;
      group.traverse(c => {
        if ((c as THREE.Mesh).isMesh) {
          const geom = (c as THREE.Mesh).geometry;
          if (geom) {
            const index = geom.index;
            const pos = geom.attributes.position;
            polyCount += index ? index.count / 3 : (pos ? pos.count / 3 : 0);
          }
        }
      });
      
      const label = document.createElement('div');
      label.style.position = 'absolute';
      label.style.color = 'white';
      label.style.fontSize = '12px';
      label.style.backgroundColor = 'rgba(0,0,0,0.5)';
      label.style.padding = '2px 4px';
      label.textContent = `${key} (${Math.round(polyCount)} tris)`;
      root.appendChild(label);
      
      // We will need to update label pos in render loop, but this is a rough implementation
      // for the screenshot.
    } else {
      const label = document.createElement('div');
      label.style.position = 'absolute';
      label.style.color = 'red';
      label.style.fontSize = '12px';
      label.style.backgroundColor = 'rgba(0,0,0,0.5)';
      label.style.padding = '2px 4px';
      label.textContent = `${key} (FALLBACK)`;
      root.appendChild(label);
    }
    i++;
  }
  
  function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }
  animate();
}
