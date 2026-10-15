import { Client, Room } from 'colyseus.js';
import { getLevel, parseLevel, PlayerInput, Snapshot, TileType, PROTOCOL_VERSION } from '@kitchen/core';

export interface BotOptions {
  url: string;
  code?: string;
  count: number;
  namePrefix: string;
  durationSec: number;
  create: boolean;
}

interface LobbyPayload { code: string; levelId: string; hostId: string; players: { id: string }[]; }
type Point = { x: number; y: number };

const DEFAULT_OPTIONS: BotOptions = {
  url: 'ws://localhost:2567', count: 1, namePrefix: 'Bot', durationSec: 180, create: false,
};

export function parseBotOptions(args: string[]): BotOptions {
  const result = { ...DEFAULT_OPTIONS };
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    const value = args[index + 1];
    if (arg === '--create') result.create = true;
    else if (arg === '--url' && value) { result.url = value; index++; }
    else if (arg === '--code' && value) { result.code = value; index++; }
    else if (arg === '--count' && value) { result.count = positiveInt(value, '--count'); index++; }
    else if (arg === '--name-prefix' && value) { result.namePrefix = value; index++; }
    else if (arg === '--duration-sec' && value) { result.durationSec = positiveInt(value, '--duration-sec'); index++; }
    else throw new Error(`Unknown or incomplete option: ${arg}`);
  }
  if (!result.create && !result.code) throw new Error('Use --code ABCD or --create.');
  return result;
}

function positiveInt(value: string, option: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${option} must be a positive integer.`);
  return parsed;
}

export function findPath(tiles: TileType[], width: number, start: Point, goal: Point): Point[] {
  const startKey = `${start.x},${start.y}`;
  const queue = [start];
  const previous = new Map<string, Point | null>([[startKey, null]]);
  while (queue.length) {
    const current = queue.shift()!;
    if (current.x === goal.x && current.y === goal.y) break;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const next = { x: current.x + dx, y: current.y + dy };
      const key = `${next.x},${next.y}`;
      if (next.x < 0 || next.y < 0 || next.x >= width || previous.has(key)) continue;
      if (tiles[next.y * width + next.x] !== 'floor') continue;
      previous.set(key, current); queue.push(next);
    }
  }
  const endKey = `${goal.x},${goal.y}`;
  if (!previous.has(endKey)) return [];
  const path: Point[] = [];
  for (let current: Point | null = goal; current; current = previous.get(`${current.x},${current.y}`) ?? null) path.unshift(current);
  return path;
}

class KitchenBot {
  private room?: Room;
  private snapshot?: Snapshot;
  private lobby?: LobbyPayload;
  private sequence = 0;
  private snapshots = 0;
  private errors = 0;
  private pingAt = 0;
  private ping = 0;
  private path: Point[] = [];
  private actingUntil = 0;
  private inputTimer?: ReturnType<typeof setInterval>;
  private reportTimer?: ReturnType<typeof setInterval>;

  constructor(private readonly client: Client, private readonly name: string, private readonly targetCount: number) {}

  async join(code?: string, create = false): Promise<string> {
    this.room = create
      ? await this.client.create('kitchen', { name: this.name, public: true, version: PROTOCOL_VERSION })
      : await this.client.joinById(code!, { name: this.name, version: PROTOCOL_VERSION });
    this.room.onMessage('lobby', (payload: LobbyPayload) => this.onLobby(payload));
    this.room.onMessage('snapshot', (snapshot: Snapshot) => { this.snapshot = snapshot; this.snapshots++; });
    this.room.onMessage('pong', (payload: { t: number }) => { this.ping = Date.now() - payload.t; });
    this.room.onMessage('error', () => { this.errors++; });
    this.room.onLeave(() => this.stop());
    this.room.send('ready', { ready: true });
    this.inputTimer = setInterval(() => this.sendInput(), 1000 / 30);
    this.reportTimer = setInterval(() => this.report(), 5000);
    return this.room.roomId;
  }

  startIfHost(): void {
    if (this.room && this.lobby?.hostId === this.room.sessionId && this.lobby.players.length >= this.targetCount) this.room.send('start', {});
  }

  private onLobby(lobby: LobbyPayload): void { this.lobby = lobby; this.startIfHost(); }

  private sendInput(): void {
    if (!this.room || !this.snapshot) return;
    const player = this.snapshot.players.find((candidate) => candidate.id === this.room!.sessionId);
    if (!player) return;
    const now = Date.now();
    if (!this.path.length) this.path = this.nextPath(player.x, player.y);
    const next = this.path[0];
    const mx = next ? Math.sign(next.x + 0.5 - player.x) as -1 | 0 | 1 : 0;
    const my = next ? Math.sign(next.y + 0.5 - player.y) as -1 | 0 | 1 : 0;
    if (next && Math.abs(next.x + 0.5 - player.x) < 0.2 && Math.abs(next.y + 0.5 - player.y) < 0.2) this.path.shift();
    const interact = !next;
    if (interact && Math.random() < 0.1) this.actingUntil = now + 3200;
    const input: PlayerInput = { seq: ++this.sequence, mx, my, interact, act: now < this.actingUntil, dash: false, throw: false };
    this.room.send('input', input);
    if (now - this.pingAt >= 5000) { this.pingAt = now; this.room.send('ping', { t: now }); }
  }

  private nextPath(x: number, y: number): Point[] {
    const level = getLevel(this.lobby?.levelId ?? 'level1');
    if (!level) return [];
    const parsed = parseLevel(level);
    const stations = parsed.stations.filter((station) => station.type !== 'counter');
    const station = stations[Math.floor(Math.random() * stations.length)];
    if (!station) return [];
    const start = { x: Math.floor(x), y: Math.floor(y) };
    const neighbors = [[0, 1], [0, -1], [1, 0], [-1, 0]].map(([dx, dy]) => ({ x: station.x + dx!, y: station.y + dy! }));
    return neighbors.map((goal) => findPath(parsed.tiles, parsed.width, start, goal)).find((path) => path.length > 0) ?? [];
  }

  private report(): void { console.log(`${this.name}: snapshots=${this.snapshots} ping=${this.ping}ms score=${this.snapshot?.score ?? 0} errors=${this.errors}`); }
  stop(): void { if (this.inputTimer) clearInterval(this.inputTimer); if (this.reportTimer) clearInterval(this.reportTimer); }
  async leave(): Promise<void> { this.stop(); await this.room?.leave(); }
}

export async function runBots(options: BotOptions): Promise<void> {
  const bots: KitchenBot[] = [];
  const first = new KitchenBot(new Client(options.url), `${options.namePrefix}1`, options.count);
  const code = await first.join(options.code, options.create);
  bots.push(first);
  console.log(`Room ${code}`);
  for (let index = 2; index <= options.count; index++) {
    const bot = new KitchenBot(new Client(options.url), `${options.namePrefix}${index}`, options.count);
    await bot.join(code); bots.push(bot);
  }
  first.startIfHost();
  await new Promise<void>((resolve) => setTimeout(resolve, options.durationSec * 1000));
  await Promise.all(bots.map((bot) => bot.leave()));
}

if (process.argv[1]?.endsWith('bot.ts')) runBots(parseBotOptions(process.argv.slice(2))).catch((error: unknown) => { console.error(error); process.exitCode = 1; });
