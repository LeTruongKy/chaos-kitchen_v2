import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { QUAT_MODEL_FILE, QUAT_CLIP_NAMES, QuatClipKey } from './quatProfile';
import { resolvePublicUrl } from '../../assets/AssetLoader';

export const QUAT_CHARACTER_MODELS = [
  '/assets/quat/chef_hat.glb',
  '/assets/quat/chef_male.glb',
  '/assets/quat/chef_female.glb',
  '/assets/quat/kimono_female.glb',
  '/assets/quat/pirate_male.glb',
  '/assets/quat/suit_male.glb',
] as const;

export const QUAT_CHARACTER_NAMES = [
  'Bếp Trưởng Overcooked',
  'Đầu Bếp Râu Kẽm',
  'Đầu Bếp Tóc Đỏ',
  'Đầu Bếp Kimono',
  'Bếp Hải Tặc',
  'Quản Lý Vest',
] as const;

export const QUAT_CUSTOMER_MODELS = [
  '/assets/quat/casual_male.glb',
  '/assets/quat/casual_female.glb',
  '/assets/quat/suit_male.glb',
  '/assets/quat/kimono_female.glb',
] as const;

export function getCharacterIndexFromCosmetic(cosmetic?: { hat?: number; species?: number }): number {
  if (!cosmetic) return 0;
  const species = Math.max(0, Math.min(1, cosmetic.species ?? 0));
  const hat = Math.max(0, Math.min(2, cosmetic.hat ?? 0));
  return (species * 3 + hat) % QUAT_CHARACTER_MODELS.length;
}

export function getCosmeticFromCharacterIndex(index: number, currentColor: number = 0): { color: number; hat: number; species: number } {
  const normalized = ((index % QUAT_CHARACTER_MODELS.length) + QUAT_CHARACTER_MODELS.length) % QUAT_CHARACTER_MODELS.length;
  const species = Math.floor(normalized / 3);
  const hat = normalized % 3;
  return { color: currentColor, hat, species };
}

export function getCharacterUrlForCosmetic(cosmetic?: { hat?: number; species?: number }): string {
  const idx = getCharacterIndexFromCosmetic(cosmetic);
  return QUAT_CHARACTER_MODELS[idx] ?? QUAT_MODEL_FILE;
}

/**
 * Chuẩn hóa vật liệu Soft Stylized Matte Clay (roughness = 0.78, metalness = 0.0)
 * cho các nhân vật Chibi Overcooked (.glb), giữ nguyên màu giải phẫu (mũi nâu đỏ,
 * má hồng, răng trắng, tạp dề trắng 2 hàng cúc đen) và nhuộm màu áo theo người chơi.
 */
const quatMaterialCache = new Map<string, THREE.MeshStandardMaterial>();

export function applyQuatPalette(root: THREE.Object3D, accentHex: number = 0xe63946, modelUrl: string = ''): void {
  const lowerUrl = modelUrl.toLowerCase();
  const isSuit = lowerUrl.includes('suit');

  root.traverse((child: any) => {
    if (!child || !child.isMesh) return;
    child.castShadow = false;
    child.receiveShadow = false;
    if (child.geometry) {
      child.geometry.userData.isSharedAsset = true;
    }
    if (!child.material) return;

    const origMats = Array.isArray(child.material) ? child.material : [child.material];
    const clonedMats = origMats.map((m: any) => {
      if (!m) return m;
      const name = String(m.name || '').replace(/\.\d+$/, '');
      const baseHex = m.color && typeof m.color.getHex === 'function' ? m.color.getHex() : 0xffffff;

      let targetHex = baseHex;
      let roughness = 0.80;
      let metalness = 0.05;

      switch (name) {
        case 'Shirt':
          targetHex = isSuit ? 0x1d3557 : accentHex;
          break;
        case 'Band':
          targetHex = accentHex;
          break;
        case 'Gold':
          targetHex = 0xd98a16;
          roughness = 0.40;
          metalness = 0.25;
          break;
        case 'Face':
          roughness = 0.65;
          break;
        default:
          // Giữ nguyên màu gốc từ Blender cho Skin, NoseSkin, Blush, MouthInside, Tongue, Hat, WhiteApron, Red, Hair, Pants, Black
          targetHex = baseHex;
          break;
      }

      const cacheKey = `${name}_${targetHex}_${roughness}_${metalness}`;
      let stdMat = quatMaterialCache.get(cacheKey);
      if (!stdMat) {
        stdMat = new THREE.MeshStandardMaterial({
          name,
          color: new THREE.Color(targetHex),
          roughness,
          metalness,
          emissive: new THREE.Color(0x000000),
          emissiveIntensity: 0.0,
        });
        stdMat.userData.isSharedAsset = true;
        quatMaterialCache.set(cacheKey, stdMat);
      }
      return stdMat;
    });

    child.material = Array.isArray(child.material) ? clonedMats : clonedMats[0];
  });
}

