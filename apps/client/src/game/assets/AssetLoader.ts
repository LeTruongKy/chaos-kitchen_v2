import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as THREE from 'three';
import { AssetManifest, AssetDef } from './AssetManifest';
import { ModelNormalizer } from './ModelNormalizer';

export { CDN_BASE_URL, OVERCOOKED_ASSET_VERSION, shouldUseCdn, getCdnBaseUrl, resolvePublicUrl } from '../../config/cdn';
import { resolvePublicUrl } from '../../config/cdn';

function screenLog(msg: string) {
  let div = document.getElementById('debug-log');
  if (!div) {
    div = document.createElement('div');
    div.id = 'debug-log';
    div.style.position = 'absolute';
    div.style.top = '0';
    div.style.left = '0';
    div.style.zIndex = '9999';
    div.style.background = 'rgba(0,0,0,0.5)';
    div.style.color = 'white';
    div.style.fontSize = '12px';
    div.style.pointerEvents = 'none';
    div.style.whiteSpace = 'pre-wrap';
    div.style.maxHeight = '100vh';
    div.style.overflow = 'hidden';
    document.body.appendChild(div);
  }
  div.innerText += msg + '\n';
}
(window as any).screenLog = screenLog;

export class AssetLoader {
  private static instance: AssetLoader;
  private gltfLoader = new GLTFLoader();
  private fbxLoader = new FBXLoader();

  // Cache of original normalized scenes
  private modelCache = new Map<string, { scene: THREE.Group, animations: THREE.AnimationClip[] } | null>();
  // Cache of loaded promises to prevent duplicate loads
  private loadPromises = new Map<string, Promise<void>>();
  private preloadingStarted = false;

  static getInstance(): AssetLoader {
    if (!AssetLoader.instance) {
      AssetLoader.instance = new AssetLoader();
    }
    return AssetLoader.instance;
  }

  /**
   * Preloads all active 3D kitchen models in the background (e.g. while players are in the Lobby)
   * so entering a match over the internet has zero loading delay.
   */
  preloadAllInBackground(): void {
    if (this.preloadingStarted) return;
    this.preloadingStarted = true;
    const keys = Object.keys(AssetManifest).filter(k => k !== 'chef');
    let idx = 0;
    const loadNextBatch = () => {
      const batch = keys.slice(idx, idx + 4);
      idx += 4;
      if (batch.length === 0) return;
      Promise.all(batch.map(k => this.loadAsset(k))).finally(() => {
        if (idx < keys.length) {
          setTimeout(loadNextBatch, 40);
        }
      });
    };
    setTimeout(loadNextBatch, 150);
  }

  /**
   * Retarget animation tracks to match bones in the target skeleton.
   * The animation FBX files from Mixamo have track names like:
   *   "mixamorig:Hips.position" or "RootNode/mixamorig:Hips.quaternion"
   * But the model's skeleton may have different hierarchy paths.
   * We strip the path and just keep the bone name, then find the matching bone in the model.
   */
  private retargetClip(clip: THREE.AnimationClip, boneNameSet: Set<string>): void {
    clip.tracks.forEach(track => {
      // Track name format: "path/to/BoneName.property" (e.g. "mixamorig:Hips.quaternion")
      const dotIdx = track.name.lastIndexOf('.');
      if (dotIdx === -1) return;

      const fullPath = track.name.substring(0, dotIdx);
      const property = track.name.substring(dotIdx + 1);

      // Get just the last node name (the bone itself, stripping any parent path)
      const slashIdx = fullPath.lastIndexOf('/');
      const boneName = slashIdx >= 0 ? fullPath.substring(slashIdx + 1) : fullPath;

      const originalName = track.name;

      // Try exact match first
      if (boneNameSet.has(boneName)) {
        track.name = `${boneName}.${property}`;
        return;
      }

      // Try stripping mixamorig: or mixamorig prefix case-insensitively
      const stripped = boneName.replace(/^mixamorig:?/i, '').toLowerCase();

      // Look for the bone with or without prefix
      for (const modelBone of boneNameSet) {
        const modelStripped = modelBone.replace(/^mixamorig:?/i, '').toLowerCase();
        if (modelStripped === stripped) {
          track.name = `${modelBone}.${property}`;
          return;
        }
      }

      if (track.name === originalName) {
        // Fallback
        track.name = `${boneName}.${property}`;
      }
    });

    // Strip ALL position tracks:
    // This converts all animations to purely In-Place rotations.
    // Preserves the model's natural bone rest positions (hips height, spine, etc.)
    // completely eliminating Root Motion, scale mismatches (meters vs cm), and floor-clipping.
    clip.tracks = clip.tracks.filter(t => !t.name.endsWith('.position'));
  }

