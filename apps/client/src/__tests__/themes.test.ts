import { describe, it, expect } from 'vitest';
import { THEMES } from '../game/renderer3d/themes';

function hexToRgb(hex: number): [number, number, number] {
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8) & 0xff;
  const b = hex & 0xff;
  return [r, g, b];
}

function colorDistance(hexA: number, hexB: number): number {
  const [r1, g1, b1] = hexToRgb(hexA);
  const [r2, g2, b2] = hexToRgb(hexB);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

describe('Theme Palette Tests', () => {
  it('Có đủ 3 theme: diner, ship, space với cấu hình đầy đủ', () => {
    expect(THEMES.diner).toBeDefined();
    expect(THEMES.ship).toBeDefined();
    expect(THEMES.space).toBeDefined();

    expect(THEMES.diner!.name).toBe('diner');
    expect(THEMES.ship!.name).toBe('ship');
    expect(THEMES.space!.name).toBe('space');
  });

  it('Ship dùng bảng màu sàn gỗ (nâu), space dùng sàn kim loại tối, diner giữ nguyên', () => {
    // Diner: gạch trắng sáng
    expect(THEMES.diner!.floorPrimary).toBe(0xffffff);

    // Ship: tone màu gỗ (brown)
    const [sr, , sb] = hexToRgb(THEMES.ship!.floorPrimary);
    expect(sr).toBeGreaterThan(sb); // red > blue đặc trưng của màu gỗ nâu
    expect(THEMES.ship!.floorPrimary).toBe(0x8d6e63);

    // Space: tone màu kim loại tối (grey/dark)
    const [mr, mg] = hexToRgb(THEMES.space!.floorPrimary);
    expect(Math.abs(mr - mg)).toBeLessThan(10); // neutral grey tone
    expect(THEMES.space!.floorSecondary).toBe(0x424242);
  });

  it('Khoảng cách màu sàn giữa 3 theme khác nhau đáng kể (> 50)', () => {
    const THRESHOLD = 50;

    const distDinerShip = colorDistance(THEMES.diner!.floorPrimary, THEMES.ship!.floorPrimary);
    const distDinerSpace = colorDistance(THEMES.diner!.floorPrimary, THEMES.space!.floorPrimary);
    const distShipSpace = colorDistance(THEMES.ship!.floorPrimary, THEMES.space!.floorPrimary);

    expect(distDinerShip).toBeGreaterThan(THRESHOLD);
    expect(distDinerSpace).toBeGreaterThan(THRESHOLD);
    expect(distShipSpace).toBeGreaterThan(THRESHOLD);
  });
});
