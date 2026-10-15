import { PLAYABLE_LEVELS } from '@kitchen/core';
import { applyLiveThumbToImg } from '../game/renderer3d/ThumbnailCache';

export interface RecipeStepVisual {
  icon: string;
  toolIcon?: string;
  actionBadge?: string;
  label: string;
}

export interface RecipeGuideEntry {
  id: string;
  titleVi: string;
  subtitle: string;
  thumb: string;
  pillSteps: string;
  steps: RecipeStepVisual[];
}

export const RECIPE_GUIDE_DATA: Record<string, RecipeGuideEntry> = {
  salad: {
    id: 'salad',
    titleVi: 'Salad Rau Củ Tươi',
    subtitle: 'Món khai vị nhanh gọn — chỉ cần thái rau và cà chua rồi xếp lên đĩa!',
    thumb: '/thumbs/recipes/salad.png',
    pillSteps: '🥬 🔪 + 🍅 🔪 ➔ 🍽️',
    steps: [
      {
        icon: '/thumbs/steps/lettuce.png',
        toolIcon: '/thumbs/steps/cutting-board.png',
        actionBadge: '🔪 Thái',
        label: 'Lấy Xà lách ➔ Thái trên thớt',
      },
      {
        icon: '/thumbs/steps/tomato.png',
        toolIcon: '/thumbs/steps/cutting-board.png',
        actionBadge: '🔪 Thái',
        label: 'Lấy Cà chua ➔ Thái lát',
      },
      {
        icon: '/thumbs/steps/plate.png',
        actionBadge: '🍽️ Xếp đĩa',
        label: 'Cho cả 2 vào Đĩa sạch & Phục vụ!',
      },
    ],
  },
  burger: {
    id: 'burger',
    titleVi: 'Burger Truyền Thống',
    subtitle: 'Áp chảo thịt bò cho chín vàng rồi kẹp vào vỏ bánh Burger cùng xà lách!',
    thumb: '/thumbs/recipes/burger.png',
    pillSteps: '🍞 + 🥩 🔥 + 🥬 🔪 ➔ 🍽️',
    steps: [
      {
        icon: '/thumbs/steps/meat-raw.png',
        toolIcon: '/thumbs/steps/frying-pan.png',
        actionBadge: '🔥 Rán chảo',
        label: 'Lấy Thịt sống ➔ Cho thẳng vào Chảo rán chín (Không cần thái!)',
      },
      {
        icon: '/thumbs/steps/lettuce.png',
        toolIcon: '/thumbs/steps/cutting-board.png',
        actionBadge: '🔪 Thái',
        label: 'Lấy Xà lách ➔ Thái nhỏ trên thớt',
      },
      {
        icon: '/thumbs/steps/bun.png',
        toolIcon: '/thumbs/steps/plate.png',
        actionBadge: '🍽️ Lên đĩa',
        label: 'Đặt Vỏ bánh + Thịt chín + Xà lách lên Đĩa!',
      },
    ],
  },
  burger_tomato: {
    id: 'burger_tomato',
    titleVi: 'Burger Cà Chua',
    subtitle: 'Thịt bò áp chảo chín vàng kẹp vỏ bánh cùng xà lách và cà chua thái lát!',
    thumb: '/thumbs/recipes/burger_tomato.png',
    pillSteps: '🍞 + 🥩 🔥 + 🥬 🔪 + 🍅 🔪 ➔ 🍽️',
    steps: [
      {
        icon: '/thumbs/steps/meat-raw.png',
        toolIcon: '/thumbs/steps/frying-pan.png',
        actionBadge: '🔥 Áp chảo',
        label: 'Lấy Thịt sống ➔ Đặt thẳng lên Chảo bếp rán chín',
      },
      {
        icon: '/thumbs/steps/lettuce.png',
        toolIcon: '/thumbs/steps/cutting-board.png',
        actionBadge: '🔪 Thái',
        label: 'Thái Xà lách trên thớt',
      },
      {
        icon: '/thumbs/steps/tomato-slice.png',
        toolIcon: '/thumbs/steps/cutting-board.png',
        actionBadge: '🔪 Thái',
        label: 'Thái Cà chua trên thớt',
      },
      {
        icon: '/thumbs/steps/bun.png',
        toolIcon: '/thumbs/steps/plate.png',
        actionBadge: '🍽️ Lên đĩa',
        label: 'Gộp Vỏ bánh + Thịt chín + Xà lách + Cà chua lên Đĩa!',
      },
    ],
  },
  cheese_burger: {
    id: 'cheese_burger',
    titleVi: 'Burger Phô Mai Béo Ngậy',
    subtitle: 'Sự kết hợp hoàn hảo giữa thịt bò áp chảo và phô mai thái lát!',
    thumb: '/thumbs/recipes/cheese_burger.png',
    pillSteps: '🍞 + 🥩 🔥 + 🧀 🔪 ➔ 🍽️',
    steps: [
      {
        icon: '/thumbs/steps/meat-raw.png',
        toolIcon: '/thumbs/steps/frying-pan.png',
        actionBadge: '🔥 Áp chảo',
        label: 'Lấy Thịt sống ➔ Đặt thẳng lên Chảo bếp rán chín',
      },
      {
        icon: '/thumbs/steps/cheese-cut.png',
        toolIcon: '/thumbs/steps/cutting-board.png',
        actionBadge: '🔪 Thái',
        label: 'Lấy Phô mai ➔ Thái lát trên thớt',
      },
      {
        icon: '/thumbs/steps/bun.png',
        toolIcon: '/thumbs/steps/plate.png',
        actionBadge: '🍽️ Lên đĩa',
        label: 'Đặt Vỏ bánh + Thịt chín + Phô mai lên Đĩa!',
      },
    ],
  },
  cheese_salad: {
    id: 'cheese_salad',
    titleVi: 'Salad Phô Mai',
    subtitle: 'Rau xà lách và cà chua tươi mát trộn cùng phô mai thái lát béo ngậy!',
    thumb: '/thumbs/recipes/cheese_salad.png',
    pillSteps: '🥬 🔪 + 🍅 🔪 + 🧀 🔪 ➔ 🍽️',
    steps: [
      {
        icon: '/thumbs/steps/lettuce.png',
        toolIcon: '/thumbs/steps/cutting-board.png',
        actionBadge: '🔪 Thái',
        label: 'Lấy Xà lách & Cà chua ➔ Thái nhỏ trên thớt',
      },
      {
        icon: '/thumbs/steps/cheese-cut.png',
        toolIcon: '/thumbs/steps/cutting-board.png',
        actionBadge: '🔪 Thái',
        label: 'Lấy Phô mai ➔ Thái lát trên thớt',
      },
      {
        icon: '/thumbs/steps/plate.png',
        actionBadge: '🍽️ Trộn đĩa',
        label: 'Xếp Xà lách + Cà chua + Phô mai lên Đĩa sạch!',
      },
    ],
  },
  steak_dinner: {
    id: 'steak_dinner',
    titleVi: 'Bít Tết Thượng Hạng',
    subtitle: 'Thịt bò áp chảo dùng kèm cà chua thái lát — không dùng vỏ bánh!',
    thumb: '/thumbs/recipes/steak_dinner.png',
    pillSteps: '🥩 🔥 + 🍅 🔪 ➔ 🍽️',
    steps: [
      {
        icon: '/thumbs/steps/meat-raw.png',
        toolIcon: '/thumbs/steps/frying-pan.png',
        actionBadge: '🔥 Áp chảo',
        label: 'Lấy Thịt bò sống ➔ Cho thẳng vào Chảo áp chảo chín',
      },
      {
        icon: '/thumbs/steps/tomato-slice.png',
        toolIcon: '/thumbs/steps/cutting-board.png',
        actionBadge: '🔪 Thái',
        label: 'Lấy Cà chua ➔ Thái lát trên thớt',
      },
      {
        icon: '/thumbs/steps/meat-cooked.png',
        toolIcon: '/thumbs/steps/plate.png',
        actionBadge: '🍽️ Lên đĩa',
        label: 'Xếp Thịt bò chín + Cà chua thái lên Đĩa sạch!',
      },
    ],
  },
  mushroom_steak: {
    id: 'mushroom_steak',
    titleVi: 'Bít Tết Nấm Rừng',
    subtitle: 'Thịt bò áp chảo thơm lừng ăn kèm nấm tươi thái lát!',
    thumb: '/thumbs/recipes/mushroom_steak.png',
    pillSteps: '🥩 🔥 + 🍄 🔪 ➔ 🍽️',
    steps: [
      {
        icon: '/thumbs/steps/meat-raw.png',
        toolIcon: '/thumbs/steps/frying-pan.png',
        actionBadge: '🔥 Áp chảo',
        label: 'Lấy Thịt bò sống ➔ Áp chảo trên Bếp cho chín tới',
      },
      {
        icon: '/thumbs/steps/mushroom.png',
        toolIcon: '/thumbs/steps/cutting-board.png',
        actionBadge: '🔪 Thái',
        label: 'Lấy Nấm tươi ➔ Thái lát trên thớt',
      },
      {
        icon: '/thumbs/steps/meat-cooked.png',
        toolIcon: '/thumbs/steps/plate.png',
        actionBadge: '🍽️ Lên đĩa',
        label: 'Xếp Thịt bò chín + Nấm thái lát lên Đĩa sạch!',
      },
    ],
  },
  tomato_soup: {
    id: 'tomato_soup',
    titleVi: 'Súp Cà Chua Nóng Hổi',
    subtitle: 'Thái đủ 3 quả cà chua cho vào Nồi Súp đun sôi rồi múc ra đĩa!',
    thumb: '/thumbs/recipes/tomato_soup.png',
    pillSteps: '🍅×3 🔪 ➔ 🍲 🔥 ➔ 🍽️',
    steps: [
      {
        icon: '/thumbs/steps/tomato-slice.png',
        toolIcon: '/thumbs/steps/cutting-board.png',
        actionBadge: '🔪 ×3',
        label: 'Thái lần lượt 3 quả Cà chua trên thớt',
      },
      {
        icon: '/thumbs/steps/pot-stew.png',
        actionBadge: '🍲 Đun sôi',
        label: 'Bỏ 3 phần cà chua thái vào Nồi trên bếp đun chín',
      },
      {
        icon: '/thumbs/steps/plate.png',
        actionBadge: '🍽️ Múc súp',
        label: 'Cầm Đĩa sạch tương tác với Nồi để múc súp ra đĩa!',
      },
    ],
  },
  onion_soup: {
    id: 'onion_soup',
    titleVi: 'Súp Hành Tây Pháp',
    subtitle: 'Thái 3 củ hành tây cho vào Nồi đun sôi rồi múc ra đĩa!',
    thumb: '/thumbs/recipes/onion_soup.png',
    pillSteps: '🧅×3 🔪 ➔ 🍲 🔥 ➔ 🍽️',
    steps: [
      {
        icon: '/thumbs/steps/onion.png',
        toolIcon: '/thumbs/steps/cutting-board.png',
        actionBadge: '🔪 ×3',
        label: 'Thái 3 củ Hành tây trên thớt',
      },
      {
        icon: '/thumbs/steps/pot-stew.png',
        actionBadge: '🍲 Đun sôi',
        label: 'Cho vào Nồi đun chín rồi dùng Đĩa sạch múc ra!',
      },
    ],
  },
  mushroom_soup: {
    id: 'mushroom_soup',
    titleVi: 'Súp Kem Nấm',
    subtitle: 'Thái 3 cây nấm tươi cho vào Nồi đun sôi rồi múc ra đĩa!',
    thumb: '/thumbs/recipes/mushroom_soup.png',
    pillSteps: '🍄×3 🔪 ➔ 🍲 🔥 ➔ 🍽️',
    steps: [
      {
        icon: '/thumbs/steps/mushroom.png',
        toolIcon: '/thumbs/steps/cutting-board.png',
        actionBadge: '🔪 ×3',
        label: 'Thái 3 cây Nấm trên thớt',
      },
      {
        icon: '/thumbs/steps/pot-stew.png',
        actionBadge: '🍲 Đun sôi',
        label: 'Cho vào Nồi đun chín rồi dùng Đĩa sạch múc ra!',
      },
    ],
  },
  pizza: {
    id: 'pizza',
    titleVi: 'Pizza Phô Mai Đút Lò',
    subtitle: 'Nhào bột + cà chua + phô mai trên bàn rồi đút vào Lò Nướng (Oven)!',
    thumb: '/thumbs/recipes/pizza.png',
    pillSteps: '🫓 🔪 + 🍅 🔪 + 🧀 🔪 ➔ 🔥 Lò ➔ 🍽️',
    steps: [
      {
        icon: '/thumbs/steps/dough.svg',
        toolIcon: '/thumbs/steps/cutting-board.png',
        actionBadge: '🔪 Cán bột',
        label: 'Lấy Bột mì trắng (thùng có cây lăn bột) ➔ Cán đế trên thớt',
      },
      {
        icon: '/thumbs/steps/tomato-slice.png',
        toolIcon: '/thumbs/steps/cheese-cut.png',
        actionBadge: '➕ Phủ nhân',
        label: 'Thái Cà chua & Phô mai ➔ Đặt lên đế bánh sống',
      },
      {
        icon: '/thumbs/steps/pizza.png',
        toolIcon: '/thumbs/steps/plate.png',
        actionBadge: '🔥 Đút lò',
        label: 'Cho Pizza sống vào Lò Nướng ➔ Chín lấy ra Đĩa!',
      },
    ],
  },
};

