import { Room, Client, matchMaker, ServerError } from '@colyseus/core';
import { Schema } from '@colyseus/schema';
import {
  MAX_PLAYERS,
  createGameState,
  GameState,
  toSnapshot,
  buildResults,
  isPlayerInput,
  SIM_HZ,
  RESULTS_SECONDS,
  getLevel,
  Phase,
  MSG,
  COUNTDOWN_SECONDS,
  PLAYER_COLORS,
  PROTOCOL_VERSION,
  PlayerCosmetic
} from '@kitchen/core';
import { logger } from '../util/logger.js';
import { generateRoomCode } from './roomCode.js';
import { sanitizeName, sanitizeCosmetic } from '../util/sanitize.js';
import { InputQueue } from './inputQueue.js';
import { GameLoop } from './gameLoop.js';
import { DEBUG_DURATION } from '../util/config.js';
import { MessageGuard } from './messageGuard.js';

class KitchenState extends Schema {
}

interface Member {
  id: string;
  name: string;
  color: number;
  ready: boolean;
  connected: boolean;
  joinedAt: number;
  cosmetic: PlayerCosmetic;
}

type MessageType = typeof MSG.INPUT | typeof MSG.PING | typeof MSG.READY | typeof MSG.SELECT_LEVEL | typeof MSG.START | typeof MSG.BACK_TO_LOBBY | typeof MSG.EMOTE | typeof MSG.SWITCH_CHEF | typeof MSG.SET_SOLO | typeof MSG.SET_COSMETIC;

const RATE_LIMITS: Record<MessageType, readonly [number, number]> = {
  [MSG.INPUT]: [60, 60],
  [MSG.PING]: [2, 2],
  [MSG.READY]: [5, 5],
  [MSG.SELECT_LEVEL]: [5, 5],
  [MSG.START]: [5, 5],
  [MSG.BACK_TO_LOBBY]: [5, 5],
  [MSG.EMOTE]: [1, 0.666], // max 1 emote per 1.5s
  [MSG.SWITCH_CHEF]: [4, 4],
  [MSG.SET_SOLO]: [2, 2],
  [MSG.SET_COSMETIC]: [10, 10],
};
const MAX_MESSAGE_BYTES = 1024;
const MAX_VIOLATIONS = 50;
const VIOLATION_WINDOW_MS = 10_000;
const RECONNECT_SECONDS = 30;

export class KitchenRoom extends Room<KitchenState> {
  override maxClients = MAX_PLAYERS;

  phase: Phase = 'lobby';
  levelId = 'level1';
  hostId = '';
  members: Member[] = [];

  isSoloMode = false;
  activeChefMap: Record<string, string> = {};

  gameState?: GameState;
  inputQueues: Record<string, InputQueue> = {};
  gameLoop?: GameLoop;
  private messageGuard = new MessageGuard<MessageType>(
    RATE_LIMITS,
    MAX_MESSAGE_BYTES,
    MAX_VIOLATIONS,
    VIOLATION_WINDOW_MS,
    (client) => {
      this.forcedLeaves.add(client.sessionId);
      client.leave(4000, 'too_many_invalid_messages');
    }
  );
  private readonly forcedLeaves = new Set<string>();
  private emptyRoomTimer?: { clear(): void };
  private countdownTimer?: { clear(): void };

  private finishedAt = 0;
  private backToLobbyTimer?: { clear(): void };

