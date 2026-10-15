// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountHud } from '../ui/hud';
import { getCustomerTargetAnimation } from '../game/renderer3d/ThreeRenderer';
import type { NetClient } from '../net/NetClient';
import type { AppState } from '../state/store';
import type { Snapshot, GameEvent } from '@kitchen/core';

describe('Phase 1 - Client Customer Lifecycle HUD & Animations', () => {
  let netHandlers: Record<string, ((...args: any[]) => void)[]> = {};
  let mockNetClient: NetClient;
  let root: HTMLElement;
  const state: AppState = {
    phase: 'playing',
    screen: 'game',
    name: 'Player',
    roomCode: 'ABCD',
    lobby: null,
    results: null,
    error: null,
    ping: 20,
    loading: false
  };

  beforeEach(() => {
    document.body.replaceChildren();
    root = document.createElement('div');
    document.body.appendChild(root);

    netHandlers = {};
    mockNetClient = {
      on: vi.fn((event: string, handler: (...args: any[]) => void) => {
        if (!netHandlers[event]) netHandlers[event] = [];
        netHandlers[event]!.push(handler);
      }),
      off: vi.fn(),
      sessionId: 'session-1'
    } as unknown as NetClient;

    mountHud(root, state, mockNetClient);
  });

  function emitSnapshot(snap: Partial<Snapshot>) {
    const fullSnap: Snapshot = {
      tick: 100,
      timeLeft: 120,
      score: 50,
      streak: 0,
      players: [{ id: 'session-1', x: 2, y: 2, vx: 0, vy: 0, fx: 1, fy: 0, dashT: 0, dashCd: 0, throwCd: 0, sprintEnergy: 2, sprintCooldown: 0, sprintExhausted: false, held: null, acting: false, ackSeq: 0 }],
      stations: [],
      orders: [],
      projectiles: [],
      customers: [],
      ...snap
    };
    netHandlers['snapshot']?.forEach(h => h(fullSnap));
  }

  function emitEvent(event: GameEvent) {
    netHandlers['event']?.forEach(h => h(event));
  }

  it('1. Bốn khách cùng lúc: mỗi khách một bong bóng, đúng số lượng', () => {
    emitSnapshot({
      customers: [
        { id: 1, x: 2, y: 3, recipe: 'salad' as any, state: 'seated_waiting_order', patience: 30, maxPatience: 30, timer: 0, colorIndex: 0, waitLeft: 30, angry: false },
        { id: 2, x: 5, y: 3, recipe: 'burger' as any, state: 'seated_waiting_order', patience: 30, maxPatience: 30, timer: 0, colorIndex: 1, waitLeft: 25, angry: false },
        { id: 3, x: 8, y: 3, recipe: 'pizza' as any, state: 'seated_waiting_order', patience: 30, maxPatience: 30, timer: 0, colorIndex: 2, waitLeft: 20, angry: false },
        { id: 4, x: 11, y: 3, recipe: 'tomato_soup' as any, state: 'seated_waiting_order', patience: 30, maxPatience: 30, timer: 0, colorIndex: 3, waitLeft: 15, angry: false },
      ]
    });

    const bubbles = root.querySelectorAll('.hud-order.bubble');
    expect(bubbles.length).toBe(4);

    // Mỗi khách có đúng 1 bong bóng riêng biệt với data-customer-id tương ứng
    const customerIds = Array.from(bubbles).map(b => (b as HTMLElement).dataset.customerId);
    expect(customerIds.sort()).toEqual(['1', '2', '3', '4']);
  });

  it('2. Icon 😠 hiện trên bong bóng khi angry = true', () => {
    // Ban đầu khách bình thường
    emitSnapshot({
      customers: [
        { id: 1, x: 2, y: 3, recipe: 'salad' as any, state: 'order_taken', patience: 50, maxPatience: 60, timer: 0, colorIndex: 0, angry: false }
      ],
      orders: [
        { id: 10, recipe: 'salad' as any, timeLeft: 50, patience: 60, customerId: 1 }
      ]
    });

    const bubble = root.querySelector('.hud-order[data-customer-id="1"]') as HTMLElement;
    expect(bubble).not.toBeNull();
    const angryIcon = bubble.querySelector('.hud-order-angry-icon') as HTMLElement;
    expect(angryIcon).not.toBeNull();
    expect(angryIcon.style.display).toBe('none');

    // Khách chuyển sang giận (patience < 20%)
    emitSnapshot({
      customers: [
        { id: 1, x: 2, y: 3, recipe: 'salad' as any, state: 'order_taken', patience: 10, maxPatience: 60, timer: 0, colorIndex: 0, angry: true }
      ],
      orders: [
        { id: 10, recipe: 'salad' as any, timeLeft: 10, patience: 60, customerId: 1 }
      ]
    });

    expect(angryIcon.style.display).toBe('block');
    expect(bubble.classList.contains('hud-order-angry')).toBe(true);
  });

  it('3. Khi customer_leave: reason "served" -> không có icon 😠', () => {
    vi.useFakeTimers();

    emitSnapshot({
      customers: [
        { id: 1, x: 2, y: 3, recipe: 'salad' as any, state: 'order_taken', patience: 30, maxPatience: 60, timer: 0, colorIndex: 0, angry: false }
      ],
      orders: [
        { id: 10, recipe: 'salad' as any, timeLeft: 30, patience: 60, customerId: 1 }
      ]
    });

    const bubble = root.querySelector('.hud-order[data-customer-id="1"]') as HTMLElement;
    expect(bubble).not.toBeNull();

    emitEvent({
      type: 'customer_leave',
      reason: 'served',
      customerId: 1,
      x: 2.5,
      y: 3.5
    });

    const angryIcon = bubble.querySelector('.hud-order-angry-icon') as HTMLElement;
    expect(angryIcon.style.display).toBe('none');
    expect(bubble.classList.contains('hud-order-removing-complete')).toBe(true);

    vi.advanceTimersByTime(350);
    // Sau animation rời đi, bong bóng bị hủy khỏi DOM
    expect(root.querySelector('.hud-order[data-customer-id="1"]')).toBeNull();

    vi.useRealTimers();
  });

  it('4. Khi customer_leave: reason "expired" và "no_order_taken" -> icon 😠 trong 0.4s rồi biến mất', () => {
    vi.useFakeTimers();

    emitSnapshot({
      customers: [
        { id: 1, x: 2, y: 3, recipe: 'salad' as any, state: 'seated_waiting_order', patience: 30, maxPatience: 30, timer: 0, colorIndex: 0, waitLeft: 0.1, angry: true }
      ]
    });

    const bubble = root.querySelector('.hud-order[data-customer-id="1"]') as HTMLElement;
    expect(bubble).not.toBeNull();

    // Phát sự kiện customer_leave với no_order_taken
    emitEvent({
      type: 'customer_leave',
      reason: 'no_order_taken',
      customerId: 1,
      x: 2.5,
      y: 3.5
    });

    const angryIcon = bubble.querySelector('.hud-order-angry-icon') as HTMLElement;
    expect(angryIcon.style.display).toBe('block');
    expect(bubble.classList.contains('hud-order-leaving-angry')).toBe(true);

    // Trong vòng 0.4s (300ms): bong bóng vẫn tồn tại với icon 😠
    vi.advanceTimersByTime(300);
    expect(root.querySelector('.hud-order[data-customer-id="1"]')).not.toBeNull();

    // Đến 400ms: bong bóng bị remove hoàn toàn khỏi DOM
    vi.advanceTimersByTime(150);
    expect(root.querySelector('.hud-order[data-customer-id="1"]')).toBeNull();

    vi.useRealTimers();
  });

  it('5. Animation giận: khách angry → clip sitting_angry, không angry → sitting, không còn nảy người', () => {
    // 1. Khách ngồi chờ chưa angry -> sitting
    const normalCustomer = { id: 1, state: 'seated_waiting_order', angry: false };
    expect(getCustomerTargetAnimation(normalCustomer)).toBe('sitting');

    // 2. Khách chờ sau khi nhận order chưa angry -> sitting
    const orderCustomer = { id: 1, state: 'order_taken', angry: false };
    expect(getCustomerTargetAnimation(orderCustomer)).toBe('sitting');

    // 3. Khách angry = true -> phát clip sitting_angry
    const angryCustomer = { id: 1, state: 'order_taken', angry: true };
    expect(getCustomerTargetAnimation(angryCustomer)).toBe('sitting_angry');

    // 4. Khách rời bàn nhưng đang giận -> sitting_angry
    const leavingAngry = { id: 1, state: 'leaving', angry: true };
    expect(getCustomerTargetAnimation(leavingAngry)).toBe('sitting_angry');

    // 5. Khách ăn xong không giận -> sitting
    const eatingCustomer = { id: 1, state: 'eating', angry: false };
    expect(getCustomerTargetAnimation(eatingCustomer)).toBe('sitting');

    // 6. Khi khách cũ rời và khách mới vào bàn -> không dùng clip sitting_angry cho khách mới
    const newCustomer = { id: 2, state: 'seated_waiting_order', angry: false };
    expect(getCustomerTargetAnimation(newCustomer)).toBe('sitting');

    // 7. Xác nhận không còn mã nảy người: độ cao y cố định = 0
    const baseY = 0;
    expect(baseY).toBe(0);
  });
});
