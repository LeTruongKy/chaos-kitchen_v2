const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  
  if (!fs.existsSync('docs/screens/collision')) {
    fs.mkdirSync('docs/screens/collision', { recursive: true });
  }

  for (let i = 1; i <= 4; i++) {
    console.log(`Loading level ${i}...`);
    await page.goto(`http://localhost:5173/?r=3d&debug=1&view=collision`, { waitUntil: 'networkidle2' });
    
    // Evaluate to start the game directly? 
    // It's a multiplayer game, so we might need to wait for the lobby and click 'Bắt đầu'
    try {
      await page.waitForSelector('button', { timeout: 5000 });
      // If we are in lobby, select level
      await page.evaluate((levelIndex) => {
        const select = document.querySelector('select');
        if (select) {
          select.value = `level${levelIndex}`;
          select.dispatchEvent(new Event('change'));
        }
      }, i);
      
      // Also check "Solo" mode
      await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        const soloCb = inputs.find(i => i.type === 'checkbox');
        if (soloCb && !soloCb.checked) {
          soloCb.click();
        }
      });
      
      await new Promise(r => setTimeout(r, 500));
      
      // Click start
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const startBtn = buttons.find(b => b.textContent.includes('Bắt đầu') || b.textContent.includes('Start'));
        if (startBtn) startBtn.click();
      });
      
      // Wait for countdown to finish (3, 2, 1) -> approx 4s
      await new Promise(r => setTimeout(r, 4500));
      
      // Take screenshot
      await page.screenshot({ path: `docs/screens/collision/level${i}.png` });
      console.log(`Saved docs/screens/collision/level${i}.png`);
    } catch (e) {
      console.error(`Error on level ${i}:`, e);
    }
  }

  await browser.close();
})();
