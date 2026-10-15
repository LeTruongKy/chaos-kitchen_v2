import { StationState, CHOP_TIME, WASH_TIME, COOK_TIME, BURN_TIME, POT_COOK_TIME, POT_BURN_TIME, OVEN_COOK_TIME, OVEN_BURN_TIME, TILE_PX } from '@kitchen/core';
import { Scene, GameObjects } from 'phaser';
import { ItemRenderer } from './ItemRenderer';

export class StationRenderer {
  public container: GameObjects.Container;
  private itemRenderer: ItemRenderer;
  private progressBar: GameObjects.Graphics;
  private textCount: GameObjects.Text;

  constructor(scene: Scene, x: number, y: number) {
    // x, y are tile coordinates. Center of tile is x * TILE_PX + TILE_PX/2
    this.container = scene.add.container(x * TILE_PX + TILE_PX / 2, y * TILE_PX + TILE_PX / 2);
    
    this.itemRenderer = new ItemRenderer(scene);
    this.container.add(this.itemRenderer.container);

    this.progressBar = scene.add.graphics();
    // position progress bar above the tile
    this.progressBar.setPosition(0, -TILE_PX / 2 + 5);
    this.container.add(this.progressBar);

    this.textCount = scene.add.text(0, 0, '', {
      fontSize: '20px',
      fontFamily: 'sans-serif',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);
    this.container.add(this.textCount);
  }

  public update(station: StationState, time: number) {
    this.itemRenderer.update(station.item);
    
    this.progressBar.clear();
    this.textCount.setText('');

    // Draw plate counts
    if (station.type === 'plate_dispenser') {
      this.textCount.setText(`${station.cleanCount}`);
    } else if (station.type === 'dish_return') {
      if (station.dirtyCount > 0 || station.pendingReturns.length > 0) {
        this.textCount.setText(`${station.dirtyCount}`); // or sum of dirty + pending
      }
    } else if (station.type === 'sink') {
      if (station.cleanCount > 0 || station.dirtyCount > 0) {
        this.textCount.setText(`C:${station.cleanCount} D:${station.dirtyCount}`);
      }
    }

    let hasProgress = station.progress > 0;
    if (station.item?.type === 'tool' && station.item.progress > 0) {
      if (station.item.tool === 'pan' && station.item.contents.length === 1 && station.item.contents[0]!.id === 'meat' && station.item.contents[0]!.state !== 'burnt') {
        hasProgress = true;
      }
      if (station.item.tool === 'pot' && station.item.contents.length === 3 && station.item.contents[0]!.state !== 'burnt') {
        hasProgress = true;
      }
    }

    // Draw progress bar
    if (hasProgress) {
      let ratio = 0;
      let color = 0x00ff00;
      let blink = false;

      if (station.type === 'cutting') {
        ratio = Math.min(1, station.progress / CHOP_TIME);
        color = 0x00ff00;
      } else if (station.type === 'sink') {
        ratio = Math.min(1, station.progress / WASH_TIME);
        color = 0x00aaff;
      } else if (station.type === 'stove') {
        if (station.item?.type === 'tool') {
          const tool = station.item;
          if (tool.tool === 'pan' && tool.contents.length === 1 && tool.contents[0]!.id === 'meat') {
            const meat = tool.contents[0]!;
            if (meat.state === 'raw') {
              ratio = Math.min(1, tool.progress / COOK_TIME);
              color = 0xffa500; // Orange
            } else if (meat.state === 'cooked') {
              ratio = Math.min(1, Math.max(0, (tool.progress - COOK_TIME)) / BURN_TIME);
              color = 0xff0000; // Red
              if (tool.progress > COOK_TIME + BURN_TIME - 2) {
                blink = true;
              }
            }
          } else if (tool.tool === 'pot' && tool.contents.length === 3) {
            if (tool.contents[0]!.state !== 'burnt') {
              if (tool.progress < POT_COOK_TIME) {
                ratio = Math.min(1, tool.progress / POT_COOK_TIME);
                color = 0xffa500;
              } else {
                ratio = Math.min(1, Math.max(0, tool.progress - POT_COOK_TIME) / POT_BURN_TIME);
                color = 0xff0000;
                if (tool.progress > POT_COOK_TIME + POT_BURN_TIME - 2) {
                  blink = true;
                }
              }
            }
          }
        }
      } else if (station.type === 'oven') {
        if (station.item?.type === 'ingredient' && station.item.id === 'pizza') {
          const pizza = station.item;
          if (pizza.state === 'raw') {
            ratio = Math.min(1, station.progress / OVEN_COOK_TIME);
            color = 0xffa500;
          } else if (pizza.state === 'cooked') {
            ratio = Math.min(1, Math.max(0, station.progress - OVEN_COOK_TIME) / OVEN_BURN_TIME);
            color = 0xff0000;
            if (station.progress > OVEN_COOK_TIME + OVEN_BURN_TIME - 2) {
              blink = true;
            }
          }
        }
      }

      if (ratio > 0) {
        if (!blink || (Math.floor(time / 200) % 2 === 0)) {
          const w = 40;
          const h = 8;
          this.progressBar.fillStyle(0x000000, 0.5);
          this.progressBar.fillRect(-w/2, -h/2, w, h);
          this.progressBar.fillStyle(color, 1);
          this.progressBar.fillRect(-w/2, -h/2, w * ratio, h);
          this.progressBar.lineStyle(1, 0xffffff);
          this.progressBar.strokeRect(-w/2, -h/2, w, h);
        }
      }
    }
  }

  public destroy() {
    this.container.destroy();
  }
}
