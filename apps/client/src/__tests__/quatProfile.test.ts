import { describe, it, expect } from 'vitest';
import { QUAT_CLIP_NAMES, QUAT_LOOP, pickQuatClip, pickQuatClipConfig } from '../game/renderer3d/chef/quatProfile';

describe('quatProfile Tests', () => {
  it('QUAT_CLIP_NAMES có đúng 10 khóa', () => {
    const keys = Object.keys(QUAT_CLIP_NAMES);
    expect(keys.length).toBe(10);
    expect(keys).toEqual([
      'idle',
      'walk',
      'run',
      'carry_walk',
      'carry_run',
      'sit',
      'pickup',
      'victory',
      'death',
      'punch',
    ]);
  });

  it('không khóa nào có tiền tố "mixamorig"', () => {
    for (const [key, clipName] of Object.entries(QUAT_CLIP_NAMES)) {
      expect(key.toLowerCase().startsWith('mixamorig')).toBe(false);
      expect(clipName.toLowerCase().startsWith('mixamorig')).toBe(false);
      expect(clipName.startsWith('CharacterArmature|')).toBe(true);
    }
  });

  it('QUAT_LOOP có cùng khóa với QUAT_CLIP_NAMES', () => {
    const clipKeys = Object.keys(QUAT_CLIP_NAMES).sort();
    const loopKeys = Object.keys(QUAT_LOOP).sort();
    expect(loopKeys).toEqual(clipKeys);

    // Kiểm tra lặp / không lặp cụ thể
    expect(QUAT_LOOP.idle).toBe('repeat');
    expect(QUAT_LOOP.walk).toBe('repeat');
    expect(QUAT_LOOP.run).toBe('repeat');
    expect(QUAT_LOOP.carry_walk).toBe('repeat');
    expect(QUAT_LOOP.carry_run).toBe('repeat');
    expect(QUAT_LOOP.sit).toBe('repeat');
    expect(QUAT_LOOP.pickup).toBe('repeat');
    expect(QUAT_LOOP.victory).toBe('once');
    expect(QUAT_LOOP.death).toBe('once');
    expect(QUAT_LOOP.punch).toBe('once');
  });

  it('hàm pickQuatClip nhận actingStation và trả pickup khi cutting hoặc sink', () => {
    expect(pickQuatClip({ actingStation: 'cutting', speed: 0, held: null })).toBe('pickup');
    expect(pickQuatClip({ actingStation: 'sink', speed: 0, held: null })).toBe('pickup');
    expect(pickQuatClip({ actingStation: null, acting: true, speed: 0, held: null })).toBe('idle');
  });

  it('ánh xạ trạng thái qua pickQuatClip trả đúng khóa với 8 tổ hợp đầu vào', () => {
    // 1. dashing -> run
    expect(pickQuatClip({ dashing: true, speed: 0, held: null })).toBe('run');

    // 2. throwTimer > 0 -> punch
    expect(pickQuatClip({ throwTimer: 0.3, speed: 0, held: null })).toBe('punch');

    // 3. cheerTimer > 0 hoặc timeLeft <= 0 -> victory
    expect(pickQuatClip({ cheerTimer: 1.0, speed: 0, held: null })).toBe('victory');
    expect(pickQuatClip({ timeLeft: 0, speed: 0, held: null })).toBe('victory');

    // 4. gần lửa (isNearFire) -> death
    expect(pickQuatClip({ isNearFire: true, speed: 0, held: null })).toBe('death');

    // 5. acting tại thớt (cutting) hoặc bồn (sink) -> pickup
    expect(pickQuatClip({ actingStation: 'cutting', speed: 0, held: null })).toBe('pickup');
    expect(pickQuatClip({ actingStation: 'sink', speed: 0, held: null })).toBe('pickup');

    // 6. di chuyển và cầm đồ (speed > 0.3, held != null) -> carry_run
    expect(pickQuatClip({ speed: 2.0, held: { id: 'tomato' }, maxSpeed: 4.0 })).toBe('carry_run');

    // 7. di chuyển tay không tốc độ cao -> run, tốc độ vừa -> walk
    expect(pickQuatClip({ speed: 3.5, held: null, maxSpeed: 4.0 })).toBe('run');
    expect(pickQuatClip({ speed: 1.5, held: null, maxSpeed: 4.0 })).toBe('walk');

    // 8. đứng yên và cầm đồ (speed <= 0.3, held != null) -> carry_walk
    expect(pickQuatClip({ speed: 0.1, held: { id: 'plate' } })).toBe('carry_walk');

    // 9. đứng yên tay không (speed <= 0.3, held == null) -> idle
    expect(pickQuatClip({ speed: 0, held: null })).toBe('idle');
  });
});
