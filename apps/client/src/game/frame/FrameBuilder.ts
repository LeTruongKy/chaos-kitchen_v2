import { Snapshot, PlayerInput, LevelDef, ParsedLevel, parseLevel, getTargetTile, INTERP_DELAY_MS, INTERACT_REACH, PLAYER_COLORS } from '@kitchen/core';
import { SnapshotBuffer } from '../net/SnapshotBuffer';
import { Predictor } from '../Predictor';
import { RenderFrame } from '../render/IGameRenderer';
import { appStore } from '../../state/store';
import { loadCosmetic } from '../../state/cosmetic';

export class FrameBuilder {
  private snapshotBuffer: SnapshotBuffer;
  private predictor?: Predictor;
  private currentLevel?: ParsedLevel;
  private localPlayerId?: string;
  private currentActiveId?: string;
  private cachedLocalCosmetic = loadCosmetic();

  constructor() {
    this.snapshotBuffer = new SnapshotBuffer();
  }

  public setLevel(levelDef: LevelDef) {
    this.currentLevel = parseLevel(levelDef);
    this.cachedLocalCosmetic = loadCosmetic();
  }

  public setLocalPlayerId(id: string) {
    this.localPlayerId = id;
    this.cachedLocalCosmetic = loadCosmetic();
  }

  public onSnapshot(snap: Snapshot, recvTime: number) {
    this.snapshotBuffer.push(snap, recvTime);
    if (this.localPlayerId) {
      const activeId = snap.activeChefId || this.localPlayerId;
      if (this.currentActiveId !== activeId) {
        this.predictor = undefined;
        this.currentActiveId = activeId;
      }
      const localState = snap.players.find(p => p.id === activeId);
      if (localState && this.currentLevel) {
        if (!this.predictor) {
          this.predictor = new Predictor(
            localState as any, // type compat
            this.currentLevel.tiles,
            this.currentLevel.width,
            this.currentLevel.height
          );
        } else {
          this.predictor.onSnapshot(localState as any, localState.ackSeq);
        }
      }
    }
  }

  private lastLocalInput: PlayerInput | null = null;

  public applyLocalInput(input: PlayerInput) {
    this.lastLocalInput = input;
    this.predictor?.applyLocalInput(input);
  }

  public updatePredictorDisplay(deltaMs: number) {
    this.predictor?.updateDisplay(deltaMs);
  }

