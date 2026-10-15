import { QuatClipKey } from './quatProfile';

export type QuatInput = {
  dashing: boolean;
  throwing: boolean;
  victory: boolean;
  nearFire: boolean;
  actingStation: 'cutting' | 'sink' | null;
  speed: number;
  holding: boolean;
  maxSpeed: number;
};

export type QuatPick = {
  key: QuatClipKey;
  once: boolean;
  timeScale: number;
};

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

/**
 * Hàm THUẦN chọn clip Quaternius theo thứ tự ưu tiên cố định (GATE 2).
 */
export function pickQuatClip(input: QuatInput): QuatPick {
  if (input.dashing) {
    return { key: 'run', once: false, timeScale: 1.3 };
  }
  if (input.throwing) {
    return { key: 'punch', once: true, timeScale: 1.0 };
  }
  if (input.victory) {
    return { key: 'victory', once: true, timeScale: 1.0 };
  }
  if (input.nearFire) {
    return { key: 'death', once: true, timeScale: 1.0 };
  }
  if (input.actingStation !== null) {
    return { key: 'pickup', once: false, timeScale: 1.0 };
  }
  if (input.speed > 0.3 && input.holding) {
    return {
      key: 'carry_run',
      once: false,
      timeScale: clamp(input.speed / input.maxSpeed, 0.5, 1.5)
    };
  }
  if (input.speed > 0.3 && !input.holding) {
    const key = input.speed > input.maxSpeed * 0.8 ? 'run' : 'walk';
    return { key, once: false, timeScale: 1.0 };
  }
  if (input.speed <= 0.3 && input.holding) {
    return { key: 'carry_walk', once: false, timeScale: 0.0 };
  }
  return { key: 'idle', once: false, timeScale: 1.0 };
}