  override async onCreate(options: unknown) {
    this.setState(new KitchenState());


    let taken = new Set<string>();
    try {
      const rooms = await matchMaker.query({ name: 'kitchen' });
      taken = new Set(rooms.map((r) => r.roomId));
    } catch {
      // Ignore if matchMaker driver is not initialized (e.g. in tests)
    }
    this.roomId = generateRoomCode((code) => taken.has(code));

    if (isRecord(options) && options.public === false) {
      this.setPrivate(true);
    }

    this.setSimulationInterval((deltaTime) => {
      if (this.phase !== 'playing') return;
      try {
        this.gameLoop?.advance(deltaTime);
      } catch (error) {
        logger.error(`Simulation failed in ${this.roomId}: ${String(error)}`);
        for (const member of this.members.filter((member) => member.connected)) {
          const activeClient = this.clients.find((candidate) => candidate.sessionId === member.id);
          if (activeClient) this.sendError(activeClient, 'simulation_failed', 'Máy chủ gặp lỗi mô phỏng.');
        }
      }
    }, 1000 / SIM_HZ);

    this.registerHandler(MSG.READY, (client, message) => {
      if (this.phase !== 'lobby') return;
      if (!isRecord(message) || typeof message.ready !== 'boolean') return this.messageGuard.recordViolation(client);
      const m = this.members.find(x => x.id === client.sessionId);
      if (m) {
        m.ready = message.ready;
        this.broadcastLobby();
      }
    });

    this.registerHandler(MSG.SELECT_LEVEL, (client, message) => {
      if (this.phase !== 'lobby') return;
      if (client.sessionId !== this.hostId) return; // only host
      if (isRecord(message) && typeof message.levelId === 'string' && getLevel(message.levelId)) {
        this.levelId = message.levelId;
        this.broadcastLobby();
      }
    });

    this.registerHandler(MSG.START, (client) => {
      if (this.phase !== 'lobby') return;
      if (client.sessionId !== this.hostId) return;
      if (this.members.length === 0) return;

      const level = getLevel(this.levelId);
      const effectiveMaxPlayers = level?.maxPlayers ?? MAX_PLAYERS;
      const count = this.members.length;
      if (count > effectiveMaxPlayers) {
        this.sendError(client, 'too_many_players', `This map allows up to ${effectiveMaxPlayers} players`);
        return;
      }

      let countdown = COUNTDOWN_SECONDS;
      this.setPhase('countdown', countdown);

      this.countdownTimer = this.clock.setInterval(() => {
        countdown--;
        if (countdown > 0) {
          this.setPhase('countdown', countdown);
        } else {
          this.countdownTimer?.clear();
          this.countdownTimer = undefined;
          this.startGame();
        }
      }, 1000);
    });

    this.registerHandler(MSG.INPUT, (client, message) => {
      if (this.phase !== 'playing') return;
      if (isPlayerInput(message)) {
        const chefId = this.isSoloMode ? this.activeChefMap[client.sessionId] : client.sessionId;
        if (chefId) {
          this.inputQueues[chefId]?.push(message);
        }
      } else {
        this.messageGuard.recordViolation(client);
      }
    });

    this.registerHandler(MSG.BACK_TO_LOBBY, (client, message) => {
      if (client.sessionId !== this.hostId) return;
      if (this.phase === 'lobby') return;
      if (this.phase === 'finished' && Date.now() - this.finishedAt < RESULTS_SECONDS * 1000) {
        this.sendError(client, 'too_early', 'Chưa hết thời gian chờ kết quả.');
        return;
      }
      if (isRecord(message) && typeof message.nextLevelId === 'string' && getLevel(message.nextLevelId)) {
        this.levelId = message.nextLevelId;
      }
      this.backToLobby();
    });

    this.registerHandler(MSG.PING, (client, message) => {
      if (!isRecord(message) || !Number.isFinite(message.t)) return this.messageGuard.recordViolation(client);
      client.send(MSG.PONG, { t: message.t });
    });

    this.registerHandler(MSG.EMOTE, (client, message) => {
      if (!isRecord(message) || typeof message.id !== 'number' || ![0, 1, 2, 3].includes(message.id)) {
        return this.messageGuard.recordViolation(client);
      }
      this.broadcast(MSG.EMOTE, { playerId: client.sessionId, id: message.id });
    });

    this.registerHandler(MSG.SWITCH_CHEF, (client) => {
      if (this.phase !== 'playing') return;
      if (!this.isSoloMode) return;
      const current = this.activeChefMap[client.sessionId];
      if (current) {
        const other = current.endsWith('_1') ? client.sessionId + '_2' : client.sessionId + '_1';

        // C03: "khi đổi chef chef cũ đứng yên và hết tín hiệu act"
        // Insert a dummy input for the current chef to clear act and movement
        const stopInput: any = {
          mx: 0, my: 0, act: false, interact: false, dash: false, throw: false,
          seq: -1 // special negative seq to just reset state immediately in gameLoop? Or we can just let client send the next input to the new chef, and the old chef naturally stops.
        };
        // wait, we can just clear the queue for the old chef
        this.inputQueues[current]?.clear();

        // Also we must reset the act flag in player state directly!
        if (this.gameState) {
          const oldPlayer = this.gameState.players.find(p => p.id === current);
          if (oldPlayer) oldPlayer.acting = false;
        }

        this.activeChefMap[client.sessionId] = other;
        this.broadcast(MSG.SNAPSHOT, toSnapshot(this.gameState!)); // send snapshot immediately to update activeChefId? Wait, activeChefId needs to be in snapshot.
      }
    });

    this.registerHandler(MSG.SET_SOLO, (client, message) => {
      if (this.phase !== 'lobby') return;
      if (client.sessionId !== this.hostId) return;
      if (!isRecord(message) || typeof message.solo !== 'boolean') {
        return this.messageGuard.recordViolation(client);
      }
      if (message.solo && this.members.length > 1) return;
      this.isSoloMode = message.solo;
      this.broadcastLobby();
    });

    this.registerHandler(MSG.SET_COSMETIC, (client, message) => {
      const m = this.members.find(x => x.id === client.sessionId);
      if (!m) return;
      const sanitized = sanitizeCosmetic(message);
      const requestedHex = PLAYER_COLORS[sanitized.color] ?? PLAYER_COLORS[0]!;
      const usedByOthers = this.members.filter(x => x.id !== client.sessionId).map(x => x.color);
      if (!usedByOthers.includes(requestedHex)) {
        m.color = requestedHex;
        m.cosmetic = { ...sanitized, color: sanitized.color };
      } else {
        const curIdx = PLAYER_COLORS.indexOf(m.color);
        m.cosmetic = { ...sanitized, color: curIdx >= 0 ? curIdx : 0 };
      }
      this.broadcastLobby();
    });

    // WebRTC Voice Chat signaling relay & speaking state broadcast
    this.onMessage(MSG.VOICE_SIGNAL, (client, message) => {
      if (!isRecord(message) || typeof message.toId !== 'string' || !message.signal) return;
      try {
        if (JSON.stringify(message).length > 16384) return;
      } catch {
        return;
      }
      const targetClient = this.clients.find(c => c.sessionId === message.toId);
      if (targetClient) {
        targetClient.send(MSG.VOICE_SIGNAL, {
          fromId: client.sessionId,
          signal: message.signal,
        });
      }
    });

    this.onMessage(MSG.VOICE_STATE, (client, message) => {
      if (!isRecord(message)) return;
      this.broadcast(MSG.VOICE_STATE, {
        playerId: client.sessionId,
        muted: Boolean(message.muted),
        speaking: Boolean(message.speaking),
      });
    });

    logger.info(`Room ${this.roomId} created with options:`, options);
  }

