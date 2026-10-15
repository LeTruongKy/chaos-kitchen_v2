import type { AppState } from '../state/store';
export type Unmount = () => void;
export function mountScreen(root: HTMLElement, state: AppState): Unmount {
  const screen = document.createElement('main'); screen.className = 'screen';
  const panel = document.createElement('section'); panel.className = 'panel';
  const heading = document.createElement('h1'); heading.textContent = state.screen === 'menu' ? 'Chaos Kitchen' : state.screen;
  panel.append(heading); screen.append(panel); root.replaceChildren(screen);
  return () => screen.remove();
}
