import * as THREE from 'three';
import { StationInit, TILE_PX, ParsedLevel } from '@kitchen/core';
import { toon, withOutline } from './materials';
import { createItemModel } from './items';
import { ParticleSystem } from './vfx/Particles';
import { AssetLoader } from '../assets/AssetLoader';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/**
 * Computes a lightweight visual fingerprint for an item while ignoring continuous
 * `progress` numbers so stations/chefs do not re-clone 3D GLB models every frame while cooking.
 */
export function getItemVisualKey(item: any): string {
  if (!item) return '';
  if (item.type === 'ingredient') {
    return `ing:${item.id}:${item.state}`;
  }
  if (item.type === 'plate') {
    const c = Array.isArray(item.contents)
      ? item.contents.map((x: any) => `${x.id}:${x.state}`).join(',')
      : '';
    return `plate:${item.dirty ? 1 : 0}:${c}`;
  }
  if (item.type === 'tool') {
    const c = Array.isArray(item.contents)
      ? item.contents.map((x: any) => `${x.id}:${x.state}`).join(',')
      : '';
    return `tool:${item.tool}:${c}`;
  }
  return JSON.stringify(item);
}

/** Red "MISSING: <name>" billboard so a failed model is never silently replaced by a box. */
function createMissingLabel(name: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ff2222';
  ctx.font = 'bold 56px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`MISSING: ${name}`, canvas.width / 2, canvas.height / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  sprite.scale.set(TILE_PX * 1.6, TILE_PX * 0.4, 1);
  sprite.renderOrder = 999;
  return sprite;
}

