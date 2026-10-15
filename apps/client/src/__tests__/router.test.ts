import { describe, it, expect, vi } from 'vitest';
import { mountRouter } from '../state/router';
import { createStore, AppState } from '../state/store';

describe('Router', () => {
  it('đổi ping 100 lần -> số lần mount = 1', () => {
    const store = createStore<AppState>({
      screen: 'lobby',
      phase: 'lobby',
      name: '',
      roomCode: '',
      lobby: null,
      results: null,
      error: null,
      ping: 0,
      loading: false
    });

    const mountFn = vi.fn().mockImplementation((state: AppState) => {
      return {
        unmount: vi.fn(),
        update: vi.fn()
      };
    });

    const unmountRouter = mountRouter(store, mountFn);

    expect(mountFn).toHaveBeenCalledTimes(1);

    for (let i = 0; i < 100; i++) {
      store.set({ ping: i });
    }
    
    store.set({ error: 'test error' });

    expect(mountFn).toHaveBeenCalledTimes(1);

    unmountRouter();
  });
});