export const LEVEL_RECIPE_PROGRESSION: Record<
  string,
  { newRecipes: string[]; retiredRecipes: string[] }
> = {
  tutorial: {
    newRecipes: ['salad'],
    retiredRecipes: [],
  },
  level1: {
    newRecipes: ['burger_tomato'],
    retiredRecipes: [],
  },
  bep_doi: {
    newRecipes: ['tomato_soup', 'cheese_salad'],
    retiredRecipes: ['salad'],
  },
  nha_hang_mo: {
    newRecipes: ['steak_dinner', 'onion_soup'],
    retiredRecipes: ['tomato_soup', 'cheese_salad'],
  },
  bep_lo_nuong: {
    newRecipes: ['pizza', 'cheese_burger'],
    retiredRecipes: ['burger_tomato', 'steak_dinner', 'onion_soup'],
  },
  quan_an_duong_pho: {
    newRecipes: ['mushroom_steak', 'mushroom_soup'],
    retiredRecipes: ['pizza', 'cheese_burger', 'tomato_soup'],
  },
  tau_hai_tac: {
    newRecipes: ['steak_dinner', 'burger_tomato'],
    retiredRecipes: ['mushroom_steak', 'mushroom_soup', 'cheese_salad'],
  },
  dao_kho_bau: {
    newRecipes: ['pizza', 'mushroom_steak', 'onion_soup'],
    retiredRecipes: ['steak_dinner', 'burger_tomato'],
  },
  tram_vu_tru: {
    newRecipes: ['steak_dinner', 'burger_tomato'],
    retiredRecipes: ['pizza', 'mushroom_steak', 'onion_soup'],
  },
  dai_tiec_ngan_ha: {
    newRecipes: ['pizza', 'cheese_burger', 'mushroom_steak', 'onion_soup'],
    retiredRecipes: ['steak_dinner', 'burger_tomato'],
  },
};

