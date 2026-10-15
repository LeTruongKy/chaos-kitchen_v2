import { describe, it, expect, vi } from 'vitest';
import { PROTOCOL_VERSION } from '@kitchen/core';
import { KitchenRoom } from '../rooms/KitchenRoom.js';
import { Client } from '@colyseus/core';

describe('KitchenRoom Unit', () => {
  const createMockClient = (id: string): Client => {
    return {
      sessionId: id,
      id: id,
      send: vi.fn(),
      error: vi.fn(),
      leave: vi.fn(),
    } as any as Client;
  };

  it('rejects join with incorrect protocol version', () => {
    const room = new KitchenRoom();
    room.phase = 'lobby';
    const c1 = createMockClient('c1');
    expect(() => room.onAuth(c1, { version: 9999 })).toThrowError(/version_mismatch/);
    expect(() => room.onAuth(c1, { version: PROTOCOL_VERSION })).not.toThrow();
  });

  it('should initialize and assign host', async () => {
    const room = new KitchenRoom();
    room.roomId = 'A1B2';
    // Mock broadcast
    let broadcastLobbyCount = 0;
    room.broadcast = vi.fn((type: string, data: any) => {
      if (type === 'lobby') broadcastLobbyCount++;
    });

    // Client 1 joins
    const c1 = createMockClient('c1');
    room.onJoin(c1, { name: 'Player1' });

    expect(room.members.length).toBe(1);
    expect(room.hostId).toBe('c1');
    expect(room.broadcast).toHaveBeenCalledWith('lobby', expect.objectContaining({
      hostId: 'c1',
      players: expect.any(Array)
    }));

    // Client 2 joins
    const c2 = createMockClient('c2');
    room.onJoin(c2, { name: 'Player2' });
    expect(room.members.length).toBe(2);
    expect(room.members[0]!.color).not.toBe(room.members[1]!.color);

    // Client 1 leaves
    room.onLeave(c1, false);
    expect(room.members.length).toBe(1);
    expect(room.hostId).toBe('c2'); // Host migrated to c2

    // Max players logic is handled by matchmaker, but we can test internal maxClients
    expect(room.maxClients).toBe(4);
  });

  it('should process ready, select_level and start messages', async () => {
    const room = new KitchenRoom();
    room.roomId = 'TEST';
    room.broadcast = vi.fn();
    
    const handlers: Record<string, Function> = {};
    room.onMessage = (type, handler) => {
      handlers[type as string] = handler as Function;
    };
    
    await room.onCreate({});

    const c1 = createMockClient('c1');
    const c2 = createMockClient('c2');
    
    room.onJoin(c1, { name: 'P1' });
    room.onJoin(c2, { name: 'P2' });

    expect(room.hostId).toBe('c1');

    // ready message
    handlers['ready']!(c2, { ready: true });
    expect(room.members.find(m => m.id === 'c2')?.ready).toBe(true);

    // select_level message (from non-host, should be ignored)
    handlers['select_level']!(c2, { levelId: 'level99' });
    expect(room.levelId).toBe('level1');

    // select_level message (from host)
    handlers['select_level']!(c1, { levelId: 'level2' });
    expect(room.levelId).toBe('level2');

    // start message (from non-host, ignored)
    handlers['start']!(c2, {});
    expect(room.phase).toBe('lobby');

    // start message (from host)
    vi.useFakeTimers();
    // mock the start transition properly by adding clock to room
    room.clock = {
      setInterval: vi.fn((cb, ms) => {
        const id = setInterval(cb, ms);
        return { clear: () => clearInterval(id) };
      }),
      setTimeout: vi.fn((cb, ms) => {
        const id = setTimeout(cb, ms);
        return { clear: () => clearTimeout(id) };
      }),
      tick: vi.fn()
    } as any;
    
    handlers['start']!(c1, {});
    expect(room.phase).toBe('countdown');
    
    vi.advanceTimersByTime(3000);
    expect(room.phase).toBe('playing');
    vi.useRealTimers();
  });

  it('rejects start with too_many_players when member count exceeds level.maxPlayers', async () => {
    const core = await import('@kitchen/core');
    const baseLevel = core.getLevel('level1')!;
    const mockLevel = { ...baseLevel, maxPlayers: 2 };
    const getLevelSpy = vi.spyOn(core, 'getLevel').mockReturnValue(mockLevel as any);

    const room = new KitchenRoom();
    room.roomId = 'MAXP';
    room.broadcast = vi.fn();
    
    const handlers: Record<string, Function> = {};
    room.onMessage = (type, handler) => {
      handlers[type as string] = handler as Function;
    };
    await room.onCreate({});

    const c1 = createMockClient('c1');
    const c2 = createMockClient('c2');
    const c3 = createMockClient('c3');

    room.onJoin(c1, { name: 'P1' });
    room.onJoin(c2, { name: 'P2' });
    room.onJoin(c3, { name: 'P3' });

    handlers['ready']!(c2, { ready: true });
    handlers['ready']!(c3, { ready: true });

    handlers['start']!(c1, {});

    expect(c1.send).toHaveBeenCalledWith('error', {
      code: 'too_many_players',
      message: 'This map allows up to 2 players'
    });
    expect(room.phase).toBe('lobby');

    getLevelSpy.mockRestore();
  });

  it('sanitizes invalid cosmetics to defaults and broadcasts valid cosmetics', async () => {
    const room = new KitchenRoom();
    room.roomId = 'COSM';
    let broadcastPayload: any = null;
    room.broadcast = vi.fn((type: string, data: any) => {
      if (type === 'lobby') broadcastPayload = data;
    });

    const handlers: Record<string, Function> = {};
    room.onMessage = (type, handler) => {
      handlers[type as string] = handler as Function;
    };
    await room.onCreate({});

    const c1 = createMockClient('c1');
    // Client joins with invalid/wild cosmetic
    room.onJoin(c1, {
      name: 'P1',
      cosmetic: { color: 99, hat: 'illegal', species: -5 }
    });

    expect(broadcastPayload).not.toBeNull();
    const p1 = broadcastPayload.players.find((p: any) => p.id === 'c1');
    // Should be sanitized to defaults { color: 0, hat: 0, species: 0 }
    expect(p1.cosmetic).toEqual({ color: 0, hat: 0, species: 0 });

    // Client sends valid set_cosmetic
    handlers['set_cosmetic']!(c1, { color: 2, hat: 1, species: 1 });
    const p1Updated = broadcastPayload.players.find((p: any) => p.id === 'c1');
    expect(p1Updated.cosmetic).toEqual({ color: 2, hat: 1, species: 1 });

    // Client 2 joins with same color: server reassigns duplicate color
    const c2 = createMockClient('c2');
    room.onJoin(c2, {
      name: 'P2',
      cosmetic: { color: 2, hat: 2, species: 0 }
    });
    const p2 = broadcastPayload.players.find((p: any) => p.id === 'c2');
    expect(p2.cosmetic.color).not.toBe(2);
    expect(p2.cosmetic.hat).toBe(2);
    expect(p2.cosmetic.species).toBe(0);
  });
});


