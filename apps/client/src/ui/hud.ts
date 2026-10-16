import { NetClient } from '../net/NetClient';
import { AppState, appStore } from '../state/store';
import { RECIPES } from '@kitchen/core';
import type { Order, Snapshot, GameEvent } from '@kitchen/core';
import { showToast } from './toast';
import { sfx } from '../game/audio/Sfx';
import { RECIPE_GUIDE_DATA, getLevelRecipeIds, showRecipeGuideModal } from './recipeGuide';
import { voiceChat } from '../net/VoiceChat';
import { applyLiveThumbToImg } from '../game/renderer3d/ThumbnailCache';
import './hud.css';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const RECIPE_STEPS_DISPLAY: Record<string, { label: string; steps: string }> = {
  salad: { label: 'Salad', steps: '🥬 🔪 + 🍅 🔪 ➔ 🍽️' },
  burger: { label: 'Burger', steps: '🍞 + 🥩 🔥 + 🥬 🔪 ➔ 🍽️' },
  burger_tomato: { label: 'Burger Cà Chua', steps: '🍞 + 🥩 🔥 + 🥬 🔪 + 🍅 🔪 ➔ 🍽️' },
  cheese_burger: { label: 'Burger Phô Mai', steps: '🍞 + 🥩 🔥 + 🧀 🔪 ➔ 🍽️' },
  cheese_salad: { label: 'Salad Phô Mai', steps: '🥬 🔪 + 🍅 🔪 + 🧀 🔪 ➔ 🍽️' },
  steak_dinner: { label: 'Bít Tết', steps: '🥩 🔥 + 🍅 🔪 ➔ 🍽️' },
  mushroom_steak: { label: 'Bít Tết Nấm', steps: '🥩 🔥 + 🍄 🔪 ➔ 🍽️' },
  tomato_soup: { label: 'Súp Cà Chua', steps: '🍅×3 🔪 ➔ 🍲 🔥 ➔ 🍽️' },
  onion_soup: { label: 'Súp Hành Tây', steps: '🧅×3 🔪 ➔ 🍲 🔥 ➔ 🍽️' },
  mushroom_soup: { label: 'Súp Nấm', steps: '🍄×3 🔪 ➔ 🍲 🔥 ➔ 🍽️' },
  pizza: { label: 'Pizza', steps: '🫓 🔪 + 🍅 🔪 + 🧀 🔪 ➔ 🔥 ➔ 🍽️' },
};

const ORDER_INGREDIENT_ICONS: Record<string, string[]> = {
  salad: ['/thumbs/steps/lettuce.png', '/thumbs/steps/tomato-slice.png'],
  burger: ['/thumbs/steps/bun.png', '/thumbs/steps/meat-cooked.png', '/thumbs/steps/lettuce.png'],
  burger_tomato: ['/thumbs/steps/bun.png', '/thumbs/steps/meat-cooked.png', '/thumbs/steps/lettuce.png', '/thumbs/steps/tomato-slice.png'],
  cheese_burger: ['/thumbs/steps/bun.png', '/thumbs/steps/meat-cooked.png', '/thumbs/steps/cheese-cut.png'],
  cheese_salad: ['/thumbs/steps/lettuce.png', '/thumbs/steps/tomato-slice.png', '/thumbs/steps/cheese-cut.png'],
  steak_dinner: ['/thumbs/steps/meat-cooked.png', '/thumbs/steps/tomato-slice.png'],
  mushroom_steak: ['/thumbs/steps/meat-cooked.png', '/thumbs/steps/mushroom.png'],
  tomato_soup: ['/thumbs/steps/tomato-slice.png', '/thumbs/steps/tomato-slice.png', '/thumbs/steps/tomato-slice.png'],
  onion_soup: ['/thumbs/steps/onion.png', '/thumbs/steps/onion.png', '/thumbs/steps/onion.png'],
  mushroom_soup: ['/thumbs/steps/mushroom.png', '/thumbs/steps/mushroom.png', '/thumbs/steps/mushroom.png'],
  pizza: ['/thumbs/steps/dough.svg', '/thumbs/steps/tomato-slice.png', '/thumbs/steps/cheese-cut.png'],
};

