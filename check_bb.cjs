const { chromium } = require('@playwright/test');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    channel: 'chrome'
  });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE:', msg.text()));
  
  console.log(`Loading level 1 to get BBs...`);
  await page.goto(`http://localhost:5173/?r=3d&debug=1`, { waitUntil: 'networkidle' });
  
  try {
    console.log("Waiting for button...");
    await page.waitForSelector('button', { timeout: 5000 });
    
    console.log("Pressing Escape to close modal...");
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 500));
    
    console.log("Filling name...");
    await page.fill('input[placeholder="Tên đầu bếp"]', 'Bot');
    
    console.log("Clicking Tạo phòng...");
    await page.click('button:has-text("Tạo phòng")');
    await new Promise(r => setTimeout(r, 1000));
    
    console.log("Setting level to 1...");
    // Check "Solo" mode and select level1
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const soloCb = inputs.find(i => i.type === 'checkbox');
      if (soloCb && !soloCb.checked) soloCb.click();
      
      const select = document.querySelector('select');
      if (select) {
        select.value = `level1`;
        select.dispatchEvent(new Event('change'));
      }
    });
    
    await new Promise(r => setTimeout(r, 500));
    
    console.log("Clicking Bắt đầu...");
    await page.click('button:has-text("Bắt đầu"), button:has-text("Start")');
    
    console.log("Waiting 4.5 seconds...");
    await new Promise(r => setTimeout(r, 4500));
    
    console.log("Waiting for __CK3D__...");
    await page.waitForFunction(() => !!window.__CK3D__, { timeout: 10000 });
    console.log("__CK3D__ found! Evaluating...");
    
    const result = await page.evaluate(() => {
      const { scene, THREE } = window.__CK3D__;
      const TILE_PX = 64;
      
      let out = "";
      scene.traverse((obj) => {
        if (obj.name && obj.name.startsWith('station_')) {
          const type = obj.name;
          const px = obj.position.x;
          const py = obj.position.y;
          const pz = obj.position.z;
          
          const bb = new THREE.Box3().setFromObject(obj);
          
          const cx = Math.floor(px / TILE_PX);
          const cy = Math.floor(pz / TILE_PX);
          
          const expectedMinX = cx * TILE_PX;
          const expectedMaxX = (cx + 1) * TILE_PX;
          const expectedMinZ = cy * TILE_PX;
          const expectedMaxZ = (cy + 1) * TILE_PX;
          
          const minX = bb.min.x;
          const maxX = bb.max.x;
          const minZ = bb.min.z;
          const maxZ = bb.max.z;
          const maxY = bb.max.y;
          
          const diffMinX = minX - expectedMinX;
          const diffMaxX = maxX - expectedMaxX;
          const diffMinZ = minZ - expectedMinZ;
          const diffMaxZ = maxZ - expectedMaxZ;
          
          const nDiffMinX = diffMinX / TILE_PX;
          const nDiffMaxX = diffMaxX / TILE_PX;
          const nDiffMinZ = diffMinZ / TILE_PX;
          const nDiffMaxZ = diffMaxZ / TILE_PX;
          const nHeight = maxY / TILE_PX;
          
          out += `Station: ${type} at (${cx}, ${cy})\n`;
          out += `  Pos: ${px.toFixed(1)}, ${pz.toFixed(1)} -> center offset: ${((px - (expectedMinX + TILE_PX/2)) / TILE_PX).toFixed(3)}, ${((pz - (expectedMinZ + TILE_PX/2)) / TILE_PX).toFixed(3)}\n`;
          out += `  Base diff (tiles): minX=${nDiffMinX.toFixed(3)}, maxX=${nDiffMaxX.toFixed(3)}, minZ=${nDiffMinZ.toFixed(3)}, maxZ=${nDiffMaxZ.toFixed(3)}\n`;
          out += `  Height (tiles): ${nHeight.toFixed(3)}\n`;
        }
      });
      return out;
    });
    
    fs.writeFileSync('docs/COLLISION_AUDIT.md', result);
    console.log("Wrote docs/COLLISION_AUDIT.md");
  } catch (e) {
    console.error(e);
  }

  await browser.close();
})();
