import * as THREE from 'three';
import { getSharedWebGLRenderer } from './SharedWebGL';
import { AssetLoader } from '../assets/AssetLoader';
import { ChefModel } from './chef/Chef';
import { THEMES } from './themes';
import { LobbyPlayer, PLAYER_COLORS } from '@kitchen/core';
import { getSettings, subscribe as subscribeSettings, Quality } from '../../state/settings';
import { loadQuatModel, getCharacterUrlForCosmetic } from './chef/quatClips';

export class MenuRenderer {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private container: HTMLElement;
  private animationId = 0;
  private lastTime = 0;
  private chefs: Map<string, ChefModel> = new Map();
  private menuChefs: ChefModel[] = [];
  private nameTags: Map<string, HTMLElement> = new Map();
  private overlay: HTMLElement;
  private dirLight: THREE.DirectionalLight | null = null;
  private unsubSettings: (() => void) | null = null;
  private disposed = false;
  
  constructor(container: HTMLElement) {
    this.container = container;
    this.renderer = getSharedWebGLRenderer();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);
    
    this.overlay = document.createElement('div');
    this.overlay.style.position = 'absolute';
    this.overlay.style.inset = '0';
    this.overlay.style.pointerEvents = 'none';
    this.overlay.style.zIndex = '10';
    container.appendChild(this.overlay);
    
    this.scene = new THREE.Scene();
    const theme = (THEMES['diner'] || THEMES['ship']) as any;
    this.scene.background = new THREE.Color(theme.background || 0x2b1e16);
    this.scene.fog = new THREE.FogExp2(theme.fogColor || 0x2b1e16, 0.0009);
    
    const aspect = (container.clientWidth || 800) / (container.clientHeight || 600);
    this.camera = new THREE.PerspectiveCamera(34, aspect, 1, 5000);
    this.camera.position.set(42, 118, 235);
    this.camera.lookAt(42, 34, -10);
    
    // Warm Overcooked / Ready Set Cook Diorama Lighting
    this.dirLight = new THREE.DirectionalLight(0xffe6c2, 1.55);
    this.dirLight.position.set(90, 160, 110);
    this.dirLight.castShadow = true;
    this.scene.add(this.dirLight);
    
    const hemi = new THREE.HemisphereLight(0xfff6e5, 0xc89d7c, 0.85);
    this.scene.add(hemi);

    const ambient = new THREE.AmbientLight(0xfff0dd, 0.95);
    this.scene.add(ambient);

    const warmPoint = new THREE.PointLight(0xff944d, 1.15, 280);
    warmPoint.position.set(85, 68, -10);
    this.scene.add(warmPoint);

    const rimPoint = new THREE.PointLight(0x60a5fa, 0.55, 260);
    rimPoint.position.set(-40, 85, -45);
    this.scene.add(rimPoint);

    this.setQuality(getSettings().quality);
    this.unsubSettings = subscribeSettings((s) => {
      if (!this.disposed) this.setQuality(s.quality);
    });
    
    this.initScene();
    this.animate = this.animate.bind(this);
    this.lastTime = performance.now();
    this.animate();
    