/** Places a GLB item model on top of whatever base is currently in the group. Returns false if missing. */
function addCrateItemModel(group: THREE.Group, assetId: string): boolean {
  group.updateMatrixWorld(true);
  const baseTop = group.children.length ? new THREE.Box3().setFromObject(group).max.y : 0;
  const glb = AssetLoader.getInstance().getAssetSync(assetId);
  if (!glb) {
    console.error(`[stations] MISSING model for crate item "${assetId}" — not rendering a fallback box.`);
    const label = createMissingLabel(assetId);
    label.position.set(0, Math.max(baseTop, TILE_PX * 0.9) + TILE_PX * 0.4, 0);
    group.add(label);
    return false;
  }
  glb.scene.traverse((o: any) => {
    if (o.isMesh && !o.userData.isOutline) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  glb.scene.position.set(0, baseTop, 0); // pivot is at the bottom -> bottom rests on the base top
  glb.scene.userData.isCrateItem = true;
  group.add(glb.scene);
  return true;
}

function addDoughCrateVisual(group: THREE.Group): void {
  const doughContainer = new THREE.Group();
  doughContainer.userData.isCrateItem = true;

  // Flour tray liner inside the crate
  const trayGeo = new THREE.BoxGeometry(TILE_PX * 0.68, 4, TILE_PX * 0.68);
  const tray = new THREE.Mesh(trayGeo, toon(0xfef9c3));
  tray.position.set(0, 20, 0);
  doughContainer.add(tray);

  // 4 plump creamy-white flour dough balls
  const ballGeo = new THREE.SphereGeometry(TILE_PX * 0.14, 14, 10);
  ballGeo.scale(1.0, 0.68, 1.0);
  const ballMat = toon(0xffffff);
  const offsets: [number, number][] = [
    [-TILE_PX * 0.15, -TILE_PX * 0.14],
    [TILE_PX * 0.15, -TILE_PX * 0.14],
    [-TILE_PX * 0.15, TILE_PX * 0.14],
    [TILE_PX * 0.15, TILE_PX * 0.14],
  ];
  for (const [ox, oz] of offsets) {
    const ball = new THREE.Mesh(ballGeo, ballMat);
    ball.position.set(ox, 25, oz);
    ball.castShadow = true;
    doughContainer.add(withOutline(ball));
  }

  // Wooden Rolling Pin resting across the dough balls
  const pinGroup = new THREE.Group();
  const rollerGeo = new THREE.CylinderGeometry(3.2, 3.2, TILE_PX * 0.42, 12);
  rollerGeo.rotateZ(Math.PI / 2);
  const roller = new THREE.Mesh(rollerGeo, toon(0xfde68a));
  pinGroup.add(withOutline(roller));

  const handleGeo = new THREE.CylinderGeometry(1.6, 1.6, TILE_PX * 0.64, 10);
  handleGeo.rotateZ(Math.PI / 2);
  const handle = new THREE.Mesh(handleGeo, toon(0xd97706));
  pinGroup.add(handle);

  pinGroup.position.set(0, 30.5, 0);
  pinGroup.rotation.y = Math.PI / 5;
  doughContainer.add(pinGroup);

  group.add(doughContainer);
}

const stainlessTopGeo = new RoundedBoxGeometry(TILE_PX * 0.95, 2.0, TILE_PX * 0.95, 2, 0.4);
const stainlessTopMat = new THREE.MeshLambertMaterial({ color: 0xdbe4ee });

let cachedTableclothMat: THREE.MeshLambertMaterial | null = null;
function getCheckeredTableclothMaterial(): THREE.MeshLambertMaterial {
  if (cachedTableclothMat) return cachedTableclothMat;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const cells = 8;
    const step = canvas.width / cells;
    for (let r = 0; r < cells; r++) {
      for (let c = 0; c < cells; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? '#fffdf9' : '#e03e36';
        ctx.fillRect(c * step, r * step, step, step);
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  cachedTableclothMat = new THREE.MeshLambertMaterial({ map: tex });
  return cachedTableclothMat;
}

function addStainlessWorktop(group: THREE.Group) {
  const cap = new THREE.Mesh(stainlessTopGeo, stainlessTopMat);
  cap.position.set(0, COUNTER_SURFACE_Y - 0.8, 0);
  cap.receiveShadow = true;
  group.add(cap);
}

const CRATE_BADGE_INFO: Record<string, { emoji: string; bg: string; ring: string }> = {
  tomato:   { emoji: '🍅', bg: '#fff1f2', ring: '#ef4444' },
  lettuce:  { emoji: '🥬', bg: '#f0fdf4', ring: '#22c55e' },
  meat:     { emoji: '🥩', bg: '#fef2f2', ring: '#dc2626' },
  cheese:   { emoji: '🧀', bg: '#fefce8', ring: '#eab308' },
  bun:      { emoji: '🍞', bg: '#fffbeb', ring: '#d97706' },
  dough:    { emoji: '🫓', bg: '#fefce8', ring: '#ca8a04' },
  fish:     { emoji: '🐟', bg: '#f0f9ff', ring: '#0284c7' },
  rice:     { emoji: '🍚', bg: '#f8fafc', ring: '#64748b' },
  mushroom: { emoji: '🍄', bg: '#fdf4ff', ring: '#a855f7' },
  onion:    { emoji: '🧅', bg: '#fff7ed', ring: '#ea580c' },
  carrot:   { emoji: '🥕', bg: '#fff7ed', ring: '#f97316' },
};

function createCrateBadgeSprite(crateId?: string): THREE.Sprite | null {
  if (!crateId || typeof document === 'undefined') return null;
  const info = CRATE_BADGE_INFO[crateId] || { emoji: '📦', bg: '#fffbeb', ring: '#d97706' };
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 128, 128);
    // Drop shadow
    ctx.beginPath();
    ctx.arc(64, 68, 48, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    ctx.fill();

    // Outer dark comic outline
    ctx.beginPath();
    ctx.arc(64, 62, 48, 0, Math.PI * 2);
    ctx.fillStyle = info.bg;
    ctx.fill();
    ctx.lineWidth = 9;
    ctx.strokeStyle = '#1f1610';
    ctx.stroke();

    // Inner colored accent ring
    ctx.beginPath();
    ctx.arc(64, 62, 41, 0, Math.PI * 2);
    ctx.lineWidth = 5;
    ctx.strokeStyle = info.ring;
    ctx.stroke();

    // Emoji icon
    ctx.font = '54px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(info.emoji, 64, 65);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(TILE_PX * 0.50, TILE_PX * 0.50, 1);
  sprite.position.set(0, COUNTER_SURFACE_Y + 26, 0);
  sprite.renderOrder = 895;
  sprite.userData.isCrateBadge = true;
  return sprite;
}

function renderStatusBadgeCanvas(text: string, bg: string, borderColor: string): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, 256, 96);
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(18, 18, 220, 66, 33);
    ctx.fill();
  }

  // Pill background
  ctx.fillStyle = bg;
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 7;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(16, 14, 220, 66, 33);
  } else {
    ctx.rect(16, 14, 220, 66);
  }
  ctx.fill();
  ctx.stroke();

  ctx.font = '900 34px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 126, 48);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const COUNTER_SURFACE_Y = 40.0;
export const TABLE_SURFACE_Y = 35.8;

// Shared Ambient Occlusion (AO) Contact Shadow Skirt geometry & material under every station
const stationAoSkirtGeo = new THREE.PlaneGeometry(TILE_PX * 1.08, TILE_PX * 1.08);
stationAoSkirtGeo.rotateX(-Math.PI / 2);
stationAoSkirtGeo.userData.isSharedAsset = true;
const stationAoSkirtMat = new THREE.MeshBasicMaterial({
  color: 0x1a0f08,
  transparent: true,
  opacity: 0.28,
  depthWrite: false,
});
stationAoSkirtMat.userData.isSharedAsset = true;
const sharedBaseGeo = new RoundedBoxGeometry(TILE_PX * 0.98, COUNTER_SURFACE_Y, TILE_PX * 0.98, 2, 0.05);
sharedBaseGeo.userData.isSharedAsset = true;

export function createStationModel(station: StationInit, level: ParsedLevel): THREE.Group {
  const group = new THREE.Group();
  group.name = 'station_' + station.type;

  // Ambient Occlusion Contact Shadow Skirt at Y = 0.15 so every counter/station pops off the floor!
  const aoSkirt = new THREE.Mesh(stationAoSkirtGeo, stationAoSkirtMat);
  aoSkirt.position.y = 0.15;
  aoSkirt.renderOrder = 1;
  group.add(aoSkirt);

  // Base counter block
  const baseGeo = sharedBaseGeo;
  
  const addBase = (assetId?: string, fallbackColorHex: number = 0xc98a4b, customSurfaceY?: number) => {
    if (assetId) {
      const glb = AssetLoader.getInstance().getAssetSync(assetId);
      if (glb) {
        group.add(glb.scene);
        group.updateMatrixWorld(true);
        group.userData.surfaceY = customSurfaceY ?? COUNTER_SURFACE_Y;
        return true;
      }
    }
    const mesh = new THREE.Mesh(baseGeo, toon(fallbackColorHex));
    mesh.position.y = COUNTER_SURFACE_Y * 0.5;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(withOutline(mesh));
    group.userData.surfaceY = customSurfaceY ?? COUNTER_SURFACE_Y;
    return false;
  };
  
  // Helper to orient side-wall delivery windows toward the kitchen floor
  const faceFloor = () => {
    const { x, y } = station;
    const dirs = [
      { dx: 0, dy: 1, rot: 0 },
      { dx: -1, dy: 0, rot: -Math.PI / 2 },
      { dx: 1, dy: 0, rot: Math.PI / 2 },
      { dx: 0, dy: -1, rot: Math.PI },
    ];
    for (const { dx, dy, rot } of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < level.width && ny >= 0 && ny < level.height) {
        if (level.tiles[ny * level.width + nx] === 'floor') {
          group.rotation.y = rot;
          return;
        }
      }
    }
  };

  switch (station.type) {
    case 'counter':
      if (station.x < Math.floor(level.width * 0.42)) {
        if (!addBase('station_counter_b', 0xc98a4b)) {
          addBase('station_counter', 0xc98a4b);
        }
      } else {
        addBase('station_counter', 0xc98a4b);
      }
      break;
    case 'table':
      if (!addBase('table', 0x8b5a2b, TABLE_SURFACE_Y)) {
        addBase('station_counter', 0x8b4513, COUNTER_SURFACE_Y);
      } else {
        const chairLeft = AssetLoader.getInstance().getAssetSync('chair');
        if (chairLeft) {
          chairLeft.scene.position.set(-TILE_PX * 0.54, 0, 0);
          chairLeft.scene.rotation.y = Math.PI / 2;
          group.add(chairLeft.scene);
        }
        
        const chairRight = AssetLoader.getInstance().getAssetSync('chair');
        if (chairRight) {
          chairRight.scene.position.set(TILE_PX * 0.54, 0, 0);
          chairRight.scene.rotation.y = -Math.PI / 2;
          group.add(chairRight.scene);
        }
      }
      {
        const tableY = group.userData.surfaceY || TABLE_SURFACE_Y;
        const ketchup = AssetLoader.getInstance().getAssetSync('ketchup');
        if (ketchup) {
          ketchup.scene.position.set(TILE_PX * 0.25, tableY, -TILE_PX * 0.20);
          ketchup.scene.scale.multiplyScalar(0.76);
          group.add(ketchup.scene);
        }
        const mustard = AssetLoader.getInstance().getAssetSync('mustard');
        if (mustard) {
          mustard.scene.position.set(TILE_PX * 0.14, tableY, -TILE_PX * 0.26);
          mustard.scene.scale.multiplyScalar(0.76);
          group.add(mustard.scene);
        }
      }
      break;
    case 'cutting':
      addBase('station_counter', 0xc98a4b, COUNTER_SURFACE_Y);
      const board = AssetLoader.getInstance().getAssetSync('station_chopping');
      const counterY = group.userData.surfaceY || COUNTER_SURFACE_Y;
      if (board) {
        board.scene.position.y = counterY;
        group.add(board.scene);
      } else {
        const cbGeo = new THREE.BoxGeometry(TILE_PX * 0.6, 4, TILE_PX * 0.4);
        const cb = new THREE.Mesh(cbGeo, toon(0xcd853f));
        cb.position.y = counterY + 2;
        cb.castShadow = true;
        group.add(withOutline(cb));
      }
      break;
    case 'stove':
      if (!addBase('station_stove', 0x333333, COUNTER_SURFACE_Y + 3.2)) {
        const burnerGeo = new THREE.CylinderGeometry(TILE_PX * 0.25, TILE_PX * 0.25, 2, 16);
        const b1 = new THREE.Mesh(burnerGeo, new THREE.MeshBasicMaterial({ color: 0xff4400 }));
        b1.position.set(0, COUNTER_SURFACE_Y + 1, 0);
        b1.userData.isBurner = true;
        group.add(b1);
      }
      break;
    case 'oven':
      if (!addBase('station_oven', 0x333333, COUNTER_SURFACE_Y)) {
        const ovenBox = new THREE.Mesh(new THREE.BoxGeometry(TILE_PX * 0.9, COUNTER_SURFACE_Y, TILE_PX * 0.9), toon(0x333333));
        ovenBox.position.y = COUNTER_SURFACE_Y * 0.5;
        group.add(withOutline(ovenBox));
      }
      break;
    case 'crate':
      const crateAsset = `station_crate_${station.crate}`;
      if (!addBase(crateAsset, 0xc47d38, COUNTER_SURFACE_Y)) {
        addBase('station_crate_tomato', 0xc47d38, COUNTER_SURFACE_Y);
      }
      break;
    case 'trash':
      if (!addBase('station_trash', 0x4a6b53, COUNTER_SURFACE_Y)) {
        const hole = new THREE.Mesh(new THREE.BoxGeometry(TILE_PX * 0.6, 2, TILE_PX * 0.6), new THREE.MeshBasicMaterial({ color: 0x000000 }));
        hole.position.y = COUNTER_SURFACE_Y + 1;
        group.add(hole);
      }
      break;
    case 'sink':
      if (!addBase('station_sink', 0x94a8b8, COUNTER_SURFACE_Y + 0.5)) {
        const basin = new THREE.Mesh(new THREE.BoxGeometry(TILE_PX * 0.8, 4, TILE_PX * 0.6), new THREE.MeshBasicMaterial({ color: 0x00aaff }));
        basin.position.y = COUNTER_SURFACE_Y;
        group.add(basin);
      }
      break;
    case 'delivery' as any:
      addBase('station_delivery', 0x94a8b8, COUNTER_SURFACE_Y + 1.0);
      if (station.x === 0 || station.x === level.width - 1) {
        faceFloor();
      }
      break;
    case 'dish_return':
      addBase('station_counter_b', 0xc98a4b, COUNTER_SURFACE_Y);
      break;
    case 'plate_dispenser':
      addBase('station_counter', 0xc98a4b, COUNTER_SURFACE_Y);
      const initialClean = (station as any).cleanCount !== undefined ? (station as any).cleanCount : 3;
      const initRackAsset = initialClean > 0 ? 'station_dishrack_plates' : 'station_dishrack';
      const initRack = AssetLoader.getInstance().getAssetSync(initRackAsset);
      if (initRack) {
        initRack.scene.position.set(0, group.userData.surfaceY || COUNTER_SURFACE_Y, 0);
        group.add(initRack.scene);
        group.userData.rackModel = initRack.scene;
        group.userData.plateCount = initialClean;
      }
      break;
    case 'conveyor': {
      addBase('station_counter', 0xc98a4b, COUNTER_SURFACE_Y);
      const surfY = group.userData.surfaceY || COUNTER_SURFACE_Y;
      // Brushed stainless-steel conveyor roller track + warm honey-oak side rails + crisp white chevron arrows
      const beltTrack = new THREE.Group();
      const trackMat = new THREE.MeshStandardMaterial({ color: 0x94a8b8, roughness: 0.40, metalness: 0.25 });
      const railMat = new THREE.MeshStandardMaterial({ color: 0x9c622b, roughness: 0.80, metalness: 0.05 });
      const arrowMat = new THREE.MeshStandardMaterial({ color: 0xf2efe9, roughness: 0.80, metalness: 0.05 });

      const bed = new THREE.Mesh(new THREE.BoxGeometry(TILE_PX * 0.74, 2.2, TILE_PX * 0.92), trackMat);
      bed.position.y = surfY + 1.1;
      bed.receiveShadow = true;
      beltTrack.add(bed);

      for (const side of [-1, 1]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(TILE_PX * 0.09, 3.6, TILE_PX * 0.94), railMat);
        rail.position.set(side * TILE_PX * 0.41, surfY + 1.8, 0);
        rail.castShadow = true;
        rail.receiveShadow = true;
        beltTrack.add(rail);
      }

      // 2 white chevron directional arrows pointing along +Z (rotated by station.dir below)
      for (const zOff of [-TILE_PX * 0.18, TILE_PX * 0.16]) {
        const wingL = new THREE.Mesh(new THREE.BoxGeometry(TILE_PX * 0.24, 0.9, TILE_PX * 0.07), arrowMat);
        wingL.position.set(-TILE_PX * 0.07, surfY + 2.4, zOff);
        wingL.rotation.y = Math.PI / 5;
        const wingR = new THREE.Mesh(new THREE.BoxGeometry(TILE_PX * 0.24, 0.9, TILE_PX * 0.07), arrowMat);
        wingR.position.set(TILE_PX * 0.07, surfY + 2.4, zOff);
        wingR.rotation.y = -Math.PI / 5;
        beltTrack.add(wingL, wingR);
      }

      if (station.dir === 'up') beltTrack.rotation.y = Math.PI;
      else if (station.dir === 'down') beltTrack.rotation.y = 0;
      else if (station.dir === 'left') beltTrack.rotation.y = -Math.PI / 2;
      else if (station.dir === 'right') beltTrack.rotation.y = Math.PI / 2;

      group.add(beltTrack);
      group.userData.surfaceY = surfY + 2.2;
      break;
    }
    case 'extinguisher':
      addBase('station_counter', 0xc98a4b, COUNTER_SURFACE_Y);
      break;
    default:
      addBase('station_counter', 0xc98a4b, COUNTER_SURFACE_Y);
      break;
  }
  
  return group;
}

