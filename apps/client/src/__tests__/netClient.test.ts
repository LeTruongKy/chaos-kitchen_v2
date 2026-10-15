import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { NetClient, screenForPhase } from '../net/NetClient';
import { createStore, type AppState } from '../state/store';
import { spawn, type ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let serverProc: ChildProcess;

beforeAll(async () => {
  return new Promise<void>((resolve, reject) => {
    const serverPath = path.resolve(__dirname, '../../../../apps/server/src/index.ts');
    const tsxPath = path.resolve(__dirname, '../../../../apps/server/node_modules/tsx/dist/cli.mjs');
    serverProc = spawn('node', [tsxPath, serverPath], {
      env: { ...process.env, PORT: '2569' },
      shell: true,
    });
    serverProc.stdout?.on('data', (data) => {
      if (data.toString().includes('listening on')) {
        vi.stubEnv('VITE_SERVER_URL', 'ws://localhost:2569');
        resolve();
      }
    });
    serverProc.stderr?.on('data', (data) => {
      console.error('Server err:', data.toString());
    });
    serverProc.on('error', reject);
    serverProc.on('close', (code) => {
      if (code !== 0 && code !== null) {
        reject(new Error(`Server exited with code ${code}`));
      }
    });
  });
}, 15000);

afterAll(() => {
  if (serverProc) serverProc.kill();
});

import { getServerUrl } from '../net/serverUrl';

describe('T17 netClient', () => {
  it('connects two clients, readies, starts and receives snapshots', async () => {
    const storeA = createStore<AppState>({ screen: 'menu', phase: 'lobby', name: '', roomCode: '', lobby: null, results: null, error: null, ping: 0, loading: false });
    const clientA = new NetClient(storeA);
    await clientA.createRoom('PlayerA');
    expect(storeA.get().roomCode).toBeTruthy();
    const code = storeA.get().roomCode;

    const storeB = createStore<AppState>({ screen: 'menu', phase: 'lobby', name: '', roomCode: '', lobby: null, results: null, error: null, ping: 0, loading: false });
    const clientB = new NetClient(storeB);
    await clientB.joinByCode('PlayerB', code);

    // Wait for B to receive lobby
    await new Promise(resolve => setTimeout(resolve, 500));

    expect(storeA.get().lobby?.players.length).toBe(2);
    expect(storeB.get().lobby?.players.length).toBe(2);

    clientB.ready(true);
    
    // Wait for A to receive B's ready status
    await new Promise(resolve => setTimeout(resolve, 500));
    expect(storeA.get().lobby?.players.find(p => p.name === 'PlayerB')?.ready).toBe(true);

    let eventReceived = false;
    clientA.on('event', (e) => {
      if (typeof e === 'object' && e !== null) {
        eventReceived = true;
      }
    });

    let lastY = 0;
    clientA.on('snapshot', (snap) => {
      const myPlayer = snap.players.find(p => p.id === clientA.sessionId);
      if (myPlayer) {
        lastY = myPlayer.y;
      }
    });

    clientA.start();

    // After start, we expect countdown
    await new Promise(resolve => setTimeout(resolve, 200));
    expect(storeA.get().phase).toBe('countdown');
    expect(storeA.get().screen).toBe('game');

    // Wait until playing phase (COUNTDOWN_SECONDS = 3s + delay)
    await new Promise(resolve => {
      const check = setInterval(() => {
        if (storeA.get().phase === 'playing') {
          clearInterval(check);
          resolve(null);
        }
      }, 100);
    });

    expect(storeA.get().phase).toBe('playing');
    expect(storeA.get().screen).toBe('game');

    const startY = lastY;

    let seq = 1;
    const interval = setInterval(() => {
      clientA.sendInput({ seq: seq++, act: false, mx: 0, my: -1, interact: true, dash: false, throw: false } as any);
    }, 30);

    // Wait up to 2 seconds for y to change
    await new Promise(resolve => {
      let loops = 0;
      const check = setInterval(() => {
        loops++;
        if (lastY !== startY || loops > 20) {
          clearInterval(check);
          resolve(null);
        }
      }, 100);
    });
    
    clearInterval(interval);
    clientA.sendInput({ seq: seq++, act: false, mx: 0, my: 0, interact: false, dash: false, throw: false } as any);

    expect(lastY).not.toBe(startY);

    clientA.leave();
    clientB.leave();
  });

  it('screenForPhase returns correct screens', () => {
    expect(screenForPhase('lobby', false)).toBe('lobby');
    expect(screenForPhase('countdown', false)).toBe('game');
    expect(screenForPhase('playing', false)).toBe('game');
    expect(screenForPhase('finished', false)).toBe('game');
    expect(screenForPhase('finished', true)).toBe('results');
  });

  it('updates store phase correctly when receiving messages', () => {
    const store = createStore<AppState>({ screen: 'menu', phase: 'lobby', name: '', roomCode: '', lobby: null, results: null, error: null, ping: 0, loading: false });
    const client = new NetClient(store);
    
    // Simulate room.onMessage via private method if possible, or just test logic via mock room
    const mockRoom = {
      sessionId: 's1',
      reconnectionToken: 'token',
      onMessage: vi.fn(),
      onLeave: vi.fn(),
      onError: vi.fn(),
      send: vi.fn()
    };
    
    // Typecast to bypass private/readonly
    (client as any).attachRoomHandlers(mockRoom as any);
    
    // Get handlers
    const phaseHandler = mockRoom.onMessage.mock.calls.find(c => c[0] === 'phase')![1];
    const lobbyHandler = mockRoom.onMessage.mock.calls.find(c => c[0] === 'lobby')![1];

    // Receive phase playing
    phaseHandler({ phase: 'playing' });
    expect(store.get().phase).toBe('playing');
    expect(store.get().screen).toBe('game');
    
    // Receive lobby while playing
    lobbyHandler({ code: 'ABCD', phase: 'playing', levelId: 'level_1', hostId: 'h1', players: [] });
    expect(store.get().phase).toBe('playing');
    expect(store.get().screen).toBe('game');
  });
});
