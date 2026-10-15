# BÁO CÁO KIỂM KÊ LAYOUT & HIỂN THỊ LOBBY (BƯỚC 0)

## a) git grep -n "lobby" apps/client/src/ui apps/client/src/main.ts apps/client/src/*.css

```
apps/client/src/main.ts:7:import { mountLobby } from './ui/lobby';
apps/client/src/main.ts:70:    if (prev.screen !== 'game' && next.lobby?.levelId) {
apps/client/src/main.ts:71:      const levelDef = getLevel(next.lobby.levelId);
apps/client/src/main.ts:79:    } else if (prev.screen === 'game' && next.lobby?.levelId !== prev.lobby?.levelId && next.lobby?.levelId) {
apps/client/src/main.ts:80:      const levelDef = getLevel(next.lobby.levelId);
apps/client/src/main.ts:98:  if (next.screen === 'menu' || next.screen === 'lobby') {
apps/client/src/main.ts:112:        if (next.lobby && next.lobby.players) {
apps/client/src/main.ts:113:          activeMenuRenderer.updatePlayers(next.lobby.players);
apps/client/src/main.ts:183:  if (state.screen === 'menu' || state.screen === 'lobby') {
apps/client/src/main.ts:194:  if (state.screen === 'lobby') {
apps/client/src/ui/base.css:71:.lobby-panel,
apps/client/src/ui/base.css:72:.lobby-actions {
apps/client/src/ui/base.css:88:.lobby-actions {
apps/client/src/ui/base.css:162:  .lobby-actions {
apps/client/src/ui/base.css:167:  .lobby-actions button {
apps/client/src/ui/campaign.css:2:.lobby-panel {
apps/client/src/ui/campaign.css:18:.lobby-layout {
apps/client/src/ui/campaign.css:28:.lobby-left {
apps/client/src/ui/campaign.css:41:.lobby-left h1 {
apps/client/src/ui/campaign.css:61:.lobby-left .players {
apps/client/src/ui/campaign.css:73:.lobby-actions {
apps/client/src/ui/campaign.css:82:.lobby-actions button {
apps/client/src/ui/campaign.css:88:.lobby-actions button:first-of-type {
apps/client/src/ui/campaign.css:93:.lobby-actions button:first-of-type:disabled {
apps/client/src/ui/campaign.css:98:.lobby-left .ping {
apps/client/src/ui/campaign.css:105:.lobby-right {
apps/client/src/ui/campaign.css:119:.lobby-right::-webkit-scrollbar {
apps/client/src/ui/campaign.css:122:.lobby-right::-webkit-scrollbar-track {
apps/client/src/ui/campaign.css:125:.lobby-right::-webkit-scrollbar-thumb {
apps/client/src/ui/campaign.css:129:.lobby-right::-webkit-scrollbar-thumb:hover {
apps/client/src/ui/campaign.css:134:.lobby-right::before {
apps/client/src/ui/campaign.css:147:.lobby-right-header {
apps/client/src/ui/campaign.css:157:.lobby-right-header h2 {
apps/client/src/ui/hud.ts:425:      const levelId = state.lobby?.levelId;
apps/client/src/ui/lobby.ts:9:import { createPlayerAvatar, createEmptySlotAvatar } from './lobbyAvatar';
apps/client/src/ui/lobby.ts:10:import './lobby.css';
apps/client/src/ui/lobby.ts:15:  screen.className = 'screen lobby-view';
apps/client/src/ui/lobby.ts:17:  container.className = 'lobby-container';
apps/client/src/ui/lobby.ts:24:  // If local player already has cosmetic assigned in lobby, sync with it
apps/client/src/ui/lobby.ts:25:  const localPlayerInLobby = state.lobby?.players.find((p) => p.id === currentPlayerId);
apps/client/src/ui/lobby.ts:35:  leftCol.className = 'lobby-left-col';
apps/client/src/ui/lobby.ts:46:  previewBox.id = 'lobby-preview-box';
apps/client/src/ui/lobby.ts:139:  centerCol.className = 'lobby-center-col';
apps/client/src/ui/lobby.ts:147:  roomTitle.textContent = `Phòng ${state.lobby?.code || '----'}`;
apps/client/src/ui/lobby.ts:150:  roomCodeBadge.textContent = state.lobby?.code || '';
apps/client/src/ui/lobby.ts:156:  copyCodeBtn.onclick = () => copyText(state.lobby?.code || '');
apps/client/src/ui/lobby.ts:161:  copyLinkBtn.onclick = () => copyText(`${window.location.origin}${window.location.pathname}?room=${state.lobby?.code || ''}`);
apps/client/src/ui/lobby.ts:190:  actionsRow.className = 'lobby-center-actions lobby-actions';
apps/client/src/ui/lobby.ts:224:  rightCol.className = 'lobby-right-col';
apps/client/src/ui/lobby.ts:257:  startBtn.id = 'lobby-start-btn';
apps/client/src/ui/lobby.ts:336:    const lobby = currentState.lobby;
apps/client/src/ui/lobby.ts:337:    if (!lobby) return;
apps/client/src/ui/lobby.ts:339:    const isHost = lobby.hostId === currentPlayerId;
apps/client/src/ui/lobby.ts:344:    roomTitle.textContent = `Phòng ${lobby.code}`;
apps/client/src/ui/lobby.ts:345:    roomCodeBadge.textContent = lobby.code;
apps/client/src/ui/lobby.ts:352:    const playersCount = lobby.players.length;
apps/client/src/ui/lobby.ts:354:    lobby.players.forEach((player) => {
apps/client/src/ui/lobby.ts:366:      if (player.id === lobby.hostId) {
apps/client/src/ui/lobby.ts:421:    const selfPlayer = lobby.players.find((p) => p.id === currentPlayerId);
apps/client/src/ui/lobby.ts:430:      soloCheck.checked = (lobby as any).solo || false;
apps/client/src/ui/lobby.ts:450:    const currentLevelDef = PLAYABLE_LEVELS.find((l) => l.id === lobby.levelId) || PLAYABLE_LEVELS[0]!;
apps/client/src/ui/lobby.ts:473:        card.className = `level-card campaign-node level-card-v2${lvl.id === lobby.levelId ? ' selected' : ''}`;
apps/client/src/ui/lobby.ts:539:    const othersNotReady = lobby.players.some((p) => p.id !== currentPlayerId && !p.ready);
apps/client/src/ui/results.ts:28:  const isHost = state.lobby?.hostId === netClient.sessionId;
apps/client/src/ui/results.ts:83:    const mvpPlayer = state.lobby?.players.find(p => p.id === mvpId);
```

