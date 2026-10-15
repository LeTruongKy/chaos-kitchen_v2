# ANIM V1 AUDIT (Kiểm kê Bước 0)

## a) Kiểm tra các file FBX nhân vật Quaternius
Lệnh:
`ls raw-assets/quaternius/FBX/ | findstr /i "Chef_Male Casual_Female Casual_Male Knight_Male Viking_Male Pirate_Female Zombie_Female Chef_Female"`

Output:
```
------        2021/10/30     14:43        2373372 Casual_Female.fbx                                                    
------        2021/10/30     14:44        2370156 Casual_Male.fbx                                                      
------        2021/10/30     14:44        2431628 Chef_Female.fbx                                                      
------        2021/10/30     16:04        2340092 Chef_Male.fbx                                                        
------        2021/10/30     15:01        2270172 Knight_Male.fbx                                                      
------        2021/10/30     15:07        2456748 Pirate_Female.fbx                                                    
------        2021/10/30     15:21        2365580 Viking_Male.fbx                                                      
------        2021/10/30     15:25        2450284 Zombie_Female.fbx                                                    
```
Kết luận: Đầy đủ 8/8 file yêu cầu.

## b) Kiểm tra file clip riêng
Lệnh:
`ls raw-assets/quaternius/FBX/ | findstr /i "Walk Run Idle Carry SitDown PickUp Victory Death Punch"`

Output:
(Trống - mã trả về 1)

Kết luận: Các clip animation đều nằm tích hợp trực tiếp trong các file FBX nhân vật (như `Chef_Male.fbx`), không tách thành file clip riêng lẻ trong `raw-assets/quaternius/FBX/`.

## c) Git grep các từ khóa liên quan đến Chef Animation trong apps/client/src
Lệnh:
`git grep -n "chef_model\|chefAnimManifest\|CHEF_ANIM\|findClip\|CHEF_ANIMATION_ALIASES\|wiping_sweat\|sitting_angry" apps/client/src`

Output:
```
apps/client/src/anim-test.ts:42:loader.load('/assets/chef/chef_model.fbx', async (fbx) => {
apps/client/src/game/assets/AssetManifest.ts:18:    file: '/assets/chef/chef_model.fbx', 
apps/client/src/game/renderer3d/ThreeRenderer.ts:27:export function getCustomerTargetAnimation(customer: { state: string; angry?: boolean }): 'sitting' | 'sitting_angry' | 'idle' {
apps/client/src/game/renderer3d/ThreeRenderer.ts:29:    return customer.angry ? 'sitting_angry' : 'sitting';
apps/client/src/game/renderer3d/chef/Chef.ts:61:      const requiredClips = ['sprint', 'throw', 'terrified', 'cheering', 'carry_run', 'walk', 'carry_idle', 'idle', 'wiping_sweat', 'sitting'];
apps/client/src/game/renderer3d/chef/Chef.ts:190:    // 5. đang acting (wiping_sweat)
apps/client/src/game/renderer3d/chef/Chef.ts:192:      targetState = 'wiping_sweat';
apps/client/src/game/renderer3d/chef/chefAnimManifest.ts:1:export const CHEF_ANIM_MANIFEST: Record<string, { file: string, loop: boolean, note: string }> = {
apps/client/src/game/renderer3d/chef/chefAnimManifest.ts:11:  wiping_sweat: { file: 'wiping_sweat.fbx', loop: true, note: 'Wiping Sweat' },
apps/client/src/game/renderer3d/chef/chefAnimManifest.ts:13:  sitting_angry: { file: 'sitting_angry.fbx', loop: true, note: 'Sitting Angry' }
apps/client/src/game/renderer3d/chef/chefClips.ts:1:export const CHEF_ANIMATION_ALIASES: Record<string, string[]> = {
apps/client/src/game/renderer3d/chef/chefClips.ts:12:export function findClip(clips: any[], state: string): any {
apps/client/src/game/renderer3d/chef/chefClips.ts:18:  const aliases = CHEF_ANIMATION_ALIASES[state] || [state];
apps/client/src/game/renderer3d/chef/clipPrep.ts:3:import { CHEF_ANIM_MANIFEST } from './chefAnimManifest';
apps/client/src/game/renderer3d/chef/clipPrep.ts:23:  const promises = Object.entries(CHEF_ANIM_MANIFEST).map(async ([key, info]) => {
```
Kết luận: Đã tìm thấy `chefAnimManifest.ts` và `Chef.ts`.

