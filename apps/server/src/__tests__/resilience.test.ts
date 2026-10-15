import { Client } from '@colyseus/core';
import { describe, expect, it, vi } from 'vitest';
import { KitchenRoom } from '../rooms/KitchenRoom.js';

function mockClient(sessionId: string): Client {
  return { sessionId, id: sessionId, send: vi.fn(), error: vi.fn(), leave: vi.fn() } as unknown as Client;
}

describe('KitchenRoom resilience', () => {
  it('kicks a client after more than 50 rate-limit violations', async () => {
    const room = new KitchenRoom();
    const handlers: Record<string, (client: Client, message: unknown) => void> = {};
    room.onMessage = ((type: string, handler: (client: Client, message: unknown) => void) => {
      handlers[type] = handler;
    }) as typeof room.onMessage;
    await room.onCreate({});

    const client = mockClient('spam');
    for (let index = 0; index < 111; index++) {
      handlers.input?.(client, { seq: index, mx: 0, my: 0, act: false, interact: false });
    }

    expect(client.leave).toHaveBeenCalledWith(4000, 'too_many_invalid_messages');
  });

  it('rate limits emotes', async () => {
    const room = new KitchenRoom();
    room.broadcast = vi.fn();
    const handlers: Record<string, (client: Client, message: unknown) => void> = {};
    room.onMessage = ((type: string, handler: (client: Client, message: unknown) => void) => {
      handlers[type] = handler;
    }) as typeof room.onMessage;
    await room.onCreate({});

    const client = mockClient('emote_spam');
    
    // First emote should broadcast
    handlers.emote?.(client, { id: 0 });
    expect(room.broadcast).toHaveBeenCalledWith('emote', { playerId: 'emote_spam', id: 0 });
    
    // Second emote immediately should be rate limited and not broadcast
    (room.broadcast as any).mockClear();
    handlers.emote?.(client, { id: 1 });
    expect(room.broadcast).not.toHaveBeenCalled();
  });

  it('drops an oversized message without crashing the room', async () => {
    const room = new KitchenRoom();
    const handlers: Record<string, (client: Client, message: unknown) => void> = {};
    room.onMessage = ((type: string, handler: (client: Client, message: unknown) => void) => {
      handlers[type] = handler;
    }) as typeof room.onMessage;
    await room.onCreate({});

    const client = mockClient('large-payload');
    expect(() => handlers.input?.(client, { data: 'x'.repeat(1025) })).not.toThrow();
    expect(client.leave).not.toHaveBeenCalled();
  });

  it('marks an interrupted player connected again after a successful reconnect', async () => {
    const room = new KitchenRoom();
    room.broadcast = vi.fn();
    room.disconnect = vi.fn() as typeof room.disconnect;
    await room.onCreate({});
    const client = mockClient('returning');
    room.onJoin(client, { name: 'Chef' });
    room.phase = 'playing';
    room.allowReconnection = vi.fn().mockResolvedValue(client) as typeof room.allowReconnection;

    await room.onLeave(client, false);

    expect(room.members[0]?.connected).toBe(true);
    expect(client.send).toHaveBeenCalledWith('lobby', expect.objectContaining({ phase: 'playing' }));
    expect(client.send).toHaveBeenCalledWith('phase', { phase: 'playing' });
  });

  it('removes a player when the reconnect grace period expires', async () => {
    const room = new KitchenRoom();
    room.broadcast = vi.fn();
    room.disconnect = vi.fn() as typeof room.disconnect;
    await room.onCreate({});
    const client = mockClient('expired');
    room.onJoin(client, { name: 'Chef' });
    room.phase = 'playing';
    room.allowReconnection = vi.fn().mockRejectedValue(new Error('timed out')) as typeof room.allowReconnection;

    await room.onLeave(client, false);

    expect(room.members).toHaveLength(0);
  });

  it('transfers host when the disconnected host does not return', async () => {
    const room = new KitchenRoom();
    room.broadcast = vi.fn();
    await room.onCreate({});
    const host = mockClient('host');
    const nextHost = mockClient('next-host');
    room.onJoin(host, { name: 'Host' });
    room.onJoin(nextHost, { name: 'Next' });
    room.phase = 'playing';
    room.allowReconnection = vi.fn().mockRejectedValue(new Error('timed out')) as typeof room.allowReconnection;

    await room.onLeave(host, false);

    expect(room.hostId).toBe(nextHost.sessionId);
  });
});
