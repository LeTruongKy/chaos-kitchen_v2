import { Snapshot } from '@kitchen/core';

export interface InterpPlayer {
  id: string;
  x: number;
  y: number;
  fx: number;
  fy: number;
  held: import('@kitchen/core').Item | null;
  acting: boolean;
  colorIndex: number;
}

export class SnapshotBuffer {
  private buffer: { state: Snapshot; recvTime: number }[] = [];

  public push(state: Snapshot, recvTime: number) {
    this.buffer.push({ state, recvTime });
    if (this.buffer.length > 10) {
      this.buffer.shift();
    }
  }

  public sample(renderTime: number): { snapshot: Snapshot | null; players: InterpPlayer[] } {
    if (this.buffer.length === 0) return { snapshot: null, players: [] };
    if (this.buffer.length === 1) return this.getPlain(this.buffer[0]!.state);

    let i = this.buffer.length - 1;
    while (i >= 0 && this.buffer[i]!.recvTime > renderTime) {
      i--;
    }

    if (i < 0) {
      // renderTime is older than all snapshots
      return this.getPlain(this.buffer[0]!.state);
    }

    if (i === this.buffer.length - 1) {
      // renderTime is newer than all snapshots
      const latest = this.buffer[i]!;
      if (renderTime - latest.recvTime > 150) {
        return this.getPlain(latest.state); // limit extrapolation
      }
      
      const prev = this.buffer[i - 1]!;
      const dt = latest.recvTime - prev.recvTime;
      if (dt === 0) return this.getPlain(latest.state);

      const t = (renderTime - prev.recvTime) / dt;
      return this.interpolate(prev.state, latest.state, t);
    }

    const s0 = this.buffer[i]!;
    const s1 = this.buffer[i + 1]!;
    const dt = s1.recvTime - s0.recvTime;
    if (dt === 0) return this.getPlain(s0.state);

    const t = (renderTime - s0.recvTime) / dt;
    return this.interpolate(s0.state, s1.state, t);
  }

  private getPlain(snapshot: Snapshot) {
    return {
      snapshot,
      players: snapshot.players.map((p, idx) => ({
        id: p.id,
        x: p.x,
        y: p.y,
        fx: p.fx,
        fy: p.fy,
        held: p.held,
        acting: p.acting,
        colorIndex: idx
      }))
    };
  }

  private interpolate(s0: Snapshot, s1: Snapshot, t: number) {
    const players: InterpPlayer[] = s1.players.map((p1, idx) => {
      const p0 = s0.players.find(p => p.id === p1.id);
      if (!p0) {
        return {
          id: p1.id,
          x: p1.x,
          y: p1.y,
          fx: p1.fx,
          fy: p1.fy,
          held: p1.held,
          acting: p1.acting,
          colorIndex: idx
        };
      }
      return {
        id: p1.id,
        x: p0.x + (p1.x - p0.x) * t,
        y: p0.y + (p1.y - p0.y) * t,
        fx: p1.fx,
        fy: p1.fy,
        held: p1.held,
        acting: p1.acting,
        colorIndex: idx
      };
    });
    return { snapshot: s1, players };
  }
}
