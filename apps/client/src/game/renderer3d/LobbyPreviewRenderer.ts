import * as THREE from 'three';
import { PLAYER_COLORS, type PlayerCosmetic } from '@kitchen/core';
import { getSharedWebGLRenderer } from './SharedWebGL';
import { ChefModel } from './chef/Chef';
import { loadQuatModel, getCharacterUrlForCosmetic } from './chef/quatClips';

export class LobbyPreviewRenderer {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private animationId: number = 0;
  private disposed = false;
  private resizeObserver: ResizeObserver | null = null;

  // Root group for the entire character & pedestal
  private rootGroup = new THREE.Group();
  private chef: ChefModel | null = null;
  private loadedModelUrl: string = '';
  private proceduralBodyGroup: THREE.Group | null = null;
  private hatGroup: THREE.Group | null = null;
  private speciesGroup: THREE.Group | null = null;
  private pedestalMesh: THREE.Mesh | null = null;
  private pedestalRim: THREE.Mesh | null = null;

  private currentCosmetic: PlayerCosmetic = { color: 0, hat: 0, species: 0 };
  private lastTime: number = performance.now();

  constructor(container: HTMLElement, initialCosmetic: PlayerCosmetic) {
    this.container = container;
    this.currentCosmetic = { ...initialCosmetic };

    this.scene = new THREE.Scene();
    this.scene.background = null;

    const width = Math.max(container.clientWidth || 0, 220);
    const height = Math.max(container.clientHeight || 0, 220);

    // FOV 32 with camera at Z=168 looking at Y=35 frames the full 3D Quaternius chef head-to-toe
    this.camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 1000);
    this.camera.position.set(0, 38, 168);
    this.camera.lookAt(0, 35, 0);

