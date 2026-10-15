import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { KitchenRoom } from '../rooms/KitchenRoom.js';
import { Client } from '@colyseus/core';
import { RESULTS_SECONDS, SNAPSHOT_EVERY_N_TICKS, MSG, COUNTDOWN_SECONDS } from '@kitchen/core';

describe('Game Loop', () => {
  const createMockClient = (id: string): Client => {
    return {
      sessionId: id,
      id: id,
      send: vi.fn(),
      error: vi.fn(),
      leave: vi.fn(),
    } as any as Client;
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('should start game, run simulation and end game', async () => {
    const room = new KitchenRoom();
    room.roomId = 'GAME';
    room.broadcast = vi.fn();
    
    // Mock room internal clock and setSimulationInterval
    let simCallback: Function;
    let simInterval: number;
    room.setSimulationInterval = vi.fn((cb, ms) => {
      simCallback = cb;
      simInterval = ms;
    }) as any;

    room.clock = {
      tick: vi.fn(),
      setInterval: vi.fn((cb, ms) => {
        const id = setInterval(cb, ms);
        return { clear: () => clearInterval(id) };
      }),
      setTimeout: vi.fn((cb, ms) => {
        const id = setTimeout(cb, ms);
        return { clear: () => clearTimeout(id) };
      })
    } as any;
    
    const handlers: Record<string, Function> = {};
    room.onMessage = (type, handler) => {
      handlers[type as string] = handler as Function;
    };
    
    await room.onCreate({});

    const c1 = createMockClient('c1');
    room.onJoin(c1, { name: 'P1' });

    // P1 ready
    handlers[MSG.READY]!(c1, { ready: true });
    
    // P1 start
    handlers[MSG.START]!(c1, {});
    
    expect(room.phase).toBe('countdown');
    expect(room.broadcast).toHaveBeenCalledWith(MSG.PHASE, { phase: 'countdown', countdown: 3 });
    
    vi.advanceTimersByTime(1000);
    expect(room.broadcast).toHaveBeenCalledWith(MSG.PHASE, { phase: 'countdown', countdown: 2 });
    
    vi.advanceTimersByTime(1000);
    expect(room.broadcast).toHaveBeenCalledWith(MSG.PHASE, { phase: 'countdown', countdown: 1 });
    
    // Fast forward remaining countdown (1s)
    vi.advanceTimersByTime(1000);
    
    expect(room.phase).toBe('playing');
    expect(room.broadcast).toHaveBeenCalledWith(MSG.PHASE, { phase: 'playing' });
    expect(room.setSimulationInterval).toHaveBeenCalled();
    expect(room.gameState).toBeDefined();
    
    // Simulate inputs
    // Simulate inputs (dash)
    handlers[MSG.INPUT]!(c1, { seq: 1, mx: 1, my: 0, act: false, interact: false, dash: true, throw: false });
    
    // Run 1 tick
    simCallback!(34);
    
    expect(room.gameState!.players[0]?.dashT).toBeGreaterThan(0);
    expect(room.gameState!.players[0]?.vx).toBeGreaterThan(0);

    // Wait for dash to finish
    simCallback!(200);

    // Give player an item to throw
    room.gameState!.players[0]!.held = { type: 'ingredient', id: 'tomato', state: 'raw' };
    
    handlers[MSG.INPUT]!(c1, { seq: 2, mx: 1, my: 0, act: false, interact: false, dash: false, throw: true });
    simCallback!(100);
    
    expect(room.gameState!.projectiles.length).toBe(1);
    expect(room.gameState!.projectiles[0]?.item.id).toBe('tomato');
    expect(room.gameState!.players[0]!.held).toBeNull();
    
    // Fast forward to end
    room.gameState!.ended = true; // force end
    simCallback!(100);
    
    expect(room.phase).toBe('finished');
    expect(room.broadcast).toHaveBeenCalledWith(MSG.RESULTS, expect.anything());
    
    // 60s auto back to lobby
    vi.advanceTimersByTime(60000);
    expect(room.phase).toBe('lobby');
    expect(room.gameState).toBeUndefined();
  });

  it('should respond to ping', async () => {
    const room = new KitchenRoom();
    const handlers: Record<string, Function> = {};
    room.onMessage = (type, handler) => {
      handlers[type as string] = handler as Function;
    };
    await room.onCreate({});
    
    const c1 = createMockClient('c1');
    handlers[MSG.PING]!(c1, { t: 42 });
    expect(c1.send).toHaveBeenCalledWith(MSG.PONG, { t: 42 });
  });

  it('should allow host to back_to_lobby after RESULTS_SECONDS', async () => {
    const room = new KitchenRoom();
    room.broadcast = vi.fn();
    room.clock = {
      tick: vi.fn(),
      setInterval: vi.fn(() => ({ clear: vi.fn() })),
      setTimeout: vi.fn(() => ({ clear: vi.fn() }))
    } as any;
    
    const handlers: Record<string, Function> = {};
    room.onMessage = (type, handler) => {
      handlers[type as string] = handler as Function;
    };
    await room.onCreate({});
    
    const c1 = createMockClient('c1');
    room.onJoin(c1, { name: 'P1' });
    
    // Mock state as finished
    room.phase = 'finished';
    room['finishedAt'] = Date.now();
    
    // Call back_to_lobby early
    vi.advanceTimersByTime(1000); // 1s
    handlers[MSG.BACK_TO_LOBBY]!(c1, {});
    expect(room.phase).toBe('finished'); // ignored
    
    // Call after RESULTS_SECONDS
    vi.advanceTimersByTime(RESULTS_SECONDS * 1000);
    handlers[MSG.BACK_TO_LOBBY]!(c1, {});
    expect(room.phase).toBe('lobby');
  });
});
