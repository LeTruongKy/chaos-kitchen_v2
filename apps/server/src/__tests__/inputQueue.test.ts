import { describe, it, expect } from 'vitest';
import { InputQueue, INPUT_QUEUE_MAX } from '../rooms/inputQueue.js';
import { PlayerInput } from '@kitchen/core';

describe('InputQueue', () => {
  it('should push and retrieve inputs', () => {
    const queue = new InputQueue();
    const input1: PlayerInput = { seq: 1, mx: 1, my: 0, act: false, interact: false, dash: false, throw: false };
    const input2: PlayerInput = { seq: 2, mx: 0, my: 1, act: true, interact: false, dash: false, throw: false };
    
    queue.push(input1);
    queue.push(input2);

    expect(queue.next()).toEqual(input1);
    expect(queue.next()).toEqual(input2);
  });

  it('should drop old seq inputs', () => {
    const queue = new InputQueue();
    queue.push({ seq: 2, mx: 1, my: 0, act: false, interact: false, dash: false, throw: false });
    // This should be dropped
    queue.push({ seq: 1, mx: 0, my: 1, act: false, interact: false, dash: false, throw: false });
    // This should be dropped (same seq)
    queue.push({ seq: 2, mx: 0, my: 1, act: false, interact: false, dash: false, throw: false });
    
    const nextInput = queue.next();
    expect(nextInput?.seq).toBe(2);
    
    // Rỗng thì trả về input cuối cùng nhưng act/interact = false
    const last = queue.next();
    expect(last?.seq).toBe(2);
    expect(last?.mx).toBe(1);
  });

  it('should repeat last movement with interact=false and act=false when empty', () => {
    const queue = new InputQueue();
    queue.push({ seq: 1, mx: 1, my: -1, act: true, interact: true, dash: false, throw: false });
    
    const first = queue.next();
    expect(first?.interact).toBe(true);
    expect(first?.act).toBe(true);

    const second = queue.next();
    expect(second?.mx).toBe(1);
    expect(second?.my).toBe(-1);
    expect(second?.interact).toBe(false);
    expect(second?.act).toBe(false);
    
    // Vẫn giữ nguyên properties khác
    expect(second?.seq).toBe(1);
  });

  it('should limit queue size to INPUT_QUEUE_MAX', () => {
    const queue = new InputQueue();
    for (let i = 1; i <= INPUT_QUEUE_MAX + 5; i++) {
      queue.push({ seq: i, mx: 0, my: 0, act: false, interact: false, dash: false, throw: false });
    }

    const retained = Array.from({ length: INPUT_QUEUE_MAX }, () => queue.next()?.seq);
    expect(retained).toEqual(
      Array.from({ length: INPUT_QUEUE_MAX }, (_, index) => index + 6),
    );
  });
});
