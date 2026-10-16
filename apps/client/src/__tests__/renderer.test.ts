// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { ThreeRenderer } from '../game/renderer3d/ThreeRenderer';

HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  createRadialGradient: () => ({ addColorStop: vi.fn() }),
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  fillText: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
}) as any;

describe('ThreeRenderer pixel ratio & quality tests', () => {
  it('pixel ratio trên touch không thấp hơn 1.5 khi DPR ≥ 2', () => {
    const renderer = new ThreeRenderer();
    
    // Test with DPR = 2.0
    Object.defineProperty(window, 'devicePixelRatio', { value: 2.0, configurable: true });
    expect(renderer.getQualityPixelRatio('low')).toBeGreaterThanOrEqual(1.5);

    // Test with DPR = 2.75 (phone)
    Object.defineProperty(window, 'devicePixelRatio', { value: 2.75, configurable: true });
    expect(renderer.getQualityPixelRatio('low')).toBeGreaterThanOrEqual(1.5);
    expect(renderer.getQualityPixelRatio('low')).toBe(1.5);

    // Test with DPR = 3.0
    Object.defineProperty(window, 'devicePixelRatio', { value: 3.0, configurable: true });
    expect(renderer.getQualityPixelRatio('low')).toBeGreaterThanOrEqual(1.5);
    expect(renderer.getQualityPixelRatio('low')).toBe(1.5);
  });

  it('pixel ratio ≤ 2 trên mọi thiết bị và cấu hình quality', () => {
    const renderer = new ThreeRenderer();

    // High DPR = 3.5
    Object.defineProperty(window, 'devicePixelRatio', { value: 3.5, configurable: true });
    expect(renderer.getQualityPixelRatio('low')).toBeLessThanOrEqual(2);
    expect(renderer.getQualityPixelRatio('medium')).toBeLessThanOrEqual(2);
    expect(renderer.getQualityPixelRatio('high')).toBeLessThanOrEqual(2);

    // DPR = 2.0
    Object.defineProperty(window, 'devicePixelRatio', { value: 2.0, configurable: true });
    expect(renderer.getQualityPixelRatio('low')).toBeLessThanOrEqual(2);
    expect(renderer.getQualityPixelRatio('medium')).toBeLessThanOrEqual(2);
    expect(renderer.getQualityPixelRatio('high')).toBeLessThanOrEqual(2);

    // DPR = 1.0 (standard PC)
    Object.defineProperty(window, 'devicePixelRatio', { value: 1.0, configurable: true });
    expect(renderer.getQualityPixelRatio('low')).toBeLessThanOrEqual(2);
    expect(renderer.getQualityPixelRatio('medium')).toBe(1.0);
  });

  it('công thức khoảng cách camera trả về giá trị dương', () => {
    const fov = 30 * (Math.PI / 180);
    const aspect = 852 / 393;
    const calcDist = (w: number) => (w / 2) / (Math.tan(fov / 2) * aspect);

    const w = 9 * 48; // 432
    const d = calcDist(w);
    expect(d).toBeGreaterThan(0);
    expect(Number.isFinite(d)).toBe(true);
  });
});