    // Warm, bright studio lights so character skin & outfit colors pop
    const amb = new THREE.AmbientLight(0xfffaf2, 2.1);
    this.scene.add(amb);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.9);
    dirLight.position.set(35, 75, 65);
    this.scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xffe8d6, 1.1);
    fillLight.position.set(-35, 45, 30);
    this.scene.add(fillLight);

    // Add root group to scene
    this.scene.add(this.rootGroup);

    // Build base pedestal and immediate procedural character fallback (for headless tests)
    this.buildPedestal();
    this.buildProceduralChef();
    this.applyCosmetic(this.currentCosmetic);

    // Init shared WebGL renderer
    try {
      this.renderer = getSharedWebGLRenderer();
      if (this.renderer) {
        this.renderer.setSize(width, height);
        if (typeof this.renderer.setClearColor === 'function') {
          this.renderer.setClearColor(0x000000, 0);
        }
        if (this.renderer.domElement && this.renderer.domElement.parentElement !== this.container) {
          this.container.appendChild(this.renderer.domElement);
        }
      }
    } catch (e) {
      console.warn('[LobbyPreviewRenderer] WebGL not available:', e);
    }

    // Set up ResizeObserver to handle layout changes dynamically
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const w = Math.round(entry.contentRect.width);
          const h = Math.round(entry.contentRect.height);
          if (w > 0 && h > 0) {
            this.resize(w, h);
          }
        }
      });
      this.resizeObserver.observe(this.container);
    }

    // Load Quaternius 3D character model
    this.syncQuatChef();
    this.startLoop();
  }

  private resize(width: number, height: number) {
    if (this.disposed || !this.renderer) return;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.render(this.scene, this.camera);
  }

  private buildPedestal() {
    const colorHex = PLAYER_COLORS[this.currentCosmetic.color] ?? PLAYER_COLORS[0]!;
    
    // Base wooden/colored stage cylinder
    const pedGeo = new THREE.CylinderGeometry(23, 25.5, 4, 32);
    const pedMat = new THREE.MeshToonMaterial({ color: colorHex });
    this.pedestalMesh = new THREE.Mesh(pedGeo, pedMat);
    this.pedestalMesh.position.set(0, 1.2, 0);
    this.rootGroup.add(this.pedestalMesh);

    // Checkered kitchen top disc
    const topDiscGeo = new THREE.CylinderGeometry(21.2, 21.2, 0.8, 32);
    const topDiscMat = new THREE.MeshToonMaterial({ color: 0xf8fafc });
    const topDisc = new THREE.Mesh(topDiscGeo, topDiscMat);
    topDisc.position.set(0, 3.1, 0);
    this.rootGroup.add(topDisc);

    // Gold/white rim highlight
    const rimGeo = new THREE.TorusGeometry(22.4, 1.05, 10, 36);
    const rimMat = new THREE.MeshToonMaterial({ color: 0xfde047 });
    this.pedestalRim = new THREE.Mesh(rimGeo, rimMat);
    this.pedestalRim.rotation.x = Math.PI / 2;
    this.pedestalRim.position.set(0, 3.2, 0);
    this.rootGroup.add(this.pedestalRim);
  }

  private buildProceduralChef() {
    const colorHex = PLAYER_COLORS[this.currentCosmetic.color] ?? PLAYER_COLORS[0]!;
    this.proceduralBodyGroup = new THREE.Group();
    this.proceduralBodyGroup.position.set(0, 2.5, 0);

    // Body (cylinder / tunic)
    const bodyGeo = new THREE.CylinderGeometry(11, 13, 26, 20);
    const bodyMat = new THREE.MeshToonMaterial({ color: colorHex });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.set(0, 15, 0);
    this.proceduralBodyGroup.add(bodyMesh);

    // White Apron / Chest bib
    const apronGeo = new THREE.CylinderGeometry(11.2, 12.2, 16, 18, 1, false, 0, Math.PI);
    const apronMat = new THREE.MeshToonMaterial({ color: 0xfafafa });
    const apronMesh = new THREE.Mesh(apronGeo, apronMat);
    apronMesh.position.set(0, 14, 0);
    apronMesh.rotation.y = -Math.PI / 2;
    this.proceduralBodyGroup.add(apronMesh);

    // Scarf / Neckerchief
    const scarfGeo = new THREE.TorusGeometry(8.5, 1.8, 8, 20);
    const scarfMat = new THREE.MeshToonMaterial({ color: 0xef4444 });
    const scarfMesh = new THREE.Mesh(scarfGeo, scarfMat);
    scarfMesh.position.set(0, 28, 0);
    scarfMesh.rotation.x = Math.PI / 2;
    this.proceduralBodyGroup.add(scarfMesh);

    // Head
    const headGeo = new THREE.SphereGeometry(9.5, 20, 20);
    const headMat = new THREE.MeshToonMaterial({ color: 0xffd1b3 });
    const headMesh = new THREE.Mesh(headGeo, headMat);
    headMesh.position.set(0, 39, 0);
    this.proceduralBodyGroup.add(headMesh);

    // Chef eyes (two dark beads)
    const eyeGeo = new THREE.SphereGeometry(1.2, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1f2937 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-3.2, 40, 8.8);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(3.2, 40, 8.8);
    this.proceduralBodyGroup.add(leftEye, rightEye);

    // Cheerful blush dots
    const blushGeo = new THREE.CircleGeometry(1.6, 12);
    const blushMat = new THREE.MeshBasicMaterial({ color: 0xf87171, side: THREE.DoubleSide });
    const leftBlush = new THREE.Mesh(blushGeo, blushMat);
    leftBlush.position.set(-4.8, 37.5, 8.9);
    const rightBlush = new THREE.Mesh(blushGeo, blushMat);
    rightBlush.position.set(4.8, 37.5, 8.9);
    this.proceduralBodyGroup.add(leftBlush, rightBlush);

    this.rootGroup.add(this.proceduralBodyGroup);
  }

  private async syncQuatChef() {
    const colorHex = PLAYER_COLORS[this.currentCosmetic.color] ?? PLAYER_COLORS[0]!;
    const targetUrl = getCharacterUrlForCosmetic(this.currentCosmetic);

    if (!this.chef) {
      this.chef = new ChefModel(colorHex, false);
      this.chef.group.position.set(0, 3.0, 0);
      // Scale 95-unit Quaternius model by 0.66 -> ~63 units tall so full body + hat fits cleanly
      this.chef.group.scale.setScalar(0.66);
      this.rootGroup.add(this.chef.group);
    } else {
      this.chef.setAccentColor(colorHex);
    }

    if (this.loadedModelUrl === targetUrl && this.chef.isReady) {
      return;
    }
    this.loadedModelUrl = targetUrl;

    try {
      const result = await loadQuatModel(targetUrl);
      if (this.disposed || !this.chef || this.loadedModelUrl !== targetUrl) return;

      this.chef.setAccentColor(PLAYER_COLORS[this.currentCosmetic.color] ?? PLAYER_COLORS[0]!);
      await this.chef.loadQuat(result);

      // Hide procedural fallback & accessories once real 3D Quaternius model is ready
      if (this.proceduralBodyGroup) this.proceduralBodyGroup.visible = false;
      if (this.hatGroup) this.hatGroup.visible = false;
      if (this.speciesGroup) this.speciesGroup.visible = false;
    } catch {
      // In tests/headless without file server, keep procedural body active
    }
  }

  public updateCosmetic(cosmetic: PlayerCosmetic) {
    this.currentCosmetic = { ...cosmetic };
    this.applyCosmetic(this.currentCosmetic);
    this.syncQuatChef();
  }

  private applyCosmetic(cosmetic: PlayerCosmetic) {
    const colorHex = PLAYER_COLORS[cosmetic.color] ?? PLAYER_COLORS[0]!;

    // 1. Update Pedestal
    if (this.pedestalMesh) {
      (this.pedestalMesh.material as THREE.MeshToonMaterial).color.setHex(colorHex);
    }

    // 2. Update Procedural Body Color
    if (this.proceduralBodyGroup) {
      const bodyMesh = this.proceduralBodyGroup.children[0] as THREE.Mesh | undefined;
      if (bodyMesh && bodyMesh.material instanceof THREE.MeshToonMaterial) {
        bodyMesh.material.color.setHex(colorHex);
      }
    }

    // If real 3D Quaternius character is active, update its outfit color directly
    if (this.chef && this.chef.isReady) {
      this.chef.setAccentColor(colorHex);
      if (this.hatGroup) this.hatGroup.visible = false;
      if (this.speciesGroup) this.speciesGroup.visible = false;
      return;
    }

    // 3. Mount Hat & Species to procedural fallback (for unit tests)
    const target = this.rootGroup;

    // Remove old Hat
    if (this.hatGroup) {
      target.remove(this.hatGroup);
      this.disposeGroup(this.hatGroup);
      this.hatGroup = null;
    }

    // Remove old Species
    if (this.speciesGroup) {
      target.remove(this.speciesGroup);
      this.disposeGroup(this.speciesGroup);
      this.speciesGroup = null;
    }

    // Base head height for accessories
    const headY = 48;

    // --- HAT ---
    if (cosmetic.hat === 0) {
      // Mũ bếp cao (Toque Blanche)
      this.hatGroup = new THREE.Group();
      this.hatGroup.position.set(0, headY, 0);

      const brimGeo = new THREE.CylinderGeometry(8.5, 8.5, 4.0, 24);
      const brimMat = new THREE.MeshToonMaterial({ color: 0xffffff });
      const brim = new THREE.Mesh(brimGeo, brimMat);
      brim.position.set(0, 2.0, 0);
      this.hatGroup.add(brim);

      const crownGeo = new THREE.CylinderGeometry(11.5, 9.0, 16.0, 24);
      const crownMat = new THREE.MeshToonMaterial({ color: 0xffffff });
      const crown = new THREE.Mesh(crownGeo, crownMat);
      crown.position.set(0, 11.5, 0);
      this.hatGroup.add(crown);

      const topGeo = new THREE.SphereGeometry(11.5, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
      const topMat = new THREE.MeshToonMaterial({ color: 0xffffff });
      const top = new THREE.Mesh(topGeo, topMat);
      top.position.set(0, 19.5, 0);
      this.hatGroup.add(top);

      target.add(this.hatGroup);
    } else if (cosmetic.hat === 1) {
      // Mũ bếp trưởng bẹt (Beret)
      this.hatGroup = new THREE.Group();
      this.hatGroup.position.set(0, headY, 0);

      const beretBandGeo = new THREE.CylinderGeometry(8.5, 8.5, 2.5, 24);
      const beretMat = new THREE.MeshToonMaterial({ color: 0xffffff });
      const band = new THREE.Mesh(beretBandGeo, beretMat);
      band.position.set(0, 1.25, 0);
      this.hatGroup.add(band);

      const beretDiscGeo = new THREE.CylinderGeometry(13.0, 9.5, 4.0, 24);
      const disc = new THREE.Mesh(beretDiscGeo, beretMat);
      disc.position.set(1.5, 4.0, 0);
      disc.rotation.z = -0.15;
      this.hatGroup.add(disc);

      target.add(this.hatGroup);
    }

    // --- SPECIES ---
    if (cosmetic.species === 1) {
      // Mèo (Cat ears + cute tail)
      this.speciesGroup = new THREE.Group();
      this.speciesGroup.position.set(0, headY - 1, 0);

      const earMat = new THREE.MeshToonMaterial({ color: colorHex });
      const innerEarMat = new THREE.MeshToonMaterial({ color: 0xffb6c1 });

      // Left Ear
      const leftEarGeo = new THREE.ConeGeometry(3.5, 7.0, 4);
      const leftEar = new THREE.Mesh(leftEarGeo, earMat);
      leftEar.position.set(-6.5, 4.5, 0.5);
      leftEar.rotation.set(0, -Math.PI / 4, 0.35);
      this.speciesGroup.add(leftEar);

      const leftInnerGeo = new THREE.ConeGeometry(2.0, 4.5, 4);
      const leftInner = new THREE.Mesh(leftInnerGeo, innerEarMat);
      leftInner.position.set(-6.0, 4.2, 1.4);
      leftInner.rotation.set(0, -Math.PI / 4, 0.35);
      this.speciesGroup.add(leftInner);

      // Right Ear
      const rightEarGeo = new THREE.ConeGeometry(3.5, 7.0, 4);
      const rightEar = new THREE.Mesh(rightEarGeo, earMat);
      rightEar.position.set(6.5, 4.5, 0.5);
      rightEar.rotation.set(0, Math.PI / 4, -0.35);
      this.speciesGroup.add(rightEar);

      const rightInnerGeo = new THREE.ConeGeometry(2.0, 4.5, 4);
      const rightInner = new THREE.Mesh(rightInnerGeo, innerEarMat);
      rightInner.position.set(6.0, 4.2, 1.4);
      rightInner.rotation.set(0, Math.PI / 4, -0.35);
      this.speciesGroup.add(rightInner);

      // Cat Tail at back
      const tailGeo = new THREE.CylinderGeometry(1.6, 1.2, 15.0, 12);
      const tailMesh = new THREE.Mesh(tailGeo, earMat);
      tailMesh.position.set(0, -32, -12);
      tailMesh.rotation.set(-0.65, 0, 0.15);
      this.speciesGroup.add(tailMesh);

      target.add(this.speciesGroup);
    }
  }

  private startLoop() {
    const animate = (time: number) => {
      if (this.disposed) return;
      this.animationId = requestAnimationFrame(animate);

      const dt = Math.min(0.1, (time - this.lastTime) * 0.001);
      this.lastTime = time;

      // Slow rotation around Y <= 0.4 rad/s (~0.3 rad/s)
      this.rootGroup.rotation.y += dt * 0.3;

      if (this.chef) {
        this.chef.update(dt);
      }

      if (this.renderer) {
        this.renderer.render(this.scene, this.camera);
      }
    };
    this.animationId = requestAnimationFrame(animate);
  }

  private disposeGroup(group: THREE.Group) {
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        if (obj.geometry && !obj.geometry.userData?.isSharedAsset) {
          obj.geometry.dispose();
        }
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => {
              if (m && !m.userData?.isSharedAsset) m.dispose();
            });
          } else if (!obj.material.userData?.isSharedAsset) {
            obj.material.dispose();
          }
        }
      }
    });
  }

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.animationId);

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.renderer && this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }

    if (this.chef) {
      this.chef.dispose();
      this.chef = null;
    }

    this.disposeGroup(this.scene as unknown as THREE.Group);
    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]!);
    }
  }
}
