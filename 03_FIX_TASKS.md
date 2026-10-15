# 03 — DANH SÁCH TASK SỬA LỖI (sau khi rà soát T00 → T27)

> **Bối cảnh:** Repo đã làm tới T27, `typecheck` và `test` (114 test) đều xanh, nhưng **khi chơi thật thì bấm "Bắt đầu" không vào được game**.
> Nguyên nhân chính: **server và client đang hiểu giao thức `phase`/`event` khác nhau**, và các test hiện tại không bắt được lỗi này.
> File này liệt kê lỗi đã tìm thấy (kèm vị trí trong code) và các task sửa theo đúng format `02_TASKS.md`.
> **Làm theo đúng thứ tự.** F01 → F04 là **BLOCKER** (chưa xong thì game chưa chơi được). Sau F04 thì quay lại kiểm tra mốc nghiệm thu của T23.

Câu lệnh mẫu giao việc cho AI:
```
Đọc 01_CODING_RULES.md, rồi làm task F0x trong 03_FIX_TASKS.md (chỉ task đó).
Chạy typecheck/lint/test, tick nghiệm thu bằng bằng chứng thật, báo cáo theo mẫu mục 12.
```

---

## Tóm tắt lỗi đã phát hiện

| # | Mức độ | Lỗi | Vị trí | Hậu quả |
|---|---|---|---|---|
| B1 | 🔴 BLOCKER | Server gửi `phase` **thiếu trường `phase`**: `broadcast('phase', { countdown })` | `apps/server/src/rooms/KitchenRoom.ts` dòng 127, 132 | Client kiểm tra `payload.phase === 'countdown'` → luôn `false` → **không bao giờ chuyển sang màn game** |
| B2 | 🔴 BLOCKER | `startGame()` **không gửi** `phase: 'playing'`; `endGame()` không gửi `phase: 'finished'`; `backToLobby()` không gửi `phase: 'lobby'` | `KitchenRoom.ts` `startGame`, `endGame`, `backToLobby` | Client không biết game đã bắt đầu/kết thúc |
| B3 | 🔴 BLOCKER | Client chỉ gửi input khi `state.lobby?.phase === 'playing'`, nhưng `lobby.phase` chỉ cập nhật qua message `lobby`, mà server **không gửi lại `lobby`** khi bắt đầu game | `apps/client/src/game/InputController.ts` dòng 65 | Kể cả vào được màn game thì **nhân vật vẫn không di chuyển** |
| B4 | 🔴 BLOCKER | Server gửi `event` dạng **mảng** (`broadcast('event', events)`), còn protocol và client coi là **1 object** | `KitchenRoom.ts` dòng 206; `hud.ts` `onEvent`; `GameScene.ts` `onEvent` | Không có âm thanh, hiệu ứng, toast, điểm bay "+N" |
| B5 | 🔴 BLOCKER | Router **unmount + mount lại toàn bộ màn hình mỗi lần store đổi** (kể cả `ping` mỗi 2 giây) | `apps/client/src/state/router.ts`, `apps/client/src/main.ts` | Cứ 2 giây: HUD bị tạo lại, `scene.loadLevel()` vẽ lại bản đồ, `game.scene.start` có thể bị gọi 2 lần, toast lỗi hiện lặp lại |
| B6 | 🔴 BLOCKER | `MapRenderer` tạo `RenderTexture` mới mỗi lần `loadLevel` mà **không đặt depth** → bản đồ mới vẽ **đè lên** người chơi/station (kết hợp với B5) | `apps/client/src/game/render/MapRenderer.ts` dòng 18 | Sau ~2 giây người chơi/đồ vật "biến mất" |
| B7 | 🟠 Cao | Khi có người rớt mạng giữa ván, server `broadcastLobby()` → client nhận `lobby` luôn `set({ screen: 'lobby' })` | `apps/client/src/net/NetClient.ts` dòng 61 | Mọi người bị đá về màn lobby giữa ván |
| B8 | 🟠 Cao | Mã phòng sinh bằng `Math.random()` từ bảng `A–Z` (**có I, O**) thay vì dùng `generateRoomCode` + `ROOM_CODE_ALPHABET`; còn có `catch {}` rỗng | `KitchenRoom.ts` dòng 71–93 | ~27% phòng có mã chứa I/O → ô nhập mã ở menu **lọc mất I/O** → không thể vào bằng mã |
| B9 | 🟠 Cao | Từ chối vào giữa ván bằng `client.error()` + `client.leave()` trong `onJoin` thay vì `throw new ServerError(4001, 'game_in_progress')` | `KitchenRoom.ts` `onJoin` | Client "vào được" rồi bị đá ra, không hiện thông báo đúng |
| B10 | 🟠 Cao | `GameScene` là instance dùng lại khi restart nhưng `predictor`, `playerRenderers`, `stationRenderers` **không được reset** trong `create()`; listener `resize` và `shutdown` bị đăng ký thêm mỗi lần | `apps/client/src/game/GameScene.ts` | Ván thứ 2 trở đi: nhân vật cục bộ dùng predictor cũ (sai vị trí), rò listener |
| B11 | 🟡 Trung bình | Màn kết quả đếm ngược **5 giây** nhưng server yêu cầu `RESULTS_SECONDS = 15` → host bấm "Chơi tiếp" bị server bỏ qua im lặng | `apps/client/src/ui/results.ts` dòng 68; `KitchenRoom.ts` dòng 153 | Host tưởng nút bị hỏng |
| B12 | 🟡 Trung bình | Vòng lặp server **không dùng accumulator** (rules mục 9), thiếu `DEBUG_DURATION` (T12) | `KitchenRoom.ts` `startGame` | Sai rules, không test được kết thúc ván nhanh |
| B13 | 🟡 Trung bình | Hướng dẫn chơi sai nội dung (ghi "Ném: E", món "🥣 = 🧅 + 🍅") và dùng `innerHTML` | `apps/client/src/ui/menu.ts` dòng 27 | Sai đặc tả 5.4 / mục 8 |
| B14 | 🟡 Trung bình | Tên level ở lobby không khớp core (`Bếp cơ bản` vs `Bếp Nhỏ`...) — hard-code trong client | `apps/client/src/ui/lobby.ts` dòng 4 | Hiển thị sai |
| B15 | 🟡 Trung bình | Đếm ngược HUD chờ `countdown: 0` để hiện "Bắt đầu!", server không bao giờ gửi 0 | `apps/client/src/ui/hud.ts` `onPhase` | Không thấy chữ "Bắt đầu!" |
| B16 | 🟡 Trung bình | Confetti tạo emitter **trước** khi tạo texture `white_circle` | `GameScene.ts` `createConfetti` | Lần phục vụ đầu tiên không có hiệu ứng / cảnh báo texture |
| B17 | ⚪ Thấp | `pnpm lint` đỏ (2 lỗi `any` ở `scripts/debug-browser.ts`); `KitchenRoom.ts` 441 dòng (> 400); `eslint-disable any` trong `NetClient`; `@colyseus/testing` dùng `^`; `innerHTML` ở `results.ts`; `seq` bắt đầu từ 0 (rules: từ 1); không dùng hằng `MSG`, `PLAYER_COLORS` | nhiều file | Vi phạm Definition of Done |

