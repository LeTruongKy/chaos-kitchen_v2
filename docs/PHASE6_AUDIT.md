# PHASE 6 AUDIT — KIỂM TRA NỀN ÂM THANH

## 1. Output Nguyên Văn git grep

### a) git grep -n "eventName\|case '\|playSfx\|function play" apps/client/src/game/audio/Sfx.ts
```text
apps/client/src/game/audio/Sfx.ts:73:  public playEvent(eventName: string, distanceFactor: number = 1) {
apps/client/src/game/audio/Sfx.ts:89:    switch (eventName) {
apps/client/src/game/audio/Sfx.ts:90:      case 'chop_done':
apps/client/src/game/audio/Sfx.ts:99:      case 'cook_done':
apps/client/src/game/audio/Sfx.ts:107:      case 'burnt':
apps/client/src/game/audio/Sfx.ts:116:      case 'serve_ok': {
apps/client/src/game/audio/Sfx.ts:135:      case 'serve_fail':
apps/client/src/game/audio/Sfx.ts:144:      case 'order_new':
apps/client/src/game/audio/Sfx.ts:152:      case 'pickup':
apps/client/src/game/audio/Sfx.ts:153:      case 'drop':
apps/client/src/game/audio/Sfx.ts:154:      case 'trash':
apps/client/src/game/audio/Sfx.ts:156:        osc.frequency.setValueAtTime(eventName === 'pickup' ? 400 : 300, now);
apps/client/src/game/audio/Sfx.ts:163:      case 'wash_done':
apps/client/src/game/audio/Sfx.ts:172:      case 'countdown_tick':
apps/client/src/game/audio/Sfx.ts:180:      case 'countdown_go':
apps/client/src/game/audio/Sfx.ts:188:      case 'timeup':
```

### b) git grep -n "customer_leave\|ignite\|extinguish\|throw\|streak_up\|streak_lost\|oven_done\|pizza_burnt\|pot_done\|soup_burnt" apps/client/src
```text
apps/client/src/__tests__/netClient.test.ts:108:      clientA.sendInput({ seq: seq++, act: false, mx: 0, my: -1, interact: true, dash: false, throw: false } as any);
apps/client/src/__tests__/netClient.test.ts:124:    clientA.sendInput({ seq: seq++, act: false, mx: 0, my: 0, interact: false, dash: false, throw: false } as any);
apps/client/src/__tests__/predictor.test.ts:26:    const input: PlayerInput = { seq: 1, act: false, interact: false, mx: 1, my: 0, dash: false, throw: false };
apps/client/src/__tests__/predictor.test.ts:46:    const input: PlayerInput = { seq: 1, act: false, interact: false, mx: 1, my: 0, dash: false, throw: false };
apps/client/src/__tests__/predictor.test.ts:80:      const input: PlayerInput = { seq, act: false, interact: false, mx: 1, my: 0, dash: isDash, throw: false };
apps/client/src/anim-test.ts:87:    if (key === 'throw' || key === 'cheering') {
apps/client/src/game/InputController.ts:119:    const throwAction = this.pendingThrow || this.touchThrowEdge;
apps/client/src/game/InputController.ts:128:      throw: throwAction
apps/client/src/game/assets/AssetManifest.ts:65:  extinguisher: { file: 'gltf/mustard.gltf', kind: 'item', targetSize: { height: 0.6 }, pivot: 'bottom', sizeInTiles: true },
apps/client/src/game/render/ItemRenderer.ts:121:      else if (item.tool === 'extinguisher') emoji = '🧯';
apps/client/src/game/renderer3d/SharedWebGL.ts:64:    throw new Error('WebGLNotSupported');
apps/client/src/game/renderer3d/ThreeRenderer.ts:70:      throw e;
apps/client/src/game/renderer3d/ThreeRenderer.ts:78:      throw new Error('WebGLNotSupported');
apps/client/src/game/renderer3d/ThreeRenderer.ts:385:        if (p.acting && p.held && p.held.type === 'tool' && p.held.tool === 'extinguisher') {
apps/client/src/game/renderer3d/ThreeRenderer.ts:559:    if (ev.type === 'ignite' || ev.type === 'serve_fail' || ev.type === 'burnt' || ev.type === 'soup_burnt') {
apps/client/src/game/renderer3d/chef/Chef.ts:27:  private throwTimer = 0;
apps/client/src/game/renderer3d/chef/Chef.ts:61:      const requiredClips = ['sprint', 'throw', 'terrified', 'cheering', 'carry_run', 'walk', 'carry_idle', 'idle', 'wiping_sweat', 'sitting'];
apps/client/src/game/renderer3d/chef/Chef.ts:67:          if (req === 'throw' || req === 'cheering') {
apps/client/src/game/renderer3d/chef/Chef.ts:138:    if (ev.type === 'throw') {
apps/client/src/game/renderer3d/chef/Chef.ts:139:      this.throwTimer = 0.5;
apps/client/src/game/renderer3d/chef/Chef.ts:149:    if (this.throwTimer > 0) this.throwTimer -= dtSec;
apps/client/src/game/renderer3d/chef/Chef.ts:178:    // 2. throw
apps/client/src/game/renderer3d/chef/Chef.ts:179:    else if (this.throwTimer > 0) {
apps/client/src/game/renderer3d/chef/Chef.ts:180:      targetState = 'throw';
apps/client/src/game/renderer3d/chef/Chef.ts:243:    if (!held || this.throwTimer > 0) {
apps/client/src/game/renderer3d/chef/carryConfig.ts:29:  extinguisher: { forward: 0.4, height: 0.4, side: 0.3, scale: 1.0, rotationY: 0 },
apps/client/src/game/renderer3d/chef/carryConfig.ts:40:  if (k.includes('extinguisher')) return CARRY_CONFIGS.extinguisher ?? DEFAULT_CONFIG;
apps/client/src/game/renderer3d/chef/chefAnimManifest.ts:8:  throw: { file: 'throw.fbx', loop: false, note: 'Throw' },
apps/client/src/game/renderer3d/chef/chefClips.ts:7:  throw: ['throw', 'toss'],
apps/client/src/game/renderer3d/items.ts:104:    } else if (item.tool === 'extinguisher') {
apps/client/src/game/renderer3d/items.ts:221:    const assetId = item.tool === 'extinguisher' ? 'extinguisher' : item.tool;
apps/client/src/game/renderer3d/stations.ts:229:    case 'extinguisher':
apps/client/src/game/renderer3d/vfx/Particles.ts:85:      } else if (type === 'foam') { // For extinguisher
apps/client/src/main.ts:31:if (!root || !gameRoot) throw new Error('Missing application roots.');
apps/client/src/state/settings.ts:24:  throw: 'KeyJ',
apps/client/src/ui/hud.ts:375:    } else if (event.type === 'burnt' || event.type === 'soup_burnt') {
apps/client/src/ui/hud.ts:379:    } else if (event.type === 'customer_leave') {
apps/client/src/ui/itemsView.ts:48:    { type: 'tool', tool: 'extinguisher' },
apps/client/src/ui/stationsView.ts:67:  const stationTypes = ['counter', 'cutting', 'stove', 'sink', 'trash', 'serve', 'dish_return', 'plate_dispenser', 'crate', 'extinguisher', 'oven'];
apps/client/src/ui/thumbsView.ts:116:    if (!itemDef) throw new Error(`Unknown recipeId: ${recipeId}`);
```

