import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { CHEF_ANIM_MANIFEST } from './chefAnimManifest';
import { resolvePublicUrl } from '../../../config/cdn';

/**
 * Nạp và chuẩn hóa toàn bộ clip animation cho Chef.
 * @param model - Model chính đã được nạp (để lấy danh sách xương)
 * @param basePath - Đường dẫn thư mục chứa assets/chef
 * @returns Promise<Record<string, THREE.AnimationClip>> - Map giữa tên khóa và Clip đã chuẩn hóa
 */
export async function loadAndPrepChefClips(model: THREE.Object3D, basePath: string): Promise<Record<string, THREE.AnimationClip>> {
  const loader = new FBXLoader();
  const resolvedBase = resolvePublicUrl(basePath).replace(/\/+$/, '');
  loader.setResourcePath(`${resolvedBase}/`);
  const clips: Record<string, THREE.AnimationClip> = {};

  // Lấy danh sách xương thực tế từ model
  const boneNames = new Set<string>();
  model.traverse((child) => {
    if ((child as THREE.Bone).isBone) {
      boneNames.add(child.name);
    }
  });

  const promises = Object.entries(CHEF_ANIM_MANIFEST).map(async ([key, info]) => {
    const fileUrl = `${resolvedBase}/${info.file}`;
    const fbx = await loader.loadAsync(fileUrl);
    if (!fbx.animations || fbx.animations.length === 0) {
      console.warn(`[clipPrep] KHÔNG có animation trong ${info.file}`);
      return;
    }

    // b) Lấy clip đầu tiên và đổi tên thành khóa
    const clipObj = fbx.animations[0];
    if (!clipObj) return;
    const clip = clipObj.clone();
    clip.name = key;

    const newTracks: THREE.KeyframeTrack[] = [];
    let mismatchCount = 0;

    for (let i = 0; i < clip.tracks.length; i++) {
      const rawTrack = clip.tracks[i];
      if (!rawTrack) continue;
      const track = rawTrack.clone();
      
      const dot = track.name.lastIndexOf('.');
      const fullPath = track.name.substring(0, dot);
      const prop = track.name.substring(dot);
      const slash = fullPath.lastIndexOf('/');
      let boneName = slash >= 0 ? fullPath.substring(slash + 1) : fullPath;
      
      // c) Chuẩn hóa tên track cho khớp tên xương THẬT
      const stripped = boneName.replace(/^mixamorig:?/i, '').toLowerCase();
      let mapped = boneName;
      for (const b of boneNames) {
        if (b.toLowerCase().endsWith(stripped)) {
          mapped = b;
          break;
        }
      }
      boneName = mapped;
      track.name = boneName + prop;

      // d) Bỏ các track .position trừ Hips và ép X,Z về khung đầu
      if (prop === '.position') {
        if (boneName !== 'mixamorigHips') {
          continue; // Bỏ qua
        } else {
          const values = track.values;
          const startX = values[0] || 0;
          const startZ = values[2] || 0;
          for (let j = 0; j < values.length; j += 3) {
            values[j] = startX;
            values[j + 2] = startZ;
          }
        }
      }

      // e) Kiểm tra mismatch
      const nodeName = track.name.split('.')[0] || '';
      const node = model.getObjectByName(nodeName);
      if (!node) {
        mismatchCount++;
      }

      newTracks.push(track);
    }

    clip.tracks = newTracks;
    
    // In số track không khớp
    if (mismatchCount > 0) {
      console.warn(`[clipPrep] Mismatch ở clip ${key}: ${mismatchCount} tracks`);
    } else {
      console.log(`[clipPrep] Clip ${key} nạp thành công (0 mismatch)`);
    }

    clips[key] = clip;
  });

  await Promise.all(promises);
  return clips;
}

/**
 * Trích xuất các clip đã chuẩn hóa ra mảng để truyền vào AssetLoader (nếu cần thiết cho cơ chế cache)
 * Nhưng theo yêu cầu: Bỏ cơ chế alias, truy cập trực tiếp bằng khóa. 
 * Sẽ dùng Object/Map trả về từ loadAndPrepChefClips.
 */
