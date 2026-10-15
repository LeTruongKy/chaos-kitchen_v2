import { InterpPlayer } from '../net/SnapshotBuffer';
import { PLAYER_COLORS, PLAYER_RADIUS, TILE_PX } from '@kitchen/core';
import { ItemRenderer } from './ItemRenderer';

export class PlayerRenderer {
  public container: Phaser.GameObjects.Container;
  private body: Phaser.GameObjects.Graphics;
  private nameText: Phaser.GameObjects.Text;
  private highlight: Phaser.GameObjects.Graphics;
  private itemRenderer: ItemRenderer;
  private emoteText: Phaser.GameObjects.Text;
  private emoteTween?: Phaser.Tweens.Tween;
  private distanceMoved: number = 0;
  private prevX: number;
  private prevY: number;
  private isConnected: boolean = true;

  constructor(scene: Phaser.Scene, name: string, isLocal: boolean) {
    this.container = scene.add.container(0, 0);
    this.container.setDepth(10);

    this.highlight = scene.add.graphics();
    this.container.add(this.highlight);

    this.body = scene.add.graphics();
    this.container.add(this.body);

    this.nameText = scene.add.text(0, -TILE_PX * 0.8, name, {
      fontSize: '14px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
      fontFamily: 'monospace'
    });
    this.nameText.setOrigin(0.5, 0.5);
    this.container.add(this.nameText);

    this.itemRenderer = new ItemRenderer(scene);
    this.container.add(this.itemRenderer.container);

    this.emoteText = scene.add.text(0, -TILE_PX * 1.5, '', {
      fontSize: '24px',
    });
    this.emoteText.setOrigin(0.5, 0.5);
    this.emoteText.setAlpha(0);
    this.container.add(this.emoteText);

    if (isLocal) {
      this.setHighlight(true);
    }
    
    this.prevX = -1;
    this.prevY = -1;
  }

  public setHighlight(active: boolean) {
    this.highlight.clear();
    if (active) {
      this.highlight.lineStyle(4, 0xffffff, 0.8);
      this.highlight.strokeCircle(0, 0, PLAYER_RADIUS * TILE_PX + 4);
      
      // Arrow pointing down
      this.highlight.fillStyle(0xffff00, 0.9);
      this.highlight.beginPath();
      this.highlight.moveTo(0, -PLAYER_RADIUS * TILE_PX - 20);
      this.highlight.lineTo(-8, -PLAYER_RADIUS * TILE_PX - 30);
      this.highlight.lineTo(8, -PLAYER_RADIUS * TILE_PX - 30);
      this.highlight.closePath();
      this.highlight.fillPath();
    }
  }

  public update(player: InterpPlayer) {
    if (this.prevX === -1) {
      this.prevX = player.x;
      this.prevY = player.y;
    }

    const dx = player.x - this.prevX;
    const dy = player.y - this.prevY;
    
    if (dx !== 0 || dy !== 0) {
      this.distanceMoved += Math.sqrt(dx * dx + dy * dy);
    } else {
      // Return slowly to rest position if not moving
      this.distanceMoved = 0;
    }
    
    this.prevX = player.x;
    this.prevY = player.y;

    this.container.x = player.x * TILE_PX + TILE_PX / 2;
    this.container.y = player.y * TILE_PX + TILE_PX / 2;

    const bobOffset = dx !== 0 || dy !== 0 ? Math.abs(Math.sin(this.distanceMoved * 10)) * 5 : 0;
    
    this.body.clear();
    const color = player.colorIndex; // Or whatever logic you have for color
    const drawColor = PLAYER_COLORS[color % PLAYER_COLORS.length] ?? 0xffffff;
    
    this.body.fillStyle(drawColor, this.isConnected ? 1 : 0.5);
    // Draw body with bobbing
    this.body.fillCircle(0, -bobOffset, PLAYER_RADIUS * TILE_PX);
    
    // Draw eyes/direction indicator
    const eyeRadius = 4;
    const eyeOffset = PLAYER_RADIUS * TILE_PX * 0.6;
    const ex = player.fx * eyeOffset;
    const ey = player.fy * eyeOffset - bobOffset;
    
    this.body.fillStyle(0x000000);
    this.body.fillCircle(ex, ey, eyeRadius);

    this.itemRenderer.update(player.held);
    // Position the held item slightly in front of the player
    this.itemRenderer.setPosition(player.fx * 20, player.fy * 20 - bobOffset);
  }

  public setConnected(connected: boolean) {
    this.isConnected = connected;
    if (!connected && !this.nameText.text.includes('📶❌')) {
      this.nameText.setText(this.nameText.text + ' 📶❌');
      this.nameText.setAlpha(0.5);
    } else if (connected && this.nameText.text.includes('📶❌')) {
      this.nameText.setText(this.nameText.text.replace(' 📶❌', ''));
      this.nameText.setAlpha(1);
    }
  }

  public showEmote(emoji: string, scene: Phaser.Scene) {
    this.emoteText.setText(emoji);
    this.emoteText.setAlpha(1);
    this.emoteText.setY(-TILE_PX * 1.5);

    if (this.emoteTween) {
      this.emoteTween.stop();
    }

    this.emoteTween = scene.tweens.add({
      targets: this.emoteText,
      y: -TILE_PX * 2,
      alpha: 0,
      duration: 2000,
      ease: 'Power2'
    });
  }

  public destroy() {
    this.container.destroy();
  }
}
