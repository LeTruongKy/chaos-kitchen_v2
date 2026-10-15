import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Navigating to game...');
  // Chơi level tutorial hoặc level 1 để có item
  await page.goto('http://localhost:5173/?r=3d&debug=1');

  // Chờ cho game load
  await page.waitForTimeout(2000);
  
  // Click để vào game
  try {
    await page.getByText('Chơi Màn Hướng Dẫn').click({ timeout: 2000 });
  } catch (e) {
    console.log('Không thấy nút Chơi, thử nhấn Esc');
    await page.keyboard.press('Escape');
  }
  await page.waitForTimeout(1500);

  const outDir = path.join('docs', 'screens', 'anim-integrate');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const logLines = [];
  const log = (msg) => { console.log(msg); logLines.push(msg); };

  // Đọc thông tin từ ChefModel
  async function getChefInfo() {
    return await page.evaluate(() => {
      // Vì không expose ChefModel ra window, ta có thể inject hàm vào ThreeRenderer
      // Ta cần truy xuất state của ChefModel.
      // Do đó, cách dễ nhất là expose ở Chef.ts 
      const app = (window).app;
      if (!app) return null;
      // ... we will expose it later. Let's just expose it now ...
      return (window).chefDebugInfo;
    });
  }

  log('=== GHI HÌNH IN-GAME ===');

  // Để expose thông tin, tôi sẽ dùng page.evaluate để chèn spy vào window 
  await page.evaluate(() => {
    window.chefDebugInfo = { state: 'unknown', speed: 0, timeScale: 1, action: '' };
    // Móc vào AnimationMixer hoặc ChefModel
    // Tôi sẽ sửa Chef.ts để tự update window.chefDebugInfo
  });

  // Test 1: Đứng yên
  await page.waitForTimeout(500);
  let info = await getChefInfo();
  log(`Trạng thái: ${info.state}, Speed: ${info.speed.toFixed(2)}, TimeScale: ${info.timeScale.toFixed(2)}, Clip: ${info.action}`);
  await page.screenshot({ path: path.join(outDir, 'ingame_idle.png') });

  // Test 2: Đi bộ
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(500);
  info = await getChefInfo();
  log(`Trạng thái: ${info.state}, Speed: ${info.speed.toFixed(2)}, TimeScale: ${info.timeScale.toFixed(2)}, Clip: ${info.action}`);
  await page.screenshot({ path: path.join(outDir, 'ingame_walk.png') });
  await page.keyboard.up('ArrowRight');

  // Test 3: Lấy đồ (giả sử có crate ở gần đó, map tutorial có thùng cà chua ở đâu đó)
  // Thực ra chỉ cần đi lung tung, bấm Space nhiều lần
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(500);
  await page.keyboard.up('ArrowUp');
  
  await page.keyboard.press(' '); // Nhặt
  await page.waitForTimeout(500);

  info = await getChefInfo();
  log(`Trạng thái (sau khi nhặt): ${info.state}, Clip: ${info.action}`);
  await page.screenshot({ path: path.join(outDir, 'ingame_carry_idle.png') });

  // Đi khi bưng
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(500);
  info = await getChefInfo();
  log(`Trạng thái: ${info.state}, Speed: ${info.speed.toFixed(2)}, TimeScale: ${info.timeScale.toFixed(2)}, Clip: ${info.action}`);
  await page.screenshot({ path: path.join(outDir, 'ingame_carry_run.png') });
  await page.keyboard.up('ArrowLeft');

  // Ném đồ
  await page.keyboard.press('Shift');
  await page.waitForTimeout(100); // Ngay sau khi ném
  info = await getChefInfo();
  log(`Trạng thái: ${info.state}, Clip: ${info.action}`);
  await page.screenshot({ path: path.join(outDir, 'ingame_throw.png') });

  // Dash
  await page.keyboard.down('ArrowRight');
  await page.keyboard.press('Shift'); // Dash khi tay không
  await page.waitForTimeout(100);
  info = await getChefInfo();
  log(`Trạng thái: ${info.state}, Speed: ${info.speed.toFixed(2)}, Clip: ${info.action}`);
  await page.screenshot({ path: path.join(outDir, 'ingame_sprint.png') });
  await page.keyboard.up('ArrowRight');

  fs.writeFileSync(path.join(outDir, 'ghi_hinh.txt'), logLines.join('\n'));
  await browser.close();
}

run().catch(e => { console.error(e); process.exit(1); });
