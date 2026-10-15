import Phaser from 'phaser';
import { IGameRenderer, RenderFrame, RendererOptions } from './IGameRenderer';
import { LevelDef, GameEvent } from '@kitchen/core';
import { PhaserGameScene } from './PhaserGameScene';

export class PhaserRenderer implements IGameRenderer {
  private game: Phaser.Game | null = null;
  private scene: PhaserGameScene | null = null;
  private container: HTMLElement | null = null;

  async init(container: HTMLElement, level: LevelDef, opts: RendererOptions): Promise<void> {
    this.container = container;
    this.scene = new PhaserGameScene();

    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: container,
      scale: {
        mode: Phaser.Scale.RESIZE,
        width: '100%',
        height: '100%'
      },
      transparent: true,
      scene: [this.scene]
    });

    // Wait for scene to be ready
    await new Promise<void>((resolve) => {
      if (this.game && this.game.isBooted) {
        resolve();
      } else {
        this.game?.events.once('ready', () => resolve());
      }
    });

    // Initialize level data
    this.scene.loadLevel(level);
  }

  applyFrame(frame: RenderFrame): void {
    if (this.scene) {
      this.scene.applyFrame(frame);
    }
  }

  update(dtSec: number): void {
    // Phaser handles its own update loop internally via requestAnimationFrame.
    // However, we are providing the frame data from our own external loop,
    // so `update` doesn't strictly need to do much unless we want to step Phaser manually,
    // which is not recommended. 
    // The scene will pick up the latest frame automatically in its internal update().
  }

  handleEvent(ev: GameEvent): void {
    if (this.scene) {
      this.scene.handleEvent(ev);
    }
  }

  resize(width: number, height: number, dpr: number): void {
    if (this.game) {
      this.game.scale.resize(width, height);
    }
  }

  setQuality(q: 'low' | 'medium' | 'high'): void {
    // 2D Phaser doesn't really change much based on quality.
    // We could disable antialiasing on low, but it requires re-init.
  }

  dispose(): void {
    if (this.game) {
      this.game.destroy(true);
      this.game = null;
    }
    this.scene = null;
  }
}
