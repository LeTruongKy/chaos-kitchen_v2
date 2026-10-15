import * as THREE from 'three';
import { IGameRenderer, RenderFrame, RendererOptions } from '../render/IGameRenderer';
import { LevelDef, GameEvent, parseLevel, ParsedLevel, TILE_PX, PLAYER_RADIUS } from '@kitchen/core';
import { toon, withOutline, clearMaterials } from './materials';
import { THEMES, ThemePalette } from './themes';
import { SceneryManager } from './SceneryManager';
import { createStationModel, updateStationModel, COUNTER_SURFACE_Y, TABLE_SURFACE_Y, getItemVisualKey } from './stations';
import { ChefModel } from './chef/Chef';
import { ParticleSystem } from './vfx/Particles';
import { createItemModel } from './items';
import { AssetLoader, resolvePublicUrl } from '../assets/AssetLoader';
import { AssetManifest } from '../assets/AssetManifest';
import { getSharedWebGLRenderer } from './SharedWebGL';
import { CARRY_CONFIGS } from './chef/carryConfig';
import { sfx } from '../audio/Sfx';
import { loadQuatModel, getCharacterUrlForCosmetic, QUAT_CUSTOMER_MODELS } from './chef/quatClips';
import { generateLiveThumbnails } from './ThumbnailCache';

let cachedWoodTex: THREE.Texture | null = null;
function getSharedWoodTexture(): THREE.Texture {
  if (!cachedWoodTex) {
    cachedWoodTex = new THREE.TextureLoader().load(resolvePublicUrl('/assets/textures/hinoki_planks_diff_1k.jpg'));
    cachedWoodTex.colorSpace = THREE.SRGBColorSpace;
    cachedWoodTex.wrapS = THREE.RepeatWrapping;
    cachedWoodTex.wrapT = THREE.RepeatWrapping;
    cachedWoodTex.repeat.set(1, 1);
  }
  return cachedWoodTex;
}

function isMobileOrCoarseDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(pointer: coarse)').matches ||
    window.innerWidth <= 960 ||
    window.innerHeight <= 560
  );
}