## d) Git grep kiểm tra WebGLRenderer
Lệnh:
`git grep -n "getSharedWebGLRenderer\|new THREE.WebGLRenderer" apps/client/src/game/renderer3d`

Output:
```
apps/client/src/game/renderer3d/MenuRenderer.ts:2:import { getSharedWebGLRenderer } from './SharedWebGL';
apps/client/src/game/renderer3d/MenuRenderer.ts:27:    this.renderer = getSharedWebGLRenderer();
apps/client/src/game/renderer3d/SharedWebGL.ts:14:export function getSharedWebGLRenderer(): THREE.WebGLRenderer {
apps/client/src/game/renderer3d/SharedWebGL.ts:18:      sharedRenderer = new THREE.WebGLRenderer({
apps/client/src/game/renderer3d/SharedWebGL.ts:34:      sharedRenderer = new THREE.WebGLRenderer({
apps/client/src/game/renderer3d/SharedWebGL.ts:52:        sharedRenderer = new THREE.WebGLRenderer({
apps/client/src/game/renderer3d/ThreeRenderer.ts:14:import { getSharedWebGLRenderer } from './SharedWebGL';
apps/client/src/game/renderer3d/ThreeRenderer.ts:68:      this.renderer = getSharedWebGLRenderer();
```
Kết luận: Chỉ có `SharedWebGL.ts` khởi tạo `new THREE.WebGLRenderer`. `MenuRenderer.ts` và `ThreeRenderer.ts` đều dùng `getSharedWebGLRenderer()`. Không có renderer mới nào ngoài `SharedWebGL.ts`.

## e) 40 dòng đầu của apps/client/src/game/renderer3d/chef/clipPrep.ts
```ts
import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { CHEF_ANIM_MANIFEST } from './chefAnimManifest';

/**
 * Nạp và chuẩn hóa toàn bộ clip animation cho Chef.
 * @param model - Model chính đã được nạp (để lấy danh sách xương)
 * @param basePath - Đường dẫn thư mục chứa assets/chef
 * @returns Promise<Record<string, THREE.AnimationClip>> - Map giữa tên khóa và Clip đã chuẩn hóa
 */
export async function loadAndPrepChefClips(model: THREE.Object3D, basePath: string): Promise<Record<string, THREE.AnimationClip>> {
  const loader = new FBXLoader();
  const clips: Record<string, THREE.AnimationClip> = {};

  // Lấy danh sách xương thực tế từ model
  const boneNames = new Set<string>();
  model.traverse((child) => {
    if ((child as THREE.Bone).isBone) {
      boneNames.add(child.name);
    }
  });

  const promises = Object.entries(CHEF_ANIM_MANIFEST).map(async ([key, info]) => {
    const fbx = await loader.loadAsync(`${basePath}/${info.file}`);
    if (!fbx.animations || fbx.animations.length === 0) {
      console.warn(`[clipPrep] KHÔNG có animation trong ${info.file}`);
      return;
    }

    // b) Lấy clip đầu tiên và đổi tên thành khóa
    const clipObj = fbx.animations[0];
    if (!clipObj) return;
    const clip = clipObj.clone();
    clip.name = key;

    const newTracks: THREE.KeyframeTrack[] = [];
    let mismatchCount = 0;

    for (let i = 0; i < clip.tracks.length; i++) {
      const rawTrack = clip.tracks[i];
      if (!rawTrack) continue;
      const track = rawTrack.clone();
      
      const dot = track.name.lastIndexOf('.');
      const fullPath = track.name.substring(0, dot);
```
Cơ chế xóa tiền tố "mixamorig":
Tại dòng 51:
`const stripped = boneName.replace(/^mixamorig:?/i, '').toLowerCase();`
Nó dùng regex `replace(/^mixamorig:?/i, '')` (không phân biệt hoa thường, kèm dấu `:` tùy chọn) và chuyển về chữ thường (`.toLowerCase()`), sau đó tìm trong danh sách `boneNames` của model xương nào `.endsWith(stripped)` để gán vào `mapped`.

