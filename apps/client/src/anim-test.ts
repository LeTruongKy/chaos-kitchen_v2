import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { loadAndPrepChefClips } from './game/renderer3d/chef/clipPrep';
import { resolvePublicUrl } from './config/cdn';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 4);

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); // keep buffer for screenshots
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1, 0);
controls.update();

scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.6));
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 10, 5);
scene.add(dirLight);

const grid = new THREE.GridHelper(10, 10);
scene.add(grid);

let mixer: THREE.AnimationMixer;
let actions: Record<string, THREE.AnimationAction> = {};
let activeAction: THREE.AnimationAction | null = null;
let activeClipName = '';

const hud = document.getElementById('hud')!;
const controlsDiv = document.getElementById('controls')!;

const loader = new FBXLoader();

let model: THREE.Group;
let clonedModel: THREE.Object3D;
let clips: Record<string, THREE.AnimationClip>;
const TILE_PX = 64; // as per core constants

loader.load(resolvePublicUrl('/assets/chef/chef_model.fbx'), async (fbx) => {
  model = fbx;
  
  // Create SkeletonUtils.clone
  clonedModel = SkeletonUtils.clone(model);
  scene.add(clonedModel);
  
  // Model Normalizer logic: original model is ~220 units tall. Target is 2.2 tiles.
  // Wait, "kiểm tra công thức chuẩn hóa có nhân nhầm TILE_PX không, nếu 1 tile = 1 đơn vị cảnh thì bỏ nhân đó"
  // Yes! In standard Three.js, 1 unit = 1 tile is much easier. Let's make it 2.2 units tall (so 2.2 tiles).
  // The original model height is roughly 220. So scale should be 2.2 / 220 = 0.01
  const box = new THREE.Box3().setFromObject(clonedModel);
  const size = new THREE.Vector3();
  box.getSize(size);
  const scale = 2.2 / size.y;
  clonedModel.scale.set(scale, scale, scale);

  // Material check: c) Ghi loại material. Đổi MeshToonMaterial nếu cần.
  let materialsLog = '';
  clonedModel.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      if (mat) {
        materialsLog += `Mesh: ${mesh.name}, MatType: ${mat.type}\n`;
        if (mat.type === 'ShaderMaterial' || mat.type === 'MeshPhongMaterial') {
          const toon = new THREE.MeshToonMaterial({ 
            map: (mat as any).map, 
            color: (mat as any).color || 0xffffff
          });
          mesh.material = toon;
          materialsLog += `  -> Changed to MeshToonMaterial\n`;
        }
      }
    }
  });

  clips = await loadAndPrepChefClips(model, resolvePublicUrl('/assets/chef'));

  mixer = new THREE.AnimationMixer(clonedModel);
  
  Object.keys(clips).forEach(key => {
    const clip = clips[key];
    if (!clip) return;
    const action = mixer.clipAction(clip);
    if (key === 'throw' || key === 'cheering') {
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
    }
    actions[key] = action;

    const btn = document.createElement('button');
    btn.innerText = key;
    btn.onclick = () => playAnim(key);
    controlsDiv.appendChild(btn);
  });

  clonedModel.rotation.y = Math.PI; // Face +Z

  (window as any).THREE = THREE;
  (window as any).animTestContext = {
    mixer,
    actions,
    clonedModel,
    playAnim,
    materialsLog,
    scale,
    height: size.y * scale
  };

  hud.innerHTML = `Ready. Target scale: ${scale.toFixed(4)}. Height: ${(size.y * scale).toFixed(2)} units.`;
});

function playAnim(key: string) {
  const action = actions[key];
  if (!action) return;
  if (activeAction) {
    activeAction.fadeOut(0.15);
    action.reset().fadeIn(0.15).play();
  } else {
    action.play();
  }
  activeAction = action;
  activeClipName = key;
}

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  if (mixer) {
    mixer.update(dt);
    if (activeAction) {
      hud.innerHTML = `Clip: ${activeClipName} | Time: ${mixer.time.toFixed(2)}`;
    }
  }
  renderer.render(scene, camera);
}
animate();
