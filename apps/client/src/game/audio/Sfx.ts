import { getSettings, subscribe } from '../../state/settings';
import { audioManager } from './AudioManager';

export class Sfx {
  private ctx?: AudioContext;
  private isMuted: boolean = false;
  private nextNoteTime: number = 0;
  private isPlayingBgm: boolean = false;
  private bgmTimer?: number;

  private isPlayingMenuMusic: boolean = false;
  private menuMusicTimer?: number;
  private menuNoteIndex: number = 0;
  private nextMenuNoteTime: number = 0;
  private menuMelody = [
    261.63, 329.63, 392.00, 523.25, // C4, E4, G4, C5
    440.00, 392.00, 329.63, 293.66  // A4, G4, E4, D4
  ];

  private state: '0' | '1' | '2' = '1'; // '0': muted, '1': all on, '2': sfx only

  constructor() {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('ck_sound') : null;
    if (saved === '0' || saved === '1' || saved === '2') {
      this.state = saved;
    } else {
      this.state = '1'; // Default: SFX and BGM on
    }

    subscribe((settings) => {
      if (this.isPlayingMenuMusic) {
        if (settings.music <= 0 || settings.master <= 0) {
          this.stopMenuMusicNotes();
        } else if (!this.menuMusicTimer) {
          this.playMenuMusic();
        }
      }
    });
  }

  public get currentState() {
    return this.state;
  }

