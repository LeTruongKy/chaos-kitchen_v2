import { resolvePublicUrl } from '../assets/AssetLoader';
import { getSettings } from '../../state/settings';

export type SoundCategory =
  | 'pickup'
  | 'drop'
  | 'plate'
  | 'chop'
  | 'bell'
  | 'ui_click'
  | 'ui_select'
  | 'ui_toggle'
  | 'ui_back'
  | 'ui_confirm'
  | 'ui_error';

const IMPACT_BASE = '/audio/kenney_impact-sounds/Audio';
const INTERFACE_BASE = '/audio/kenney_interface-sounds/Audio';

const SOUND_BANKS: Record<SoundCategory, string[]> = {
  // Khi nhân vật nhặt đồ vật / đĩa / thức ăn (pickup): va chạm nhẹ, gọn từ gói Impact của Kenney
  pickup: [
    `${IMPACT_BASE}/impactWood_light_000.ogg`,
    `${IMPACT_BASE}/impactWood_light_001.ogg`,
    `${IMPACT_BASE}/impactWood_light_002.ogg`,
    `${IMPACT_BASE}/impactWood_light_003.ogg`,
    `${IMPACT_BASE}/impactWood_light_004.ogg`,
    `${IMPACT_BASE}/impactPlate_light_000.ogg`,
    `${IMPACT_BASE}/impactPlate_light_001.ogg`,
    `${IMPACT_BASE}/impactPlate_light_002.ogg`,
    `${IMPACT_BASE}/impactGeneric_light_000.ogg`,
    `${IMPACT_BASE}/impactGeneric_light_001.ogg`,
    `${IMPACT_BASE}/impactSoft_medium_000.ogg`,
    `${IMPACT_BASE}/impactSoft_medium_001.ogg`,
  ],
  // Khi nhân vật đặt đồ vật / đĩa / thức ăn xuống quầy (drop / trash): va chạm đầm, rõ từ gói Impact của Kenney
  drop: [
    `${IMPACT_BASE}/impactWood_medium_000.ogg`,
    `${IMPACT_BASE}/impactWood_medium_001.ogg`,
    `${IMPACT_BASE}/impactWood_medium_002.ogg`,
    `${IMPACT_BASE}/impactWood_medium_003.ogg`,
    `${IMPACT_BASE}/impactWood_medium_004.ogg`,
    `${IMPACT_BASE}/impactPlate_medium_000.ogg`,
    `${IMPACT_BASE}/impactPlate_medium_001.ogg`,
    `${IMPACT_BASE}/impactPlate_medium_002.ogg`,
    `${IMPACT_BASE}/impactPlank_medium_000.ogg`,
    `${IMPACT_BASE}/impactPlank_medium_001.ogg`,
    `${IMPACT_BASE}/impactSoft_heavy_000.ogg`,
    `${IMPACT_BASE}/impactSoft_heavy_001.ogg`,
  ],
  // Tiếng va chạm đĩa sứ / nồi chảo
  plate: [
    `${IMPACT_BASE}/impactPlate_light_000.ogg`,
    `${IMPACT_BASE}/impactPlate_light_001.ogg`,
    `${IMPACT_BASE}/impactPlate_light_002.ogg`,
    `${IMPACT_BASE}/impactPlate_light_003.ogg`,
    `${IMPACT_BASE}/impactPlate_medium_000.ogg`,
    `${IMPACT_BASE}/impactPlate_medium_001.ogg`,
  ],
  // Tiếng thái rau củ trên thớt gỗ
  chop: [
    `${IMPACT_BASE}/impactWood_light_000.ogg`,
    `${IMPACT_BASE}/impactWood_light_001.ogg`,
    `${IMPACT_BASE}/impactWood_light_002.ogg`,
    `${IMPACT_BASE}/impactWood_light_003.ogg`,
    `${IMPACT_BASE}/impactPlank_medium_000.ogg`,
  ],
  // Tiếng chuông gọi món / phục vụ
  bell: [
    `${IMPACT_BASE}/impactBell_heavy_000.ogg`,
    `${IMPACT_BASE}/impactBell_heavy_001.ogg`,
  ],
  // Khi bấm nút hoặc tương tác giao diện (UI click / bấm chọn menu): tiếng bíp/blop nhẹ từ gói Interface của Kenney
  ui_click: [
    `${INTERFACE_BASE}/click_001.ogg`,
    `${INTERFACE_BASE}/click_002.ogg`,
    `${INTERFACE_BASE}/click_003.ogg`,
    `${INTERFACE_BASE}/click_004.ogg`,
    `${INTERFACE_BASE}/click_005.ogg`,
    `${INTERFACE_BASE}/pluck_001.ogg`,
    `${INTERFACE_BASE}/pluck_002.ogg`,
    `${INTERFACE_BASE}/select_001.ogg`,
    `${INTERFACE_BASE}/select_002.ogg`,
  ],
  ui_select: [
    `${INTERFACE_BASE}/select_001.ogg`,
    `${INTERFACE_BASE}/select_002.ogg`,
    `${INTERFACE_BASE}/select_003.ogg`,
    `${INTERFACE_BASE}/select_004.ogg`,
    `${INTERFACE_BASE}/pluck_001.ogg`,
    `${INTERFACE_BASE}/pluck_002.ogg`,
  ],
  ui_toggle: [
    `${INTERFACE_BASE}/switch_001.ogg`,
    `${INTERFACE_BASE}/switch_002.ogg`,
    `${INTERFACE_BASE}/switch_003.ogg`,
    `${INTERFACE_BASE}/toggle_001.ogg`,
    `${INTERFACE_BASE}/toggle_002.ogg`,
  ],
  ui_back: [
    `${INTERFACE_BASE}/back_001.ogg`,
    `${INTERFACE_BASE}/back_002.ogg`,
    `${INTERFACE_BASE}/close_001.ogg`,
    `${INTERFACE_BASE}/close_002.ogg`,
  ],
  ui_confirm: [
    `${INTERFACE_BASE}/confirmation_001.ogg`,
    `${INTERFACE_BASE}/confirmation_002.ogg`,
    `${INTERFACE_BASE}/bong_001.ogg`,
  ],
  ui_error: [
    `${INTERFACE_BASE}/error_001.ogg`,
    `${INTERFACE_BASE}/error_002.ogg`,
  ],
};

