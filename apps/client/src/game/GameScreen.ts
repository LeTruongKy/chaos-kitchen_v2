import { LevelDef, GameEvent, PlayerInput, parseLevel } from '@kitchen/core';
import { NetClient } from '../net/NetClient';
import { IGameRenderer } from './render/IGameRenderer';
import { PhaserRenderer } from './render/PhaserRenderer';
import { FrameBuilder } from './frame/FrameBuilder';
import { getSettings } from '../state/settings';
import { InputController } from './InputController';
import { ThreeRenderer } from './renderer3d/ThreeRenderer';
import { HintEngine, HintNode } from './HintEngine';
import { TUTORIAL_HINTS } from './tutorialHints';
import { TapPilot } from './TapPilot';
import { appStore } from '../state/store';

export class GameScreen {
  private renderer: IGameRenderer | null = null;
  private frameBuilder: FrameBuilder;
  private inputController: InputController;
  private tapPilot: TapPilot;
  private rafId: number = 0;
  private lastTime: number = 0;
  private onSnapshot: (snap: any) => void;
  private onEvent: (ev: GameEvent) => void;
  private onEmote: (ev: { playerId: string; id: 0 | 1 | 2 | 3 }) => void;
  private hintEngine: HintEngine | null = null;
  private hintEl: HTMLElement | null = null;
  private currentHint: HintNode | null = null;
  private gameEvents: GameEvent[] = []; // Store recent events for HintEngine


  constructor(
    private container: HTMLElement,
    private netClient: NetClient,
    private level: LevelDef
  ) {
    this.frameBuilder = new FrameBuilder();
    this.frameBuilder.setLevel(this.level);
    if (this.netClient.sessionId) {
      this.frameBuilder.setLocalPlayerId(this.netClient.sessionId);
    }

    this.tapPilot = new TapPilot();
    this.tapPilot.setLevel(parseLevel(this.level));

    const settings = getSettings();
    const urlParams = new URLSearchParams(window.location.search);
    const rendererType = urlParams.get('r') || '3d';
    
    if (rendererType === '3d') {
      this.renderer = new ThreeRenderer();
    } else {
      this.renderer = new PhaserRenderer();
    }
    
    this.inputController = new InputController(this.netClient, (input) => {
      this.frameBuilder.applyLocalInput(input);
    });

    this.inputController.setPilotProvider(
      () => this.tapPilot.nextInput(this.frameBuilder.buildFrame()),
      () => this.tapPilot.cancel()
    );

    this.container.addEventListener('pointerdown', this.onPointerDown);

    this.onSnapshot = (snap) => {
      this.frameBuilder.onSnapshot(snap, globalThis.performance.now());
      if (this.hintEngine && !this.hintEngine.isCompleted()) {
        const localId = this.netClient.sessionId || '';
        this.hintEngine.update(snap, this.gameEvents, localId);
        this.gameEvents = []; // clear after evaluating
      }
    };
    this.netClient.on('snapshot', this.onSnapshot);

    this.onEvent = (ev: GameEvent) => {
      this.renderer?.handleEvent(ev);
      if (this.hintEngine && !this.hintEngine.isCompleted()) {
        this.gameEvents.push(ev);
      }
    };
    this.netClient.on('event', this.onEvent);

    this.onEmote = (ev) => {
      // We can forward emote to renderer if needed, or handle in HUD
      // Since IGameRenderer doesn't have handleEmote yet, we can wrap it in handleEvent or ignore
    };
    this.netClient.on('emote', this.onEmote);

    this.initRenderer(settings);
    window.addEventListener('resize', this.onResize);

    if (this.level.id === 'tutorial') {
      this.hintEl = document.createElement('div');
      this.hintEl.className = 'tutorial-hint';
      this.hintEl.style.position = 'absolute';
      this.hintEl.style.bottom = '20px';
      this.hintEl.style.left = '50%';
      this.hintEl.style.transform = 'translateX(-50%)';
      this.hintEl.style.background = 'rgba(0,0,0,0.8)';
      this.hintEl.style.color = '#fff';
      this.hintEl.style.padding = '15px 30px';
      this.hintEl.style.borderRadius = '30px';
      this.hintEl.style.fontSize = '20px';
      this.hintEl.style.fontWeight = 'bold';
      this.hintEl.style.pointerEvents = 'none';
      this.hintEl.style.zIndex = '1000';
      this.hintEl.style.textAlign = 'center';
      this.container.appendChild(this.hintEl);

      this.hintEngine = new HintEngine(TUTORIAL_HINTS, (hint) => {
        this.currentHint = hint;
        if (hint && this.hintEl) {
          this.hintEl.textContent = hint.text;
          this.hintEl.style.display = 'block';
        } else if (this.hintEl) {
          this.hintEl.style.display = 'none';
        }
      });
    }
  }

