export class TokenBucket {
  private capacity: number;
  private tokens: number;
  private refillRate: number; // tokens per second
  private lastRefill: number;

  constructor(capacity: number, refillRate: number, now: number) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillRate = refillRate;
    this.lastRefill = now;
  }

  consume(amount: number, now: number): boolean {
    this.refill(now);
    if (this.tokens >= amount) {
      this.tokens -= amount;
      return true;
    }
    return false;
  }

  private refill(now: number) {
    const elapsed = now - this.lastRefill;
    if (elapsed > 0) {
      const addedTokens = (elapsed * this.refillRate) / 1000;
      this.tokens = Math.min(this.capacity, this.tokens + addedTokens);
      this.lastRefill = now;
    }
  }
}
