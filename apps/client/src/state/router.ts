import type { AppState, Store } from './store';

export type ScreenHandle = { unmount(): void; update?(state: AppState): void };
export type RenderScreen = (state: AppState) => ScreenHandle;

/** Connects the application store to one screen renderer and cleans up on disposal. */
export function mountRouter(store: Store<AppState>, render: RenderScreen): () => void {
  let currentState = store.get();
  let handle = render(currentState);
  
  const unsubscribe = store.subscribe((nextState) => {
    if (currentState.screen !== nextState.screen) {
      handle.unmount();
      currentState = nextState;
      handle = render(currentState);
    } else {
      currentState = nextState;
      if (handle.update) {
        handle.update(currentState);
      }
    }
  });
  return () => { unsubscribe(); handle.unmount(); };
}
