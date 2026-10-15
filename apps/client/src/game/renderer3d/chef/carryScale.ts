import * as THREE from 'three';
import { TILE_PX } from '@kitchen/core';

/**
 * Tính scale cần thiết cho vật cầm để kích thước thế giới đạt ~ targetTileSize (mặc định 0.35 tile).
 *
 * @param rawSizePx Kích thước thô lớn nhất của model vật (tính bằng px/scene units, ví dụ ~0.4 * TILE_PX = 25.6)
 * @param parentAccumScale Hệ số scale tích lũy từ node cha đến gốc scene (ví dụ FistR tích lũy scale ≈ 30.02)
 * @param targetTileSize Kích thước mục tiêu tính theo đơn vị tile (mặc định 0.35 tile)
 * @param tilePx Kích thước 1 tile theo scene (mặc định TILE_PX = 64)
 * @returns Hệ số scale cần đặt trực tiếp lên vật cầm
 */
export function calculateHeldItemScale(
  rawSizePx: number,
  parentAccumScale: number,
  targetTileSize = 0.35,
  tilePx = TILE_PX
): number {
  if (rawSizePx <= 0 || parentAccumScale <= 0) return 1.0;
  // Quy đổi kích thước thô sang tile
  const rawSizeTile = rawSizePx / tilePx;
  // Kích thước thô sau scale cha (tính bằng tile)
  const rawAfterParent = rawSizeTile * parentAccumScale;
  if (rawAfterParent <= 0) return 1.0;
  // Scale cần thiết = 0.35 / kích_thước_thô_sau_scale_cha
  return targetTileSize / rawAfterParent;
}

/**
 * Tính và áp dụng scale cho model vật cầm Three.js dựa trên kích thước thô và node cha.
 */
export function applyHeldItemScale(
  itemModel: THREE.Object3D,
  parent: THREE.Object3D,
  targetTileSize = 0.35,
  tilePx = TILE_PX
): number {
  // 1. Tính scale tích lũy từ parent lên root
  let root: THREE.Object3D = parent;
  while (root.parent) {
    root = root.parent;
  }
  root.updateMatrixWorld(true);
  const parentWorldScale = new THREE.Vector3();
  parent.getWorldScale(parentWorldScale);
  const parentScale = Math.max(parentWorldScale.x, parentWorldScale.y, parentWorldScale.z, 1.0);

  // 2. Đo kích thước thế giới của itemModel khi scale = 1
  const prevScale = itemModel.scale.clone();
  itemModel.scale.set(1, 1, 1);
  itemModel.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(itemModel);
  const size = new THREE.Vector3();
  box.getSize(size);
  const worldSizeAtScale1 = Math.max(size.x, size.y, size.z);
  if (worldSizeAtScale1 <= 0.001) {
    itemModel.scale.copy(prevScale);
    return prevScale.x;
  }

  // Kích thước thô local của vật (trước khi nhân scale cha)
  const rawSizePx = worldSizeAtScale1 / parentScale;

  // 3. Tính scale cần thiết = (kích_thước_chuẩn / kích_thước_thô) / world_scale_của_node_cha
  const scale = calculateHeldItemScale(rawSizePx, parentScale, targetTileSize, tilePx);
  itemModel.scale.setScalar(scale);
  itemModel.updateMatrixWorld(true);
  return scale;
}

