import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { TILE_PX, GameEvent } from '@kitchen/core';
import { RenderFrame } from '../../render/IGameRenderer';
import { toon, withOutline } from '../materials';
import { getCarryConfig } from './carryConfig';
import { applyHeldItemScale } from './carryScale';
import { QUAT_LOOP, QuatClipKey } from './quatProfile';
import { QuatModelResult, applyQuatPalette } from './quatClips';
import { pickQuatClip } from './quatPick';
import { voiceChat } from '../../../net/VoiceChat';

let sharedYouBadgeMat: THREE.SpriteMaterial | null = null;
function createYouBadge(): THREE.Sprite {
  if (!sharedYouBadgeMat) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = '900 58px "Impact", "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillText('YOU', canvas.width / 2 + 4, canvas.height / 2 + 5);

      ctx.lineWidth = 14;
      ctx.strokeStyle = '#111111';
      ctx.strokeText('YOU', canvas.width / 2, canvas.height / 2);

      const grad = ctx.createLinearGradient(0, 16, 0, 80);
      grad.addColorStop(0, '#ff4b3e');
      grad.addColorStop(1, '#e61919');
      ctx.fillStyle = grad;
      ctx.fillText('YOU', canvas.width / 2, canvas.height / 2);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    sharedYouBadgeMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    sharedYouBadgeMat.userData.isSharedAsset = true;
  }
  const sprite = new THREE.Sprite(sharedYouBadgeMat);
  sprite.scale.set(TILE_PX * 0.72, TILE_PX * 0.27, 1);
  sprite.position.set(0, TILE_PX * 1.66, 0);
  sprite.renderOrder = 950;
  return sprite;
}

let sharedSpeakingBadgeMat: THREE.SpriteMaterial | null = null;
function createSpeakingBadge(): THREE.Sprite {
  if (!sharedSpeakingBadgeMat) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#16a34a';
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 8;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(16, 12, 224, 72, 36);
      } else {
        ctx.rect(16, 12, 224, 72);
      }
      ctx.fill();
      ctx.stroke();

      ctx.font = '900 38px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🔊 MIC', canvas.width / 2, canvas.height / 2 + 2);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    sharedSpeakingBadgeMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    sharedSpeakingBadgeMat.userData.isSharedAsset = true;
  }
  const sprite = new THREE.Sprite(sharedSpeakingBadgeMat);
  sprite.scale.set(TILE_PX * 0.78, TILE_PX * 0.29, 1);
  sprite.position.set(0, TILE_PX * 1.98, 0);
  sprite.renderOrder = 955;
  sprite.visible = false;
  return sprite;
}

const sharedFootShadowGeo = new THREE.CircleGeometry(TILE_PX * 0.34, 20);
sharedFootShadowGeo.rotateX(-Math.PI / 2);
sharedFootShadowGeo.userData.isSharedAsset = true;
const sharedFootShadowMat = new THREE.MeshBasicMaterial({
  color: 0x120b07,
  transparent: true,
  opacity: 0.36,
  depthWrite: false,
});
sharedFootShadowMat.userData.isSharedAsset = true;

const sharedFootRingGeo = new THREE.RingGeometry(TILE_PX * 0.31, TILE_PX * 0.39, 24);
sharedFootRingGeo.rotateX(-Math.PI / 2);
sharedFootRingGeo.userData.isSharedAsset = true;

const sharedArrowShape = new THREE.Shape();
const arrowR = TILE_PX * 0.09;
sharedArrowShape.moveTo(0, arrowR * 1.35);
sharedArrowShape.lineTo(-arrowR, -arrowR * 0.5);
sharedArrowShape.lineTo(arrowR, -arrowR * 0.5);
sharedArrowShape.closePath();
const sharedFootArrowGeo = new THREE.ShapeGeometry(sharedArrowShape);
sharedFootArrowGeo.rotateX(Math.PI / 2);
sharedFootArrowGeo.userData.isSharedAsset = true;