// Mức âm lượng cơ bản vừa phải cho từng nhóm (tránh quá to gây rè loa)
const CATEGORY_BASE_GAIN: Record<SoundCategory, number> = {
  pickup: 0.34,
  drop: 0.36,
  plate: 0.32,
  chop: 0.28,
  bell: 0.30,
  ui_click: 0.26,
  ui_select: 0.26,
  ui_toggle: 0.25,
  ui_back: 0.26,
  ui_confirm: 0.30,
  ui_error: 0.28,
};

export class AudioManager {
  private ctx: AudioContext | null = null;
  private bufferCache: Map<string, AudioBuffer> = new Map();
  private rawArrayBufferCache: Map<string, ArrayBuffer> = new Map();
  private loadingUrls: Set<string> = new Set();
  private failedUrls: Set<string> = new Set();
  private htmlAudioPool: Map<string, HTMLAudioElement[]> = new Map();
  private lastPlayedTime: Map<string, number> = new Map();
  private initialized = false;
  private uiListenerInstalled = false;

  /**
   * Khởi tạo và preload bất đồng bộ các file âm thanh Kenney vào bộ nhớ đệm
   * để khi người chơi thao tác sẽ phát ngay lập tức không bị giật lag.
   */
  public init(): void {
    if (this.initialized) return;
    if (typeof window === 'undefined' || typeof fetch === 'undefined') return;
    this.initialized = true;

    this.installGlobalUiClickSound();

    // Preload tất cả các file trong SOUND_BANKS ở chế độ nền (không chặn luồng chính)
    const allPaths = new Set<string>();
    for (const list of Object.values(SOUND_BANKS)) {
      for (const p of list) {
        allPaths.add(p);
      }
    }

    for (const relPath of allPaths) {
      this.preloadFile(relPath);
    }
  }

