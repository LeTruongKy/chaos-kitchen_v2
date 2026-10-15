import { PlayerInput } from '@kitchen/core';
import { NetClient } from '../net/NetClient';
import { appStore } from '../state/store';
import { PilotInput } from './TapPilot';

export class InputController {
  private keys: Set<string> = new Set();
  private pendingInteract = false;
  private seq = 0;
  private inputHistory: PlayerInput[] = new Array(120);

  private lastUpdate = performance.now();
  private accumulator = 0;
  private readonly TICK_RATE = 30;
  private readonly TICK_MS = 1000 / 30;

  private cleanupFn?: () => void;

  // Touch state
  private touchActive = false;
  private touchMx = 0;
  private touchMy = 0;
  private touchAct = false;
  private touchDash = false;
  private touchInteractEdge = false; // distinct edge for touch
  private touchThrowEdge = false;

  private pendingThrow = false;

  private touchUI?: HTMLElement;
  private getPilotInput?: () => PilotInput | null;
  private cancelPilot?: () => void;

  constructor(
    private netClient: NetClient,
    private onInput?: (input: PlayerInput) => void
  ) {
    const onKeyDown = (e: KeyboardEvent) => this.handleKeyDown(e);
    const onKeyUp = (e: KeyboardEvent) => this.handleKeyUp(e);
    const onBlur = () => this.handleBlur();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    const isTouchDevice = () => {
      return (
        window.matchMedia('(pointer: coarse)').matches ||
        window.matchMedia('(any-pointer: coarse)').matches ||
        'ontouchstart' in window ||
        (typeof navigator !== 'undefined' && (navigator.maxTouchPoints || 0) > 0)
      );
    };

    if (isTouchDevice()) {
      this.setupTouchControls();
    }

    const checkTouch = () => {
      if (isTouchDevice() && !this.touchUI) {
        this.setupTouchControls();
      }
    };
    const mediaQuery = window.matchMedia('(pointer: coarse)');
    mediaQuery.addEventListener?.('change', checkTouch);
    window.addEventListener('resize', checkTouch);

    this.cleanupFn = () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      mediaQuery.removeEventListener?.('change', checkTouch);
      window.removeEventListener('resize', checkTouch);
      if (this.touchUI && this.touchUI.parentElement) {
        this.touchUI.parentElement.removeChild(this.touchUI);
        this.touchUI = undefined;
      }
    };
  }

  public setPilotProvider(getPilotInput: () => PilotInput | null, cancelPilot: () => void) {
    this.getPilotInput = getPilotInput;
    this.cancelPilot = cancelPilot;
  }

  public update(time: number, delta: number) {
    // Clamp accumulator to avoid bursting hundreds of input packets after frame stalls/freezes
    this.accumulator = Math.min(this.accumulator + delta, this.TICK_MS * 4);

    // Process input at 30Hz
    while (this.accumulator >= this.TICK_MS) {
      this.accumulator -= this.TICK_MS;
      this.sendInputTick();
    }
  }

  private sendInputTick() {
    const state = appStore.get();
    if (state.screen !== 'game' || state.phase !== 'playing') {
      this.pendingInteract = false;
      this.touchInteractEdge = false;
      return;
    }

    let mx = 0;
    let my = 0;

    // Keyboard movement
    const up = this.keys.has('ArrowUp') || this.keys.has('KeyW');
    const down = this.keys.has('ArrowDown') || this.keys.has('KeyS');
    const left = this.keys.has('ArrowLeft') || this.keys.has('KeyA');
    const right = this.keys.has('ArrowRight') || this.keys.has('KeyD');

    if (up && !down) my = -1;
    if (down && !up) my = 1;
    if (left && !right) mx = -1;
    if (right && !left) mx = 1;

    // Touch movement override (if active)
    if (this.touchActive) {
      mx = this.touchMx;
      my = this.touchMy;
    }

    let act = this.keys.has('KeyF') || this.touchAct;
    let interact = this.pendingInteract || this.touchInteractEdge;
    const dash = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.keys.has('KeyK') || this.touchDash;
    const throwAction = this.pendingThrow || this.touchThrowEdge;

    const hasManualControl = mx !== 0 || my !== 0 || act || interact || throwAction;
    if (hasManualControl) {
      this.cancelPilot?.();
    } else if (this.getPilotInput) {
      const pilot = this.getPilotInput();
      if (pilot) {
        mx = pilot.mx;
        my = pilot.my;
        act = pilot.act;
        interact = pilot.interact;
      }
    }

    const input: PlayerInput = {
      seq: ++this.seq,
      mx: mx as -1 | 0 | 1,
      my: my as -1 | 0 | 1,
      act,
      interact,
      dash,
      throw: throwAction
    };

    this.inputHistory[input.seq % 120] = input;
    this.netClient.sendInput(input);
    if (this.onInput) {
      this.onInput(input);
    }

    this.pendingInteract = false;
    this.touchInteractEdge = false;
    this.pendingThrow = false;
    this.touchThrowEdge = false;
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (appStore.get().screen !== 'game') return;

    // Emotes
    if (e.code === 'Digit1') this.netClient.sendEmote(0);
    else if (e.code === 'Digit2') this.netClient.sendEmote(1);
    else if (e.code === 'Digit3') this.netClient.sendEmote(2);
    else if (e.code === 'Digit4') this.netClient.sendEmote(3);

    // Prevent default scrolling for game keys
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.code)) {
      e.preventDefault();
    }

    if (e.code === 'Tab') {
      if (!this.keys.has(e.code)) {
        this.cancelPilot?.();
        this.netClient.sendSwitchChef();
      }
    }

    if (e.code === 'Space' || e.code === 'KeyE') {
      if (!this.keys.has(e.code)) {
        this.pendingInteract = true;
      }
    }

    if (e.code === 'KeyJ' || e.code === 'Enter') {
      if (!this.keys.has(e.code)) {
        this.pendingThrow = true;
      }
    }

    this.keys.add(e.code);
  }

  private handleKeyUp(e: KeyboardEvent) {
    this.keys.delete(e.code);
  }

  private handleBlur() {
    this.keys.clear();
    this.pendingInteract = false;
    this.pendingThrow = false;
    this.touchActive = false;
    this.touchAct = false;
    this.touchDash = false;
    this.touchInteractEdge = false;
    this.touchThrowEdge = false;
    this.touchMx = 0;
    this.touchMy = 0;
  }

  private setupTouchControls() {
    if (this.touchUI) return;
    const gameRoot = document.getElementById('game');
    if (!gameRoot) return;

    const ui = document.createElement('div');
    ui.id = 'touch-controls';
    ui.style.position = 'absolute';
    ui.style.bottom = '0';
    ui.style.left = '0';
    ui.style.width = '100%';
    ui.style.height = '100%';
    ui.style.pointerEvents = 'none'; // Let taps on the 3D scene pass right through to canvas!
    ui.style.zIndex = '100';
    ui.style.fontFamily = "'Segoe UI', 'Nunito', system-ui, -apple-system, sans-serif";

    // Subtle Ready, Set, Cook! Tap-to-Interact guide banner for mobile
    const tapBanner = document.createElement('div');
    tapBanner.textContent = '👆 Chạm vào quầy / bàn để di chuyển & tự động thao tác!';
    tapBanner.style.position = 'absolute';
    tapBanner.style.bottom = '54px';
    tapBanner.style.left = '50%';
    tapBanner.style.transform = 'translateX(-50%)';
    tapBanner.style.background = 'rgba(24, 24, 27, 0.85)';
    tapBanner.style.color = '#fde047';
    tapBanner.style.fontWeight = '800';
    tapBanner.style.fontSize = '11px';
    tapBanner.style.padding = '4px 12px';
    tapBanner.style.borderRadius = '999px';
    tapBanner.style.border = '2px solid #181818';
    tapBanner.style.whiteSpace = 'nowrap';
    tapBanner.style.pointerEvents = 'none';
    tapBanner.style.transition = 'opacity 0.5s ease';
    ui.appendChild(tapBanner);
    setTimeout(() => {
      tapBanner.style.opacity = '0';
    }, 5000);

    // Compact Switch Chef Button (Bottom-Left)
    const btnSwitch = document.createElement('div');
    btnSwitch.textContent = '🔄 Đổi Chef';
    btnSwitch.style.position = 'absolute';
    btnSwitch.style.bottom = '52px';
    btnSwitch.style.left = '14px';
    this.stylePillBtn(btnSwitch, 'linear-gradient(180deg, #ffde59 0%, #f59e0b 100%)', '#181818');

    const triggerSwitch = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      this.cancelPilot?.();
      this.netClient.sendSwitchChef();
      btnSwitch.style.transform = 'scale(0.92)';
      setTimeout(() => { btnSwitch.style.transform = 'scale(1)'; }, 120);
    };
    btnSwitch.addEventListener('pointerdown', triggerSwitch);
    btnSwitch.addEventListener('touchstart', triggerSwitch, { passive: false });
    ui.appendChild(btnSwitch);

    // Compact Sprint / Boost Button (Bottom-Right)
    const btnDash = document.createElement('div');
    btnDash.textContent = '⚡ Tăng tốc';
    btnDash.style.position = 'absolute';
    btnDash.style.bottom = '52px';
    btnDash.style.right = '14px';
    this.stylePillBtn(btnDash, 'linear-gradient(180deg, #38bdf8 0%, #0284c7 100%)', '#ffffff');

    const triggerDash = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      this.touchDash = true;
      btnDash.style.transform = 'scale(0.92)';
    };
    const resetBtnDash = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      this.touchDash = false;
      btnDash.style.transform = 'scale(1)';
    };
    btnDash.addEventListener('pointerdown', triggerDash);
    btnDash.addEventListener('pointerup', resetBtnDash);
    btnDash.addEventListener('pointercancel', resetBtnDash);
    btnDash.addEventListener('pointerleave', resetBtnDash);
    btnDash.addEventListener('touchstart', triggerDash, { passive: false });
    btnDash.addEventListener('touchend', resetBtnDash);
    btnDash.addEventListener('touchcancel', resetBtnDash);
    ui.appendChild(btnDash);

    gameRoot.appendChild(ui);
    this.touchUI = ui;
  }

  private stylePillBtn(el: HTMLElement, bg: string, color: string) {
    el.style.pointerEvents = 'auto';
    el.style.userSelect = 'none';
    el.style.touchAction = 'none';
    el.style.cursor = 'pointer';
    el.style.background = bg;
    el.style.color = color;
    el.style.fontFamily = "'Segoe UI', 'Nunito', system-ui, -apple-system, sans-serif";
    el.style.fontWeight = '800';
    el.style.fontSize = '13px';
    el.style.padding = '8px 14px';
    el.style.borderRadius = '999px';
    el.style.border = '2.5px solid #181818';
    el.style.boxShadow = '0 3px 0 #181818';
    el.style.transition = 'transform 0.1s ease';
  }

  private styleBtn(el: HTMLElement, iconUrl?: string) {
    el.style.width = '70px';
    el.style.height = '70px';
    el.style.pointerEvents = 'auto';
    el.style.userSelect = 'none';
    el.style.touchAction = 'none';
    el.style.cursor = 'pointer';
    el.style.backgroundImage = 'url(/assets/ui/button_circle.png)';
    el.style.backgroundSize = 'contain';
    el.style.backgroundRepeat = 'no-repeat';
    el.style.backgroundPosition = 'center';
    el.style.opacity = '0.8';

    if (iconUrl) {
      const icon = document.createElement('div');
      icon.style.width = '50%';
      icon.style.height = '50%';
      icon.style.position = 'absolute';
      icon.style.top = '25%';
      icon.style.left = '25%';
      icon.style.pointerEvents = 'none';
      icon.style.backgroundImage = `url(${iconUrl})`;
      icon.style.backgroundSize = 'contain';
      icon.style.backgroundRepeat = 'no-repeat';
      icon.style.backgroundPosition = 'center';
      el.appendChild(icon);
    } else {
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.fontWeight = 'bold';
      el.style.fontSize = '12px';
      el.style.textAlign = 'center';
      el.style.color = '#333';
    }
  }

  public destroy() {
    this.cleanupFn?.();
  }

  // Exposed for tests
  public getHistory() {
    return this.inputHistory;
  }
}