export function updateStationModel(group: THREE.Group, state: any, time: number, particleSystem?: ParticleSystem) {
  if (state.type === 'plate_dispenser') {
    if (group.userData.plateCount !== state.cleanCount) {
      group.userData.plateCount = state.cleanCount;
      if (group.userData.rackModel) {
        group.remove(group.userData.rackModel);
        group.userData.rackModel = null;
      }
      const count = state.cleanCount ?? 0;
      const rackAsset = count > 0 ? 'station_dishrack_plates' : 'station_dishrack';
      
      const setRack = (scene: THREE.Group) => {
        const surfY = group.userData.surfaceY || COUNTER_SURFACE_Y;
        scene.position.set(0, surfY, 0);
        group.add(scene);
        group.userData.rackModel = scene;
      };

      const cached = AssetLoader.getInstance().getAssetSync(rackAsset);
      if (cached) {
        setRack(cached.scene);
      } else {
        AssetLoader.getInstance().loadAsset(rackAsset).then(loaded => {
          if (loaded && group.userData.plateCount === state.cleanCount) {
            if (group.userData.rackModel) group.remove(group.userData.rackModel);
            setRack(loaded.scene);
          }
        });
      }
    }
  } else if (state.type === 'dish_return') {
    if (group.userData.dirtyCount !== state.dirtyCount) {
      group.userData.dirtyCount = state.dirtyCount;
      if (group.userData.dirtyModels) {
        for (const p of group.userData.dirtyModels) group.remove(p);
      }
      group.userData.dirtyModels = [];
      const count = Math.max(0, state.dirtyCount || 0);
      const surfY = group.userData.surfaceY || COUNTER_SURFACE_Y;
      for (let i = 0; i < count; i++) {
        const pModel = createItemModel({ type: 'plate', dirty: true, contents: [] });
        // Stack dirty plates starting flush at the counter surface
        pModel.position.set(0, surfY + i * 3.0, 0);
        group.add(pModel);
        group.userData.dirtyModels.push(pModel);
      }
    }
  }
  
  // Handle station item (ignore continuous progress ticks so cooking pans/pots don't re-clone GLB models 30x/sec)
  const itemVisualKey = getItemVisualKey(state.item);
  if (group.userData.lastItemData !== itemVisualKey) {
    group.userData.lastItemData = itemVisualKey;
    
    // Remove old item
    if (group.userData.itemModel) {
      group.remove(group.userData.itemModel);
      group.userData.itemModel = null;
    }
    
    // Add new item
    if (state.item) {
      const itemModel = createItemModel(state.item);
      const surfY = group.userData.surfaceY || (state.type === 'table' ? TABLE_SURFACE_Y : COUNTER_SURFACE_Y);
      if (state.type === 'oven') {
        // Place baking pizza INSIDE the oven cavity at Y = 12.0 (never on the roof at Y = 40.0!)
        itemModel.position.set(0, 12.0, 6.0);
        itemModel.scale.setScalar(0.76);
      } else {
        const itemY = state.type === 'cutting' ? surfY + 3.2 : (state.type === 'table' ? TABLE_SURFACE_Y : surfY);
        itemModel.position.set(0, itemY, 0); // flush on station surface (Y = 35.8 on customer checkered tablecloth)
      }
      if (state.type === 'stove' && state.item.type === 'tool' && state.item.tool === 'pan') {
        itemModel.rotation.y = 0; // Point handle outwards (towards +z, down the screen)
      }
      group.add(itemModel);
      group.userData.itemModel = itemModel;
    }
  }

  // Warm orange oven chamber glow (#ff7700) when baking inside the oven
  if (state.type === 'oven') {
    const isBaking = Boolean(state.item);
    if (isBaking) {
      if (!group.userData.ovenBakeGlow) {
        const glowBox = new THREE.Mesh(
          new THREE.BoxGeometry(TILE_PX * 0.58, TILE_PX * 0.22, TILE_PX * 0.48),
          new THREE.MeshBasicMaterial({
            color: 0xff7700,
            transparent: true,
            opacity: 0.42,
            depthWrite: false,
          })
        );
        glowBox.position.set(0, 16.0, 8.0);
        group.add(glowBox);
        group.userData.ovenBakeGlow = glowBox;
      }
      const glowMesh = group.userData.ovenBakeGlow as THREE.Mesh;
      glowMesh.visible = true;
      (glowMesh.material as THREE.MeshBasicMaterial).opacity = 0.36 + Math.sin(time * 8.0) * 0.10;
    } else if (group.userData.ovenBakeGlow) {
      (group.userData.ovenBakeGlow as THREE.Mesh).visible = false;
    }
  }
  
  if (particleSystem) {
    const surfY = group.userData.surfaceY || COUNTER_SURFACE_Y;
    const pos = new THREE.Vector3(
      state.x * TILE_PX + TILE_PX / 2,
      surfY + 12,
      state.y * TILE_PX + TILE_PX / 2
    );
    
    if (state.onFire) {
      // Emit rising flame sparks and dark smoke puffs
      if (Math.random() < 0.35) {
        particleSystem.emit('fire', pos, 1);
      }
      if (Math.random() < 0.22) {
        particleSystem.emit('smoke', pos, 1);
      }
    } else if (state.type === 'stove' && state.item && state.item.type === 'tool') {
      // Emit steam or smoke when cooking
      if (state.item.progress > 0 && Math.random() < 0.14) {
        if (state.item.contents?.some((c: any) => c.state === 'burnt')) {
          particleSystem.emit('smoke', pos, 1);
        } else {
          particleSystem.emit('steam', pos, 1);
        }
      }
    } else if (state.type === 'oven' && state.item) {
      if ((state.progress > 0 || state.item.state === 'cooked') && Math.random() < 0.18) {
        if (state.item.state === 'burnt') {
          particleSystem.emit('smoke', pos, 1);
        } else {
          particleSystem.emit('steam', pos, 1);
        }
      }
    } else if (state.type === 'sink' && state.progress > 0) {
      if (Math.random() < 0.25) {
        particleSystem.emit('bubble', pos, 1);
      }
    } else if (state.type === 'cutting' && state.progress > 0) {
      if (Math.random() < 0.22) {
        particleSystem.emit('chop', pos, 1);
      }
    }
  }

  // Handle realistic multi-layered 3D fire cluster lazily (created only when station catches fire)
  if (state.onFire) {
    if (!group.userData.fireMesh) {
      const surfY = group.userData.surfaceY || COUNTER_SURFACE_Y;
      const fireGroup = new THREE.Group();
      fireGroup.position.set(0, surfY + 2, 0);

      // Warm glowing ember ring on the station surface
      const glowGeo = new THREE.CircleGeometry(TILE_PX * 0.40, 24);
      glowGeo.rotateX(-Math.PI / 2);
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0xff4500,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      });
      const glowDisc = new THREE.Mesh(glowGeo, glowMat);
      glowDisc.position.y = 0.5;
      fireGroup.add(glowDisc);

      // Multi-layered smooth flame tongues (outer crimson-orange, mid amber, inner bright yellow core)
      const tongueSpecs = [
        { r: TILE_PX * 0.28, h: TILE_PX * 0.78, x: 0, z: 0, color: 0xff3b00, opacity: 0.85, speed: 9.0, phase: 0.0, tiltX: 0.06, tiltZ: -0.05 },
        { r: TILE_PX * 0.22, h: TILE_PX * 0.66, x: -6.5, z: 4.5, color: 0xff5500, opacity: 0.88, speed: 11.5, phase: 1.3, tiltX: -0.14, tiltZ: 0.12 },
        { r: TILE_PX * 0.21, h: TILE_PX * 0.64, x: 6.5, z: -4.0, color: 0xff6d00, opacity: 0.88, speed: 10.8, phase: 2.5, tiltX: 0.12, tiltZ: -0.14 },
        { r: TILE_PX * 0.19, h: TILE_PX * 0.58, x: 4.5, z: 6.0, color: 0xff9100, opacity: 0.90, speed: 13.0, phase: 3.7, tiltX: 0.15, tiltZ: 0.10 },
        { r: TILE_PX * 0.18, h: TILE_PX * 0.55, x: -5.5, z: -5.5, color: 0xffab00, opacity: 0.90, speed: 12.2, phase: 4.9, tiltX: -0.12, tiltZ: -0.12 },
        { r: TILE_PX * 0.16, h: TILE_PX * 0.50, x: 0, z: 0, color: 0xffd600, opacity: 0.95, speed: 14.5, phase: 0.8, tiltX: -0.05, tiltZ: 0.06 },
        { r: TILE_PX * 0.10, h: TILE_PX * 0.34, x: 0, z: 0, color: 0xfff59d, opacity: 0.98, speed: 16.0, phase: 2.1, tiltX: 0.0, tiltZ: 0.0 },
      ];

      const tongues: THREE.Mesh[] = [];
      for (const spec of tongueSpecs) {
        const geo = new THREE.ConeGeometry(spec.r, spec.h, 14);
        // Shift geometry up so its base sits at y = 0 for natural vertical stretching
        geo.translate(0, spec.h * 0.5, 0);
        const mat = new THREE.MeshBasicMaterial({
          color: spec.color,
          transparent: true,
          opacity: spec.opacity,
          depthWrite: false,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(spec.x, 0, spec.z);
        mesh.rotation.set(spec.tiltX, 0, spec.tiltZ);
        mesh.userData = { spec };
        fireGroup.add(mesh);
        tongues.push(mesh);
      }

      fireGroup.userData.tongues = tongues;
      fireGroup.userData.glowDisc = glowDisc;
      group.add(fireGroup);
      group.userData.fireMesh = fireGroup;
    }

    const fireGroup = group.userData.fireMesh as THREE.Group;
    fireGroup.visible = true;
    const tongues = (fireGroup.userData.tongues as THREE.Mesh[]) || [];
    for (const tongue of tongues) {
      const { spec } = tongue.userData;
      const wave = Math.sin(time * spec.speed + spec.phase);
      const wave2 = Math.cos(time * (spec.speed * 0.75) + spec.phase * 1.7);
      tongue.scale.set(
        1 + wave2 * 0.14,
        1 + wave * 0.24,
        1 + wave2 * 0.14
      );
      tongue.rotation.x = spec.tiltX + wave2 * 0.12;
      tongue.rotation.z = spec.tiltZ + wave * 0.12;
    }
    const glowDisc = fireGroup.userData.glowDisc as THREE.Mesh | undefined;
    if (glowDisc) {
      glowDisc.scale.setScalar(1 + Math.sin(time * 12) * 0.08);
    }
  } else if (group.userData.fireMesh) {
    (group.userData.fireMesh as THREE.Group).visible = false;
  }

  // Decide if we should show progress
  let showProgress = false;
  let progressRatio = 0;
  let progressColor = 0x29b6f6;
  
  if (state.type === 'cutting' && state.progress > 0) {
    showProgress = true;
    progressRatio = Math.min(1, state.progress / 3); // Assuming 3s to cut
    progressColor = 0x29b6f6; // Ready Set Cook sky-blue chopping progress bar
  } else if (state.type === 'sink' && state.progress > 0) {
    showProgress = true;
    progressRatio = Math.min(1, state.progress / 3); // Assuming 3s to wash
    progressColor = 0x29b6f6;
  } else if (state.type === 'stove') {
    if (state.onFire) {
      if (state.progress > 0) {
        showProgress = true;
        progressRatio = Math.min(1, state.progress / 2); // EXTINGUISH_TIME = 2
        progressColor = 0x0088ff; // Blue
      } else {
        showProgress = false;
      }
    } else if (state.burntTimer > 0) {
      showProgress = true;
      progressRatio = 1;
      progressColor = (Math.floor(time * 4) % 2 === 0) ? 0xff0000 : 0xffff00; // blink red/yellow
    } else if (state.item && state.item.type === 'tool' && state.item.progress > 0) {
      showProgress = true;
      const isPot = state.item.tool === 'pot';
      const cookTime = isPot ? 12 : 8; // POT_COOK_TIME or COOK_TIME
      const burnTime = isPot ? 10 : 6; // POT_BURN_TIME or BURN_TIME
      const totalTime = cookTime + burnTime;
      
      progressRatio = Math.min(1, state.item.progress / totalTime);
      
      if (state.item.progress < cookTime) {
        progressColor = 0x22ee55; // Bright green while cooking
      } else {
        progressColor = 0xff3b30; // Red when overcooking/burning
        if (state.item.progress > totalTime - 2) {
           progressColor = (Math.floor(time * 8) % 2 === 0) ? 0xffffff : 0xff0000; // blink white/red near end
        }
      }
    }
  } else if (state.type === 'oven') {
    if (state.onFire) {
      if (state.progress > 0) {
        showProgress = true;
        progressRatio = Math.min(1, state.progress / 2); // EXTINGUISH_TIME
        progressColor = 0x0088ff;
      }
    } else if (state.burntTimer > 0) {
      showProgress = true;
      progressRatio = 1;
      progressColor = (Math.floor(time * 4) % 2 === 0) ? 0xff0000 : 0xffff00;
    } else if (state.item && state.item.type === 'ingredient' && state.item.id === 'pizza') {
      const cookTime = 12; // OVEN_COOK_TIME
      const burnTime = 6;  // OVEN_BURN_TIME
      const totalTime = cookTime + burnTime;
      if (state.progress > 0) {
        showProgress = true;
        progressRatio = Math.min(1, state.progress / totalTime);
        if (state.progress < cookTime) {
          progressColor = 0x22ee55;
        } else {
          progressColor = 0xff3b30;
          if (state.progress > totalTime - 2) {
            progressColor = (Math.floor(time * 8) % 2 === 0) ? 0xffffff : 0xff0000;
          }
        }
      }
    }
  }

  if (showProgress) {
    if (!group.userData.progressBar) {
      const barOuterGeo = new THREE.PlaneGeometry(TILE_PX * 0.86, TILE_PX * 0.16);
      const barOuterMat = new THREE.MeshBasicMaterial({ color: 0x111111, depthTest: false });
      const barOuter = new THREE.Mesh(barOuterGeo, barOuterMat);
      barOuter.renderOrder = 910;

      const barBgGeo = new THREE.PlaneGeometry(TILE_PX * 0.80, TILE_PX * 0.11);
      const barBgMat = new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false });
      const barBg = new THREE.Mesh(barBgGeo, barBgMat);
      barBg.position.z = 0.01;
      barBg.renderOrder = 911;
      
      const barFgGeo = new THREE.PlaneGeometry(TILE_PX * 0.76, TILE_PX * 0.08);
      const barFgMat = new THREE.MeshBasicMaterial({ color: 0x29b6f6, depthTest: false });
      const barFg = new THREE.Mesh(barFgGeo, barFgMat);
      barFg.position.z = 0.02;
      barFg.position.x = -TILE_PX * 0.38; // anchor to left
      barFgGeo.translate(TILE_PX * 0.38, 0, 0); // shift geometry right so scaleX works properly
      barFg.renderOrder = 912;
      
      const barGroup = new THREE.Group();
      barGroup.rotation.order = 'YXZ';
      barGroup.add(barOuter);
      barGroup.add(barBg);
      barGroup.add(barFg);
      barGroup.position.set(0, TILE_PX * 1.35, 0);
      
      group.add(barGroup);
      group.userData.progressBar = barGroup;
      group.userData.progressBarFg = barFg;
    }

    const pBar = group.userData.progressBar as THREE.Group;
    const pFg = group.userData.progressBarFg as THREE.Mesh;
    pBar.visible = true;
    pFg.scale.x = Math.max(0.01, progressRatio);
    (pFg.material as THREE.MeshBasicMaterial).color.setHex(progressColor);
    
    // Undo station Y rotation first (order 'YXZ'), then tilt X toward camera so bar is always horizontal
    pBar.rotation.set(-Math.PI / 3.2, -group.rotation.y, 0);
  } else if (group.userData.progressBar) {
    (group.userData.progressBar as THREE.Group).visible = false;
  }

  // Gentle bobbing for Crate floating ingredient badge
  if (group.userData.crateBadge) {
    const badge = group.userData.crateBadge as THREE.Sprite;
    badge.position.y = COUNTER_SURFACE_Y + 26 + Math.sin(time * 2.8 + (state.x || 0) * 0.9 + (state.y || 0) * 0.7) * 2.4;
  }

  // Floating Overcooked/RSC status badge for Pots (1/3..3/3 ingredients), Cooked ✔, or Burn Warning ⚠️
  let badgeKey = '';
  let badgeText = '';
  let badgeBg = '#1e293b';
  let badgeBorder = '#111111';

  if (state.onFire) {
    badgeKey = 'fire';
    badgeText = '🔥 CHÁY BẾP!';
    badgeBg = '#dc2626';
    badgeBorder = '#fef08a';
  } else if (state.item && state.item.type === 'tool') {
    const contents: any[] = Array.isArray(state.item.contents) ? state.item.contents : [];
    const isPot = state.item.tool === 'pot';
    const cookTime = isPot ? 12 : 8;
    const anyBurnt = contents.some((c: any) => c.state === 'burnt');
    const allCooked = contents.length > 0 && contents.every((c: any) => c.state === 'cooked');

    if (anyBurnt) {
      badgeKey = 'burnt';
      badgeText = '💀 KHÉT RỒI!';
      badgeBg = '#1f2937';
      badgeBorder = '#ef4444';
    } else if (state.type === 'stove' && state.item.progress >= cookTime) {
      badgeKey = 'overcook';
      badgeText = '⚠️ SẮP CHÁY!';
      badgeBg = '#dc2626';
      badgeBorder = '#fde047';
    } else if (allCooked && (!isPot || contents.length >= 3)) {
      badgeKey = 'cooked';
      badgeText = isPot ? '✔ SÚP CHÍN' : '✔ ĐÃ CHÍN';
      badgeBg = '#16a34a';
      badgeBorder = '#bbf7d0';
    } else if (isPot && contents.length > 0) {
      const icons = contents.map((c: any) => CRATE_BADGE_INFO[c.id]?.emoji || '🍲').join('');
      const emptyDots = '⚪'.repeat(Math.max(0, 3 - contents.length));
      badgeKey = `pot:${ icons }:${ contents.length }`;
      badgeText = `${icons}${emptyDots} ${contents.length}/3`;
      badgeBg = '#0f172a';
      badgeBorder = '#38bdf8';
    }
  } else if (state.type === 'oven' && state.item && state.item.type === 'ingredient' && state.item.id === 'pizza') {
    if (state.item.state === 'burnt') {
      badgeKey = 'oven_burnt';
      badgeText = '💀 PIZZA KHÉT';
      badgeBg = '#1f2937';
      badgeBorder = '#ef4444';
    } else if (state.progress >= 12) {
      badgeKey = 'oven_overcook';
      badgeText = '⚠️ SẮP CHÁY!';
      badgeBg = '#dc2626';
      badgeBorder = '#fde047';
    } else if (state.item.state === 'cooked') {
      badgeKey = 'oven_cooked';
      badgeText = '✔ PIZZA CHÍN';
      badgeBg = '#16a34a';
      badgeBorder = '#bbf7d0';
    }
  }

  if (badgeKey && typeof document !== 'undefined') {
    let sp = group.userData.statusBadgeSprite as THREE.Sprite | undefined;
    if (!sp) {
      sp = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false }));
      sp.scale.set(TILE_PX * 0.92, TILE_PX * 0.34, 1);
      sp.renderOrder = 930;
      group.add(sp);
      group.userData.statusBadgeSprite = sp;
    }
    if (group.userData.statusBadgeKey !== badgeKey) {
      group.userData.statusBadgeKey = badgeKey;
      const tex = renderStatusBadgeCanvas(badgeText, badgeBg, badgeBorder);
      if (tex) {
        if (sp.material.map) sp.material.map.dispose();
        sp.material.map = tex;
        sp.material.needsUpdate = true;
      }
    }
    sp.visible = true;
    const isUrgent = badgeKey.includes('overcook') || badgeKey === 'fire';
    const pulse = isUrgent ? 1 + Math.sin(time * 12) * 0.12 : 1;
    sp.scale.set(TILE_PX * 0.92 * pulse, TILE_PX * 0.34 * pulse, 1);
    sp.position.set(0, ( showProgress ? TILE_PX * 1.62 : TILE_PX * 1.38 ) + Math.sin(time * 3.5) * 1.5, 0);
  } else if (group.userData.statusBadgeSprite) {
    (group.userData.statusBadgeSprite as THREE.Sprite).visible = false;
  }
}
