import type { NetClient } from '../net/NetClient';
import type { AppState } from '../state/store';
import type { ScreenHandle } from '../state/router';
import { PLAYABLE_LEVELS, PLAYER_COLORS, type PlayerCosmetic, type LevelDef } from '@kitchen/core';
import { loadProgress } from '../progress';
import { getLevelMeta } from '../game/levelMeta';
import { loadCosmetic, saveCosmetic } from '../state/cosmetic';
import { LobbyPreviewRenderer } from '../game/renderer3d/LobbyPreviewRenderer';
import {
  QUAT_CHARACTER_NAMES,
  getCharacterIndexFromCosmetic,
  getCosmeticFromCharacterIndex,
} from '../game/renderer3d/chef/quatClips';
import { createPlayerAvatar, createEmptySlotAvatar } from './lobbyAvatar';
import { voiceChat } from '../net/VoiceChat';
import { AssetLoader } from '../game/assets/AssetLoader';
import { getCustomServerUrl } from '../net/serverUrl';
import { showToast } from './toast';
import './lobby.css';

function buildInviteLink(code: string): string {
  const baseUrl = `${window.location.origin}${window.location.pathname}`;
  const customServer = getCustomServerUrl();
  if (customServer) {
    return `${baseUrl}?room=${encodeURIComponent(code)}&server=${encodeURIComponent(customServer)}`;
  }
  return `${baseUrl}?room=${encodeURIComponent(code)}`;
}

const DIFF_VI: Record<string, string> = {
  Introduction: 'MỞ ĐẦU',
  Easy: 'DỄ',
  Medium: 'VỪA',
  Hard: 'KHÓ',
};

const SKIN_SHORT_NAMES = [
  'Bếp Trưởng',
  'Bếp Nam',
  'Bếp Nữ',
  'Kimono',
  'Hải Tặc',
  'Quản Lý',
];

const SKIN_ICONS = ['👨‍🍳', '🧑', '👩‍🍳', '👘', '🏴‍☠️', '🕴️'];

const RECIPE_EMOJI_MAP: Record<string, string> = {
  salad: '🥗',
  cheese_salad: '🥗🧀',
  burger_tomato: '🍔',
  cheese_burger: '🍔🧀',
  mega_burger: '🍔👑',
  tomato_soup: '🍲🍅',
  onion_soup: '🍲🧅',
  mushroom_soup: '🍲🍄',
  steak_dinner: '🥩',
  mushroom_steak: '🥩🍄',
  pizza_margherita: '🍕',
  pizza_pepperoni: '🍕🥩',
  fish_and_chips: '🐟',
  sushi_roll: '🍣',
};

function getLevelRecipesIcons(lvl: LevelDef): string {
  const recipes = lvl.recipes || [];
  const uniqueIcons: string[] = [];
  for (const r of recipes) {
    const recipeKey = typeof r === 'string' ? r : r.id;
    const icon: string = RECIPE_EMOJI_MAP[recipeKey] || '🍽️';
    const baseEmoji: string = Array.from(icon)[0] || '🍽️';
    if (!uniqueIcons.includes(baseEmoji)) {
      uniqueIcons.push(baseEmoji);
    }
  }
  return uniqueIcons.slice(0, 4).join(' ');
}

