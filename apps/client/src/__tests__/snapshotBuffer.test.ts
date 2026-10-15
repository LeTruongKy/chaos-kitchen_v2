import { describe, it, expect } from 'vitest';
import { SnapshotBuffer } from '../game/net/SnapshotBuffer';
import { Snapshot } from '@kitchen/core';

function makeSnap(players: {id: string, x: number, y: number}[]): Snapshot {
  return {
    players: players.map(p => ({ ...p, fx: 0, fy: 1, held: null, acting: false })),
    tick: 0,
    timeLeft: 100,
    stations: [],
    orders: [],
    score: 0,
    served: 0,
    expired: 0
  } as unknown as Snapshot;
}

describe('SnapshotBuffer', () => {
  it('interpolates correctly between two snapshots', () => {
    const buffer = new SnapshotBuffer();
    buffer.push(makeSnap([{ id: 'p1', x: 0, y: 0 }]), 1000);
    buffer.push(makeSnap([{ id: 'p1', x: 10, y: 10 }]), 1100);

    const res = buffer.sample(1050);
    expect(res.players[0]?.x).toBe(5);
    expect(res.players[0]?.y).toBe(5);
  });

  it('handles extrapolation (after end)', () => {
    const buffer = new SnapshotBuffer();
    buffer.push(makeSnap([{ id: 'p1', x: 0, y: 0 }]), 1000);
    buffer.push(makeSnap([{ id: 'p1', x: 10, y: 10 }]), 1100);

    const res = buffer.sample(1150);
    expect(res.players[0]?.x).toBe(15);
    expect(res.players[0]?.y).toBe(15);
  });

  it('limits extrapolation if > 150ms', () => {
    const buffer = new SnapshotBuffer();
    buffer.push(makeSnap([{ id: 'p1', x: 0, y: 0 }]), 1000);
    buffer.push(makeSnap([{ id: 'p1', x: 10, y: 10 }]), 1100);

    const res = buffer.sample(1300); // 200ms after latest
    expect(res.players[0]?.x).toBe(10); // capped at latest
  });

  it('handles before start', () => {
    const buffer = new SnapshotBuffer();
    buffer.push(makeSnap([{ id: 'p1', x: 0, y: 0 }]), 1000);
    buffer.push(makeSnap([{ id: 'p1', x: 10, y: 10 }]), 1100);

    const res = buffer.sample(900);
    expect(res.players[0]?.x).toBe(0);
  });
});
