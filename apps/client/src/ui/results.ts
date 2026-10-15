import type { AppState } from '../state/store';
import type { ResultsPayload } from '../state/types';
import type { NetClient } from '../net/NetClient';
import { RESULTS_SECONDS, PLAYABLE_LEVELS, getLevel } from '@kitchen/core';
import { sfx } from '../game/audio/Sfx';
import { RECIPE_GUIDE_DATA } from './recipeGuide';
import { updateLevelProgress } from '../progress';
import './results.css';

const LEVEL_STARS_STORAGE_KEY = 'ck_level_stars';

export function getSavedLevelStars(): Record<string, number> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LEVEL_STARS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, number>;
  } catch {
    return {};
  }
}

export function saveLevelStars(levelId: string, stars: number): void {
  if (typeof localStorage === 'undefined' || !levelId) return;
  try {
    const current = getSavedLevelStars();
    const prev = current[levelId] ?? 0;
    if (stars >= prev) {
      current[levelId] = stars;
      localStorage.setItem(LEVEL_STARS_STORAGE_KEY, JSON.stringify(current));
    }
  } catch {
    // Ignore storage errors
  }
}

export function mountResults(
  root: HTMLElement,
  state: AppState,
  netClient: NetClient
): () => void {
  const container = document.createElement('div');
  container.className = 'results-container';

  const overlay = document.createElement('div');
  overlay.className = 'results-overlay';
  container.appendChild(overlay);

  const dialog = document.createElement('div');
  dialog.className = 'results-dialog';
  container.appendChild(dialog);

  const results: ResultsPayload = state.results ?? {
    score: 0,
    stars: 0,
    served: 0,
    expired: 0,
    maxStreak: 0,
    servedByPlayer: {},
  };

  const currentLevelId = state.lobby?.levelId || 'level1';
  const currentLevel = getLevel(currentLevelId) || PLAYABLE_LEVELS[0];
  const thresholds = currentLevel?.stars ?? [40, 100, 160];

  // Save earned stars to localStorage (both legacy and progress store)
  saveLevelStars(currentLevelId, results.stars);
  updateLevelProgress(currentLevelId, results.stars, results.score);

  // Find next playable level
  const currentIdx = PLAYABLE_LEVELS.findIndex(l => l.id === currentLevelId);
  const nextLevel =
    currentIdx >= 0 && currentIdx + 1 < PLAYABLE_LEVELS.length
      ? PLAYABLE_LEVELS[currentIdx + 1]
      : null;

  // Top Ribbon Header (Ready, Set, Cook! style)
  const ribbon = document.createElement('div');
  ribbon.className = 'results-ribbon';

  const levelBadge = document.createElement('div');
  levelBadge.className = 'results-level-name';
  levelBadge.textContent = currentLevel ? `MÀN: ${currentLevel.name.toUpperCase()}` : 'KẾT QUẢ MÀN CHƠI';

  const title = document.createElement('h2');
  if (results.stars === 3) {
    title.textContent = '🏆 ĐẦU BẾP 3 SAO!';
  } else if (results.stars === 2) {
    title.textContent = '🎉 HOÀN THÀNH XUẤT SẮC!';
  } else if (results.stars === 1) {
    title.textContent = '👍 QUA MÀN THÀNH CÔNG!';
  } else {
    title.textContent = '💪 CẦN CỐ GẮNG HƠN!';
  }
  ribbon.append(levelBadge, title);
  dialog.appendChild(ribbon);

  // 3-Star Flying Showcase + Thresholds
  const starsSection = document.createElement('div');
  starsSection.className = 'results-stars-section';

  const starsDiv = document.createElement('div');
  starsDiv.className = 'results-stars';

  const starTimeouts: Array<ReturnType<typeof setTimeout>> = [];
  for (let i = 0; i < 3; i++) {
    const starSlot = document.createElement('div');
    starSlot.className = `results-star-slot slot-${i + 1}`;

    const star = document.createElement('span');
    star.textContent = '★';
    star.className = 'results-star';
    if (i < results.stars) {
      star.classList.add('active');
      const delayMs = 250 + i * 380;
      star.style.animationDelay = `${delayMs}ms`;
      const t = setTimeout(() => {
        sfx.playStarEarned(i);
      }, delayMs);
      starTimeouts.push(t);
    }

    const threshLabel = document.createElement('div');
    threshLabel.className = 'results-star-threshold';
    threshLabel.textContent = `${thresholds[i] ?? 0} đ`;

    starSlot.append(star, threshLabel);
    starsDiv.appendChild(starSlot);
  }
  starsSection.appendChild(starsDiv);

  // Score Progress Bar toward 3 Stars
  const maxThresh = Math.max(1, thresholds[2] || 100);
  const progressPct = Math.min(100, Math.round((results.score / maxThresh) * 100));
  const progressTrack = document.createElement('div');
  progressTrack.className = 'results-progress-track';
  const progressFill = document.createElement('div');
  progressFill.className = 'results-progress-fill';
  progressFill.style.width = `${progressPct}%`;
  progressTrack.appendChild(progressFill);
  starsSection.appendChild(progressTrack);

  dialog.appendChild(starsSection);

  // Rolling Coin Score Banner
  const scoreBanner = document.createElement('div');
  scoreBanner.className = 'results-score-banner';

  const scoreLabel = document.createElement('span');
  scoreLabel.className = 'results-score-label';
  scoreLabel.textContent = 'TỔNG DOANH THU & TIP';

  const scoreDiv = document.createElement('div');
  scoreDiv.className = 'results-score';
  scoreDiv.textContent = `$ ${results.score}`;

  scoreBanner.append(scoreLabel, scoreDiv);
  dialog.appendChild(scoreBanner);

  // Receipt Stats Card
  const statsDiv = document.createElement('div');
  statsDiv.className = 'results-stats';

  const makeStatRow = (label: string, valueText: string, valueColor?: string) => {
    const row = document.createElement('div');
    row.className = 'results-stat-row';
    const lbl = document.createElement('span');
    lbl.className = 'results-stat-label';
    lbl.textContent = label;
    const val = document.createElement('span');
    val.className = 'results-stat-value';
    if (valueColor) val.style.color = valueColor;
    val.textContent = valueText;
    row.append(lbl, val);
    return row;
  };

  const servedRow = makeStatRow('🍽️ Đơn phục vụ thành công:', `${results.served} món`, '#16a34a');
  const expiredRow = makeStatRow('💢 Khách bỏ về / Hết giờ:', `${results.expired} đơn`, results.expired > 0 ? '#dc2626' : '#64748b');
  const streakRow = makeStatRow('🔥 Chuỗi Tip liên tiếp:', `x${results.maxStreak} 🔥`, '#d97706');

  let mvpText = 'Chưa có';
  if (results.servedByPlayer && Object.keys(results.servedByPlayer).length > 0) {
    let mvpId = '';
    let maxServed = -1;
    for (const [pId, count] of Object.entries(results.servedByPlayer)) {
      if (count > maxServed) {
        maxServed = count;
        mvpId = pId;
      }
    }
    if (maxServed > 0) {
      const mvpPlayer = state.lobby?.players.find(p => p.id === mvpId);
      mvpText = `${mvpPlayer?.name || 'Đầu bếp'} 👑 (${maxServed} món)`;
    }
  }
  const mvpRow = makeStatRow('👑 Đầu bếp xuất sắc (MVP):', mvpText, '#b45309');

  statsDiv.append(servedRow, expiredRow, streakRow, mvpRow);
  dialog.appendChild(statsDiv);

  // Next Level Unlock Preview Card
  if (nextLevel) {
    const unlockCard = document.createElement('div');
    unlockCard.className = 'results-unlock-card';

    const unlockTitle = document.createElement('div');
    unlockTitle.className = 'results-unlock-title';
    unlockTitle.textContent = `🔓 MÀN TIẾP THEO: ${nextLevel.name.toUpperCase()}`;

    const nextRecipeNames = (nextLevel.recipes || [])
      .map(r => RECIPE_GUIDE_DATA[r.id]?.titleVi || r.id)
      .join(' • ');
    const unlockSub = document.createElement('div');
    unlockSub.className = 'results-unlock-sub';
    unlockSub.textContent = `Thực đơn: ${nextRecipeNames}`;

    unlockCard.append(unlockTitle, unlockSub);
    dialog.appendChild(unlockCard);
  }

  // Action Buttons
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'results-actions';
  dialog.appendChild(actionsDiv);

  const isHost = state.lobby?.hostId === netClient.sessionId;
  let countdownInterval: ReturnType<typeof setInterval> | undefined;

  if (isHost) {
    const primaryTargetLevel = nextLevel && results.stars >= 1 ? nextLevel : currentLevel;
    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn results-btn primary-next';

    const replayBtn = document.createElement('button');
    replayBtn.className = 'btn results-btn replay-btn';

    let c = RESULTS_SECONDS;
    const getNextBtnLabel = (sec: number) => {
      if (nextLevel && results.stars >= 1) {
        return sec > 0
          ? `▶️ Màn tiếp theo: ${nextLevel.name} (${sec}s)`
          : `▶️ Màn tiếp theo: ${nextLevel.name}`;
      }
      return sec > 0 ? `Chơi tiếp (${sec})` : 'Chơi tiếp';
    };

    nextBtn.textContent = getNextBtnLabel(c);
    nextBtn.disabled = true;

    replayBtn.textContent = `🔄 Chơi lại màn này (${c}s)`;
    replayBtn.disabled = true;

    countdownInterval = setInterval(() => {
      c--;
      if (c <= 0) {
        nextBtn.textContent = getNextBtnLabel(0);
        nextBtn.disabled = false;
        replayBtn.textContent = '🔄 Chơi lại màn này';
        replayBtn.disabled = false;
        if (countdownInterval) clearInterval(countdownInterval);
      } else {
        nextBtn.textContent = getNextBtnLabel(c);
        replayBtn.textContent = `🔄 Chơi lại màn này (${c}s)`;
      }
    }, 1000);

    nextBtn.onclick = () => {
      nextBtn.disabled = true;
      replayBtn.disabled = true;
      nextBtn.textContent = 'Đang chuyển màn…';
      netClient.backToLobby(primaryTargetLevel?.id);
    };

    replayBtn.onclick = () => {
      nextBtn.disabled = true;
      replayBtn.disabled = true;
      replayBtn.textContent = 'Đang chuẩn bị…';
      netClient.backToLobby(currentLevelId);
    };

    actionsDiv.appendChild(nextBtn);
    if (nextLevel && results.stars >= 1) {
      actionsDiv.appendChild(replayBtn);
    }
  } else {
    const waitText = document.createElement('div');
    waitText.textContent = '⏳ Đang chờ chủ phòng chọn màn tiếp theo…';
    waitText.className = 'results-wait';
    actionsDiv.appendChild(waitText);
  }

  const leaveBtn = document.createElement('button');
  leaveBtn.className = 'btn results-btn secondary';
  leaveBtn.textContent = '🚪 Rời phòng';
  leaveBtn.onclick = () => {
    leaveBtn.disabled = true;
    leaveBtn.textContent = 'Đang rời phòng…';
    netClient.leave();
  };
  actionsDiv.appendChild(leaveBtn);

  root.appendChild(container);

  return () => {
    if (countdownInterval) clearInterval(countdownInterval);
    starTimeouts.forEach(t => clearTimeout(t));
    container.remove();
  };
}
