import Phaser from 'phaser';
import { ParsedLevel, TileType, StationInit } from '@kitchen/core';
import { THEME } from '../../ui/theme';

export class MapRenderer {
  private container: Phaser.GameObjects.Container | null = null;
  private readonly TILE_PX = 64;

  constructor(private scene: Phaser.Scene) {}

  public render(level: ParsedLevel): void {
    if (this.container) {
      this.container.destroy();
    }

    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(-10);

    const graphics = this.scene.add.graphics();
    this.container.add(graphics);
    
    // Draw tiles
    for (let y = 0; y < level.height; y++) {
      for (let x = 0; x < level.width; x++) {
        const i = y * level.width + x;
        const tile = level.tiles[i]!;
        
        graphics.fillStyle(this.getTileColor(tile, x, y), 1);
        graphics.fillRect(x * this.TILE_PX, y * this.TILE_PX, this.TILE_PX, this.TILE_PX);
      }
    }
    
    // Draw stations text and details
    for (const st of level.stations) {
      const px = st.x * this.TILE_PX + this.TILE_PX / 2;
      const py = st.y * this.TILE_PX + this.TILE_PX / 2;
      
      const text = this.getStationText(st);
      if (text) {
        const textObj = this.scene.add.text(px, py, text, {
          fontSize: '24px', 
          fontFamily: THEME.font, 
          align: 'center'
        });
        textObj.setOrigin(0.5);
        this.container.add(textObj);
      }
    }
  }

  private getTileColor(tile: TileType, x: number, y: number): number {
    const hex = (c: string) => Phaser.Display.Color.HexStringToColor(c).color;
    switch (tile) {
      case 'floor':
        return (x + y) % 2 === 0 ? hex(THEME.map.floor1) : hex(THEME.map.floor2);
      case 'wall':
        return hex(THEME.map.wall);
      case 'table':
        return hex(THEME.map.serve);
      case 'stove':
      case 'oven':
        return hex(THEME.map.stove);
      case 'ice':
        return hex(THEME.map.ice);
      case 'pit':
        return hex(THEME.map.pit);
      default:
        // counters, crates, etc
        return hex(THEME.map.counter);
    }
  }

  private getStationText(st: StationInit): string {
    switch (st.type) {
      case 'crate':
        switch (st.crate) {
          case 'tomato': return THEME.emoji.tomato;
          case 'lettuce': return THEME.emoji.lettuce;
          case 'bun': return THEME.emoji.bun;
          case 'meat': return THEME.emoji.meat;
          case 'dough': return '🌾';
          case 'cheese': return '🧀';
          default: return '';
        }
      case 'cutting': return THEME.emoji.cutting;
      case 'stove': return `${THEME.emoji.fire}\n${THEME.emoji.pan}`;
      case 'oven': return `${THEME.emoji.fire}\n🍕`;
      case 'plate_dispenser': return THEME.emoji.plate;
      case 'table': return THEME.emoji.serve;
      case 'dish_return': return THEME.emoji.return;
      case 'sink': return THEME.emoji.sink;
      case 'trash': return THEME.emoji.trash;
      default: return '';
    }
  }

  public destroy() {
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }
  }
}
