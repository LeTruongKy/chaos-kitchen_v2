import { INPUT_QUEUE_MAX as CORE_INPUT_QUEUE_MAX, PlayerInput } from '@kitchen/core';

export const INPUT_QUEUE_MAX = CORE_INPUT_QUEUE_MAX;

export class InputQueue {
  private queue: PlayerInput[] = [];
  private lastSeq = -1;
  private lastInput: PlayerInput | undefined;

  push(input: PlayerInput) {
    if (input.seq <= this.lastSeq) {
      return;
    }
    this.lastSeq = input.seq;
    if (this.queue.length === INPUT_QUEUE_MAX) this.queue.shift();
    this.queue.push(input);
  }

  next(): PlayerInput | undefined {
    if (this.queue.length > 0) {
      const input = this.queue.shift()!;
      this.lastInput = input;
      return input;
    }
    
    if (this.lastInput) {
      return {
        ...this.lastInput,
        interact: false,
        act: false,
        dash: false,
        throw: false
      };
    }
    
    return undefined;
  }
  
  clear() {
    this.queue = [];
    this.lastSeq = -1;
    this.lastInput = undefined;
  }
}
