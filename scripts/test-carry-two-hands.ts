import { chromium } from '@playwright/test';

async function main() {
  console.log('--- Testing 2-Handed Carry (carryAnchor + carry pose) ---');
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

  // Fill chef name & create room
  const nameInput = page.locator('input[aria-label="Tên đầu bếp"]');
  if (await nameInput.count() > 0) {
    await nameInput.fill('CarryTester');
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

  // Position camera nicely to see chef in front view
  await page.evaluate(() => {
    const chef = (window as any).chefObj;
    const camera = (window as any).__CK3D__?.camera;
    if (camera && chef) {
      // Set camera slightly in front and above chef
      camera.position.set(chef.group.position.x, 80, chef.group.position.z + 100);
      camera.lookAt(chef.group.position.x, 25, chef.group.position.z);
    }
  });

  // Give chef a plate with burger
  await page.evaluate(() => {
    const testPlate = {
      type: 'plate',
      dirty: false,
      contents: [{ type: 'ingredient', id: 'burger_cooked', state: 'cooked' }]
    };
    (window as any).debugHeldItem = testPlate;
  });

  await page.waitForTimeout(500);

  // Take screenshot with carryAnchor + carry_walk
  await page.evaluate(() => {
    const chef = (window as any).chefObj;
    // Test with carry_walk animation at timeScale 0 (static carry pose)
    chef.playAnim('carry_walk', 0.1);
    if (chef.activeAction) {
      chef.activeAction.timeScale = 0;
    }
  });

  await page.waitForTimeout(600);
  await page.screenshot({ path: 'docs/screens/quat-v1/test_carry_walk_ts0.png' });
  console.log('Saved test_carry_walk_ts0.png');

  // Test with carry_walk animation at normal timeScale
  await page.evaluate(() => {
    const chef = (window as any).chefObj;
    if (chef.activeAction) {
      chef.activeAction.timeScale = 1.0;
    }
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'docs/screens/quat-v1/test_carry_walk_ts1.png' });
  console.log('Saved test_carry_walk_ts1.png');

  // Test with carry_run animation
  await page.evaluate(() => {
    const chef = (window as any).chefObj;
    chef.playAnim('carry_run', 0.1);
    if (chef.activeAction) {
      chef.activeAction.timeScale = 1.0;
    }
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'docs/screens/quat-v1/test_carry_run_ts1.png' });
  console.log('Saved test_carry_run_ts1.png');

  await browser.close();
}

main().catch(console.error);