    this.onResize = this.onResize.bind(this);
    window.addEventListener('resize', this.onResize);
  }

  public setQuality(q: Quality): void {
    if (!this.renderer) return;
    if (q === 'low') {
      this.renderer.setPixelRatio(1);
      this.renderer.shadowMap.enabled = false;
    } else {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.shadowMap.enabled = true;
      if (this.dirLight) {
        const sz = q === 'medium' ? 1024 : 2048;
        this.dirLight.shadow.mapSize.width = sz;
        this.dirLight.shadow.mapSize.height = sz;
      }
    }
  }
  
  private onResize() {
    if (this.disposed || !this.renderer) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
  
  private async initScene() {
    // 1. Outer warm wooden restaurant surround
    const floorGeo = new THREE.PlaneGeometry(1400, 1400);
    const floorMat = new THREE.MeshStandardMaterial({ 
      color: 0x3b261a, 
      roughness: 0.75, 
      metalness: 0.05 
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Checkered Kitchen Island Diorama Platform
    const islandGroup = new THREE.Group();
    const tileSize = 36;
    const cols = 7;
    const rows = 4;
    const startX = -55;
    const startZ = -65;

    const baseFrameGeo = new THREE.BoxGeometry(cols * tileSize + 12, 6, rows * tileSize + 12);
    const baseFrameMat = new THREE.MeshLambertMaterial({ color: 0x8b5a2b });
    const baseFrame = new THREE.Mesh(baseFrameGeo, baseFrameMat);
    baseFrame.position.set(startX + (cols * tileSize) / 2 - tileSize / 2, -3.2, startZ + (rows * tileSize) / 2 - tileSize / 2);
    baseFrame.receiveShadow = true;
    islandGroup.add(baseFrame);

    const tileGeo = new THREE.BoxGeometry(tileSize * 0.96, 2, tileSize * 0.96);
    const lightTileMat = new THREE.MeshStandardMaterial({ color: 0xf3c68f, roughness: 0.78, metalness: 0.0 });
    const darkTileMat = new THREE.MeshStandardMaterial({ color: 0xe2b074, roughness: 0.78, metalness: 0.0 });
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const tm = new THREE.Mesh(tileGeo, (r + c) % 2 === 0 ? lightTileMat : darkTileMat);
        tm.position.set(startX + c * tileSize, -0.5, startZ + r * tileSize);
        tm.receiveShadow = true;
        islandGroup.add(tm);
      }
    }
    this.scene.add(islandGroup);

    // 2. Load necessary models from manifest
    const loader = AssetLoader.getInstance();
    await Promise.all([
      loader.loadAsset('station_counter'),
      loader.loadAsset('station_stove'),
      loader.loadAsset('station_oven'),
      loader.loadAsset('station_crate_tomato'),
      loader.loadAsset('pot')
    ]);
    if (this.disposed) return;

    // 3. Add kitchen counter, crates, stove & pizza oven in background (scaled slightly for menu diorama)
    const counterAsset = loader.getAssetSync('station_counter');
    if (counterAsset) {
      const positions = [-16, 24, 64];
      for (const px of positions) {
        const c = counterAsset.scene.clone(true);
        c.scale.setScalar(0.62);
        c.position.set(px, 0, -32);
        this.scene.add(c);
      }
    }

    const crateAsset = loader.getAssetSync('station_crate_tomato');
    if (crateAsset) {
      const crate = crateAsset.scene.clone(true);
      crate.scale.setScalar(0.62);
      crate.position.set(-56, 0, -32);
      this.scene.add(crate);
    }

    const stoveAsset = loader.getAssetSync('station_stove');
    if (stoveAsset) {
      const stove = stoveAsset.scene.clone(true);
      stove.scale.setScalar(0.62);
      stove.position.set(104, 0, -32);
      this.scene.add(stove);

      const potAsset = loader.getAssetSync('pot');
      if (potAsset) {
        const pot = potAsset.scene.clone(true);
        pot.scale.setScalar(0.65);
        pot.position.set(104, 26, -32);
        this.scene.add(pot);
      }
    }

    const ovenAsset = loader.getAssetSync('station_oven');
    if (ovenAsset) {
      const oven = ovenAsset.scene.clone(true);
      oven.scale.setScalar(0.62);
      oven.position.set(144, 0, -32);
      this.scene.add(oven);
    }

    // 4. Two Overcooked Chibi chefs standing on the kitchen island
    const color0 = PLAYER_COLORS[0] ?? 0xe74c3c;
    const color1 = PLAYER_COLORS[1] ?? 0x3498db;
    const chef1 = new ChefModel(color0, false);
    const chef2 = new ChefModel(color1, false);

    chef1.group.position.set(-12, 0, 18);
    chef1.group.rotation.y = 0.22;
    chef1.group.scale.setScalar(0.72);
    loadQuatModel('/assets/quat/chef_hat.glb').then(res => {
      if (!this.disposed) {
        chef1.loadQuat(res);
        chef1.playAnim('victory', 0.2);
      }
    }).catch(() => {});

    chef2.group.position.set(95, 0, 18);
    chef2.group.rotation.y = -0.25;
    chef2.group.scale.setScalar(0.72);
    loadQuatModel('/assets/quat/chef_female.glb').then(res => {
      if (!this.disposed) {
        chef2.loadQuat(res);
        chef2.playAnim('idle', 0.2);
      }
    }).catch(() => {});

    this.scene.add(chef1.group);
    this.scene.add(chef2.group);
    this.menuChefs = [chef1, chef2];
  }
  
  updatePlayers(players: LobbyPlayer[]) {
    if (this.disposed) return;
    
    // In menu (0 players): show the 2 idle menu chefs
    if (!players || players.length === 0) {
      for (const c of this.menuChefs) {
        c.group.visible = true;
      }
      for (const chef of this.chefs.values()) {
        this.scene.remove(chef.group);
        chef.dispose();
      }
      this.chefs.clear();
      for (const tag of this.nameTags.values()) {
        tag.remove();
      }
      this.nameTags.clear();
      return;
    }

    // In lobby (> 0 players): hide the default 2 menu chefs, show lobby players
    for (const c of this.menuChefs) {
      c.group.visible = false;
    }

    const currentIds = new Set(players.map(p => p.id));
    
    for (const [id, chef] of this.chefs.entries()) {
      if (!currentIds.has(id)) {
        this.scene.remove(chef.group);
        chef.dispose();
        this.chefs.delete(id);
        const tag = this.nameTags.get(id);
        if (tag) tag.remove();
        this.nameTags.delete(id);
      }
    }
    
    players.forEach((p, i) => {
      let chef = this.chefs.get(p.id);
      if (!chef) {
        const colorHex = PLAYER_COLORS[p.cosmetic?.color ?? p.color ?? 0] ?? 0xe74c3c;
        chef = new ChefModel(colorHex, false);
        chef.group.scale.setScalar(0.75);
        const modelUrl = getCharacterUrlForCosmetic(p.cosmetic);
        const targetChef = chef;
        loadQuatModel(modelUrl).then(res => {
          if (!this.disposed) targetChef.loadQuat(res);
        }).catch(() => {});
        this.scene.add(chef.group);
        this.chefs.set(p.id, chef);
        
        const tag = document.createElement('div');
        tag.style.position = 'absolute';
        tag.style.color = '#fff';
        tag.style.textShadow = '0 1px 3px rgba(0,0,0,0.8)';
        tag.style.fontWeight = 'bold';
        tag.style.transform = 'translate(-50%, -100%)';
        tag.style.textAlign = 'center';
        this.overlay.appendChild(tag);
        this.nameTags.set(p.id, tag);
      }
      
      const tag = this.nameTags.get(p.id)!;
      tag.innerHTML = `${p.name}<br/>${p.ready ? '✅' : '⏳'}`;
      
      // Position evenly across the screen, offset to the left for the lobby panel
      const spacing = 40;
      const offsetX = (i - (players.length - 1) / 2) * spacing - 60;
      chef.group.position.set(offsetX, 0, 0);
    });
  }
  
  private animate() {
    if (this.disposed) return;
    this.animationId = requestAnimationFrame(this.animate);
    
    const now = performance.now();
    const dtSec = Math.min((now - this.lastTime) * 0.001, 0.1);
    this.lastTime = now;

    const time = now * 0.001;
    const wHalf = this.container.clientWidth / 2;
    const hHalf = this.container.clientHeight / 2;

    // 1. If menuChefs are visible (in menu)
    if (this.menuChefs.length > 0 && this.menuChefs[0]!.group.visible) {
      for (let i = 0; i < this.menuChefs.length; i++) {
        const chef = this.menuChefs[i]!;
        // Gentle bobbing
        chef.group.position.y = Math.sin(time * 2 + i * 1.5) * 1.5;
        // Gentle rotation: max angular velocity = 0.22 * 0.8 = 0.176 rad/s <= 0.4 rad/s
        const baseRot = i === 0 ? -0.15 : 0.15;
        chef.group.rotation.y = baseRot + Math.sin(time * 0.8 + i * 1.2) * 0.22;
        // Update mixer for idle animation
        chef.update(dtSec);
      }
    }
    
    // 2. If lobby chefs are active
    let index = 0;
    for (const [id, chef] of this.chefs.entries()) {
      chef.group.position.y = Math.sin(time * 2 + index) * 2;
      chef.group.rotation.y = Math.PI * 0.1 + Math.sin(time * 0.8 + index) * 0.15;
      chef.update(dtSec);
      
      const tag = this.nameTags.get(id);
      if (tag && this.camera) {
        const pos = chef.group.position.clone();
        pos.y += 35; // Head offset
        pos.project(this.camera);
        const x = (pos.x * wHalf) + wHalf;
        const y = -(pos.y * hHalf) + hHalf;
        tag.style.left = `${x}px`;
        tag.style.top = `${y}px`;
        tag.style.zIndex = pos.z < 1 ? '10' : '-1';
      }
      index++;
    }
    
    if (this.renderer) {
      this.renderer.render(this.scene, this.camera);
    }
  }
  
  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.onResize);
    if (this.unsubSettings) {
      this.unsubSettings();
      this.unsubSettings = null;
    }
    
    if (this.renderer && this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
    
    if (this.overlay) this.overlay.remove();
    
    for (const chef of this.menuChefs) {
      chef.dispose();
    }
    this.menuChefs = [];

    for (const chef of this.chefs.values()) {
      chef.dispose();
    }
    this.chefs.clear();

    for (const tag of this.nameTags.values()) {
      tag.remove();
    }
    this.nameTags.clear();
    
    if (this.scene) {
      this.scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          if (obj.geometry && !obj.geometry.userData?.isSharedAsset) {
            obj.geometry.dispose();
          }
          if (obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach(m => {
                if (m && !m.userData?.isSharedAsset) m.dispose();
              });
            } else if (!obj.material.userData?.isSharedAsset) {
              obj.material.dispose();
            }
          }
        }
      });
      while (this.scene.children.length > 0) {
        this.scene.remove(this.scene.children[0]!);
      }
    }
  }
}
