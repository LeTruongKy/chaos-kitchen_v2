import { describe, it, expect } from 'vitest';
import { sanitizeName } from '../util/sanitize.js';

describe('sanitizeName', () => {
  it('returns Player for non-string', () => {
    expect(sanitizeName(123)).toBe('Player');
    expect(sanitizeName(null)).toBe('Player');
  });

  it('returns Player for empty string', () => {
    expect(sanitizeName('')).toBe('Player');
    expect(sanitizeName('   ')).toBe('Player');
  });

  it('removes control characters', () => {
    expect(sanitizeName('Hello\x00World\n!')).toBe('HelloWorld!');
  });

  it('keeps emoji if they are not stripped (as per rule to keep printable) or strips them', () => {
    // Current regex strips control chars (\x00-\x1F). Emoji are preserved.
    expect(sanitizeName('Chef 👩‍🍳')).toBe('Chef 👩‍🍳');
  });

  it('trims whitespace and removes multiple spaces', () => {
    expect(sanitizeName('  Gordon    Ramsay  ')).toBe('Gordon Ramsay');
  });

  it('truncates to 16 characters', () => {
    expect(sanitizeName('12345678901234567890')).toBe('1234567890123456');
  });

  it('normalizes spaces and then truncates', () => {
    expect(sanitizeName('A long name with   too many chars')).toBe('A long name with');
  });

  it('preserves Vietnamese characters', () => {
    expect(sanitizeName('Nguyễn Văn A')).toBe('Nguyễn Văn A');
  });
});
