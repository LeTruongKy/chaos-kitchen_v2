// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { LEVELS, parseLevel, TILE_PX } from '@kitchen/core';
import { ThreeRenderer } from '../game/renderer3d/ThreeRenderer';

function mockTouchMode(enabled: boolean) {
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
    createRadialGradient: () => ({ addColorStop: vi.fn() }),
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
  }) as any;
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: enabled && query.includes('pointer: coarse'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
  if (enabled) {
    (window as any).ontouchstart = null;
  } else {
    delete (window as any).ontouchstart;
  }
}

describe('ThreeRenderer mobile touch camera zoom (1.4x), lerp follow (k=6), clamping & PC fixed camera', () => {
  it('keeps PC (non-touch) camera fixed at original full-map distance', () => {
    mockTouchMode(false);
    const renderer = new ThreeRenderer();
    const parsed = parseLevel(LEVELS[0]!);
    const cam = new THREE.PerspectiveCamera(30, 1366 / 768, 1, 5000);
    (renderer as any).camera = cam;
    (renderer as any).parsedLevel = parsed;

    const mapW = parsed.width * TILE_PX;
    const mapH = parsed.height * TILE_PX;
    renderer.updateCameraForMap(mapW, mapH, 1366, 768);

    const initialPos = cam.position.clone();
    const initialLook = (renderer as any).baseCameraLook.clone();

    renderer.applyFrame({
      timeLeft: 180,
      score: 0,
      streak: 0,
      localPlayerId: 'p1',
      players: [{ id: 'p1', x: 1.5, y: 1.5, fx: 0, fy: 1, held: null, acting: false, colorIndex: 0 } as any],
      stations: [],
      orders: [],
      customers: [],
      projectiles: [],
      targetTile: { tx: -1, ty: -1 },
    });
    renderer.updateCameraFollow(0.1);

    expect((renderer as any).baseCameraPos.x).toBeCloseTo(initialPos.x, 4);
    expect((renderer as any).baseCameraPos.y).toBeCloseTo(initialPos.y, 4);
    expect((renderer as any).baseCameraPos.z).toBeCloseTo(initialPos.z, 4);
    expect((renderer as any).baseCameraLook.x).toBeCloseTo(initialLook.x, 4);
    expect((renderer as any).baseCameraLook.z).toBeCloseTo(initialLook.z, 4);
  });

  it('zooms 1.4x on touch (390x844), lerps with k=6, clamps edges with >=40px margin, and locks axis when map < frame', () => {
    mockTouchMode(true);
    const renderer = new ThreeRenderer();
    const parsed = parseLevel(LEVELS[0]!);
    const cam = new THREE.PerspectiveCamera(30, 390 / 844, 1, 5000);
    (renderer as any).camera = cam;
    (renderer as any).parsedLevel = parsed;

    const mapW = parsed.width * TILE_PX;
    const mapH = parsed.height * TILE_PX;
    renderer.updateCameraForMap(mapW, mapH, 390, 844);

    // Check 1.4x zoom ratio relative to desktop camera distance
    const desktopPos = (renderer as any).desktopCameraPos as THREE.Vector3;
    const desktopLook = (renderer as any).desktopCameraLook as THREE.Vector3;
    const baseDist = desktopPos.distanceTo(desktopLook);
    const touchDist = (renderer as any).currentCameraDist as number;
    expect(baseDist / touchDist).toBeCloseTo(1.4, 3);

    // Visible horizontal tiles on 390px width for level1 (14x9 tiles) at 1.4x zoom is ~10.94 tiles
    const visibleTiles = renderer.getVisibleHorizontalTiles();
    expect(visibleTiles).toBeGreaterThan(10.5);
    expect(visibleTiles).toBeLessThan(11.5);

    // Sudden player teleport to left edge (x = 1.35): 1 frame (dt = 1/60) lerps smoothly (k = 6), never jumps directly
    renderer.applyFrame({
      timeLeft: 180,
      score: 0,
      streak: 0,
      localPlayerId: 'p1',
      players: [{ id: 'p1', x: 1.35, y: 1.35, fx: -1, fy: 0, held: null, acting: false, colorIndex: 0 } as any],
      stations: [],
      orders: [],
      customers: [],
      projectiles: [],
      targetTile: { tx: -1, ty: -1 },
    });

    const beforeX = (renderer as any).currentCameraLook.x;
    renderer.updateCameraFollow(1 / 60);
    const afterOneFrameX = (renderer as any).currentCameraLook.x;
    expect(Math.abs(afterOneFrameX - beforeX)).toBeLessThan(15); // Lerp step, not instant jump

    // Converge after several steps
    for (let i = 0; i < 60; i++) {
      renderer.updateCameraFollow(1 / 30);
    }
    cam.position.copy((renderer as any).baseCameraPos);
    cam.lookAt((renderer as any).baseCameraLook);
    cam.updateMatrixWorld(true);

    // Left edge player screen X should be >= 40px from left border
    const leftPlayerProj = new THREE.Vector3(1.35 * TILE_PX, 0, 1.35 * TILE_PX).project(cam);
    const leftScreenX = (leftPlayerProj.x * 0.5 + 0.5) * 390;
    expect(leftScreenX).toBeGreaterThanOrEqual(40);

    // Z axis is smaller than frame on 390x844 portrait -> camera Z look stays locked at map center (mapH / 2 - 6)
    expect((renderer as any).currentCameraLook.z).toBeCloseTo(mapH / 2 - 6, 3);
  });
});
