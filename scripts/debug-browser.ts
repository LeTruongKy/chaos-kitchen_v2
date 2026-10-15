import { chromium } from '@playwright/test';
import { spawn, ChildProcess } from 'node:child_process';
import * as fs from 'node:fs';
import * as http from 'node:http';

async function checkUrl(url: string, expectedText?: string): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      if (expectedText) {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve(res.statusCode === 200 && data.trim() === expectedText);
        });
      } else {
        resolve(res.statusCode === 200);
      }
    });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForServers(timeoutMs = 45000): Promise<void> {
  const start = Date.now();
  console.log('Waiting for backend (http://localhost:2567/healthz) and frontend (http://localhost:5173)...');
  while (Date.now() - start < timeoutMs) {
    const serverOk = await checkUrl('http://localhost:2567/healthz', 'ok');
    const clientOk = await checkUrl('http://localhost:5173');
    if (serverOk && clientOk) {
      console.log('Both server and client are up and responding!');
      return;
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error(`Timeout waiting for servers after ${timeoutMs}ms`);
}

async function main() {
  fs.mkdirSync('debug', { recursive: true });

  let devProcess: ChildProcess | null = null;
  const isServerUp = await checkUrl('http://localhost:2567/healthz', 'ok');
  const isClientUp = await checkUrl('http://localhost:5173');

  if (!isServerUp || !isClientUp) {
    console.log('Starting dev server in background...');
    devProcess = spawn('pnpm.cmd', ['dev'], {
      stdio: 'pipe',
      shell: true,
      detached: false,
    });

    devProcess.stdout?.on('data', (d) => {
      const str = d.toString();
      if (str.includes('error') || str.includes('Error') || str.includes('ready')) {
        process.stdout.write(`[DEV STDOUT] ${str}`);
      }
    });

    devProcess.stderr?.on('data', (d) => {
      process.stderr.write(`[DEV STDERR] ${d.toString()}`);
    });
  }

  try {
    await waitForServers();

    console.log('Launching browser...');
    let browser;
    try {
      browser = await chromium.launch({ headless: false });
    } catch (e) {
      console.log('Could not launch headful, falling back to headless:', e);
      browser = await chromium.launch({ headless: true });
    }

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    const page = await context.newPage();

    await page.addInitScript(() => {
      (window as unknown as { __name: (fn: unknown) => unknown }).__name = (fn: unknown) => fn;
    });

    page.on('console', msg => {
      console.log(`[BROWSER CONSOLE ${msg.type().toUpperCase()}] ${msg.text()}`);
    });

    page.on('pageerror', err => {
      console.log(`[PAGE ERROR] ${err.stack || err.message}`);
    });

    page.on('requestfailed', req => {
      console.log(`[REQUEST FAILED] ${req.url()} - ${req.failure()?.errorText}`);
    });

    page.on('response', res => {
      if (res.status() >= 400) {
        console.log(`[RESPONSE >= 400] ${res.status()} ${res.url()}`);
      }
    });

    page.on('websocket', ws => {
      console.log(`[WEBSOCKET OPEN] ${ws.url()}`);
      ws.on('framereceived', f => console.log(`[WS RECV] ${f.payload}`));
      ws.on('framesent', f => console.log(`[WS SENT] ${f.payload}`));
      ws.on('close', () => console.log(`[WS CLOSE]`));
      ws.on('socketerror', e => console.log(`[WS ERROR] ${e}`));
    });

    console.log('Navigating to http://localhost:5173/?debug=1 ...');
    await page.goto('http://localhost:5173/?debug=1', { waitUntil: 'load' });

    console.log('Waiting 3 seconds for initial render...');
    await page.waitForTimeout(3000);

    console.log('Saving screenshot to debug/01-initial.png ...');
    await page.screenshot({ path: 'debug/01-initial.png', fullPage: true });

    console.log('--- DUMPING DOM STRUCTURE ---');
    const dump = await page.evaluate(() => {
      const html = document.documentElement.outerHTML;
      const body = document.body.innerHTML;
      const appEl = document.getElementById('app');
      const gameEl = document.getElementById('game');
      const portraitEl = document.getElementById('portrait-overlay');
      const canvasEl = document.querySelector('canvas');

      const getInfo = (el: HTMLElement | null) => {
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return {
          id: el.id,
          tagName: el.tagName,
          display: style.display,
          visibility: style.visibility,
          opacity: style.opacity,
          zIndex: style.zIndex,
          position: style.position,
          rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
          childCount: el.childElementCount,
          innerHTMLPreview: el.innerHTML.slice(0, 300),
        };
      };

      return {
        app: getInfo(appEl),
        game: getInfo(gameEl),
        portrait: getInfo(portraitEl),
        canvas: canvasEl ? {
          width: canvasEl.width,
          height: canvasEl.height,
          styleWidth: canvasEl.style.width,
          styleHeight: canvasEl.style.height,
          display: window.getComputedStyle(canvasEl).display,
        } : null,
        bodyLen: body.length,
        documentTitle: document.title,
        outerHTMLPreview: html.slice(0, 1500),
      };
    });

    console.log(JSON.stringify(dump, null, 2));

    await browser.close();
  } finally {
    if (devProcess) {
      console.log('Terminating dev server process...');
      devProcess.kill();
    }
  }
}

main().catch(err => {
  console.error('Debug script failed:', err);
  process.exit(1);
});
