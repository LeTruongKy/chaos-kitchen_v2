import { chromium } from '@playwright/test';

async function main() {
  console.log('--- Testing Plate Held with 2 Hands in Front ---');
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=swiftshader', '--enable-webgl', '--no-sandbox']
  });

  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  await page.addInitScript(() => {
    localStorage.setItem('ck_tutorial_seen', '1');
    localStorage.setItem('ck_player_name_v1', 'TwoHandsTester');
  });

  const url = 'http://localhost:5173/?r=3d&debug=1';
  await page.goto(url, { waitUntil: 'networkidle' });

  const nameInput = page.locator('input[aria-label="Tên đầu bếp"]');
  if (await nameInput.count() > 0) {
    await nameInput.fill('TwoHandsTester');
    await page.waitForTimeout(300);
  }

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

  // Set up held plate attached to carryAnchor directly
  await page.evaluate(() => {
    const chef = (window as any).chefObj;
    const { createItemModel } = (window as any).__CK3D__;
    const testPlate = {
      type: 'plate',
      dirty: false,
      contents: [{ type: 'ingredient', id: 'burger_cooked', state: 'cooked' }]
    };
    (window as any).debugHeldItem = testPlate;

    // Zoom camera on chef
    const renderer = (window as any).__CK3D__?.renderer;
    if (renderer) {
      renderer.baseCameraPos.set(chef.group.position.x, 60, chef.group.position.z + 80);
      renderer.baseCameraLook.set(chef.group.position.x, 25, chef.group.position.z);
      renderer.camera.position.copy(renderer.baseCameraPos);
      renderer.camera.lookAt(renderer.baseCameraLook);
    }
  });

  // Test with carry_walk pose at timeScale = 0
  await page.evaluate(() => {
    const chef = (window as any).chefObj;
    chef.playAnim('carry_walk', 0);
    if (chef.activeAction) {
      chef.activeAction.time = 0.15;
      chef.activeAction.timeScale = 0;
    }
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'docs/screens/quat-v1/test_plate_carry_walk_ts0.png' });
  console.log('Saved test_plate_carry_walk_ts0.png');

  // Test with carry_walk at timeScale = 1.0 (moving)
  await page.evaluate(() => {
    const chef = (window as any).chefObj;
    if (chef.activeAction) {
      chef.activeAction.timeScale = 1.0;
    }
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'docs/screens/quat-v1/test_plate_carry_walk_ts1.png' });
  console.log('Saved test_plate_carry_walk_ts1.png');

  // Test with carry_run at timeScale = 1.0 (running)
  await page.evaluate(() => {
    const chef = (window as any).chefObj;
    chef.playAnim('carry_run', 0);
    if (chef.activeAction) {
      chef.activeAction.timeScale = 1.0;
    }
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'docs/screens/quat-v1/test_plate_carry_run_ts1.png' });
  console.log('Saved test_plate_carry_run_ts1.png');

  // Also check normal game camera view
  await page.evaluate(() => {
    const chef = (window as any).chefObj;
    const renderer = (window as any).__CK3D__?.renderer;
    if (renderer) {
      renderer.baseCameraPos.set(chef.group.position.x, 400, chef.group.position.z + 400);
      renderer.baseCameraLook.set(chef.group.position.x, 0, chef.group.position.z);
      renderer.camera.position.copy(renderer.baseCameraPos);
      renderer.camera.lookAt(renderer.baseCameraLook);
    }
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'docs/screens/quat-v1/test_plate_game_view.png' });
  console.log('Saved test_plate_game_view.png');

  await browser.close();
}

main().catch(console.error);
