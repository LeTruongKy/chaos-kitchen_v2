import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import fs from 'fs';
import path from 'path';

global.window = global;
global.document = { createElementNS: () => ({ addEventListener: () => {} }), createElement: () => ({ addEventListener: () => {} }) };
global.Image = function() { this.addEventListener = () => {}; };

const outLines = [];
function log(msg) { console.log(msg); outLines.push(msg); }

const loader = new FBXLoader();

function loadFbxBuffer(filePath) {
  const buf = fs.readFileSync(filePath);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return loader.parse(ab, path.dirname(filePath));
}

const basePath = 'd:/TrainingProgram/chaos-kitchen2/apps/client/public/assets/chef';
const model = loadFbxBuffer(path.join(basePath, 'chef_model.fbx'));

const anims = [
  { key: 'idle', file: 'idle.fbx' },
  { key: 'walk', file: 'walk.fbx' },
  { key: 'standard_walk', file: 'standard_walk.fbx' },
  { key: 'carry_idle', file: 'carry_idle.fbx' },
  { key: 'carry_run', file: 'carry_run.fbx' },
  { key: 'sprint', file: 'sprint.fbx' },
  { key: 'throw', file: 'throw.fbx' },
  { key: 'terrified', file: 'terrified.fbx' },
  { key: 'cheering', file: 'cheering.fbx' },
  { key: 'wiping_sweat', file: 'wiping_sweat.fbx' }
];

log('=== ĐO ĐỘ CHUYỂN ĐỘNG CHÂN BẰNG NODE.JS ===');

anims.forEach(anim => {
  const animFbx = loadFbxBuffer(path.join(basePath, anim.file));
  if (!animFbx.animations || animFbx.animations.length === 0) {
    log(`Clip: ${anim.key} - KHÔNG CÓ ANIMATION`);
    return;
  }
  
  const clip = animFbx.animations[0];
  clip.name = anim.key;
  let mismatchCount = 0;
  
  const newTracks = [];
  for (let i = 0; i < clip.tracks.length; i++) {
    const track = clip.tracks[i];
    
    const dot = track.name.lastIndexOf('.');
    const fullPath = track.name.substring(0, dot);
    const prop = track.name.substring(dot);
    const slash = fullPath.lastIndexOf('/');
    let boneName = slash >= 0 ? fullPath.substring(slash + 1) : fullPath;
    
    if (i === 0) log('Track 0 boneName: ' + boneName);
    const stripped = boneName.replace(/^mixamorig:?/i, '').toLowerCase();
    const originalBones = ['mixamorigHips', 'mixamorigSpine', 'mixamorigSpine1', 'mixamorigSpine2', 'mixamorigNeck', 'mixamorigHead', 'mixamorigLeftShoulder', 'mixamorigLeftArm', 'mixamorigLeftForeArm', 'mixamorigLeftHand', 'mixamorigRightShoulder', 'mixamorigRightArm', 'mixamorigRightForeArm', 'mixamorigRightHand', 'mixamorigLeftUpLeg', 'mixamorigLeftLeg', 'mixamorigLeftFoot', 'mixamorigLeftToeBase', 'mixamorigRightUpLeg', 'mixamorigRightLeg', 'mixamorigRightFoot', 'mixamorigRightToeBase'];
    let mapped = boneName;
    for (const b of originalBones) {
      if (b.toLowerCase().endsWith(stripped)) {
        mapped = b;
        break;
      }
    }
    boneName = mapped;
    track.name = boneName + prop;

    if (prop === '.position') {
      if (boneName !== 'mixamorigHips') continue;
      const values = track.values;
      const startX = values[0];
      const startZ = values[2];
      for (let j = 0; j < values.length; j += 3) {
        values[j] = startX;
        values[j+2] = startZ;
      }
    }
    
    const nodeName = track.name.split('.')[0];
    const node = model.getObjectByName(nodeName);
    if (!node) mismatchCount++;
    newTracks.push(track);
  }
  clip.tracks = newTracks;
  
  const mixer = new THREE.AnimationMixer(model);
  const action = mixer.clipAction(clip);
  action.play();
  
  mixer.setTime(0);
  
  let lLeg = model.getObjectByName('mixamorigLeftUpLeg');
  let rLeg = model.getObjectByName('mixamorigRightUpLeg');
  let hips = model.getObjectByName('mixamorigHips');
  
  if (!lLeg || !rLeg || !hips) {
    log(`Clip: ${anim.key} - KHÔNG TÌM THẤY XƯƠNG`);
    return;
  }
  
  let lastL = lLeg.quaternion.clone();
  let lastR = rLeg.quaternion.clone();
  
  let movementAcc = 0;
  let t = 0;
  const dt = 0.016;
  
  let posStart = new THREE.Vector3();
  hips.getWorldPosition(posStart);
  
  while (t <= 0.2) {
    mixer.update(dt);
    t += dt;
  }
  
  movementAcc = lastL.angleTo(lLeg.quaternion) + lastR.angleTo(rLeg.quaternion);
  
  // Tiến thêm 5 giây để kiểm tra trượt ngang
  while (t <= 5.0) {
    mixer.update(dt);
    t += dt;
  }
  
  let posEnd = new THREE.Vector3();
  hips.getWorldPosition(posEnd);
  const drift = Math.sqrt(Math.pow(posEnd.x - posStart.x, 2) + Math.pow(posEnd.z - posStart.z, 2));

  log(`Clip: ${anim.key} | Mismatches: ${mismatchCount} | Leg Move (0.2s): ${movementAcc.toFixed(4)} rad | Drift (5s): ${drift.toFixed(4)}`);
});

fs.writeFileSync('d:/TrainingProgram/chaos-kitchen2/docs/screens/anim-audit/node_test_output.txt', outLines.join('\n'));
