import { describe, expect, it } from 'vitest';
import { findPath, parseBotOptions } from '../../scripts/bot.js';

describe('bot helpers', () => {
  it('parses a room bot command', () => {
    expect(parseBotOptions(['--code', 'ABCD', '--count', '3', '--duration-sec', '10'])).toMatchObject({ code: 'ABCD', count: 3, durationSec: 10 });
  });

  it('requires a room code unless create mode is selected', () => {
    expect(() => parseBotOptions([])).toThrow('Use --code ABCD or --create.');
  });

  it('finds a shortest floor path with BFS', () => {
    const tiles = ['wall', 'wall', 'wall', 'floor', 'floor', 'wall', 'wall', 'floor', 'wall'] as const;
    expect(findPath([...tiles], 3, { x: 0, y: 1 }, { x: 1, y: 2 })).toEqual([{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 2 }]);
  });
});