function buildMiniMapSvg(lvl: LevelDef): SVGSVGElement {
  const rows = lvl.ascii || [];
  const h = rows.length || 9;
  const w = rows[0]?.length || 16;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('class', 'level-minimap-svg');

  for (let y = 0; y < h; y++) {
    const row = rows[y] || '';
    for (let x = 0; x < w; x++) {
      const ch = row[x] || '.';
      const rect = document.createElementNS(ns, 'rect');
      rect.setAttribute('x', String(x));
      rect.setAttribute('y', String(y));
      rect.setAttribute('width', '1.04');
      rect.setAttribute('height', '1.04');

      let fill = (x + y) % 2 === 0 ? '#e2e8f0' : '#cbd5e1';
      if (ch === '#') fill = '#6d412a';
      else if (ch === '_') fill = '#0f172a';
      else if (ch === '~') fill = '#bae6fd';
      else if (ch === '>' || ch === '<' || ch === '^' || ch === 'v') fill = '#38bdf8';
      else if (ch === 'Q') fill = '#dc2626';
      else if (ch === 'S' || ch === 's' || ch === 'U') fill = '#f97316';
      else if (ch === 'W' || ch === 'P' || ch === 'R') fill = '#0ea5e9';
      else if ('TLBMONHZK'.includes(ch)) fill = '#eab308';
      else if (ch === 'C') fill = '#16a34a';
      else if (ch === 'X' || ch === 'D' || ch === 'E') fill = '#94a3b8';
      else if (x >= Math.floor(w * 0.55)) fill = (x + y) % 2 === 0 ? '#e8be8e' : '#dba972';

      rect.setAttribute('fill', fill);
      svg.appendChild(rect);

      // Decorative station details on top of tile
      if (ch === 'Q') {
        const tableCircle = document.createElementNS(ns, 'circle');
        tableCircle.setAttribute('cx', String(x + 0.5));
        tableCircle.setAttribute('cy', String(y + 0.5));
        tableCircle.setAttribute('r', '0.34');
        tableCircle.setAttribute('fill', '#ffffff');
        svg.appendChild(tableCircle);
      } else if (ch === 'S' || ch === 's' || ch === 'U') {
        const burner = document.createElementNS(ns, 'circle');
        burner.setAttribute('cx', String(x + 0.5));
        burner.setAttribute('cy', String(y + 0.5));
        burner.setAttribute('r', '0.26');
        burner.setAttribute('fill', '#fef08a');
        svg.appendChild(burner);
      }
    }
  }
  return svg;
}

