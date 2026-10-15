import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { 
  createGameState, 
  interact, 
  tickOrders, 
  getLevel, 
  GameState, 
  PlateItem, 
  toSnapshot,
  StationState,
  CustomerState
} from '../packages/core/src';

async function main() {
  console.log('🎬 Running Playwright verification for T2 serving at customer tables (?r=3d&debug=1)...');

  const outDir = path.resolve('docs/screens/t2');
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE ${msg.type()}] ${msg.text()}`);
  });

  const url = 'http://localhost:5173/?r=3d&debug=1';
  console.log(`Navigating to ${url}...`);
  await page.addInitScript(() => {
    localStorage.setItem('ck_tutorial_seen', '1');
    localStorage.setItem('ck_player_name_v1', 'ChefTest');
  });
  await page.goto(url, { waitUntil: 'networkidle' });

  // Enter name and create room
  console.log('Creating game room...');
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
  console.log('Game started, waiting for game HUD and 3D scene...');

  // Wait for game HUD
  await page.waitForSelector('.hud-container', { timeout: 15000 });
  await page.waitForTimeout(3000);

  // Helper to make plates
  function makeSaladPlate(): PlateItem {
    return {
      type: 'plate',
      dirty: false,
      contents: [
        { type: 'ingredient', id: 'lettuce', state: 'chopped' },
        { type: 'ingredient', id: 'tomato', state: 'chopped' }
      ]
    };
  }

  function makeBurgerPlate(): PlateItem {
    return {
      type: 'plate',
      dirty: false,
      contents: [
        { type: 'ingredient', id: 'bun', state: 'raw' },
        { type: 'ingredient', id: 'meat', state: 'cooked' },
        { type: 'ingredient', id: 'lettuce', state: 'chopped' }
      ]
    };
  }

  // Setup game simulation state on level1
  // level1 has tables at (13, 3) and (16, 3)
  const simState = createGameState(getLevel('level1')!, ['session-1'], 42);
  simState.customers = [];
  simState.orders = [];
  simState.nextOrderIn = 99999;
  simState.stations.filter(s => s.type === 'table').forEach(s => s.customerId = undefined);

  const table1 = simState.stations.find(s => s.type === 'table' && s.x === 13 && s.y === 3)!;
  const table2 = simState.stations.find(s => s.type === 'table' && s.x === 16 && s.y === 3)!;
  const player = simState.players[0]!;

  async function syncToBrowser(state: GameState, event?: any) {
    const snap = toSnapshot(state, 100);
    const result = await page.evaluate(({ snap, event }) => {
      const netClient = (window as any).netClient;
      if (netClient) {
        netClient.emit('snapshot', snap);
        if (event) {
          netClient.emit('event', event);
        }
      }
      return {
        hasNetClient: Boolean(netClient),
        toasts: Array.from(document.querySelectorAll('.toast')).map(el => el.textContent)
      };
    }, { snap, event });
    console.log(`[SYNC RESULT] event: ${event?.type} (${event?.reason}), toasts:`, result.toasts);
    await page.waitForTimeout(600);
  }

  console.log('\n--- BƯỚC 4: KIỂM CHỨNG TỪNG TRƯỜNG HỢP TRONG TRÌNH DUYỆT ---');

  // ==========================================
  // a) Đúng món đúng bàn -> serve_ok
  // ==========================================
  console.log('\n[Case a] Đúng món đúng bàn:');
  const c1: CustomerState = {
    id: 1,
    x: table1.x,
    y: table1.y,
    state: 'order_taken',
    recipe: 'salad',
    patience: 60,
    maxPatience: 60,
    timer: 0,
    colorIndex: 0
  };
  simState.customers = [c1];
  table1.customerId = c1.id;
  simState.orders = [{ id: 101, recipe: 'salad', timeLeft: 60, patience: 60, customerId: c1.id }];

  player.x = table1.x;
  player.y = table1.y;
  player.fx = 0; player.fy = 0;
  player.held = makeSaladPlate();

  const scoreBeforeA = simState.score;
  const eventsA = interact(simState, player.id);
  const serveOkEv = eventsA.find(e => e.type === 'serve_ok');
  const scoreAfterA = simState.score;

  console.log(`- Tile: Table Q (${table1.x}, ${table1.y})`);
  console.log(`- Reason: none (thành công)`);
  console.log(`- Event:`, serveOkEv);
  console.log(`- Điểm trước: ${scoreBeforeA} | Điểm sau: ${scoreAfterA} (tăng +${scoreAfterA - scoreBeforeA})`);

  // Position chef nicely standing next to table for 3D screenshot
  player.x = table1.x - 0.7; player.fx = 1;
  await syncToBrowser(simState, serveOkEv);
  const pathA = path.join(outDir, 'ok-correct-table.png');
  await page.screenshot({ path: pathA });
  console.log(`📸 Saved screenshot: ${pathA}`);

  // ==========================================
  // b) Đúng món bàn khác đang gọi món đó -> wrong_table
  // ==========================================
  console.log('\n[Case b] Đúng món bàn khác đang gọi món đó (wrong_table):');
  // Customer 1 at table 1 ordered salad
  const c1_b: CustomerState = {
    id: 10,
    x: table1.x,
    y: table1.y,
    state: 'order_taken',
    recipe: 'salad',
    patience: 60,
    maxPatience: 60,
    timer: 0,
    colorIndex: 0
  };
  // Customer 2 at table 2 ordered burger
  const c2_b: CustomerState = {
    id: 20,
    x: table2.x,
    y: table2.y,
    state: 'order_taken',
    recipe: 'burger',
    patience: 60,
    maxPatience: 60,
    timer: 0,
    colorIndex: 1
  };
  simState.customers = [c1_b, c2_b];
  table1.customerId = c1_b.id;
  table2.customerId = c2_b.id;
  simState.orders = [
    { id: 201, recipe: 'salad', timeLeft: 60, patience: 60, customerId: c1_b.id },
    { id: 202, recipe: 'burger', timeLeft: 60, patience: 60, customerId: c2_b.id }
  ];

  // Player stands at table 1 holding burger (which is customer 2's order!)
  player.x = table1.x;
  player.y = table1.y;
  player.fx = 0; player.fy = 0;
  const burgerHeld = makeBurgerPlate();
  player.held = burgerHeld;

  const scoreBeforeB = simState.score;
  const eventsB = interact(simState, player.id);
  const serveFailEvB = eventsB.find(e => e.type === 'serve_fail');
  const scoreAfterB = simState.score;

  console.log(`- Tile: Table Q (${table1.x}, ${table1.y})`);
  console.log(`- Reason: ${serveFailEvB?.reason}`);
  console.log(`- Event:`, serveFailEvB);
  console.log(`- Điểm trước: ${scoreBeforeB} | Điểm sau: ${scoreAfterB} (không đổi)`);
  console.log(`- Đĩa trên tay: còn nguyên (player.held !== null: ${player.held !== null})`);

  player.x = table1.x - 0.7; player.fx = 1;
  await syncToBrowser(simState, serveFailEvB);
  // Wait a moment for toast to display
  await page.waitForTimeout(300);
  const pathB = path.join(outDir, 'fail-wrong-table.png');
  await page.screenshot({ path: pathB });
  console.log(`📸 Saved screenshot: ${pathB}`);

  // ==========================================
  // c) Sai món bàn đúng -> wrong_dish
  // ==========================================
  console.log('\n[Case c] Sai món bàn đúng (wrong_dish):');
  // Customer 1 at table 1 ordered salad
  simState.customers = [c1_b];
  table1.customerId = c1_b.id;
  table2.customerId = undefined;
  simState.orders = [{ id: 201, recipe: 'salad', timeLeft: 60, patience: 60, customerId: c1_b.id }];

  // Player holds empty plate (wrong dish)
  player.x = table1.x;
  player.y = table1.y;
  player.fx = 0; player.fy = 0;
  const emptyPlate: PlateItem = { type: 'plate', dirty: false, contents: [] };
  player.held = emptyPlate;

  const scoreBeforeC = simState.score;
  const eventsC = interact(simState, player.id);
  const serveFailEvC = eventsC.find(e => e.type === 'serve_fail');
  const scoreAfterC = simState.score;

  console.log(`- Tile: Table Q (${table1.x}, ${table1.y})`);
  console.log(`- Reason: ${serveFailEvC?.reason}`);
  console.log(`- Event:`, serveFailEvC);
  console.log(`- Điểm trước: ${scoreBeforeC} | Điểm sau: ${scoreAfterC} (không đổi)`);

  player.x = table1.x - 0.7; player.fx = 1;
  await syncToBrowser(simState, serveFailEvC);
  await page.waitForTimeout(300);
  const pathC = path.join(outDir, 'fail-wrong-dish.png');
  await page.screenshot({ path: pathC });
  console.log(`📸 Saved screenshot: ${pathC}`);

  // ==========================================
  // d) Đặt đĩa lên bàn trống -> no_customer
  // ==========================================
  console.log('\n[Case d] Đặt đĩa lên bàn trống (no_customer):');
  // Table 2 has no customer
  table2.customerId = undefined;
  player.x = table2.x;
  player.y = table2.y;
  player.fx = 0; player.fy = 0;
  const saladPlateD = makeSaladPlate();
  player.held = saladPlateD;

  const scoreBeforeD = simState.score;
  const eventsD = interact(simState, player.id);
  const serveFailEvD = eventsD.find(e => e.type === 'serve_fail');
  const scoreAfterD = simState.score;

  console.log(`- Tile: Table Q (${table2.x}, ${table2.y})`);
  console.log(`- Reason: ${serveFailEvD?.reason}`);
  console.log(`- Event:`, serveFailEvD);
  console.log(`- Điểm trước: ${scoreBeforeD} | Điểm sau: ${scoreAfterD} (không đổi)`);
  console.log(`- Đĩa trên tay: còn nguyên (player.held !== null: ${player.held !== null})`);

  player.x = table2.x - 0.7; player.fx = 1;
  await syncToBrowser(simState, serveFailEvD);
  await page.waitForTimeout(300);
  const pathD = path.join(outDir, 'fail-no-customer.png');
  await page.screenshot({ path: pathD });
  console.log(`📸 Saved screenshot: ${pathD}`);

  // ==========================================
  // e) Đặt đĩa lên quầy / sàn gần bàn: không serve_ok, điểm không đổi
  // ==========================================
  console.log('\n[Case e] Đặt đĩa lên quầy / sàn gần bàn:');
  const counterStation = simState.stations.find(s => s.type === 'counter' && s.x === 10 && s.y === 3)!;
  player.x = counterStation.x;
  player.y = counterStation.y;
  player.fx = 0; player.fy = 0;
  player.held = makeSaladPlate();

  const scoreBeforeE = simState.score;
  const eventsE = interact(simState, player.id);
  const hasServeOkOrFailE = eventsE.some(e => e.type === 'serve_ok' || e.type === 'serve_fail');
  const scoreAfterE = simState.score;

  console.log(`- Tile: Counter X (${counterStation.x}, ${counterStation.y})`);
  console.log(`- Reason: N/A (không có sự kiện phục vụ)`);
  console.log(`- Events:`, eventsE.map(e => e.type));
  console.log(`- Không có serve_ok hay serve_fail: ${!hasServeOkOrFailE}`);
  console.log(`- Điểm trước: ${scoreBeforeE} | Điểm sau: ${scoreAfterE} (không đổi)`);

  // ==========================================
  // f) Sau giao đúng: đĩa bẩn tại bàn (dirty-at-table.png)
  // ==========================================
  console.log('\n[Case f] Sau giao đúng: đĩa bẩn tại bàn (dirty-at-table.png):');
  // Customer eating at table 1, then finishes after 5s
  const cEating: CustomerState = {
    id: 30,
    x: table1.x,
    y: table1.y,
    state: 'eating',
    recipe: 'salad',
    patience: 60,
    maxPatience: 60,
    timer: 0,
    colorIndex: 0
  };
  simState.customers = [cEating];
  table1.customerId = cEating.id;
  table1.item = null;

  // Fast forward eating time by 5.0 seconds
  tickOrders(simState, 5.0);

  console.log(`- Tile: Table Q (${table1.x}, ${table1.y})`);
  console.log(`- Customer left: customers count = ${simState.customers.length}`);
  console.log(`- Table customerId: ${table1.customerId}`);
  console.log(`- Table item:`, table1.item);
  console.log(`- Đĩa bẩn tại bàn: ${table1.item?.type === 'plate' && (table1.item as PlateItem).dirty}`);

  // Place player next to table with empty hands looking at the dirty plate
  player.x = table1.x - 1;
  player.y = table1.y;
  player.fx = 1; player.fy = 0;
  player.held = null;

  await syncToBrowser(simState);
  await page.waitForTimeout(600);
  const pathF = path.join(outDir, 'dirty-at-table.png');
  await page.screenshot({ path: pathF });
  console.log(`📸 Saved screenshot: ${pathF}`);

  await browser.close();
  console.log('\n🎉 Hoàn thành kiểm chứng BƯỚC 4 trong trình duyệt Playwright!');
}

main().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
