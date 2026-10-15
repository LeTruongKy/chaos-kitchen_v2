const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 720 });
  
  if (!fs.existsSync('docs/screens/collision')) {
    fs.mkdirSync('docs/screens/collision', { recursive: true });
  }

  for (let i = 1; i <= 4; i++) {
    console.log(`Loading level ${i}...`);
    await page.goto(`http://localhost:5173/?r=3d&debug=1&view=collision`, { waitUntil: 'networkidle' });
    
    try {
      await page.waitForSelector('button', { timeout: 5000 });
      await page.evaluate((levelIndex) => {
        const select = document.querySelector('select');
        if (select) {
          select.value = `level${levelIndex}`;
          select.dispatchEvent(new Event('change'));
        }
      }, i);
      
      await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        const soloCb = inputs.find(i => i.type === 'checkbox');
        if (soloCb && !soloCb.checked) {
          soloCb.click();
        }
      });
      
      await new Promise(r => setTimeout(r, 500));
      
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const startBtn = buttons.find(b => b.textContent.includes('Bắt đầu') || b.textContent.includes('Start'));
        if (startBtn) startBtn.click();
      });
      
      await new Promise(r => setTimeout(r, 4500));
      
      await page.screenshot({ path: `docs/screens/collision/level${i}.png` });
      console.log(`Saved docs/screens/collision/level${i}.png`);
    } catch (e) {
      console.error(`Error on level ${i}:`, e);
    }
  }

  await browser.close();
})();
