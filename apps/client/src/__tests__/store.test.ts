import { describe, expect, it } from 'vitest';
import { createStore, AppState } from '../state/store.js';
import { mountRouter } from '../state/router.js';

describe('createStore', () => {
  it('patches state and notifies subscribers until unsubscribed', () => {
    const store = createStore({ value: 1 }); const values: number[] = [];
    const unsubscribe = store.subscribe((state) => values.push(state.value));
    store.set({ value: 2 }); unsubscribe(); store.set({ value: 3 });
    expect(store.get()).toEqual({ value: 3 }); expect(values).toEqual([2]);
  });
});

describe('mountRouter', () => {
  it('unmounts each screen and removes its subscription after disposal', () => {
    const store = createStore<AppState>({ phase: 'lobby', screen: 'menu', name: '', roomCode: '', lobby: null, results: null, error: null, ping: 0, loading: false });
    let renders = 0; let unmounts = 0; let updates = 0;
    const dispose = mountRouter(store, () => { renders++; return { unmount: () => { unmounts++; }, update: () => { updates++; } }; });
    for (let index = 0; index < 100; index++) store.set({ ping: index });
    dispose(); store.set({ ping: 101 });
    expect(renders).toBe(1); 
    expect(updates).toBe(100);
    expect(unmounts).toBe(1);
  });
});
