import type { GameState, GameEvent } from '@kitchen/core';

export interface HintNode {
  id: string;
  text: string;
  target?: { x: number; y: number };
  condition: (snap: GameState, events: GameEvent[], localPlayerId: string) => boolean;
}

export class HintEngine {
  private hints: HintNode[];
  private currentIndex: number = 0;
  private onHintChange: (hint: HintNode | null) => void;

  constructor(hints: HintNode[], onHintChange: (hint: HintNode | null) => void) {
    this.hints = hints;
    this.onHintChange = onHintChange;
    if (this.hints.length > 0) {
      this.onHintChange(this.hints[0] ?? null);
    }
  }

  update(snap: GameState, events: GameEvent[], localPlayerId: string) {
    if (this.isCompleted()) return;

    let advanced = false;
    while (!this.isCompleted()) {
      const current = this.hints[this.currentIndex];
      if (current && current.condition(snap, events, localPlayerId)) {
        this.currentIndex++;
        advanced = true;
      } else {
        break;
      }
    }

    if (advanced) {
      if (this.isCompleted()) {
        this.onHintChange(null);
      } else {
        this.onHintChange(this.hints[this.currentIndex] ?? null);
      }
    }
  }

  isCompleted(): boolean {
    return this.currentIndex >= this.hints.length;
  }
}
