const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5173');
  
  // Dismiss tutorial if it exists
  await page.keyboard.press('Escape');

  // Wait for the name input and join button
  await page.waitForSelector('input[placeholder="Tên đầu bếp"]', { timeout: 10000 });
  await page.fill('input[placeholder="Tên đầu bếp"]', 'Player1');
  
  await page.click('button:has-text("Tạo phòng")');
  
  // Wait for lobby to show and then start game
  await page.waitForSelector('button:has-text("Bắt đầu")', { timeout: 10000 });
  await page.click('button:has-text("Bắt đầu")');

  // Wait for game scene
  await page.waitForTimeout(2000);

  // Take screenshot
  const outDir = path.join(__dirname, '../docs/screens/A02');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  await page.screenshot({ path: path.join(outDir, 'gameplay.png') });

  // Measure FPS using requestAnimationFrame over 1 second
  const fps = await page.evaluate(async () => {
    return new Promise(resolve => {
      let frames = 0;
      let startTime = performance.now();
      
      function loop() {
        frames++;
        if (performance.now() - startTime >= 1000) {
          resolve(frames);
        } else {
          requestAnimationFrame(loop);
        }
      }
      
      requestAnimationFrame(loop);
    });
  });

  console.log(`FPS: ${fps}`);

  await browser.close();
})();
