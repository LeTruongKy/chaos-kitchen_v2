import { chromium } from '@playwright/test';
import * as path from 'path';

async function main() {
  console.log('--- Testing Carry Stance and Attachment ---');
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=swiftshader', '--enable-webgl', '--no-sandbox']
  });

  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  await page.addInitScript(() => {
    localStorage.setItem('ck_tutorial_seen', '1');
    localStorage.setItem('ck_player_name_v1', 'CarryTester');
  });

  const url = 'http://localhost:5173/?r=3d&debug=1';
  await page.goto(url, { waitUntil: 'networkidle' });

  // Fill chef name
  const nameInput = page.locator('input[aria-label="Tên đầu bếp"]');
  if (await nameInput.count() > 0) {
    await nameInput.fill('CarryTester');
    await page.waitForTimeout(300);
  }

  // Create room & enter Level 1
  const createBtn = page.locator('button:has-text("Tạo phòng")');
  await createBtn.waitFor({ state: 'visible', timeout: 10000 });
  await createBtn.click();

  await page.waitForSelector('#lobby-start-btn', { timeout: 15000 });
  await page.locator('#lobby-start-btn').click();

  await page.waitForSelector('.hud-container', { timeout: 15000 });
  await page.waitForFunction(() => {
    return (window as any).appStore?.get?.()?.phase === 'playing' && (window as any).chefObj?.isReady === true;
  }, { timeout: 25000 });

  await page.waitForTimeout(500);

  await page.waitForTimeout(500);

  // Zoom camera directly in on the chef
  await page.evaluate(() => {
    const chef = (window as any).chefObj;
    const renderer = (window as any).__CK3D__?.renderer;
    if (renderer && chef) {
      renderer.baseCameraPos.set(chef.group.position.x, 70, chef.group.position.z + 90);
      renderer.baseCameraLook.set(chef.group.position.x, 25, chef.group.position.z);
      renderer.camera.position.copy(renderer.baseCameraPos);
      renderer.camera.lookAt(renderer.baseCameraLook);
    }
    const testPlate = { type: 'plate', dirty: false, contents: [{ type: 'ingredient', id: 'burger_cooked', state: 'cooked' }] };
    (window as any).debugHeldItem = testPlate;
  });

  await page.waitForTimeout(600);
  await page.screenshot({ path: 'docs/screens/quat-v1/close_fistr_idle.png' });
  console.log('Saved close_fistr_idle.png');

  // Switch to carryAnchor instead of FistR
  await page.evaluate(() => {
    const chef = (window as any).chefObj;
    // Re-attach plate to carryAnchor
    if (chef.heldItemModel && chef.carryAnchor) {
      chef.carryAnchor.add(chef.heldItemModel);
      chef.heldItemModel.position.set(0, 0, 0.55 * 64);
      chef.heldItemModel.rotation.set(0, 0, 0);
    }
    chef.playAnim('carry_walk', 0);
    if (chef.activeAction) {
      chef.activeAction.time = 0.15;
      chef.activeAction.timeScale = 0;
    }
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'docs/screens/quat-v1/close_anchor_carry_walk_ts0.png' });
  console.log('Saved close_anchor_carry_walk_ts0.png');

  // Test carry_run at time = 0.2
  await page.evaluate(() => {
    const chef = (window as any).chefObj;
    chef.playAnim('carry_run', 0);
    if (chef.activeAction) {
      chef.activeAction.time = 0.2;
      chef.activeAction.timeScale = 0;
    }
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'docs/screens/quat-v1/close_anchor_carry_run_ts0.png' });
  console.log('Saved close_anchor_carry_run_ts0.png');

  await browser.close();
}

main().catch(console.error);
