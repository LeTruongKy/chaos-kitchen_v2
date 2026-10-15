import { createServer } from 'vite';
import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

async function generateThumbnails() {
  console.log('🚀 Starting 3D Thumbnail Generator...');

  const publicThumbsDir = path.resolve('apps/client/public/thumbs/recipes');
  const screensThumbsDir = path.resolve('docs/screens/t1/thumbs');

  fs.mkdirSync(publicThumbsDir, { recursive: true });
  fs.mkdirSync(screensThumbsDir, { recursive: true });

  const clientDir = path.resolve('apps/client');
  console.log('Starting embedded Vite server for client assets...');
  const viteServer = await createServer({
    root: clientDir,
    server: { port: 5173 }
  });
  await viteServer.listen();
  const address = viteServer.httpServer?.address();
  const port = typeof address === 'object' && address ? address.port : 5173;
  console.log(`Vite server running on port ${port}`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });

  page.on('console', msg => {
    if (msg.type() === 'error') console.error('PAGE ERROR:', msg.text());
  });

  const url = `http://localhost:${port}/?view=thumbs`;
  console.log(`Navigating to ${url}...`);
  await page.goto(url, { waitUntil: 'networkidle' });

  // Wait for the renderer to finish all assets and render
  console.log('Waiting for 3D item models and offscreen renders...');
  await page.waitForFunction(() => (window as any).thumbsReady === true, { timeout: 20000 });

  // Execute renderAllThumbs in browser context
  const thumbsData = await page.evaluate(async () => {
    return await (window as any).renderAllThumbs();
  });

  const recipeIds = Object.keys(thumbsData);
  console.log(`Received ${recipeIds.length} thumbnails: ${recipeIds.join(', ')}`);

  for (const id of recipeIds) {
    const dataUrl = thumbsData[id];
    if (!dataUrl || !dataUrl.startsWith('data:image/png;base64,')) {
      console.error(`Invalid data URL for ${id}`);
      continue;
    }
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const publicPath = path.join(publicThumbsDir, `${id}.png`);
    const screensPath = path.join(screensThumbsDir, `${id}.png`);

    fs.writeFileSync(publicPath, buffer);
    fs.writeFileSync(screensPath, buffer);

    console.log(`✅ Saved: ${id}.png (${buffer.length} bytes) -> public & docs/screens/t1/thumbs`);
  }

  await browser.close();
  await viteServer.close();
  console.log('🎉 All 3D thumbnails successfully generated!');
}

generateThumbnails().catch(err => {
  console.error('❌ Error generating thumbnails:', err);
  process.exit(1);
});
