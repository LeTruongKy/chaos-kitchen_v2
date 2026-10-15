// mulberry32 returns a number between 0 and 1
export function nextRandom(state: number): { value: number; state: number } {
  const s = state + 0x6d2b79f5;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = t + Math.imul(t ^ (t >>> 7), 61 | t);
  const result = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value: result, state: s };
}

export function randomInt(state: number, min: number, max: number): { value: number; state: number } {
  const { value, state: newState } = nextRandom(state);
  return { value: Math.floor(value * (max - min + 1)) + min, state: newState };
}

export function pickWeighted<T>(state: number, items: T[], weights: number[]): { value: T; state: number } {
  const totalWeight = weights.reduce((acc, val) => acc + val, 0);
  const { value, state: newState } = nextRandom(state);
  const rand = value * totalWeight;
  let running = 0;
  for (let i = 0; i < items.length; i++) {
    const w = weights[i] as number;
    running += w;
    if (rand < running) {
      return { value: items[i] as T, state: newState };
    }
  }
  // Fallback to the last item
  return { value: items[items.length - 1] as T, state: newState };
}