export function mountHud(root: HTMLElement, state: AppState, netClient: NetClient): () => void {
  voiceChat.attach(netClient);

  const hudContainer = document.createElement('div');
  hudContainer.className = 'hud-container';

  const topBar = document.createElement('div');
  topBar.className = 'hud-top-bar';

  // Left Ready Set Cook style yellow status card (Stars + Coin Score + Timer Bar)
  const leftStatusCard = document.createElement('div');
  leftStatusCard.className = 'hud-rsc-status-card';

  const starsRow = document.createElement('div');
  starsRow.className = 'hud-rsc-stars';
  starsRow.textContent = '★★★';

  const scoreCoinBadge = document.createElement('div');
  scoreCoinBadge.className = 'hud-score-coin-icon';
  scoreCoinBadge.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#fbbf24" stroke="#181818" stroke-width="2.2"/><circle cx="12" cy="12" r="7" fill="#f59e0b" stroke="#fde68a" stroke-width="1.2"/><text x="12" y="16" text-anchor="middle" font-size="11" font-weight="900" fill="#181818" font-family="sans-serif">$</text></svg>`;

  const scoreEl = document.createElement('div');
  scoreEl.className = 'hud-score';
  scoreEl.textContent = '0';
  
  const streakEl = document.createElement('span');
  streakEl.className = 'hud-streak';
  streakEl.textContent = '';
  
  const scoreContainer = document.createElement('div');
  scoreContainer.className = 'hud-score-container';
  scoreContainer.appendChild(starsRow);
  scoreContainer.appendChild(scoreCoinBadge);
  scoreContainer.appendChild(scoreEl);
  scoreContainer.appendChild(streakEl);

  const timerWrap = document.createElement('div');
  timerWrap.className = 'hud-timer-wrap';

  const timerIcon = document.createElement('span');
  timerIcon.className = 'hud-timer-icon';
  timerIcon.textContent = '⏱';

  const timeEl = document.createElement('div');
  timeEl.className = 'hud-time';
  timeEl.textContent = '0:00';

  timerWrap.appendChild(timerIcon);
  timerWrap.appendChild(timeEl);

  leftStatusCard.appendChild(scoreContainer);
  leftStatusCard.appendChild(timerWrap);

  const rightBox = document.createElement('div');
  rightBox.className = 'hud-right-box';
  
  const pingEl = document.createElement('div');
  pingEl.className = 'hud-ping';
  pingEl.textContent = '--- ms';

  const recipeBookBtn = document.createElement('button');
  recipeBookBtn.className = 'hud-action-pill-btn hud-recipe-book-btn';
  recipeBookBtn.title = 'Xem hướng dẫn công thức món ăn (Phím H)';
  recipeBookBtn.innerHTML = '<span class="hud-btn-icon">📖</span><span class="hud-btn-label"> Công thức (H)</span>';
  recipeBookBtn.onclick = () => {
    const levelId = appStore.get().lobby?.levelId || state.lobby?.levelId;
    showRecipeGuideModal(hudContainer, levelId, getLevelRecipeIds(levelId), false);
  };

  const micBtn = document.createElement('button');
  micBtn.className = 'hud-action-pill-btn hud-mic-btn';
  micBtn.title = 'Bật / Tắt Microphone giao tiếp với đồng đội (Phím V)';
  const updateMicBtn = () => {
    const active = voiceChat.isMicActive();
    const speaking = voiceChat.isLocalSpeaking();
    const icon = active ? (speaking ? '🔊' : '🎤') : '🔇';
    const label = active ? (speaking ? ' Đang nói...' : ' Mic: BẬT') : ' Mic: TẮT';
    micBtn.innerHTML = `<span class="hud-btn-icon">${icon}</span><span class="hud-btn-label">${label}</span>`;
    micBtn.classList.toggle('mic-active', active);
    micBtn.classList.toggle('mic-speaking', speaking);
  };
  updateMicBtn();
  micBtn.onclick = () => {
    void voiceChat.toggleMic();
  };
  const unsubVoice = voiceChat.onChange(updateMicBtn);

  const audioBtn = document.createElement('button');
  audioBtn.className = 'hud-audio-btn';
  const updateAudioBtn = () => {
    const st = sfx.currentState;
    audioBtn.textContent = st === '1' ? '🔊' : (st === '2' ? '🔉' : '🔇');
  };
  updateAudioBtn();
  audioBtn.onclick = () => {
    sfx.toggleMute();
    updateAudioBtn();
  };

  function togglePauseModal() {
    const existing = hudContainer.querySelector('.hud-pause-modal-backdrop');
    if (existing) {
      existing.remove();
      return;
    }

    const latestLobby = appStore.get().lobby || state.lobby;
    const isHost = Boolean(latestLobby && netClient.sessionId && latestLobby.hostId === netClient.sessionId);

    const backdrop = document.createElement('div');
    backdrop.className = 'hud-pause-modal-backdrop';

    const modal = document.createElement('div');
    modal.className = 'hud-pause-modal';

    const title = document.createElement('h3');
    title.className = 'hud-pause-title';
    title.textContent = '⏸ TẠM DỪNG / MENU BẾP';

    const sub = document.createElement('p');
    sub.className = 'hud-pause-sub';
    sub.textContent = latestLobby?.code
      ? `Mã phòng hiện tại: ${latestLobby.code}`
      : 'Bạn muốn tiếp tục nấu hay rời màn chơi?';

    const actions = document.createElement('div');
    actions.className = 'hud-pause-actions';

    const resumeBtn = document.createElement('button');
    resumeBtn.className = 'hud-pause-btn resume';
    resumeBtn.textContent = '▶ Tiếp tục nấu (Esc)';
    resumeBtn.onclick = () => backdrop.remove();

    const lobbyBtn = document.createElement('button');
    lobbyBtn.className = 'hud-pause-btn lobby';
    lobbyBtn.textContent = isHost
      ? '🔄 Đổi Map / Về Phòng Chờ (Chủ phòng)'
      : '🚪 Rời màn về Sảnh Chính';
    lobbyBtn.onclick = () => {
      backdrop.remove();
      if (isHost) {
        netClient.backToLobby();
      } else {
        netClient.leave();
      }
    };

    const leaveBtn = document.createElement('button');
    leaveBtn.className = 'hud-pause-btn leave';
    leaveBtn.textContent = '🏠 Thoát hẳn về Menu Chính';
    leaveBtn.onclick = () => {
      backdrop.remove();
      netClient.leave();
    };

    actions.appendChild(resumeBtn);
    actions.appendChild(lobbyBtn);
    if (isHost) {
      actions.appendChild(leaveBtn);
    }

    modal.appendChild(title);
    modal.appendChild(sub);
    modal.appendChild(actions);
    backdrop.appendChild(modal);
    backdrop.onclick = (ev) => {
      if (ev.target === backdrop) backdrop.remove();
    };
    hudContainer.appendChild(backdrop);
  }

  const exitBtn = document.createElement('button');
  exitBtn.className = 'hud-action-pill-btn hud-exit-btn';
  exitBtn.title = 'Tạm dừng / Đổi màn hoặc Thoát về Menu (Phím Esc)';
  exitBtn.innerHTML = '<span class="hud-btn-icon">🚪</span><span class="hud-btn-label"> Thoát (Esc)</span>';
  exitBtn.onclick = () => {
    togglePauseModal();
  };

  rightBox.appendChild(recipeBookBtn);
  rightBox.appendChild(micBtn);
  rightBox.appendChild(pingEl);
  rightBox.appendChild(audioBtn);
  rightBox.appendChild(exitBtn);

  topBar.appendChild(leftStatusCard);
  topBar.appendChild(rightBox);

  const topOrdersContainer = document.createElement('div');
  topOrdersContainer.className = 'hud-orders hud-orders-top';

  const bubbleOrdersContainer = document.createElement('div');
  bubbleOrdersContainer.className = 'hud-orders-bubbles';

  const centerOverlay = document.createElement('div');
  centerOverlay.className = 'hud-center-overlay';

  // Sprint Stamina Gauge
  const sprintContainer = document.createElement('div');
  sprintContainer.className = 'hud-sprint-container';

  const sprintIcon = document.createElement('div');
  sprintIcon.className = 'hud-sprint-icon';
  sprintIcon.textContent = '⚡';

  const sprintTrack = document.createElement('div');
  sprintTrack.className = 'hud-sprint-track';

  const sprintFill = document.createElement('div');
  sprintFill.className = 'hud-sprint-fill';
  sprintFill.style.width = '100%';

  sprintTrack.appendChild(sprintFill);
  sprintContainer.appendChild(sprintIcon);
  sprintContainer.appendChild(sprintTrack);

  const RECIPE_BAR_ICONS: Record<string, string[]> = {
    salad: ['/thumbs/steps/lettuce.png', '/thumbs/steps/cutting-board.png', '/thumbs/steps/tomato-slice.png'],
    burger: ['/thumbs/steps/bun.png', '/thumbs/steps/meat-raw.png', '/thumbs/steps/frying-pan.png', '/thumbs/steps/lettuce.png'],
    burger_tomato: ['/thumbs/steps/bun.png', '/thumbs/steps/meat-raw.png', '/thumbs/steps/frying-pan.png', '/thumbs/steps/lettuce.png', '/thumbs/steps/tomato-slice.png'],
    cheese_burger: ['/thumbs/steps/bun.png', '/thumbs/steps/meat-raw.png', '/thumbs/steps/frying-pan.png', '/thumbs/steps/cheese-cut.png'],
    cheese_salad: ['/thumbs/steps/lettuce.png', '/thumbs/steps/tomato-slice.png', '/thumbs/steps/cheese-cut.png', '/thumbs/steps/cutting-board.png'],
    steak_dinner: ['/thumbs/steps/meat-raw.png', '/thumbs/steps/frying-pan.png', '/thumbs/steps/tomato-slice.png', '/thumbs/steps/cutting-board.png'],
    mushroom_steak: ['/thumbs/steps/meat-raw.png', '/thumbs/steps/frying-pan.png', '/thumbs/steps/mushroom.png', '/thumbs/steps/cutting-board.png'],
    tomato_soup: ['/thumbs/steps/tomato-slice.png', '/thumbs/steps/cutting-board.png', '/thumbs/steps/pot-stew.png'],
    onion_soup: ['/thumbs/steps/onion.png', '/thumbs/steps/cutting-board.png', '/thumbs/steps/pot-stew.png'],
    mushroom_soup: ['/thumbs/steps/mushroom.png', '/thumbs/steps/cutting-board.png', '/thumbs/steps/pot-stew.png'],
    pizza: ['/thumbs/steps/dough.svg', '/thumbs/steps/tomato-slice.png', '/thumbs/steps/cheese-cut.png', '/thumbs/steps/cutting-board.png'],
  };

  // Ready, Set, Cook! Bottom Blue Recipe Banner
  const recipeBar = document.createElement('div');
  recipeBar.className = 'hud-recipe-bar';

  function updateRecipeBar(activeRecipes: string[]) {
    const levelDefaults = getLevelRecipeIds(state.lobby?.levelId);
    const merged = Array.from(new Set([...levelDefaults, ...activeRecipes.filter(r => r && r !== '???')]));
    const unique = merged.length > 0 ? merged : ['salad', 'burger_tomato'];
    const key = unique.join(',');
    if (recipeBar.dataset.recipesKey === key) return;
    recipeBar.dataset.recipesKey = key;
    recipeBar.replaceChildren();

    unique.slice(0, 4).forEach(rId => {
      const pill = document.createElement('div');
      pill.className = 'hud-recipe-pill';
      pill.title = 'Bấm để xem chi tiết cách chế biến';
      pill.style.cursor = 'pointer';
      pill.onclick = () => {
        const levelId = state.lobby?.levelId;
        showRecipeGuideModal(hudContainer, levelId, unique, false);
      };

      const domeWrap = document.createElement('div');
      domeWrap.className = 'hud-recipe-dome';

      const thumb = document.createElement('img');
      thumb.className = 'hud-recipe-pill-img';
      applyLiveThumbToImg(thumb, `/thumbs/recipes/${rId}.png`);
      thumb.alt = rId;
      thumb.onerror = () => { thumb.style.display = 'none'; };
      domeWrap.appendChild(thumb);
      pill.appendChild(domeWrap);

      const iconsRow = document.createElement('div');
      iconsRow.className = 'hud-recipe-step-icons-row';
      const stepIcons = RECIPE_BAR_ICONS[rId] || ['/thumbs/steps/cutting-board.png', '/thumbs/steps/frying-pan.png'];
      stepIcons.forEach(iconUrl => {
        const stepImg = document.createElement('img');
        stepImg.className = 'hud-recipe-mini-step-icon';
        applyLiveThumbToImg(stepImg, iconUrl);
        stepImg.alt = '';
        iconsRow.appendChild(stepImg);
      });

      const guideInfo = RECIPE_GUIDE_DATA[rId];
      const info = RECIPE_STEPS_DISPLAY[rId] || {
        label: guideInfo?.titleVi || (RECIPES as any)[rId]?.name || rId,
        steps: guideInfo?.pillSteps || '🔪 ➔ 🔥 ➔ 🍽️',
      };

      const textSpan = document.createElement('span');
      textSpan.className = 'hud-recipe-pill-steps';
      textSpan.textContent = info.label;
      iconsRow.appendChild(textSpan);

      pill.appendChild(iconsRow);
      recipeBar.appendChild(pill);
    });
  }
  updateRecipeBar(getLevelRecipeIds(state.lobby?.levelId));

  hudContainer.appendChild(topBar);
  hudContainer.appendChild(topOrdersContainer);
  hudContainer.appendChild(bubbleOrdersContainer);
  hudContainer.appendChild(centerOverlay);
  hudContainer.appendChild(sprintContainer);
  hudContainer.appendChild(recipeBar);
  root.appendChild(hudContainer);

  let currentScore = 0;
  const lastTimeLeft = new Map<number, number>();

  function renderOrders(orders: Order[], angryCustomerIds: Set<number> = new Set()) {
    const orderedRecipes = orders.map(o => o.recipe as string).filter(r => r && r !== '???');
    if (orderedRecipes.length > 0) {
      updateRecipeBar(orderedRecipes);
    }

    const currentIds = orders.map(o => o.id);
    const allOrderChildren = Array.from(hudContainer.querySelectorAll('.hud-order'));
    for (const child of allOrderChildren) {
      const id = parseInt((child as HTMLElement).dataset.id || '-1');
      if (!currentIds.includes(id)) {
        if (!child.classList.contains('hud-order-removing') &&
            !child.classList.contains('hud-order-removing-expired') &&
            !child.classList.contains('hud-order-removing-complete') &&
            !child.classList.contains('hud-order-leaving-angry')) {
          
          const timeLeft = lastTimeLeft.get(id) || 0;
          if (timeLeft <= 2) {
            child.classList.add('hud-order-removing-expired');
          } else {
            child.classList.add('hud-order-removing-complete');
          }
          
          setTimeout(() => {
            child.remove();
            lastTimeLeft.delete(id);
          }, 300); // Wait for animation
        }
      }
    }

    orders.forEach(order => {
      lastTimeLeft.set(order.id, order.timeLeft);
      let el = hudContainer.querySelector(`.hud-order[data-id="${order.id}"]`) as HTMLElement;
      if (!el) {
        el = document.createElement('div');
        el.className = 'hud-order hud-order-entering';
        el.dataset.id = order.id.toString();
        if (order.customerId !== undefined) {
          el.dataset.customerId = order.customerId.toString();
          el.classList.add('bubble');
        }
        
        const nameEl = document.createElement('div');
        nameEl.className = 'hud-order-name';
        nameEl.textContent = (order.recipe as string) === '???' ? '...' : (RECIPES[order.recipe]?.name || order.recipe);

        const bodyRow = document.createElement('div');
        bodyRow.className = 'hud-order-body-row';

        const thumbWrap = document.createElement('div');
        thumbWrap.className = 'hud-order-thumb-wrap';

        if ((order.recipe as string) === '???') {
          const thinkingEl = document.createElement('span');
          thinkingEl.className = 'hud-order-thinking';
          thinkingEl.textContent = '💬';
          thumbWrap.appendChild(thinkingEl);
        } else {
          const thumbImg = document.createElement('img');
          thumbImg.className = 'hud-order-thumb';
          thumbImg.alt = RECIPES[order.recipe]?.name || order.recipe;
          applyLiveThumbToImg(thumbImg, `/thumbs/recipes/${order.recipe}.png`);

          thumbImg.onerror = () => {
            console.error(`MISSING THUMB: ${order.recipe}`);
            thumbImg.style.display = 'none';
            thumbWrap.classList.add('missing-thumb');
            const isDebug = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug');
            if (isDebug) {
              const errEl = document.createElement('div');
              errEl.className = 'missing-thumb-debug';
              errEl.textContent = `MISSING THUMB: ${order.recipe}`;
              thumbWrap.appendChild(errEl);
            }
          };
          thumbWrap.appendChild(thumbImg);
        }

        // Ready, Set, Cook! Circular Pie-Chart Timer (Left side of bubble)
        const pieTimer = document.createElement('div');
        pieTimer.className = 'hud-order-pie green';

        const barBg = document.createElement('div');
        barBg.className = 'hud-order-bar-bg';
        const barFg = document.createElement('div');
        barFg.className = 'hud-order-bar-fg';
        barBg.appendChild(barFg);

        bodyRow.appendChild(pieTimer);
        bodyRow.appendChild(thumbWrap);

        const ingIcons = ORDER_INGREDIENT_ICONS[order.recipe as string];
        if ((order.recipe as string) !== '???' && ingIcons && ingIcons.length > 0) {
          const ingRow = document.createElement('div');
          ingRow.className = 'hud-order-ingredients';
          ingIcons.forEach(src => {
            const ingImg = document.createElement('img');
            ingImg.className = 'hud-order-ing-icon';
            applyLiveThumbToImg(ingImg, src);
            ingImg.alt = '';
            ingRow.appendChild(ingImg);
          });
          bodyRow.appendChild(ingRow);
        }

        el.appendChild(nameEl);
        el.appendChild(bodyRow);
        el.appendChild(barBg);
        
        // Ensure new element slides in properly
        if (order.customerId !== undefined) {
          bubbleOrdersContainer.appendChild(el);
        } else {
          topOrdersContainer.appendChild(el);
        }
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            el.classList.remove('hud-order-entering');
          });
        });
      }

      // Update angry state (border highlight only, no extra angry icon row)
      const isAngry = order.customerId !== undefined && angryCustomerIds.has(order.customerId);
      if (isAngry) {
        el.classList.add('hud-order-angry');
      } else {
        el.classList.remove('hud-order-angry');
      }

      // Update patience bar & circular pie-chart timer
      const ratio = Math.max(0, Math.min(1, order.timeLeft / (order.patience || 1)));
      const pct = Math.round(ratio * 100);
      const elAny = el as any;
      const barFg: HTMLElement | null = elAny._barFg !== undefined ? elAny._barFg : (elAny._barFg = el.querySelector('.hud-order-bar-fg'));
      const pieEl: HTMLElement | null = elAny._pieEl !== undefined ? elAny._pieEl : (elAny._pieEl = el.querySelector('.hud-order-pie'));

      let colorTier = 'red';
      let pieHex = '#ef4444';
      if (ratio > 0.5) {
        colorTier = 'green';
        pieHex = '#22c55e';
      } else if (ratio > 0.25) {
        colorTier = 'yellow';
        pieHex = '#f59e0b';
      }

      if (elAny._lastPct !== pct || elAny._lastColorTier !== colorTier) {
        elAny._lastPct = pct;
        elAny._lastColorTier = colorTier;
        if (pieEl) {
          pieEl.style.background = `conic-gradient(${pieHex} ${pct}%, #e2e8f0 ${pct}% 100%)`;
          pieEl.className = `hud-order-pie ${colorTier}`;
        }
        if (barFg) {
          barFg.style.width = `${pct}%`;
          barFg.className = `hud-order-bar-fg ${colorTier}`;
        }
      }

      if (ratio <= 0.2) {
        el.classList.add('hud-order-danger');
      } else {
        el.classList.remove('hud-order-danger');
      }
    });
  }

  function onSnapshot(snap: Snapshot) {
    if (snap.score !== currentScore) {
      if (snap.score > currentScore) {
        scoreContainer.classList.remove('score-pop');
        void scoreContainer.offsetWidth; // Reflow
        scoreContainer.classList.add('score-pop');
      }
      currentScore = snap.score;
      scoreEl.textContent = currentScore.toString();
    }
    
    if (snap.streak > 1) {
      if (streakEl.textContent !== ` x${snap.streak}`) {
        streakEl.textContent = ` x${snap.streak}`;
        streakEl.classList.remove('streak-bounce');
        void streakEl.offsetWidth;
        streakEl.classList.add('streak-bounce');
      }
    } else {
      if (streakEl.textContent !== '') {
        streakEl.textContent = '';
        streakEl.classList.remove('streak-shake');
        void streakEl.offsetWidth;
        streakEl.classList.add('streak-shake');
      }
    }
    
    const timeStr = formatTime(snap.timeLeft);
    if (timeEl.textContent !== timeStr) {
      timeEl.textContent = timeStr;
    }
    if (snap.timeLeft <= 30) {
      timeEl.classList.add('danger-blink');
      sfx.setFastBgm(true);
    } else {
      timeEl.classList.remove('danger-blink');
      sfx.setFastBgm(false);
    }

    const angryCustomerIds = new Set<number>();
    const allOrders: Order[] = [...(snap.orders || [])];
    if (snap.customers) {
      snap.customers.forEach(c => {
        if (c.angry) {
          angryCustomerIds.add(c.id);
        }
        if (c.state === 'seated_waiting_order') {
          allOrders.push({
            id: -(c.id || 1), // Fake negative ID for waiting customers
            recipe: '???' as unknown as import('@kitchen/core').RecipeId, // Unknown until taken
            timeLeft: c.waitLeft !== undefined ? c.waitLeft : 30,
            patience: 30,
            customerId: c.id
          });
        }
      });
    }
    renderOrders(allOrders, angryCustomerIds);

    // Update Sprint Stamina Bar
    const localId = netClient.sessionId || (state as unknown as { localPlayerId?: string }).localPlayerId;
    const localPlayer = (snap.players || []).find(p => p.id === localId) || (snap.players || [])[0];
    if (localPlayer) {
      const energy = localPlayer.sprintEnergy !== undefined ? localPlayer.sprintEnergy : 3.0;
      const pct = Math.max(0, Math.min(100, (energy / 3.0) * 100));
      sprintFill.style.width = `${pct}%`;

      if (localPlayer.sprintExhausted) {
        sprintContainer.classList.add('exhausted');
      } else {
        sprintContainer.classList.remove('exhausted');
      }
    }
  }

  function onPhase(payload: { phase: string, countdown?: number }) {
    if (payload.phase === 'countdown') {
      const cd = payload.countdown ?? 3;
      if (cd > 0) {
        // Show intro card if it's the start
        if (cd === 3) {
          showIntroCard();
        }
        
        centerOverlay.innerHTML = `<span>${cd}</span>`;
        centerOverlay.className = 'hud-center-overlay hud-center-anim';
        sfx.playEvent('countdown_tick');
        // Trigger reflow to restart animation
        void centerOverlay.offsetWidth; 
      }
    } else if (payload.phase === 'playing') {
      const intro = hudContainer.querySelector('.level-intro-card');
      if (intro) intro.remove();
      
      centerOverlay.innerHTML = '<span>Bắt đầu!</span>';
      centerOverlay.className = 'hud-center-overlay hud-center-anim';
      sfx.playEvent('countdown_go');
      setTimeout(() => {
        centerOverlay.textContent = '';
        centerOverlay.className = 'hud-center-overlay';
      }, 1000);
    } else if (payload.phase === 'finished') {
      sfx.playEvent('timeup');
    }
  }

  function onEvent(event: GameEvent) {
    if (event.type === 'serve_ok') {
      const floatEl = document.createElement('div');
      floatEl.className = 'hud-score-float';
      
      const bScore = event.baseScore || 0;
      const tip = event.tip || 0;
      const streak = event.streak || 1;
      const reward = event.reward || (bScore + tip * streak);
      
      if (tip > 0 && streak > 1) {
        floatEl.innerHTML = `+${reward} <span style="font-size: 14px; opacity: 0.8">(${bScore} + ${tip} ×${streak})</span>`;
      } else if (tip > 0) {
        floatEl.innerHTML = `+${reward} <span style="font-size: 14px; opacity: 0.8">(${bScore} + ${tip})</span>`;
      } else {
        floatEl.textContent = `+${reward}`;
      }
      
      scoreContainer.appendChild(floatEl);
      setTimeout(() => floatEl.remove(), 1000);
    } else if (event.type === 'serve_fail') {
      const messages: Record<string, string> = {
        no_customer: 'No customer here',
        no_order: 'No order for this customer',
        wrong_dish: 'Wrong dish',
        wrong_table: 'Wrong table',
      };
      const msg = (event.reason && messages[event.reason]) || 'Wrong dish';
      showToast(msg, 'error');
    } else if (event.type === 'burnt' || event.type === 'soup_burnt') {
      showToast('Thức ăn cháy!', 'error');
    } else if (event.type === 'order_new') {
      sfx.playEvent('order_new');
    } else if (event.type === 'customer_leave') {
      const reason = event.reason;
      const cid = event.customerId;
      if (cid !== undefined) {
        const el = hudContainer.querySelector(`.hud-order[data-customer-id="${cid}"]`) as HTMLElement;
        if (el) {
          if (reason === 'expired' || reason === 'no_order_taken') {
            el.classList.add('hud-order-leaving-angry');
            setTimeout(() => {
              el.remove();
              lastTimeLeft.delete(parseInt(el.dataset.id || '-1'));
            }, 400);
          } else if (reason === 'served') {
            el.classList.add('hud-order-removing-complete');
            setTimeout(() => {
              el.remove();
              lastTimeLeft.delete(parseInt(el.dataset.id || '-1'));
            }, 300);
          }
        }
      }
    }
  }

  function onPing(rtt: number) {
    pingEl.textContent = `${Math.round(rtt)} ms`;
  }
  
  let hasShownIntroGuide = false;

  function showIntroCard() {
    if (!hasShownIntroGuide) {
      hasShownIntroGuide = true;
      const levelId = state.lobby?.levelId;
      updateRecipeBar(getLevelRecipeIds(levelId));
      showRecipeGuideModal(hudContainer, levelId, getLevelRecipeIds(levelId), true);
    }
  }

  // Show the New Recipe Guide modal automatically when entering a level
  setTimeout(() => {
    if (!hasShownIntroGuide && hudContainer.isConnected) {
      showIntroCard();
    }
  }, 150);

  const onHudKeyDown = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (e.code === 'KeyH') {
      const existing = hudContainer.querySelector('.rsc-recipe-modal-backdrop');
      if (existing) {
        existing.remove();
      } else {
        const levelId = appStore.get().lobby?.levelId || state.lobby?.levelId;
        showRecipeGuideModal(hudContainer, levelId, getLevelRecipeIds(levelId), false);
      }
    } else if (e.code === 'KeyV') {
      void voiceChat.toggleMic();
    } else if (e.code === 'Escape') {
      const recipeModal = hudContainer.querySelector('.rsc-recipe-modal-backdrop');
      if (!recipeModal) {
        togglePauseModal();
      }
    }
  };
  window.addEventListener('keydown', onHudKeyDown);

  netClient.on('snapshot', onSnapshot);
  netClient.on('phase', onPhase);
  netClient.on('event', onEvent);
  netClient.on('ping', onPing);

  return () => {
    window.removeEventListener('keydown', onHudKeyDown);
    unsubVoice();
    netClient.off('snapshot', onSnapshot);
    netClient.off('phase', onPhase);
    netClient.off('event', onEvent);
    netClient.off('ping', onPing);
    hudContainer.remove();
  };
}
