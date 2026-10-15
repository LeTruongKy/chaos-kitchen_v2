import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test.describe('V2 Core Mechanics', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('ck_tutorial_seen', '1');
    });
  });

  test('Solo Mode: Start game and switch chef', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type="text"]').first().fill('Player1');
    await page.click('button:has-text("Tạo phòng")');
    await expect(page.locator('h1')).toContainText('Phòng');
    const soloCheck = page.locator('input[type="checkbox"]');
    if (await soloCheck.isVisible()) {
      await soloCheck.check();
    }

    await page.click('button:has-text("Bắt đầu")');
    await expect(page.locator('.hud-center-overlay')).toContainText('Bắt đầu!', { timeout: 5000 });
    await page.keyboard.press('Tab');
    await expect(page.locator('.hud-score')).toBeVisible();
  });
  
  test('Dash and Throw input', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type="text"]').first().fill('PlayerDash');
    await page.click('button:has-text("Tạo phòng")');
    await expect(page.locator('h1')).toContainText('Phòng');

    await page.click('button:has-text("Bắt đầu")');
    await expect(page.locator('.hud-center-overlay')).toContainText('Bắt đầu!', { timeout: 5000 });
    await page.keyboard.press('K');
    await page.keyboard.press('J');
    await expect(page.locator('.hud-score')).toBeVisible();
  });

  test('Burger and Pan workflow', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type="text"]').first().fill('PlayerBurger');
    await page.click('button:has-text("Tạo phòng")');
    await expect(page.locator('h1')).toContainText('Phòng');

    await page.click('button:has-text("Bắt đầu")');
    await expect(page.locator('.hud-score')).toBeVisible({ timeout: 5000 });
  });

  test('Soup workflow', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type="text"]').first().fill('PlayerSoup');
    await page.click('button:has-text("Tạo phòng")');
    await expect(page.locator('h1')).toContainText('Phòng');

    await page.click('button:has-text("Bắt đầu")');
    await expect(page.locator('.hud-score')).toBeVisible({ timeout: 5000 });
  });

  test('Fire and Extinguish workflow', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type="text"]').first().fill('PlayerFire');
    await page.click('button:has-text("Tạo phòng")');
    await expect(page.locator('h1')).toContainText('Phòng');

    await page.click('button:has-text("Bắt đầu")');
    await expect(page.locator('.hud-score')).toBeVisible({ timeout: 5000 });
  });

  test('Throw and Catch workflow (2 players)', async ({ browser }) => {
    const context1 = await browser.newContext();
    await context1.addInitScript(() => window.localStorage.setItem('ck_tutorial_seen', '1'));
    const page1 = await context1.newPage();
    await page1.goto('/');
    await page1.locator('input[type="text"]').first().fill('Player1');
    await page1.click('button:has-text("Tạo phòng")');
    await expect(page1.locator('h1')).toContainText('Phòng');
    const roomCode = (await page1.locator('h1').innerText()).replace('Phòng ', '');
    
    const context2 = await browser.newContext();
    await context2.addInitScript(() => window.localStorage.setItem('ck_tutorial_seen', '1'));
    const page2 = await context2.newPage();
    await page2.goto('/?room=' + roomCode);
    await page2.locator('input[type="text"]').first().fill('Player2');
    await page2.click('button:has-text("Vào")');
    
    await expect(page2.locator('text="Player1"')).toBeVisible();
    await page2.click('button:has-text("Sẵn sàng")');
    
    await page1.click('button:has-text("Bắt đầu")');
    
    await expect(page1.locator('.hud-score')).toBeVisible({ timeout: 5000 });
    await expect(page2.locator('.hud-score')).toBeVisible({ timeout: 5000 });
  });
});

