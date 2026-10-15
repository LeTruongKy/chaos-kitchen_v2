import * as THREE from 'three';
import { createStationModel, updateStationModel } from '../game/renderer3d/stations';
import { ParticleSystem } from '../game/renderer3d/vfx/Particles';
import { ChefModel } from '../game/renderer3d/chef/Chef';
import { parseLevel } from '@kitchen/core';
import { AssetLoader } from '../game/assets/AssetLoader';
import { AssetManifest } from '../game/assets/AssetManifest';

export async function mountStationsView(root: HTMLElement) {
  root.innerHTML = '';
  
  const manifestKeys = Object.keys(AssetManifest);
  await Promise.all(manifestKeys.map(k => AssetLoader.getInstance().loadAsset(k)));
  
  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  root.appendChild(canvas);
  
  const btn = document.createElement('button');
  btn.textContent = 'Toggle Fire (Đốt)';
  btn.style.position = 'absolute';
  btn.style.top = '10px';
  btn.style.left = '10px';
  btn.style.padding = '10px';
  btn.style.zIndex = '10';
  root.appendChild(btn);
  
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x333333);
  
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 8, 12);
  camera.lookAt(0, 0, 0);
  
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(5, 10, 5);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0x404040));
  
  const grid = new THREE.GridHelper(20, 20);
  scene.add(grid);
  
  const particleSystem = new ParticleSystem();
  scene.add(particleSystem.group);
  
  const dummyLevel = parseLevel({
    id: 'dummy',
    name: 'Dummy',
    duration: 100,
    plates: 0,
    world: 1,
    theme: 'diner',
    recipes: [],
    stars: [1, 2, 3],
    ascii: ['..........']
  });

  const chef = new ChefModel(0x00aaff, false);
  chef.group.position.set(-5, 0, 0);
  scene.add(chef.group);
  
  const stationTypes = ['counter', 'cutting', 'stove', 'sink', 'trash', 'serve', 'dish_return', 'plate_dispenser', 'crate', 'extinguisher', 'oven'];
  const stations: { group: THREE.Group, state: any }[] = [];
  
  const cols = 5;
  stationTypes.forEach((type, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const x = (col - Math.floor(cols / 2)) * 3;
    const z = (row - 1) * 3;
    
    const init = { x: 0, y: 0, type: type as any, crate: (type === 'crate' ? 'tomato' : undefined) as any };
    const group = createStationModel(init, dummyLevel);
    group.position.set(x, 0, z);
    scene.add(group);
    
    const state = {
      x: (x - 32) / 64, // TILE_PX is 64
      y: (z - 32) / 64,
      type,
      item: type === 'stove' ? { type: 'tool', tool: 'pan', contents: [{ type: 'ingredient', id: 'meat', state: 'raw' }] } : null,
      onFire: false,
      progress: 0,
      dirtyCount: type === 'sink' ? 2 : 0,
      cleanCount: type === 'plate_dispenser' ? 3 : 0
    };
    
    stations.push({ group, state });
    
    const label = document.createElement('div');
    label.style.position = 'absolute';
    label.style.color = 'white';
    label.style.fontSize = '12px';
    label.style.backgroundColor = 'rgba(0,0,0,0.5)';
    label.style.padding = '2px 4px';
    label.textContent = type;
    root.appendChild(label);
    
    group.userData.label = label;
  });
  
  let onFire = false;
  btn.onclick = () => {
    onFire = !onFire;
    stations.forEach(s => {
      s.state.onFire = onFire;
      s.state.progress = onFire ? 0.6 : 0; // show some progress when on fire
    });
  };
  
  let time = 0;
  let lastTime = performance.now();
  
  function animate() {
    requestAnimationFrame(animate);
    
    const now = performance.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;
    time += dt;
    
    stations.forEach(s => {
      updateStationModel(s.group, s.state, time, particleSystem);
      
      if (s.group.userData.label) {
        const tempV = new THREE.Vector3();
        tempV.copy(s.group.position);
        tempV.project(camera);
        const lx = (tempV.x *  .5 + .5) * window.innerWidth;
        const ly = (tempV.y * -.5 + .5) * window.innerHeight;
        s.group.userData.label.style.left = `${lx}px`;
        s.group.userData.label.style.top = `${ly}px`;
      }
    });
    
    particleSystem.update(dt, camera.rotation);
    renderer.render(scene, camera);
  }
  
  animate();
}
