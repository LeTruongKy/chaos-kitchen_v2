import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import fs from 'fs';
import path from 'path';

global.window = global;
global.document = { createElementNS: () => ({ addEventListener: () => {} }), createElement: () => ({ addEventListener: () => {} }) };
global.Image = function() { this.addEventListener = () => {}; };

const auditLines = [];
const log = (msg) => { console.log(msg); auditLines.push(msg); };

let filesJson = fs.readFileSync('d:/TrainingProgram/chaos-kitchen2/docs/screens/anim-audit/files.json', 'utf16le');
if (filesJson.charCodeAt(0) === 0xFEFF) {
  filesJson = filesJson.substring(1);
}
const files = JSON.parse(filesJson);

log('=== A1: DANH SÁCH FILE ===');
files.forEach(f => {
  log(`- File: ${f.FullName}\n  Size: ${f.SizeMB} MB`);
});

log('\n=== A2: KIỂM TRA FILE NHÂN VẬT CHÍNH ===');
const minionDir = 'd:/TrainingProgram/chaos-kitchen2/apps/client/public/models/minion';
const mainModelPath = path.join(minionDir, 'ImageToStl_chef_minion.fbx');

log(`Model chính: ${mainModelPath}`);
const buffer = fs.readFileSync(mainModelPath);
const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

const loader = new FBXLoader();
let charModel;
try {
  charModel = loader.parse(arrayBuffer, minionDir);
} catch (e) {
  log('Lỗi parse model chính: ' + e.message);
}

if (charModel) {
  const clips = charModel.animations || [];
  log(`\n1. AnimationClip trong file chính:`);
  if (clips.length === 0) log('KHÔNG CÓ CLIP');
  clips.forEach(c => log(` - ${c.name} (Duration: ${c.duration.toFixed(2)}s, Tracks: ${c.tracks.length})`));

  let hasSkinnedMesh = false;
  let allBones = new Set();
  
  charModel.traverse(obj => {
    if (obj.isSkinnedMesh) {
      hasSkinnedMesh = true;
      if (obj.skeleton) {
        obj.skeleton.bones.forEach(b => allBones.add(b.name));
      }
    }
  });

  log(`\n2. Cấu trúc xương:`);
  log(` - Có SkinnedMesh: ${hasSkinnedMesh}`);
  log(` - Tổng số xương (từ tất cả SkinnedMesh): ${allBones.size}`);
  log(` - Tên các xương: ${Array.from(allBones).join(', ')}`);
}

log('\n=== A3: KIỂM TRA CÁC FILE ANIMATION RỜI ===');
const animFiles = files.filter(f => f.FullName.includes('public\\models\\minion\\') && f.FullName !== mainModelPath && !f.FullName.includes('textures'));
animFiles.forEach(f => {
  log(`\nFile: ${path.basename(f.FullName)}`);
  try {
    const buf = fs.readFileSync(f.FullName);
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    const m = loader.parse(ab, minionDir);
    const clips = m.animations || [];
    if (clips.length === 0) log('KHÔNG CÓ CLIP');
    clips.forEach(c => log(` - Clip: ${c.name} (Duration: ${c.duration.toFixed(2)}s, Tracks: ${c.tracks.length})`));
  } catch(e) {
    log(` Lỗi parse: ${e.message}`);
  }
});

fs.writeFileSync('d:/TrainingProgram/chaos-kitchen2/docs/screens/anim-audit/audit_output.txt', auditLines.join('\n'), 'utf8');
