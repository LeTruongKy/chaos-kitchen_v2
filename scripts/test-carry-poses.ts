import { chromium } from '@playwright/test';

async function main() {
  console.log('--- Testing Carry Poses with carryAnchor ---');
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

  // Position camera nicely to see chef in front view
  await page.evaluate(() => {
    const chef = (window as any).chefObj;
    const renderer = (window as any).__CK3D__?.renderer;
    if (renderer && chef) {
      renderer.baseCameraPos.set(chef.group.position.x, 80, chef.group.position.z + 100);
      renderer.baseCameraLook.set(chef.group.position.x, 25, chef.group.position.z);
      renderer.camera.position.copy(renderer.baseCameraPos);
      renderer.camera.lookAt(renderer.baseCameraLook);
    }
    const testPlate = {
      type: 'plate',
      dirty: false,
      contents: [{ type: 'ingredient', id: 'burger_cooked', state: 'cooked' }]
    };
    (window as any).debugHeldItem = testPlate;
  });

  await page.waitForTimeout(500);

  // Attach heldItemModel to carryAnchor (proper 2-hand placement)
  await page.evaluate(() => {
    const chef = (window as any).chefObj;
    const { applyHeldItemScale } = (window as any);
    if (chef.heldItemModel && chef.carryAnchor) {
      chef.carryAnchor.add(chef.heldItemModel);
      chef.heldItemModel.position.set(0, 0, 0.45 * 64);
      chef.heldItemModel.rotation.set(0, 0, 0);
      chef.carryAnchor.position.y = 0.42 * 64;
    }
  });

  // Test 1: carry_walk with timeScale: 0 (standing still holding plate)
  await page.evaluate(() => {
    const chef = (window as any).chefObj;
    chef.playAnim('carry_walk', 0);
    if (chef.activeAction) {
      chef.activeAction.time = 0.1;
      chef.activeAction.timeScale = 0;
    }
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'docs/screens/quat-v1/test_anchor_carry_walk_pose01.png' });
  console.log('Saved test_anchor_carry_walk_pose01.png');

  // Test 2: carry_walk with time = 0.3
  await page.evaluate(() => {
    const chef = (window as any).chefObj;
    if (chef.activeAction) {
      chef.activeAction.time = 0.3;
      chef.activeAction.timeScale = 0;
    }
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'docs/screens/quat-v1/test_anchor_carry_walk_pose03.png' });
  console.log('Saved test_anchor_carry_walk_pose03.png');

  // Test 3: carry_run with time = 0.2
  await page.evaluate(() => {
    const chef = (window as any).chefObj;
    chef.playAnim('carry_run', 0);
    if (chef.activeAction) {
      chef.activeAction.time = 0.2;
      chef.activeAction.timeScale = 0;
    }
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'docs/screens/quat-v1/test_anchor_carry_run_pose02.png' });
  console.log('Saved test_anchor_carry_run_pose02.png');

  // Test 4: Default top-down game view with carry_walk pose
  await page.evaluate(() => {
    const chef = (window as any).chefObj;
    const renderer = (window as any).__CK3D__?.renderer;
    // reset to normal game camera
    if (renderer) {
      // restore normal camera setup
      renderer.setupCamera(14, 8);
    }
    chef.playAnim('carry_walk', 0);
    if (chef.activeAction) {
      chef.activeAction.time = 0.1;
      chef.activeAction.timeScale = 0;
    }
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'docs/screens/quat-v1/test_gameview_carry_walk.png' });
  console.log('Saved test_gameview_carry_walk.png');

  await browser.close();
}

main().catch(console.error);