function createFootRing(colorHex: number, isMe: boolean): THREE.Group {
  const group = new THREE.Group();
  group.position.y = 0.6;

  // 1. Soft dark contact shadow under feet
  const shadowMesh = new THREE.Mesh(sharedFootShadowGeo, sharedFootShadowMat);
  group.add(shadowMesh);

  // 2. Crisp Overcooked/RSC colored player ring
  const ringMat = new THREE.MeshBasicMaterial({
    color: isMe ? 0xff4b3e : colorHex,
    transparent: true,
    opacity: isMe ? 0.92 : 0.72,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const ringMesh = new THREE.Mesh(sharedFootRingGeo, ringMat);
  ringMesh.position.y = 0.2;
  ringMesh.name = 'playerRingMesh';
  group.add(ringMesh);

  // 3. Forward direction indicator triangle on the front edge of the ring (+Z is forward for ChefModel)
  const arrowMat = new THREE.MeshBasicMaterial({
    color: isMe ? 0xffe066 : colorHex,
    transparent: true,
    opacity: 0.95,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const arrowMesh = new THREE.Mesh(sharedFootArrowGeo, arrowMat);
  arrowMesh.position.set(0, 0.35, TILE_PX * 0.44);
  arrowMesh.name = 'playerRingArrow';
  group.add(arrowMesh);

  return group;
}

function createChefKnifeProp(): THREE.Group {
  const knife = new THREE.Group();
  // Handle
  const handleGeo = new THREE.BoxGeometry(0.08, 0.08, 0.28);
  const handleMat = toon(0x3d2314);
  const handle = withOutline(new THREE.Mesh(handleGeo, handleMat), 1.03);
  knife.add(handle);

  // Blade
  const bladeGeo = new THREE.BoxGeometry(0.03, 0.16, 0.52);
  const bladeMat = toon(0xe2e8f0, { emissive: 0xffffff, emissiveIntensity: 0.15 });
  const bladeMesh = new THREE.Mesh(bladeGeo, bladeMat);
  bladeMesh.position.set(0, -0.02, 0.38);
  const blade = withOutline(bladeMesh, 1.02);
  knife.add(blade);

  knife.visible = false;
  return knife;
}

function createWashSpongeProp(): THREE.Group {
  const sponge = new THREE.Group();
  const yellowGeo = new THREE.BoxGeometry(0.28, 0.12, 0.38);
  const yellow = new THREE.Mesh(yellowGeo, toon(0xfacc15));
  const greenGeo = new THREE.BoxGeometry(0.28, 0.05, 0.38);
  const green = new THREE.Mesh(greenGeo, toon(0x16a34a));
  green.position.y = 0.08;
  sponge.add(yellow, green);

  // Soap foam bubbles on sponge
  const foamMat = toon(0xffffff, { emissive: 0xe0f2fe, emissiveIntensity: 0.25 });
  for (const [bx, by, bz, br] of [
    [0.08, 0.12, 0.06, 0.07],
    [-0.07, 0.11, -0.05, 0.06],
    [0.02, 0.13, -0.09, 0.05],
  ] as const) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(br, 8, 8), foamMat);
    b.position.set(bx, by, bz);
    sponge.add(b);
  }
  sponge.visible = false;
  return sponge;
}

const tempSpinePos = new THREE.Vector3();
const tempFootLPos = new THREE.Vector3();
const tempFootRPos = new THREE.Vector3();
const tempWorldScale = new THREE.Vector3();
let cachedChefDebugSearch: string | null = null;
let cachedChefIsDebug = false;
function isChefDebugMode(): boolean {
  if (typeof window === 'undefined') return false;
  const s = window.location.search;
  if (s !== cachedChefDebugSearch) {
    cachedChefDebugSearch = s;
    cachedChefIsDebug = new URLSearchParams(s).get('debug') === '1';
  }
  return cachedChefIsDebug;
}

export class ChefModel {
  public group = new THREE.Group();
  public id: string = ''; // to be set by ThreeRenderer
  public colorHex: number = 0xe63946;
  public modelUrl: string = '';

  // GLB / Quat components
  private glbGroup: THREE.Group | null = null;
  public model: THREE.Group | null = null;
  public isReady: boolean = false;
  private mixer: THREE.AnimationMixer | null = null;
  private actions = new Map<string, THREE.AnimationAction>();
  private activeAction: THREE.AnimationAction | null = null;
  private spineBone: THREE.Object3D | null = null;
  private handBone: THREE.Object3D | null = null;
  private footLBone: THREE.Object3D | null = null;
  private footRBone: THREE.Object3D | null = null;
  private rigBones: {
    hips?: THREE.Object3D;
    abdomen?: THREE.Object3D;
    torso?: THREE.Object3D;
    head?: THREE.Object3D;
    shoulderR?: THREE.Object3D;
    upperArmR?: THREE.Object3D;
    lowerArmR?: THREE.Object3D;
    shoulderL?: THREE.Object3D;
    upperArmL?: THREE.Object3D;
    lowerArmL?: THREE.Object3D;
  } = {};

  public quatScale: number = 0.3002;
  public quatH: number = 3.1641;
  public isQuat: boolean = false;

  private time = 0;
  public state = 'idle';
  public heldItemData: any = null;
  public heldItemModel: THREE.Group | null = null;
  public carryAnchor = new THREE.Group();
  private baseSpineY: number | null = null;
  public isMe: boolean;
  public isCustomer: boolean = false;
  private youBadge: THREE.Sprite | null = null;
  private speakingBadge: THREE.Sprite | null = null;
  private footRingGroup: THREE.Group | null = null;
  private footRingMesh: THREE.Mesh | null = null;
  private chopKnifeProp: THREE.Group | null = null;
  private washSpongeProp: THREE.Group | null = null;

  // Timers and states for animation overrides
  private throwTimer = 0;
  private cheerTimer = 0;

  constructor(colorHex: number, isMe: boolean, isCustomer: boolean = false) {
    if (typeof window !== 'undefined') {
      (window as any).THREE = THREE;
    }
    this.colorHex = colorHex || 0xe63946;
    this.isMe = isMe;
    this.isCustomer = isCustomer;
    this.group.add(this.carryAnchor);

    if (!isCustomer) {
      this.footRingGroup = createFootRing(this.colorHex, isMe);
      this.footRingMesh = (this.footRingGroup.getObjectByName('playerRingMesh') as THREE.Mesh) || null;
      this.group.add(this.footRingGroup);

      this.chopKnifeProp = createChefKnifeProp();
      this.washSpongeProp = createWashSpongeProp();

      if (typeof document !== 'undefined') {
        this.youBadge = createYouBadge();
        this.youBadge.visible = Boolean(isMe);
        this.group.add(this.youBadge);

        this.speakingBadge = createSpeakingBadge();
        this.group.add(this.speakingBadge);
      }
    }
  }

  public setIsCustomer(isCustomer: boolean) {
    this.isCustomer = isCustomer;
    if (this.youBadge && isCustomer) {
      this.youBadge.visible = false;
    }
    if (this.footRingGroup) {
      const ring = this.footRingGroup.getObjectByName('playerRingMesh');
      const arrow = this.footRingGroup.getObjectByName('playerRingArrow');
      if (ring) ring.visible = !isCustomer;
      if (arrow) arrow.visible = !isCustomer;
    }
  }

  public applyCustomerSeatedPose(customerState: string, angry?: boolean) {
    if (this.state !== 'sit') return;
    const { torso, head, upperArmR, lowerArmR, upperArmL, lowerArmL } = this.rigBones;
    if (customerState === 'seated_waiting_order') {
      // Giơ tay phải vẫy gọi nhân viên giống Ready Set Cook!
      const wave = Math.sin(this.time * 9);
      if (torso) torso.rotation.z = wave * 0.04;
      if (head) head.rotation.y = Math.sin(this.time * 3) * 0.14;
      if (upperArmR) {
        upperArmR.rotation.x = -2.15;
        upperArmR.rotation.z = -0.35 + wave * 0.28;
      }
      if (lowerArmR) {
        lowerArmR.rotation.x = -0.45 + wave * 0.35;
      }
    } else if (customerState === 'eating') {
      // Nhịp gật đầu và đưa tay lên thưởng thức món ăn
      const eat = Math.sin(this.time * 10);
      if (head) head.rotation.x = 0.15 + eat * 0.14;
      if (torso) torso.rotation.x = 0.08 + Math.abs(eat) * 0.05;
      if (upperArmR) upperArmR.rotation.x = -1.1 + eat * 0.35;
      if (lowerArmR) lowerArmR.rotation.x = -0.95 + eat * 0.45;
      if (upperArmL) upperArmL.rotation.x = -0.85 - eat * 0.2;
    } else if (angry) {
      // Sốt ruột lắc đầu khi chờ lâu
      if (head) head.rotation.y = Math.sin(this.time * 14) * 0.22;
      if (torso) torso.rotation.z = Math.sin(this.time * 12) * 0.05;
    }
  }

  public setAccentColor(colorHex: number) {
    this.colorHex = colorHex || 0xe63946;
    if (this.model) {
      applyQuatPalette(this.model, this.colorHex, this.modelUrl);
    }
    if (this.footRingGroup && !this.isMe) {
      const ring = this.footRingGroup.getObjectByName('playerRingMesh') as THREE.Mesh | undefined;
      if (ring && ring.material instanceof THREE.MeshBasicMaterial) {
        ring.material.color.setHex(this.colorHex);
      }
      const arrow = this.footRingGroup.getObjectByName('playerRingArrow') as THREE.Mesh | undefined;
      if (arrow && arrow.material instanceof THREE.MeshBasicMaterial) {
        arrow.material.color.setHex(this.colorHex);
      }
    }
  }

  public async loadQuat(result: QuatModelResult) {
    if (this.glbGroup) {
      this.group.remove(this.glbGroup);
      this.glbGroup = null;
    }
    this.actions.clear();
    this.activeAction = null;
    this.spineBone = null;
    this.handBone = null;
    this.footLBone = null;
    this.footRBone = null;
    this.rigBones = {};

    this.isQuat = true;
    this.quatScale = result.scale;
    this.quatH = result.height;
    this.modelUrl = result.modelUrl || '';

    // Clone model và skeleton riêng cho từng instance nhân vật
    const clonedModel = (SkeletonUtils as any).clone(result.model) as THREE.Group;
    applyQuatPalette(clonedModel, this.colorHex, this.modelUrl);
    this.model = clonedModel;
    this.isReady = true;

    // Wrapper group riêng mang hệ số scale và vị trí chân chuẩn hóa
    const group = new THREE.Group();
    group.add(clonedModel);
    group.scale.setScalar(result.scale);
    group.position.y = result.group.position.y;

    this.glbGroup = group;
    this.group.add(this.glbGroup);

    // GATE 3: Tìm xương tay phải FistR để gắn vật cầm và các xương thân trên cho hoạt ảnh thái/rửa
    clonedModel.traverse((child) => {
      if (child.name === 'FistR') this.handBone = child;
      if (child.name === 'FootL') this.footLBone = child;
      if (child.name === 'FootR') this.footRBone = child;
      if (child.name === 'Hips') this.rigBones.hips = child;
      if (child.name === 'Abdomen') this.rigBones.abdomen = child;
      if (child.name === 'Torso') this.rigBones.torso = child;
      if (child.name === 'Head') this.rigBones.head = child;
      if (child.name === 'ShoulderR') this.rigBones.shoulderR = child;
      if (child.name === 'UpperArmR') this.rigBones.upperArmR = child;
      if (child.name === 'LowerArmR') this.rigBones.lowerArmR = child;
      if (child.name === 'ShoulderL') this.rigBones.shoulderL = child;
      if (child.name === 'UpperArmL') this.rigBones.upperArmL = child;
      if (child.name === 'LowerArmL') this.rigBones.lowerArmL = child;

      if (child.name === 'Torso' || child.name === 'Abdomen' || child.name === 'Hips') {
        if (!this.spineBone) this.spineBone = child;
      }
    });

    if (!this.handBone) {
      clonedModel.traverse((child) => {
        if (child.name === 'LowerArmR') {
          this.handBone = child;
        }
      });
    }

    const handBone = this.handBone as THREE.Object3D | null;
    if (handBone) {
      if (this.chopKnifeProp) {
        handBone.add(this.chopKnifeProp);
      }
      if (this.washSpongeProp) {
        handBone.add(this.washSpongeProp);
      }
    }

    if (this.heldItemModel) {
      const currentItem = this.heldItemModel;
      this.heldItemModel = null;
      this.setHeldItemModel(currentItem);
    }

    this.mixer = new THREE.AnimationMixer(clonedModel);

    // Đăng ký toàn bộ clip từ result.clips theo QUAT_LOOP
    for (const [key, clip] of result.clips.entries()) {
      const action = this.mixer.clipAction(clip);
      const loopType = QUAT_LOOP[key];
      // 'sit' (CharacterArmature|SitDown) là hoạt ảnh chuyển từ đứng sang ngồi -> chạy 1 lần rồi giữ nguyên tư thế ngồi
      if (loopType === 'once' || key === 'sit') {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      } else {
        action.setLoop(THREE.LoopRepeat, Infinity);
      }
      this.actions.set(key, action);
    }

    if (this.actions.has(this.state)) {
      this.playAnim(this.state, 0);
    } else {
      this.playAnim('idle', 0);
    }
  }

  public async loadGlb(glbData: any) {
    if (!glbData || !glbData.scene) return;
    this.glbGroup = glbData.scene as THREE.Group;
    this.group.add(this.glbGroup);

    this.glbGroup.traverse((child) => {
      const name = child.name.replace(/^mixamorig:?/i, '').toLowerCase();
      if (name === 'spine2') {
        this.spineBone = child;
      }
    });

    if (!this.spineBone && this.glbGroup) {
      this.spineBone = new THREE.Group();
      this.spineBone.position.set(0, (TILE_PX * 0.5) / this.glbGroup.scale.y, (TILE_PX * 0.3) / this.glbGroup.scale.z);
      this.glbGroup.add(this.spineBone);
    }

    if (glbData.animations && glbData.animations.length > 0 && this.glbGroup) {
      this.mixer = new THREE.AnimationMixer(this.glbGroup);
      
      const requiredClips = ['sprint', 'throw', 'terrified', 'cheering', 'carry_run', 'walk', 'carry_idle', 'idle', 'wiping_sweat', 'sitting'];
      
      for (const req of requiredClips) {
        const clip = glbData.animations.find((c: THREE.AnimationClip) => c.name === req);
        if (clip) {
          const action = this.mixer.clipAction(clip);
          if (req === 'throw' || req === 'cheering') {
            action.setLoop(THREE.LoopOnce, 1);
            action.clampWhenFinished = true;
          }
          this.actions.set(req, action);
        } else {
          console.warn(`[ChefAnimator] Không tìm thấy clip "${req}"`);
        }
      }

      for (const clip of glbData.animations) {
        if (!this.actions.has(clip.name)) {
          this.actions.set(clip.name, this.mixer.clipAction(clip));
        }
      }

      if (this.state && this.actions.has(this.state)) {
        this.playAnim(this.state, 0);
      } else {
        this.playAnim('idle', 0);
      }
    }
  }

  public setHeldItemModel(model: THREE.Group | null) {
    if (this.heldItemModel) {
      if (this.heldItemModel.parent) {
        this.heldItemModel.parent.remove(this.heldItemModel);
      }
    }
    this.heldItemModel = model;
    
    if (this.heldItemModel) {
      const itemKey = this.heldItemData?.id || this.heldItemData?.tool || this.heldItemData?.type || '';
      const config = getCarryConfig(itemKey);
      
      this.carryAnchor.position.y = config.height * TILE_PX;
      this.heldItemModel.position.set(config.side * TILE_PX, 0, config.forward * TILE_PX);
      this.heldItemModel.rotation.set(0, config.rotationY, 0);
      this.carryAnchor.add(this.heldItemModel);

      const worldScale = new THREE.Vector3();
      this.carryAnchor.updateWorldMatrix(true, false);
      this.carryAnchor.getWorldScale(worldScale);
      const parentScale = worldScale.x || 1;

      if (parentScale > 1.01 && this.heldItemModel.children.length > 0) {
        const isToolOrPlate = this.heldItemData?.type === 'tool' || this.heldItemData?.type === 'plate';
        const isMushroom = this.heldItemData?.id === 'mushroom';
        const targetSize = isToolOrPlate
          ? 0.66
          : isMushroom
            ? (this.heldItemData?.state === 'chopped' ? 0.36 : 0.42)
            : 0.50;
        applyHeldItemScale(this.heldItemModel, this.carryAnchor, targetSize, TILE_PX);
      } else {
        // Giữ nguyên tỉ lệ 1:1 với vật đặt trên bàn/quầy (đã được ModelNormalizer chuẩn hóa theo AssetManifest)
        this.heldItemModel.scale.setScalar(config.scale);
      }
      this.heldItemModel.userData.scaledCount = this.heldItemModel.children.length;
    }
  }

  public dispose() {
    this.group.clear();
  }

  private targetRotation = 0;

  public playAnim(animName: string, duration = 0.15) {
    if (!this.mixer) return;
    const action = this.actions.get(animName);
    if (!action) return;

    if (this.activeAction === action) return;

    action.reset();
    action.setEffectiveTimeScale(1);
    action.setEffectiveWeight(1);
    action.play();
    
    if (this.activeAction) {
      this.activeAction.fadeOut(duration);
      action.fadeIn(duration);
    }
    this.activeAction = action;
  }

  public handleEvent(ev: GameEvent) {
    if (ev.playerId !== this.id) return;
    
    if (ev.type === 'throw') {
      this.throwTimer = 0.5;
    }
    if (ev.type === 'serve_ok') {
      this.cheerTimer = 1.5;
    }
  }

  public update(dtSec: number, playerFrame?: any, frame?: RenderFrame | null) {
    this.time += dtSec;
    if (this.throwTimer > 0) this.throwTimer -= dtSec;
    if (this.cheerTimer > 0) this.cheerTimer -= dtSec;

    if (!playerFrame) {
      if (this.mixer) {
        const isClampedSit = this.isCustomer && this.state === 'sit' && this.activeAction && !this.activeAction.isRunning();
        if (!isClampedSit) {
          this.mixer.update(dtSec);
        }
      }
      return;
    }

    const { vx, vy, fx, fy, acting, held, dashing } = playerFrame;
    const speed = Math.sqrt(vx * vx + vy * vy);

    if (speed > 0.05) {
      this.targetRotation = Math.atan2(vx, vy);
    } else if (Math.abs(fx) > 0.05 || Math.abs(fy) > 0.05) {
      this.targetRotation = Math.atan2(fx, fy);
    }

    let rotDiff = this.targetRotation - this.group.rotation.y;
    while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
    while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
    this.group.rotation.y += rotDiff * Math.min(1.0, dtSec * 15);

    // GATE 2: Ánh xạ trạng thái qua pickQuatClip thuần
    const victory = Boolean(this.cheerTimer > 0 || (frame && frame.timeLeft <= 0));
    const nearFire = Boolean(frame && this.isNearFire(playerFrame.x, playerFrame.y, frame.stations));
    const actingStation: 'cutting' | 'sink' | null = playerFrame.actingStation ?? null;
    const pick = pickQuatClip({
      dashing: Boolean(dashing),
      throwing: Boolean(this.throwTimer > 0),
      victory,
      nearFire,
      actingStation,
      speed,
      holding: Boolean(held),
      maxSpeed: 4.0,
    });

    const targetState = pick.key;

    if (this.state !== targetState) {
      if (isChefDebugMode()) {
        console.log(`[QUAT] key=${targetState} actingStation=${actingStation} speed=${speed.toFixed(2)} held=${Boolean(held)}`);
      }
      this.state = targetState;
      this.playAnim(this.state, 0.15);
    }

    // Cập nhật timeScale
    const isChoppingOrWashing = actingStation === 'cutting' || actingStation === 'sink' || this.state === 'chop' || this.state === 'wash';
    if (this.activeAction) {
      if (isChoppingOrWashing) {
        // Giữ chân đứng vững ở đầu clip thay vì cúi sát đất theo PickUp
        this.activeAction.timeScale = 0;
        this.activeAction.time = 0.04;
      } else {
        this.activeAction.timeScale = pick.timeScale;
        if (this.state === 'carry_walk' && pick.timeScale === 0) {
          this.activeAction.time = 0.15 + Math.sin(this.time * 3.2) * 0.03;
        }
      }
    }

    if (this.mixer) {
      this.mixer.update(dtSec);
    }

    this.applyProceduralCookingPose(actingStation);

    // 12 Principles of Animation: Squash & Stretch + Forward Pitch & Turn Banking on glbGroup
    if (this.glbGroup) {
      const baseS = this.quatScale || 1;
      let sx = 1.0;
      let sy = 1.0;
      let sz = 1.0;
      if (dashing) {
        // Stretch forward & squash slightly vertically while dashing
        sy = 0.91;
        sz = 1.12;
        sx = 1.04;
      } else if (this.throwTimer > 0.25) {
        // Elastic pop during throw release
        sy = 1.08;
        sx = 0.95;
        sz = 0.95;
      } else if (speed > 0.35) {
        // Subtle rhythmic gait squash-and-stretch
        const gait = Math.sin(this.time * 16);
        sy = 1.0 + gait * 0.025;
        sx = 1.0 - gait * 0.015;
        sz = 1.0 - gait * 0.015;
      }
      this.glbGroup.scale.set(baseS * sx, baseS * sy, baseS * sz);

      // Lean forward into speed & bank into turns (Arcs & Follow-Through)
      const targetPitch = dashing ? 0.16 : Math.min(0.10, speed * 0.022);
      const targetBank = Math.max(-0.14, Math.min(0.14, -rotDiff * 0.12));
      this.glbGroup.rotation.x += (targetPitch - this.glbGroup.rotation.x) * Math.min(1, dtSec * 12);
      this.glbGroup.rotation.z += (targetBank - this.glbGroup.rotation.z) * Math.min(1, dtSec * 12);
    }

    if (this.footRingMesh) {
      const pulse = this.isMe ? 1 + Math.sin(this.time * 5) * 0.045 : 1;
      this.footRingMesh.scale.set(pulse, pulse, 1);
    }

    // BƯỚC 1: Cung cấp window.__QUAT__ cho kiểm thử trình duyệt (?debug=1)
    if (this.isMe && isChefDebugMode()) {
      if (this.footLBone) this.footLBone.getWorldPosition(tempFootLPos);
      if (this.footRBone) this.footRBone.getWorldPosition(tempFootRPos);

      (window as any).__QUAT__ = {
        key: this.state,
        once: pick.once,
        timeScale: pick.timeScale,
        scale: this.quatScale,
        h: this.quatH,
        actingStation: playerFrame.actingStation ?? null,
        ready: this.isReady,
        x: playerFrame.x,
        y: playerFrame.y,
        fx: playerFrame.fx,
        fy: playerFrame.fy,
        held: Boolean(held),
        footL: { x: tempFootLPos.x, y: tempFootLPos.y, z: tempFootLPos.z },
        footR: { x: tempFootRPos.x, y: tempFootRPos.y, z: tempFootRPos.z },
      };
    }

    // Cập nhật vị trí neo của carryAnchor ngay tầm bụng / hai bàn tay của Chibi Chef (chỉ tính matrix xương khi có vật cầm)
    if (held || this.carryAnchor.children.length > 0 || this.baseSpineY === null) {
      const itemKey = this.heldItemData?.id || this.heldItemData?.tool || this.heldItemData?.type || '';
      const carryCfg = getCarryConfig(itemKey);
      if (this.spineBone) {
        this.spineBone.getWorldPosition(tempSpinePos);
        if (this.baseSpineY === null) {
          this.baseSpineY = tempSpinePos.y;
        }
        const rawDy = this.baseSpineY !== null ? (tempSpinePos.y - this.baseSpineY) * 0.25 : 0;
        const dy = Math.max(-1.8, Math.min(1.8, rawDy));
        const idleCarryBob = (held && speed <= 0.05) ? Math.sin(this.time * 3.5) * 0.6 : 0;
        this.carryAnchor.position.y = carryCfg.height * TILE_PX + dy + idleCarryBob;
      } else {
        this.carryAnchor.position.y = carryCfg.height * TILE_PX;
      }

      // Đảm bảo scale vật cầm luôn giữ nguyên tỉ lệ 1:1 với vật trên bàn/quầy nếu model mesh được nạp thêm/thay thế async
      if (this.heldItemModel && this.heldItemModel.children.length > 0) {
        const childCount = this.heldItemModel.children.length;
        if (this.heldItemModel.userData.scaledCount !== childCount) {
          this.carryAnchor.updateWorldMatrix(true, false);
          this.carryAnchor.getWorldScale(tempWorldScale);
          const parentScale = tempWorldScale.x || 1;
          if (parentScale > 1.01) {
            const isToolOrPlate = this.heldItemData?.type === 'tool' || this.heldItemData?.type === 'plate';
            const isMushroom = this.heldItemData?.id === 'mushroom';
            const targetSize = isToolOrPlate
              ? 0.66
              : isMushroom
                ? (this.heldItemData?.state === 'chopped' ? 0.36 : 0.42)
                : 0.50;
            applyHeldItemScale(this.heldItemModel, this.carryAnchor, targetSize, TILE_PX);
          } else {
            this.heldItemModel.scale.setScalar(carryCfg.scale);
          }
          this.heldItemModel.userData.scaledCount = childCount;
        }
      }
    }

    if (this.youBadge) {
      this.youBadge.visible = Boolean(this.isMe);
      if (this.isMe) {
        this.youBadge.position.y = TILE_PX * 1.66 + Math.sin(this.time * 4.5) * 2.0;
      }
    }

    if (this.speakingBadge) {
      const vState = this.id ? voiceChat.getPlayerVoiceState(this.id) : { speaking: false };
      this.speakingBadge.visible = Boolean(vState.speaking);
      if (vState.speaking) {
        const baseY = this.isMe ? TILE_PX * 2.02 : TILE_PX * 1.72;
        this.speakingBadge.position.y = baseY + Math.sin(this.time * 8) * 1.8;
      }
    }

    if (!held || this.throwTimer > 0) {
      this.carryAnchor.visible = false;
      if (this.heldItemModel) this.heldItemModel.visible = false;
    } else {
      this.carryAnchor.visible = true;
      if (this.heldItemModel) this.heldItemModel.visible = true;
    }
  }

  private applyProceduralCookingPose(actingStation?: 'cutting' | 'sink' | null) {
    const isChop = actingStation === 'cutting' || this.state === 'chop';
    const isWash = actingStation === 'sink' || this.state === 'wash';

    if (this.chopKnifeProp) this.chopKnifeProp.visible = isChop;
    if (this.washSpongeProp) this.washSpongeProp.visible = isWash;

    if (!isChop && !isWash) return;

    const { torso, head, upperArmR, lowerArmR, upperArmL, lowerArmL } = this.rigBones;
    if (isChop) {
      // Nhịp băm dao nhanh và dứt khoát ở tầm mặt bàn bếp
      const chopWave = Math.sin(this.time * 24);
      const chopSnap = Math.max(-1, Math.min(1, chopWave * 1.35));
      if (torso) {
        torso.rotation.x = 0.16 + Math.abs(chopWave) * 0.05;
        torso.rotation.y = -0.08;
      }
      if (head) {
        head.rotation.x = 0.22;
      }
      if (upperArmL) {
        upperArmL.rotation.x = -0.78;
        upperArmL.rotation.z = 0.25;
      }
      if (lowerArmL) {
        lowerArmL.rotation.x = -0.68;
      }
      if (upperArmR) {
        upperArmR.rotation.x = -0.92 + chopSnap * 0.34;
        upperArmR.rotation.z = -0.18;
      }
      if (lowerArmR) {
        lowerArmR.rotation.x = -0.75 + chopSnap * 0.52;
      }
    } else if (isWash) {
      // Nhịp chà rửa đĩa xoay tròn bằng 2 tay ở bồn rửa
      const scrubSin = Math.sin(this.time * 16);
      const scrubCos = Math.cos(this.time * 16);
      if (torso) {
        torso.rotation.x = 0.18;
        torso.rotation.z = scrubSin * 0.06;
      }
      if (head) {
        head.rotation.x = 0.24;
      }
      if (upperArmL) {
        upperArmL.rotation.x = -0.85 + scrubCos * 0.18;
        upperArmL.rotation.z = 0.22 + scrubSin * 0.15;
      }
      if (lowerArmL) {
        lowerArmL.rotation.x = -0.72 + scrubSin * 0.25;
      }
      if (upperArmR) {
        upperArmR.rotation.x = -0.88 - scrubCos * 0.22;
        upperArmR.rotation.z = -0.22 + scrubSin * 0.22;
      }
      if (lowerArmR) {
        lowerArmR.rotation.x = -0.78 + scrubCos * 0.32;
      }
    }
  }

  private isNearFire(px: number, py: number, stations: any[]): boolean {
    if (!stations) return false;
    for (const st of stations) {
      if (st.onFire) {
        const dist = Math.abs(st.x - px) + Math.abs(st.y - py);
        if (dist <= 2) return true;
      }
    }
    return false;
  }
}
