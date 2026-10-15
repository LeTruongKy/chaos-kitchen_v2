import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import * as fs from 'fs';

// Node mock for FBXLoader
(global as any).window = global;
(global as any).document = { 
  createElement: () => ({ 
    setAttribute: () => {},
    addEventListener: () => {}
  }),
  createElementNS: () => ({ 
    style: {}, 
    getContext: () => ({}),
    setAttribute: () => {},
    addEventListener: () => {}
  }) 
};

const loader = new FBXLoader();

const mainBuf = fs.readFileSync('apps/client/public/models/minion/ImageToStl_chef_minion.fbx').buffer;
const mainFbx = loader.parse(mainBuf, '');

const boneSet = new Set<string>();
mainFbx.traverse(obj => {
  if (obj.name) boneSet.add(obj.name);
});
console.log('Main Model Nodes:', Array.from(boneSet).filter(n => n.includes('Hips') || n.includes('Spine')));

const walkBuf = fs.readFileSync('apps/client/public/models/minion/Walking.fbx').buffer;
const walkFbx = loader.parse(walkBuf, '');

if (walkFbx.animations && walkFbx.animations.length > 0) {
  const clip = walkFbx.animations[0];
  console.log('Walking Tracks count:', clip.tracks.length);
  console.log('Walking tracks sample:', clip.tracks.slice(0,3).map(t=>t.name));
  
  let matched = 0;
  clip.tracks.forEach(track => {
    const dotIdx = track.name.lastIndexOf('.');
    const fullPath = track.name.substring(0, dotIdx);
    const slashIdx = fullPath.lastIndexOf('/');
    const boneName = slashIdx >= 0 ? fullPath.substring(slashIdx + 1) : fullPath;
    
    if (boneSet.has(boneName)) {
      matched++;
    } else {
      const stripped = boneName.replace(/^mixamorig:/, '');
      let found = false;
      for (const modelBone of boneSet) {
        if (modelBone.replace(/^mixamorig:/, '') === stripped) {
          found = true;
          matched++;
          break;
        }
      }
      if (!found) {
        console.log('MISSING:', boneName);
      }
    }
  });
  console.log(`Matched ${matched} out of ${clip.tracks.length} tracks.`);
} else {
  console.log('WALKING.FBX HAS NO ANIMATIONS!');
}
