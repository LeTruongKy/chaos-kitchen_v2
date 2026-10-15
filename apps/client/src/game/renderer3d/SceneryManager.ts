import * as THREE from 'three';
import { ParsedLevel, TILE_PX } from '@kitchen/core';
import { toon, withOutline } from './materials';
import { ThemePalette } from './themes';

export class SceneryManager {
  private sceneryGroup = new THREE.Group();
  private theme: ThemePalette;

  constructor(scene: THREE.Scene, level: ParsedLevel, theme: ThemePalette) {
    this.theme = theme;
    scene.add(this.sceneryGroup);
    
    this.buildTiles(level);
    this.buildDecorations(level);
  }

  private buildTiles(level: ParsedLevel) {
    for (let y = 0; y < level.height; y++) {
      for (let x = 0; x < level.width; x++) {
        const idx = y * level.width + x;
        const type = level.tiles[idx];
        const px = x * TILE_PX + TILE_PX / 2;
        const pz = y * TILE_PX + TILE_PX / 2;

        if (type === 'pit') {
          // Inner black hole
          const hole = new THREE.Mesh(new THREE.BoxGeometry(TILE_PX * 0.8, TILE_PX * 2, TILE_PX * 0.8), new THREE.MeshBasicMaterial({ color: 0x000000 }));
          hole.position.set(px, -TILE_PX, pz);
          this.sceneryGroup.add(hole);
          
          // Outer rim
          const rim = new THREE.Mesh(new THREE.BoxGeometry(TILE_PX, TILE_PX * 0.2, TILE_PX), toon(0x333333));
          rim.position.set(px, -TILE_PX * 0.1, pz);
          this.sceneryGroup.add(rim);
        }
      }
    }
  }

  private buildDecorations(level: ParsedLevel) {
    const mapW = level.width * TILE_PX;
    const mapH = level.height * TILE_PX;
    const cx = mapW / 2;
    const cz = mapH / 2;

    // Warm wooden stage plinth positioned strictly BELOW the floor tiles (top at Y = -2.2) so it NEVER Z-fights with Y = 0!
    const plinthH = TILE_PX * 0.36;
    const plinthGeo = new THREE.BoxGeometry(mapW + TILE_PX * 0.45, plinthH, mapH + TILE_PX * 0.45);
    const plinthMat = new THREE.MeshStandardMaterial({ color: 0x7c4a27, roughness: 0.80, metalness: 0.05 });
    const plinth = new THREE.Mesh(plinthGeo, plinthMat);
    plinth.position.set(cx, -2.2 - plinthH * 0.5, cz);
    plinth.castShadow = false;
    plinth.receiveShadow = true;
    this.sceneryGroup.add(plinth);
  }

  update(dtSec: number, time: number) {
    for (const child of this.sceneryGroup.children) {
      if (child.userData.isWater && child instanceof THREE.Mesh) {
        const pos = child.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i);
          const y = pos.getY(i);
          pos.setZ(i, Math.sin(x * 0.05 + time * 2) * 10 + Math.cos(y * 0.05 + time) * 10);
        }
        pos.needsUpdate = true;
      }
      if (child.userData.isSpace) {
        child.rotation.y = time * 0.05;
        child.rotation.x = time * 0.02;
      }
    }
  }

  dispose() {
    this.sceneryGroup.parent?.remove(this.sceneryGroup);
  }
}
