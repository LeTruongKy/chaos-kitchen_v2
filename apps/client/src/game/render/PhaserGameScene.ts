import Phaser from 'phaser';
import { LevelDef, ParsedLevel, parseLevel, TILE_PX, GameEvent } from '@kitchen/core';
import { MapRenderer } from './MapRenderer';
import { PlayerRenderer } from './PlayerRenderer';
import { StationRenderer } from './StationRenderer';
import { RenderFrame } from './IGameRenderer';
import { sfx } from '../audio/Sfx';
import { appStore } from '../../state/store';

export class PhaserGameScene extends Phaser.Scene {
  private mapRenderer!: MapRenderer;
  private currentLevel?: ParsedLevel;
  
  private playerRenderers: Map<string, PlayerRenderer> = new Map();
  private stationRenderers: Map<string, StationRenderer> = new Map();
  private targetHighlight!: Phaser.GameObjects.Graphics;
  private debugGridGraphics?: Phaser.GameObjects.Graphics;
  private debugGridTexts: Phaser.GameObjects.Text[] = [];
  
  private lastFrame: RenderFrame | null = null;
  private localPlayerId?: string;

  constructor() {
    super({ key: 'PhaserGameScene' });
  }

  create(data: { level: LevelDef }) {
    this.mapRenderer = new MapRenderer(this);
    this.targetHighlight = this.add.graphics();
    this.targetHighlight.setDepth(5);

    this.playerRenderers = new Map();
    this.stationRenderers = new Map();

    if (data.level) {
      this.loadLevel(data.level);
    } else if (this.pendingLevelDef) {
      this.loadLevel(this.pendingLevelDef);
      this.pendingLevelDef = undefined;
    }
    
    this.scale.on('resize', this.layoutCamera, this);
    
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.layoutCamera, this);
      for (const r of this.playerRenderers.values()) r.destroy();
      this.playerRenderers.clear();
      for (const r of this.stationRenderers.values()) r.destroy();
      this.stationRenderers.clear();
      this.mapRenderer?.destroy();
      if (this.debugGridGraphics) {
        this.debugGridGraphics.destroy();
      }
      for (const t of this.debugGridTexts) {
        t.destroy();
      }
      this.debugGridTexts = [];
    });
  }

  public applyFrame(frame: RenderFrame) {
    this.lastFrame = frame;
    this.localPlayerId = frame.localPlayerId;
  }

  public handleEvent(e: GameEvent) {
    let dist = 0; // Default max volume if we don't know position
    
    const localPlayer = this.lastFrame?.players.find(p => p.id === this.localPlayerId);
    
    if (localPlayer) {
      if (e.x !== undefined && e.y !== undefined) {
        const dx = e.x - localPlayer.x;
        const dy = e.y - localPlayer.y;
        dist = Math.sqrt(dx * dx + dy * dy) / 10;
      } else if (e.playerId) {
        const otherPlayer = this.lastFrame?.players.find(p => p.id === e.playerId);
        if (otherPlayer) {
          const dx = otherPlayer.x - localPlayer.x;
          const dy = otherPlayer.y - localPlayer.y;
          dist = Math.sqrt(dx * dx + dy * dy) / 10;
        }
      }
    }
    
    sfx.playEvent(e.type, Math.min(1, dist));

    if (e.type === 'serve_ok' && e.x !== undefined && e.y !== undefined) {
      this.createConfetti(e.x, e.y);
    } else if (e.type === 'burnt' && e.x !== undefined && e.y !== undefined) {
      this.createSmoke(e.x, e.y);
    } else if (e.type === 'chop_done' && e.x !== undefined && e.y !== undefined) {
      this.createLightRay(e.x, e.y);
    } else if (e.type === 'serve_fail' && e.playerId) {
      const r = this.playerRenderers.get(e.playerId);
      if (r) {
        this.tweens.add({
          targets: r.container,
          x: r.container.x + 5,
          yoyo: true,
          repeat: 3,
          duration: 50
        });
      }
    }
  }

  override update(time: number, delta: number) {
    if (!this.lastFrame) return;
    const frame = this.lastFrame;

    const currentIds = new Set(frame.players.map(p => p.id));
    
    for (const [id, renderer] of this.playerRenderers.entries()) {
      if (!currentIds.has(id)) {
        renderer.destroy();
        this.playerRenderers.delete(id);
      }
    }

    const lobbyPlayers = appStore.get().lobby?.players || [];

    for (const p of frame.players) {
      let renderer = this.playerRenderers.get(p.id);
      const isLocal = (this.localPlayerId === p.id);
      if (!renderer) {
        const lp = lobbyPlayers.find(x => x.id === p.id);
        const name = lp ? lp.name : p.name;
        renderer = new PlayerRenderer(this, name, isLocal);
        this.playerRenderers.set(p.id, renderer);
      }
      
      const lp = lobbyPlayers.find(x => x.id === p.id);
      if (lp) renderer.setConnected(lp.connected);

      // Emote is currently unsupported in Frame since it's an event, we'll need to dispatch it from handleEvent or similar if we want.
      // But we removed emote from NetClient so we will ignore it for now or pass it via handleEvent.

      // Map to InterpPlayer format used by PlayerRenderer
      const prState = {
        id: p.id,
        x: p.x,
        y: p.y,
        fx: p.fx,
        fy: p.fy,
        held: p.held,
        acting: p.acting,
        colorIndex: 0 // We can map this from name or lobby if needed
      };
      renderer.update(prState);
      
      const isActiveChef = (frame.activeChefId === p.id) || (this.localPlayerId === p.id && !frame.activeChefId);
      renderer.setHighlight(isActiveChef);
    }

    // Stations
    for (const st of frame.stations) {
      const key = `${st.x},${st.y}`;
      let sr = this.stationRenderers.get(key);
      if (!sr) {
        sr = new StationRenderer(this, st.x, st.y);
        this.stationRenderers.set(key, sr);
      }
      sr.update(st, time);
    }

    // Target Highlight
    this.targetHighlight.clear();
    const tx = frame.targetTile.tx;
    const ty = frame.targetTile.ty;
    if (tx >= 0 && tx < (this.currentLevel?.width || 0) && ty >= 0 && ty < (this.currentLevel?.height || 0)) {
      this.targetHighlight.lineStyle(4, 0xffff00, 0.8);
      this.targetHighlight.strokeRect(tx * TILE_PX, ty * TILE_PX, TILE_PX, TILE_PX);
    }

    // Chop SFX
    for (const p of frame.players) {
      if (p.acting) {
        // Find which tile they are acting on based on direction
        const tx = Math.floor(p.x + p.fx * 0.5);
        const ty = Math.floor(p.y + p.fy * 0.5);
        const st = frame.stations.find(s => s.x === tx && s.y === ty);
        if (st && st.type === 'cutting' && st.progress > 0) {
          let dist = 1;
          const localPlayer = frame.players.find(lp => lp.id === this.localPlayerId);
          if (localPlayer) {
            const dx = p.x - localPlayer.x;
            const dy = p.y - localPlayer.y;
            dist = Math.sqrt(dx * dx + dy * dy) / 10;
          }
          sfx.playChopLoop(Math.min(1, dist));
        }
      }
    }
  }

  private pendingLevelDef?: LevelDef;

  public loadLevel(levelDef: LevelDef) {
    if (!this.mapRenderer) {
      this.pendingLevelDef = levelDef;
      return;
    }
    this.currentLevel = parseLevel(levelDef);
    this.mapRenderer.render(this.currentLevel);
    this.layoutCamera();
    
    const isDebug = new URLSearchParams(window.location.search).has('debug');
    if (isDebug) {
      this.drawDebugGrid();
    }
  }

  private layoutCamera() {
    if (!this.currentLevel) return;
    
    const mapWidth = this.currentLevel.width * TILE_PX;
    const mapHeight = this.currentLevel.height * TILE_PX;
    
    const cam = this.cameras.main;
    const gameWidth = this.scale.width;
    const gameHeight = this.scale.height;
    
    const hudHeight = 64;
    const availableHeight = gameHeight - hudHeight;
    
    const scaleX = gameWidth / mapWidth;
    const scaleY = availableHeight / mapHeight;
    const scale = Math.min(scaleX, scaleY, 1);
    
    cam.setZoom(scale);
    cam.centerOn(mapWidth / 2, mapHeight / 2 - (hudHeight / scale) / 2);
  }

  private drawDebugGrid() {
    if (!this.currentLevel) return;
    if (this.debugGridGraphics) this.debugGridGraphics.destroy();
    for (const t of this.debugGridTexts) t.destroy();
    this.debugGridTexts = [];

    this.debugGridGraphics = this.add.graphics();
    this.debugGridGraphics.lineStyle(1, 0xffffff, 0.3);
    
    for (let y = 0; y <= this.currentLevel.height; y++) {
      this.debugGridGraphics.moveTo(0, y * TILE_PX);
      this.debugGridGraphics.lineTo(this.currentLevel.width * TILE_PX, y * TILE_PX);
    }
    for (let x = 0; x <= this.currentLevel.width; x++) {
      this.debugGridGraphics.moveTo(x * TILE_PX, 0);
      this.debugGridGraphics.lineTo(x * TILE_PX, this.currentLevel.height * TILE_PX);
    }
    this.debugGridGraphics.strokePath();

    for (let y = 0; y < this.currentLevel.height; y++) {
      for (let x = 0; x < this.currentLevel.width; x++) {
        const text = this.add.text(x * TILE_PX + 2, y * TILE_PX + 2, `${x},${y}`, { fontSize: '10px', color: '#fff' }).setAlpha(0.5);
        this.debugGridTexts.push(text);
      }
    }
  }

  private createConfetti(x: number, y: number) {
    if (!this.textures.exists('white_circle')) {
      const g = this.add.graphics();
      g.fillStyle(0xffffff);
      g.fillCircle(4, 4, 4);
      g.generateTexture('white_circle', 8, 8);
      g.destroy();
    }
    const emitter = this.add.particles(x * TILE_PX, y * TILE_PX, 'white_circle', {
      speed: { min: 50, max: 200 },
      angle: { min: 200, max: 340 },
      scale: { start: 0.5, end: 0 },
      tint: [0xff0000, 0x00ff00, 0x0000ff, 0xffff00],
      lifespan: 1000,
      gravityY: 300,
      quantity: 20,
      emitting: false
    });
    emitter.explode();
    this.time.delayedCall(1500, () => emitter.destroy());
  }

  private createSmoke(x: number, y: number) {
    if (!this.textures.exists('smoke_tex')) {
      const g = this.add.graphics();
      g.fillStyle(0x333333, 0.5);
      g.fillCircle(8, 8, 8);
      g.generateTexture('smoke_tex', 16, 16);
      g.destroy();
    }
    const emitter = this.add.particles(x * TILE_PX, y * TILE_PX, 'smoke_tex', {
      speed: { min: 10, max: 30 },
      angle: { min: 250, max: 290 },
      scale: { start: 1, end: 3 },
      alpha: { start: 1, end: 0 },
      lifespan: 2000,
      quantity: 5,
      emitting: false
    });
    emitter.explode();
    this.time.delayedCall(2500, () => emitter.destroy());
  }

  private createLightRay(x: number, y: number) {
    if (!this.textures.exists('ray_tex')) {
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 0.8);
      g.fillRect(0, 0, 4, 20);
      g.generateTexture('ray_tex', 4, 20);
      g.destroy();
    }
    const emitter = this.add.particles(x * TILE_PX, y * TILE_PX, 'ray_tex', {
      speed: { min: 50, max: 150 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0.1 },
      alpha: { start: 1, end: 0 },
      lifespan: 400,
      quantity: 8,
      emitting: false
    });
    emitter.explode();
    this.time.delayedCall(500, () => emitter.destroy());
  }
}