  private startGame() {
    this.setPhase('playing');

    const level = getLevel(this.levelId);
    if (!level) {
      logger.error(`Level ${this.levelId} not found`);
      this.backToLobby();
      return;
    }

    const playerIds = this.isSoloMode
      ? this.members.flatMap(m => [`${m.id}_1`, `${m.id}_2`])
      : this.members.map(m => m.id);

    if (this.isSoloMode) {
      this.members.forEach(m => {
        this.activeChefMap[m.id] = `${m.id}_1`;
      });
      // also assign ownerId to the players? createGameState doesn't know about ownerId... wait, we will patch createGameState if needed.
    } else {
      this.activeChefMap = {};
    }

    this.gameState = createGameState(level, playerIds, Date.now());
    if (this.isSoloMode) {
      for (const p of this.gameState.players) {
        // ID looks like "abc_1" or "abc_2"
        p.ownerId = p.id.slice(0, -2);
      }
    }

    if (DEBUG_DURATION !== undefined && DEBUG_DURATION > 0) {
      this.gameState.timeLeft = DEBUG_DURATION * 1000;
    }

    this.inputQueues = {};
    for (const id of playerIds) {
      this.inputQueues[id] = new InputQueue();
    }

    this.broadcast(MSG.SNAPSHOT, toSnapshot(this.gameState));

    this.gameLoop = new GameLoop(
      this.gameState,
      this.inputQueues,
      (events) => {
        for (const e of events) this.broadcast(MSG.EVENT, e);
      },
      (snapshot: any) => {
        if (snapshot && this.isSoloMode && this.members.length > 0) {
          const clientId = this.members[0]?.id;
          if (clientId) {
            snapshot.activeChefId = this.activeChefMap[clientId];
          }
        }
        this.broadcast(MSG.SNAPSHOT, snapshot);
      },
      () => this.endGame(),
      (playerId) => {
        const baseId = this.isSoloMode ? playerId.slice(0, -2) : playerId;
        return !!this.members.find((m) => m.id === baseId)?.connected;
      },
      () => this.members.some((m) => m.connected)
    );

    this.setSimulationInterval((dt) => {
      this.gameLoop?.advance(dt);
    });
  }

