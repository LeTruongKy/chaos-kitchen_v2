import './polyfill';
import './ui/base.css';
import { appStore, AppState } from './state/store';
import { mountRouter } from './state/router';
import { readPlayerName, savePlayerName } from './state/storage';
import { NetClient } from './net/NetClient';
import { mountLobby } from './ui/lobby';
import { getInviteRoomCode, mountMenu } from './ui/menu';
import { mountHud } from './ui/hud';
import { mountResults } from './ui/results';
import { showToast } from './ui/toast';
import { GameScreen } from './game/GameScreen';
import { getLevel } from '@kitchen/core';
import { sfx } from './game/audio/Sfx';
import { audioManager } from './game/audio/AudioManager';
import { mountAssetsView } from './ui/assetsView';
import { mountItemsView } from './ui/itemsView';
import { MenuRenderer } from './game/renderer3d/MenuRenderer';
import { getSettings, subscribe as subscribeSettings } from './state/settings';

audioManager.init();

const menuBg = document.createElement('div');
menuBg.style.position = 'absolute';
menuBg.style.top = '0';
menuBg.style.left = '0';
menuBg.style.width = '100%';
menuBg.style.height = '100%';
menuBg.style.zIndex = '0';
document.body.appendChild(menuBg);

const root = document.querySelector<HTMLElement>('#app');
const gameRoot = document.querySelector<HTMLElement>('#game');
if (!root || !gameRoot) throw new Error('Missing application roots.');

if (window.location.search.includes('view=assets')) {
  mountAssetsView(root);
} else if (window.location.search.includes('view=items')) {
  mountItemsView(root);
} else if (window.location.search.includes('view=stations')) {
  import('./ui/stationsView').then(m => m.mountStationsView(root));
} else if (window.location.search.includes('view=thumbs')) {
  import('./ui/thumbsView').then(m => m.mountThumbsView(root));
} else {
  // to avoid errors in the rest of the file that we can't easily indent,
  // we'll just not use else, but rather return or wrap.
  // Wait, top-level return is not allowed unless it's a module.
  // We can just set a flag and skip mountRouter.
  window.addEventListener('contextmenu', (e) => e.preventDefault());

  appStore.set({ name: readPlayerName() });
  appStore.subscribe((state) => {
    savePlayerName(state.name);
    if (state.roomCode) {
      document.title = `Chaos Kitchen — Phòng ${state.roomCode}`;
    } else {
      document.title = 'Chaos Kitchen';
    }
  });
const roomCode = getInviteRoomCode(window.location.search);
if (roomCode) appStore.set({ roomCode });
const netClient = new NetClient(appStore);
(window as any).netClient = netClient;
(window as any).appStore = appStore;

if (typeof window !== 'undefined' && window.location.search.includes('debug=1')) {
  import('./game/renderer3d/chef/quatClips').then(m => m.loadQuatModel().then(res => {
    if (!(window as any).__QUAT__) {
      (window as any).__QUAT__ = {
        key: 'idle',
        once: false,
        timeScale: 1.0,
        scale: res.scale,
        h: res.height,
        actingStation: null,
        ready: true
      };
    } else {
      (window as any).__QUAT__.ready = true;
    }
  })).catch(() => {});
}

let prevState = appStore.get();
let activeGameScreen: GameScreen | null = null;

function syncGameScene(prev: AppState, next: AppState) {
  if (next.screen === 'game') {
    if (gameRoot) gameRoot.style.display = 'block';
    
    const levelChanged = next.lobby?.levelId !== prev.lobby?.levelId;
    const enteredGame = prev.screen !== 'game';

    if ((enteredGame || levelChanged) && next.lobby?.levelId) {
      const levelDef = getLevel(next.lobby.levelId);
      if (levelDef) {
        if (activeGameScreen) {
          activeGameScreen.destroy();
          activeGameScreen = null;
        }
        if (gameRoot) {
          gameRoot.replaceChildren();
        }
        activeGameScreen = new GameScreen(gameRoot!, netClient, levelDef);
      }
    }
  } else {
    if (gameRoot) gameRoot.style.display = 'none';
    if (activeGameScreen) {
      activeGameScreen.destroy();
      activeGameScreen = null;
      if (gameRoot) {
        gameRoot.replaceChildren();
      }
    }
  }
}

let menuScene: MenuRenderer | null = null;

function disposeMenuScene() {
  if (menuScene) {
    menuScene.dispose();
    menuScene = null;
  }
  menuBg.style.display = 'none';
}

function syncMenuScene(next: AppState) {
  if (next.screen !== 'menu') {
    disposeMenuScene();
  }
}

appStore.subscribe((state) => {
  if (state.screen !== 'menu') {
    disposeMenuScene();
  }
  syncGameScene(prevState, state);
  
  if (state.error && state.error !== prevState.error) {
    showToast(state.error);
    setTimeout(() => appStore.set({ error: null }), 0); // Clear it
  }
  
  prevState = state;
});

const fpsBadge = document.createElement('div');
fpsBadge.id = 'fps-badge';
fpsBadge.style.position = 'fixed';
fpsBadge.style.top = '10px';
fpsBadge.style.left = '10px';
fpsBadge.style.zIndex = '9999';
fpsBadge.style.background = 'rgba(0, 0, 0, 0.7)';
fpsBadge.style.color = '#2ecc71';
fpsBadge.style.fontFamily = 'monospace';
fpsBadge.style.fontSize = '12px';
fpsBadge.style.fontWeight = 'bold';
fpsBadge.style.padding = '4px 8px';
fpsBadge.style.borderRadius = '4px';
fpsBadge.style.pointerEvents = 'none';
document.body.appendChild(fpsBadge);

let fpsFrames = 0;
let lastFpsTime = performance.now();
function fpsTick() {
  requestAnimationFrame(fpsTick);
  fpsFrames++;
  const now = performance.now();
  if (now - lastFpsTime >= 500) {
    const fps = Math.round((fpsFrames * 1000) / (now - lastFpsTime));
    fpsBadge.textContent = `FPS: ${fps}`;
    fpsFrames = 0;
    lastFpsTime = now;
  }
}
fpsTick();

fpsBadge.style.display = getSettings().showFps ? 'block' : 'none';
subscribeSettings((settings) => {
  fpsBadge.style.display = settings.showFps ? 'block' : 'none';
});

mountRouter(appStore, (state) => {
  if (state.screen === 'menu' || state.screen === 'lobby') {
    sfx.playMenuMusic();
    sfx.stopBgm();
  } else if (state.screen === 'game') {
    sfx.stopMenuMusic();
    sfx.playBgm();
  } else {
    sfx.stopMenuMusic();
    sfx.stopBgm();
  }
  
  if (state.screen === 'lobby') {
    disposeMenuScene();
    return mountLobby(root, state, netClient, netClient.sessionId || '');
  }
  if (state.screen === 'game') {
    disposeMenuScene();
    const unmount = mountHud(root, state, netClient);
    return { unmount };
  }
  if (state.screen === 'results') {
    disposeMenuScene();
    const unmount = mountResults(root, state, netClient);
    return { unmount };
  }
  
  menuBg.style.display = 'block';
  if (!menuScene) {
    try {
      menuScene = new MenuRenderer(menuBg);
    } catch (e) {
      console.warn('[MenuRenderer] Fallback to 2D menu background:', e);
    }
  }
  const unmount = mountMenu(root, state, netClient);
  return {
    unmount: () => {
      disposeMenuScene();
      unmount();
    }
  };
});
}