---

# NHÓM A — BLOCKER (bắt buộc để game chơi được)

## F01 — Server: phát đúng message `phase` và đồng bộ `lobby.phase`
**Sửa lỗi:** B1, B2.
**Phụ thuộc:** không.

**Việc cần làm** (`apps/server/src/rooms/KitchenRoom.ts`):
1. Đổi kiểu `phase = 'lobby'` thành `phase: Phase = 'lobby'` (import `Phase`, `MSG`, `COUNTDOWN_SECONDS` từ `@kitchen/core`).
2. Viết 1 hàm duy nhất `private setPhase(phase: Phase, countdown?: number)`:
   - gán `this.phase`;
   - `broadcast(MSG.PHASE, countdown === undefined ? { phase } : { phase, countdown })`;
   - gọi `broadcastLobby()` để `lobby.phase` phía client luôn đúng.
3. `start`: `setPhase('countdown', 3)` → mỗi giây `setPhase('countdown', 2)`, `setPhase('countdown', 1)` → `startGame()` gọi `setPhase('playing')` **trước** khi gửi snapshot đầu tiên. Dùng `COUNTDOWN_SECONDS` thay vì số `3`.
4. Lưu timer đếm ngược vào field `countdownTimer`; clear trong `backToLobby()` và `onDispose()`.
5. `endGame()` → `setPhase('finished')` rồi mới `broadcast(MSG.RESULTS, ...)`.
6. `backToLobby()` → reset `ready` rồi `setPhase('lobby')`.
7. Thay mọi chuỗi tay `'lobby'`, `'snapshot'`, `'event'`... trong `broadcast`/`onMessage` bằng hằng `MSG.*`.
8. Cập nhật `docs/PROTOCOL.md` nếu ví dụ JSON của `phase` đang sai.

