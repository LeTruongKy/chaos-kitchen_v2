import { ROOM_CODE_ALPHABET } from '@kitchen/core';

export function generateRoomCode(isTaken: (code: string) => boolean): string {
  for (let i = 0; i < 50; i++) {
    let code = '';
    for (let j = 0; j < 4; j++) {
      code += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
    }
    if (!isTaken(code)) {
      return code;
    }
  }
  throw new Error('Failed to generate a unique room code');
}