  private endGame() {
    if (this.phase !== 'playing' || !this.gameState) return;
    this.setPhase('finished');
    this.finishedAt = Date.now();
    this.setSimulationInterval(undefined);
    this.broadcast(MSG.RESULTS, buildResults(this.gameState));

    this.backToLobbyTimer = this.clock.setTimeout(() => {
      this.backToLobby();
    }, 60000);
  }

  private backToLobby() {
    this.setSimulationInterval(undefined);
    this.gameState = undefined;
    this.gameLoop = undefined;
    this.inputQueues = {};
    if (this.backToLobbyTimer) {
      this.backToLobbyTimer.clear();
      this.backToLobbyTimer = undefined;
    }
    if (this.countdownTimer) {
      this.countdownTimer.clear();
      this.countdownTimer = undefined;
    }
    for (const m of this.members) {
      m.ready = false;
    }
    this.setPhase('lobby');
  }

  override onAuth(client: Client, options: unknown) {
    if (isRecord(options) && options.version !== PROTOCOL_VERSION) {
      throw new ServerError(4000, 'version_mismatch');
    }
    if (this.phase !== 'lobby') {
      throw new ServerError(4001, 'game_in_progress');
    }
    return true;
  }

  override onJoin(client: Client, options: unknown) {

    const reqCosmetic = sanitizeCosmetic(isRecord(options) ? options.cosmetic : undefined);
    const reqColorHex = PLAYER_COLORS[reqCosmetic.color] ?? PLAYER_COLORS[0]!;
    const usedColors = this.members.map(m => m.color);
    const assignedColor = !usedColors.includes(reqColorHex)
      ? reqColorHex
      : (PLAYER_COLORS.find(c => !usedColors.includes(c)) ?? PLAYER_COLORS[0]!);
    const assignedColorIdx = PLAYER_COLORS.indexOf(assignedColor);

    const member: Member = {
      id: client.sessionId,
      name: sanitizeName(isRecord(options) ? options.name : undefined),
      color: assignedColor,
      ready: false,
      connected: true,
      joinedAt: Date.now(),
      cosmetic: { ...reqCosmetic, color: assignedColorIdx >= 0 ? assignedColorIdx : 0 }
    };

    this.members.push(member);
    if (this.members.length === 1) {
      this.hostId = member.id;
    }

    if (this.members.length > 1 && this.isSoloMode) {
      this.isSoloMode = false;
    }

    this.broadcastLobby();
    logger.info(`Client ${client.sessionId} joined ${this.roomId}`);
  }

  override async onLeave(client: Client, consented: boolean) {
    try {
      if (this.shouldAwaitReconnection(client, consented)) {
        this.markDisconnected(client.sessionId);
        try {
          await this.allowReconnection(client, RECONNECT_SECONDS);
          this.markReconnected(client);
          return;
        } catch (error) {
          logger.info(`Reconnect expired for ${client.sessionId}: ${String(error)}`);
        }
      }
      this.removeMember(client.sessionId);
    } catch (error) {
      logger.error(`Leave handler failed for ${client.sessionId}: ${String(error)}`);
      this.sendError(client, 'leave_failed', 'Không thể xử lý việc rời phòng.');
    }
  }

  override onDispose() {
    this.emptyRoomTimer?.clear();
    this.countdownTimer?.clear();
    logger.info(`Room ${this.roomId} disposed`);
  }