**Nghiệm thu:**
- [x] Test tích hợp (sửa/thêm vào `apps/server/src/__tests__/gameLoop.test.ts`): sau khi host `start`, client nhận **đúng thứ tự** `{phase:'countdown',countdown:3}`, `{…:2}`, `{…:1}`, `{phase:'playing'}`, rồi mới tới `snapshot`
- [x] Message `lobby` gửi sau `playing` có `phase: 'playing'`
- [x] Khi hết giờ: nhận `{phase:'finished'}` rồi `results`; `back_to_lobby` → nhận `{phase:'lobby'}`
- [x] Không còn chỗ nào `broadcast('phase', …)` thiếu trường `phase` (grep)

---

## F02 — Client: đồng bộ phase vào store, điều hướng màn hình đúng, gửi được input
**Sửa lỗi:** B3, B7, B15, một phần B17 (`seq`).
**Phụ thuộc:** F01.

**Việc cần làm:**
1. `state/store.ts`: thêm field `phase: Phase` vào `AppState` (mặc định `'lobby'`) — **nguồn sự thật duy nhất về phase phía client**.
2. `net/NetClient.ts`:
   - Viết hàm thuần `screenForPhase(phase: Phase, hasResults: boolean): Screen` (`lobby→lobby`, `countdown|playing→game`, `finished→results` nếu đã có results, ngược lại giữ `game`). Có unit test.
   - Handler `phase`: `store.set({ phase, screen: screenForPhase(...) })`; khi `phase === 'lobby'` thì `results: null`.
   - Handler `lobby`: **chỉ** cập nhật `lobby`, `roomCode`, `phase` (từ `payload.phase`) và `screen = screenForPhase(payload.phase, …)`. **Không** ép `screen: 'lobby'` khi đang `playing` (sửa B7).
   - Handler `results`: `store.set({ results, screen: 'results' })`.
3. `game/InputController.ts`: điều kiện gửi input đổi thành `state.screen === 'game' && state.phase === 'playing'`. `seq` bắt đầu từ **1** (`++this.seq`).
4. `ui/hud.ts` `onPhase`: hiện "3-2-1" theo `countdown`; khi nhận `phase === 'playing'` thì hiện **"Bắt đầu!"** 1 giây rồi ẩn (sửa B15).

**Nghiệm thu:**
- [x] Unit test `screenForPhase` đủ 4 phase
- [x] Unit test NetClient (mock room): nhận `phase playing` → `store.phase==='playing'`, `screen==='game'`; nhận `lobby` với `phase:'playing'` → **vẫn** `screen==='game'`
- [x] Thủ công: 1 tab, tạo phòng → Bắt đầu → thấy 3-2-1-"Bắt đầu!" → **di chuyển được** bằng WASD
- [x] Input đầu tiên server nhận có `seq === 1`

---

## F03 — Server: gửi `event` từng cái theo đúng protocol
**Sửa lỗi:** B4.
**Phụ thuộc:** F01.

**Việc cần làm:**
1. `KitchenRoom.ts`: thay `if (events.length > 0) this.broadcast('event', events)` bằng `for (const e of events) this.broadcast(MSG.EVENT, e)`.
2. Rà lại client (`hud.ts`, `GameScene.ts`, `Sfx.ts`) xác nhận chỉ xử lý **1 event/lần**. Xóa nhánh `event.type === 'timeup'` ở `hud.ts` (không có trong `EventType`); phát âm `timeup` khi nhận `phase: 'finished'` thay thế.
3. Cập nhật `docs/PROTOCOL.md` (ghi rõ: mỗi message `event` là 1 object).

