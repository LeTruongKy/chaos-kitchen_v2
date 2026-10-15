import { chromium } from '@playwright/test';

async function main() {
  console.log('--- Launching browser to diagnose 3 render errors ---');
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=swiftshader', '--enable-webgl', '--no-sandbox']
  });

  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('QUAT') || text.includes('Error')) {
      console.log(`[BROWSER CONSOLE] ${text}`);
    }
  });

  await page.addInitScript(() => {
    localStorage.setItem('ck_tutorial_seen', '1');
    localStorage.setItem('ck_player_name_v1', 'DiagChef');
  });

  const url = 'http://localhost:5173/?r=3d&debug=1';
  await page.goto(url, { waitUntil: 'networkidle' });

  // Wait for window.__QUAT__ ready
  await page.waitForFunction(() => {
    return (window as any).__QUAT__?.ready === true;
  }, { timeout: 20000 });

  // Fill chef name
  const nameInput = page.locator('input[aria-label="Tên đầu bếp"]');
  if (await nameInput.count() > 0) {
    await nameInput.fill('QuatTester');
    await page.waitForTimeout(300);
  }

  // Create room
  const createBtn = page.locator('button:has-text("Tạo phòng")');
  await createBtn.waitFor({ state: 'visible', timeout: 10000 });
  await createBtn.click();

  // Start level 1
  await page.waitForSelector('#lobby-start-btn', { timeout: 15000 });
  await page.locator('#lobby-start-btn').click();

  await page.waitForSelector('.hud-container', { timeout: 15000 });
  await page.waitForFunction(() => {
    return (window as any).appStore?.get?.()?.phase === 'playing' && (window as any).chefObj?.isReady === true;
  }, { timeout: 25000 });

  // Additional 500ms to settle
  await page.waitForTimeout(500);

  console.log('\n=== LỖI 1 BƯỚC 1: Đo ChefModel của người chơi ===');
  const chefDiag1 = await page.evaluate(() => {
    const THREE = (window as any).THREE;
    const chef = (window as any).chefObj;
    if (!chef) return { error: 'chefObj is null' };

    const group = chef.group;
    group.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(group);
    const size = new THREE.Vector3();
    box.getSize(size);
    const worldPos = new THREE.Vector3();
    group.getWorldPosition(worldPos);

    return {
      'group.visible': group.visible,
      'group.parent (có null không)': group.parent ? `Không null (${group.parent.type})` : 'NULL',
      'group.scale': { x: group.scale.x, y: group.scale.y, z: group.scale.z },
      'world position (px)': { x: worldPos.x, y: worldPos.y, z: worldPos.z },
      'world position (tile)': { x: worldPos.x / 64, y: worldPos.z / 64 },
      'world bounding box (min)': { x: box.min.x, y: box.min.y, z: box.min.z },
      'world bounding box (max)': { x: box.max.x, y: box.max.y, z: box.max.z },
      'world bounding box size (px)': { x: size.x, y: size.y, z: size.z },
      'world bounding box size (tile)': {
        widthTiles: size.x / 64,
        heightTiles: size.y / 64,
        depthTiles: size.z / 64
      },
      hasClonedModel: chef.model !== null,
      isQuat: chef.isQuat,
      isReady: chef.isReady
    };
  });
  console.log(JSON.stringify(chefDiag1, null, 2));

  console.log('\n=== LỖI 1 BƯỚC 2: Liệt kê các node cha từ chef lên scene ===');
  const parentChain = await page.evaluate(() => {
    const chef = (window as any).chefObj;
    if (!chef) return [];
    const chain: any[] = [];
    let cur = chef.group;
    while (cur) {
      chain.push({
        type: cur.type,
        name: cur.name || '(unnamed)',
        visible: cur.visible,
        scale: { x: cur.scale.x, y: cur.scale.y, z: cur.scale.z }
      });
      cur = cur.parent;
    }
    return chain;
  });
  console.log(JSON.stringify(parentChain, null, 2));

  console.log('\n=== LỖI 2 BƯỚC 3: Đo vị trí chef ngay khi vào ván so với spawn ===');
  const spawnDiag = await page.evaluate(() => {
    const chef = (window as any).chefObj;
    const worldPos = new (window as any).THREE.Vector3();
    chef.group.getWorldPosition(worldPos);

    const spawn1Expected = { x: 3.5, y: 3.5 };
    const actualTile = { x: worldPos.x / 64, y: worldPos.z / 64 };
    const dx = Math.abs(actualTile.x - spawn1Expected.x);
    const dy = Math.abs(actualTile.y - spawn1Expected.y);
    const distanceTiles = Math.hypot(dx, dy);

    return {
      'worldPositionPx': { x: worldPos.x, y: worldPos.y, z: worldPos.z },
      'worldPositionTile': actualTile,
      'spawn1ExpectedTile': spawn1Expected,
      'diffDistanceTiles': distanceTiles,
      'status (< 0.05 tile)': distanceTiles <= 0.05 ? 'ĐẠT' : 'CHƯA ĐẠT'
    };
  });
  console.log(JSON.stringify(spawnDiag, null, 2));

  console.log('\n=== LỖI 3 BƯỚC 1, 2, 4: Đo scale và world bounding box của các vật khi cầm ===');
  const testItems = [
    { name: 'Nguyên liệu xà lách (lettuce)', item: { type: 'ingredient', id: 'lettuce', state: 'raw' }, maxAllowedTiles: 0.4 },
    { name: 'Nguyên liệu cà chua (tomato)', item: { type: 'ingredient', id: 'tomato', state: 'raw' }, maxAllowedTiles: 0.4 },
    { name: 'Dụng cụ chảo (pan)', item: { type: 'tool', tool: 'pan', contents: [] }, maxAllowedTiles: 0.5 },
    { name: 'Đĩa có đồ ăn (plate with salad)', item: { type: 'plate', dirty: false, contents: [{ type: 'ingredient', id: 'lettuce', state: 'chopped' }, { type: 'ingredient', id: 'tomato', state: 'chopped' }] }, maxAllowedTiles: 0.5 }
  ];

  const results: any[] = [];
  for (const t of testItems) {
    await page.evaluate((it) => {
      (window as any).debugHeldItem = it;
    }, t.item);

    await page.waitForTimeout(600);

    const diag = await page.evaluate((maxAllowed) => {
      const THREE = (window as any).THREE;
      const chef = (window as any).chefObj;
      if (!chef || !chef.heldItemModel) return { error: 'heldItemModel is null' };

      const handBone = chef.handBone;
      const carryAnchor = chef.carryAnchor;

      let cur = handBone;
      let handBoneAccumScale = new THREE.Vector3(1, 1, 1);
      while (cur) {
        handBoneAccumScale.multiply(cur.scale);
        cur = cur.parent;
      }

      cur = carryAnchor;
      let carryAnchorAccumScale = new THREE.Vector3(1, 1, 1);
      while (cur) {
        carryAnchorAccumScale.multiply(cur.scale);
        cur = cur.parent;
      }

      chef.group.updateMatrixWorld(true);
      const heldBox = new THREE.Box3().setFromObject(chef.heldItemModel);
      const heldSize = new THREE.Vector3();
      heldBox.getSize(heldSize);
      const maxDimPx = Math.max(heldSize.x, heldSize.y, heldSize.z);
      const maxDimTiles = maxDimPx / 64;

      return {
        attachedTo: chef.heldItemModel.parent === handBone ? 'handBone (FistR)' : 'carryAnchor',
        handBoneWorldScale: Math.max(handBoneAccumScale.x, handBoneAccumScale.y, handBoneAccumScale.z),
        carryAnchorWorldScale: Math.max(carryAnchorAccumScale.x, carryAnchorAccumScale.y, carryAnchorAccumScale.z),
        heldItemScale: {
          x: chef.heldItemModel.scale.x,
          y: chef.heldItemModel.scale.y,
          z: chef.heldItemModel.scale.z
        },
        heldItemWorldBoxPx: { x: heldSize.x, y: heldSize.y, z: heldSize.z },
        maxDimPx,
        maxDimTiles,
        maxAllowedTiles: maxAllowed,
        status: maxDimTiles <= maxAllowed ? 'ĐẠT' : 'CHƯA ĐẠT'
      };
    }, t.maxAllowedTiles);

    results.push({ item: t.name, ...diag });

    if (t.item.id === 'lettuce') {
      await page.screenshot({ path: 'docs/screens/quat-v1/held_item_lettuce.png' });
      console.log('Saved screenshot: docs/screens/quat-v1/held_item_lettuce.png');
    }
  }
  console.log(JSON.stringify(results, null, 2));

  await browser.close();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
