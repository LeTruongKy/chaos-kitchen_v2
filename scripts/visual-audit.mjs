// Visual audit: open ?r=3d&debug=1, enter level 1, dump every GLB instance in the scene.
// Usage: node scripts/visual-audit.mjs <screenshotPath> <jsonOutPath>
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE_URL || 'http://localhost:5173';
const shotPath = process.argv[2] || 'docs/screens/slice1/audit.png';
const jsonPath = process.argv[3] || 'docs/screens/slice1/audit.json';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const consoleLines = [];
page.on('console', (m) => consoleLines.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => consoleLines.push(`[pageerror] ${e.message}`));
await page.addInitScript(() => localStorage.setItem('ck_tutorial_seen', '1'));

await page.goto(`${BASE}/?r=3d&debug=1`);
await page.locator('input[type="text"]').first().fill('Audit');
await page.click('button:has-text("Tạo phòng")');
await page.waitForSelector('h1:has-text("Phòng")');
const solo = page.locator('input[type="checkbox"]');
if (await solo.first().isVisible().catch(() => false)) await solo.first().check();
await page.click('button:has-text("Bắt đầu")');
await page.waitForFunction(() => !!window.__CK3D__, null, { timeout: 30000 });
await page.waitForTimeout(4500); // let countdown overlay pass & a few frames render

const report = await page.evaluate(() => {
  const { scene, camera, THREE, loader } = window.__CK3D__;
  scene.updateMatrixWorld(true);
  camera.updateMatrixWorld(true);
  const frustum = new THREE.Frustum().setFromProjectionMatrix(
    new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
  );
  const r = (n) => Math.round(n * 1000) / 1000;
  const v = (p) => [r(p.x), r(p.y), r(p.z)];
  const isVisibleChain = (o) => { for (let c = o; c; c = c.parent) if (!c.visible) return false; return true; };
  const inScene = (o) => { let c = o; while (c.parent) c = c.parent; return c === scene; };

  const rows = [];
  scene.traverse((o) => {
    if (!o.userData || !o.userData.assetFile) return;
    const box = new THREE.Box3().setFromObject(o);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const wp = o.getWorldPosition(new THREE.Vector3());
    const ws = o.getWorldScale(new THREE.Vector3());
    const meshes = [];
    o.traverse((m) => {
      if (m.isMesh && !m.userData.isOutline) {
        const mat = Array.isArray(m.material) ? m.material[0] : m.material;
        meshes.push(`${mat.type}${mat.map ? '+map' : ''}${mat.map && !mat.map.image ? '(no image)' : ''}`);
      }
    });
    rows.push({
      file: o.userData.assetFile,
      id: o.userData.assetId,
      inScene: inScene(o),
      visible: isVisibleChain(o),
      min: v(box.min), max: v(box.max), size: v(size),
      parentPos: o.parent ? v(o.parent.position) : null,
      worldPos: v(wp), worldScale: v(ws),
      rotY: o.parent ? r(o.parent.rotation.y) : 0,
      inFrustum: frustum.containsPoint(center),
      pixelHeightApprox: null,
      meshes,
    });
  });
  // approx on-screen pixel size of the first box
  const H = window.innerHeight;
  for (const row of rows) {
    const a = new THREE.Vector3(...row.min).project(camera);
    const b = new THREE.Vector3(...row.max).project(camera);
    row.screenPx = r(Math.max(Math.abs(a.x - b.x) * window.innerWidth / 2, Math.abs(a.y - b.y) * H / 2));
  }
  return { loadStatus: loader.getLoadStatus(), rows, tilePx: 64 };
});

fs.mkdirSync(path.dirname(shotPath), { recursive: true });
await page.screenshot({ path: shotPath });
fs.writeFileSync(jsonPath, JSON.stringify({ ...report, console: consoleLines.filter(l => /error|warn|MISSING|AssetLoader|Normalizer/i.test(l)) }, null, 2));
console.log(`rows=${report.rows.length} -> ${jsonPath}, screenshot -> ${shotPath}`);
await browser.close();