**Nghiệm thu:**
- [x] Test tích hợp: script input để 1 player nhặt cà chua từ crate → client nhận message `event` là **object** có `type === 'pickup'` (không phải mảng)
- [x] Thủ công: nhặt/đặt có âm "pop", thái xong có hiệu ứng, phục vụ có "+N" và confetti

---

## F04 — Client: router không mount lại màn hình mỗi lần store đổi; vòng đời Phaser scene đúng
**Sửa lỗi:** B5, B6, B10, B16.
**Phụ thuộc:** F02.

**Việc cần làm:**
1. `state/router.ts`: chỉ unmount/mount khi **`screen` thay đổi**. Với cùng `screen`, gọi hàm `update(state)` nếu màn hình có cung cấp. Đổi kiểu: `type ScreenHandle = { unmount(): void; update?(state: AppState): void }`.
   - `mountLobby` trả `update` để cập nhật danh sách người chơi/level/ping **tại chỗ** (hoặc chỉ dựng lại phần `panel` khi `lobby` thay đổi — **không** dựng lại khi chỉ `ping` đổi).
   - `mountHud` không cần `update` (đã nghe `netClient`).
   - Unit test: đổi `ping` 100 lần → số lần mount = 1.
2. `main.ts`: tách logic Phaser ra hàm `syncGameScene(prev, next)` chỉ chạy khi:
   - `screen` chuyển **sang** `game` → `game.scene.start('GameScene', { level, netClient })` (đúng 1 lần);
   - `screen` rời `game` → `game.scene.stop('GameScene')`;
   - `lobby.levelId` đổi khi đang ở game (hiếm) → `loadLevel`.
   Toast lỗi chỉ hiện khi `state.error` **thay đổi** so với lần trước, sau đó `store.set({ error: null })`.
3. `game/render/MapRenderer.ts`: `this.rt.setDepth(-10)` sau khi tạo; debug grid cũng giữ tham chiếu để destroy khi `loadLevel` lại.
4. `game/GameScene.ts` `create()`:
   - Reset toàn bộ: `this.predictor = undefined`, `this.playerRenderers = new Map()`, `this.stationRenderers = new Map()`.
   - Dùng `this.events.once('shutdown', …)`; trong đó `this.scale.off('resize', this.layoutCamera, this)` và destroy `mapRenderer`.
   - `createConfetti`: tạo texture **trước** rồi mới `add.particles` (B16).
   - Đọc cờ `?pred=0` **một lần** trong `create()` thay vì `new URLSearchParams` mỗi frame.

**Nghiệm thu:**
- [x] Đứng trong game 30 giây: bản đồ không nháy, người chơi luôn hiển thị, HUD không bị tạo lại (đếm số lần `mountHud` ở `?debug=1` = 1)
- [x] Chơi 3 ván liên tiếp: nhân vật cục bộ xuất hiện đúng spawn ở mỗi ván, `scene.children.length` không tăng dần
- [x] Lỗi (ví dụ mã phòng sai) chỉ hiện toast **1 lần**
- [x] **Mốc T23 đạt:** 2 tab tạo phòng bằng mã → chọn level → start → nấu và phục vụ ít nhất 1 món → hết giờ → kết quả → "Chơi tiếp" → lobby → chơi level khác

---

# NHÓM B — LỖI CAO (ảnh hưởng chơi nhiều người / vào phòng)

## F05 — Mã phòng đúng bảng chữ cái & từ chối vào giữa ván đúng cách
**Sửa lỗi:** B8, B9.
**Phụ thuộc:** F01.

**Việc cần làm:**
1. `KitchenRoom.onCreate`: xóa vòng lặp `Math.random` + `'ABCDEFGHIJKLMNOPQRSTUVWXYZ'` + các `catch {}` rỗng. Thay bằng:
   ```ts
   const rooms = await matchMaker.query({ name: 'kitchen' });
   const taken = new Set(rooms.map((r) => r.roomId));
   this.roomId = generateRoomCode((code) => taken.has(code));
   ```
   Nếu `generateRoomCode` ném lỗi → để lỗi nổi lên (client nhận lỗi tạo phòng), có log.