  async loadAsset(id: string): Promise<{ scene: THREE.Group, animations: THREE.AnimationClip[] } | null> {
    const def = AssetManifest[id];
    if (!def) {
      console.warn(`[AssetLoader] No definition for asset: ${id}`);
      return null;
    }

    if (this.modelCache.has(id)) {
      return this.cloneCached(id, def);
    }

    if (!this.loadPromises.has(id)) {
      const p = new Promise<void>((resolve) => {
        const isFbx = def.file.toLowerCase().endsWith('.fbx');

        if (isFbx) {
          const rawPath = def.file.startsWith('/') ? def.file : `/models/${def.file}`;
          const basePath = resolvePublicUrl(rawPath);
          const resourcePath = basePath.substring(0, basePath.lastIndexOf('/') + 1);
          this.fbxLoader.setResourcePath(resourcePath);
          this.fbxLoader.load(
            basePath,
            async (fbx: THREE.Group) => {
              try {
                let animations: THREE.AnimationClip[] = [];
                if (id === 'chef') {
                  const { loadAndPrepChefClips } = await import('../renderer3d/chef/clipPrep');
                  const clipsMap = await loadAndPrepChefClips(fbx, resolvePublicUrl('/assets/chef'));
                  animations = Object.values(clipsMap);
                } else {
                  // Collect all bone/node names from the model for retargeting
                  const boneNameSet = new Set<string>();
                  fbx.traverse(obj => {
                    if (obj.name) boneNameSet.add(obj.name);
                  });

                  // Retarget embedded animations
                  animations = fbx.animations || [];
                  animations.forEach(clip => this.retargetClip(clip, boneNameSet));
                }

                // No longer use def.animationFiles here (handled by clipPrep.ts)

                console.log(`[AssetLoader] Total animations for "${id}":`, animations.map(c => c.name));

                const normalized = ModelNormalizer.normalize(fbx, def);
                this.modelCache.set(id, { scene: normalized, animations });
              } catch (e) {
                console.error(`[AssetLoader] ERROR normalizing ${def.file} for asset ${id}`, e);
                this.modelCache.set(id, null);
              }
              resolve();
            },
            undefined,
            (error: any) => {
              console.error(`[AssetLoader] FAILED to load ${def.file} for asset ${id}`, error);
              this.modelCache.set(id, null);
              resolve();
            }
          );
        } else {
          const rawPath = def.file.startsWith('/') ? def.file : `/models/${def.file}`;
          const basePath = resolvePublicUrl(rawPath);
          const defaultResourcePath = basePath.substring(0, basePath.lastIndexOf('/') + 1);
          const resourcePath = def.resourcePath ? resolvePublicUrl(def.resourcePath) : defaultResourcePath;
          const loader = new GLTFLoader().setResourcePath(resourcePath);
          loader.load(
            basePath,
            (gltf: any) => {
              try {
                const normalized = ModelNormalizer.normalize(gltf.scene, def);
                this.modelCache.set(id, { scene: normalized, animations: gltf.animations || [] });
              } catch (e) {
                console.error(`[AssetLoader] ERROR normalizing ${def.file} for asset ${id}`, e);
                this.modelCache.set(id, null);
              }
              resolve();
            },
            undefined,
            (error: any) => {
              console.error(`[AssetLoader] FAILED to load ${def.file} for asset ${id}`, error);
              this.modelCache.set(id, null); // null means failed to load -> use fallback
              resolve();
            }
          );
        }
      });
      this.loadPromises.set(id, p);
    }

    await this.loadPromises.get(id);
    return this.cloneCached(id, def);
  }

  private cloneCached(id: string, def: AssetDef): { scene: THREE.Group, animations: THREE.AnimationClip[] } | null {
    const cached = this.modelCache.get(id);
    if (!cached) return null; // Using fallback

    // SkeletonUtils.clone is required for SkinnedMesh, but works for normal meshes too.
    const clonedScene = def.kind === 'character' ? (SkeletonUtils as any).clone(cached.scene) : cached.scene.clone(true);
    // Tag for debugging / visual audit
    clonedScene.userData.assetId = id;
    clonedScene.userData.assetFile = def.file;
    return { scene: clonedScene, animations: cached.animations };
  }

  /** Debug: list of asset ids and whether they loaded (true) or failed (false) */
  getLoadStatus(): Record<string, boolean> {
    const out: Record<string, boolean> = {};
    for (const [id, v] of this.modelCache.entries()) out[id] = !!v;
    return out;
  }

  getAssetSync(id: string): { scene: THREE.Group, animations: THREE.AnimationClip[] } | null {
    const def = AssetManifest[id];
    if (!def) return null;
    return this.cloneCached(id, def);
  }
}
