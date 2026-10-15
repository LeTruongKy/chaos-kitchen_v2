import { describe, it, expect } from 'vitest';
import { TokenBucket } from '../util/rateLimit.js';

describe('TokenBucket', () => {
  it('consumes tokens correctly', () => {
    const bucket = new TokenBucket(5, 1, 0); // cap 5, 1 token/sec, now 0
    expect(bucket.consume(1, 0)).toBe(true);
    expect(bucket.consume(4, 0)).toBe(true);
    expect(bucket.consume(1, 0)).toBe(false); // empty
  });

  it('refills tokens over time', () => {
    const bucket = new TokenBucket(5, 2, 0); // cap 5, 2 tokens/sec
    expect(bucket.consume(5, 0)).toBe(true);
    expect(bucket.consume(1, 0)).toBe(false);
    
    // Wait 500ms (0.5 sec) -> should refill 1 token
    expect(bucket.consume(1, 500)).toBe(true);
    expect(bucket.consume(1, 500)).toBe(false);

    // Wait 1000ms from 500 -> 1500ms -> should refill 2 tokens
    expect(bucket.consume(2, 1500)).toBe(true);
    expect(bucket.consume(1, 1500)).toBe(false);
  });

  it('does not exceed capacity', () => {
    const bucket = new TokenBucket(5, 10, 0); // cap 5
    bucket.consume(1, 0); // 4 left
    
    // Wait 10 seconds -> would refill 100 tokens, but cap is 5
    bucket.consume(1, 10000); 
    // Now it had 5, consumed 1, 4 left.
    expect(bucket.consume(4, 10000)).toBe(true);
    expect(bucket.consume(1, 10000)).toBe(false);
  });
});
