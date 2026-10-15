import { describe, it, expect } from 'vitest';
import { pickQuatClip, QuatInput } from '../game/renderer3d/chef/quatPick';
import * as fs from 'fs';
import * as path from 'path';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import * as THREE from 'three';

const baseInput: QuatInput = {
  dashing: false,
  throwing: false,
  victory: false,
  nearFire: false,
  actingStation: null,
  speed: 0,
  holding: false,
  maxSpeed: 2.6,
};

describe('GATE 2 & GATE 3: quatPick & bone tests', () => {
  it('dashing → key "run", timeScale 1.3', () => {
    const res = pickQuatClip({ ...baseInput, dashing: true });
    expect(res.key).toBe('run');
    expect(res.timeScale).toBe(1.3);
    expect(res.once).toBe(false);
  });

  it('throwing → "punch", once true', () => {
    const res = pickQuatClip({ ...baseInput, throwing: true });
    expect(res.key).toBe('punch');
    expect(res.once).toBe(true);
    expect(res.timeScale).toBe(1.0);
  });

  it('victory → "victory", once true', () => {
    const res = pickQuatClip({ ...baseInput, victory: true });
    expect(res.key).toBe('victory');
    expect(res.once).toBe(true);
    expect(res.timeScale).toBe(1.0);
  });

  it('nearFire → "death", once true', () => {
    const res = pickQuatClip({ ...baseInput, nearFire: true });
    expect(res.key).toBe('death');
    expect(res.once).toBe(true);
    expect(res.timeScale).toBe(1.0);
  });

  it('actingStation "cutting" → "pickup"', () => {
    const res = pickQuatClip({ ...baseInput, actingStation: 'cutting' });
    expect(res.key).toBe('pickup');
    expect(res.once).toBe(false);
    expect(res.timeScale).toBe(1.0);
  });

  it('actingStation "sink" → "pickup"', () => {
    const res = pickQuatClip({ ...baseInput, actingStation: 'sink' });
    expect(res.key).toBe('pickup');
    expect(res.once).toBe(false);
    expect(res.timeScale).toBe(1.0);
  });

  it('acting null + speed 0 + holding → "carry_walk", timeScale 0', () => {
    const res = pickQuatClip({ ...baseInput, actingStation: null, speed: 0, holding: true });
    expect(res.key).toBe('carry_walk');
    expect(res.once).toBe(false);
    expect(res.timeScale).toBe(0.0);
  });

  it('speed 3, holding, maxSpeed 2.6 → "carry_run", timeScale = clamp(3/2.6, 0.5, 1.5) = 1.1538461538461537', () => {
    const res = pickQuatClip({ ...baseInput, speed: 3, holding: true, maxSpeed: 2.6 });
    expect(res.key).toBe('carry_run');
    expect(res.timeScale).toBeCloseTo(3 / 2.6, 5);
    expect(res.once).toBe(false);
  });

  it('speed 3, !holding, maxSpeed 2.6 → "run" (vì 3 > 2.08)', () => {
    const res = pickQuatClip({ ...baseInput, speed: 3, holding: false, maxSpeed: 2.6 });
    expect(res.key).toBe('run');
    expect(res.timeScale).toBe(1.0);
    expect(res.once).toBe(false);
  });

  it('speed 1, !holding, maxSpeed 2.6 → "walk"', () => {
    const res = pickQuatClip({ ...baseInput, speed: 1, holding: false, maxSpeed: 2.6 });
    expect(res.key).toBe('walk');
    expect(res.timeScale).toBe(1.0);
    expect(res.once).toBe(false);
  });

  it('GATE 3: tên "FistR" có trong danh sách 32 xương của Chef_Male', () => {
    const filePath = path.resolve(__dirname, '../../public/assets/quat/chef_male.fbx');
    const buf = fs.readFileSync(filePath);
    const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    const loader = new FBXLoader();
    const model = loader.parse(arrayBuffer, '');

    const bones: THREE.Bone[] = [];
    model.traverse((child) => {
      if ((child as any).isBone) {
        bones.push(child as THREE.Bone);
      }
    });

    expect(bones.length).toBe(32);
    const boneNames = bones.map((b) => b.name);
    expect(boneNames).toContain('FistR');
    expect(boneNames).toContain('LowerArmR');
    expect(boneNames).toContain('FootL');
    expect(boneNames).toContain('FootR');
  });
});
