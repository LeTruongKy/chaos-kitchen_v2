// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sfx, Sfx } from '../game/audio/Sfx';
import { updateSettings } from '../state/settings';

describe('Phase 6 - SFX System Automated Verification', () => {
  let mockCtx: any;
  let createdNodes: {
    oscillators: any[];
    gains: any[];
    buffers: any[];
    sources: any[];
    filters: any[];
  };

  beforeEach(() => {
    localStorage.setItem('ck_sound', '2'); // SFX enabled
    updateSettings({ sfx: 100, master: 100 });
    (sfx as any).state = '2';
    (sfx as any).eventTimes.clear();

    createdNodes = {
      oscillators: [],
      gains: [],
      buffers: [],
      sources: [],
      filters: []
    };

    mockCtx = {
      currentTime: 100.0,
      state: 'running',
      sampleRate: 44100,
      destination: {},
      resume: vi.fn(),
      createOscillator: vi.fn().mockImplementation(() => {
        const osc = {
          type: 'sine',
          frequency: {
            value: 0,
            setValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn()
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn()
        };
        createdNodes.oscillators.push(osc);
        return osc;
      }),
      createGain: vi.fn().mockImplementation(() => {
        const gain = {
          gain: {
            value: 1,
            setValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn()
          },
          connect: vi.fn(),
          disconnect: vi.fn()
        };
        createdNodes.gains.push(gain);
        return gain;
      }),
      createBuffer: vi.fn().mockImplementation((channels, length, rate) => {
        const buf = {
          length,
          sampleRate: rate,
          getChannelData: vi.fn().mockReturnValue(new Float32Array(length))
        };
        createdNodes.buffers.push(buf);
        return buf;
      }),
      createBufferSource: vi.fn().mockImplementation(() => {
        const src = {
          buffer: null,
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn()
        };
        createdNodes.sources.push(src);
        return src;
      }),
      createBiquadFilter: vi.fn().mockImplementation(() => {
        const filter = {
          type: 'lowpass',
          frequency: {
            setValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn()
          },
          connect: vi.fn(),
          disconnect: vi.fn()
        };
        createdNodes.filters.push(filter);
        return filter;
      })
    };

    (sfx as any).ctx = mockCtx;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // 1. Mỗi event trong danh sách BƯỚC 3 gọi đúng một hàm âm (không rơi vào nhánh rỗng)
  it('1. Mỗi event trong danh sách BƯỚC 3 gọi đúng một hàm âm', () => {
    const methodsToSpy = [
      'playIgnite',
      'playExtinguish',
      'playThrow',
      'playCustomerLeaveServed',
      'playCustomerLeaveExpired',
      'playStreakUp',
      'playStreakLost',
      'playOvenDone',
      'playPizzaBurnt',
      'playPotDone',
      'playSoupBurnt'
    ] as const;

    const spies: Record<string, any> = {};
    for (const m of methodsToSpy) {
      spies[m] = vi.spyOn(sfx as any, m);
    }

    // ignite
    sfx.playEvent('ignite', 0);
    expect(spies.playIgnite).toHaveBeenCalledTimes(1);

    // extinguish
    sfx.playEvent('extinguish', 0);
    expect(spies.playExtinguish).toHaveBeenCalledTimes(1);

    // throw
    sfx.playEvent('throw', 0);
    expect(spies.playThrow).toHaveBeenCalledTimes(1);

    // customer_leave served
    sfx.playEvent('customer_leave', 0, { reason: 'served' });
    expect(spies.playCustomerLeaveServed).toHaveBeenCalledTimes(1);

    // customer_leave expired
    sfx.playEvent('customer_leave', 0, { reason: 'expired' });
    expect(spies.playCustomerLeaveExpired).toHaveBeenCalledTimes(1);

    // streak_up
    sfx.playEvent('streak_up', 0, { streak: 2 });
    expect(spies.playStreakUp).toHaveBeenCalledWith(2, 0);

    // streak_lost
    sfx.playEvent('streak_lost', 0);
    expect(spies.playStreakLost).toHaveBeenCalledTimes(1);

    // oven_done
    sfx.playEvent('oven_done', 0);
    expect(spies.playOvenDone).toHaveBeenCalledTimes(1);

    // pizza_burnt
    sfx.playEvent('pizza_burnt', 0);
    expect(spies.playPizzaBurnt).toHaveBeenCalledTimes(1);

    // pot_done
    sfx.playEvent('pot_done', 0);
    expect(spies.playPotDone).toHaveBeenCalledTimes(1);

    // soup_burnt
    sfx.playEvent('soup_burnt', 0);
    expect(spies.playSoupBurnt).toHaveBeenCalledTimes(1);
  });

  // 2. customer_leave: reason served và expired gọi hai hàm khác nhau
  it('2. customer_leave: reason served và expired gọi hai hàm khác nhau', () => {
    const spyServed = vi.spyOn(sfx, 'playCustomerLeaveServed');
    const spyExpired = vi.spyOn(sfx, 'playCustomerLeaveExpired');

    // Case 1: served
    sfx.playEvent('customer_leave', 0, { reason: 'served' });
    expect(spyServed).toHaveBeenCalledTimes(1);
    expect(spyExpired).not.toHaveBeenCalled();

    spyServed.mockClear();
    spyExpired.mockClear();

    // Case 2: expired
    sfx.playEvent('customer_leave', 0, { reason: 'expired' });
    expect(spyServed).not.toHaveBeenCalled();
    expect(spyExpired).toHaveBeenCalledTimes(1);

    spyServed.mockClear();
    spyExpired.mockClear();

    // Case 3: no_order_taken (also calls expired / sad sound)
    sfx.playEvent('customer_leave', 0, { reason: 'no_order_taken' });
    expect(spyServed).not.toHaveBeenCalled();
    expect(spyExpired).toHaveBeenCalledTimes(1);
  });

  // 3. Tắt âm: không tạo node nào khi settings.sfx = 0 hoặc ck_sound = 0
  it('3. Tắt âm: không tạo node AudioContext nào khi settings.sfx = 0', () => {
    updateSettings({ sfx: 0 });

    const totalNodesCount = () =>
      mockCtx.createOscillator.mock.calls.length +
      mockCtx.createGain.mock.calls.length +
      mockCtx.createBuffer.mock.calls.length +
      mockCtx.createBufferSource.mock.calls.length +
      mockCtx.createBiquadFilter.mock.calls.length;

    // Trigger all event types
    const events = [
      'ignite', 'extinguish', 'throw', 'customer_leave', 'streak_up',
      'streak_lost', 'oven_done', 'pizza_burnt', 'pot_done', 'soup_burnt',
      'chop_done', 'cook_done', 'burnt', 'serve_ok', 'serve_fail'
    ];

    for (const ev of events) {
      sfx.playEvent(ev, 0);
    }
    sfx.playIgnite();
    sfx.playExtinguish();
    sfx.playThrow();
    sfx.playCustomerLeaveServed();
    sfx.playCustomerLeaveExpired();
    sfx.playStreakUp(3);
    sfx.playStreakLost();
    sfx.playOvenDone();
    sfx.playPizzaBurnt();
    sfx.playPotDone();
    sfx.playSoupBurnt();

    expect(totalNodesCount()).toBe(0);
  });

  it('3b. Tắt âm: không tạo node AudioContext nào khi ck_sound = 0', () => {
    updateSettings({ sfx: 100 });
    (sfx as any).state = '0'; // Muted

    const totalNodesCount = () =>
      mockCtx.createOscillator.mock.calls.length +
      mockCtx.createGain.mock.calls.length +
      mockCtx.createBuffer.mock.calls.length +
      mockCtx.createBufferSource.mock.calls.length +
      mockCtx.createBiquadFilter.mock.calls.length;

    sfx.playEvent('ignite', 0);
    sfx.playEvent('throw', 0);
    sfx.playEvent('extinguish', 0);
    sfx.playEvent('customer_leave', 0, { reason: 'served' });
    sfx.playEvent('streak_up', 0);
    sfx.playEvent('oven_done', 0);
    sfx.playEvent('pizza_burnt', 0);
    sfx.playEvent('pot_done', 0);
    sfx.playEvent('soup_burnt', 0);

    expect(totalNodesCount()).toBe(0);
  });

  // 4. Âm không vượt 1.5 giây
  it('4. Âm của mọi sự kiện mới không vượt 1.5 giây', () => {
    const testCases: Array<{ name: string; fn: () => void }> = [
      { name: 'ignite', fn: () => sfx.playIgnite(0) },
      { name: 'extinguish', fn: () => sfx.playExtinguish(0) },
      { name: 'throw', fn: () => sfx.playThrow(0) },
      { name: 'customer_leave_served', fn: () => sfx.playCustomerLeaveServed(0) },
      { name: 'customer_leave_expired', fn: () => sfx.playCustomerLeaveExpired(0) },
      { name: 'streak_up', fn: () => sfx.playStreakUp(3, 0) },
      { name: 'streak_lost', fn: () => sfx.playStreakLost(0) },
      { name: 'oven_done', fn: () => sfx.playOvenDone(0) },
      { name: 'pizza_burnt', fn: () => sfx.playPizzaBurnt(0) },
      { name: 'pot_done', fn: () => sfx.playPotDone(0) },
      { name: 'soup_burnt', fn: () => sfx.playSoupBurnt(0) }
    ];

    for (const tc of testCases) {
      createdNodes.oscillators = [];
      createdNodes.sources = [];
      (sfx as any).eventTimes.clear();
      mockCtx.currentTime = 10.0;

      tc.fn();

      // Check stop time on oscillators and buffer sources
      const stoppedNodes = [...createdNodes.oscillators, ...createdNodes.sources];
      expect(stoppedNodes.length, `${tc.name} should create at least one audio generator`).toBeGreaterThan(0);

      for (const node of stoppedNodes) {
        expect(node.stop).toHaveBeenCalled();
        const stopTime = node.stop.mock.calls[0]?.[0];
        expect(typeof stopTime).toBe('number');
        const duration = stopTime - mockCtx.currentTime;
        expect(duration, `${tc.name} duration (${duration}s) must be > 0 and <= 1.5s`).toBeGreaterThan(0);
        expect(duration, `${tc.name} duration (${duration}s) must not exceed 1.5s`).toBeLessThanOrEqual(1.5);
      }
    }
  });

  // 5. Chồng âm: không quá 3 âm cùng event trong 200 ms (test bằng mock)
  it('5. Chồng âm: không quá 3 âm cùng event trong 200 ms', () => {
    (sfx as any).eventTimes.clear();
    mockCtx.currentTime = 50.0;

    // Call 4 times within 200ms
    sfx.playIgnite(0); // 1st
    sfx.playIgnite(0); // 2nd
    sfx.playIgnite(0); // 3rd
    sfx.playIgnite(0); // 4th (should be throttled)

    // Only 3 oscillators should have been created for ignite
    expect(createdNodes.oscillators.length).toBe(3);

    // Advance mock time by 250ms (> 200ms window)
    mockCtx.currentTime = 50.25;

    sfx.playIgnite(0); // 5th (allowed now)
    expect(createdNodes.oscillators.length).toBe(4);
  });
});
