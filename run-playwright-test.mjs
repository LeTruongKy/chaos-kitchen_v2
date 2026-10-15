import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const outLines = [];
function log(msg) { console.log(msg); outLines.push(msg); }

async function run() {
  const browser = await chromium.launch({ headless: true }); // WebGL works in headless
  const context = await browser.newContext();
  const page = await context.newPage();

  log('Navigating to http://localhost:5173/anim-test.html ...');
  await page.goto('http://localhost:5173/anim-test.html');

  // Wait for loading
  await page.waitForFunction(() => window.animTestContext !== undefined, { timeout: 30000 });

  log('Page loaded. Running checks...');

  const results = await page.evaluate(async () => {
    const ctx = window.animTestContext;
    const { mixer, clonedModel, playAnim, materialsLog, scale, height } = ctx;

    const logMsgs = [];
    const pushLog = (m) => logMsgs.push(m);

    pushLog('=== CHỨNG MINH MATERIAL & HEIGHT ===');
    pushLog(materialsLog);
    pushLog(`Scale applied: ${scale.toFixed(4)}, Height in units: ${height.toFixed(2)} (Target ~ 2.2 tile/units)`);

    // Helper: update mixer by frames to simulate render loop
    const stepMixer = (durationSec) => {
      const fps = 60;
      const steps = Math.ceil(durationSec * fps);
      const dt = durationSec / steps;
      for (let i = 0; i < steps; i++) mixer.update(dt);
    };

    const lFoot = clonedModel.getObjectByName('mixamorigLeftFoot');
    const rFoot = clonedModel.getObjectByName('mixamorigRightFoot');
    const hips = clonedModel.getObjectByName('mixamorigHips');

    // To measure mesh vertices, we need the SkinnedMesh
    let skinnedMesh = null;
    clonedModel.traverse(c => {
      if (c.isSkinnedMesh) skinnedMesh = c;
    });

    const getFeetVerticesPositionSum = () => {
      if (!skinnedMesh) return 0;
      // Trích xuất vị trí đỉnh sau khi transform xương.
      // Dùng hàm applyBoneTransform của THREE (SkinnedMesh có thể không có sẵn trong r150, ta dùng skeleton.bones)
      // Cách đơn giản nhất: lấy tọa độ World của xương bàn chân (đã chứng minh được lưới động).
      // Nhưng user đòi "vị trí đỉnh lưới thật (lưới đã bị xương làm biến dạng)".
      // Hàm THREE JS để lấy đỉnh đã skinning phức tạp vì WebGL tính trên GPU. 
      // Ta có thể tính skinning trên CPU để verify!
      
      const pos = skinnedMesh.geometry.attributes.position;
      const skinIndex = skinnedMesh.geometry.attributes.skinIndex;
      const skinWeight = skinnedMesh.geometry.attributes.skinWeight;
      
      if (!pos || !skinIndex || !skinWeight) return 0;
      
      const vertex = new window.THREE.Vector3();
      const temp = new window.THREE.Vector3();
      const boneMatrix = new window.THREE.Matrix4();
      
      let sum = 0;
      // Tính biến dạng cho 10 đỉnh đầu tiên
      for (let i = 0; i < 10; i++) {
        vertex.fromBufferAttribute(pos, i);
        const finalPos = new window.THREE.Vector3();
        
        for (let j = 0; j < 4; j++) {
          const weight = skinWeight.getComponent(i, j);
          if (weight === 0) continue;
          
          const boneIndex = skinIndex.getComponent(i, j);
          const bone = skinnedMesh.skeleton.bones[boneIndex];
          
          boneMatrix.multiplyMatrices(bone.matrixWorld, skinnedMesh.skeleton.boneInverses[boneIndex]);
          temp.copy(vertex).applyMatrix4(boneMatrix).multiplyScalar(weight);
          finalPos.add(temp);
        }
        sum += finalPos.lengthSq();
      }
      return sum;
    };

    const clipsToTest = ['idle', 'walk', 'carry_run', 'sprint', 'throw'];
    for (const clipName of clipsToTest) {
      pushLog(`\n--- BÀI TEST CLIP: ${clipName} ---`);
      playAnim(clipName);
      
      // Wait for crossfade to finish or skip it by just jumping time
      // The fastest way is to reset mixer and just play this action solely
      mixer.stopAllAction();
      const action = ctx.actions[clipName];
      action.reset().setEffectiveWeight(1).play();
      mixer.setTime(0);
      clonedModel.updateMatrixWorld(true);

      const p0_l = new window.THREE.Vector3();
      const p0_r = new window.THREE.Vector3();
      const p0_hips = new window.THREE.Vector3();
      lFoot.getWorldPosition(p0_l);
      rFoot.getWorldPosition(p0_r);
      hips.getWorldPosition(p0_hips);
      
      const v0_sum = getFeetVerticesPositionSum();

      // Tiến 0.25s
      stepMixer(0.25);
      clonedModel.updateMatrixWorld(true);

      const p1_l = new window.THREE.Vector3();
      const p1_r = new window.THREE.Vector3();
      lFoot.getWorldPosition(p1_l);
      rFoot.getWorldPosition(p1_r);

      const v1_sum = getFeetVerticesPositionSum();

      const move_l = p0_l.distanceTo(p1_l);
      const move_r = p0_r.distanceTo(p1_r);
      const moveTotal = move_l + move_r;

      pushLog(`+ Độ dịch chuyển Xương (0.25s): L=${move_l.toFixed(4)}, R=${move_r.toFixed(4)} | Tổng: ${moveTotal.toFixed(4)}`);
      pushLog(`+ Độ dịch chuyển Lưới (CPU Skinning, 10 đỉnh đầu): ${Math.abs(v1_sum - v0_sum).toFixed(6)}`);
      
      if (clipName === 'walk') {
        // Drift 5s
        stepMixer(5.0);
        clonedModel.updateMatrixWorld(true);
        const p2_hips = new window.THREE.Vector3();
        hips.getWorldPosition(p2_hips);
        const drift = Math.sqrt(Math.pow(p2_hips.x - p0_hips.x, 2) + Math.pow(p2_hips.z - p0_hips.z, 2));
        pushLog(`+ Hips Drift (Ngang) sau 5s: ${drift.toFixed(4)}`);
      }
    }
    
    return logMsgs.join('\n');
  });

  log(results);

  // Screenshots
  const outDir = path.join('docs', 'screens', 'anim-page');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const capture = async (clip, t, filename) => {
    await page.evaluate(async ({clip, t}) => {
      const ctx = window.animTestContext;
      ctx.mixer.stopAllAction();
      const action = ctx.actions[clip];
      action.reset().setEffectiveWeight(1).play();
      ctx.mixer.setTime(t);
      ctx.clonedModel.updateMatrixWorld(true);
      // Wait for 1 frame render
      await new Promise(r => requestAnimationFrame(r));
    }, {clip, t});
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(outDir, filename) });
    log(`Chụp ảnh: ${filename}`);
  };

  await capture('walk', 0, 'walk_t0.png');
  await capture('walk', 0.25, 'walk_t0_25.png');
  await capture('walk', 0.5, 'walk_t0_50.png');
  
  await capture('carry_run', 0, 'carry_run_t0.png');
  await capture('carry_run', 0.25, 'carry_run_t0_25.png');
  await capture('carry_run', 0.5, 'carry_run_t0_50.png');

  await capture('sprint', 0, 'sprint_t0.png');
  await capture('sprint', 0.25, 'sprint_t0_25.png');
  await capture('sprint', 0.5, 'sprint_t0_50.png');

  await capture('idle', 0, 'idle_t0.png');

  await browser.close();
  
  fs.writeFileSync('docs/screens/anim-page/playwright_audit.txt', outLines.join('\n'));
}

run().catch(e => { console.error(e); process.exit(1); });
