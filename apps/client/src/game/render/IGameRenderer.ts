import { LevelDef, GameEvent } from '@kitchen/core';

export interface RenderFrame {
  players: {
    id: string;
    x: number;
    y: number;
    fx: number;
    fy: number;
    vx: number;
    vy: number;
    held: any;
    acting: boolean;
    actingStation?: 'cutting' | 'sink' | null;
    dashing: boolean;
    color: string;
    name: string;
    connected: boolean;
    cosmetic?: { color: number; hat: number; species: number };
  }[];
  stations: any[];
  projectiles: any[];
  customers: any[];
  orders: any[];
  score: number;
  timeLeft: number;
  streak: number;
  localPlayerId?: string;
  activeChefId?: string;
  targetTile: { tx: number, ty: number };
  tapTarget?: { tx: number, ty: number } | null;
  hintTarget?: { x: number, y: number };
}

export interface RendererOptions {
  // Add any options if needed by implementations
}

export interface IGameRenderer {
  init(container: HTMLElement, level: LevelDef, opts: RendererOptions): Promise<void>;
  /** Gọi mỗi khi có snapshot mới (đã qua SnapshotBuffer/Predictor) */
  applyFrame(frame: RenderFrame): void;
  /** Gọi mỗi frame hiển thị, dt giây thực */
  update(dtSec: number): void;
  handleEvent(ev: GameEvent): void;
  resize(width: number, height: number, dpr: number): void;
  setQuality(q: 'low' | 'medium' | 'high'): void;
  screenToTile?(clientX: number, clientY: number): { tx: number; ty: number } | null;
  dispose(): void;
}
