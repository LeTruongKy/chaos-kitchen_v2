import { Client } from '@colyseus/core';
import { TokenBucket } from '../util/rateLimit.js';

export class MessageGuard<T extends string | number | symbol> {
  private readonly rateLimits = new Map<string, Map<T, TokenBucket>>();
  private readonly violations = new Map<string, { count: number; startedAt: number }>();

  constructor(
    private readonly limits: Record<T, readonly [number, number]>,
    private readonly maxBytes: number,
    private readonly maxViolations: number,
    private readonly windowMs: number,
    private readonly onKick: (client: Client) => void
  ) {}

  isAllowed(client: Client, type: T, payload: unknown): boolean {
    if (!this.isSmallPayload(payload)) {
      this.recordViolation(client);
      return false;
    }
    const now = Date.now();
    let buckets = this.rateLimits.get(client.sessionId);
    if (!buckets) {
      buckets = new Map();
      this.rateLimits.set(client.sessionId, buckets);
    }
    let bucket = buckets.get(type);
    if (!bucket) {
      const [capacity, refillRate] = this.limits[type];
      bucket = new TokenBucket(capacity, refillRate, now);
      buckets.set(type, bucket);
    }
    if (bucket.consume(1, now)) return true;
    this.recordViolation(client);
    return false;
  }

  recordViolation(client: Client): void {
    const now = Date.now();
    const current = this.violations.get(client.sessionId);
    const violation = !current || now - current.startedAt >= this.windowMs
      ? { count: 1, startedAt: now }
      : { ...current, count: current.count + 1 };
    this.violations.set(client.sessionId, violation);
    if (violation.count > this.maxViolations) {
      this.onKick(client);
    }
  }

  private isSmallPayload(payload: unknown): boolean {
    try {
      return JSON.stringify(payload).length <= this.maxBytes;
    } catch {
      return false;
    }
  }

  cleanup(sessionId: string): void {
    this.rateLimits.delete(sessionId);
    this.violations.delete(sessionId);
  }
}
