import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import fs from 'fs';
import path from 'path';

// Mock DOM for FBXLoader
global.window = global;
global.document = {
  createElementNS: () => ({}),
  createElement: () => ({})
};

const minionDir = 'd:/TrainingProgram/chaos-kitchen2/apps/client/public/models/minion';

function loadFBXSync(file) {
  const filePath = path.join(minionDir, file);
  const buffer = fs.readFileSync(filePath);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const loader = new FBXLoader();
  return loader.parse(arrayBuffer, minionDir);
}

try {
  console.log('Loading character model...');
  const charModel = loadFBXSync('ImageToStl_chef_minion.fbx');
  const boneNames = new Set();
  charModel.traverse(obj => {
    if (obj.isBone || obj.type === 'Bone') boneNames.add(obj.name);
  });
  console.log('Char bones count:', boneNames.size);
  console.log('Char sample bones:', Array.from(boneNames).slice(0, 10));

  const animFiles = [
    { name: 'idle', file: 'Breathing Idle.fbx' },
    { name: 'run', file: 'Walking.fbx' },
    { name: 'carry_run', file: 'Jogging With Box.fbx' },
    { name: 'carry_idle', file: 'Carrying.fbx' }
  ];

  for (const a of animFiles) {
    console.log(`\n--- Inspecting ${a.name} (${a.file}) ---`);
    const fbx = loadFBXSync(a.file);
    console.log(`Animations count: ${fbx.animations.length}`);
    if (fbx.animations.length > 0) {
      const clip = fbx.animations[0];
      console.log(`Clip duration: ${clip.duration}, tracks: ${clip.tracks.length}`);
      const trackBones = clip.tracks.map(t => t.name.split('.')[0]);
      const uniqueTrackBones = Array.from(new Set(trackBones));
      console.log(`Unique track bones count: ${uniqueTrackBones.length}`);
      console.log(`Sample track bones:`, uniqueTrackBones.slice(0, 5));

      // Check matching
      let matched = 0;
      let unmatched = [];
      for (const tb of uniqueTrackBones) {
        // Test matching logic
        const slashIdx = tb.lastIndexOf('/');
        const simpleName = slashIdx >= 0 ? tb.substring(slashIdx + 1) : tb;
        
        const stripped = simpleName.replace(/^mixamorig:?/i, '').toLowerCase();
        
        let found = false;
        if (boneNames.has(simpleName)) {
            found = true;
        } else {
            for (const modelBone of boneNames) {
                const modelStripped = modelBone.replace(/^mixamorig:?/i, '').toLowerCase();
                if (modelStripped === stripped) {
                    found = true;
                    break;
                }
            }
        }

        if (found) {
          matched++;
        } else {
          unmatched.push(tb);
        }
      }
      console.log(`Matched bones: ${matched} / ${uniqueTrackBones.length}`);
      if (unmatched.length > 0) {
        console.log(`Unmatched sample:`, unmatched.slice(0, 5));
      }
    }
  }
} catch (e) {
  console.error('Error:', e);
}
