import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { calculateHeldItemScale, applyHeldItemScale } from '../game/renderer3d/chef/carryScale';
import { TILE_PX } from '@kitchen/core';

describe('carryScale', () => {
  describe('calculateHeldItemScale', () => {
    it('calculates correct scale for handBone (FistR parentAccumScale ≈ 30.024)', () => {
      const rawSizePx = 25.6; // 0.4 tile * 64 px
      const parentAccumScale = 30.0239;
      const targetTileSize = 0.35;

      const scale = calculateHeldItemScale(rawSizePx, parentAccumScale, targetTileSize, TILE_PX);

      // (25.6 / 64) * 30.0239 * scale = 0.35
      const resultingWorldTiles = (rawSizePx / TILE_PX) * parentAccumScale * scale;
      expect(resultingWorldTiles).toBeCloseTo(0.35, 4);
      expect(resultingWorldTiles).toBeLessThanOrEqual(0.4);
      expect(scale).toBeCloseTo(0.029143, 4);
    });

    it('calculates correct scale for carryAnchor (parentAccumScale = 1.0)', () => {
      const rawSizePx = 25.6; // 0.4 tile * 64 px
      const parentAccumScale = 1.0;
      const targetTileSize = 0.35;

      const scale = calculateHeldItemScale(rawSizePx, parentAccumScale, targetTileSize, TILE_PX);

      const resultingWorldTiles = (rawSizePx / TILE_PX) * parentAccumScale * scale;
      expect(resultingWorldTiles).toBeCloseTo(0.35, 4);
      expect(resultingWorldTiles).toBeLessThanOrEqual(0.4);
      expect(scale).toBeCloseTo(0.875, 4);
    });

    it('calculates correct scale for tools and plates (targetTileSize = 0.45 <= 0.5)', () => {
      const rawSizePx = 38.4; // 0.6 tile * 64 px
      const parentAccumScale = 30.0239;
      const targetTileSize = 0.45;

      const scale = calculateHeldItemScale(rawSizePx, parentAccumScale, targetTileSize, TILE_PX);

      const resultingWorldTiles = (rawSizePx / TILE_PX) * parentAccumScale * scale;
      expect(resultingWorldTiles).toBeCloseTo(0.45, 4);
      expect(resultingWorldTiles).toBeLessThanOrEqual(0.5);
    });

    it('handles edge cases safely', () => {
      expect(calculateHeldItemScale(0, 30.0)).toBe(1.0);
      expect(calculateHeldItemScale(-5, 30.0)).toBe(1.0);
      expect(calculateHeldItemScale(25.6, 0)).toBe(1.0);
      expect(calculateHeldItemScale(25.6, -10)).toBe(1.0);
    });
  });

  describe('applyHeldItemScale', () => {
    it('applies correct scale to itemModel under high-scale bone hierarchy', () => {
      // Simulating Quaternius chef hierarchy:
      // scene -> chefGroup (scale 1) -> glbGroup (scale 0.300239) -> CharacterArmature (scale 100) -> FistR
      const scene = new THREE.Scene();
      const chefGroup = new THREE.Group();
      scene.add(chefGroup);

      const glbGroup = new THREE.Group();
      glbGroup.scale.setScalar(0.300239);
      chefGroup.add(glbGroup);

      const armature = new THREE.Group();
      armature.scale.set(100, 100, 100);
      glbGroup.add(armature);

      const fistR = new THREE.Bone();
      fistR.name = 'FistR';
      armature.add(fistR);

      // Model with raw size 25.6 px (0.4 tile)
      const itemGeo = new THREE.BoxGeometry(25.6, 20.0, 15.0);
      const itemMesh = new THREE.Mesh(itemGeo, new THREE.MeshBasicMaterial());
      const itemModel = new THREE.Group();
      itemModel.add(itemMesh);
      fistR.add(itemModel);

      scene.updateMatrixWorld(true);

      const appliedScale = applyHeldItemScale(itemModel, fistR, 0.35, TILE_PX);
      expect(appliedScale).toBeGreaterThan(0.02);
      expect(appliedScale).toBeLessThan(0.04);

      // Verify world bounding box
      scene.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(itemModel);
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDimPx = Math.max(size.x, size.y, size.z);
      const maxDimTiles = maxDimPx / TILE_PX;

      expect(maxDimTiles).toBeCloseTo(0.35, 2);
      expect(maxDimTiles).toBeLessThanOrEqual(0.4);
    });

    it('applies correct scale to itemModel under standard carryAnchor (scale 1.0)', () => {
      const scene = new THREE.Scene();
      const chefGroup = new THREE.Group();
      scene.add(chefGroup);

      const carryAnchor = new THREE.Group();
      chefGroup.add(carryAnchor);

      const itemGeo = new THREE.BoxGeometry(25.6, 25.6, 25.6);
      const itemMesh = new THREE.Mesh(itemGeo, new THREE.MeshBasicMaterial());
      const itemModel = new THREE.Group();
      itemModel.add(itemMesh);
      carryAnchor.add(itemModel);

      scene.updateMatrixWorld(true);

      const appliedScale = applyHeldItemScale(itemModel, carryAnchor, 0.35, TILE_PX);
      expect(appliedScale).toBeCloseTo(0.875, 2);

      scene.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(itemModel);
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDimPx = Math.max(size.x, size.y, size.z);
      const maxDimTiles = maxDimPx / TILE_PX;

      expect(maxDimTiles).toBeCloseTo(0.35, 2);
      expect(maxDimTiles).toBeLessThanOrEqual(0.4);
    });
  });
});
