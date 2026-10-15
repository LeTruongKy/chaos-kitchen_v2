# BÁO CÁO KIỂM KÊ LOBBY (LOBBY AUDIT)

## a) `git grep -n "lobby" apps/client/src/ui apps/client/src/main.ts`
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
apps/client/src/ui/lobby.ts:12:  panel.className = 'panel lobby-panel';
apps/client/src/ui/lobby.ts:17:    const lobby = currentState.lobby;
apps/client/src/ui/lobby.ts:18:    if (!lobby) return;
apps/client/src/ui/lobby.ts:23:    layout.className = 'lobby-layout';
apps/client/src/ui/lobby.ts:27:    leftSide.className = 'lobby-left';
apps/client/src/ui/lobby.ts:30:    heading.textContent = `Phòng ${lobby.code}`;
apps/client/src/ui/lobby.ts:34:    copyCode.addEventListener('click', () => copy(lobby.code));
apps/client/src/ui/lobby.ts:36:    copyLink.addEventListener('click', () => copy(`${window.location.origin}${window.location.pathname}?room=${lobby.code}`));
apps/client/src/ui/lobby.ts:45:    for (const player of lobby.players) {
apps/client/src/ui/lobby.ts:46:      playersList.append(playerRow(player, lobby.hostId));
apps/client/src/ui/lobby.ts:52:    rightSide.className = 'lobby-right';
apps/client/src/ui/lobby.ts:55:    rightHeader.className = 'lobby-right-header';
apps/client/src/ui/lobby.ts:60:    const isHost = lobby.hostId === currentPlayerId;
apps/client/src/ui/lobby.ts:100:        if (option.id === lobby.levelId) card.classList.add('selected');
apps/client/src/ui/lobby.ts:134:          card.style.opacity = option.id === lobby.levelId ? '1' : '0.7';
apps/client/src/ui/lobby.ts:146:    actions.className = 'lobby-actions';
apps/client/src/ui/lobby.ts:149:    if (isHost && lobby.players.length === 1) {
apps/client/src/ui/lobby.ts:156:      soloCheck.checked = (lobby as any).solo || false;
apps/client/src/ui/lobby.ts:167:      start.disabled = lobby.players.some((player) => player.id !== currentPlayerId && !player.ready);
apps/client/src/ui/lobby.ts:171:      const self = lobby.players.find((player) => player.id === currentPlayerId);
apps/client/src/ui/lobby.ts:201:function playerRow(player: NonNullable<AppState['lobby']>['players'][number], hostId: string): HTMLLIElement {
apps/client/src/ui/results.ts:28:  const isHost = state.lobby?.hostId === netClient.sessionId;
apps/client/src/ui/results.ts:83:    const mvpPlayer = state.lobby?.players.find(p => p.id === mvpId);
```

## b) `git grep -n "PLAYER_COLORS\|campaign\|levelGrid\|select_level\|MSG.START\|members" apps/client/src apps/server/src`
```
apps/client/src/game/render/PlayerRenderer.ts:2:import { PLAYER_COLORS, PLAYER_RADIUS, TILE_PX } from '@kitchen/core';
apps/client/src/game/render/PlayerRenderer.ts:99:    const drawColor = PLAYER_COLORS[color % PLAYER_COLORS.length] ?? 0xffffff;
apps/client/src/game/renderer3d/MenuRenderer.ts:7:import { LobbyPlayer, PLAYER_COLORS } from '@kitchen/core';
apps/client/src/game/renderer3d/MenuRenderer.ts:150:    const color0 = PLAYER_COLORS[0] ?? 0xe74c3c;
apps/client/src/game/renderer3d/MenuRenderer.ts:151:    const color1 = PLAYER_COLORS[1] ?? 0x3498db;
apps/client/src/net/NetClient.ts:256:    this.room?.send('select_level', { levelId });
apps/client/src/ui/campaign.css:165:.campaign-stars {
apps/client/src/ui/campaign.css:172:.campaign-map {
apps/client/src/ui/campaign.css:202:.campaign-node {
apps/client/src/ui/campaign.css:216:.campaign-node.locked {
apps/client/src/ui/campaign.css:222:.campaign-node:hover:not(.locked) {
apps/client/src/ui/campaign.css:227:.campaign-node.selected {
apps/client/src/ui/lobby.ts:6:import './campaign.css';
apps/client/src/ui/lobby.ts:69:    starCounter.className = 'campaign-stars';
apps/client/src/ui/lobby.ts:75:    const levelGrid = document.createElement('div');
apps/client/src/ui/lobby.ts:76:    levelGrid.className = 'campaign-map';
apps/client/src/ui/lobby.ts:99:        card.className = 'level-card campaign-node';
apps/client/src/ui/lobby.ts:140:      levelGrid.append(worldContainer);
apps/client/src/ui/lobby.ts:143:    rightSide.append(levelGrid);
apps/server/src/__tests__/gameLoop.test.ts:65:    handlers[MSG.START]!(c1, {});
apps/server/src/__tests__/lobby.test.ts:38:    expect(room.members.length).toBe(1);
apps/server/src/__tests__/lobby.test.ts:48:    expect(room.members.length).toBe(2);
apps/server/src/__tests__/lobby.test.ts:49:    expect(room.members[0]!.color).not.toBe(room.members[1]!.color);
apps/server/src/__tests__/lobby.test.ts:53:    expect(room.members.length).toBe(1);
apps/server/src/__tests__/lobby.test.ts:60:  it('should process ready, select_level and start messages', async () => {
apps/server/src/__tests__/lobby.test.ts:82:    expect(room.members.find(m => m.id === 'c2')?.ready).toBe(true);
apps/server/src/__tests__/lobby.test.ts:84:    // select_level message (from non-host, should be ignored)
apps/server/src/__tests__/lobby.test.ts:85:    handlers['select_level']!(c2, { levelId: 'level99' });
apps/server/src/__tests__/lobby.test.ts:88:    // select_level message (from host)
apps/server/src/__tests__/lobby.test.ts:89:    handlers['select_level']!(c1, { levelId: 'level2' });
apps/server/src/__tests__/resilience.test.ts:72:    expect(room.members[0]?.connected).toBe(true);
apps/server/src/__tests__/resilience.test.ts:89:    expect(room.members).toHaveLength(0);
apps/server/src/rooms/KitchenRoom.ts:16:  PLAYER_COLORS,
apps/server/src/rooms/KitchenRoom.ts:39:type MessageType = typeof MSG.INPUT | typeof MSG.PING | typeof MSG.READY | typeof MSG.SELECT_LEVEL | typeof MSG.START | typeof MSG.BACK_TO_LOBBY | typeof MSG.EMOTE | typeof MSG.SWITCH_CHEF | typeof MSG.SET_SOLO;
apps/server/src/rooms/KitchenRoom.ts:46:  [MSG.START]: [5, 5],
apps/server/src/rooms/KitchenRoom.ts:63:  members: Member[] = [];
apps/server/src/rooms/KitchenRoom.ts:111:        for (const member of this.members.filter((member) => member.connected)) {
apps/server/src/rooms/KitchenRoom.ts:121:      const m = this.members.find(x => x.id === client.sessionId);
apps/server/src/rooms/KitchenRoom.ts:137:    this.registerHandler(MSG.START, (client) => {
apps/server/src/rooms/KitchenRoom.ts:140:      if (this.members.length === 0) return;
apps/server/src/rooms/KitchenRoom.ts:144:      const count = this.members.length;
apps/server/src/rooms/KitchenRoom.ts:150:      const allReady = this.members.every(m => m.id === this.hostId || m.ready);
apps/server/src/rooms/KitchenRoom.ts:235:      if (message.solo && this.members.length > 1) return;
apps/server/src/rooms/KitchenRoom.ts:254:      ? this.members.flatMap(m => [`${m.id}_1`, `${m.id}_2`])
apps/server/src/rooms/KitchenRoom.ts:255:      : this.members.map(m => m.id);
apps/server/src/rooms/KitchenRoom.ts:258:      this.members.forEach(m => {
apps/server/src/rooms/KitchenRoom.ts:292:        if (snapshot && this.isSoloMode && this.members.length > 0) {
apps/server/src/rooms/KitchenRoom.ts:293:          const clientId = this.members[0]?.id;
apps/server/src/rooms/KitchenRoom.ts:303:        return !!this.members.find((m) => m.id === baseId)?.connected;
apps/server/src/rooms/KitchenRoom.ts:305:      () => this.members.some((m) => m.connected)
apps/server/src/rooms/KitchenRoom.ts:337:    for (const m of this.members) {
apps/server/src/rooms/KitchenRoom.ts:355:    const usedColors = this.members.map(m => m.color);
apps/server/src/rooms/KitchenRoom.ts:356:    const availableColor = PLAYER_COLORS.find(c => !usedColors.includes(c)) ?? PLAYER_COLORS[0]!;
apps/server/src/rooms/KitchenRoom.ts:367:    this.members.push(member);
apps/server/src/rooms/KitchenRoom.ts:368:    if (this.members.length === 1) {
apps/server/src/rooms/KitchenRoom.ts:372:    if (this.members.length > 1 && this.isSoloMode) {
apps/server/src/rooms/KitchenRoom.ts:418:        players: this.members,
apps/server/src/rooms/KitchenRoom.ts:446:    const member = this.members.find((candidate) => candidate.id === sessionId);
apps/server/src/rooms/KitchenRoom.ts:455:    const member = this.members.find((candidate) => candidate.id === client.sessionId);
apps/server/src/rooms/KitchenRoom.ts:467:    this.members = this.members.filter((member) => member.id !== sessionId);
apps/server/src/rooms/KitchenRoom.ts:474:    if (this.members.length > 0) this.broadcastLobby();
apps/server/src/rooms/KitchenRoom.ts:480:    const nextHost = [...this.members].sort((a, b) => a.joinedAt - b.joinedAt)[0];
apps/server/src/rooms/KitchenRoom.ts:485:    if (this.members.some((member) => member.connected) || this.emptyRoomTimer) return;
apps/server/src/rooms/KitchenRoom.ts:487:      if (!this.members.some((member) => member.connected)) this.disconnect();
apps/server/src/rooms/KitchenRoom.ts:492:    return { code: this.roomId, phase: this.phase, levelId: this.levelId, hostId: this.hostId, players: this.members };
```

## c) `git grep -n "createChefModel\|class ChefModel\|SharedWebGL" apps/client/src/game/renderer3d`
```
apps/client/src/game/renderer3d/MenuRenderer.ts:2:import { getSharedWebGLRenderer } from './SharedWebGL';
apps/client/src/game/renderer3d/MenuRenderer.ts:27:    this.renderer = getSharedWebGLRenderer();
apps/client/src/game/renderer3d/SharedWebGL.ts:10:export function setSharedWebGLRendererForTesting(renderer: THREE.WebGLRenderer | null) {
apps/client/src/game/renderer3d/SharedWebGL.ts:14:export function getSharedWebGLRenderer(): THREE.WebGLRenderer {
apps/client/src/game/renderer3d/SharedWebGL.ts:29:      console.warn('[SharedWebGL] WebGL antialias không khả dụng, thử chế độ cơ bản...', e1);
apps/client/src/game/renderer3d/SharedWebGL.ts:44:      console.warn('[SharedWebGL] WebGL cơ bản không khả dụng, thử lấy context canvas...', e2);
apps/client/src/game/renderer3d/SharedWebGL.ts:61:      console.warn('[SharedWebGL] Canvas context fallback không thành công:', e3);
apps/client/src/game/renderer3d/SharedWebGL.ts:69:export function disposeSharedWebGLRenderer() {
apps/client/src/game/renderer3d/ThreeRenderer.ts:14:import { getSharedWebGLRenderer } from './SharedWebGL';
apps/client/src/game/renderer3d/ThreeRenderer.ts:67:      this.renderer = getSharedWebGLRenderer();
apps/client/src/game/renderer3d/chef/Chef.ts:7:export class ChefModel {
```

### Cách nạp chef để tái dùng:
1. `AssetLoader.getInstance().loadAsset('chef')` hoặc `getAssetSync('chef')` trả về GLB data gồm scene và animations.
2. `ChefModel`: khởi tạo bằng `new ChefModel(colorHex, isMe)`, sau đó gọi `chef.loadGlb(chefGlb)`.
3. `SharedWebGL`: hàm `getSharedWebGLRenderer()` trả về singleton `THREE.WebGLRenderer`. Khi render khung xem trước riêng, có thể dùng một `THREE.Scene` riêng và camera riêng, hoặc dùng `autoClear = false`, `setViewport` / `setScissor`, hoặc render vào canvas riêng/render target hoặc canvas con gắn renderer DOM.
