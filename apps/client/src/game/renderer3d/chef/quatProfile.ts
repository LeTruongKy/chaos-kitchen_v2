// Bộ xương Overcooked Chibi (CharacterArmature): Tên clip có tiền tố "CharacterArmature|".
export const QUAT_MODEL_FILE = '/assets/quat/chef_hat.glb';

export const QUAT_CLIP_NAMES = {
  idle: 'CharacterArmature|Idle',
  walk: 'CharacterArmature|Walk',
  run: 'CharacterArmature|Run',
  carry_walk: 'CharacterArmature|Walk_Carry',
  carry_run: 'CharacterArmature|Run_Carry',
  sit: 'CharacterArmature|SitDown',
  pickup: 'CharacterArmature|PickUp',
  victory: 'CharacterArmature|Victory',
  death: 'CharacterArmature|Death',
  punch: 'CharacterArmature|Punch',
} as const;

export type QuatClipKey = keyof typeof QUAT_CLIP_NAMES;

export const QUAT_LOOP: Record<QuatClipKey, 'repeat' | 'once'> = {
  idle: 'repeat', walk: 'repeat', run: 'repeat', carry_walk: 'repeat',
  carry_run: 'repeat', sit: 'repeat', pickup: 'repeat', victory: 'once',
  death: 'once', punch: 'once',
};

export interface ChefStateInput {
  dashing?: boolean;
  sprinting?: boolean;
  throwTimer?: number;
  cheerTimer?: number;
  timeLeft?: number;
  isNearFire?: boolean;
  actingStation?: 'cutting' | 'sink' | null;
  actingCuttingOrSink?: boolean;
  acting?: boolean;
  speed: number;
  held: any;
  maxSpeed?: number;
}

/**
 * Trả về cấu hình clip Quaternius (khóa, lặp, timeScale) theo thứ tự ưu tiên Bước 5.
 */
export function pickQuatClipConfig(input: ChefStateInput): { key: QuatClipKey; loop: 'repeat' | 'once'; timeScale?: number } {
  const maxSpeed = input.maxSpeed || 4.0;

  // 1. dashing hoặc sprinting
  if (input.dashing || input.sprinting) {
    return { key: 'run', loop: 'repeat', timeScale: 1.3 };
  }

  // 2. throwTimer > 0
  if (input.throwTimer && input.throwTimer > 0) {
    return { key: 'punch', loop: 'once' };
  }

  // 3. cheerTimer > 0 hoặc timeLeft <= 0
  if ((input.cheerTimer && input.cheerTimer > 0) || (input.timeLeft !== undefined && input.timeLeft <= 0)) {
    return { key: 'victory', loop: 'once' };
  }

  // 4. gần lửa (isNearFire <= 2)
  if (input.isNearFire) {
    return { key: 'death', loop: 'once' };
  }

  // 5. acting tại thớt (cutting) hoặc bồn (sink)
  if (input.actingStation === 'cutting' || input.actingStation === 'sink' || input.actingCuttingOrSink) {
    return { key: 'pickup', loop: 'repeat' };
  }

  // 6. tốc độ > 0.3 và held != null
  if (input.speed > 0.3 && input.held != null) {
    const rawScale = input.speed / maxSpeed;
    const timeScale = Math.max(0.5, Math.min(1.5, rawScale));
    return { key: 'carry_run', loop: 'repeat', timeScale };
  }

  // 7. tốc độ > 0.3 và held == null
  if (input.speed > 0.3 && input.held == null) {
    const isFast = input.speed > maxSpeed * 0.8;
    return { key: isFast ? 'run' : 'walk', loop: 'repeat' };
  }

  // 8. tốc độ <= 0.3 và held != null
  if (input.speed <= 0.3 && input.held != null) {
    return { key: 'carry_walk', loop: 'repeat', timeScale: 0.0 };
  }

  // 9. còn lại
  return { key: 'idle', loop: 'repeat' };
}

/**
 * Trả về khóa clip Quaternius thuần túy.
 */
export function pickQuatClip(input: ChefStateInput): QuatClipKey {
  return pickQuatClipConfig(input).key;
}

export const resolveQuatClipKey = pickQuatClipConfig;