  private setPhase(phase: Phase, countdown?: number) {
    this.phase = phase;
    this.broadcast(MSG.PHASE, countdown === undefined ? { phase } : { phase, countdown });
    this.broadcastLobby();
  }

  private broadcastLobby() {
    try {
      this.broadcast(MSG.LOBBY, {
        code: this.roomId,
        phase: this.phase,
        levelId: this.levelId,
        hostId: this.hostId,
        players: this.members,
        solo: this.isSoloMode
      });
    } catch {
      // Ignore broadcast errors (e.g., room is disposing)
    }
  }

  private registerHandler(type: MessageType, handler: (client: Client, message: unknown) => void): void {
    this.onMessage(type, (client, message) => {
      try {
        if (!this.messageGuard.isAllowed(client, type, message)) return;
        handler(client, message);
      } catch (error) {
        logger.error(`Message ${type} failed for ${client.sessionId}: ${String(error)}`);
        this.sendError(client, 'message_failed', 'Yêu cầu không thể được xử lý.');
      }
    });
  }



  private shouldAwaitReconnection(client: Client, consented: boolean): boolean {
    return !consented && !this.forcedLeaves.delete(client.sessionId)
      && (this.phase === 'countdown' || this.phase === 'playing');
  }

  private markDisconnected(sessionId: string): void {
    const member = this.members.find((candidate) => candidate.id === sessionId);
    if (!member) return;
    member.connected = false;
    this.inputQueues[sessionId]?.clear();
    this.inputQueues[`${sessionId}_1`]?.clear();
    this.inputQueues[`${sessionId}_2`]?.clear();
    this.broadcastLobby();
    this.scheduleEmptyRoomDisposal();
  }

  private markReconnected(client: Client): void {
    const member = this.members.find((candidate) => candidate.id === client.sessionId);
    if (!member) return;
    member.connected = true;
    this.emptyRoomTimer?.clear();
    this.emptyRoomTimer = undefined;
    this.broadcastLobby();
    client.send(MSG.LOBBY, this.lobbyPayload());
    client.send(MSG.PHASE, { phase: this.phase });
    if (this.gameState) {
      const snap: any = toSnapshot(this.gameState);
      if (this.isSoloMode && this.activeChefMap[client.sessionId]) {
        snap.activeChefId = this.activeChefMap[client.sessionId];
      }
      client.send(MSG.SNAPSHOT, snap);
    }
  }

  private removeMember(sessionId: string): void {
    this.members = this.members.filter((member) => member.id !== sessionId);
    this.messageGuard.cleanup(sessionId);
    delete this.inputQueues[sessionId];
    delete this.inputQueues[`${sessionId}_1`];
    delete this.inputQueues[`${sessionId}_2`];
    delete this.activeChefMap[sessionId];
    if (this.gameState) {
      this.gameState.players = this.gameState.players.filter(
        (player) => player.id !== sessionId && player.ownerId !== sessionId && !player.id.startsWith(`${sessionId}_`)
      );
    }
    if (this.hostId === sessionId) this.assignHost();
    if (this.members.length > 0) this.broadcastLobby();
    else this.disconnect();
    logger.info(`Client ${sessionId} left ${this.roomId}`);
  }

  private assignHost(): void {
    const nextHost = [...this.members].sort((a, b) => a.joinedAt - b.joinedAt)[0];
    this.hostId = nextHost?.id ?? '';
  }

  private scheduleEmptyRoomDisposal(): void {
    if (this.members.some((member) => member.connected) || this.emptyRoomTimer) return;
    this.emptyRoomTimer = this.clock.setTimeout(() => {
      if (!this.members.some((member) => member.connected)) this.disconnect();
    }, RECONNECT_SECONDS * 1000);
  }

  private lobbyPayload() {
    return {
      code: this.roomId,
      phase: this.phase,
      levelId: this.levelId,
      hostId: this.hostId,
      players: this.members,
      solo: this.isSoloMode,
    };
  }

  private sendError(client: Client, code: string, message: string): void {
    try {
      client.send(MSG.ERROR, { code, message });
    } catch (error) {
      logger.warn(`Could not send error to ${client.sessionId}: ${String(error)}`);
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
