import * as THREE from 'three';

const materialCache = new Map<string, THREE.MeshStandardMaterial>();

export interface ClayMaterialOptions {
  map?: THREE.Texture | null;
  vertexColors?: boolean;
  emissive?: number;
  emissiveIntensity?: number;
  roughness?: number;
  metalness?: number;
  envMapIntensity?: number;
}

/**
 * Overcooked! Soft Stylized Matte Clay / Vinyl PBR Material (có cache)
 * - Đất sét / Gỗ / Thực phẩm / Da / Quần áo: roughness = 0.78, metalness = 0.0, envMapIntensity = 0.6
 * - Inox / Kim loại xước mờ: roughness = 0.32, metalness = 0.35, envMapIntensity = 1.0
 * - Sứ trắng / Nước súp / Nước sốt: roughness = 0.22, metalness = 0.0
 */
export function toon(
  colorHex: number,
  options?: ClayMaterialOptions
): THREE.MeshStandardMaterial {
  const mapKey = options?.map ? options.map.uuid : 'none';
  const vcKey = options?.vertexColors ? 'vc' : 'no-vc';
  const emKey = options?.emissive ? `${options.emissive}-${options.emissiveIntensity ?? 0}` : 'no-em';
  const rKey = (options?.roughness ?? 0.80).toFixed(2);
  const mKey = (options?.metalness ?? 0.05).toFixed(2);
  const cacheKey = `${colorHex}-${mapKey}-${vcKey}-${emKey}-${rKey}-${mKey}`;

  if (materialCache.has(cacheKey)) {
    return materialCache.get(cacheKey)!;
  }
  if (options?.map) {
    options.map.colorSpace = THREE.SRGBColorSpace;
  }

  const roughness = options?.roughness ?? 0.80;
  const metalness = options?.metalness ?? 0.05;

  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(colorHex),
    roughness,
    metalness,
    map: options?.map || null,
    vertexColors: options?.vertexColors || false,
    emissive: options?.emissive !== undefined ? new THREE.Color(options.emissive) : new THREE.Color(0x000000),
    emissiveIntensity: options?.emissiveIntensity !== undefined ? options.emissiveIntensity : 0.0,
  });
  mat.userData.isSharedAsset = true;

  materialCache.set(cacheKey, mat);
  return mat;
}

/**
 * Dọn dẹp bộ nhớ (gọi khi huỷ renderer)
 */
export function clearMaterials(): void {
  for (const mat of materialCache.values()) {
    mat.dispose();
  }
  materialCache.clear();
}

/**
 * Phần 1 Spec: Xóa bỏ hoàn toàn Inverted Hull Outline đen gây bẩn lưới.
 * Trả về trực tiếp mesh gốc (bọc trong Group tương thích kiểu trả về).
 */
export function withOutline(mesh: THREE.Mesh, _thickness: number = 1.0): THREE.Group {
  const group = new THREE.Group();
  group.position.copy(mesh.position);
  group.quaternion.copy(mesh.quaternion);
  group.scale.copy(mesh.scale);

  mesh.position.set(0, 0, 0);
  mesh.quaternion.identity();
  mesh.scale.set(1, 1, 1);
  group.add(mesh);
  return group;
}