---

## b) File:dòng và tên class CSS của các thành phần giao diện

1. **Cột trái (tùy biến)**:
   - `apps/client/src/ui/lobby.ts:34-35`: `leftCol.className = 'lobby-left-col';`
   - `apps/client/src/ui/lobby.css:25-36`: `.lobby-left-col`

2. **Khung slot**:
   - `apps/client/src/ui/lobby.ts:170-186`: `slotsWrapper.className = 'slots-wrapper';`, `slotsContainer.className = 'slots-container';`, `playersList.className = 'players';`, `placeholdersList.className = 'placeholders';`
   - `apps/client/src/ui/lobby.ts:355`: `slotCard.className = 'slot-card player-slot ...';`
   - `apps/client/src/ui/lobby.ts:402`: `emptyCard.className = 'slot-card empty-slot slot-empty';`
   - `apps/client/src/ui/lobby.css:179-312`: `.slots-wrapper`, `.slots-container`, `.slot-card`, `.player-slot`, `.slot-card.empty-slot`

3. **Cột phải (chọn màn)**:
   - `apps/client/src/ui/lobby.ts:223-224`: `rightCol.className = 'lobby-right-col';`
   - `apps/client/src/ui/lobby.css:377-393`: `.lobby-right-col`

4. **Thẻ map**:
   - `apps/client/src/ui/lobby.ts:472`: `card.className = 'level-card campaign-node level-card-v2 ...';`
   - `apps/client/src/ui/lobby.css:435-515`: `.level-card-v2`, `.world-maps-list`, `.world-group`

5. **Nút START**:
   - `apps/client/src/ui/lobby.ts:256-258`: `startBtn.id = 'lobby-start-btn';`, `startBtn.className = 'btn-start-game';`
   - `apps/client/src/ui/lobby.css:593-619`: `.btn-start-game`, `#lobby-start-btn`

6. **Checkbox Chơi 1 mình**:
   - `apps/client/src/ui/lobby.ts:205-210`: `soloLabel.className = 'solo-mode-label';`, input checkbox
   - `apps/client/src/ui/lobby.css:348-361`: `.solo-mode-label`

