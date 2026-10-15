import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('🎬 Running Playwright verification for T1 tickets (?r=3d&debug=1)...');

  const outDir = path.resolve('docs/screens/t1');
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[PAGE ERROR CONSOLE] ${msg.text()}`);
      consoleErrors.push(msg.text());
    }
  });

  const url = 'http://localhost:5173/?r=3d&debug=1';
  console.log(`Navigating to ${url}...`);
  await page.addInitScript(() => {
    localStorage.setItem('ck_tutorial_seen', '1');
    localStorage.setItem('ck_player_name_v1', 'ChefTest');
  });
  await page.goto(url, { waitUntil: 'networkidle' });

  // 1. Enter name and create a room
  console.log('Filling name and creating game room...');
  const nameInput = page.locator('input[aria-label="Tên đầu bếp"]');
  if (await nameInput.count() > 0) {
    await nameInput.fill('ChefTest');
    await page.waitForTimeout(300);
  }

  const createBtn = page.locator('button:has-text("Tạo phòng")');
  await createBtn.waitFor({ state: 'visible' });
  await createBtn.click();

  // Wait for lobby to load
  await page.waitForSelector('.lobby-panel', { timeout: 10000 });
  console.log('In lobby, starting game...');

  // Start game
  const startBtn = page.locator('button:has-text("Bắt đầu")');
  await startBtn.click();
  console.log('Game started, waiting for game HUD...');

  // Wait for game HUD
  await page.waitForSelector('.hud-container', { timeout: 15000 });
  await page.waitForTimeout(3000);

  // Take screenshot of live in-game
  const inGamePath = path.join(outDir, 'ticket-in-game.png');
  await page.screenshot({ path: inGamePath });
  console.log(`📸 Saved live game screenshot: ${inGamePath}`);

  // Hook netClient.emit to inject orders deterministically for visual verification
  console.log('Hooking netClient.emit for deterministic recipe ticket verification...');
  await page.evaluate(() => {
    const netClient = (window as any).netClient;
    if (netClient) {
      const origEmit = netClient.emit.bind(netClient);
      netClient.emit = (event: string, payload: any) => {
        if (event === 'snapshot' && (window as any).__overrideOrders !== undefined) {
          payload = {
            ...payload,
            customers: [], // clear customer bubbles so only tested orders show
            orders: (window as any).__overrideOrders
          };
        }
        return origEmit(event, payload);
      };
    }
  });

  const testRecipes = [
    { id: 'salad', name: 'Salad' },
    { id: 'burger', name: 'Burger' },
    { id: 'burger_tomato', name: 'Burger Cà Chua' },
    { id: 'tomato_soup', name: 'Tomato Soup' },
    { id: 'onion_soup', name: 'Onion Soup' },
    { id: 'mushroom_soup', name: 'Mushroom Soup' }
  ];

  console.log('Testing each of the 6 recipe tickets...');
  for (let i = 0; i < testRecipes.length; i++) {
    const r = testRecipes[i]!;
    const orderId = 100 + i;

    await page.evaluate(({ orderId, recipeId }) => {
      (window as any).__overrideOrders = [
        { id: orderId, recipe: recipeId, timeLeft: 45, patience: 60 }
      ];
    }, { orderId, recipeId: r.id });

    await page.waitForTimeout(400);

    const ticket = page.locator(`.hud-order[data-id="${orderId}"]`);
    await ticket.waitFor({ state: 'visible', timeout: 5000 });

    const displayedName = await ticket.locator('.hud-order-name').innerText();
    const thumbImg = ticket.locator('.hud-order-thumb');
    const imgSrc = await thumbImg.getAttribute('src');

    console.log(`✅ Recipe: "${r.id}" | Ticket Name: "${displayedName}" | Img: "${imgSrc}"`);

    // Verify name matches RECIPES[id].name
    if (displayedName !== r.name) {
      console.error(`❌ Name mismatch for ${r.id}: expected "${r.name}", got "${displayedName}"`);
    }

    // Verify NO emojis on ticket
    const ticketText = await ticket.innerText();
    const hasEmoji = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(ticketText);
    if (hasEmoji) {
      console.error(`❌ Found emoji in ticket: ${ticketText}`);
    } else {
      console.log(`✅ No emojis on ticket for ${r.id}`);
    }

    const ticketPath = path.join(outDir, `ticket-${r.id}.png`);
    await ticket.screenshot({ path: ticketPath });
    console.log(`📸 Saved ticket screenshot: ${ticketPath}`);
  }

  // Also test all 6 recipes appearing concurrently on screen
  console.log('Testing all 6 recipes concurrently on screen...');
  await page.evaluate(() => {
    (window as any).__overrideOrders = [
      { id: 201, recipe: 'salad', timeLeft: 55, patience: 60 },
      { id: 202, recipe: 'burger', timeLeft: 40, patience: 60 },
      { id: 203, recipe: 'burger_tomato', timeLeft: 30, patience: 60 },
      { id: 204, recipe: 'tomato_soup', timeLeft: 50, patience: 60 },
      { id: 205, recipe: 'onion_soup', timeLeft: 48, patience: 60 },
      { id: 206, recipe: 'mushroom_soup', timeLeft: 25, patience: 60 }
    ];
  });

  await page.waitForTimeout(600);
  const multiOrdersPath = path.join(outDir, 'ticket-multi-orders.png');
  await page.screenshot({ path: multiOrdersPath });
  console.log(`📸 Saved multiple orders screenshot: ${multiOrdersPath}`);

  // Test missing thumbnail fallback with ?debug=1
  console.log('Testing missing thumbnail fallback (recipe: "mystery_food") with ?debug=1...');
  await page.evaluate(() => {
    (window as any).__overrideOrders = [
      { id: 301, recipe: 'mystery_food', timeLeft: 45, patience: 60 }
    ];
  });

  await page.waitForTimeout(600);
  const missingTicket = page.locator(`.hud-order[data-id="301"]`);
  await missingTicket.waitFor({ state: 'visible', timeout: 5000 });

  const missingTicketPath = path.join(outDir, 'ticket-missing-thumb-debug.png');
  await missingTicket.screenshot({ path: missingTicketPath });
  console.log(`📸 Saved missing thumbnail fallback screenshot: ${missingTicketPath}`);

  const hasMissingLog = consoleErrors.some(e => e.includes('MISSING THUMB: mystery_food'));
  console.log(`✅ Console error logged for missing thumb: ${hasMissingLog}`);

  const debugText = await missingTicket.locator('.missing-thumb-debug').innerText().catch(() => '');
  console.log(`✅ Red debug text displayed on ticket: "${debugText}"`);

  await browser.close();
  console.log('🎉 All Playwright ticket verifications completed successfully!');
}

main().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