function showToast(msg: string) {
  console.warn(msg);
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerText = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

export function getCustomerTargetAnimation(customer: { state: string; angry?: boolean }): 'sitting' | 'sitting_angry' | 'idle' {
  if (customer.state === 'seated_waiting_order' || customer.state === 'order_taken' || customer.state === 'eating' || customer.state === 'leaving') {
    return customer.angry ? 'sitting_angry' : 'sitting';
  }
  return 'idle';
}

export class ThreeRenderer implements IGameRenderer {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private container: HTMLElement | null = null;

  private parsedLevel?: ParsedLevel;
  private frame: RenderFrame | null = null;

  private playerModels = new Map<string, ChefModel>();
  private customerModels = new Map<number, ChefModel>();
  private stationMeshes = new Map<string, THREE.Object3D>();
  private projectileModels = new Map<number, THREE.Object3D>();
  private sceneryManager: SceneryManager | null = null;
  private particleSystem = new ParticleSystem();
  private targetHighlight: THREE.Object3D | null = null;
  private tapHighlight: THREE.Object3D | null = null;
  private raycaster = new THREE.Raycaster();
  private tempProjVec = new THREE.Vector3();
  private hintArrow: THREE.Mesh | null = null;
  private shakeTimer = 0;

  private debugDiv: HTMLDivElement | null = null;
  private vignetteDiv: HTMLDivElement | null = null;
  private isDebug = false;
  private lastTime = 0;
  private frames = 0;

  private dirLight: THREE.DirectionalLight | null = null;
  private theme: ThemePalette = THEMES['diner'] as ThemePalette;
  private currentLevelId: string = '';

  private baseCameraPos = new THREE.Vector3();
  private baseCameraLook = new THREE.Vector3();

  async init(container: HTMLElement, level: LevelDef, opts: RendererOptions): Promise<void> {
    this.container = container;
    this.currentLevelId = level.id || '';

    try {
      this.renderer = getSharedWebGLRenderer();
    } catch (e) {
      showToast('Lỗi WebGL: Hãy bật Hardware Acceleration trong cài đặt trình duyệt để chơi 3D!');
      throw e;
    }

    // Skip legacy 'chef' FBX + 6 Mixamo FBX animations (all characters use Quaternius GLTF)
    const manifestKeys = Object.keys(AssetManifest).filter(k => k !== 'chef');
    await Promise.all([
      ...manifestKeys.map(k => AssetLoader.getInstance().loadAsset(k)),
      loadQuatModel().catch(e => console.warn('Quat preload error:', e))
    ]);

    if (!this.renderer.capabilities.maxTextureSize) {
      showToast('Card đồ họa không hỗ trợ texture WebGL!');
      throw new Error('WebGLNotSupported');
    }

    // Generate live 3D thumbnails for customer order bubbles & recipe bar once per session
    generateLiveThumbnails(this.renderer);

    const isMobile = isMobileOrCoarseDevice();
    const maxDpr = isMobile ? 1.15 : 1.35;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = false;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.96;
    container.appendChild(this.renderer.domElement);

    // Ensure any old dark vignette overlay is removed so the viewport stays bright and airy
    if (this.vignetteDiv) {
      this.vignetteDiv.remove();
      this.vignetteDiv = null;
    }

    this.scene = new THREE.Scene();
    this.scene.add(this.particleSystem.group);

    this.theme = (THEMES[level.theme] || THEMES['diner']) as ThemePalette;
    this.scene.background = new THREE.Color(0x7ec8e3);
    this.scene.fog = new THREE.FogExp2(0x7ec8e3, 0.00010);

    const aspect = container.clientWidth / container.clientHeight;
    // FOV 30 degrees for Overcooked! clean overhead isometric look
    this.camera = new THREE.PerspectiveCamera(30, aspect, 1, 5000);

    this.parsedLevel = parseLevel(level);
    const mapCx = (this.parsedLevel.width * TILE_PX) * 0.5;
    const mapCz = (this.parsedLevel.height * TILE_PX) * 0.5;

    // Bright, cheerful Overcooked! 3-light rig (no dark corners, rich 3D volume):
    // 1. AmbientLight: Warm cream (#fff5e6), intensity 0.75 so shaded corners never look dark
    const ambientLight = new THREE.AmbientLight(0xfff5e6, 0.75);
    this.scene.add(ambientLight);

    // 2. HemisphereLight: Sky #fff8eb / Warm walnut ground #8c6239, intensity 0.60
    const hemiLight = new THREE.HemisphereLight(0xfff8eb, 0x8c6239, 0.60);
    this.scene.add(hemiLight);

    // 3. DirectionalLight (Key Sunlight): Warm golden sun (#ffe8c2), intensity 1.35 at (200, 480, 240) offset
    this.dirLight = new THREE.DirectionalLight(0xffe8c2, 1.35);
    this.dirLight.position.set(mapCx + 200, 480, mapCz + 240);
    this.dirLight.target.position.set(mapCx, 0, mapCz);
    this.dirLight.castShadow = false;
    this.scene.add(this.dirLight);
    this.scene.add(this.dirLight.target);

    this.sceneryManager = new SceneryManager(this.scene, this.parsedLevel, this.theme);
    this.buildMap(this.parsedLevel);

    this.isDebug = new URLSearchParams(window.location.search).has('debug');
    if (this.isDebug) {
      this.debugDiv = document.createElement('div');
      this.debugDiv.style.position = 'absolute';
      this.debugDiv.style.top = '10px';
      this.debugDiv.style.left = '10px';
      this.debugDiv.style.color = 'lime';
      this.debugDiv.style.backgroundColor = 'rgba(0,0,0,0.5)';
      this.debugDiv.style.padding = '10px';
      this.debugDiv.style.zIndex = '9999';
      this.debugDiv.style.fontFamily = 'monospace';
      document.body.appendChild(this.debugDiv);
      // Debug handle for visual audit
      (window as any).__CK3D__ = { scene: this.scene, camera: this.camera, THREE, loader: AssetLoader.getInstance(), createItemModel, renderer: this };
    }
  }


  private buildMap(level: ParsedLevel) {
    if (!this.scene) return;

    const mapW = level.width * TILE_PX;
    const mapH = level.height * TILE_PX;

    const wallGlb = AssetLoader.getInstance().getAssetSync('wall');
    const wallWindowGlb = AssetLoader.getInstance().getAssetSync('wall_window');
    const wallDoorwayGlb = AssetLoader.getInstance().getAssetSync('wall_doorway');

    const floorGroup = new THREE.Group();
    const wallGroup = new THREE.Group();
    this.scene.add(floorGroup);
    this.scene.add(wallGroup);

    // Overcooked! Mid-Tone Albedo Floor Palettes (never >90% white, so white plates & food pop without glare!)
    const lvlId = this.currentLevelId.toLowerCase();
    const isBistroOrStreetMap =
      lvlId.includes('duong_pho') ||
      lvlId.includes('nha_hang_mo') ||
      lvlId.includes('hai_tac') ||
      lvlId.includes('kho_bau') ||
      this.theme.name === 'ship';

    let kitchenHexA = 0xe0c389; // Warm Butter-Gold (#e0c389)
    let kitchenHexB = 0xcfa86b; // Warm Amber-Gold (#cfa86b)
    let groutHex = 0x8c673a;    // Warm Bronze-Brown Grout
    let diningHexA = 0xc99258;  // Warm Honey-Walnut Wood
    let diningHexB = 0xb57d46;  // Rich Chestnut-Oak Wood
    let useDiningWoodTex = true;

    if (isBistroOrStreetMap) {
      kitchenHexA = 0xe0c389;   // Warm Butter-Gold (#e0c389)
      kitchenHexB = 0xcfa86b;   // Warm Amber-Gold (#cfa86b)
      groutHex = 0x8c673a;      // Warm Bronze-Brown Grout
      diningHexA = 0xd6b08c;    // Warm Sandstone Terrazzo
      diningHexB = 0xc48f65;    // Warm Terracotta-Peach
      useDiningWoodTex = false;
    }

    // Grout base plane placed strictly at Y = -1.8 (well below tile bottoms at Y = -1.2) so zero Z-fighting occurs!
    const groutBaseGeo = new THREE.PlaneGeometry(mapW, mapH);
    groutBaseGeo.rotateX(-Math.PI / 2);
    const kitchenGroutMat = new THREE.MeshStandardMaterial({ color: groutHex, roughness: 0.85, metalness: 0.05 });
    const groutBaseMesh = new THREE.Mesh(groutBaseGeo, kitchenGroutMat);
    groutBaseMesh.position.set(mapW / 2, -1.8, mapH / 2);
    groutBaseMesh.castShadow = false;
    groutBaseMesh.receiveShadow = true;
    floorGroup.add(groutBaseMesh);

    // Thin, refined grout lines (0.965 tile width) & 1.2 height centered at Y = -0.6 (top surface strictly at Y = 0.0)
    const tileGroovesGeo = new THREE.BoxGeometry(TILE_PX * 0.975, 1.2, TILE_PX * 0.975);
    const kitchenTileInnerGeo = new THREE.BoxGeometry(TILE_PX * 0.965, 1.2, TILE_PX * 0.965);
    const wallGeoFallback = new THREE.BoxGeometry(TILE_PX, TILE_PX, TILE_PX);

    // Clean low-profile Cutaway Wall Border for the bottom foreground boundary (replaces squashed wall.gltf)
    const cutawayBaseH = TILE_PX * 0.13;
    const cutawayTrimH = TILE_PX * 0.03;
    const cutawayBaseGeo = new THREE.BoxGeometry(TILE_PX, cutawayBaseH, TILE_PX * 0.36);
    const cutawayTrimGeo = new THREE.BoxGeometry(TILE_PX * 0.96, cutawayTrimH, TILE_PX * 0.28);
    const cutawayBaseMat = new THREE.MeshStandardMaterial({ color: 0x5c3419, roughness: 0.80, metalness: 0.05 });
    const cutawayTrimMat = new THREE.MeshStandardMaterial({ color: 0xc98a4b, roughness: 0.80, metalness: 0.05 });

    const kitchenTileLightMat = new THREE.MeshStandardMaterial({ color: kitchenHexA, roughness: 0.80, metalness: 0.05 });
    const kitchenTileDarkMat = new THREE.MeshStandardMaterial({ color: kitchenHexB, roughness: 0.80, metalness: 0.05 });

    const woodTex = getSharedWoodTexture();

    const woodMatLight = new THREE.MeshStandardMaterial({
      map: useDiningWoodTex ? woodTex : null,
      color: diningHexA,
      roughness: 0.80,
      metalness: 0.05,
    });
    const woodMatWarm = new THREE.MeshStandardMaterial({
      map: useDiningWoodTex ? woodTex : null,
      color: diningHexB,
      roughness: 0.80,
      metalness: 0.05,
    });

    // Detect full dining room zone (near customer 'table' stations)
    const tableStations = level.stations.filter(s => s.type === 'table');
    const minTableX = tableStations.length > 0 ? Math.min(...tableStations.map(s => s.x)) : Infinity;
    const minTableY = tableStations.length > 0 ? Math.min(...tableStations.map(s => s.y)) : Infinity;
    const isRightSplit = minTableX >= Math.floor(level.width * 0.45);
    const isBottomSplit = !isRightSplit && minTableY >= Math.floor(level.height * 0.45);

    const isDiningTile = (tx: number, ty: number): boolean => {
      if (tableStations.length === 0) return false;
      if (isRightSplit) return tx >= minTableX - 2;
      if (isBottomSplit) return ty >= minTableY - 2;
      return tableStations.some(ts => Math.abs(tx - ts.x) <= 2 && Math.abs(ty - ts.y) <= 2);
    };

    const kitchenLightPositions: [number, number][] = [];
    const kitchenDarkPositions: [number, number][] = [];
    const diningLightPositions: [number, number][] = [];
    const diningWarmPositions: [number, number][] = [];

    const addFloorTileInstance = (tx: number, ty: number, px: number, pz: number) => {
      const even = (tx + ty) % 2 === 0;
      if (isDiningTile(tx, ty)) {
        if (even) diningLightPositions.push([px, pz]);
        else diningWarmPositions.push([px, pz]);
      } else {
        if (even) kitchenLightPositions.push([px, pz]);
        else kitchenDarkPositions.push([px, pz]);
      }
    };

    for (let y = 0; y < level.height; y++) {
      for (let x = 0; x < level.width; x++) {
        const idx = y * level.width + x;
        const tile = level.tiles[idx];
        const px = x * TILE_PX + TILE_PX / 2;
        const pz = y * TILE_PX + TILE_PX / 2;

        if (tile === 'wall') {
          const isBottomFrontWall = (y === level.height - 1);
          if (isBottomFrontWall) {
            // Render a clean low-profile Overcooked! cutaway wall border (never squash full wall.gltf)
            const cwGroup = new THREE.Group();
            const baseMesh = new THREE.Mesh(cutawayBaseGeo, cutawayBaseMat);
            baseMesh.position.y = cutawayBaseH * 0.5;
            const trimMesh = new THREE.Mesh(cutawayTrimGeo, cutawayTrimMat);
            trimMesh.position.y = cutawayBaseH + cutawayTrimH * 0.5;
            cwGroup.add(baseMesh, trimMesh);
            cwGroup.position.set(px, 0, pz - TILE_PX * 0.22);
            wallGroup.add(cwGroup);

            // Also place floor tile underneath the cutaway wall so there is no gap
            addFloorTileInstance(x, y, px, pz);
            continue;
          }

          const isTopBackWall = (y === 0 && x > 0 && x < level.width - 1);
          let chosenWallGlb = wallGlb;
          if (isTopBackWall && isDiningTile(x, 1)) {
            if (x === level.width - 2 && wallDoorwayGlb) {
              chosenWallGlb = wallDoorwayGlb;
            } else if (x % 2 === 0 && wallWindowGlb) {
              chosenWallGlb = wallWindowGlb;
            }
          }

          if (chosenWallGlb) {
            const w = chosenWallGlb.scene.clone();
            const isLeftWall = (x === 0);
            const isRightWall = (x === level.width - 1);
            let rotation = 0;
            let shiftX = 0;
            let shiftZ = 0;

            if (isLeftWall || isRightWall) {
              rotation = Math.PI / 2;
            } else {
              const dirs = [
                { dx: 0, dy: 1, rot: 0 },
                { dx: 0, dy: -1, rot: Math.PI },
                { dx: -1, dy: 0, rot: Math.PI / 2 },
                { dx: 1, dy: 0, rot: Math.PI / 2 }
              ];
              for (const { dx, dy, rot } of dirs) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < level.width && ny >= 0 && ny < level.height) {
                  const neighbor = level.tiles[ny * level.width + nx];
                  if (neighbor !== 'wall' && neighbor !== 'pit') {
                    rotation = (dx !== 0) ? Math.PI / 2 : rot;
                    shiftX = dx * TILE_PX * 0.25;
                    shiftZ = dy * TILE_PX * 0.25;
                    break;
                  }
                }
              }
            }

            w.position.set(px + shiftX, 0, pz + shiftZ);
            w.rotation.y = rotation;
            wallGroup.add(w);
          } else {
            const m = new THREE.Mesh(wallGeoFallback, toon(0x884444));
            m.position.set(px, TILE_PX / 2, pz);
            wallGroup.add(m);
          }
        } else if (tile !== 'pit') {
          addFloorTileInstance(x, y, px, pz);
        }
      }
    }

    const dummyMat4 = new THREE.Matrix4();
    const buildInstancedFloor = (
      geo: THREE.BufferGeometry,
      mat: THREE.Material,
      positions: [number, number][]
    ) => {
      if (positions.length === 0) return;
      const inst = new THREE.InstancedMesh(geo, mat, positions.length);
      for (let i = 0; i < positions.length; i++) {
        const [px, pz] = positions[i]!;
        dummyMat4.makeTranslation(px, -0.6, pz);
        inst.setMatrixAt(i, dummyMat4);
      }
      inst.instanceMatrix.needsUpdate = true;
      floorGroup.add(inst);
    };

    buildInstancedFloor(kitchenTileInnerGeo, kitchenTileLightMat, kitchenLightPositions);
    buildInstancedFloor(kitchenTileInnerGeo, kitchenTileDarkMat, kitchenDarkPositions);
    buildInstancedFloor(tileGroovesGeo, woodMatLight, diningLightPositions);
    buildInstancedFloor(tileGroovesGeo, woodMatWarm, diningWarmPositions);

    if (new URLSearchParams(window.location.search).get('view') === 'collision') {
      const debugOverlay = new THREE.Group();
      const walkMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.4, depthWrite: false });
      const blockMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.4, depthWrite: false });

      for (let y = 0; y < level.height; y++) {
        for (let x = 0; x < level.width; x++) {
          const idx = y * level.width + x;
          const tile = level.tiles[idx];
          const isWalkable = tile === 'floor' || tile === 'ice' || tile === 'conveyor';

          let w = 1.0; let h = 1.0;
          if (!isWalkable && tile !== 'wall' && tile !== 'pit') {
            if (tile === 'trash') { w = 0.7; h = 0.7; }
            else if (tile === 'crate') { w = 0.8; h = 0.8; }
            else { w = 0.9; h = 0.9; }
          }

          const geo = new THREE.PlaneGeometry(TILE_PX * w, TILE_PX * h);
          geo.rotateX(-Math.PI / 2);
          const mesh = new THREE.Mesh(geo, isWalkable ? walkMat : blockMat);
          mesh.position.set(x * TILE_PX + TILE_PX / 2, 1, y * TILE_PX + TILE_PX / 2);
          debugOverlay.add(mesh);
        }
      }
      this.scene.add(debugOverlay);
    }

    // Build stations (NO per-station PointLights — keeps WebGL fragment shader light loop ultra-fast at 60 FPS!)
    for (const station of level.stations) {
      const group = createStationModel(station, level);
      const sx = station.x * TILE_PX + TILE_PX / 2;
      const sz = station.y * TILE_PX + TILE_PX / 2;
      group.position.set(sx, 0, sz);
      group.userData.stationTile = { tx: station.x, ty: station.y };
      this.scene.add(group);
      this.stationMeshes.set(`${station.x},${station.y}`, group);
    }

    // Center camera
    this.updateCameraForMap(mapW, mapH, this.container?.clientWidth || 800, this.container?.clientHeight || 600);
  }

  private updateCameraForMap(mapW: number, mapH: number, screenW: number, screenH: number) {
    if (!this.camera) return;

    const aspect = screenW / screenH;
    const fov = this.camera.fov * (Math.PI / 180);

    // Ready, Set, Cook! overhead isometric camera angle (~58 degrees from floor)
    const tilt = 58 * Math.PI / 180;

    // Visual map dimensions taking tilt perspective into account
    const visualW = mapW;
    const visualH = mapH * Math.sin(tilt);

    // Distance needed to fit visual height and width
    const distH = (visualH / 2) / Math.tan(fov / 2);
    const distW = aspect && aspect > 0 ? (visualW / 2) / Math.tan(fov / 2) / aspect : distH;

    // Margin to frame the kitchen cleanly between top HUD and bottom recipe bar
    const dist = (isNaN(distH) || isNaN(distW)) ? 1000 : Math.max(distH, distW) + 340;

    const cx = mapW / 2;
    const cz = mapH / 2;
    const targetZ = cz - 6;

    // Position camera back and up along the tilt angle
    const cy = dist * Math.sin(tilt);
    const czCam = targetZ + dist * Math.cos(tilt);

    if (!isNaN(cx) && !isNaN(cy) && !isNaN(czCam)) {
      this.baseCameraPos.set(cx, cy, czCam);
      this.baseCameraLook.set(cx, 0, targetZ);

      this.camera.position.copy(this.baseCameraPos);
      this.camera.lookAt(this.baseCameraLook);
      this.camera.updateProjectionMatrix();
    }
  }

  applyFrame(frame: RenderFrame): void {
    this.frame = frame;
  }

  update(dtSec: number): void {
    if (!this.renderer || !this.scene || !this.camera) return;

    if (this.frame) {
      const activeIds = new Set<string>();

      let anyOnFire = false;
      let anySizzling = false;
      for (const [key, group] of this.stationMeshes.entries()) {
        const [sx, sy] = key.split(',').map(Number);
        const stState = this.frame.stations.find(s => s.x === sx && s.y === sy);
        if (stState && group instanceof THREE.Group) {
          updateStationModel(group, stState, performance.now() * 0.001, this.particleSystem);
          if (stState.onFire) {
            anyOnFire = true;
          } else if (stState.type === 'stove' && stState.item && stState.item.type === 'tool' && stState.item.progress > 0) {
            anySizzling = true;
          }
        }
      }
      if (anyOnFire) {
        sfx.playFireAlarmLoop(0.1);
      }
      if (anySizzling) {
        sfx.playSizzleLoop(0.25);
      }

      for (const p of this.frame.players) {
        activeIds.add(p.id);
        let colorHex = 0xe63946;
        try {
          if (p.color && p.color.startsWith('#')) {
            colorHex = parseInt(p.color.slice(1), 16);
          }
        } catch (e) { }
        const modelUrl = getCharacterUrlForCosmetic(p.cosmetic);

        let chef = this.playerModels.get(p.id);
        if (!chef) {
          const isMe = this.frame.activeChefId ? (p.id === this.frame.activeChefId) : (p.id === this.frame.localPlayerId);
          chef = new ChefModel(colorHex, Boolean(isMe));
          if (isMe) {
            (window as any).chefObj = chef;
          }
          chef.id = p.id;
          chef.modelUrl = modelUrl;

          const targetChef = chef;
          loadQuatModel(modelUrl).then(result => {
            if (targetChef && targetChef.modelUrl === modelUrl) {
              targetChef.loadQuat(result);
            }
          }).catch(e => {
            console.error('Error loading QuatModel:', e);
            if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1') {
              console.error(`ANIM MISSING: ${e.message}`);
            }
          });

          this.scene.add(chef.group);
          this.playerModels.set(p.id, chef);
        } else {
          if (chef.colorHex !== colorHex) {
            chef.setAccentColor(colorHex);
          }
          if (chef.modelUrl !== modelUrl) {
            chef.modelUrl = modelUrl;
            const targetChef = chef;
            loadQuatModel(modelUrl).then(result => {
              if (targetChef && targetChef.modelUrl === modelUrl) {
                targetChef.loadQuat(result);
              }
            }).catch(() => { });
          }
        }

        chef.group.position.set(p.x * TILE_PX, 0, p.y * TILE_PX);

        if (new URLSearchParams(window.location.search).get('view') === 'collision') {
          let circle = chef.group.getObjectByName('debugCircle');
          if (!circle) {
            const rad = PLAYER_RADIUS * TILE_PX;
            const cGeo = new THREE.RingGeometry(rad - 2, rad, 32);
            cGeo.rotateX(-Math.PI / 2);
            const cMat = new THREE.MeshBasicMaterial({ color: 0x0000ff, depthWrite: false });
            circle = new THREE.Mesh(cGeo, cMat);
            circle.name = 'debugCircle';
            circle.position.y = 2;
            chef.group.add(circle);
          }
        }

        chef.isMe = this.frame.activeChefId ? (p.id === this.frame.activeChefId) : (p.id === this.frame.localPlayerId);
        if (chef.isMe) {
          (window as any).chefObj = chef;
        }

        // Manage held item (use getItemVisualKey to ignore continuous cooking progress)
        let actualHeld = p.held || (chef.isMe && (window as any).debugHeldItem ? (window as any).debugHeldItem : null);

        if (actualHeld) {
          const prevHeld = chef.heldItemData;
          if (!prevHeld || getItemVisualKey(prevHeld) !== getItemVisualKey(actualHeld)) {
            chef.heldItemData = actualHeld;
            chef.setHeldItemModel(createItemModel(actualHeld));
            if (chef.isMe) {
              sfx.playPickup(0);
            }
          }
        } else {
          if (chef.heldItemData) {
            chef.heldItemData = null;
            chef.setHeldItemModel(null);
            if (chef.isMe) {
              sfx.playDrop(0);
            }
          }
        }
        const playerFrameForChef = actualHeld !== p.held ? { ...p, held: actualHeld } : p;
        chef.update(dtSec, playerFrameForChef, this.frame);

        if (p.acting && p.held && p.held.type === 'tool' && p.held.tool === 'extinguisher') {
          const dir = new THREE.Vector3(p.fx, 0, p.fy).normalize();
          const pPos = new THREE.Vector3(p.x * TILE_PX, TILE_PX * 0.8, p.y * TILE_PX);
          if (Math.random() < 0.3) {
            this.particleSystem.emit('foam', pPos, 2, dir);
          }
        } else if (p.acting && p.actingStation === 'cutting') {
          sfx.playChopLoop(0.15);
        }

        // Overcooked 2 style dash / fast sprint dust trail at chef's feet
        const moveSpd = Math.hypot(p.vx || 0, p.vy || 0);
        if ((p.dashing || moveSpd > 3.1) && Math.random() < (p.dashing ? 0.55 : 0.22)) {
          const footPos = new THREE.Vector3(
            p.x * TILE_PX - (p.fx || 0) * TILE_PX * 0.18,
            4,
            p.y * TILE_PX - (p.fy || 0) * TILE_PX * 0.18
          );
          this.particleSystem.emit('dust', footPos, 1);
        }

        // Ready Set Cook style green target circle on the station/counter in front of the active chef
        if (chef.isMe) {
          if (!this.targetHighlight) {
            const ringGroup = new THREE.Group();
            const outerGeo = new THREE.RingGeometry(TILE_PX * 0.28, TILE_PX * 0.43, 36);
            outerGeo.rotateX(-Math.PI / 2);
            const outerMat = new THREE.MeshBasicMaterial({
              color: 0x0b3d17,
              transparent: true,
              opacity: 0.65,
              depthWrite: false,
              depthTest: false,
            });
            const outerMesh = new THREE.Mesh(outerGeo, outerMat);

            const innerGeo = new THREE.RingGeometry(TILE_PX * 0.30, TILE_PX * 0.40, 36);
            innerGeo.rotateX(-Math.PI / 2);
            const innerMat = new THREE.MeshBasicMaterial({
              color: 0x26f056,
              transparent: true,
              opacity: 0.95,
              depthWrite: false,
              depthTest: false,
            });
            const innerMesh = new THREE.Mesh(innerGeo, innerMat);
            innerMesh.position.y = 0.2;

            ringGroup.add(outerMesh, innerMesh);
            ringGroup.renderOrder = 999;
            this.targetHighlight = ringGroup;
            this.scene.add(this.targetHighlight);
          }

          const tt = this.frame.targetTile;
          const tx = (tt && tt.tx >= 0) ? tt.tx : Math.floor(p.x + p.fx * 0.7);
          const ty = (tt && tt.ty >= 0) ? tt.ty : Math.floor(p.y + p.fy * 0.7);
          const targetStation = this.frame.stations.find(s => s.x === tx && s.y === ty);

          if (targetStation) {
            const surfY = targetStation.type === 'cutting'
              ? COUNTER_SURFACE_Y + 7.5
              : (targetStation.type === 'table' ? TABLE_SURFACE_Y + 0.6 : COUNTER_SURFACE_Y + 1.2);
            this.targetHighlight.position.set(
              tx * TILE_PX + TILE_PX / 2,
              surfY,
              ty * TILE_PX + TILE_PX / 2
            );
            const pulse = 1 + Math.sin(performance.now() * 0.007) * 0.04;
            this.targetHighlight.scale.set(pulse, 1, pulse);
            this.targetHighlight.visible = true;
          } else {
            this.targetHighlight.visible = false;
          }
        }
      }

      // Pulsing tap-to-move / tap-to-interact destination ring
      if (this.frame.tapTarget && this.frame.tapTarget.tx >= 0 && this.frame.tapTarget.ty >= 0) {
        if (!this.tapHighlight) {
          const tapGroup = new THREE.Group();
          const outerGeo = new THREE.RingGeometry(TILE_PX * 0.34, TILE_PX * 0.47, 36);
          outerGeo.rotateX(-Math.PI / 2);
          const outerMat = new THREE.MeshBasicMaterial({
            color: 0xffd166,
            transparent: true,
            opacity: 0.92,
            depthWrite: false,
            depthTest: false,
          });
          const outerRing = new THREE.Mesh(outerGeo, outerMat);

          const innerGeo = new THREE.RingGeometry(TILE_PX * 0.16, TILE_PX * 0.24, 32);
          innerGeo.rotateX(-Math.PI / 2);
          const innerMat = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.88,
            depthWrite: false,
            depthTest: false,
          });
          const innerRing = new THREE.Mesh(innerGeo, innerMat);
          innerRing.position.y = 0.3;

          tapGroup.add(outerRing, innerRing);
          tapGroup.renderOrder = 999;
          this.tapHighlight = tapGroup;
          this.scene.add(this.tapHighlight);
        }

        const tapTx = this.frame.tapTarget.tx;
        const tapTy = this.frame.tapTarget.ty;
        const tappedSt = this.frame.stations.find(s => s.x === tapTx && s.y === tapTy);
        const tapY = tappedSt
          ? (tappedSt.type === 'cutting' ? COUNTER_SURFACE_Y + 7.5 : (tappedSt.type === 'table' ? TABLE_SURFACE_Y + 0.6 : COUNTER_SURFACE_Y + 1.8))
          : 1.8;

        this.tapHighlight.position.set(
          tapTx * TILE_PX + TILE_PX / 2,
          tapY,
          tapTy * TILE_PX + TILE_PX / 2
        );
        const tapPulse = 1 + Math.sin(performance.now() * 0.012) * 0.09;
        this.tapHighlight.scale.set(tapPulse, 1, tapPulse);
        this.tapHighlight.rotation.y = performance.now() * 0.0025;
        this.tapHighlight.visible = true;
      } else if (this.tapHighlight) {
        this.tapHighlight.visible = false;
      }

      if (this.frame.hintTarget) {
        if (!this.hintArrow) {
          const arrowGeo = new THREE.ConeGeometry(TILE_PX * 0.3, TILE_PX * 0.6, 4);
          arrowGeo.rotateX(Math.PI); // Point down
          const arrowMat = new THREE.MeshBasicMaterial({ color: 0xff00ff }); // Magenta
          this.hintArrow = new THREE.Mesh(arrowGeo, arrowMat);
          this.scene.add(this.hintArrow);
        }
        this.hintArrow.position.set(
          this.frame.hintTarget.x * TILE_PX + TILE_PX / 2,
          100 + Math.sin(performance.now() * 0.005) * 10,
          this.frame.hintTarget.y * TILE_PX + TILE_PX / 2
        );
        this.hintArrow.rotation.y = performance.now() * 0.002;
        this.hintArrow.visible = true;
      } else if (this.hintArrow) {
        this.hintArrow.visible = false;
      }

      for (const [id, chef] of this.playerModels.entries()) {
        if (!activeIds.has(id)) {
          this.scene.remove(chef.group);
          chef.dispose();
          this.playerModels.delete(id);
        }
      }

      // Customers rendering (with smooth walk-in to chair, steady seated pose, and walk-out)
      const activeCustomerIds = new Set<number>();
      for (const c of this.frame.customers || []) {
        activeCustomerIds.add(c.id);
        let cm = this.customerModels.get(c.id);
        if (!cm) {
          const customerColors = [0xe63946, 0x2563eb, 0x10b981, 0xf59e0b, 0x8b5cf6, 0xec4899];
          const custColor = customerColors[(c.colorIndex ?? c.id) % customerColors.length] || 0x2563eb;
          const custModelUrl = QUAT_CUSTOMER_MODELS[c.id % QUAT_CUSTOMER_MODELS.length] || QUAT_CUSTOMER_MODELS[0];
          cm = new ChefModel(custColor, false);
          cm.setIsCustomer(true);
          cm.id = `customer_${c.id}`;
          cm.modelUrl = custModelUrl;
          cm.state = 'walk';
          cm.group.userData.walkInProgress = 0;

          const targetCm = cm;
          loadQuatModel(custModelUrl).then(result => {
            if (targetCm) {
              targetCm.loadQuat(result);
            }
          }).catch(e => {
            console.error('Error loading QuatModel for customer:', e);
          });

          this.scene.add(cm.group);
          this.customerModels.set(c.id, cm);
        }
        cm.group.userData.tableTile = { tx: c.x, ty: c.y };

        // Target seat position at the left chair of the table
        const seatX = c.x * TILE_PX + TILE_PX / 2 - TILE_PX * 0.45;
        const seatZ = c.y * TILE_PX + TILE_PX / 2;
        const startX = seatX - TILE_PX * 1.15;
        const startZ = seatZ + TILE_PX * 1.55;

        let curX = seatX;
        let curZ = seatZ;

        if (c.state === 'leaving') {
          // Walk away from the chair towards the exit
          const leaveProgress = Math.min(1, (c.timer || 0) / 0.6);
          curX = seatX + (startX - seatX) * leaveProgress;
          curZ = seatZ + (startZ - seatZ) * leaveProgress;
          cm.group.position.set(curX, 0, curZ);
          cm.group.rotation.y = Math.atan2(startX - seatX, startZ - seatZ);
          const leaveAnim = cm.isQuat ? 'walk' : getCustomerTargetAnimation(c);
          if (cm.state !== leaveAnim) {
            cm.state = leaveAnim;
            cm.playAnim(leaveAnim, 0.12);
          }
        } else {
          // Walk in from the dining aisle to the chair on arrival
          const prevWalk = typeof cm.group.userData.walkInProgress === 'number' ? cm.group.userData.walkInProgress : 0;
          const walkInProgress = c.state === 'seated_waiting_order'
            ? Math.min(1, prevWalk + dtSec / 1.25)
            : 1;
          cm.group.userData.walkInProgress = walkInProgress;

          if (walkInProgress < 1) {
            const ease = 1 - Math.pow(1 - walkInProgress, 2);
            curX = startX + (seatX - startX) * ease;
            curZ = startZ + (seatZ - startZ) * ease;
            cm.group.position.set(curX, 0, curZ);
            cm.group.rotation.y = Math.atan2(seatX - startX, seatZ - startZ);
            const walkAnim = cm.isQuat ? 'walk' : 'walk';
            if (cm.state !== walkAnim) {
              cm.state = walkAnim;
              cm.playAnim(walkAnim, 0.12);
            }
          } else {
            // Seated on the chair facing the table (SitDown plays once and clamps on seated frame)
            cm.group.position.set(seatX, 0, seatZ);
            if (c.state === 'eating') {
              cm.group.rotation.y = Math.PI / 2 + Math.sin(performance.now() * 0.008) * 0.07;
            } else if (c.angry) {
              cm.group.rotation.y = Math.PI / 2 + Math.sin(performance.now() * 0.022) * 0.06;
            } else {
              cm.group.rotation.y = Math.PI / 2;
            }

            const targetAnim = getCustomerTargetAnimation(c);
            const effectiveAnim = cm.isQuat ? 'sit' : targetAnim;
            if (cm.state !== effectiveAnim) {
              cm.state = effectiveAnim;
              cm.playAnim(effectiveAnim, 0.2);
            }
          }
        }
        cm.update(dtSec, null, null);
        cm.applyCustomerSeatedPose(c.state, c.angry);

        // Update DOM order bubble position if they have an active or waiting order
        const els = document.querySelectorAll(`.hud-order[data-customer-id="${c.id}"]`);
        if (els.length > 0) {
          const headY = (c.state === 'seated_waiting_order' || c.state === 'order_taken' || c.state === 'eating')
            ? TILE_PX * 1.15
            : TILE_PX * 1.5;
          this.tempProjVec.set(curX, headY, curZ).project(this.camera);
          const w = this.renderer!.domElement.clientWidth;
          const h = this.renderer!.domElement.clientHeight;
          const screenX = Math.round((this.tempProjVec.x * 0.5 + 0.5) * w);
          const screenY = Math.round((1 - (this.tempProjVec.y * 0.5 + 0.5)) * h);
          const leftStr = `${screenX}px`;
          const topStr = `${screenY}px`;
          els.forEach(elNode => {
            const el = elNode as HTMLElement;
            if (el.style.left !== leftStr) el.style.left = leftStr;
            if (el.style.top !== topStr) el.style.top = topStr;
            if (el.style.position !== 'absolute') el.style.position = 'absolute';
          });
        }
      }

      for (const [id, model] of this.customerModels.entries()) {
        if (!activeCustomerIds.has(id)) {
          this.scene.remove(model.group);
          model.dispose();
          this.customerModels.delete(id);
        }
      }

      // Projectiles rendering
      const activeProjIds = new Set<number>();
      for (const proj of this.frame.projectiles) {
        activeProjIds.add(proj.id);
        let pModel = this.projectileModels.get(proj.id);
        if (!pModel) {
          pModel = createItemModel(proj.item);
          this.scene.add(pModel);
          this.projectileModels.set(proj.id, pModel);
        }

        // Simple parabolic arc based on progress (0 to 1) or positions
        // Since frame only has current x,y, we use it directly. We can add some arc if we have t.
        // Let's assume z is height.
        const height = TILE_PX / 2 + Math.sin(Math.PI * (proj.progress || 0.5)) * TILE_PX;
        pModel.position.set(proj.x * TILE_PX + TILE_PX / 2, height, proj.y * TILE_PX + TILE_PX / 2);
        pModel.rotation.x += dtSec * 10;
        pModel.rotation.y += dtSec * 10;
      }
      for (const [id, model] of this.projectileModels.entries()) {
        if (!activeProjIds.has(id)) {
          this.scene.remove(model);
          this.projectileModels.delete(id);
        }
      }

      // Restore base camera position
      this.camera.position.copy(this.baseCameraPos);

      // Screenshake
      if (this.shakeTimer > 0) {
        this.shakeTimer -= dtSec;
        this.camera.position.x += (Math.random() - 0.5) * TILE_PX * 0.3;
        this.camera.position.z += (Math.random() - 0.5) * TILE_PX * 0.3;
      }

      this.camera.lookAt(this.baseCameraLook);


    }

    if (this.sceneryManager) {
      this.sceneryManager.update(dtSec, performance.now() * 0.001);
    }
    this.particleSystem.update(dtSec, this.camera.rotation);

    this.renderer.render(this.scene, this.camera);

    if (this.isDebug && this.debugDiv) {
      this.frames++;
      const now = performance.now();
      if (now - this.lastTime >= 1000) {
        const fps = this.frames;
        this.frames = 0;
        this.lastTime = now;

        const info = this.renderer.info;
        this.debugDiv.innerText =
          `FPS: ${fps}\n` +
          `Draw calls: ${info.render.calls}\n` +
          `Triangles: ${info.render.triangles}\n` +
          `Geometries: ${info.memory.geometries}\n` +
          `Textures: ${info.memory.textures}`;
      }
    }
  }

  handleEvent(ev: GameEvent): void {
    if (ev.type === 'ignite' || ev.type === 'serve_fail' || ev.type === 'burnt' || ev.type === 'soup_burnt') {
      this.shakeTimer = 0.15;
    }

    if (ev.playerId && this.playerModels.has(ev.playerId)) {
      this.playerModels.get(ev.playerId)!.handleEvent(ev);
    }

    // Add specific particles on events if needed, for instance, confetti on serve_ok
    if (ev.type === 'serve_ok' && ev.x !== undefined && ev.y !== undefined) {
      const pos = new THREE.Vector3(ev.x * TILE_PX + TILE_PX / 2, TILE_PX, ev.y * TILE_PX + TILE_PX / 2);
      this.particleSystem.emit('chop', pos, 5); // using chop particles as generic confetti for now
    }

    // Play in-game sound effect (except order_new which is handled in hud)
    if (ev.type !== 'order_new') {
      sfx.playEvent(ev.type, 0, ev);
    }
  }

  resize(width: number, height: number, dpr: number): void {
    if (this.renderer && this.camera) {
      const isMobile = isMobileOrCoarseDevice();
      const maxDpr = isMobile ? 1.25 : 1.5;
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(dpr || 1, maxDpr));

      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();

      if (this.parsedLevel) {
        const mapW = this.parsedLevel.width * TILE_PX;
        const mapH = this.parsedLevel.height * TILE_PX;
        this.updateCameraForMap(mapW, mapH, width, height);
      }
    }
  }

  setQuality(q: 'low' | 'medium' | 'high'): void {
    if (!this.renderer) return;
    const isMobile = isMobileOrCoarseDevice();

    if (q === 'low') {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.15 : 1));
      this.renderer.shadowMap.enabled = false;
    } else {
      const maxDpr = isMobile ? 1.25 : 1.5;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
      this.renderer.shadowMap.enabled = false;
    }

    // Toggle outlines
    if (this.scene) {
      this.scene.traverse((obj) => {
        if (obj.userData?.isOutline) {
          obj.visible = (q !== 'low' && !isMobile);
        }
      });
    }
  }

  screenToTile(clientX: number, clientY: number): { tx: number; ty: number } | null {
    if (!this.renderer || !this.camera || !this.parsedLevel) return null;

    // 1. Check if tap landed directly on a customer's floating order bubble
    if (this.frame?.customers) {
      const bubbleEls = document.querySelectorAll('.hud-order.bubble[data-customer-id]');
      for (const elNode of Array.from(bubbleEls)) {
        const el = elNode as HTMLElement;
        const bRect = el.getBoundingClientRect();
        if (
          clientX >= bRect.left - 8 &&
          clientX <= bRect.right + 8 &&
          clientY >= bRect.top - 8 &&
          clientY <= bRect.bottom + 8
        ) {
          const cid = Number(el.getAttribute('data-customer-id'));
          const cust = this.frame.customers.find(c => c.id === cid);
          if (cust) {
            return { tx: cust.x, ty: cust.y };
          }
        }
      }
    }

    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);

    // 2. Raycast against customer models (maps directly to their table tile)
    const customerGroups = Array.from(this.customerModels.values()).map(cm => cm.group);
    if (customerGroups.length > 0) {
      const custHits = this.raycaster.intersectObjects(customerGroups, true);
      for (const hit of custHits) {
        let obj: THREE.Object3D | null = hit.object;
        while (obj) {
          if (obj.userData?.tableTile) {
            return obj.userData.tableTile;
          }
          obj = obj.parent;
        }
      }
    }

    // 3. Raycast against 3D station models (crates, cutting boards, stoves, counters, tables, etc.)
    const stationGroups = Array.from(this.stationMeshes.values());
    if (stationGroups.length > 0) {
      const stHits = this.raycaster.intersectObjects(stationGroups, true);
      for (const hit of stHits) {
        let obj: THREE.Object3D | null = hit.object;
        while (obj) {
          if (obj.userData?.stationTile) {
            return obj.userData.stationTile;
          }
          obj = obj.parent;
        }
      }
    }

    // 4. Fallback: intersect counter surface height plane for station tiles, then floor plane y = 0
    const hitPoint = new THREE.Vector3();
    const counterPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -COUNTER_SURFACE_Y);
    if (this.raycaster.ray.intersectPlane(counterPlane, hitPoint)) {
      const stTx = Math.floor(hitPoint.x / TILE_PX);
      const stTy = Math.floor(hitPoint.z / TILE_PX);
      if (
        stTx >= 0 &&
        stTx < this.parsedLevel.width &&
        stTy >= 0 &&
        stTy < this.parsedLevel.height &&
        this.stationMeshes.has(`${stTx},${stTy}`)
      ) {
        return { tx: stTx, ty: stTy };
      }
    }

    const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    if (this.raycaster.ray.intersectPlane(floorPlane, hitPoint)) {
      const tx = Math.floor(hitPoint.x / TILE_PX);
      const ty = Math.floor(hitPoint.z / TILE_PX);
      if (tx >= 0 && tx < this.parsedLevel.width && ty >= 0 && ty < this.parsedLevel.height) {
        return { tx, ty };
      }
    }

    return null;
  }

  dispose(): void {
    for (const model of this.playerModels.values()) {
      model.dispose();
    }
    this.playerModels.clear();

    for (const model of this.customerModels.values()) {
      model.dispose();
    }
    this.customerModels.clear();
    this.stationMeshes.clear();
    this.projectileModels.clear();

    if (this.renderer) {
      if (this.container && this.renderer.domElement.parentElement === this.container) {
        this.container.removeChild(this.renderer.domElement);
      }
      // Do NOT dispose shared renderer
      this.renderer = null;
    }

    // Dispose only non-shared scene materials and geometries
    if (this.scene) {
      this.scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          if (object.geometry && !object.geometry.userData?.isSharedAsset) {
            object.geometry.dispose();
          }
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach(m => {
                if (m && !m.userData?.isSharedAsset) m.dispose();
              });
            } else if (!object.material.userData?.isSharedAsset) {
              object.material.dispose();
            }
          }
        }
      });
      this.scene.clear();
      this.scene = null;
    }

    if (this.vignetteDiv) {
      this.vignetteDiv.remove();
      this.vignetteDiv = null;
    }
    if (this.debugDiv) {
      this.debugDiv.remove();
      this.debugDiv = null;
    }
    if (this.sceneryManager) {
      this.sceneryManager.dispose();
      this.sceneryManager = null;
    }
  }
}