  public buildFrame(): RenderFrame | null {
    const renderTime = globalThis.performance.now() - INTERP_DELAY_MS;
    let { snapshot, players: interpPlayers } = this.snapshotBuffer.sample(renderTime);

    const storeState = appStore.get();
    const lobby = storeState.lobby;
    if (!snapshot && this.currentLevel && lobby && lobby.players.length > 0 && (storeState.phase === 'countdown' || storeState.phase === 'playing')) {
      const spawns = this.currentLevel.spawns.length > 0 ? this.currentLevel.spawns : [{ x: 2, y: 2 }];
      const rawIds = lobby.solo
        ? lobby.players.flatMap(m => [`${m.id}_1`, `${m.id}_2`])
        : lobby.players.map(m => m.id);
      const fallbackPlayers = rawIds.map((pid, idx) => {
        const sp = spawns[idx % spawns.length]!;
        return {
          id: pid,
          x: sp.x + 0.5,
          y: sp.y + 0.5,
          vx: 0,
          vy: 0,
          fx: 0,
          fy: 1,
          held: null,
          acting: false,
          ackSeq: 0,
          dashT: 0,
          dashCd: 0,
          sprintEnergy: 3.0,
          sprintExhausted: false,
        };
      });
      snapshot = {
        tick: 0,
        timeLeft: 180,
        score: 0,
        streak: 0,
        players: fallbackPlayers as any,
        stations: this.currentLevel.stations.map(s => ({
          x: s.x,
          y: s.y,
          type: s.type,
          kind: (s as any).kind,
          item: null,
          cleanCount: s.type === 'plate_dispenser' ? 4 : 0,
          dirtyCount: 0,
          progress: 0,
          burnProgress: 0,
          onFire: false,
        })) as any,
        orders: [],
        customers: [],
        projectiles: [],
        activeChefId: lobby.solo && lobby.players[0] ? `${lobby.players[0].id}_1` : this.localPlayerId,
      } as any;
      interpPlayers = fallbackPlayers.map((p, idx) => ({
        id: p.id,
        x: p.x,
        y: p.y,
        fx: p.fx,
        fy: p.fy,
        held: null,
        acting: false,
        colorIndex: idx,
      }));
      if (!this.currentActiveId) {
        this.currentActiveId = (snapshot as any).activeChefId || this.localPlayerId;
      }
    }

    if (!snapshot) return null;

    let targetTile = { tx: -1, ty: -1 };
    const lobbyPlayers = lobby?.players || [];
    const localSavedCosmetic = this.cachedLocalCosmetic;

    const framePlayers = interpPlayers.map((p, idx) => {
      const isLocal = p.id === this.currentActiveId;
      let displayX = p.x;
      let displayY = p.y;
      let displayFx = p.fx;
      let displayFy = p.fy;
      let displayVx = 0;
      let displayVy = 0;

      if (isLocal && this.predictor) {
        const pState = this.predictor.getDisplayState();
        displayX = pState.x;
        displayY = pState.y;
        displayFx = pState.fx;
        displayFy = pState.fy;
        displayVx = pState.vx;
        displayVy = pState.vy;

        // Calculate target tile using the display state (which is closest to what the user sees)
        const mockPlayerState = { x: displayX, y: displayY, fx: displayFx, fy: displayFy };
        targetTile = getTargetTile(mockPlayerState as any);
      } else {
        const snapPlayer = snapshot.players.find(sp => sp.id === p.id);
        if (snapPlayer) {
          displayVx = snapPlayer.vx;
          displayVy = snapPlayer.vy;
        }
      }

      const snapPlayer = snapshot.players.find(sp => sp.id === p.id);

      let actingStation: 'cutting' | 'sink' | null = null;
      const isActing = p.acting || (isLocal && Boolean(this.lastLocalInput?.act));
      if (isActing) {
        // GATE 2: ô mục tiêu = floor(x + fx × INTERACT_REACH), floor(y + fy × INTERACT_REACH)
        const targetX = Math.floor(displayX + displayFx * INTERACT_REACH);
        const targetY = Math.floor(displayY + displayFy * INTERACT_REACH);
        const st = snapshot.stations?.find(s => s.x === targetX && s.y === targetY);
        if (st) {
          if (st.type === 'cutting') {
            actingStation = 'cutting';
          } else if (st.type === 'sink') {
            actingStation = 'sink';
          }
        }
      }

      const lobbyPlayer = lobbyPlayers.find(lp => lp.id === p.id);
      let cosmetic = lobbyPlayer?.cosmetic;
      if (!cosmetic) {
        if (p.id === this.localPlayerId || idx === 0) {
          cosmetic = localSavedCosmetic;
        } else {
          // Second chef in solo mode gets a distinct companion outfit/character
          cosmetic = {
            color: (localSavedCosmetic.color + idx) % PLAYER_COLORS.length,
            hat: (localSavedCosmetic.hat + 2) % 3,
            species: localSavedCosmetic.species,
          };
        }
      }
      const colorNum = PLAYER_COLORS[cosmetic.color ?? lobbyPlayer?.color ?? idx % PLAYER_COLORS.length] ?? PLAYER_COLORS[0]!;
      const colorHexStr = `#${colorNum.toString(16).padStart(6, '0')}`;

      return {
        id: p.id,
        x: displayX,
        y: displayY,
        fx: displayFx,
        fy: displayFy,
        vx: displayVx,
        vy: displayVy,
        held: p.held,
        acting: p.acting,
        actingStation,
        dashing: Boolean(snapPlayer && snapPlayer.dashT > 0),
        color: colorHexStr,
        name: lobbyPlayer?.name || p.id,
        connected: lobbyPlayer ? lobbyPlayer.connected : true,
        cosmetic,
      };
    });

    return {
      players: framePlayers,
      stations: snapshot.stations,
      projectiles: (snapshot as any).projectiles || [],
      customers: (snapshot as any).customers || [],
      orders: snapshot.orders,
      score: snapshot.score,
      timeLeft: snapshot.timeLeft,
      streak: (snapshot as any).streak || 0,
      localPlayerId: this.localPlayerId,
      activeChefId: this.currentActiveId,
      targetTile
    };
  }
}