  public toggleMute() {
    if (this.state === '2') {
      this.state = '1';
    } else if (this.state === '1') {
      this.state = '0';
    } else {
      this.state = '2';
    }
    
    localStorage.setItem('ck_sound', this.state);
    
    if (this.state === '0' || this.state === '2') {
      this.stopBgm();
    } else if (this.state === '1' && this.isPlayingBgm) {
      this.playBgm();
    }
    
    return this.state;
  }

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    audioManager.setSharedContext(this.ctx);
  }

  private eventTimes: Map<string, number[]> = new Map();

  public isSfxEnabled(): boolean {
    if (this.state === '0') return false;
    const settings = getSettings();
    if (settings.sfx <= 0 || settings.master <= 0) return false;
    return true;
  }

  public canPlay(key: string, now: number): boolean {
    const windowSec = 0.2; // 200 ms
    const maxConcurrent = 3;
    let times = this.eventTimes.get(key) || [];
    times = times.filter(t => t > now - windowSec);
    if (times.length >= maxConcurrent) {
      return false;
    }
    times.push(now);
    this.eventTimes.set(key, times);
    return true;
  }

  public getEffectiveVolume(distanceFactor: number = 0): number {
    const settings = getSettings();
    const sfxVol = (settings.sfx / 100) * (settings.master / 100);
    const distVol = Math.max(0.3, 1 - distanceFactor);
    return distVol * sfxVol;
  }

  public playIgnite(distanceFactor: number = 0): void {
    if (!this.isSfxEnabled()) return;
    this.initCtx();
    const ctx = this.ctx!;
    const now = (typeof ctx.currentTime === 'number') ? ctx.currentTime : performance.now() / 1000;
    if (!this.canPlay('ignite', now)) return;

    const vol = this.getEffectiveVolume(distanceFactor);
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sawtooth';
    // Loop 1 (0 to 0.2s): 300 -> 600 Hz
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.linearRampToValueAtTime(600, now + 0.2);
    // Loop 2 (0.2 to 0.4s): 300 -> 600 Hz
    osc.frequency.setValueAtTime(300, now + 0.2);
    osc.frequency.linearRampToValueAtTime(600, now + 0.4);

    gainNode.gain.setValueAtTime(vol * 0.8, now);
    gainNode.gain.linearRampToValueAtTime(0.01, now + 0.4);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  public playExtinguish(distanceFactor: number = 0): void {
    if (!this.isSfxEnabled()) return;
    this.initCtx();
    const ctx = this.ctx!;
    const now = (typeof ctx.currentTime === 'number') ? ctx.currentTime : performance.now() / 1000;
    if (!this.canPlay('extinguish', now)) return;

    const vol = this.getEffectiveVolume(distanceFactor);
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(vol * 0.7, now);
    gainNode.gain.linearRampToValueAtTime(0.01, now + 0.4);
    gainNode.connect(ctx.destination);

    if (ctx.createBuffer && ctx.createBufferSource) {
      try {
        const sampleRate = ctx.sampleRate || 44100;
        const bufferSize = Math.floor(sampleRate * 0.4);
        const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const source = ctx.createBufferSource();
        source.buffer = buffer;

        if (ctx.createBiquadFilter) {
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(450, now);
          filter.frequency.linearRampToValueAtTime(150, now + 0.4);
          source.connect(filter);
          filter.connect(gainNode);
        } else {
          source.connect(gainNode);
        }
        source.start(now);
        source.stop(now + 0.4);
        return;
      } catch {
        // Fallback below
      }
    }

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(80, now + 0.4);
    osc.connect(gainNode);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  public playThrow(distanceFactor: number = 0): void {
    if (!this.isSfxEnabled()) return;
    this.initCtx();
    const ctx = this.ctx!;
    const now = (typeof ctx.currentTime === 'number') ? ctx.currentTime : performance.now() / 1000;
    if (!this.canPlay('throw', now)) return;

    const vol = this.getEffectiveVolume(distanceFactor);
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(700, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.15);

    gainNode.gain.setValueAtTime(vol * 0.6, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playCustomerLeaveServed(distanceFactor: number = 0): void {
    if (!this.isSfxEnabled()) return;
    this.initCtx();
    const ctx = this.ctx!;
    const now = (typeof ctx.currentTime === 'number') ? ctx.currentTime : performance.now() / 1000;
    if (!this.canPlay('customer_leave_served', now)) return;

    const vol = this.getEffectiveVolume(distanceFactor);
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.setValueAtTime(659.25, now + 0.2); // E5

    gainNode.gain.setValueAtTime(vol * 0.5, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  public playCustomerLeaveExpired(distanceFactor: number = 0): void {
    if (!this.isSfxEnabled()) return;
    this.initCtx();
    const ctx = this.ctx!;
    const now = (typeof ctx.currentTime === 'number') ? ctx.currentTime : performance.now() / 1000;
    if (!this.canPlay('customer_leave_expired', now)) return;

    const vol = this.getEffectiveVolume(distanceFactor);
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now); // A4
    osc.frequency.setValueAtTime(311.13, now + 0.25); // Eb4

    gainNode.gain.setValueAtTime(vol * 0.6, now);
    gainNode.gain.linearRampToValueAtTime(0.01, now + 0.5);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.5);
  }

  public playStreakUp(streak: number = 1, distanceFactor: number = 0): void {
    if (!this.isSfxEnabled()) return;
    this.initCtx();
    const ctx = this.ctx!;
    const now = (typeof ctx.currentTime === 'number') ? ctx.currentTime : performance.now() / 1000;
    if (!this.canPlay('streak_up', now)) return;

    const vol = this.getEffectiveVolume(distanceFactor);
    const streakLevels = [880, 1046.50, 1318.51, 1567.98]; // A5, C6, E6, G6
    const levelIdx = Math.min(3, Math.max(0, (streak || 1) - 1));
    const freq = streakLevels[levelIdx]!;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    gainNode.gain.setValueAtTime(vol * 0.6, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playStreakLost(distanceFactor: number = 0): void {
    if (!this.isSfxEnabled()) return;
    this.initCtx();
    const ctx = this.ctx!;
    const now = (typeof ctx.currentTime === 'number') ? ctx.currentTime : performance.now() / 1000;
    if (!this.canPlay('streak_lost', now)) return;

    const vol = this.getEffectiveVolume(distanceFactor);
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.linearRampToValueAtTime(80, now + 0.3);

    gainNode.gain.setValueAtTime(vol * 0.7, now);
    gainNode.gain.linearRampToValueAtTime(0.01, now + 0.3);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playOvenDone(distanceFactor: number = 0): void {
    if (!this.isSfxEnabled()) return;
    this.initCtx();
    const ctx = this.ctx!;
    const now = (typeof ctx.currentTime === 'number') ? ctx.currentTime : performance.now() / 1000;
    if (!this.canPlay('oven_done', now)) return;

    const vol = this.getEffectiveVolume(distanceFactor);
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);

    gainNode.gain.setValueAtTime(vol * 0.6, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  public playPizzaBurnt(distanceFactor: number = 0): void {
    if (!this.isSfxEnabled()) return;
    this.initCtx();
    const ctx = this.ctx!;
    const now = (typeof ctx.currentTime === 'number') ? ctx.currentTime : performance.now() / 1000;
    if (!this.canPlay('pizza_burnt', now)) return;

    const vol = this.getEffectiveVolume(distanceFactor);
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, now);

    gainNode.gain.setValueAtTime(vol * 0.8, now);
    gainNode.gain.linearRampToValueAtTime(0.01, now + 0.5);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.5);
  }

  public playPotDone(distanceFactor: number = 0): void {
    if (!this.isSfxEnabled()) return;
    this.initCtx();
    const ctx = this.ctx!;
    const now = (typeof ctx.currentTime === 'number') ? ctx.currentTime : performance.now() / 1000;
    if (!this.canPlay('pot_done', now)) return;

    const vol = this.getEffectiveVolume(distanceFactor);
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, now);

    gainNode.gain.setValueAtTime(vol * 0.5, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playSoupBurnt(distanceFactor: number = 0): void {
    if (!this.isSfxEnabled()) return;
    this.initCtx();
    const ctx = this.ctx!;
    const now = (typeof ctx.currentTime === 'number') ? ctx.currentTime : performance.now() / 1000;
    if (!this.canPlay('soup_burnt', now)) return;

    const vol = this.getEffectiveVolume(distanceFactor);
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(110, now);

    gainNode.gain.setValueAtTime(vol * 0.7, now);
    gainNode.gain.linearRampToValueAtTime(0.01, now + 0.5);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.5);
  }

  public playPickup(distanceFactor: number = 0): void {
    if (!this.isSfxEnabled()) return;
    this.initCtx();
    const ctx = this.ctx!;
    const now = (typeof ctx.currentTime === 'number') ? ctx.currentTime : performance.now() / 1000;
    if (!this.canPlay('pickup', now)) return;

    // Ưu tiên phát ngẫu nhiên file âm thanh va chạm ngắn gọn từ gói Impact của Kenney
    if (audioManager.playPickup(distanceFactor)) {
      return;
    }

    // Fallback tạo âm bằng Web Audio nếu file âm thanh chưa tải xong
    const vol = this.getEffectiveVolume(distanceFactor);
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(360, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.065);
    gainNode.gain.setValueAtTime(vol * 0.55, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.065);
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.065);
  }

  public playDrop(distanceFactor: number = 0): void {
    if (!this.isSfxEnabled()) return;
    this.initCtx();
    const ctx = this.ctx!;
    const now = (typeof ctx.currentTime === 'number') ? ctx.currentTime : performance.now() / 1000;
    if (!this.canPlay('drop', now)) return;

    // Ưu tiên phát ngẫu nhiên file âm thanh đặt đồ từ gói Impact của Kenney
    if (audioManager.playDrop(distanceFactor)) {
      return;
    }

    // Fallback tạo âm bằng Web Audio nếu file âm thanh chưa tải xong
    const vol = this.getEffectiveVolume(distanceFactor);
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(170, now + 0.065);
    gainNode.gain.setValueAtTime(vol * 0.55, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.065);
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.065);
  }

  public playUiClick(variant: 'click' | 'select' | 'toggle' | 'back' | 'confirm' | 'error' = 'click'): void {
    if (!this.isSfxEnabled()) return;
    this.initCtx();
    if (audioManager.playUiClick(variant)) {
      return;
    }
    const ctx = this.ctx!;
    const now = (typeof ctx.currentTime === 'number') ? ctx.currentTime : performance.now() / 1000;
    if (!this.canPlay('ui_click', now)) return;

    const vol = this.getEffectiveVolume(0) * 0.45;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(variant === 'back' ? 420 : 680, now);
    osc.frequency.exponentialRampToValueAtTime(variant === 'back' ? 320 : 880, now + 0.045);
    gainNode.gain.setValueAtTime(vol, now);
    gainNode.gain.exponentialRampToValueAtTime(0.008, now + 0.045);
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.045);
  }

  public playEvent(eventName: string, distanceFactor: number = 1, payload?: any) {
    if (!this.isSfxEnabled()) return;

    // Dispatch to dedicated methods for new Phase 6 events & Kenney Impact/Interface events
    switch (eventName) {
      case 'pickup':
        this.playPickup(distanceFactor);
        return;
      case 'drop':
      case 'trash':
        this.playDrop(distanceFactor);
        return;
      case 'ui_click':
        this.playUiClick('click');
        return;
      case 'ignite':
        this.playIgnite(distanceFactor);
        return;
      case 'extinguish':
        this.playExtinguish(distanceFactor);
        return;
      case 'throw':
        this.playThrow(distanceFactor);
        return;
      case 'customer_leave': {
        const reason = (typeof payload === 'string') ? payload : payload?.reason;
        if (reason === 'served') {
          this.playCustomerLeaveServed(distanceFactor);
        } else {
          this.playCustomerLeaveExpired(distanceFactor);
        }
        return;
      }
      case 'streak_up':
        this.playStreakUp(payload?.streak ?? 1, distanceFactor);
        return;
      case 'streak_lost':
        this.playStreakLost(distanceFactor);
        return;
      case 'oven_done':
        this.playOvenDone(distanceFactor);
        return;
      case 'pizza_burnt':
        this.playPizzaBurnt(distanceFactor);
        return;
      case 'pot_done':
        this.playPotDone(distanceFactor);
        return;
      case 'soup_burnt':
        this.playSoupBurnt(distanceFactor);
        return;
    }

    this.initCtx();
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    if (!this.canPlay(eventName, now)) return;

    const vol = this.getEffectiveVolume(distanceFactor);
    const gainNode = ctx.createGain();
    gainNode.gain.value = vol;
    gainNode.connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.connect(gainNode);

    switch (eventName) {
      case 'chop_done':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(920, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.11);
        gainNode.gain.setValueAtTime(vol * 0.85, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.11);
        osc.start(now);
        osc.stop(now + 0.11);
        break;
      case 'cook_done': {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, now); // E5
        osc.frequency.setValueAtTime(880, now + 0.11); // A5
        gainNode.gain.setValueAtTime(vol * 0.7, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.45);
        break;
      }
      case 'burnt':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.linearRampToValueAtTime(80, now + 0.5);
        gainNode.gain.setValueAtTime(vol * 0.7, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
      case 'serve_ok': {
        // Restaurant service bell + coin register arpeggio
        const freqs = [523.25, 659.25, 783.99, 1046.50];
        freqs.forEach((f, idx) => {
          const o = ctx.createOscillator();
          o.type = 'sine';
          o.frequency.value = f;
          const g = ctx.createGain();
          const t0 = now + idx * 0.045;
          g.gain.setValueAtTime(vol * 0.35, t0);
          g.gain.exponentialRampToValueAtTime(0.008, t0 + 0.55);
          o.connect(g);
          g.connect(ctx.destination);
          o.start(t0);
          o.stop(t0 + 0.55);
        });
        osc.disconnect();
        break;
      }
      case 'serve_fail':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.linearRampToValueAtTime(110, now + 0.3);
        gainNode.gain.setValueAtTime(vol * 0.8, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      case 'customer_spawn':
      case 'customer_order':
      case 'order_new':
        // Crisp desk service bell "Ding!"
        osc.type = 'sine';
        osc.frequency.setValueAtTime(eventName === 'customer_spawn' ? 987.77 : 1174.66, now); // B5 / D6
        gainNode.gain.setValueAtTime(vol * 0.55, now);
        gainNode.gain.exponentialRampToValueAtTime(0.008, now + 0.38);
        osc.start(now);
        osc.stop(now + 0.38);
        break;
      case 'wash_done':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880.0, now + 0.08); // A5
        gainNode.gain.setValueAtTime(vol * 0.65, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.26);
        osc.start(now);
        osc.stop(now + 0.26);
        break;
      case 'countdown_tick':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now); // A4
        gainNode.gain.setValueAtTime(vol, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      case 'countdown_go':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now); // A5
        gainNode.gain.setValueAtTime(vol, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
        break;
      case 'timeup':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, now); // A3
        gainNode.gain.setValueAtTime(vol, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 1.0);
        osc.start(now);
        osc.stop(now + 1.0);
        break;
      default:
        osc.disconnect();
        break;
    }
  }

  public playGameEvent(ev: { type: string; [key: string]: any }, distanceFactor: number = 1) {
    this.playEvent(ev.type, distanceFactor, ev);
  }

  private nextChopTime = 0;
  private nextSizzleTime = 0;
  private nextAlarmTime = 0;
  private alarmToggle = false;

  public playChopLoop(distanceFactor: number = 0.2) {
    if (!this.isSfxEnabled()) return;
    this.initCtx();
    const ctx = this.ctx!;
    const now = (typeof ctx.currentTime === 'number') ? ctx.currentTime : performance.now() / 1000;
    
    if (now < this.nextChopTime) return;
    this.nextChopTime = now + 0.16; // 160ms rhythmic knife chop

    if (audioManager.playRandom('chop', distanceFactor, 120)) {
      return;
    }

    const vol = this.getEffectiveVolume(distanceFactor);

    // 1. Crisp wooden cutting board thud
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(680, now);
    osc.frequency.exponentialRampToValueAtTime(115, now + 0.055);
    
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(vol * 0.65, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.055);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  private sizzleNoiseBuffer?: AudioBuffer;

  /**
   * Tiếng xèo xèo (sizzle) khi thịt đang rán trên chảo hoặc súp đang sôi trên bếp
   */
  public playSizzleLoop(distanceFactor: number = 0.3) {
    if (!this.isSfxEnabled()) return;
    this.initCtx();
    const ctx = this.ctx!;
    const now = (typeof ctx.currentTime === 'number') ? ctx.currentTime : performance.now() / 1000;

    if (now < this.nextSizzleTime) return;
    this.nextSizzleTime = now + 0.18;

    const vol = this.getEffectiveVolume(distanceFactor) * 0.28;
    if (vol <= 0.005) return;

    if (ctx.createBuffer && ctx.createBufferSource) {
      try {
        const dur = 0.16;
        if (!this.sizzleNoiseBuffer) {
          const sampleRate = ctx.sampleRate || 44100;
          const bufferSize = Math.floor(sampleRate * dur);
          const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (0.6 + 0.4 * Math.random());
          }
          this.sizzleNoiseBuffer = buffer;
        }
        const source = ctx.createBufferSource();
        source.buffer = this.sizzleNoiseBuffer;

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(vol, now);
        gainNode.gain.exponentialRampToValueAtTime(0.005, now + dur);
        gainNode.connect(ctx.destination);

        if (ctx.createBiquadFilter) {
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(2800 + Math.random() * 900, now);
          filter.Q.setValueAtTime(1.4, now);
          source.connect(filter);
          filter.connect(gainNode);
        } else {
          source.connect(gainNode);
        }
        source.start(now);
        source.stop(now + dur);
      } catch {
        // Ignore in headless/mock context
      }
    }
  }

  /**
   * Tiếng còi báo động khẩn cấp khi có bếp bốc cháy
   */
  public playFireAlarmLoop(distanceFactor: number = 0.1) {
    if (!this.isSfxEnabled()) return;
    this.initCtx();
    const ctx = this.ctx!;
    const now = (typeof ctx.currentTime === 'number') ? ctx.currentTime : performance.now() / 1000;

    if (now < this.nextAlarmTime) return;
    this.nextAlarmTime = now + 0.36;
    this.alarmToggle = !this.alarmToggle;

    const vol = this.getEffectiveVolume(distanceFactor) * 0.42;
    if (vol <= 0.005) return;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = 'triangle';
    const freq = this.alarmToggle ? 880 : 660;
    osc.frequency.setValueAtTime(freq, now);

    gainNode.gain.setValueAtTime(vol, now);
    gainNode.gain.exponentialRampToValueAtTime(0.008, now + 0.24);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  /**
   * Tiếng chuông ngôi sao bay vào ở màn hình Tổng kết 3 Sao
   */
  public playStarEarned(starIndex: number = 0) {
    if (!this.isSfxEnabled()) return;
    this.initCtx();
    const ctx = this.ctx!;
    const now = (typeof ctx.currentTime === 'number') ? ctx.currentTime : performance.now() / 1000;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const freq = notes[Math.min(notes.length - 1, Math.max(0, starIndex))] ?? 523.25;
    const vol = this.getEffectiveVolume(0) * 0.65;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.02, now + 0.35);

    gainNode.gain.setValueAtTime(vol, now);
    gainNode.gain.exponentialRampToValueAtTime(0.008, now + 0.38);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.38);
  }

  public playBgm() {
    this.isPlayingBgm = true;
    if (this.state !== '1') return;
    const settings = getSettings();
    if (settings.music <= 0 || settings.master <= 0) return;
    this.initCtx();
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = undefined;
    }
    this.nextNoteTime = this.ctx!.currentTime + 0.08;
    this.scheduleBgmNotes();
  }

  public stopBgm() {
    this.isPlayingBgm = false;
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = undefined;
    }
  }

  public setFastBgm(isFast: boolean) {
    this.bgmSpeedMultiplier = isFast ? 1.38 : 1.0;
  }

  private bgmSpeedMultiplier = 1.0;
  // Cheerful Overcooked Bistro Ragtime/Accordion 16-step melody + walking bassline
  private arpeggio = [
    523.25, 659.25, 783.99, 659.25, // C5 E5 G5 E5
    587.33, 698.46, 880.00, 698.46, // D5 F5 A5 F5
    659.25, 783.99, 1046.50, 783.99, // E5 G5 C6 G5
    587.33, 493.88, 392.00, 493.88, // D5 B4 G4 B4
  ];
  private bassLine = [
    130.81, 196.00, 146.83, 220.00, // C3 G3 D3 A3
    164.81, 196.00, 146.83, 196.00, // E3 G3 D3 G3
    130.81, 196.00, 174.61, 220.00, // C3 G3 F3 A3
    196.00, 146.83, 130.81, 196.00, // G3 D3 C3 G3
  ];
  private noteIndex = 0;

  private scheduleBgmNotes = () => {
    if (!this.isPlayingBgm || this.state !== '1') return;
    const settings = getSettings();
    if (settings.music <= 0 || settings.master <= 0) return;
    const ctx = this.ctx!;
    
    while (this.nextNoteTime < ctx.currentTime + 0.1) {
      this.playNote(this.nextNoteTime);
      const noteLength = 0.24 / this.bgmSpeedMultiplier;
      this.nextNoteTime += noteLength;
      this.noteIndex = (this.noteIndex + 1) % this.arpeggio.length;
    }

    this.bgmTimer = window.setTimeout(this.scheduleBgmNotes, 50);
  }

  private playNote(time: number) {
    const ctx = this.ctx!;
    const settings = getSettings();
    const musicGain = (settings.music / 100) * (settings.master / 100);
    if (musicGain <= 0) return;

    // 1. Lead Marimba / Accordion Melody voice
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = this.arpeggio[this.noteIndex]!;
    
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.052 * musicGain, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.20);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + 0.20);

    // 2. Warm Walking Bass on even steps
    if (this.noteIndex % 2 === 0) {
      try {
        const bassOsc = ctx.createOscillator();
        bassOsc.type = 'sine';
        bassOsc.frequency.value = this.bassLine[this.noteIndex % this.bassLine.length]!;
        const bassGain = ctx.createGain();
        bassGain.gain.setValueAtTime(0.045 * musicGain, time);
        bassGain.gain.exponentialRampToValueAtTime(0.001, time + 0.26);
        bassOsc.connect(bassGain);
        bassGain.connect(ctx.destination);
        bassOsc.start(time);
        bassOsc.stop(time + 0.26);
      } catch {
        // Ignore in minimal mock context
      }
    }
  }

  public playMenuMusic() {
    this.isPlayingMenuMusic = true;
    if (this.state !== '1') {
      this.stopMenuMusicNotes();
      return;
    }
    const settings = getSettings();
    if (settings.music <= 0 || settings.master <= 0) {
      this.stopMenuMusicNotes();
      return;
    }
    this.initCtx();
    if (!this.menuMusicTimer && this.ctx) {
      this.nextMenuNoteTime = this.ctx.currentTime + 0.05;
      this.scheduleMenuMusicNotes();
    }
  }

  public stopMenuMusic() {
    this.isPlayingMenuMusic = false;
    this.stopMenuMusicNotes();
  }

  private stopMenuMusicNotes() {
    if (this.menuMusicTimer) {
      clearTimeout(this.menuMusicTimer);
      this.menuMusicTimer = undefined;
    }
  }

  private scheduleMenuMusicNotes = () => {
    if (!this.isPlayingMenuMusic || this.state !== '1') return;
    const settings = getSettings();
    if (settings.music <= 0 || settings.master <= 0) {
      this.stopMenuMusicNotes();
      return;
    }
    const ctx = this.ctx;
    if (!ctx) return;

    while (this.nextMenuNoteTime < ctx.currentTime + 0.1) {
      this.playMenuNote(this.nextMenuNoteTime);
      const noteLength = 0.32;
      this.nextMenuNoteTime += noteLength;
      this.menuNoteIndex = (this.menuNoteIndex + 1) % this.menuMelody.length;
    }

    this.menuMusicTimer = window.setTimeout(this.scheduleMenuMusicNotes, 50);
  };

  private playMenuNote(time: number) {
    const ctx = this.ctx;
    if (!ctx) return;
    const settings = getSettings();
    const vol = 0.045 * (settings.music / 100) * (settings.master / 100);
    if (vol <= 0) return;

    try {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = this.menuMelody[this.menuNoteIndex]!;

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(vol, time);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.28);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + 0.28);
    } catch {
      // AudioContext might be in invalid state
    }
  }
}

export const sfx = new Sfx();

