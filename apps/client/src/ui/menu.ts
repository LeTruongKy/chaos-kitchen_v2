import { ROOM_CODE_ALPHABET, RECIPES } from '@kitchen/core';
import type { NetClient } from '../net/NetClient';
import type { AppState } from '../state/store';
import { savePlayerName } from '../state/storage';
import { openSettingsModal } from './settingsModal';

export function mountMenu(root: HTMLElement, state: AppState, client: NetClient): () => void {
  const screen = document.createElement('main');
  screen.className = 'screen menu-screen';

  const panel = document.createElement('section');
  panel.className = 'panel menu-panel';

  const heroHeader = document.createElement('div');
  heroHeader.className = 'menu-hero-header';

  const badgeDishes = document.createElement('div');
  badgeDishes.className = 'menu-dish-strip';
  badgeDishes.textContent = '🍔 · 🍕 · 🍲 · 🥗 · 🥩';

  const title = document.createElement('h1');
  title.textContent = 'Chaos Kitchen';
  title.className = 'logo-title';

  const subtitle = document.createElement('div');
  subtitle.className = 'menu-subtitle-ribbon';
  subtitle.textContent = '👨‍🍳 ĐẠI CHIẾN NHÀ BẾP CO-OP 1–4 NGƯỜI 🔥';

  heroHeader.append(badgeDishes, title, subtitle);

  const form = document.createElement('form');
  form.noValidate = true;

  const name = input('Tên đầu bếp', state.name);
  name.className = 'menu-input-name';
  name.maxLength = 16;
  name.required = true;

  const create = button('🏠 Tạo phòng', 'Tạo phòng');
  create.className = 'btn-menu-primary';

  const code = input('Mã phòng 4 ký tự', state.roomCode);
  code.className = 'menu-input-code';
  code.maxLength = 4;
  code.autocomplete = 'off';

  const joinLabel = state.roomCode ? `🚀 Vào Phòng ${state.roomCode}` : '🔑 Vào';
  const join = button(joinLabel, state.roomCode ? `🚀 Vào Phòng ${state.roomCode}` : 'Vào');
  join.className = 'btn-menu-join';

  const quickMatch = button('⚡ Chơi nhanh', 'Chơi nhanh');
  quickMatch.className = 'btn-menu-quick';

  const settingsBtn = button('⚙️ Cài đặt', 'Cài đặt');
  settingsBtn.id = 'menu-settings-btn';
  settingsBtn.className = 'btn-menu-secondary';
  settingsBtn.addEventListener('click', () => openSettingsModal(screen));

  const codeGroup = document.createElement('div');
  codeGroup.className = 'code-group';
  codeGroup.append(code, join);

  const hint = document.createElement('p');
  hint.className = 'hint';
  hint.textContent = state.roomCode
    ? `🎉 Bạn được mời vào Phòng ${state.roomCode} — Nhập tên và bấm Vào!`
    : '💡 Mẹo: Chạm/Click vào bàn bếp hoặc dùng WASD + Space/E/F để nấu ăn!';

  const fullscreenBtn = document.createElement('button');
  fullscreenBtn.textContent = '⛶';
  fullscreenBtn.title = 'Toàn màn hình';
  fullscreenBtn.setAttribute('aria-label', 'Toàn màn hình');
  fullscreenBtn.className = 'menu-top-icon-btn';
  fullscreenBtn.style.right = '4.2rem';
  fullscreenBtn.onclick = () => {
    try {
      if (!document.fullscreenElement) {
        void document.documentElement.requestFullscreen?.().then(() => {
          const orient = (screen as any).orientation;
          if (orient && typeof orient.lock === 'function') {
            orient.lock('landscape').catch(() => {});
          }
        }).catch(() => {});
      } else {
        void document.exitFullscreen?.().catch(() => {});
      }
    } catch {
      // ignore
    }
  };

  const helpBtn = document.createElement('button');
  helpBtn.textContent = '📖';
  helpBtn.title = 'Sổ tay đầu bếp & Hướng dẫn';
  helpBtn.className = 'menu-top-icon-btn';
  helpBtn.style.right = '1rem';

  if (state.loading) {
    const loadingText = document.createElement('p');
    loadingText.textContent = 'Đang kết nối máy chủ…';
    form.append(loadingText, settingsBtn);
    name.disabled = create.disabled = code.disabled = join.disabled = quickMatch.disabled = true;
  } else {
    form.append(name, create, quickMatch, codeGroup, settingsBtn);
  }

  panel.append(heroHeader, form, hint);
  screen.append(panel, fullscreenBtn, helpBtn);
  root.replaceChildren(screen);

  const showTutorial = () => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal';

    const heading = document.createElement('h2');
    heading.textContent = 'Hướng dẫn chơi';

    const p1 = document.createElement('p');
    p1.style.textAlign = 'left';
    p1.style.whiteSpace = 'pre-line';
    p1.textContent = '• Chạm / Click thông minh: Chạm trực tiếp vào thùng nguyên liệu, thớt, bếp, chồng dĩa hoặc bàn khách — đầu bếp sẽ tự động chạy tới và thao tác!\n• Lưu ý chế biến: Rau củ / Phô mai / Bột cần thái trên Thớt (🔪). Thịt sống cho thẳng vào Chảo bếp (🔥) — không cần thái!\n• Bàn phím (PC): WASD / Mũi tên di chuyển · Space/E Nhặt/Đặt · F Thái/Rửa · Shift Chạy nhanh · Tab Đổi Chef · H Sổ tay công thức.';

    const p2 = document.createElement('p');
    p2.style.textAlign = 'left';
    p2.textContent = 'Các món ăn tiêu biểu:';

    const recipesList = document.createElement('ul');
    recipesList.style.textAlign = 'left';
    recipesList.style.listStyle = 'none';
    recipesList.style.paddingLeft = '0';

    // Generate recipes content from RECIPES in core
    const recipeMap: Record<string, string> = {
      'salad': 'Salad Tươi',
      'cheese_salad': 'Salad Phô Mai',
      'burger_tomato': 'Burger Cà Chua',
      'cheese_burger': 'Burger Phô Mai',
      'steak_dinner': 'Bít Tết Thượng Hạng',
      'mushroom_steak': 'Bít Tết Nấm Rừng',
    };

    const emojiMap: Record<string, string> = {
      'lettuce': '🥬',
      'tomato': '🍅',
      'cheese': '🧀',
      'mushroom': '🍄',
      'onion': '🧅',
      'bun': '🍞',
      'meat': '🥩',
      'chopped': '🔪',
      'cooked': '🔥'
    };

    for (const [id, label] of Object.entries(recipeMap)) {
      const recipe = RECIPES[id as keyof typeof RECIPES];
      if (recipe) {
        const item = document.createElement('li');
        const ingredientsText = recipe.ingredients.map(ing => {
          let str = emojiMap[ing.id] || ing.id;
          if (ing.state === 'chopped') str += emojiMap.chopped;
          if (ing.state === 'cooked') str += emojiMap.cooked;
          return str;
        }).join(' + ');
        item.textContent = `${label} = ${ingredientsText}`;
        recipesList.appendChild(item);
      }
    }

    const closeBtn = document.createElement('button');
    closeBtn.className = 'modal-close';
    closeBtn.textContent = 'X';

    const close = () => {
      overlay.remove();
      window.removeEventListener('keydown', onEsc);
      try {
        localStorage.setItem('ck_tutorial_seen', '1');
      } catch {
        // ignore
      }
    };

    closeBtn.onclick = close;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onEsc);

    const playTutBtn = button('Chơi Màn Hướng Dẫn (Khuyên dùng)');
    playTutBtn.style.marginTop = '1rem';
    playTutBtn.onclick = () => {
      close();
      const nm = name.value.trim() || 'Tân binh';
      client.createRoom(nm).then(() => {
        // Wait for room to be set up, then send select level and start
        setTimeout(() => {
          client.selectLevel('tutorial');
          setTimeout(() => {
            client.start();
          }, 100);
        }, 500);
      });
    };

    modal.append(heading, p1, p2, recipesList, playTutBtn, closeBtn);
    overlay.appendChild(modal);
    screen.appendChild(overlay);
  };

  helpBtn.onclick = showTutorial;

  try {
    if (!localStorage.getItem('ck_tutorial_seen')) {
      setTimeout(showTutorial, 0);
    }
  } catch {
    // ignore
  }

  const update = () => {
    if (state.loading) return;
    const validName = name.value.trim().length > 0;
    create.disabled = !validName;
    quickMatch.disabled = !validName;
    join.disabled = !validName || code.value.length !== 4;
  };

  const createRoom = () => client.createRoom(name.value.trim());
  const joinRoom = () => client.joinByCode(name.value.trim(), code.value);

  name.addEventListener('input', () => {
    savePlayerName(name.value);
    update();
  });

  code.addEventListener('input', () => {
    code.value = [...code.value.toUpperCase()]
      .filter((character) => ROOM_CODE_ALPHABET.includes(character))
      .join('')
      .slice(0, 4);
    update();
  });

  name.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !create.disabled) {
      event.preventDefault();
      createRoom();
    }
  });

  code.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !join.disabled) {
      event.preventDefault();
      joinRoom();
    }
  });

  create.addEventListener('click', createRoom);
  join.addEventListener('click', joinRoom);
  quickMatch.addEventListener('click', () => client.quickMatch(name.value.trim()));

  update();
  return () => screen.remove();
}

export function getInviteRoomCode(search: string): string {
  return new URLSearchParams(search).get('room')?.toUpperCase() ?? '';
}

function input(label: string, value: string): HTMLInputElement {
  const element = document.createElement('input');
  element.type = 'text';
  element.value = value;
  element.placeholder = label;
  element.setAttribute('aria-label', label);
  return element;
}

function button(label: string, ariaLabel?: string): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = 'button';
  element.textContent = label;
  element.setAttribute('aria-label', ariaLabel ?? label);
  return element;
}