  private onPointerDown = (e: PointerEvent) => {
    const state = appStore.get();
    if (state.screen !== 'game' || state.phase !== 'playing') return;
    if (e.button !== undefined && e.button !== 0) return;

    const targetEl = e.target as HTMLElement | null;
    if (
      targetEl &&
      targetEl.closest(
        'button, .hud-top-bar, .hud-recipe-bar, .rsc-recipe-modal-backdrop, .hud-pause-modal-backdrop, .hud-action-pill-btn, .hud-audio-btn'
      )
    ) {
      return;
    }

    if (this.renderer?.screenToTile) {
      const tile = this.renderer.screenToTile(e.clientX, e.clientY);
      if (tile) {
        const frame = this.frameBuilder.buildFrame();
        this.tapPilot.setTargetTile(tile.tx, tile.ty, frame);
      }
    }
  };

  private async initRenderer(settings: any) {
    if (this.renderer) {
      const loadingEl = document.createElement('div');
      loadingEl.className = 'game-loading-banner';
      loadingEl.textContent = '🍳 Đang chuẩn bị nhà bếp 3D…';
      Object.assign(loadingEl.style, {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'rgba(15, 23, 42, 0.88)',
        color: '#facc15',
        border: '3px solid #18181b',
        borderRadius: '16px',
        padding: '12px 24px',
        fontFamily: "'Nunito', 'Segoe UI', sans-serif",
        fontSize: '1.1rem',
        fontWeight: '900',
        zIndex: '1200',
        pointerEvents: 'none',
        boxShadow: '0 6px 0 #18181b',
      });
      this.container.appendChild(loadingEl);

      try {
        await this.renderer.init(this.container, this.level, {});
      } finally {
        loadingEl.remove();
      }

      if (!this.renderer) return;
      this.renderer.setQuality(settings.quality);
      this.renderer.resize(this.container.clientWidth, this.container.clientHeight, window.devicePixelRatio);
      
      this.lastTime = performance.now();
      this.loop(this.lastTime);
    }
  }

  private loop = (time: number) => {
    this.rafId = requestAnimationFrame(this.loop);
    
    const deltaMs = time - this.lastTime;
    this.lastTime = time;

    this.inputController.update(time, deltaMs);
    this.frameBuilder.updatePredictorDisplay(deltaMs);

    const frame = this.frameBuilder.buildFrame();
    if (frame && this.renderer) {
      if (this.currentHint && this.currentHint.target) {
        frame.hintTarget = this.currentHint.target;
      }
      frame.tapTarget = this.tapPilot.getVisualTarget();
      this.renderer.applyFrame(frame);
    }

    if (this.renderer) {
      this.renderer.update(deltaMs / 1000);
    }
  };

  public changeLevel(level: LevelDef) {
    cancelAnimationFrame(this.rafId);
    this.tapPilot.cancel();
    if (this.renderer) {
      this.renderer.dispose();
    }
    this.level = level;
    this.frameBuilder.setLevel(level);
    this.tapPilot.setLevel(parseLevel(level));
    const urlParams = new URLSearchParams(window.location.search);
    const rendererType = urlParams.get('r') || '3d';
    this.renderer = rendererType === '3d' ? new ThreeRenderer() : new PhaserRenderer();
    void this.initRenderer(getSettings());
  }

  private onResize = () => {
    if (this.renderer) {
      this.renderer.resize(this.container.clientWidth, this.container.clientHeight, window.devicePixelRatio);
    }
  };

  public destroy() {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.onResize);
    this.container.removeEventListener('pointerdown', this.onPointerDown);
    this.netClient.off('snapshot', this.onSnapshot);
    this.netClient.off('event', this.onEvent);
    this.netClient.off('emote', this.onEmote);
    
    this.tapPilot.cancel();
    this.inputController.destroy();
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
    if (this.hintEl) {
      this.hintEl.remove();
      this.hintEl = null;
    }
  }
}