## f) Hàm update và đoạn chọn clip trong apps/client/src/game/renderer3d/chef/Chef.ts
```ts
  public update(dtSec: number, playerFrame?: any, frame?: RenderFrame | null) {

    this.time += dtSec;
    if (this.throwTimer > 0) this.throwTimer -= dtSec;
    if (this.cheerTimer > 0) this.cheerTimer -= dtSec;

    if (!playerFrame) {
      if (this.mixer) this.mixer.update(dtSec);
      return;
    }

    const { vx, vy, fx, fy, acting, held, dashing } = playerFrame;
    const speed = Math.sqrt(vx * vx + vy * vy);

    if (speed > 0.05) {
      this.targetRotation = Math.atan2(vx, vy);
    } else if (Math.abs(fx) > 0.05 || Math.abs(fy) > 0.05) {
      this.targetRotation = Math.atan2(fx, fy);
    }

    let rotDiff = this.targetRotation - this.group.rotation.y;
    while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
    while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
    this.group.rotation.y += rotDiff * Math.min(1.0, dtSec * 15);

    // Xử lý animation theo thứ tự ưu tiên
    let targetState = 'idle';

    // 1. dash
    if (dashing) {
      targetState = 'sprint';
    } 
    // 2. throw
    else if (this.throwTimer > 0) {
      targetState = 'throw';
    } 
    // 3. gần station đang cháy <= 2 tile
    else if (frame && this.isNearFire(playerFrame.x, playerFrame.y, frame.stations)) {
      targetState = 'terrified';
    } 
    // 4. serve_ok or game ended
    else if (this.cheerTimer > 0 || (frame && frame.timeLeft !== undefined && frame.timeLeft <= 0)) {
      targetState = 'cheering';
    } 
    // 5. đang acting (wiping_sweat)
    else if (acting) {
      targetState = 'wiping_sweat';
    }
    // 6. di chuyển và cầm đồ
    else if (speed > 0.3 && held) {
      targetState = 'carry_run';
    }
    // 7. di chuyển tay không
    else if (speed > 0.3 && !held) {
      targetState = 'walk';
    }
    // 8. đứng yên và cầm đồ
    else if (speed <= 0.3 && held) {
      targetState = 'carry_idle';
    } 
    // 9. đứng yên
    else {
      targetState = 'idle';
    }

    if (this.state !== targetState) {
      this.state = targetState;
      this.playAnim(this.state);
    }

    // Cập nhật timeScale cho walk/carry_run
    if (this.activeAction && (this.state === 'walk' || this.state === 'carry_run')) {
      // speed thường khoảng 3-5. 
      const tScale = Math.max(0.5, Math.min(1.5, speed / 4.0));
      this.activeAction.timeScale = tScale;
    } else if (this.activeAction) {
      this.activeAction.timeScale = 1;
    }

    if (this.mixer) {
      this.mixer.update(dtSec);
    }

    // Cập nhật vị trí neo của carryAnchor
    if (this.spineBone) {
      const spinePos = new THREE.Vector3();
      this.spineBone.getWorldPosition(spinePos);
      if (this.baseSpineY === null && this.state === 'idle') {
         this.baseSpineY = spinePos.y;
      }
      const itemKey = this.heldItemData?.id || this.heldItemData?.tool || this.heldItemData?.type || '';
      const config = getCarryConfig(itemKey);
      const dy = this.baseSpineY !== null ? (spinePos.y - this.baseSpineY) * 0.6 : 0;
      
      this.carryAnchor.position.y = config.height * TILE_PX + dy;
    }

    if (!held || this.throwTimer > 0) {
      this.carryAnchor.visible = false;
    } else {
      this.carryAnchor.visible = true;
    }
  }
```