7. **Hàng nút Sẵn sàng / Rời phòng**:
   - `apps/client/src/ui/lobby.ts:189-204`: `actionsRow.className = 'lobby-center-actions lobby-actions';`, `actionsLeft.className = 'actions-buttons-group';`, `readyBtn.className = 'btn-ready';`, `leaveBtn.className = 'btn-leave';`
   - `apps/client/src/ui/lobby.css:314-346`: `.lobby-center-actions`, `.actions-buttons-group`, `.btn-ready`, `.btn-leave`

---

## c) Khung xem trước: File:dòng nơi tạo canvas/scene và nơi render; Nguyên nhân nền xám

- **Nơi tạo canvas/scene**:
  - `apps/client/src/game/renderer3d/LobbyPreviewRenderer.ts:26-27`: `this.scene = new THREE.Scene(); this.scene.background = null;`
  - `apps/client/src/game/renderer3d/LobbyPreviewRenderer.ts:53-60`: `this.renderer = getSharedWebGLRenderer(); ... this.container.appendChild(this.renderer.domElement);`
- **Nơi render**:
  - `apps/client/src/game/renderer3d/LobbyPreviewRenderer.ts:258-260`: `this.renderer.render(this.scene, this.camera);` trong hàm `startLoop()`.

### Nguyên nhân chính xác dẫn đến nền xám không có nhân vật (Ghi nhận từ code thực tế):

1. **Xung đột render loop với `MenuRenderer` trên cùng `getSharedWebGLRenderer()`**:
   - Trong `apps/client/src/main.ts:98`, lệnh `syncMenuScene(next)` kiểm tra:
     `if (next.screen === 'menu' || next.screen === 'lobby')`
   - Khi vào lobby, `MenuRenderer` vẫn tiếp tục chạy vòng lặp render `animate()` vào `getSharedWebGLRenderer()`.
   - `MenuRenderer` có `this.scene.background = new THREE.Color(0x2b1e16)` (màu nâu xám diner) và camera nhìn vào vị trí bếp diner `(35, 75, 200)` $\rightarrow$ đè toàn bộ khung canvas của `LobbyPreviewRenderer` thành màu nền xám diner mỗi frame!
   - Thêm vào đó, `MenuRenderer.onResize()` liên tục đặt lại kích thước canvas thành toàn màn hình (`window.innerWidth x window.innerHeight`), phá vỡ kích thước vùng xem trước.

2. **Góc nhìn Camera bị lệch hoàn toàn so với kích thước thật của nhân vật**:
   - Trong `apps/client/src/game/renderer3d/LobbyPreviewRenderer.ts:32-34`:
     `this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);`
     `this.camera.position.set(0, 16, 44);`
     `this.camera.lookAt(0, 13, 0);`
   - Tuy nhiên, trong `AssetManifest.ts:17-24` và `ModelNormalizer.ts:69-81`, nhân vật đầu bếp có chiều cao thực tế sau khi normalize là:
     $H = 2.2 \times \text{TILE\_PX} = 2.2 \times 32 = 70.4$ units.
   - Đầu bếp đặt tại $y = 1.2$, đỉnh đầu ở $y \approx 72$.
   - Camera ở $Z = 44, Y = 16$ nhìn vào $(0, 13, 0)$ chỉ có chiều cao nhìn thấy $V \approx 2 \times 44 \times \tan(20^\circ) \approx 32$ units (vùng quan sát từ $Y = -3$ đến $Y = 29$). Toàn bộ thân trên và đầu nhân vật nằm ngoài tầm nhìn (bị cắt cụt), camera chỉ soi sát vào phần chân/bệ xoay!

3. **Thời điểm khởi tạo kích thước container**:
   - Khi `new LobbyPreviewRenderer(previewBox, ...)` được gọi trong `mountLobby()`, phần tử DOM vừa mới được tạo ra và chưa qua reflow layout của CSS, nên `container.clientWidth` và `container.clientHeight` có thể bằng `0` nếu chưa có kích thước xác định, và thiếu `ResizeObserver` để cập nhật lại size khi CSS grid hoàn tất render.

4. **Trạng thái mô hình đầu bếp khi chưa tải xong asset**:
   - `ChefModel` khi khởi tạo (`new ChefModel`) chỉ tạo `new THREE.Group()` rỗng. Khi asset FBX đang tải bất đồng bộ qua mạng, `ChefModel` không có mesh nào hiển thị, dẫn đến khung cảnh trống rỗng nếu không có procedural fallback tức thì.