  private getOrCreateContext(): AudioContext | null {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    }
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    try {
      this.ctx = new AudioCtx();
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  /**
   * Cho phép dùng chung AudioContext từ Sfx nếu đã khởi tạo
   */
  public setSharedContext(ctx: AudioContext | undefined): void {
    if (!ctx) return;
    // Chỉ nhận AudioContext thật từ trình duyệt (có decodeAudioData)
    if (typeof ctx.decodeAudioData === 'function') {
      this.ctx = ctx;
      this.decodePendingBuffers();
    }
  }

  private preloadFile(relPath: string): void {
    const url = resolvePublicUrl(relPath);
    if (this.bufferCache.has(relPath) || this.rawArrayBufferCache.has(relPath) || this.loadingUrls.has(relPath) || this.failedUrls.has(relPath)) {
      return;
    }
    if (typeof fetch !== 'function') return;

    this.loadingUrls.add(relPath);
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.arrayBuffer();
      })
      .then((arrBuf) => {
        this.loadingUrls.delete(relPath);
        const ctx = this.ctx;
        if (ctx && typeof ctx.decodeAudioData === 'function') {
          const copy = arrBuf.slice(0);
          ctx.decodeAudioData(copy)
            .then((decoded) => {
              this.bufferCache.set(relPath, decoded);
            })
            .catch(() => {
              // Lưu lại raw buffer hoặc dùng HTML5 Audio fallback
              this.rawArrayBufferCache.set(relPath, arrBuf);
            });
        } else {
          this.rawArrayBufferCache.set(relPath, arrBuf);
        }
      })
      .catch(() => {
        this.loadingUrls.delete(relPath);
        this.failedUrls.add(relPath);
      });
  }

  private decodePendingBuffers(): void {
    const ctx = this.ctx;
    if (!ctx || typeof ctx.decodeAudioData !== 'function') return;

    for (const [relPath, arrBuf] of this.rawArrayBufferCache.entries()) {
      if (this.bufferCache.has(relPath)) continue;
      this.rawArrayBufferCache.delete(relPath);
      const copy = arrBuf.slice(0);
      ctx.decodeAudioData(copy)
        .then((decoded) => {
          this.bufferCache.set(relPath, decoded);
        })
        .catch(() => {});
    }
  }

  private isAudioEnabled(): boolean {
    try {
      if (typeof localStorage !== 'undefined' && localStorage.getItem('ck_sound') === '0') {
        return false;
      }
      const settings = getSettings();
      if (settings.sfx <= 0 || settings.master <= 0) {
        return false;
      }
      return true;
    } catch {
      return true;
    }
  }

  private computeFinalGain(category: SoundCategory, distanceFactor: number = 0): number {
    try {
      const settings = getSettings();
      const userScale = (settings.sfx / 100) * (settings.master / 100);
      const distScale = Math.max(0.35, 1 - Math.max(0, Math.min(1, distanceFactor)));
      const baseGain = CATEGORY_BASE_GAIN[category] ?? 0.3;
      // Giới hạn ngưỡng tối đa 0.50 để âm lượng luôn êm tai, không bao giờ gây rè loa
      return Math.min(0.50, Math.max(0, baseGain * userScale * distScale));
    } catch {
      return 0.25;
    }
  }

  /**
   * Phát ngẫu nhiên một file âm thanh thuộc danh mục chỉ định.
   * Trả về `true` nếu đã phát thành công từ gói Kenney, `false` nếu file chưa tải xong hoặc đang tắt âm.
   * Đảm bảo 100% không ném ngoại lệ (Null reference) ngay cả khi file chưa load xong.
   */
  public playRandom(category: SoundCategory, distanceFactor: number = 0, minIntervalMs: number = 40): boolean {
    try {
      if (!this.isAudioEnabled()) return false;

      if (!this.initialized) {
        this.init();
      }

      const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const lastTime = this.lastPlayedTime.get(category) ?? 0;
      if (nowMs - lastTime < minIntervalMs) {
        return true; // Đã chống chồng âm sát nhau
      }

      const bank = SOUND_BANKS[category];
      if (!bank || bank.length === 0) return false;

      const gain = this.computeFinalGain(category, distanceFactor);
      if (gain <= 0.005) return false;

      // Ưu tiên chọn ngẫu nhiên trong các file đã decode sẵn vào bufferCache để không trễ 1ms nào
      const loadedPaths = bank.filter((p) => this.bufferCache.has(p));
      const ctx = this.getOrCreateContext();
      this.decodePendingBuffers();

      if (ctx && typeof ctx.createBufferSource === 'function' && loadedPaths.length > 0) {
        const chosenPath = loadedPaths[Math.floor(Math.random() * loadedPaths.length)]!;
        const audioBuffer = this.bufferCache.get(chosenPath);
        if (audioBuffer) {
          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;

          // Biến thiên cao độ nhẹ (0.96 - 1.04) giúp tiếng nhặt/đặt đồ tự nhiên như Overcooked
          if (source.playbackRate && typeof source.playbackRate.value === 'number') {
            const jitter = category.startsWith('ui_') ? 0.03 : 0.06;
            source.playbackRate.value = 1.0 + (Math.random() * 2 - 1) * jitter;
          }

          const gainNode = ctx.createGain();
          gainNode.gain.value = gain;

          source.connect(gainNode);
          gainNode.connect(ctx.destination);
          source.start(0);

          this.lastPlayedTime.set(category, nowMs);
          return true;
        }
      }

      // Fallback sang HTML5 Audio Pool nếu AudioBuffer đang decode hoặc mới vừa vào trang
      const chosenRelPath = bank[Math.floor(Math.random() * bank.length)];
      if (!chosenRelPath) return false;

      // Kích hoạt preload cho lần sau nếu chưa tải
      this.preloadFile(chosenRelPath);

      if (typeof Audio !== 'undefined' && !this.failedUrls.has(chosenRelPath)) {
        const playedHtml = this.playViaHtmlAudioPool(chosenRelPath, gain);
        if (playedHtml) {
          this.lastPlayedTime.set(category, nowMs);
          return true;
        }
      }

      return false;
    } catch {
      // Tuyệt đối không ném lỗi Null reference nếu trình duyệt chặn autoplay hoặc file chưa load xong
      return false;
    }
  }

  private playViaHtmlAudioPool(relPath: string, volume: number): boolean {
    try {
      if (typeof Audio === 'undefined') return false;
      const url = resolvePublicUrl(relPath);
      let pool = this.htmlAudioPool.get(relPath);
      if (!pool) {
        pool = [];
        this.htmlAudioPool.set(relPath, pool);
      }

      // Tìm một phần tử Audio đang rảnh trong pool (tối đa 4 instance mỗi file)
      let audioEl = pool.find((a) => a.paused || a.ended);
      if (!audioEl && pool.length < 4) {
        audioEl = new Audio(url);
        audioEl.preload = 'auto';
        pool.push(audioEl);
      }

      if (!audioEl) {
        audioEl = pool[0];
      }
      if (!audioEl) return false;

      audioEl.volume = Math.min(1, Math.max(0, volume));
      audioEl.currentTime = 0;
      const playPromise = audioEl.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {});
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Phát âm thanh khi nhân vật nhặt đồ vật / đĩa / thức ăn (gói Impact của Kenney)
   */
  public playPickup(distanceFactor: number = 0): boolean {
    return this.playRandom('pickup', distanceFactor, 45);
  }

  /**
   * Phát âm thanh khi nhân vật đặt đồ vật / đĩa / thức ăn xuống quầy (gói Impact của Kenney)
   */
  public playDrop(distanceFactor: number = 0): boolean {
    return this.playRandom('drop', distanceFactor, 45);
  }

  /**
   * Phát âm thanh khi nhân vật bấm nút hoặc tương tác giao diện (gói Interface của Kenney)
   */
  public playUiClick(variant: 'click' | 'select' | 'toggle' | 'back' | 'confirm' | 'error' = 'click'): boolean {
    const map: Record<typeof variant, SoundCategory> = {
      click: 'ui_click',
      select: 'ui_select',
      toggle: 'ui_toggle',
      back: 'ui_back',
      confirm: 'ui_confirm',
      error: 'ui_error',
    };
    return this.playRandom(map[variant] ?? 'ui_click', 0, 35);
  }

  /**
   * Tự động gắn âm thanh "bíp/blop" nhẹ từ gói Interface của Kenney
   * cho tất cả nút bấm, menu, thẻ chọn map, tab và điều khiển UI trên toàn bộ ứng dụng.
   */
  public installGlobalUiClickSound(): void {
    if (this.uiListenerInstalled) return;
    if (typeof document === 'undefined') return;
    this.uiListenerInstalled = true;

    document.addEventListener(
      'pointerdown',
      (ev: PointerEvent) => {
        try {
          const target = ev.target as HTMLElement | null;
          if (!target || typeof target.closest !== 'function') return;

          const interactive = target.closest(
            'button, [role="button"], a, select, summary, input[type="checkbox"], input[type="radio"], .level-card, .tab-btn, .hud-recipe-pill, .cosmetic-item, .color-swatch'
          ) as HTMLElement | null;

          if (!interactive) return;
          if ((interactive as HTMLButtonElement).disabled) return;

          // Phân loại âm thanh UI tinh tế theo ngữ cảnh nút bấm
          const text = (interactive.textContent || '').toLowerCase();
          const cls = (interactive.className || '').toLowerCase();

          if (
            interactive.tagName === 'INPUT' ||
            cls.includes('toggle') ||
            cls.includes('switch')
          ) {
            this.playUiClick('toggle');
          } else if (
            text.includes('thoát') ||
            text.includes('hủy') ||
            text.includes('đóng') ||
            text.includes('quay lại') ||
            cls.includes('close') ||
            cls.includes('back') ||
            cls.includes('cancel')
          ) {
            this.playUiClick('back');
          } else if (
            text.includes('bắt đầu') ||
            text.includes('sẵn sàng') ||
            text.includes('tạo phòng') ||
            text.includes('vào phòng') ||
            cls.includes('primary') ||
            cls.includes('start')
          ) {
            this.playUiClick('confirm');
          } else if (
            cls.includes('level-card') ||
            cls.includes('tab') ||
            cls.includes('swatch') ||
            cls.includes('cosmetic')
          ) {
            this.playUiClick('select');
          } else {
            this.playUiClick('click');
          }
        } catch {
          // Bỏ qua mọi ngoại lệ DOM
        }
      },
      { capture: true, passive: true }
    );
  }
}

export const audioManager = new AudioManager();
