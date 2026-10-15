import { describe, it, expect, vi } from 'vitest';
import { generateRoomCode } from '../rooms/roomCode.js';
import { ROOM_CODE_ALPHABET } from '@kitchen/core';

describe('generateRoomCode', () => {
  it('generates a 4-character code from the alphabet', () => {
    const code = generateRoomCode(() => false);
    expect(code.length).toBe(4);
    for (const char of code) {
      expect(ROOM_CODE_ALPHABET.includes(char)).toBe(true);
    }
  });

  it('avoids taken codes and tries again', () => {
    let attempts = 0;
    const isTaken = (code: string) => {
      attempts++;
      return attempts < 3; // First 2 codes are taken
    };
    const code = generateRoomCode(isTaken);
    expect(attempts).toBe(3);
    expect(code.length).toBe(4);
  });

  it('throws an error if it fails 50 times', () => {
    const isTaken = () => true;
    expect(() => generateRoomCode(isTaken)).toThrow('Failed to generate a unique room code');
  });
});
