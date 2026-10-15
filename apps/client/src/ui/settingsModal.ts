import { getSettings, updateSettings, Quality } from '../state/settings';
import { getCustomServerUrl, getServerUrl, saveCustomServerUrl } from '../net/serverUrl';

export function openSettingsModal(parent: HTMLElement = document.body): HTMLElement {
  // If modal is already open, do not open another
  const existing = document.getElementById('settings-modal-overlay');
  if (existing) return existing;

  const currentSettings = getSettings();
  let lastNonZeroMusic = currentSettings.music > 0 ? currentSettings.music : 50;

  const overlay = document.createElement('div');
  overlay.id = 'settings-modal-overlay';
  overlay.className = 'modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'modal settings-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Cài đặt');
  modal.style.maxHeight = '92vh';
  modal.style.overflowY = 'auto';
  modal.style.touchAction = 'pan-y';

  const heading = document.createElement('h2');
  heading.textContent = 'Cài đặt';

  const closeTopBtn = document.createElement('button');
  closeTopBtn.className = 'modal-close';
  closeTopBtn.textContent = '✕';
  closeTopBtn.setAttribute('aria-label', 'Đóng');

  const form = document.createElement('div');
  form.className = 'settings-form';
  form.style.display = 'grid';
  form.style.gap = '1rem';
  form.style.textAlign = 'left';
  form.style.marginTop = '0.8rem';

  // 1. Quality (low / medium / high)
  const qualityGroup = document.createElement('div');
  qualityGroup.className = 'setting-item';
  const qualityLabel = document.createElement('label');
  qualityLabel.textContent = 'Chất lượng đồ họa';
  qualityLabel.htmlFor = 'setting-quality-select';
  qualityLabel.style.display = 'block';
  qualityLabel.style.marginBottom = '0.35rem';
  qualityLabel.style.fontWeight = 'bold';

  const qualitySelect = document.createElement('select');
  qualitySelect.id = 'setting-quality-select';
  const qualities: { value: Quality; label: string }[] = [
    { value: 'low', label: 'Thấp (Low)' },
    { value: 'medium', label: 'Trung bình (Medium)' },
    { value: 'high', label: 'Cao (High)' }
  ];
  for (const q of qualities) {
    const opt = document.createElement('option');
    opt.value = q.value;
    opt.textContent = q.label;
    if (currentSettings.quality === q.value) opt.selected = true;
    qualitySelect.appendChild(opt);
  }
  qualitySelect.addEventListener('change', () => {
    updateSettings({ quality: qualitySelect.value as Quality });
  });
  qualityGroup.append(qualityLabel, qualitySelect);

  // 2. Music (Toggle + 0-100 Volume)
  const musicGroup = document.createElement('div');
  musicGroup.className = 'setting-item';

  const musicHeader = document.createElement('div');
  musicHeader.style.display = 'flex';
  musicHeader.style.justifyContent = 'space-between';
  musicHeader.style.alignItems = 'center';
  musicHeader.style.marginBottom = '0.35rem';

  const musicLabel = document.createElement('label');
  musicLabel.textContent = 'Nhạc nền';
  musicLabel.style.fontWeight = 'bold';

  const musicToggleLabel = document.createElement('label');
  musicToggleLabel.style.display = 'flex';
  musicToggleLabel.style.alignItems = 'center';
  musicToggleLabel.style.gap = '0.35rem';
  musicToggleLabel.style.fontSize = '0.9rem';
  musicToggleLabel.style.cursor = 'pointer';

  const musicToggle = document.createElement('input');
  musicToggle.type = 'checkbox';
  musicToggle.id = 'setting-music-toggle';
  musicToggle.checked = currentSettings.music > 0;
  musicToggleLabel.append(musicToggle, document.createTextNode('Bật nhạc'));

  musicHeader.append(musicLabel, musicToggleLabel);

  const musicSliderRow = document.createElement('div');
  musicSliderRow.style.display = 'flex';
  musicSliderRow.style.alignItems = 'center';
  musicSliderRow.style.gap = '0.75rem';

  const musicSlider = document.createElement('input');
  musicSlider.type = 'range';
  musicSlider.id = 'setting-music-slider';
  musicSlider.min = '0';
  musicSlider.max = '100';
  musicSlider.value = String(currentSettings.music);
  musicSlider.style.flex = '1';

  const musicVal = document.createElement('span');
  musicVal.id = 'setting-music-val';
  musicVal.style.minWidth = '2.5rem';
  musicVal.style.textAlign = 'right';
  musicVal.textContent = `${currentSettings.music}%`;

  musicSliderRow.append(musicSlider, musicVal);

  musicToggle.addEventListener('change', () => {
    if (musicToggle.checked) {
      const vol = lastNonZeroMusic > 0 ? lastNonZeroMusic : 50;
      musicSlider.value = String(vol);
      musicVal.textContent = `${vol}%`;
      updateSettings({ music: vol });
    } else {
      musicSlider.value = '0';
      musicVal.textContent = '0%';
      updateSettings({ music: 0 });
    }
  });

  musicSlider.addEventListener('input', () => {
    const val = Number(musicSlider.value);
    if (val > 0) lastNonZeroMusic = val;
    musicToggle.checked = val > 0;
    musicVal.textContent = `${val}%`;
    updateSettings({ music: val });
  });

  musicGroup.append(musicHeader, musicSliderRow);

  // 3. SFX (0-100 Volume)
  const sfxGroup = document.createElement('div');
  sfxGroup.className = 'setting-item';

  const sfxHeader = document.createElement('div');
  sfxHeader.style.display = 'flex';
  sfxHeader.style.justifyContent = 'space-between';
  sfxHeader.style.marginBottom = '0.35rem';

  const sfxLabel = document.createElement('label');
  sfxLabel.textContent = 'Hiệu ứng âm thanh (SFX)';
  sfxLabel.style.fontWeight = 'bold';

  const sfxVal = document.createElement('span');
  sfxVal.id = 'setting-sfx-val';
  sfxVal.style.minWidth = '2.5rem';
  sfxVal.style.textAlign = 'right';
  sfxVal.textContent = `${currentSettings.sfx}%`;

  sfxHeader.append(sfxLabel, sfxVal);

  const sfxSlider = document.createElement('input');
  sfxSlider.type = 'range';
  sfxSlider.id = 'setting-sfx-slider';
  sfxSlider.min = '0';
  sfxSlider.max = '100';
  sfxSlider.value = String(currentSettings.sfx);
  sfxSlider.style.width = '100%';

  sfxSlider.addEventListener('input', () => {
    const val = Number(sfxSlider.value);
    sfxVal.textContent = `${val}%`;
    updateSettings({ sfx: val });
  });

  sfxGroup.append(sfxHeader, sfxSlider);

  // 4. Show FPS (toggle)
  const fpsGroup = document.createElement('div');
  fpsGroup.className = 'setting-item';
  fpsGroup.style.display = 'flex';
  fpsGroup.style.alignItems = 'center';
  fpsGroup.style.justifyContent = 'space-between';

  const fpsLabel = document.createElement('label');
  fpsLabel.textContent = 'Hiện FPS';
  fpsLabel.style.fontWeight = 'bold';
  fpsLabel.htmlFor = 'setting-fps-toggle';
  fpsLabel.style.cursor = 'pointer';

  const fpsToggle = document.createElement('input');
  fpsToggle.type = 'checkbox';
  fpsToggle.id = 'setting-fps-toggle';
  fpsToggle.checked = currentSettings.showFps;
  fpsToggle.style.cursor = 'pointer';
  fpsToggle.style.width = '1.2rem';
  fpsToggle.style.height = '1.2rem';

  fpsToggle.addEventListener('change', () => {
    updateSettings({ showFps: fpsToggle.checked });
  });

  fpsGroup.append(fpsLabel, fpsToggle);

  // 5. Server URL (for GitHub Pages / Custom Online Server)
  const serverGroup = document.createElement('div');
  serverGroup.className = 'setting-item';
  const serverLabel = document.createElement('label');
  serverLabel.textContent = 'Máy chủ Online (Server URL)';
  serverLabel.htmlFor = 'setting-server-url-input';
  serverLabel.style.display = 'block';
  serverLabel.style.marginBottom = '0.3rem';
  serverLabel.style.fontWeight = 'bold';

  const serverInput = document.createElement('input');
  serverInput.type = 'text';
  serverInput.id = 'setting-server-url-input';
  serverInput.placeholder = getServerUrl();
  serverInput.value = getCustomServerUrl();
  serverInput.style.width = '100%';
  serverInput.style.fontSize = '0.85rem';
  serverInput.style.padding = '0.45rem 0.65rem';
  serverInput.addEventListener('change', () => {
    saveCustomServerUrl(serverInput.value);
    const nc = (window as any).netClient;
    if (nc && typeof nc.setServerUrl === 'function') {
      nc.setServerUrl(serverInput.value);
    }
  });

  const serverHint = document.createElement('small');
  serverHint.style.display = 'block';
  serverHint.style.color = '#94a3b8';
  serverHint.style.fontSize = '0.75rem';
  serverHint.style.marginTop = '0.2rem';
  serverHint.textContent = 'Để trống nếu dùng mặc định, hoặc dán link Render / Tunnel (vd: wss://...onrender.com)';

  serverGroup.append(serverLabel, serverInput, serverHint);

  // 6. Close button
  const closeBottomBtn = document.createElement('button');
  closeBottomBtn.type = 'button';
  closeBottomBtn.id = 'setting-close-btn';
  closeBottomBtn.className = 'settings-close-btn';
  closeBottomBtn.textContent = 'Đóng';
  closeBottomBtn.style.marginTop = '0.3rem';
  closeBottomBtn.style.width = '100%';

  const closeModal = () => {
    saveCustomServerUrl(serverInput.value);
    overlay.remove();
    window.removeEventListener('keydown', onEsc);
  };

  const onEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape') closeModal();
  };
  window.addEventListener('keydown', onEsc);

  closeTopBtn.addEventListener('click', closeModal);
  closeBottomBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  form.append(qualityGroup, musicGroup, sfxGroup, fpsGroup, serverGroup, closeBottomBtn);
  modal.append(heading, closeTopBtn, form);
  overlay.appendChild(modal);
  parent.appendChild(overlay);

  return overlay;
}

