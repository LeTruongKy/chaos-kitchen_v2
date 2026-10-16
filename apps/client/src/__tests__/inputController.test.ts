/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InputController } from '../game/InputController';
import { NetClient } from '../net/NetClient';
import { appStore } from '../state/store';
import { PlayerInput } from '@kitchen/core';

describe('InputController', () => {
  let netClientMock: Partial<NetClient>;
  let inputController: InputController;

  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    netClientMock = {
      sendInput: vi.fn(),
      sendEmote: vi.fn()
    };
    appStore.set({ screen: 'game', phase: 'playing' } as any);
    inputController = new InputController(netClientMock as NetClient);
  });

  const pressKey = (code: string) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code }));
  };

  const releaseKey = (code: string) => {
    window.dispatchEvent(new KeyboardEvent('keyup', { code }));
  };

  it('mixes inputs correctly and sends at 30Hz', () => {
    pressKey('KeyW');
    pressKey('KeyD');
    
    inputController.update(0, 34); // ~1 tick
    
    expect(netClientMock.sendInput).toHaveBeenCalledTimes(1);
    const input = (netClientMock.sendInput as any).mock.calls[0][0] as PlayerInput;
    expect(input.mx).toBe(1);
    expect(input.my).toBe(-1);
    expect(input.act).toBe(false);
    expect(input.interact).toBe(false);
  });

  it('cancels out opposite keys', () => {
    pressKey('KeyA');
    pressKey('KeyD'); // opposite
    pressKey('KeyW');
    pressKey('KeyS'); // opposite
    
    inputController.update(0, 34);
    
    const input = (netClientMock.sendInput as any).mock.calls[0][0] as PlayerInput;
    expect(input.mx).toBe(0);
    expect(input.my).toBe(0);
  });

  it('edge triggers interact', () => {
    pressKey('Space');
    // fast pressing Space multiple times before tick
    releaseKey('Space');
    pressKey('Space');
    
    inputController.update(0, 34);
    
    let input = (netClientMock.sendInput as any).mock.calls[0][0] as PlayerInput;
    expect(input.interact).toBe(true);

    // next tick without releasing/pressing again should be false
    inputController.update(0, 34);
    input = (netClientMock.sendInput as any).mock.calls[1][0] as PlayerInput;
    expect(input.interact).toBe(false);
  });

  it('stops sending on blur', () => {
    pressKey('KeyW');
    window.dispatchEvent(new Event('blur'));
    
    inputController.update(0, 34);
    
    const input = (netClientMock.sendInput as any).mock.calls[0][0] as PlayerInput;
    expect(input.my).toBe(0); // W is cleared
  });

  it('does not send input when phase is not playing', () => {
    appStore.set({ screen: 'game', phase: 'countdown' } as any);
    pressKey('KeyW');
    
    inputController.update(0, 34);
    
    expect(netClientMock.sendInput).not.toHaveBeenCalled();
  });

  it('sends emotes on Digit1-4', () => {
    pressKey('Digit1');
    expect(netClientMock.sendEmote).toHaveBeenCalledWith(0);
    pressKey('Digit2');
    expect(netClientMock.sendEmote).toHaveBeenCalledWith(1);
    pressKey('Digit3');
    expect(netClientMock.sendEmote).toHaveBeenCalledWith(2);
    pressKey('Digit4');
    expect(netClientMock.sendEmote).toHaveBeenCalledWith(3);
  });

  it('holds Shift sends dash=true continuously and does not trigger act', () => {
    pressKey('ShiftLeft');
    inputController.update(0, 34);

    let input = (netClientMock.sendInput as any).mock.calls[0][0] as PlayerInput;
    expect(input.dash).toBe(true);
    expect(input.act).toBe(false);

    // Second tick while Shift is still held down
    inputController.update(0, 34);
    input = (netClientMock.sendInput as any).mock.calls[1][0] as PlayerInput;
    expect(input.dash).toBe(true);
    expect(input.act).toBe(false);

    // Release Shift
    releaseKey('ShiftLeft');
    inputController.update(0, 34);
    input = (netClientMock.sendInput as any).mock.calls[2][0] as PlayerInput;
    expect(input.dash).toBe(false);
  });

  it('activates dash=true for 1s on double-tap within 300ms and <=40px, and cancels on 3rd tap', () => {
    let now = 1000;
    const nowSpy = vi.spyOn(performance, 'now').mockImplementation(() => now);

    // 1st tap at (100, 100)
    window.dispatchEvent(new MouseEvent('pointerdown', { clientX: 100, clientY: 100, button: 0 }));
    inputController.update(now, 34);
    let input = (netClientMock.sendInput as any).mock.calls.at(-1)[0] as PlayerInput;
    expect(input.dash).toBe(false);

    // 2nd tap 150ms later at (115, 110) (distance ~18px <= 40px)
    now = 1150;
    window.dispatchEvent(new MouseEvent('pointerdown', { clientX: 115, clientY: 110, button: 0 }));
    inputController.update(now, 34);
    input = (netClientMock.sendInput as any).mock.calls.at(-1)[0] as PlayerInput;
    expect(input.dash).toBe(true);

    // Still active at +800ms (t = 1950ms)
    now = 1950;
    inputController.update(now, 34);
    input = (netClientMock.sendInput as any).mock.calls.at(-1)[0] as PlayerInput;
    expect(input.dash).toBe(true);

    // 3rd tap at t = 2000ms cancels sprint early
    now = 2000;
    window.dispatchEvent(new MouseEvent('pointerdown', { clientX: 120, clientY: 110, button: 0 }));
    inputController.update(now, 34);
    input = (netClientMock.sendInput as any).mock.calls.at(-1)[0] as PlayerInput;
    expect(input.dash).toBe(false);

    // Re-trigger double tap and let it expire naturally after 1000ms
    now = 3000;
    window.dispatchEvent(new MouseEvent('pointerdown', { clientX: 200, clientY: 200, button: 0 }));
    now = 3200;
    window.dispatchEvent(new MouseEvent('pointerdown', { clientX: 210, clientY: 205, button: 0 }));
    inputController.update(now, 34);
    input = (netClientMock.sendInput as any).mock.calls.at(-1)[0] as PlayerInput;
    expect(input.dash).toBe(true);

    now = 4250; // > 1000ms after 2nd tap
    inputController.update(now, 34);
    input = (netClientMock.sendInput as any).mock.calls.at(-1)[0] as PlayerInput;
    expect(input.dash).toBe(false);

    nowSpy.mockRestore();
  });
});