export function mountLobby(root: HTMLElement, state: AppState, client: NetClient, currentPlayerId: string): ScreenHandle {
  voiceChat.attach(client);
  AssetLoader.getInstance().preloadAllInBackground();

  const screen = document.createElement('main');
  screen.className = 'screen lobby-view';

  const wrapper = document.createElement('div');
  wrapper.className = 'rsc-lobby-wrapper';
  screen.append(wrapper);
  root.replaceChildren(screen);

  let previewRenderer: LobbyPreviewRenderer | null = null;
  let currentCosmetic: PlayerCosmetic = loadCosmetic();

  const localPlayerInLobby = state.lobby?.players.find((p) => p.id === currentPlayerId);
  if (localPlayerInLobby?.cosmetic) {
    currentCosmetic = { ...localPlayerInLobby.cosmetic };
    saveCosmetic(currentCosmetic);
  }

  // ---------------------------------------------------------------------------
  // TOP BAR (Above the 2-column board, matching Ready, Set, Cook!)
  // ---------------------------------------------------------------------------
  const topBar = document.createElement('header');
  topBar.className = 'rsc-top-bar';

  const topLeftGroup = document.createElement('div');
  topLeftGroup.className = 'rsc-top-left';

  const leaveBtn = document.createElement('button');
  leaveBtn.className = 'rsc-orange-icon-btn btn-leave';
  leaveBtn.title = 'Rời phòng về Menu chính';
  leaveBtn.textContent = '⬅ Rời phòng';
  leaveBtn.onclick = () => client.leave();

  const lobbyMicBtn = document.createElement('button');
  lobbyMicBtn.className = 'rsc-orange-icon-btn btn-lobby-mic';
  const updateLobbyMicBtn = () => {
    const active = voiceChat.isMicActive();
    const speaking = voiceChat.isLocalSpeaking();
    lobbyMicBtn.textContent = active ? (speaking ? '🔊 Đang nói' : '🎤 Mic: BẬT') : '🔇 Mic: TẮT';
    lobbyMicBtn.classList.toggle('mic-active', active);
    lobbyMicBtn.classList.toggle('mic-speaking', speaking);
  };
  updateLobbyMicBtn();
  lobbyMicBtn.onclick = () => {
    void voiceChat.toggleMic();
  };

  topLeftGroup.append(leaveBtn, lobbyMicBtn);

  // Center Mode / Solo Toggle (like PLAY | SPECTATORS in Ready, Set, Cook!)
  const topCenterGroup = document.createElement('div');
  topCenterGroup.className = 'rsc-top-center';

  const soloToggleWrap = document.createElement('div');
  soloToggleWrap.className = 'rsc-mode-switch solo-mode-label';

  const mode1Btn = document.createElement('button');
  mode1Btn.type = 'button';
  mode1Btn.className = 'rsc-mode-btn active';
  mode1Btn.textContent = '1 ĐẦU BẾP';

  const mode2Btn = document.createElement('button');
  mode2Btn.type = 'button';
  mode2Btn.className = 'rsc-mode-btn';
  mode2Btn.textContent = '2 ĐẦU BẾP (SOLO)';

  mode1Btn.onclick = () => {
    if ((client as any).setSolo) (client as any).setSolo(false);
  };
  mode2Btn.onclick = () => {
    if ((client as any).setSolo) (client as any).setSolo(true);
  };

  soloToggleWrap.append(mode1Btn, mode2Btn);
  topCenterGroup.append(soloToggleWrap);

  // Right Room Code & Invite Buttons
  const topRightGroup = document.createElement('div');
  topRightGroup.className = 'rsc-top-right';

  const pingBadge = document.createElement('span');
  pingBadge.className = 'rsc-ping-badge ping';
  pingBadge.textContent = `Ping: ${state.ping ?? 0} ms`;

  const roomPill = document.createElement('div');
  roomPill.className = 'rsc-room-pill';

  const roomCodeLabel = document.createElement('span');
  roomCodeLabel.className = 'rsc-room-code-text';
  roomCodeLabel.textContent = `PHÒNG: ${state.lobby?.code || '----'}`;

  const copyCodeBtn = document.createElement('button');
  copyCodeBtn.className = 'rsc-mini-btn btn-copy-code';
  copyCodeBtn.textContent = '📋 Mã';
  copyCodeBtn.title = 'Sao chép mã phòng';
  copyCodeBtn.onclick = () => {
    const code = latestState.lobby?.code || state.lobby?.code || '';
    void copyText(code).then(() => {
      showToast(`📋 Đã sao chép mã phòng: ${code}`, 'info');
    });
  };

  const copyLinkBtn = document.createElement('button');
  copyLinkBtn.className = 'rsc-mini-btn btn-copy-link';
  copyLinkBtn.textContent = '🔗 Mời bạn';
  copyLinkBtn.title = 'Sao chép đường dẫn mời bạn bè';
  copyLinkBtn.onclick = () => {
    const code = latestState.lobby?.code || state.lobby?.code || '';
    const link = buildInviteLink(code);
    void copyText(link).then(() => {
      showToast('🔗 Đã sao chép link mời bạn bè!', 'info');
    });
  };

  roomPill.append(roomCodeLabel, copyCodeBtn, copyLinkBtn);
  topRightGroup.append(pingBadge, roomPill);

  topBar.append(topLeftGroup, topCenterGroup, topRightGroup);
  wrapper.append(topBar);

  // ---------------------------------------------------------------------------
  // MAIN 2-COLUMN BOARD (Left: Players Blue Box | Right: Select Level White Sheet)
  // ---------------------------------------------------------------------------
  const board = document.createElement('div');
  board.className = 'rsc-lobby-board lobby-container';
  wrapper.append(board);

  // ===========================================================================
  // LEFT HALF: BLUE PLAYER & TEAM PANEL (Matching Ready, Set, Cook!)
  // ===========================================================================
  const leftPanel = document.createElement('section');
  leftPanel.className = 'rsc-left-panel lobby-left-col';

  // Top of Left Panel: [Color Swatches Strip] | [YOU 3D Stage + Randomize] | [Character Skin Strip]
  const youCustomizer = document.createElement('div');
  youCustomizer.className = 'rsc-you-customizer';

  // 1. Left Color Strip
  const colorStrip = document.createElement('div');
  colorStrip.className = 'rsc-color-strip';
  const colorBtns: HTMLButtonElement[] = [];
  PLAYER_COLORS.forEach((hex, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `rsc-color-swatch color-circle-btn${currentCosmetic.color === idx ? ' selected' : ''}`;
    const dot = document.createElement('span');
    dot.className = 'rsc-color-dot';
    dot.style.backgroundColor = `#${hex.toString(16).padStart(6, '0')}`;
    btn.append(dot);
    btn.setAttribute('aria-label', `Màu ${idx + 1}`);
    btn.onclick = () => {
      currentCosmetic.color = idx;
      updateCosmeticUI();
    };
    colorBtns.push(btn);
    colorStrip.append(btn);
  });

  // 2. Center 3D Character Stage ("BẠN / YOU")
  const stageBox = document.createElement('div');
  stageBox.className = 'rsc-stage-box preview-wrapper';

  const youHeader = document.createElement('div');
  youHeader.className = 'rsc-you-header';
  youHeader.textContent = 'BẠN';

  const previewBox = document.createElement('div');
  previewBox.id = 'lobby-preview-box';
  previewBox.className = 'preview-canvas-container';

  const prevArrow = document.createElement('button');
  prevArrow.type = 'button';
  prevArrow.className = 'preview-arrow-btn prev';
  prevArrow.textContent = '‹';

  const nextArrow = document.createElement('button');
  nextArrow.type = 'button';
  nextArrow.className = 'preview-arrow-btn next';
  nextArrow.textContent = '›';

  const randomBtn = document.createElement('button');
  randomBtn.type = 'button';
  randomBtn.id = 'random-cosmetic-btn';
  randomBtn.className = 'rsc-randomize-btn random-btn';
  randomBtn.textContent = 'NGẪU NHIÊN';

  stageBox.append(youHeader, prevArrow, previewBox, nextArrow, randomBtn);

  // 3. Right Character Skin Strip (6 Skins directly selectable with 1 click)
  const skinStrip = document.createElement('div');
  skinStrip.className = 'rsc-skin-strip';
  const skinBtns: HTMLButtonElement[] = [];

  for (let i = 0; i < QUAT_CHARACTER_NAMES.length; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    const isSel = getCharacterIndexFromCosmetic(currentCosmetic) === i;
    btn.className = `rsc-skin-card option-toggle-btn${isSel ? ' selected' : ''}`;

    const iconSpan = document.createElement('span');
    iconSpan.className = 'rsc-skin-icon';
    iconSpan.textContent = SKIN_ICONS[i] || '👨‍🍳';

    const labelSpan = document.createElement('span');
    labelSpan.className = 'rsc-skin-label';
    labelSpan.textContent = SKIN_SHORT_NAMES[i] || `Mẫu ${i + 1}`;

    btn.append(iconSpan, labelSpan);
    btn.onclick = () => {
      currentCosmetic = getCosmeticFromCharacterIndex(i, currentCosmetic.color);
      updateCosmeticUI();
    };
    skinBtns.push(btn);
    skinStrip.append(btn);
  }

  youCustomizer.append(colorStrip, stageBox, skinStrip);
  leftPanel.append(youCustomizer);

  // Bottom of Left Panel: 3 Teammate Slots in a single horizontal row (Slot 2, Slot 3, Slot 4)
  const teamSlotsRow = document.createElement('div');
  teamSlotsRow.className = 'rsc-team-slots-row slots-container slots-wrapper';
  leftPanel.append(teamSlotsRow);

  // Accessibility & Automated Roster Mirror (renders raw textContent safely for screenreaders & tests)
  const srRosterWrap = document.createElement('div');
  srRosterWrap.style.display = 'none';
  const srPlayersList = document.createElement('ul');
  srPlayersList.className = 'players';
  const srPlaceholdersList = document.createElement('div');
  srPlaceholdersList.className = 'placeholders';
  const srReadyText = document.createElement('span');
  srReadyText.textContent = 'Sẵn sàng';
  srRosterWrap.append(srPlayersList, srPlaceholdersList, srReadyText);
  leftPanel.append(srRosterWrap);

  board.append(leftPanel);

  // ===========================================================================
  // RIGHT HALF: WHITE NOTEBOOK SHEET "CHỌN MÀN / SELECT A LEVEL"
  // ===========================================================================
  const rightPanel = document.createElement('section');
  rightPanel.className = 'rsc-right-panel lobby-right-col';

  const sheetHeader = document.createElement('div');
  sheetHeader.className = 'rsc-sheet-header';

  const mapTitle = document.createElement('h2');
  mapTitle.className = 'rsc-sheet-title';
  mapTitle.textContent = 'CHỌN MÀN CHƠI:';

  sheetHeader.append(mapTitle);
  rightPanel.append(sheetHeader);

  const mapsScroll = document.createElement('div');
  mapsScroll.className = 'rsc-maps-scroll maps-scroll-container';
  rightPanel.append(mapsScroll);

  // Bottom Footer of Right Sheet: Selected Level Preview + START Button
  const sheetFooter = document.createElement('div');
  sheetFooter.className = 'rsc-sheet-footer selected-map-box';

  const selLeft = document.createElement('div');
  selLeft.className = 'rsc-selected-summary';

  const selHeading = document.createElement('div');
  selHeading.className = 'rsc-selected-heading';
  selHeading.textContent = 'MÀN ĐÃ CHỌN:';

  const selPreviewRow = document.createElement('div');
  selPreviewRow.className = 'rsc-selected-preview-row';

  const selStarsCol = document.createElement('div');
  selStarsCol.className = 'rsc-vertical-stars';

  const selThumb = document.createElement('div');
  selThumb.className = 'rsc-selected-thumb selected-map-thumb';

  const selTextCol = document.createElement('div');
  selTextCol.className = 'rsc-selected-text';

  const selName = document.createElement('div');
  selName.className = 'selected-map-title';

  const selDiff = document.createElement('div');
  selDiff.className = 'selected-map-diff';

  selTextCol.append(selName, selDiff);
  selPreviewRow.append(selStarsCol, selThumb, selTextCol);
  selLeft.append(selHeading, selPreviewRow);

  const selRight = document.createElement('div');
  selRight.className = 'rsc-start-wrap';

  const startBtn = document.createElement('button');
  startBtn.type = 'button';
  startBtn.id = 'lobby-start-btn';
  startBtn.className = 'rsc-start-btn btn-start-game';
  startBtn.textContent = 'BẮT ĐẦU';
  startBtn.onclick = () => client.start();

  const startDisabledMsg = document.createElement('div');
  startDisabledMsg.className = 'start-disabled-msg';

  selRight.append(startBtn, startDisabledMsg);
  sheetFooter.append(selLeft, selRight);
  rightPanel.append(sheetFooter);

  board.append(rightPanel);

  // ---------------------------------------------------------------------------
  // 3D Preview Renderer Initialization
  // ---------------------------------------------------------------------------
  try {
    previewRenderer = new LobbyPreviewRenderer(previewBox, currentCosmetic);
  } catch (e) {
    console.warn('[Lobby] Failed to initialize 3D character preview:', e);
  }

  function updateCosmeticUI() {
    const activeCharIdx = getCharacterIndexFromCosmetic(currentCosmetic);
    colorBtns.forEach((b, i) => {
      b.classList.toggle('selected', currentCosmetic.color === i);
    });
    skinBtns.forEach((b, i) => {
      b.classList.toggle('selected', activeCharIdx === i);
    });

    saveCosmetic(currentCosmetic);
    previewRenderer?.updateCosmetic(currentCosmetic);
    if (client.setCosmetic) {
      client.setCosmetic(currentCosmetic);
    }
  }

  prevArrow.onclick = () => {
    const charIdx = getCharacterIndexFromCosmetic(currentCosmetic);
    const prevIdx = (charIdx - 1 + QUAT_CHARACTER_NAMES.length) % QUAT_CHARACTER_NAMES.length;
    currentCosmetic = getCosmeticFromCharacterIndex(prevIdx, currentCosmetic.color);
    updateCosmeticUI();
  };

  nextArrow.onclick = () => {
    const charIdx = getCharacterIndexFromCosmetic(currentCosmetic);
    const nextIdx = (charIdx + 1) % QUAT_CHARACTER_NAMES.length;
    currentCosmetic = getCosmeticFromCharacterIndex(nextIdx, currentCosmetic.color);
    updateCosmeticUI();
  };

  randomBtn.onclick = () => {
    const randomCharIdx = Math.floor(Math.random() * QUAT_CHARACTER_NAMES.length);
    const randomColor = Math.floor(Math.random() * PLAYER_COLORS.length);
    currentCosmetic = getCosmeticFromCharacterIndex(randomCharIdx, randomColor);
    updateCosmeticUI();
  };

  let sentAutoReady = false;

  // ---------------------------------------------------------------------------
  // Render Function
  // ---------------------------------------------------------------------------
  function render(currentState: AppState) {
    const lobby = currentState.lobby;
    if (!lobby) return;

    const isHost = lobby.hostId === currentPlayerId;
    const progress = loadProgress();

    // Auto-ready local player so no manual Ready button is ever needed
    const selfPlayer = lobby.players.find((p) => p.id === currentPlayerId);
    if (selfPlayer && !selfPlayer.ready && !sentAutoReady) {
      sentAutoReady = true;
      client.ready(true);
    } else if (selfPlayer?.ready) {
      sentAutoReady = false;
    }

    // Update top bar
    pingBadge.textContent = `Ping: ${currentState.ping ?? 0} ms`;
    roomCodeLabel.textContent = `PHÒNG: ${lobby.code}`;
    youHeader.textContent = selfPlayer ? `BẠN (${selfPlayer.name})` : 'BẠN';

    const playersCount = lobby.players.length;
    const isSolo = Boolean((lobby as any).solo);
    if (isHost && playersCount === 1) {
      soloToggleWrap.style.display = 'inline-flex';
      mode1Btn.classList.toggle('active', !isSolo);
      mode2Btn.classList.toggle('active', isSolo);
    } else {
      soloToggleWrap.style.display = 'none';
    }

    // Populate screenreader / automated test roster mirror safely via textContent
    srPlayersList.replaceChildren();
    srPlaceholdersList.replaceChildren();
    lobby.players.forEach((p) => {
      const li = document.createElement('li');
      li.className = 'player-slot slot-card';
      const parts = [p.name];
      if (p.id === currentPlayerId) parts.push('BẠN');
      if (p.id === lobby.hostId) parts.push('👑 host');
      if (!p.connected) parts.push('mất kết nối');
      li.textContent = parts.join(' ');
      srPlayersList.append(li);
    });
    for (let i = lobby.players.length; i < 4; i++) {
      const ph = document.createElement('div');
      ph.className = 'slot-empty slot-card';
      ph.textContent = 'Đang chờ...';
      srPlaceholdersList.append(ph);
    }

    // Render 3 Teammate Slots at the bottom of Left Panel
    teamSlotsRow.replaceChildren();
    const otherPlayers = lobby.players.filter((p) => p.id !== currentPlayerId);

    for (let slotIdx = 0; slotIdx < 3; slotIdx++) {
      const teammate = otherPlayers[slotIdx];
      const slotCard = document.createElement('div');

      if (teammate) {
        slotCard.className = 'rsc-teammate-slot occupied';

        if (teammate.id === lobby.hostId) {
          const hostCrown = document.createElement('span');
          hostCrown.className = 'rsc-slot-crown';
          hostCrown.textContent = '👑';
          hostCrown.title = 'Chủ phòng';
          slotCard.append(hostCrown);
        }

        const vState = voiceChat.getPlayerVoiceState(teammate.id);
        if (!vState.muted) {
          const micBadge = document.createElement('span');
          micBadge.className = `rsc-slot-mic${vState.speaking ? ' speaking' : ''}`;
          micBadge.textContent = vState.speaking ? '🔊' : '🎤';
          slotCard.append(micBadge);
        }

        const avatarEl = createPlayerAvatar(teammate.cosmetic, teammate.color);
        slotCard.append(avatarEl);

        const nameEl = document.createElement('div');
        nameEl.className = 'rsc-slot-name player-name';
        nameEl.textContent = teammate.name;
        slotCard.append(nameEl);
      } else if (slotIdx === 0 && playersCount === 1 && isSolo) {
        // Show 2nd Solo Chef in Slot 2 when Solo 2-Chef mode is enabled
        slotCard.className = 'rsc-teammate-slot occupied solo-bot-slot';
        const avatarEl = createPlayerAvatar(
          getCosmeticFromCharacterIndex((getCharacterIndexFromCosmetic(currentCosmetic) + 1) % 6, (currentCosmetic.color + 1) % 4),
          PLAYER_COLORS[(currentCosmetic.color + 1) % 4]
        );
        slotCard.append(avatarEl);
        const nameEl = document.createElement('div');
        nameEl.className = 'rsc-slot-name';
        nameEl.textContent = 'Đầu Bếp 2 (Tab)';
        slotCard.append(nameEl);
      } else {
        slotCard.className = 'rsc-teammate-slot empty empty-slot';
        const emptyAvatar = createEmptySlotAvatar();
        slotCard.append(emptyAvatar);
        const waitText = document.createElement('div');
        waitText.className = 'rsc-slot-wait';
        waitText.textContent = 'Đang chờ...';
        slotCard.append(waitText);
      }

      teamSlotsRow.append(slotCard);
    }

    // Render Right Panel: Map Selection Grid grouped by World (3 cards per row like Ready, Set, Cook!)
    mapsScroll.replaceChildren();
    const worlds = [
      { id: 1, title: 'THẾ GIỚI 1 — NHÀ HÀNG CỔ ĐIỂN', icon: '🍔' },
      { id: 2, title: 'THẾ GIỚI 2 — ĐƯỜNG PHỐ & HẢI TẶC', icon: '🏴‍☠️' },
      { id: 3, title: 'THẾ GIỚI 3 — ĐẠI TIỆC VŨ TRỤ', icon: '🚀' },
    ];

    const currentLevelDef = PLAYABLE_LEVELS.find((l) => l.id === lobby.levelId) || PLAYABLE_LEVELS[0]!;

    for (const w of worlds) {
      const worldMaps = PLAYABLE_LEVELS.filter((lvl) => {
        const meta = getLevelMeta(lvl.id);
        return meta.world === w.id;
      });
      if (worldMaps.length === 0) continue;

      const groupEl = document.createElement('div');
      groupEl.className = 'rsc-world-section world-group';

      // Light-blue World Banner (like ITALIAN in Ready, Set, Cook!)
      const worldBanner = document.createElement('div');
      worldBanner.className = 'rsc-world-banner';
      const bannerIcon = document.createElement('span');
      bannerIcon.className = 'rsc-world-banner-icon';
      bannerIcon.textContent = w.icon;
      const bannerTitle = document.createElement('span');
      bannerTitle.className = 'rsc-world-banner-text';
      bannerTitle.textContent = w.title;
      worldBanner.append(bannerIcon, bannerTitle);
      groupEl.append(worldBanner);

      const mapsGrid = document.createElement('div');
      mapsGrid.className = 'rsc-world-maps-grid world-maps-list';

      worldMaps.forEach((lvl) => {
        const meta = getLevelMeta(lvl.id);
        const isSelected = lvl.id === lobby.levelId;
        const starsGot = progress.levels[lvl.id]?.stars || 0;

        const card = document.createElement('div');
        card.className = `rsc-map-card level-card campaign-node${isSelected ? ' selected' : ''}${!isHost ? ' disabled' : ''}`;
        card.setAttribute('data-level-id', lvl.id);

        // Top row of card: [3 Vertical Stars] + [Square Mini-map Box]
        const cardVisualRow = document.createElement('div');
        cardVisualRow.className = 'rsc-map-visual-row';

        const starsCol = document.createElement('div');
        starsCol.className = 'rsc-card-stars-col';
        for (let s = 1; s <= 3; s++) {
          const st = document.createElement('span');
          st.className = `rsc-star-icon${s <= starsGot ? ' earned' : ''}`;
          st.textContent = '★';
          starsCol.append(st);
        }

        const thumb = document.createElement('div');
        thumb.className = `rsc-map-thumb level-card-thumb world-${meta.world}`;
        thumb.append(buildMiniMapSvg(lvl));

        // Recipe dish icons badge in corner of thumbnail
        const recipeBadge = document.createElement('span');
        recipeBadge.className = 'rsc-map-recipe-pill';
        recipeBadge.textContent = getLevelRecipesIcons(lvl);
        thumb.append(recipeBadge);

        cardVisualRow.append(starsCol, thumb);

        // Bottom caption of card: Level Name + (Difficulty)
        const captionBox = document.createElement('div');
        captionBox.className = 'rsc-map-caption';

        const nameEl = document.createElement('div');
        nameEl.className = 'rsc-map-name level-card-name';
        nameEl.textContent = lvl.name;

        const diffEl = document.createElement('div');
        diffEl.className = 'rsc-map-diff difficulty-badge';
        diffEl.textContent = `(${DIFF_VI[meta.difficulty] || meta.difficulty.toUpperCase()})`;

        const rawDiffTag = document.createElement('span');
        rawDiffTag.className = 'badge-diff';
        rawDiffTag.style.display = 'none';
        rawDiffTag.textContent = meta.difficulty;

        captionBox.append(nameEl, diffEl, rawDiffTag);
        card.append(cardVisualRow, captionBox);

        if (isHost) {
          card.onclick = () => client.selectLevel(lvl.id);
        }

        mapsGrid.append(card);
      });

      groupEl.append(mapsGrid);
      mapsScroll.append(groupEl);
    }

    // Update Bottom Footer ("MÀN ĐÃ CHỌN" + START button)
    const curMeta = getLevelMeta(currentLevelDef.id);
    const curStars = progress.levels[currentLevelDef.id]?.stars || 0;
    selStarsCol.replaceChildren();
    for (let s = 1; s <= 3; s++) {
      const st = document.createElement('span');
      st.className = `rsc-star-icon${s <= curStars ? ' earned' : ''}`;
      st.textContent = '★';
      selStarsCol.append(st);
    }

    selThumb.className = `rsc-selected-thumb selected-map-thumb world-${curMeta.world}`;
    selThumb.replaceChildren(buildMiniMapSvg(currentLevelDef));
    selName.textContent = `${currentLevelDef.name} ${getLevelRecipesIcons(currentLevelDef)}`;
    const starsTarget = currentLevelDef.stars ? ` • ⭐ ${currentLevelDef.stars.join('/')}` : '';
    selDiff.textContent = `Thế giới ${curMeta.world} • (${DIFF_VI[curMeta.difficulty] || curMeta.difficulty})${starsTarget}`;

    const maxPlayers = currentLevelDef.maxPlayers ?? 4;
    const tooMany = playersCount > maxPlayers;
    const allReady = lobby.players.every((p) => p.ready);

    if (!isHost) {
      startBtn.disabled = true;
      startBtn.title = 'Waiting for host to start';
      startDisabledMsg.textContent = 'Chờ chủ phòng bấm Bắt đầu...';
    } else if (tooMany) {
      startBtn.disabled = true;
      startBtn.title = `Max ${maxPlayers} players`;
      startDisabledMsg.textContent = `Màn này tối đa ${maxPlayers} người`;
    } else if (!allReady) {
      startBtn.disabled = true;
      startBtn.title = 'Waiting for players to be ready';
      startDisabledMsg.textContent = 'Chờ mọi người sẵn sàng...';
    } else {
      startBtn.disabled = false;
      startBtn.title = '';
      startDisabledMsg.textContent = '';
    }
  }

  let latestState = state;
  const unsubLobbyVoice = voiceChat.onChange(() => {
    updateLobbyMicBtn();
    render(latestState);
  });

  render(state);

  return {
    unmount: () => {
      unsubLobbyVoice();
      previewRenderer?.dispose();
      previewRenderer = null;
      screen.remove();
    },
    update: (newState: AppState) => {
      latestState = newState;
      render(newState);
    },
  };
}

async function copyText(value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const input = document.createElement('textarea');
    input.value = value;
    document.body.append(input);
    input.select();
    document.execCommand('copy');
    input.remove();
  }
}