## 2. Bảng Phân Loại Sự Kiện Âm Thanh

| Sự kiện (Event) | Trạng thái hiện tại | Hàm âm trong Sfx.ts | Có unit test chưa? |
|---|---|---|---|
| `chop_done` | Đã có âm | `playEvent('chop_done')` / `playChopLoop()` | Chưa test trực tiếp âm |
| `cook_done` | Đã có âm | `playEvent('cook_done')` | Chưa test trực tiếp âm |
| `burnt` | Đã có âm | `playEvent('burnt')` | Chưa test trực tiếp âm |
| `serve_ok` | Đã có âm | `playEvent('serve_ok')` | Chưa test trực tiếp âm |
| `serve_fail` | Đã có âm | `playEvent('serve_fail')` | Chưa test trực tiếp âm |
| `order_new` | Đã có âm | `playEvent('order_new')` | Chưa test trực tiếp âm |
| `pickup` | Đã có âm | `playEvent('pickup')` | Chưa test trực tiếp âm |
| `drop` | Đã có âm | `playEvent('drop')` | Chưa test trực tiếp âm |
| `trash` | Đã có âm | `playEvent('trash')` | Chưa test trực tiếp âm |
| `wash_done` | Đã có âm | `playEvent('wash_done')` | Chưa test trực tiếp âm |
| `countdown_tick` | Đã có âm | `playEvent('countdown_tick')` | Chưa test trực tiếp âm |
| `countdown_go` | Đã có âm | `playEvent('countdown_go')` | Chưa test trực tiếp âm |
| `timeup` | Đã có âm | `playEvent('timeup')` | Chưa test trực tiếp âm |
| `ignite` | **CÂM** | Chưa có | Chưa |
| `extinguish` | **CÂM** | Chưa có | Chưa |
| `throw` | **CÂM** | Chưa có | Chưa |
| `customer_leave` | **CÂM** | Chưa có | Chưa |
| `streak_up` | **CÂM** | Chưa có | Chưa |
| `streak_lost` | **CÂM** | Chưa có | Chưa |
| `oven_done` | **CÂM** | Chưa có | Chưa |
| `pizza_burnt` | **CÂM** | Chưa có | Chưa |
| `pot_done` | **CÂM** | Chưa có | Chưa |
| `soup_burnt` | **CÂM** | Chưa có | Chưa |
