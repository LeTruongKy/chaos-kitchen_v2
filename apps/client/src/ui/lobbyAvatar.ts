import { PLAYER_COLORS, type PlayerCosmetic } from '@kitchen/core';

export function createPlayerAvatar(cosmetic?: PlayerCosmetic, fallbackColorHex: number = 0xe74c3c): HTMLElement {
  const container = document.createElement('div');
  container.className = 'slot-avatar';

  const color = cosmetic ? (PLAYER_COLORS[cosmetic.color] ?? fallbackColorHex) : fallbackColorHex;
  const hexStr = `#${color.toString(16).padStart(6, '0')}`;
  const hat = cosmetic?.hat ?? 0;
  const species = cosmetic?.species ?? 0;
  const skinIndex = Math.max(0, Math.min(5, hat * 2 + species));

  let bodySvg = `
    <ellipse cx="24" cy="44" rx="15" ry="11" fill="#ffffff" stroke="#1e293b" stroke-width="1.8" />
    <path d="M18,35 L24,42 L30,35" fill="${hexStr}" stroke="#1e293b" stroke-width="1.4" />
  `;
  let headAccessorySvg = '';
  let faceExtraSvg = '';

  if (skinIndex === 0) {
    // Đầu Bếp Mũ Cao (Tall Toque Blanche)
    headAccessorySvg = `
      <path d="M14,17 Q10,5 24,4 Q38,5 34,17 Z" fill="#ffffff" stroke="#1e293b" stroke-width="1.8" />
      <rect x="14" y="15" width="20" height="4.5" rx="1.5" fill="#ffffff" stroke="#1e293b" stroke-width="1.6" />
      <rect x="14" y="17.5" width="20" height="2" fill="${hexStr}" />
    `;
  } else if (skinIndex === 1) {
    // Đầu Bếp Nam (Classic Beret Cap + Mustache)
    headAccessorySvg = `
      <ellipse cx="24" cy="14" rx="14" ry="5.5" transform="rotate(-6 24 14)" fill="#ffffff" stroke="#1e293b" stroke-width="1.8" />
      <rect x="15" y="15" width="18" height="3" rx="1" fill="${hexStr}" />
    `;
    faceExtraSvg = `
      <path d="M19,29 Q24,27 29,29" fill="none" stroke="#4b2e1e" stroke-width="2" stroke-linecap="round" />
    `;
  } else if (skinIndex === 2) {
    // Đầu Bếp Nữ (Hair + Chef Bandana)
    headAccessorySvg = `
      <circle cx="35" cy="22" r="5" fill="#6b3410" stroke="#1e293b" stroke-width="1.5" />
      <path d="M13,23 Q15,12 24,12 Q33,12 35,23" fill="#6b3410" stroke="#1e293b" stroke-width="1.6" />
      <path d="M14,19 Q24,14 34,19" fill="none" stroke="${hexStr}" stroke-width="3.5" stroke-linecap="round" />
    `;
  } else if (skinIndex === 3) {
    // Kimono Nhật (Hair Bun + Kanzashi Chopsticks + Kimono Collar)
    bodySvg = `
      <ellipse cx="24" cy="44" rx="15" ry="11" fill="${hexStr}" stroke="#1e293b" stroke-width="1.8" />
      <path d="M17,34 L24,44 L31,34" fill="none" stroke="#fef08a" stroke-width="2.2" />
    `;
    headAccessorySvg = `
      <line x1="14" y1="8" x2="34" y2="14" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" />
      <circle cx="24" cy="10" r="6" fill="#1e293b" />
      <path d="M13,24 Q14,13 24,13 Q34,13 35,24" fill="#1e293b" />
      <circle cx="16" cy="15" r="2.8" fill="#fb7185" />
    `;
  } else if (skinIndex === 4) {
    // Hải Tặc (Pirate Bandana + Eyepatch + Beard)
    bodySvg = `
      <ellipse cx="24" cy="44" rx="15" ry="11" fill="${hexStr}" stroke="#1e293b" stroke-width="1.8" />
      <rect x="19" y="36" width="10" height="10" fill="#fef08a" />
    `;
    headAccessorySvg = `
      <path d="M12,20 Q24,9 36,20 Z" fill="${hexStr}" stroke="#1e293b" stroke-width="1.8" />
      <rect x="12" y="18" width="24" height="3.5" rx="1.5" fill="#1e293b" />
      <circle cx="37" cy="20" r="3" fill="${hexStr}" stroke="#1e293b" stroke-width="1.4" />
    `;
    faceExtraSvg = `
      <circle cx="28" cy="25.5" r="3" fill="#111827" />
      <line x1="14" y1="22" x2="34" y2="27" stroke="#111827" stroke-width="1.4" />
    `;
  } else {
    // Quản Lý Vest (Sleek Hair + Suit & Red Tie)
    bodySvg = `
      <ellipse cx="24" cy="44" rx="15" ry="11" fill="#1e293b" stroke="#0f172a" stroke-width="1.8" />
      <polygon points="20,35 28,35 24,45" fill="#ffffff" />
      <polygon points="23,36 25,36 25.5,44 22.5,44" fill="${hexStr}" />
    `;
    headAccessorySvg = `
      <path d="M13,22 Q14,12 25,12 Q35,12 35,22 Q28,16 13,22 Z" fill="#3b2314" stroke="#1e293b" stroke-width="1.5" />
    `;
  }

  container.innerHTML = `
    <svg width="54" height="54" viewBox="0 0 48 48" class="avatar-svg">
      <!-- Glow & Background medal -->
      <circle cx="24" cy="24" r="22" fill="${hexStr}" fill-opacity="0.28" stroke="${hexStr}" stroke-width="2.8" />
      <circle cx="24" cy="24" r="19" fill="#0f172a" fill-opacity="0.45" />
      <!-- Body / Outfit -->
      ${bodySvg}
      <!-- Head -->
      <circle cx="24" cy="26" r="10.8" fill="#ffd4ad" stroke="#1e293b" stroke-width="1.8" />
      <!-- Rosy Cheeks -->
      <circle cx="17.5" cy="28" r="1.8" fill="#fb7185" fill-opacity="0.55" />
      <circle cx="30.5" cy="28" r="1.8" fill="#fb7185" fill-opacity="0.55" />
      <!-- Eyes & Smile -->
      <circle cx="20" cy="25.5" r="1.6" fill="#1e293b" />
      <circle cx="28" cy="25.5" r="1.6" fill="#1e293b" />
      <path d="M21.2,29.5 Q24,32.2 26.8,29.5" fill="none" stroke="#1e293b" stroke-width="1.6" stroke-linecap="round" />
      ${faceExtraSvg}
      <!-- Headgear / Hair -->
      ${headAccessorySvg}
    </svg>
  `;

  return container;
}

export function createEmptySlotAvatar(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'slot-avatar empty';
  container.innerHTML = `
    <svg width="54" height="54" viewBox="0 0 48 48" class="avatar-svg empty-svg">
      <circle cx="24" cy="24" r="22" fill="#1e293b" fill-opacity="0.45" stroke="#64748b" stroke-dasharray="4,3" stroke-width="2" />
      <circle cx="24" cy="19" r="7.5" fill="#64748b" fill-opacity="0.35" />
      <ellipse cx="24" cy="37" rx="11.5" ry="6.5" fill="#64748b" fill-opacity="0.35" />
      <text x="24" y="23" text-anchor="middle" fill="#94a3b8" font-size="11" font-weight="900">+</text>
    </svg>
  `;
  return container;
}
