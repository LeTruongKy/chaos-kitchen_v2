import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

interface QuatState {
  key: string;
  once: boolean;
  timeScale: number;
  scale: number;
  h: number;
  actingStation: string | null;
  ready: boolean;
  footL?: { x: number; y: number; z: number };
  footR?: { x: number; y: number; z: number };
}

export interface VerificationReportItem {
  step: string;
  expected: string;
  measured: string;
  status: 'ĐẠT' | 'CHƯA ĐẠT';
}

async function main() {
  console.log('🚀 Running verify-quat.ts with Playwright headless (--use-gl=swiftshader)...');

  const logDir = path.resolve('docs/screens/quat-v1');
  fs.mkdirSync(logDir, { recursive: true });
  const logFile = path.join(logDir, 'log.txt');
  const logLines: string[] = [];

  function logQuat(event: string, q: QuatState | null) {
    const ts = new Date().toISOString();
    // Mỗi dòng: thời gian, key, actingStation, scale, h (và ghi chú event)
    const line = `[${ts}] key=${q?.key ?? 'null'} actingStation=${q?.actingStation ?? 'null'} scale=${q?.scale ?? 'null'} h=${q?.h ?? 'null'} | ${event}`;
    console.log(line);
    logLines.push(line);
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=swiftshader', '--enable-webgl', '--no-sandbox']
  });

  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  page.on('console', msg => {
    const text = msg.text();
    console.log(`[CONSOLE ${msg.type()}] ${text}`);
    if (text.includes('[QUAT]') || text.includes('ANIM MISSING')) {
      logLines.push(`[BROWSER LOG ${new Date().toISOString()}] ${text}`);
    }
  });

  page.on('pageerror', err => {
    console.error(`[PAGE ERROR]`, err);
  });

  const url = 'http://localhost:5173/?r=3d&debug=1';
  console.log(`Navigating to ${url}...`);

  await page.addInitScript(() => {
    localStorage.setItem('ck_tutorial_seen', '1');
    localStorage.setItem('ck_player_name_v1', 'QuatTester');
  });

  await page.goto(url, { waitUntil: 'networkidle' });

  // BƯỚC 3: Kiểm tra WebGL trong trình duyệt
  const hasWebGL = await page.evaluate(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return Boolean(gl);
    } catch {
      return false;
    }
  });

  if (!hasWebGL) {
    console.error('CHƯA KIỂM CHỨNG: không có WebGL trong Playwright');
    fs.writeFileSync(logFile, 'CHƯA KIỂM CHỨNG: không có WebGL trong Playwright', 'utf8');
    await browser.close();
    process.exit(1);
  }
  console.log('✅ WebGL available in Playwright!');

  // BƯỚC 2.2: Chờ window.__QUAT__?.ready === true (tối đa 20s)
  console.log('Chờ window.__QUAT__?.ready === true...');
  await page.waitForFunction(() => {
    return (window as any).__QUAT__?.ready === true;
  }, { timeout: 20000 });
  console.log('✅ window.__QUAT__ ready!');

  // BƯỚC 2.3: Tạo phòng, bắt đầu level1 (1 người)
  const nameInput = page.locator('input[aria-label="Tên đầu bếp"]');
  if (await nameInput.count() > 0) {
    await nameInput.fill('QuatTester');
    await page.waitForTimeout(200);
  }

  const createBtn = page.locator('button:has-text("Tạo phòng")');
  await createBtn.waitFor({ state: 'visible' });
  await createBtn.click();

  await page.waitForSelector('#lobby-start-btn', { timeout: 15000 });
  console.log('Lobby opened. Starting Level 1...');
  await page.locator('#lobby-start-btn').click();

  await page.waitForSelector('.hud-container', { timeout: 15000 });
  await page.waitForFunction(() => {
    return (window as any).appStore?.get?.()?.phase === 'playing';
  }, { timeout: 20000 });
  console.log('Level 1 started and playing phase active!');

  await page.waitForTimeout(500);
  await page.locator('canvas').click().catch(() => {});
  await page.waitForTimeout(200);

  const reportItems: VerificationReportItem[] = [];

  interface QuatStateFull extends QuatState {
    x?: number;
    y?: number;
    fx?: number;
    fy?: number;
    held?: boolean;
    speed?: number;
  }

  async function pressGameKey(code: string, isDown: boolean) {
    if (isDown) {
      await page.keyboard.down(code).catch(() => {});
      await page.evaluate((c) => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: c, key: c, bubbles: true }));
      }, code).catch(() => {});
    } else {
      await page.keyboard.up(code).catch(() => {});
      await page.evaluate((c) => {
        window.dispatchEvent(new KeyboardEvent('keyup', { code: c, key: c, bubbles: true }));
      }, code).catch(() => {});
    }
  }

  async function tapGameKey(code: string, holdMs = 100) {
    await pressGameKey(code, true);
    await page.waitForTimeout(holdMs);
    await pressGameKey(code, false);
    await page.waitForTimeout(50);
  }

  async function resetKeys() {
    for (const k of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'Space', 'KeyE']) {
      await pressGameKey(k, false);
    }
    await page.waitForTimeout(50);
  }

  async function holdKeyUntil(
    key: string,
    conditionFn: (q: QuatStateFull) => boolean,
    timeoutMs = 6000
  ) {
    await pressGameKey(key, true);
    const start = Date.now();
    try {
      while (Date.now() - start < timeoutMs) {
        await page.waitForTimeout(40);
        const q: QuatStateFull | null = await page.evaluate(() => (window as any).__QUAT__);
        if (q && conditionFn(q)) {
          break;
        }
      }
    } finally {
      await pressGameKey(key, false);
      await resetKeys();
      await page.waitForTimeout(40);
    }
  }

  // BƯỚC 4: Đứng yên 2 giây → kỳ vọng 'idle'
  console.log('--- 4. Đứng yên 2 giây ---');
  await resetKeys();
  await page.waitForTimeout(2000);
  const qStateIdle: QuatStateFull | null = await page.evaluate(() => (window as any).__QUAT__);
  logQuat('Đứng yên 2 giây', qStateIdle);
  reportItems.push({
    step: '4. Đứng yên 2 giây',
    expected: 'key = idle',
    measured: `key = ${qStateIdle?.key}`,
    status: qStateIdle?.key === 'idle' ? 'ĐẠT' : 'CHƯA ĐẠT',
  });

  // BƯỚC 5: Đi thẳng phải 2 giây → kỳ vọng 'walk' hoặc 'run'. Đo vị trí xương FootR và FootL giữa t và t+0.25s: |Δ| > 0.05 đơn vị.
  console.log('--- 5. Đi thẳng phải 2 giây & đo xương FootR / FootL ---');
  await pressGameKey('KeyD', true);
  await page.waitForTimeout(400);

  const footSample1 = await page.evaluate(() => ({
    footL: (window as any).__QUAT__?.footL,
    footR: (window as any).__QUAT__?.footR,
  }));

  await page.waitForTimeout(250);

  const footSample2 = await page.evaluate(() => ({
    footL: (window as any).__QUAT__?.footL,
    footR: (window as any).__QUAT__?.footR,
    quat: (window as any).__QUAT__,
  }));

  const deltaFootL = Math.hypot(
    (footSample2.footL?.x ?? 0) - (footSample1.footL?.x ?? 0),
    (footSample2.footL?.y ?? 0) - (footSample1.footL?.y ?? 0),
    (footSample2.footL?.z ?? 0) - (footSample1.footL?.z ?? 0)
  );
  const deltaFootR = Math.hypot(
    (footSample2.footR?.x ?? 0) - (footSample1.footR?.x ?? 0),
    (footSample2.footR?.y ?? 0) - (footSample1.footR?.y ?? 0),
    (footSample2.footR?.z ?? 0) - (footSample1.footR?.z ?? 0)
  );

  const qStateWalk = footSample2.quat;
  logQuat(`Đi thẳng phải (ΔFootL=${deltaFootL.toFixed(4)}, ΔFootR=${deltaFootR.toFixed(4)})`, qStateWalk);

  await page.waitForTimeout(1350); // Tổng cộng 2s đi thẳng (400 + 250 + 1350 = 2000ms)
  await pressGameKey('KeyD', false);
  await resetKeys();

  const maxDeltaFoot = Math.max(deltaFootL, deltaFootR);
  const walkPassed = (qStateWalk?.key === 'walk' || qStateWalk?.key === 'run') && maxDeltaFoot > 0.05;
  reportItems.push({
    step: '5. Đi thẳng phải 2 giây & đo xương FootR/FootL',
    expected: 'key = walk|run và |Δ| > 0.05',
    measured: `key = ${qStateWalk?.key}, ΔFootL = ${deltaFootL.toFixed(4)}, ΔFootR = ${deltaFootR.toFixed(4)}`,
    status: walkPassed ? 'ĐẠT' : 'CHƯA ĐẠT',
  });

  // BƯỚC 6: Đứng quay mặt về thớt (C) và giữ F 1 giây → kỳ vọng key 'pickup', actingStation 'cutting'
  console.log('--- 6. Đứng quay mặt về thớt (C) và giữ F 1 giây ---');
  // Đi sang trái dọc hàng 3 (y=3.5) tới trước thớt C(1, 3): x <= 2.40
  await holdKeyUntil('KeyA', q => (q.x ?? 99) <= 2.40, 4000);

  // Quay mặt sang trái (KeyA) về thớt C(1, 3)
  await tapGameKey('KeyA', 150);

  const pBeforeCut = await page.evaluate(() => (window as any).__QUAT__);
  console.log(`[TARGET CUT] player x=${pBeforeCut?.x?.toFixed(2)} y=${pBeforeCut?.y?.toFixed(2)} fx=${pBeforeCut?.fx} fy=${pBeforeCut?.fy}`);

  // Giữ F 1 giây
  await pressGameKey('KeyF', true);
  await page.waitForTimeout(1000);
  const qStateCutting: QuatStateFull | null = await page.evaluate(() => (window as any).__QUAT__);
  logQuat('Đứng cạnh thớt giữ F 1 giây', qStateCutting);
  await pressGameKey('KeyF', false);
  await page.waitForTimeout(100);
  await resetKeys();

  const cuttingPassed = qStateCutting?.key === 'pickup' && qStateCutting?.actingStation === 'cutting';
  reportItems.push({
    step: '6. Quay mặt về thớt (C) giữ F 1 giây',
    expected: 'key = pickup, actingStation = cutting',
    measured: `key = ${qStateCutting?.key}, actingStation = ${qStateCutting?.actingStation}`,
    status: cuttingPassed ? 'ĐẠT' : 'CHƯA ĐẠT',
  });

  // BƯỚC 7: Đứng quay mặt về bồn (W), giữ F → kỳ vọng 'pickup', actingStation 'sink'
  console.log('--- 7. Đứng quay mặt về bồn (W), giữ F ---');
  // Trở lại giao lộ x >= 3.45 dọc hàng 3
  await holdKeyUntil('KeyD', q => (q.x ?? 0) >= 3.45, 3000);
  // Đi lên hành lang y <= 2.50
  await holdKeyUntil('KeyW', q => (q.y ?? 99) <= 2.50, 3000);
  // Đi dọc hành lang sang phải tới x >= 9.35 (trước bồn rửa W tại 9, 1)
  await holdKeyUntil('KeyD', q => (q.x ?? 0) >= 9.35, 6000);

  // Hướng mặt lên bồn W(9, 1)
  await tapGameKey('KeyW', 150);

  const pBeforeSink = await page.evaluate(() => (window as any).__QUAT__);
  console.log(`[TARGET SINK] player x=${pBeforeSink?.x?.toFixed(2)} y=${pBeforeSink?.y?.toFixed(2)} fx=${pBeforeSink?.fx} fy=${pBeforeSink?.fy}`);

  // Giữ F 1 giây hướng về bồn rửa W
  await pressGameKey('KeyF', true);
  await page.waitForTimeout(1000);
  const qStateSink: QuatStateFull | null = await page.evaluate(() => (window as any).__QUAT__);
  logQuat('Đứng quay mặt về bồn giữ F 1 giây', qStateSink);
  await pressGameKey('KeyF', false);
  await page.waitForTimeout(100);
  await resetKeys();

  const sinkPassed = qStateSink?.key === 'pickup' && qStateSink?.actingStation === 'sink';
  reportItems.push({
    step: '7. Quay mặt về bồn (W) giữ F 1 giây',
    expected: 'key = pickup, actingStation = sink',
    measured: `key = ${qStateSink?.key}, actingStation = ${qStateSink?.actingStation}`,
    status: sinkPassed ? 'ĐẠT' : 'CHƯA ĐẠT',
  });

  // BƯỚC 8: Cầm cà chua, đi 2 giây → kỳ vọng 'carry_run' hoặc 'carry_walk'
  console.log('--- 8. Cầm cà chua, đi 2 giây ---');
  // Đi sang trái dọc hành lang tới trước thùng cà chua T(1, 1): x <= 1.55
  await holdKeyUntil('KeyA', q => (q.x ?? 99) <= 1.55, 6000);

  // Mặt hướng UP về thùng T(1, 1)
  await tapGameKey('KeyW', 150);

  const pBeforeTomato = await page.evaluate(() => (window as any).__QUAT__);
  console.log(`[TARGET TOMATO] player x=${pBeforeTomato?.x?.toFixed(2)} y=${pBeforeTomato?.y?.toFixed(2)} fx=${pBeforeTomato?.fx} fy=${pBeforeTomato?.fy}`);

  // Nhặt cà chua bằng phím Space / KeyE
  for (let i = 0; i < 6; i++) {
    await tapGameKey('Space', 100);
    await page.waitForTimeout(80);
    let hasItem = await page.evaluate(() => Boolean((window as any).__QUAT__?.held));
    if (hasItem) {
      console.log('Successfully picked up ingredient from crate T with Space!');
      break;
    }
    await tapGameKey('KeyE', 100);
    await page.waitForTimeout(80);
    hasItem = await page.evaluate(() => Boolean((window as any).__QUAT__?.held));
    if (hasItem) {
      console.log('Successfully picked up ingredient from crate T with KeyE!');
      break;
    }
    await tapGameKey('KeyW', 80);
  }

  // Đi thẳng sang phải 2 giây trong khi đang cầm đồ dọc hành lang
  await pressGameKey('KeyD', true);
  await page.waitForTimeout(500);
  const qStateCarry1: QuatStateFull | null = await page.evaluate(() => (window as any).__QUAT__);
  logQuat('Cầm cà chua, đi (sau 0.5s)', qStateCarry1);

  await page.waitForTimeout(1500); // Tổng 2s
  const qStateCarry2: QuatStateFull | null = await page.evaluate(() => (window as any).__QUAT__);
  logQuat('Cầm cà chua, đi 2 giây', qStateCarry2);
  await pressGameKey('KeyD', false);
  await resetKeys();

  const carryPassed = qStateCarry2?.key === 'carry_run' || qStateCarry2?.key === 'carry_walk';
  reportItems.push({
    step: '8. Cầm cà chua, đi 2 giây',
    expected: 'key = carry_run hoặc carry_walk',
    measured: `key = ${qStateCarry2?.key}`,
    status: carryPassed ? 'ĐẠT' : 'CHƯA ĐẠT',
  });

  // Chụp ảnh bằng chứng
  await page.screenshot({ path: path.join(logDir, 'verify-quat-q3.png') });

  // Lưu file log.txt
  fs.writeFileSync(logFile, logLines.join('\n'), 'utf8');
  console.log(`✅ Log saved to ${logFile}`);

  // In bảng báo cáo
  console.log('\n=== KẾT QUẢ KIỂM CHỨNG TRÌNH DUYỆT (Q3) ===');
  console.table(reportItems);

  await browser.close();
  console.log('Browser test completed successfully.');
}

main().catch(err => {
  console.error('Error running verify-quat:', err);
  process.exit(1);
});
