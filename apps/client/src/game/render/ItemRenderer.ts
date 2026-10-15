import { Item } from '@kitchen/core';
import { Scene, GameObjects } from 'phaser';

export class ItemRenderer {
  public container: GameObjects.Container;
  private bgGraphics: GameObjects.Graphics;
  private mainText: GameObjects.Text;
  private contentsTexts: GameObjects.Text[] = [];

  constructor(private scene: Scene) {
    this.container = scene.add.container(0, 0);
    this.bgGraphics = scene.add.graphics();
    this.mainText = scene.add.text(0, 0, '', {
      fontSize: '24px',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);
    
    this.container.add(this.bgGraphics);
    this.container.add(this.mainText);
  }

  public update(item: Item | null) {
    this.bgGraphics.clear();
    this.mainText.setText('');
    this.mainText.setScale(1);
    this.mainText.setAlpha(1);
    
    // Clear old plate contents
    for (const t of this.contentsTexts) {
      t.destroy();
    }
    this.contentsTexts = [];

    if (!item) {
      this.container.setVisible(false);
      return;
    }

    this.container.setVisible(true);

    if (item.type === 'ingredient') {
      let emoji = '';
      switch (item.id) {
        case 'tomato': emoji = '🍅'; break;
        case 'lettuce': emoji = '🥬'; break;
        case 'bun': emoji = '🍞'; break;
        case 'meat': emoji = '🥩'; break;
        case 'onion': emoji = '🧅'; break;
        case 'mushroom': emoji = '🍄'; break;
        case 'soup_tomato':
        case 'soup_onion':
        case 'soup_mushroom': emoji = '🥣'; break;
      }
      
      if (item.state === 'chopped') {
        this.mainText.setText(''); // Hide main text
        const offsets: [number, number][] = [[-4, -4], [4, -4], [-4, 4], [4, 4]];
        offsets.forEach(([ox, oy]) => {
          const t = this.scene.add.text(ox, oy, emoji, { fontSize: '12px' }).setOrigin(0.5);
          this.contentsTexts.push(t);
          this.container.add(t);
        });
      } else {
        this.mainText.setText(emoji);
        if (item.state === 'cooked') {
          this.bgGraphics.fillStyle(0x8b4513, 0.6); // Brown bg
          this.bgGraphics.fillCircle(0, 0, 15);
        } else if (item.state === 'burnt') {
          this.mainText.setText(emoji + '💨');
          this.mainText.setAlpha(0.5);
          this.bgGraphics.fillStyle(0x000000, 0.8); // Black bg
          this.bgGraphics.fillCircle(0, 0, 15);
        }
      }
    } else if (item.type === 'plate') {
      if (item.dirty) {
        this.bgGraphics.fillStyle(0xcccccc, 1);
        this.bgGraphics.fillCircle(0, 0, 16);
        this.bgGraphics.fillStyle(0x8b4513, 0.5);
        this.bgGraphics.fillCircle(4, 4, 3);
        this.bgGraphics.fillCircle(-4, -2, 2);
        this.bgGraphics.fillCircle(0, 5, 2);
      } else {
        this.bgGraphics.fillStyle(0xffffff, 1);
        this.bgGraphics.fillCircle(0, 0, 16);
        this.bgGraphics.lineStyle(1, 0xaaaaaa);
        this.bgGraphics.strokeCircle(0, 0, 16);

        // Render contents
        const total = item.contents.length;
        item.contents.forEach((ing, i) => {
          let e = '';
          switch (ing.id) {
            case 'tomato': e = '🍅'; break;
            case 'lettuce': e = '🥬'; break;
            case 'bun': e = '🍞'; break;
            case 'meat': e = '🥩'; break;
            case 'onion': e = '🧅'; break;
            case 'mushroom': e = '🍄'; break;
            case 'soup_tomato':
            case 'soup_onion':
            case 'soup_mushroom': e = '🥣'; break;
          }
          if (ing.state === 'burnt') e = '💨';

          const t = this.scene.add.text(0, 0, e, { fontSize: '12px' }).setOrigin(0.5);
          
          // Arrange in a circle or stacked
          const angle = (i / total) * Math.PI * 2;
          const radius = total > 1 ? 6 : 0;
          t.setPosition(Math.cos(angle) * radius, Math.sin(angle) * radius);
          
          this.contentsTexts.push(t);
          this.container.add(t);
        });
      }
    } else if (item.type === 'tool') {
      let emoji = '';
      if (item.tool === 'pan') emoji = '🍳';
      else if (item.tool === 'pot') emoji = '🥘';
      else if (item.tool === 'extinguisher') emoji = '🧯';

      this.bgGraphics.fillStyle(0x444444, 1);
      this.bgGraphics.fillCircle(0, 0, 16);
      this.mainText.setText(emoji);

      if (item.contents && item.contents.length > 0) {
        const total = item.contents.length;
        item.contents.forEach((ing, i) => {
          let e = '';
          switch (ing.id) {
            case 'tomato': e = '🍅'; break;
            case 'lettuce': e = '🥬'; break;
            case 'bun': e = '🍞'; break;
            case 'meat': e = '🥩'; break;
            case 'onion': e = '🧅'; break;
            case 'mushroom': e = '🍄'; break;
          }
          if (ing.state === 'burnt') e = '💨';

          const t = this.scene.add.text(0, 0, e, { fontSize: '10px' }).setOrigin(0.5);
          const angle = (i / total) * Math.PI * 2;
          const radius = total > 1 ? 8 : 0;
          t.setPosition(Math.cos(angle) * radius, Math.sin(angle) * radius);
          this.contentsTexts.push(t);
          this.container.add(t);
        });
      }
    }
  }

  public setPosition(x: number, y: number) {
    this.container.setPosition(x, y);
  }

  public destroy() {
    this.container.destroy(); // Destroys children too
  }
}