2. Chuyển kiểm tra phase sang `onAuth` (hoặc đầu `onJoin`) bằng `throw new ServerError(4001, 'game_in_progress')` (import từ `@colyseus/core`, đối chiếu docs 0.16).
3. Màu người chơi lấy từ `PLAYER_COLORS` trong core, không hard-code mảng màu trong Room.
4. Ghi quyết định vào `docs/DECISIONS.md`.

**Nghiệm thu:**
- [x] Unit test: tạo 200 phòng → mọi `roomId` khớp `/^[ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/`
- [x] Test tích hợp: người thứ 3 `joinById` khi phòng đang `playing` → promise **reject** với code `4001`; client hiển thị "Phòng đang trong ván chơi, không thể vào."
- [x] Không còn `Math.random` trong `KitchenRoom.ts`, không còn `catch {}` rỗng


---

## F06 — Vòng lặp mô phỏng dùng accumulator + `DEBUG_DURATION`
**Sửa lỗi:** B12.
**Phụ thuộc:** F01, F03.

**Việc cần làm:**
1. Tách vòng lặp game ra `apps/server/src/rooms/gameLoop.ts` (class `GameLoop` thuần: nhận `GameState`, `InputQueue`s, callback `onEvents`, `onSnapshot`, `onEnd`) — đồng thời giúp `KitchenRoom.ts` < 400 dòng.
2. `setSimulationInterval((deltaMs) => loop.advance(deltaMs), 1000 / SIM_HZ)`; trong `advance`: cộng accumulator, chạy `step()` với `dt = 1/SIM_HZ` cố định, **tối đa 5 tick/lần gọi**, bỏ phần dư nếu vượt.
3. `config.ts`: đọc `DEBUG_DURATION` (số giây, chỉ dùng cho test/dev). Nếu có → ghi đè `state.timeLeft` sau `createGameState`. Ghi vào `docs/DECISIONS.md`.
4. Unit test `GameLoop`: `advance(100ms)` → đúng 3 tick; `advance(1000ms)` → đúng 5 tick; snapshot mỗi 2 tick.

**Nghiệm thu:**
- [x] Unit test `GameLoop` xanh
- [x] Test tích hợp với `DEBUG_DURATION=3`: nhận `results` sau ~3 giây
- [x] Đo 2 giây ở trạng thái `playing`: nhận 28–32 snapshot

---

## F07 — Màn kết quả & quay lại lobby
**Sửa lỗi:** B11, một phần B17.
**Phụ thuộc:** F02.

**Việc cần làm:**
1. `ui/results.ts`: đếm ngược dùng `RESULTS_SECONDS` từ core (15s), không hard-code `5`.
2. Thay `statsDiv.innerHTML = …` bằng tạo phần tử + `textContent`.
3. Server `back_to_lobby` gửi sớm → `sendError(client, 'too_early', …)` thay vì im lặng; thêm mã này vào `net/errors.ts`.
4. Khi nhận `phase: 'lobby'` → `results: null`, quay về lobby, nút Sẵn sàng hiển thị lại trạng thái `⏳`.

**Nghiệm thu:**
- [x] Nút "Chơi tiếp" chỉ bật sau 15 giây; bấm → cả 2 tab về lobby
- [x] Không còn `innerHTML` trong `results.ts`
- [x] Người không phải host thấy "Đang chờ chủ phòng…" và tự về lobby khi host bấm

---

# NHÓM C — HOÀN THIỆN THEO ĐẶC TẢ

## F08 — Sửa nội dung UI cho đúng đặc tả
**Sửa lỗi:** B13, B14.
**Phụ thuộc:** F04.

**Việc cần làm:**
1. `ui/menu.ts` — Hướng dẫn chơi dựng bằng DOM + `textContent` (không `innerHTML`), nội dung đúng rules:
   - Di chuyển: WASD / phím mũi tên · Nhặt/Đặt: **Space** hoặc **E** · Thái/Rửa (giữ): **Shift** hoặc **F** · Emote: **1–4**.
   - Công thức: Salad = 🥬🔪 + 🍅🔪 · Burger = 🍞 + 🥩🔥 + 🥬🔪 · Burger cà chua = 🍞 + 🥩🔥 + 🥬🔪 + 🍅🔪.
   - Tạo nội dung công thức **từ `RECIPES` trong core** để không lệch.
   - Bọc `localStorage` bằng try/catch (như `state/storage.ts`).
