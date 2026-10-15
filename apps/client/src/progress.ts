export interface LevelProgress {
  stars: number;
  score: number;
}

export interface ProgressData {
  levels: Record<string, LevelProgress>;
}

const STORAGE_KEY = 'chaos-kitchen-progress';

export function loadProgress(): ProgressData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to load progress', e);
  }
  return { levels: {} };
}

export function saveProgress(data: ProgressData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save progress', e);
  }
}

export function clearProgress() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear progress', e);
  }
}

export function updateLevelProgress(levelId: string, stars: number, score: number) {
  const data = loadProgress();
  const current = data.levels[levelId];
  if (!current) {
    data.levels[levelId] = { stars, score };
  } else {
    data.levels[levelId] = {
      stars: Math.max(current.stars, stars),
      score: Math.max(current.score, score)
    };
  }
  saveProgress(data);
}