export interface QuatModelResult {
  group: THREE.Group;
  model: THREE.Group;
  clips: Map<QuatClipKey, THREE.AnimationClip>;
  scale: number;
  height: number;
  rawHeight: number;
  scaleNode: number;
  modelUrl?: string;
}

const cachedPromises = new Map<string, Promise<QuatModelResult>>();
const gltfLoader = new GLTFLoader();

/**
 * Nạp nhân vật Chibi Overcooked (.glb) và chuẩn hóa kích thước/clip/màu sắc.
 * Tự động chuyển đổi mọi đường dẫn .fbx cũ sang .glb mới.
 */
export async function loadQuatModel(modelUrl: string = QUAT_MODEL_FILE): Promise<QuatModelResult> {
  const normalizedUrl = modelUrl.replace(/\.fbx(\?.*)?$/i, '.glb');
  const existing = cachedPromises.get(normalizedUrl);
  if (existing) {
    return existing;
  }

  const promise = (async () => {
    const fullUrl = resolvePublicUrl(normalizedUrl);
    const resPath = fullUrl.substring(0, fullUrl.lastIndexOf('/') + 1);
    gltfLoader.setResourcePath(resPath);
    const gltf = await gltfLoader.loadAsync(fullUrl);
    const model = gltf.scene;
    const rawAnimations = gltf.animations || [];

    applyQuatPalette(model, 0xe63946, normalizedUrl);

    // Tính bounding box thực tế của nhân vật Chibi Overcooked (đơn vị mét trong Blender ~1.50m - 1.65m)
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const h_tho = Math.max(0.1, box.max.y - box.min.y);
    const scale_node = 1.0;
    const h_thuc = h_tho;

    // Quy đổi chiều cao nhân vật trong thế giới Three.js (1 tile = 64px, quầy bếp = 40px, nhân vật Chibi = 88px)
    const targetWorldHeight = 88.0;
    const he_so = targetWorldHeight / h_thuc;

    const group = new THREE.Group();
    group.add(model);
    group.scale.setScalar(he_so);
    group.position.y = -box.min.y * he_so;

    // Chuẩn hóa tên clip về "CharacterArmature|<ClipName>"
    for (const anim of rawAnimations) {
      while (anim.name.startsWith('CharacterArmature|CharacterArmature|')) {
        anim.name = anim.name.replace('CharacterArmature|CharacterArmature|', 'CharacterArmature|');
      }
      if (!anim.name.startsWith('CharacterArmature|') && !anim.name.includes('|')) {
        anim.name = `CharacterArmature|${anim.name}`;
      }
    }

    const clipsMap = new Map<QuatClipKey, THREE.AnimationClip>();

    for (const [keyStr, expectedName] of Object.entries(QUAT_CLIP_NAMES)) {
      const key = keyStr as QuatClipKey;
      const shortName = expectedName.replace('CharacterArmature|', '');
      const clip =
        rawAnimations.find((c) => c.name === expectedName) ||
        rawAnimations.find((c) => c.name.endsWith(`|${shortName}`) || c.name === shortName);
      if (!clip) {
        if (rawAnimations[0]) {
          clipsMap.set(key, rawAnimations[0]);
        }
        continue;
      }
      clipsMap.set(key, clip);
    }

    return {
      group,
      model,
      clips: clipsMap,
      scale: he_so,
      height: h_thuc,
      rawHeight: h_tho,
      scaleNode: scale_node,
      modelUrl: normalizedUrl,
    };
  })();

  cachedPromises.set(normalizedUrl, promise);
  return promise;
}