export function getLevelRecipeIds(levelId?: string): string[] {
  const found = PLAYABLE_LEVELS.find(l => l.id === levelId);
  if (found && found.recipes.length > 0) {
    return found.recipes.map(r => r.id);
  }
  return ['salad', 'burger_tomato'];
}

export function showRecipeGuideModal(
  parent: HTMLElement,
  levelId: string | undefined,
  activeRecipeIds: string[],
  isIntroPopup: boolean
): () => void {
  const existing = parent.querySelector('.rsc-recipe-modal-backdrop');
  if (existing) existing.remove();

  const progression = (levelId && LEVEL_RECIPE_PROGRESSION[levelId]) || {
    newRecipes: [],
    retiredRecipes: [],
  };
  const recipesToShow =
    activeRecipeIds.length > 0 ? activeRecipeIds : getLevelRecipeIds(levelId);

  const backdrop = document.createElement('div');
  backdrop.className = 'rsc-recipe-modal-backdrop';

  const modal = document.createElement('div');
  modal.className = 'rsc-recipe-modal';

  // Header
  const header = document.createElement('div');
  header.className = 'rsc-recipe-modal-header';

  const badge = document.createElement('div');
  badge.className = 'rsc-recipe-modal-badge';
  badge.textContent =
    isIntroPopup && progression.newRecipes.length > 0
      ? '✨ MÓN ĂN MỚI XUẤT HIỆN!'
      : '📖 BẢNG HƯỚNG DẪN CÔNG THỨC';

  const title = document.createElement('h2');
  title.className = 'rsc-recipe-modal-title';
  const levelObj = PLAYABLE_LEVELS.find(l => l.id === levelId);
  title.textContent = levelObj ? `Thực Đơn: ${levelObj.name}` : 'Sổ Tay Đầu Bếp';

  const closeIconBtn = document.createElement('button');
  closeIconBtn.className = 'rsc-recipe-modal-close-x';
  closeIconBtn.textContent = '✕';

  header.appendChild(badge);
  header.appendChild(title);
  header.appendChild(closeIconBtn);
  modal.appendChild(header);

  // Retired recipes notice if any dish was rotated out in this level
  if (progression.retiredRecipes.length > 0) {
    const retiredNotice = document.createElement('div');
    retiredNotice.className = 'rsc-recipe-retired-banner';
    const retiredNames = progression.retiredRecipes
      .map(id => RECIPE_GUIDE_DATA[id]?.titleVi || id)
      .join(', ');
    retiredNotice.innerHTML = `🔄 <strong>Thay đổi thực đơn màn này:</strong> Tạm ngưng phục vụ <em>${retiredNames}</em> để tập trung món mới!`;
    modal.appendChild(retiredNotice);
  }

  // Cards Grid
  const grid = document.createElement('div');
  grid.className = 'rsc-recipe-cards-grid';

  for (const rId of recipesToShow) {
    const data = RECIPE_GUIDE_DATA[rId];
    if (!data) continue;

    const isNew = progression.newRecipes.includes(rId);
    const card = document.createElement('div');
    card.className = `rsc-recipe-guide-card ${isNew ? 'is-new-recipe' : ''}`;

    if (isNew) {
      const newTag = document.createElement('div');
      newTag.className = 'rsc-new-recipe-ribbon';
      newTag.textContent = '★ MÓN MỚI!';
      card.appendChild(newTag);
    }

    const cardTop = document.createElement('div');
    cardTop.className = 'rsc-recipe-card-top';

    const dishImgWrap = document.createElement('div');
    dishImgWrap.className = 'rsc-recipe-dish-img-wrap';
    const dishImg = document.createElement('img');
    applyLiveThumbToImg(dishImg, data.thumb);
    dishImg.alt = data.titleVi;
    dishImg.className = 'rsc-recipe-dish-img';
    dishImgWrap.appendChild(dishImg);

    const cardHeadText = document.createElement('div');
    cardHeadText.className = 'rsc-recipe-card-head-text';
    const h3 = document.createElement('h3');
    h3.textContent = data.titleVi;
    const sub = document.createElement('p');
    sub.textContent = data.subtitle;
    cardHeadText.appendChild(h3);
    cardHeadText.appendChild(sub);

    cardTop.appendChild(dishImgWrap);
    cardTop.appendChild(cardHeadText);
    card.appendChild(cardTop);

    // Visual Step-by-Step flow
    const stepsWrap = document.createElement('div');
    stepsWrap.className = 'rsc-recipe-steps-list';

    data.steps.forEach((st, idx) => {
      const stepEl = document.createElement('div');
      stepEl.className = 'rsc-recipe-step-item';

      const numBadge = document.createElement('div');
      numBadge.className = 'rsc-step-num';
      numBadge.textContent = `${idx + 1}`;

      const iconsBox = document.createElement('div');
      iconsBox.className = 'rsc-step-icons';

      const mainIcon = document.createElement('img');
      applyLiveThumbToImg(mainIcon, st.icon);
      mainIcon.alt = st.label;
      mainIcon.className = 'rsc-step-icon-img';
      iconsBox.appendChild(mainIcon);

      if (st.toolIcon) {
        const arrowSpan = document.createElement('span');
        arrowSpan.className = 'rsc-step-mini-arrow';
        arrowSpan.textContent = '➔';
        iconsBox.appendChild(arrowSpan);

        const toolImg = document.createElement('img');
        applyLiveThumbToImg(toolImg, st.toolIcon);
        toolImg.alt = '';
        toolImg.className = 'rsc-step-icon-img tool';
        iconsBox.appendChild(toolImg);
      }

      const stepBody = document.createElement('div');
      stepBody.className = 'rsc-step-body';

      if (st.actionBadge) {
        const actTag = document.createElement('span');
        actTag.className = 'rsc-step-action-tag';
        actTag.textContent = st.actionBadge;
        stepBody.appendChild(actTag);
      }

      const descSpan = document.createElement('span');
      descSpan.className = 'rsc-step-desc';
      descSpan.textContent = st.label;
      stepBody.appendChild(descSpan);

      stepEl.appendChild(numBadge);
      stepEl.appendChild(iconsBox);
      stepEl.appendChild(stepBody);
      stepsWrap.appendChild(stepEl);
    });

    card.appendChild(stepsWrap);
    grid.appendChild(card);
  }

  modal.appendChild(grid);

  // Footer with Start/Close button
  const footer = document.createElement('div');
  footer.className = 'rsc-recipe-modal-footer';

  const hintText = document.createElement('span');
  hintText.className = 'rsc-recipe-modal-hint';
  hintText.textContent = '💡 Mẹo: Bạn có thể bấm nút "📖 Công thức (H)" ở góc phải trên bất cứ lúc nào để xem lại!';

  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'rsc-recipe-modal-confirm-btn';
  confirmBtn.textContent = isIntroPopup ? '👍 ĐÃ HIỂU! BẮT ĐẦU NẤU' : 'ĐÓNG SỔ TAY (Esc)';

  footer.appendChild(hintText);
  footer.appendChild(confirmBtn);
  modal.appendChild(footer);

  backdrop.appendChild(modal);
  parent.appendChild(backdrop);

  const cleanup = () => {
    window.removeEventListener('keydown', onKeyDown);
    backdrop.remove();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Escape' || (isIntroPopup && e.code === 'Space')) {
      cleanup();
    }
  };
  window.addEventListener('keydown', onKeyDown);

  confirmBtn.onclick = cleanup;
  closeIconBtn.onclick = cleanup;
  backdrop.onclick = e => {
    if (e.target === backdrop) cleanup();
  };

  return cleanup;
}