2. `ui/lobby.ts`: danh sách level lấy từ `LEVELS` của core (`id`, `name`), xóa mảng hard-code.
3. Tách `lobby.ts`/`menu.ts` về dạng nhiều dòng dễ đọc (hiện mỗi dòng chứa nhiều câu lệnh) — không đổi hành vi.

**Nghiệm thu:**
- [x] Hướng dẫn hiển thị đúng 3 công thức, đóng được bằng Esc và nút X
- [x] Lobby hiển thị "Bếp Nhỏ", "Hai Bên Quầy", "Bếp Hỗn Loạn"
- [ ] `grep innerHTML apps/client/src` không còn kết quả với dữ liệu động

---

## F09 — Dọn vi phạm rules để repo xanh hoàn toàn
**Sửa lỗi:** B17.
**Phụ thuộc:** F01–F08.

**Việc cần làm:**
1. Sửa 2 lỗi `no-explicit-any` ở `scripts/debug-browser.ts` (hoặc xóa file nếu chỉ là script debug tạm).
2. `NetClient.ts`: bỏ các `eslint-disable … no-explicit-any`, gõ kiểu emitter đúng bằng generic.
3. `apps/server/package.json`: ghim `@colyseus/testing` phiên bản chính xác (bỏ `^`).
4. `package.json` gốc: thêm `"packageManager": "pnpm@9.x.y"` (bản cụ thể) và script `start` (rules mục 10 bắt buộc). Xóa `package-lock.json` khỏi repo nếu còn, thêm vào `.gitignore`.
5. `KitchenRoom.ts` ≤ 400 dòng (sau F06 đã tách `gameLoop.ts`; có thể tách thêm `rooms/messageGuard.ts` cho rate-limit + violation).
6. `README.md`: ghi rõ phải dùng **pnpm** (không dùng `npm i`), lệnh `corepack enable` / `npm i -g pnpm`, và `pnpm approve-builds` nếu pnpm ≥ 10 hỏi build scripts (`esbuild`, `msgpackr-extract`).

**Nghiệm thu:**
- [x] `pnpm -r typecheck && pnpm lint && pnpm -r test && pnpm build` đều xanh
- [x] Không còn `any`, `catch {}` rỗng, `console.log` rải rác trong `apps/*/src` và `packages/core/src`

---

## F10 — Test hồi quy "luồng chính" (để lỗi kiểu này không lặp lại)
**Phụ thuộc:** F01–F07.

**Lý do:** 114 test hiện tại đều xanh nhưng game vẫn không chơi được, vì **không test nào kiểm tra nội dung message `phase`/`event` và phản ứng của client**.

**Việc cần làm:**
1. `apps/client/src/__tests__/netClient.test.ts`: test tích hợp với server thật — 2 `NetClient` tạo/vào phòng → ready → start → assert **store** đi qua `phase: countdown → playing`, `screen: 'game'`; gửi `input {mx:1}` 1 giây → `x` của mình trong snapshot tăng; nhận ít nhất 1 `event` là object.
2. Test router: mount đếm số lần, đổi `ping`/`error` không làm mount lại.
3. `docs/QA_CHECKLIST.md` mục "Luồng chính" (T23): ghi kết quả chạy thủ công 2 tab sau khi sửa.

**Nghiệm thu:**
- [x] Revert tạm F01 → test mới **đỏ** (chứng minh test bắt được lỗi); áp lại → xanh
- [x] QA "Luồng chính" pass 5 vòng liên tiếp, có ghi chú kết quả

---

## Sau khi xong F01 → F10
- Chạy lại nghiệm thu của **T23, T24, T26, T27** trong `02_TASKS.md` (các task này chưa thể đạt khi game không vào được).
- Rồi mới tiếp tục **T28 (Docker) → T29 (E2E) → T30 (phát hành)**.
