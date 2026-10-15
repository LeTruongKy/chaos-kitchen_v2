import * as THREE from 'three';
import { AssetDef } from './AssetManifest';
import { toon } from '../renderer3d/materials';
import { TILE_PX } from '@kitchen/core';

export class ModelNormalizer {
  private static materialCache = new Map<string, THREE.MeshStandardMaterial>();

  private static getCachedStandardMaterial(
    key: string,
    opts: THREE.MeshStandardMaterialParameters
  ): THREE.MeshStandardMaterial {
    if (!opts.map) {
      const cached = this.materialCache.get(key);
      if (cached) return cached;
    }
    const mat = new THREE.MeshStandardMaterial(opts);
    mat.userData.isSharedAsset = true;
    if (!opts.map) {
      this.materialCache.set(key, mat);
    }
    return mat;
  }

  static normalize(scene: THREE.Group, def: AssetDef): THREE.Group {
    const meshes: THREE.Mesh[] = [];
    const lightsToRemove: THREE.Light[] = [];

    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        meshes.push(child as THREE.Mesh);
      } else if ((child as THREE.Light).isLight) {
        lightsToRemove.push(child as THREE.Light);
      }
    });

    for (const light of lightsToRemove) {
      if (light.parent) light.parent.remove(light);
    }

    for (const mesh of meshes) {
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      if (mesh.geometry) {
        mesh.geometry.userData.isSharedAsset = true;
      }

      const oldMatArray = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const newMatArray = oldMatArray.map((oldMat: any) => {
        if (!oldMat) return toon(0xffffff);

        let color = 0xffffff;
        let map: THREE.Texture | null = null;
        let useVertexColors = false;

        if (oldMat.color) color = oldMat.color.getHex();
        if (oldMat.map) {
          map = oldMat.map;
          if (map) map.colorSpace = THREE.SRGBColorSpace;
        }
        if (oldMat.vertexColors) useVertexColors = true;

        const matName = String(oldMat.name || '').toLowerCase();
        // Strictly allow emission ONLY on stove burner flame and oven glowing window!
        const isAllowedGlow =
          matName.includes('burner') ||
          matName.includes('flame') ||
          matName.includes('ember') ||
          matName.includes('oven_window') ||
          matName.includes('ovenglow') ||
          matName.includes('glowingwindow');

        if (isAllowedGlow) {
          const emHex = (oldMat.emissive && oldMat.emissive.getHex() > 0) ? oldMat.emissive.getHex() : color;
          return this.getCachedStandardMaterial(`glow_${color}_${emHex}_${useVertexColors}`, {
            color: new THREE.Color(color),
            map,
            vertexColors: useVertexColors,
            roughness: 0.40,
            metalness: 0.05,
            emissive: new THREE.Color(emHex),
            emissiveIntensity: 1.25,
          });
        }

        const isMetalOrInox =
          matName.includes('inox') ||
          matName.includes('steel') ||
          matName.includes('metal') ||
          matName.includes('chrome') ||
          matName.includes('blade') ||
          matName.includes('pot') ||
          matName.includes('sink') ||
          matName.includes('wire') ||
          matName.includes('brass') ||
          matName.includes('copper') ||
          matName.includes('grate') ||
          (typeof oldMat.metalness === 'number' && oldMat.metalness >= 0.15);

        if (isMetalOrInox) {
          return this.getCachedStandardMaterial(`metal_${color}_${useVertexColors}`, {
            color: new THREE.Color(color),
            map,
            vertexColors: useVertexColors,
            roughness: 0.40,
            metalness: 0.25,
            emissive: new THREE.Color(0x000000),
            emissiveIntensity: 0.0,
          });
        }

        // Default Overcooked Soft Stylized Matte Clay / Wood / Food / Porcelain (roughness = 0.80, metalness = 0.05, zero emissive)
        return this.getCachedStandardMaterial(`clay_${color}_${useVertexColors}`, {
          color: new THREE.Color(color),
          map,
          vertexColors: useVertexColors,
          roughness: 0.80,
          metalness: 0.05,
          emissive: new THREE.Color(0x000000),
          emissiveIntensity: 0.0,
        });
      });

      mesh.material = Array.isArray(mesh.material) ? newMatArray : (newMatArray[0] || toon(0xffffff));
    }

    // (a) Tự co giãn về targetSize bằng bounding box
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());

    const unit = def.sizeInTiles ? TILE_PX : 1;
    let scale = 1;
    const scales: number[] = [];

    const isPan = def.file.includes('pan_A');

    if (isPan && def.targetSize.width && size.x > 0) {
      // Scale pan by its circular bowl width (size.x) so the long handle doesn't shrink the pan bowl
      scales.push((def.targetSize.width * unit) / size.x);
    } else if (def.kind === 'station' && def.targetSize.width && def.targetSize.depth) {
      // Scale 1x1 stations strictly by horizontal footprint (X & Z) so tall faucets/arches never shrink the counter
      if (size.x > 0) scales.push((def.targetSize.width * unit) / size.x);
      if (size.z > 0) scales.push((def.targetSize.depth * unit) / size.z);
    } else {
      if (def.targetSize.width && size.x > 0) scales.push((def.targetSize.width * unit) / size.x);
      if (def.targetSize.height && size.y > 0) scales.push((def.targetSize.height * unit) / size.y);
      if (def.targetSize.depth && size.z > 0) scales.push((def.targetSize.depth * unit) / size.z);
      if (def.kind === 'item' && def.targetSize.width) {
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
          scales.push((def.targetSize.width * unit) / maxDim);
        }
      }
    }

    if (scales.length > 0) {
      scale = Math.min(...scales);
    }

    scene.scale.set(scale, scale, scale);
    scene.updateMatrixWorld(true);

    // Recompute bounding box after scale
    const newBox = new THREE.Box3().setFromObject(scene);
    const newCenter = newBox.getCenter(new THREE.Vector3());

    // (b) Đặt pivot và xoay
    const wrapper = new THREE.Group();
    wrapper.add(scene);

    if (isPan) {
      // Keep pan's circular cooking bowl centered at (0, 0) in XZ
      scene.position.set(0, -newBox.min.y, 0);
    } else if (def.pivot === 'bottom') {
      scene.position.set(-newCenter.x, -newBox.min.y, -newCenter.z);
    } else {
      scene.position.set(-newCenter.x, -newCenter.y, -newCenter.z);
    }

    if (def.rotateY) {
      wrapper.rotation.y = def.rotateY;
    }

    return wrapper;
  }
}

