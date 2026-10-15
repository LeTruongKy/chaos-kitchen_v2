import * as fs from 'fs';
import * as path from 'path';

// Let's inspect the GLTF files to see their bounding boxes from accessor min/max
function inspectGltf(filePath: string) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const gltf = JSON.parse(raw);
    const posAccessor = gltf.accessors?.find((a: any) => a.type === 'VEC3' && a.min && a.max);
    // Find all meshes and their position accessors
    let min = [Infinity, Infinity, Infinity];
    let max = [-Infinity, -Infinity, -Infinity];
    for (const mesh of gltf.meshes || []) {
      for (const prim of mesh.primitives || []) {
        if (prim.attributes?.POSITION !== undefined) {
          const acc = gltf.accessors[prim.attributes.POSITION];
          if (acc && acc.min && acc.max) {
            for (let i = 0; i < 3; i++) {
              min[i] = Math.min(min[i], acc.min[i]);
              max[i] = Math.max(max[i], acc.max[i]);
            }
          }
        }
      }
    }
    const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
    return { file: path.basename(filePath), min, max, size };
  } catch (e: any) {
    return { file: path.basename(filePath), error: e.message };
  }
}

const gltfDir = path.join(__dirname, '../apps/client/public/models/gltf');
const testFiles = [
  'kitchencounter_straight_A.gltf',
  'table_round_A.gltf',
  'cuttingboard.gltf',
  'plate.gltf',
  'plate_dirty.gltf',
  'dishrack.gltf',
  'dishrack_plates.gltf',
  'food_ingredient_tomato.gltf',
  'food_ingredient_lettuce.gltf',
  'food_ingredient_steak.gltf',
  'food_ingredient_cheese.gltf',
  'food_ingredient_bun.gltf',
  'food_burger.gltf',
  'bowl_small.gltf',
  'oven.gltf',
  'stove_single.gltf',
  'kitchencounter_sink.gltf'
];

for (const f of testFiles) {
  const p = path.join(gltfDir, f);
  if (fs.existsSync(p)) {
    console.log(JSON.stringify(inspectGltf(p)));
  } else {
    console.log(`Missing: ${f}`);
  }
}
