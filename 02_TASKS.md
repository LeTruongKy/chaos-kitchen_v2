# 02 — DANH SÁCH TASK "CHAOS KITCHEN"

> **Cách dùng (dành cho bạn – người điều phối):**
> 1. Mở phiên AI code mới, dán nội dung `01_CODING_RULES.md` làm "system/skill" (hoặc đặt tên `AGENTS.md`/`CLAUDE.md` ở gốc repo).
> 2. Giao **từng task một**, theo đúng thứ tự (hoặc song song nếu cột "Phụ thuộc" cho phép). Câu lệnh mẫu:
>    *"Đọc 01_CODING_RULES.md rồi thực hiện task T05 trong 02_TASKS.md. Làm đúng phạm vi, báo cáo theo mẫu mục 12."*
> 3. Sau mỗi task: chạy lệnh ở mục "Cách kiểm tra", đọc báo cáo, đạt thì sang task tiếp. Không đạt → gửi lại AI danh sách tiêu chí chưa đạt.
> 4. Mốc chơi thử: sau **T14** thử bằng bot; sau **T23** chơi được thật; sau **T24–T25** mượt; sau **T28** lên mạng.

## Sơ đồ phụ thuộc

```
T00 → T01 → T02 → T03 → T04 → T05 ─┐
                       │            ├→ T06 → T07 → T08 → T09 ─┐
                       └────────────┘                          │
T00 → T10 → T11 → T12 → T13 → T14   (cần T09 cho T12 trở đi) ←─┘
T00 → T15 → T16, T17 ; T18 → T19 → T20 → T21 → T22 → T23 (cần T14)
T23 → T24 → T25 → T26 → T27 → T28 → T29 → T30
```

---

# PHASE 0 — NỀN TẢNG

## T00 — Khởi tạo monorepo
**Phụ thuộc:** không.
**Mục tiêu:** repo chạy được lệnh build/test/lint rỗng cho cả 3 package.

**Việc cần làm:**
1. Tạo cấu trúc thư mục đúng mục 3 của rules (chỉ các file cấu hình + file `index.ts` rỗng có `export {}`).
2. `pnpm-workspace.yaml` gồm `packages/*` và `apps/*`. `.nvmrc` = `20`.
3. `tsconfig.base.json`: `target ES2022`, `module ESNext`, `moduleResolution Bundler`, `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `skipLibCheck`, `isolatedModules`, `resolveJsonModule`.
4. `@kitchen/core`: `package.json` có `"name":"@kitchen/core"`, `"type":"module"`, `"exports": {".": "./src/index.ts"}` (trỏ thẳng vào source). Script `typecheck: tsc --noEmit`, `test: vitest run`.
5. `@kitchen/server`: phụ thuộc `@kitchen/core: workspace:*`, `colyseus`/`@colyseus/core`, `@colyseus/ws-transport`, `express`, `colyseus.js`(dev, cho bot/test), `tsx`, `tsup`, `vitest`. Script: `dev: tsx watch src/index.ts`, `build: tsup`, `start: node dist/index.js`. `tsup.config.ts`: entry `src/index.ts`, format `esm`, `noExternal: ['@kitchen/core']`, target `node20`.
6. `@kitchen/client`: Vite + Phaser + `colyseus.js` + `@kitchen/core`. `index.html` có `<div id="app"></div><div id="game"></div>`. Script `dev`, `build`, `preview`.
7. Scripts gốc: `dev` chạy song song server + client (`pnpm -r --parallel dev`), `build` (`pnpm -r build`), `test`, `lint`, `typecheck`, `format` (prettier). Cấu hình ESLint + Prettier (single quote, semi, printWidth 100).
8. Vite proxy: trong dev, client kết nối WebSocket tới `ws://localhost:2567`. Viết hàm `getServerUrl()` ở `apps/client/src/net/serverUrl.ts`: nếu `import.meta.env.VITE_SERVER_URL` có giá trị thì dùng; nếu không, dev → `ws://localhost:2567`, production → `ws(s)://<window.location.host>` (theo `location.protocol`).
9. Tạo `docs/DECISIONS.md`, `docs/IDEAS.md` (chỉ có tiêu đề), `.gitignore` (node_modules, dist, .env, coverage).
10. Thêm 1 test mẫu trong core (`expect(1+1).toBe(2)`) để chắc pipeline test chạy.

**Nghiệm thu:**
- [ ] `pnpm install` thành công
- [ ] `pnpm -r typecheck`, `pnpm lint`, `pnpm test` xanh
- [ ] `pnpm build` tạo `apps/server/dist/index.js` và `apps/client/dist/index.html`
- [ ] `pnpm dev` chạy được client ở `http://localhost:5173` hiển thị trang trắng không lỗi console
- [ ] Phiên bản trong `package.json` được ghim chính xác (không `^`)

**Kiểm tra:** `pnpm install && pnpm -r typecheck && pnpm test && pnpm build`

---

## T01 — Constants, types, protocol, RNG
**Phụ thuộc:** T00.
**Mục tiêu:** hiện thực hóa 100% mục 5.1, 5.2, 6 của rules thành code.

**Việc cần làm:**
1. `core/src/constants.ts`: mọi hằng số bảng 5.1; thêm `PLAYER_COLORS = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf1c40f]` và `RECIPE_SCORE: Record<RecipeId, number>`; `CHOPPABLE: IngredientId[] = ['lettuce','tomato']`; `PLATE_ORDER: IngredientId[] = ['bun','meat','lettuce','tomato']`; `ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ'`.
2. `core/src/types.ts`: sao chép chính xác kiểu mục 5.2 + `LevelDef`, `GameEvent = { type: EventType; x?: number; y?: number; playerId?: string; recipe?: RecipeId }`, `EventType` union.
3. `core/src/protocol.ts`: kiểu cho toàn bộ message mục 6 (`ClientMessages` map type→payload, `ServerMessages` map type→payload), `Snapshot`, `LobbyPlayer`, `Phase`, và hằng `MSG = { READY:'ready', ... }` để không gõ chuỗi tay ở nơi khác.
4. Type guard `isPlayerInput(x: unknown): x is PlayerInput` trong `protocol.ts` kiểm tra đủ trường, `mx,my ∈ {-1,0,1}`, `seq` số nguyên ≥ 0, `act`,`interact` boolean.
5. `core/src/rng.ts`: `mulberry32` thuần: `nextRandom(state: number): { value: number; state: number }` (value ∈ [0,1)), `randomInt(state, min, max)`, `pickWeighted(state, items, weights)` — đều trả `state` mới (không giữ biến global).
6. `core/src/index.ts` re-export tất cả.
7. `docs/PROTOCOL.md`: bảng message giống mục 6, kèm ví dụ JSON mỗi loại.

**Nghiệm thu:**
- [ ] Mọi kiểu/hằng đúng tên, đúng giá trị như rules
- [ ] Test RNG: cùng seed → cùng chuỗi 100 số; `randomInt` luôn trong `[min,max]` (chạy 10.000 lần); `pickWeighted` với weight `[1,0]` luôn chọn phần tử 0
- [ ] Test `isPlayerInput` với ≥ 10 trường hợp đúng/sai (thiếu trường, `mx=2`, `seq=-1`, `NaN`, chuỗi...)
- [ ] Không import ngoài `core`; không dùng `Math.random`

---

# PHASE 1 — CORE LOGIC (không mạng, không đồ họa)

## T02 — Parse & validate level + 3 level
**Phụ thuộc:** T01.

**Việc cần làm:**
1. `core/src/level.ts`:
   - `parseLevel(def: LevelDef): ParsedLevel` với `ParsedLevel = { def; width; height; tiles: TileType[]; stations: StationInit[]; spawns: Vec2[] }` (spawn index theo số 1–4, tọa độ tâm tile: `x+0.5, y+0.5`). Tile `1`–`4` được coi là `floor`.
   - `validateLevel(def): string[]` trả về danh sách lỗi (rỗng = hợp lệ). Kiểm tra: mọi dòng cùng độ dài; ký tự hợp lệ; có đủ spawn `1,2,3,4` mỗi số đúng 1 lần; có ít nhất 1 `P`, 1 `O`, 1 `R`, 1 `W`, 1 `D`, 1 `C`, 1 `S`; có đủ crate cho **mọi nguyên liệu mà các recipe trong level cần** (ví dụ level có burger thì cần `B`,`M`,`L`); **mọi station (trừ `X` và `#`) có ít nhất 1 tile `floor` kề cạnh 4 hướng**; mọi tile `floor` và spawn đều **liên thông** với nhau (BFS 4 hướng); viền ngoài là `#` hoặc station (không có floor ở mép bản đồ); `stars` tăng dần; `duration > 0`.
2. `core/src/levels/level1.ts` — dùng CHÍNH XÁC bản đồ sau (12×9):
```
############
#XTLBMXXRWX#
#C........X#
#C...12...D#
#X...34...O#
#S........O#
#S........X#
#XXPXXXXXXX#
############
```
   `id:'level1'`, `name:'Bếp Nhỏ'`, `duration:180`, `plates:4`, `recipes:[{salad,1},{burger,1}]`, `stars:[40,100,160]`.
3. `level2.ts` (`id:'level2'`, `name:'Hai Bên Quầy'`): bản đồ ≥ 14×9, có **một dãy bàn `X` chia đôi phòng** chỉ chừa 2 ô floor để đi qua (tạo nút cổ chai), nguyên liệu ở nửa trái, bếp + thớt ở nửa phải, cửa phục vụ ở giữa; `recipes: salad 1, burger 2, burger_tomato 1`; `duration:180`; `plates:4`; `stars:[60,140,220]`. Phải qua `validateLevel`.
4. `level3.ts` (`id:'level3'`, `name:'Bếp Hỗn Loạn'`): bản đồ ≥ 16×10, có **2 cái `R`/`W`**, **3 bếp `S`**, **3 thớt `C`**, 2 cửa `O`, nhiều `X` làm vật cản giữa sàn; `recipes: salad 1, burger 2, burger_tomato 2`; `duration:210`; `plates:5`; `stars:[80,180,280]`. Qua `validateLevel`.
5. `levels/index.ts`: `LEVELS: LevelDef[]`, `getLevel(id): LevelDef | undefined`.

**Nghiệm thu:**
- [ ] Test: cả 3 level `validateLevel` trả `[]`
- [ ] Test lỗi: ≥ 8 level cố ý sai (thiếu spawn, station không tiếp cận được, vùng floor bị cô lập, dòng lệch độ dài, ký tự lạ, thiếu crate, floor ở mép...) đều trả đúng thông báo lỗi
- [ ] Test `parseLevel(level1)`: width=12, height=9, đếm station đúng (1 `T`,1 `L`,1 `B`,1 `M`,2 `C`,2 `S`,1 `P`,2 `O`,1 `R`,1 `W`,1 `D`, counter `X` đúng số lượng), spawn1 = (5.5, 3.5)

---

## T03 — Công thức & luật đĩa
**Phụ thuộc:** T01.

**Việc cần làm** (`core/src/recipes.ts`):
1. `RECIPES: Record<RecipeId, { id; name; ingredients: {id: IngredientId; state: IngredientState}[]; score }>` đúng bảng 5.4.
2. `sortContents(contents)` theo `PLATE_ORDER`.
3. `isValidOnPlate(ing: IngredientItem): boolean` (bun raw, meat cooked, lettuce chopped, tomato chopped).
4. `canAddToPlate(plate: PlateItem, ing: IngredientItem): boolean` theo 5.4.
5. `addToPlate(plate, ing): void` (mutate, giữ thứ tự sort). Ném lỗi nếu `canAddToPlate` false.
6. `matchRecipe(plate: PlateItem): RecipeId | null` — đĩa sạch có contents khớp **chính xác** một recipe. Đĩa bẩn → `null`.
7. `canChop(ing)` (id ∈ CHOPPABLE và state raw). `makeIngredient(id)` → raw. `makePlate(dirty=false)`.

**Nghiệm thu (test bằng Vitest, bảng chân trị):**
- [ ] `canAddToPlate`: đĩa rỗng + `bun:raw` ✔; + `bun:cooked` ✘; + `meat:raw` ✘; + `meat:burnt` ✘; + `lettuce:raw` ✘; đĩa có `bun` + thêm `bun` ✘; đĩa có `bun` + `tomato:chopped` ✔ (vì tập con của burger_tomato); đĩa có `lettuce`+`tomato` + `bun` ✘ (không tập con công thức nào); đĩa bẩn ✘
- [ ] `matchRecipe`: salad đủ ✔ bất kể thứ tự thêm; burger thiếu lettuce → null; burger_tomato đủ → `burger_tomato`; đĩa bẩn → null
- [ ] `contents` luôn đúng thứ tự `bun, meat, lettuce, tomato`

---

## T04 — Tạo GameState & khung `step`
**Phụ thuộc:** T02, T03.

**Việc cần làm:**
1. `sim/createState.ts`: `createGameState(level: LevelDef, playerIds: string[], seed: number): GameState`.
   - Người chơi `i` đặt tại `spawns[i]`, hướng nhìn `(0,1)` (xuống), `held=null`, `acting=false`, `ackSeq=0`.
   - Mỗi station khởi tạo đầy đủ mọi field (`item:null, progress:0, dirtyCount:0, cleanCount:0, pendingReturns:[]`); `plate_dispenser.cleanCount = level.plates`; `crate.crate` theo ký tự (T→tomato, L→lettuce, B→bun, M→meat).
   - `timeLeft = level.duration`, `nextOrderIn = ORDER_FIRST_AT`, `nextOrderId = 1`, `rngState = seed`.
   - Throw nếu `playerIds.length` ∉ [1,4] hoặc level không hợp lệ.
2. Helper `getStationAt(state, tx, ty): StationState | undefined` (dùng map index nội bộ hoặc tìm tuyến tính — được phép tìm tuyến tính vì ≤ 100 station; nhưng viết gọn một chỗ duy nhất).
3. `sim/step.ts`: `step(state: GameState, inputs: Record<string, PlayerInput | undefined>, dt = 1/SIM_HZ): GameEvent[]`. Thứ tự trong mỗi tick (CỐ ĐỊNH):
   1. Nếu `state.ended` → return `[]`.
   2. `state.tick++`; `state.timeLeft -= dt`.
   3. Với từng player (theo thứ tự mảng): áp input → `movePlayer` (T05) → nếu `input.interact` → `interact` (T06) → `updateAction` (T07).
   4. `tickStations` (T07: nấu, đĩa quay về).
   5. `tickOrders` (T08: spawn đơn, trừ thời gian, hết hạn).
   6. Nếu `timeLeft <= 0` → `timeLeft = 0; ended = true`.
   7. Trả về mọi event gom được.
   Ở T04 các bước 3–5 gọi tới hàm **rỗng tạm thời** (stub) để T05–T08 lấp.
4. `sim/snapshot.ts`: `toSnapshot(state): Snapshot` — **deep clone** các phần để snapshot không bị mutate sau này (dùng `structuredClone`; được phép vì Node 20 và trình duyệt hiện đại).

**Nghiệm thu:**
- [ ] Test: `createGameState(level1,['a','b'],1)` có 2 player đúng spawn; `stations.length` đúng; `plate_dispenser.cleanCount===4`; crate đúng nguyên liệu
- [ ] Test: gọi `step` 30 lần → `tick===30`, `timeLeft ≈ duration-1` (sai số 1e-9)
- [ ] Test: `step` khi `ended` không thay đổi state
- [ ] Test: `toSnapshot` rồi mutate state, snapshot không đổi
- [ ] Test: throw khi 0 hoặc 5 người chơi

---

## T05 — Di chuyển & va chạm
**Phụ thuộc:** T04.

**Việc cần làm** (`sim/movement.ts`): `movePlayer(state, player, input, dt)`.
1. Nếu `input` undefined → coi như `(0,0)`. Cập nhật `player.ackSeq = input.seq` khi có input (seq lớn hơn).
2. Vector `(mx,my)`; nếu cả hai ≠ 0 → nhân `1/√2`. Vị trí mới `dx = vx*PLAYER_SPEED*dt`.
3. Va chạm **tách trục**: thử di chuyển theo X, giải va chạm circle-vs-tile-AABB với mọi tile không phải `floor` trong vùng lân cận; sau đó thử theo Y. Hàm `resolveAxis`.
4. Giới hạn trong bản đồ.
5. Nếu `(mx,my) != (0,0)` → cập nhật `(fx,fy)` bằng vector normalized (8 hướng).
6. Export thêm hàm `simulateMove(x, y, mx, my, tiles, width, height, dt): {x,y,fx,fy}` **thuần**, `movePlayer` gọi hàm này — client sẽ tái sử dụng ở T24.

**Nghiệm thu (test):**
- [ ] Đi thẳng phải 1 giây từ giữa sàn không va → dịch đúng `PLAYER_SPEED` tile (sai số 1e-6)
- [ ] Đường chéo: quãng đường 1 giây = `PLAYER_SPEED` (không phải √2 lần)
- [ ] Đi vào tường: x không vượt `tileEdge - PLAYER_RADIUS` (không xuyên tường, kể cả `dt` lớn như 0.2s)
- [ ] Đi chéo vào tường: trượt dọc tường (thành phần song song vẫn di chuyển)
- [ ] Không bao giờ nằm trong tile không-floor sau 10.000 bước ngẫu nhiên (dùng RNG seed) trên level1
- [ ] `(fx,fy)` cập nhật đúng; đứng yên thì giữ nguyên hướng
- [ ] 2 người chơi đi xuyên qua nhau được

---

## T06 — Tương tác nhặt/đặt
**Phụ thuộc:** T05.

**Việc cần làm** (`sim/interact.ts`): `interact(state, player): GameEvent[]`.
1. Tính tile mục tiêu theo 5.5. Không phải station → `[]`.
2. Cài đặt **đúng bảng 5.5** cho: `counter, crate, cutting, stove, plate_dispenser, dish_return, sink, trash` bằng `switch` trên `station.type`, mỗi loại một hàm riêng (`interactCounter`, ...). Riêng `serve` để T08.
3. Phát event: `pickup` khi nhấc vật, `drop` khi đặt, `trash` khi bỏ rác, tọa độ = tâm tile station.
4. Mọi trường hợp "không làm gì" phải thật sự không thay đổi state.

**Nghiệm thu (mỗi dòng là ≥ 1 test):**
- [ ] crate: tay rỗng → nhận `raw`; tay có đồ → không đổi
- [ ] counter: đặt/nhặt; đặt khi đã có vật → không đổi; đĩa sạch trên bàn + cà chua chopped trong tay → cà chua vào đĩa; đĩa trong tay + nguyên liệu hợp lệ trên bàn → vào đĩa; nguyên liệu không hợp lệ (cà chua raw) → không đổi
- [ ] cutting: chỉ đặt được lettuce/tomato raw; không đặt được bun/meat/đĩa; nhặt → `progress=0`
- [ ] stove: chỉ đặt meat raw; nhặt được thịt cháy; đĩa sạch + thịt chín trên bếp → thịt vào đĩa, bếp trống; thịt cháy + đĩa → không đổi
- [ ] plate_dispenser: `cleanCount` giảm khi nhận, tăng khi trả đĩa rỗng; `cleanCount=0` thì không nhận được; đĩa có đồ không trả được
- [ ] dish_return, sink: đúng luật; đĩa bẩn vào sink → `dirtyCount++`
- [ ] trash: nguyên liệu bị xóa; đĩa sạch có đồ → còn đĩa rỗng; đĩa bẩn → không đổi
- [ ] Hướng nhìn sang tile floor → không làm gì; tile tường → không làm gì
- [ ] Tay chỉ cầm tối đa 1 vật (không có cách nào có 2)

---

## T07 — Hành động giữ phím + nấu ăn + đĩa quay về
**Phụ thuộc:** T06.

**Việc cần làm:**
1. `sim/action.ts`: `updateAction(state, player, input, dt): GameEvent[]` theo 5.6 (thái, rửa). Đặt `player.acting` đúng. Không reset `progress` khi dừng.
2. `sim/stations.ts`: `tickStations(state, dt): GameEvent[]`:
   - Bếp nấu theo 5.7 (`cook_done`, `burnt`).
   - `dish_return.pendingReturns`: trừ dt, phần tử ≤ 0 → xóa & `dirtyCount++`.
3. Nối vào `step` thay stub.

**Nghiệm thu (test):**
- [ ] Giữ `act` 3.0s (90 tick) trước thớt có cà chua raw, tay rỗng, đứng yên → `chopped` + event `chop_done`; ở 89 tick vẫn `raw`
- [ ] Giữ `act` nhưng đang di chuyển → không tiến triển; tay đang cầm đồ → không tiến triển
- [ ] Thái dở 1.5s, nhả phím 5s, giữ tiếp 1.5s → hoàn thành (progress giữ nguyên)
- [ ] Rửa: `sink.dirtyCount=2`, giữ 3s → `dirtyCount=1, cleanCount=1`; giữ tiếp 3s → `0/2`
- [ ] Thịt raw trên bếp: sau 8s `cooked`; thêm 6s `burnt`; lấy ra ở giây thứ 10 thì còn `cooked` và `progress=0`
- [ ] `pendingReturns [5]` → sau 5s (150 tick) `dirtyCount` +1 và mảng rỗng
- [ ] Hai người chơi cùng thái một thớt: tốc độ **không** nhân đôi, mỗi tick `progress` tăng tối đa `dt` (2 người cùng `act` thì chỉ tăng 1 lần). Có test xác nhận.

---

## T08 — Đơn hàng, phục vụ, điểm, hết giờ
**Phụ thuộc:** T07.

**Việc cần làm:**
1. `sim/orders.ts`:
   - `tickOrders(state, level, dt)` (cần truyền `LevelDef`/recipes weight: lưu `recipeWeights` vào `GameState` khi tạo — thêm field `recipeWeights: {id:RecipeId; weight:number}[]` và `starThresholds`, `patience` nếu cần; cập nhật `types.ts` + ghi vào DECISIONS).
   - Spawn, trừ thời gian, hết hạn theo 5.7.
   - `serveOrder(state, player, station): GameEvent[]` theo 5.5 (`serve`) + 5.7 (chọn đơn gần hết hạn nhất, tip, dish_return pendingReturns).
2. Nối `serve` vào `interact.ts`.
3. `calcStars(score, thresholds): 0|1|2|3`.
4. `buildResults(state): {score, stars, served, expired}`.

**Nghiệm thu (test):**
- [ ] Đơn đầu xuất hiện ở tick = `ORDER_FIRST_AT * SIM_HZ` (±1 tick); không bao giờ > `ORDER_MAX_ACTIVE` đơn cùng lúc (mô phỏng 180s với seed khác nhau)
- [ ] Cùng seed → danh sách đơn **giống hệt** qua 2 lần chạy
- [ ] Phục vụ salad khi `timeLeft=patience` → `score += 20 + 10 = 30`; khi `timeLeft = patience/2` → `20 + 5`
- [ ] Hai đơn salad cùng lúc: phục vụ 1 salad xóa đơn có `timeLeft` nhỏ hơn
- [ ] Đĩa sai/đĩa chưa đủ → event `serve_fail`, đĩa còn trong tay, điểm không đổi
- [ ] Đơn hết hạn → `score` giảm 10 nhưng không dưới 0; `expired++`
- [ ] Sau khi phục vụ, 5s sau có đĩa bẩn ở `dish_return` (có 2 `R` thì phân bổ đúng quy tắc)
- [ ] `timeLeft` về 0 → `ended=true`; `calcStars` đúng các biên (đúng bằng ngưỡng thì đạt)

---

## T09 — Bộ test tổng hợp & mô phỏng "bot nấu ăn"
**Phụ thuộc:** T08.

**Việc cần làm:**
1. Cấu hình coverage; bổ sung test cho tới khi `packages/core/src` ≥ 85%.
2. Viết `__tests__/fullPlaythrough.test.ts`: một **kịch bản tự động** (script input theo tick) mà 1 người chơi trên `level1` hoàn thành đúng 1 salad: lấy lettuce → thái → đặt lên bàn → lấy tomato → thái → lấy đĩa → gom nguyên liệu vào đĩa → đi tới cửa phục vụ → `serve_ok` → điểm > 0 → đĩa bẩn quay về → rửa đĩa → có đĩa sạch. Dùng helper `walkTo(state, playerId, tx, ty)` (viết trong `__tests__/helpers.ts`, tạo input di chuyển đơn giản theo trục) để script không phải đếm tick bằng tay.
3. Thêm kịch bản burger (thịt nấu chín → bun + thịt + lettuce).
4. Test "fuzz": 200 lần chạy 60s với input ngẫu nhiên (RNG seed) trên cả 3 level, kiểm tra các **bất biến**: người chơi luôn trong floor; `score ≥ 0`; mọi `held` hợp lệ (chỉ 1 vật, đĩa không có contents trùng id); `orders.length ≤ 4`; không ném lỗi; không có `NaN`.

**Nghiệm thu:**
- [ ] Coverage core ≥ 85% (đính kèm bảng coverage trong báo cáo)
- [ ] Hai playthrough pass; fuzz pass trên 3 level
- [ ] Tổng thời gian `pnpm --filter @kitchen/core test` < 30 giây

---

# PHASE 2 — SERVER

## T10 — Bootstrap server
**Phụ thuộc:** T00 (và T01 cho kiểu).

**Việc cần làm:**
1. `config.ts`: đọc `PORT` (mặc định 2567), `NODE_ENV`, `CORS_ORIGIN` (mặc định `*` ở dev), `CLIENT_DIST` (đường dẫn thư mục `apps/client/dist`, mặc định tính tương đối).
2. `index.ts`: tạo `express` app (JSON, CORS bằng middleware tự viết đơn giản), `GET /healthz` → `200 "ok"`, **phục vụ file tĩnh** từ `CLIENT_DIST` nếu tồn tại (kèm fallback `index.html` cho đường dẫn không phải `/api`, `/healthz`, `/matchmake`), tạo `http.createServer(app)`, `new Server({ transport: new WebSocketTransport({ server }) })` (kiểm tra docs 0.16), `gameServer.define('kitchen', KitchenRoom)`, listen.
3. `util/logger.ts` (levels info/warn/error, có timestamp, in JSON một dòng nếu `NODE_ENV=production`).
4. `KitchenRoom` bản tạm: `onCreate` log, `onJoin` log. Chưa có logic.
5. Graceful shutdown: bắt `SIGTERM/SIGINT` → `gameServer.gracefullyShutdown()`.

**Nghiệm thu:**
- [ ] `pnpm --filter @kitchen/server dev` chạy; `curl localhost:2567/healthz` = `ok`
- [ ] Dùng script `colyseus.js` ngắn trong test: `client.create('kitchen', {name:'A'})` thành công và nhận được `roomId`
- [ ] `pnpm --filter @kitchen/server build && node apps/server/dist/index.js` chạy được (core đã được bundle)

---

## T11 — Phòng chờ (lobby)
**Phụ thuộc:** T10.

**Việc cần làm:**
1. `rooms/roomCode.ts`: `generateRoomCode(isTaken: (code) => boolean): string` 4 ký tự từ `ROOM_CODE_ALPHABET`; thử tối đa 50 lần, quá thì ném lỗi. `onCreate` đặt `this.roomId = code` (ghi chú trong DECISIONS cách đã xác nhận với docs 0.16 cách ghi đè `roomId` đúng; nếu không khả thi thì dùng metadata `code` + endpoint `GET /api/rooms/:code` trả roomId, và cập nhật PROTOCOL.md).
2. `maxClients = MAX_PLAYERS`. `options.public` true → phòng được listing & `joinOrCreate` ghép được; false → `setPrivate(true)`.
3. `onJoin`: nếu `phase !== 'lobby'` → ném lỗi `ServerError(4001,'game_in_progress')`. Tạo `Member { id, name(sanitized), color(theo thứ tự trống), ready:false, connected:true, joinedAt }`. Người đầu tiên là host.
4. Xử lý message `ready`, `select_level` (host + level tồn tại), `start` (host; mọi thành viên khác `ready`; có ≥1 người) — chưa chạy game ở task này, chỉ đổi phase sang `countdown` rồi tạm quay `lobby` (T12 hoàn thiện).
5. Sau mỗi thay đổi → broadcast `lobby`. Gửi `lobby` cho client mới ngay sau join.
6. `onLeave` ở lobby: xóa member; nếu là host → người vào sớm nhất tiếp theo làm host; không còn ai → phòng tự hủy (`autoDispose` mặc định).
7. `util/sanitize.ts`: `sanitizeName(raw: unknown): string` theo mục 9; test ≥ 8 ca (rỗng, quá dài, ký tự điều khiển, emoji, toàn khoảng trắng, không phải string).
8. `util/rateLimit.ts`: `class TokenBucket` thuần (nhận `now` từ ngoài để test được).

**Nghiệm thu (test tích hợp với 3 client `colyseus.js`):**
- [ ] Client A tạo phòng → nhận `lobby` với `hostId=A`, mã 4 ký tự
- [ ] B `joinById(code)` thành công; cả A, B nhận `lobby` mới có 2 người; màu khác nhau
- [ ] B gửi `select_level` → bị bỏ qua (không phải host); A gửi → `levelId` đổi
- [ ] A rời → B thành host
- [ ] Phòng 4 người: người thứ 5 bị từ chối
- [ ] Vào mã sai → lỗi, không crash server
- [ ] Unit test `sanitizeName`, `TokenBucket`, `generateRoomCode` (không trùng với mã đã tồn tại)

---

## T12 — Vòng lặp game trong phòng
**Phụ thuộc:** T09, T11.

**Việc cần làm:**
1. `rooms/inputQueue.ts`: `class InputQueue` đúng mục 9 (`push(input)`, `next(): PlayerInput | undefined`, bỏ seq cũ, giới hạn `INPUT_QUEUE_MAX`, lặp lại input di chuyển cuối với `interact=false` khi rỗng). Unit test đầy đủ.
2. `start`: phase → `countdown` (broadcast `phase` với `countdown: 3,2,1` mỗi giây bằng `this.clock.setInterval`), rồi `playing`: tạo `GameState` bằng `createGameState(level, playerIds, seed)` (seed lấy `Date.now()` **ở server** là được).
3. `setSimulationInterval` + accumulator: mỗi tick cố định → gom input (`queue.next()` từng người) → `step()` → xử lý `GameEvent[]` bằng `broadcast('event', ...)`. Mỗi `SNAPSHOT_EVERY_N_TICKS` tick → `broadcast('snapshot', toSnapshot(state))`.
4. Khi `state.ended` → phase `finished`, `broadcast('results', buildResults(state))`, dừng step.
5. Message `input` chỉ nhận ở phase `playing`; validate bằng `isPlayerInput`.
6. `back_to_lobby` (host, sau `RESULTS_SECONDS`) hoặc tự động sau 60s → reset: `ready=false` cho mọi người, xóa state, phase `lobby`, broadcast `lobby`.
7. `ping` → `pong`.

**Nghiệm thu:**
- [ ] Test tích hợp: 2 client vào, ready, host start → nhận `phase countdown 3→2→1` rồi `playing`, sau đó nhận `snapshot` đều ~15/giây (đo 2 giây: 28–32 snapshot)
- [ ] Client gửi `input {seq,mx:1,my:0}` liên tục 30Hz → vị trí x tăng trong snapshot, `ackSeq` bám theo `seq`
- [ ] Gửi input sai (mx=5, thiếu trường) → bị bỏ qua, server không crash
- [ ] Cho level `duration` rút ngắn bằng biến môi trường `DEBUG_DURATION` (chỉ dùng cho test, ghi trong DECISIONS) → hết giờ nhận `results`, phase `finished`, rồi `back_to_lobby` đưa về `lobby`
- [ ] Unit test `InputQueue`: seq cũ bị bỏ; đầy hàng đợi bỏ cũ nhất; rỗng thì lặp lại hướng và `interact=false`
- [ ] CPU: 4 bot trong 60s, server dùng < 25% một core (ghi số đo vào báo cáo)

---

## T13 — Ổn định: rate-limit, ngắt kết nối, reconnect
**Phụ thuộc:** T12.

**Việc cần làm:**
1. Áp dụng `TokenBucket` cho mọi message theo mục 9; vượt giới hạn → bỏ message; đếm vi phạm, >50/10s → kick (`leave(4000)`).
2. Ngắt kết nối khi `phase ∈ {countdown, playing}`: `await this.allowReconnection(client, 30)`; đánh dấu `connected=false` (hiển thị cho client trong `lobby`), nhân vật đứng yên (input rỗng); reconnect thành công → `connected=true`, gửi lại `lobby`+`phase`+snapshot hiện tại ngay. Hết 30s → xóa người chơi khỏi `state.players` (vật đang cầm biến mất) và khỏi room. Nếu người đó là host → chuyển host.
3. Ngắt khi `lobby` → rời ngay (T11).
4. Nếu **không còn ai connected** trong game → dừng simulation, dispose phòng sau 30s.
5. `onError`/try-catch quanh mọi handler và `simulationInterval`: log + gửi `error` cho client liên quan, server không chết.
6. Giới hạn kích thước message: bỏ qua payload > 1KB (kiểm tra `JSON.stringify(payload).length` hoặc cấu hình transport `maxPayload`).

**Nghiệm thu (test tích hợp):**
- [ ] Client spam 500 input/giây → bị giới hạn; không làm ảnh hưởng client khác; > ngưỡng vi phạm thì bị kick
- [ ] Đang chơi, client B bị đóng kết nối đột ngột → A vẫn nhận snapshot; B reconnect trong 30s bằng `client.reconnect(token)` nhận lại state; sau 30s mà không quay lại thì B biến mất khỏi snapshot
- [ ] Gửi payload JSON rác/khổng lồ → không crash
- [ ] Host rớt mạng quá 30s → chuyển host đúng
- [ ] Tất cả rời → phòng bị hủy (kiểm tra `matchMaker.query` không còn phòng)

---

## T14 — Bot client để thử & kiểm thử tải
**Phụ thuộc:** T13.

**Việc cần làm** (`apps/server/scripts/bot.ts`, chạy bằng `pnpm --filter @kitchen/server bot -- --code ABCD --count 3`):
1. Bot kết nối bằng `colyseus.js`, `joinById(code)`; tự `ready`; gửi `input` 30Hz với **hành vi ngẫu nhiên có chủ đích**: đi tới ngẫu nhiên station kế tiếp (dùng snapshot + BFS đơn giản trên `tiles` từ level), bấm `interact`, đôi khi giữ `act` 3.2s.
2. Tham số: `--url`, `--code`, `--count`, `--name-prefix`, `--duration-sec`. Bot in 1 dòng/5s: số snapshot nhận, ping, điểm.
3. Chế độ `--create`: bot đầu tiên tạo phòng public và tự `start` khi đủ `--count` người.
4. Script test tải: `pnpm --filter @kitchen/server loadtest` tạo 5 phòng × 4 bot chạy 60s, in tổng hợp (snapshot/s trung bình, số lỗi, CPU/RAM server nếu đo được).

**Nghiệm thu:**
- [ ] Chạy 4 bot trên `level1` 3 phút → server không lỗi, bot có thể `serve_ok` ít nhất 1 lần (ghi log)
- [ ] 5 phòng × 4 bot chạy ổn 60s không crash, không rò RAM > 50MB
- [ ] README ngắn trong `apps/server/scripts/README.md`

---

# PHASE 3 — CLIENT

## T15 — Khung client & điều hướng màn hình
**Phụ thuộc:** T00, T01.

**Việc cần làm:**
1. `state/store.ts`: store pub/sub kiểu `createStore<T>(initial)` với `get()`, `set(patch)`, `subscribe(fn)`; store `app` gồm `{ screen: 'menu'|'lobby'|'game'|'results'; name; roomCode; lobby: LobbyPayload | null; results: ResultsPayload | null; error: string|null; ping: number }`.
2. `main.ts`: đọc store, mount/unmount từng screen vào `#app` (mỗi screen là hàm `mountXxx(root): () => void` trả về hàm dọn dẹp). Khởi tạo Phaser game **một lần**, ẩn/hiện `#game`.
3. `ui/theme.ts` (bảng màu, font), `ui/base.css` (reset, biến CSS, nút, input, toast), component nhỏ `ui/toast.ts` (`showToast(msg, kind)`, dùng `textContent`).
4. Font: dùng font hệ thống (`system-ui`), không tải font ngoài.
5. Tên người chơi lưu `localStorage` (khóa `ck_name`), bọc try/catch.

**Nghiệm thu:**
- [ ] `store` có unit test (Vitest + jsdom hoặc thuần): subscribe/unsubscribe, set patch
- [ ] Đổi `screen` bằng store hiển thị đúng màn hình; không rò listener (kiểm tra bằng test đếm subscriber sau mount/unmount 100 lần)
- [ ] Giao diện không vỡ ở 360×640 và 1920×1080

---

## T16 — Màn Menu & Lobby (giao diện)
**Phụ thuộc:** T15.

**Việc cần làm:**
1. **Menu:** logo chữ "Chaos Kitchen"; ô nhập tên (maxlength 16, bắt buộc không rỗng); nút **Tạo phòng**; nhóm **Vào bằng mã**: ô 4 ký tự (tự viết hoa, chỉ nhận ký tự trong `ROOM_CODE_ALPHABET`) + nút **Vào**; nút **Chơi nhanh**. Nút bị `disabled` khi tên rỗng/mã chưa đủ 4. Có hướng dẫn phím ngắn bên dưới.
2. **Lobby:** hiển thị mã phòng to + nút **Sao chép mã** (Clipboard API, fallback `execCommand`) + nút **Sao chép link mời** (`?room=ABCD` — khi mở link có `room` thì tự điền ô mã); danh sách người chơi (chấm màu, tên, huy hiệu 👑 host, trạng thái ✔ Sẵn sàng / ⏳, "mất kết nối" nếu `connected=false`); bộ chọn màn (3 level, chỉ host chọn được, người khác thấy nhưng disabled); nút **Sẵn sàng/Hủy sẵn sàng** (người không phải host); nút **Bắt đầu** (chỉ host; disabled nếu có người chưa sẵn sàng); nút **Rời phòng**. Hiển thị ping.
3. Giao diện nhận dữ liệu từ store; **hành động gọi các hàm của `NetClient`** (T17) — ở task này dùng `NetClient` giả (mock) để dựng giao diện, chưa cần mạng.
4. Hiển thị lỗi (`game_in_progress`, mã không tồn tại, phòng đầy) bằng toast thân thiện tiếng Việt.
5. Mọi dữ liệu người dùng render bằng `textContent`.
6. Hỗ trợ bàn phím: Enter ở ô tên/mã kích hoạt nút phù hợp; Tab thứ tự hợp lý; `aria-label` cho nút.

**Nghiệm thu:**
- [ ] Chụp ảnh/quan sát với mock: lobby 1, 3, 4 người, host/non-host, có người mất kết nối
- [ ] Nhập `<img src=x onerror=alert(1)>` làm tên → hiển thị như chữ thường, không chạy script
- [ ] Mở `/?room=ABCD` → ô mã được điền sẵn
- [ ] Không có lỗi/cảnh báo console

---

## T17 — NetClient (lớp kết nối)
**Phụ thuộc:** T11, T15.

**Việc cần làm** (`net/NetClient.ts`): lớp đóng gói `colyseus.js` — các lớp khác **không** import `colyseus.js` trực tiếp.
1. API: `createRoom(name, isPublic)`, `joinByCode(name, code)`, `quickMatch(name)`, `leave()`, `ready(bool)`, `selectLevel(id)`, `start()`, `sendInput(input)`, `sendEmote(id)`, `backToLobby()`; sự kiện (EventEmitter tự viết nhỏ): `onLobby`, `onPhase`, `onSnapshot`, `onEvent`, `onResults`, `onEmote`, `onError`, `onDisconnect`, `onPing`.
2. Tự cập nhật `store` khi nhận `lobby`/`phase`/`results`/`error` (screen: lobby→`lobby`, `playing`/`countdown`→`game`, results→`results`). Snapshot **không** đi qua store mà qua callback (hiệu năng).
3. Ping: gửi `ping {t: performance.now()}` mỗi 2s, nhận `pong` → `ping = now - t` (làm mượt EMA).
4. Reconnect: lưu `reconnectionToken` vào `sessionStorage`; khi mất kết nối bất ngờ (code ≠ 1000/4000) tự thử `reconnect` tối đa 6 lần cách nhau 2s; hiển thị toast "Đang kết nối lại…". Thành công thì khôi phục screen.
5. Map lỗi server sang thông điệp tiếng Việt trong 1 bảng duy nhất (`net/errors.ts`).
6. Lấy URL từ `getServerUrl()` (T00).

**Nghiệm thu:**
- [ ] Test tích hợp (Vitest, môi trường node) chạy server thật: 2 `NetClient` tạo/vào phòng, ready, start, nhận snapshot
- [ ] Thủ công: tắt/bật mạng 5s trong lúc chơi → tự kết nối lại
- [ ] Thay thế mock trong T16 bằng NetClient thật; tạo phòng ở tab 1, vào bằng mã ở tab 2, thấy cả hai trong lobby

---

## T18 — Phaser GameScene: vẽ bản đồ
**Phụ thuộc:** T02, T15.

**Việc cần làm:**
1. `game/GameScene.ts`: scene nhận `level: LevelDef` (qua `scene.start` data) → `parseLevel` → dựng nền. Hàm `layoutCamera()` căn bản đồ vào giữa, scale vừa khung (giữ tỉ lệ, chừa khoảng cho HUD ở trên 64px).
2. `game/render/MapRenderer.ts`: vẽ mỗi tile **một lần** vào `RenderTexture` (hoặc Graphics tĩnh): floor (ô cờ 2 sắc), wall (đậm), counter (nâu), crate (khay màu + emoji 🍅🥬🍞🥩), cutting (thớt + 🔪), stove (đen + vòng lửa 🔥 + hình chảo), plate_dispenser (🍽️ ngăn xếp), serve (cửa sổ xanh + 🔔), dish_return (🧺), sink (🚰), trash (🗑️). Mọi màu/emoji lấy từ `theme.ts`.
3. Khi nhận `level` mới thì dựng lại (destroy object cũ, không rò rỉ).
4. Chế độ debug (`?debug=1`): vẽ lưới & tọa độ tile.

**Nghiệm thu:**
- [ ] Cả 3 level hiển thị đúng và nhận diện được từng loại station bằng mắt
- [ ] Đổi kích thước cửa sổ → bản đồ co giãn đúng, không méo
- [ ] Chuyển level 20 lần liên tiếp không tăng số game object (in `scene.children.length` ở debug)

---

## T19 — Vẽ người chơi + nội suy
**Phụ thuộc:** T18, T17.

**Việc cần làm:**
1. `game/render/PlayerRenderer.ts`: mỗi người chơi: thân hình tròn màu `PLAYER_COLORS[i]` (bán kính `PLAYER_RADIUS*TILE_PX`), mắt/chấm chỉ **hướng nhìn** `(fx,fy)`, tên nhỏ phía trên (Text), viền sáng quanh người chơi cục bộ. Đồ đang cầm vẽ trước mặt (xem T21).
2. `game/net/SnapshotBuffer.ts`: lưu ≥ 3 snapshot kèm `recvTime`; hàm `sample(renderTime)` nội suy tuyến tính vị trí giữa 2 snapshot bao `renderTime = now - INTERP_DELAY_MS`; nếu thiếu dữ liệu thì ngoại suy tối đa 150ms rồi giữ nguyên. Hướng `(fx,fy)` lấy từ snapshot mới hơn (không nội suy).
3. Vẽ **tất cả** người chơi (kể cả mình) theo nội suy ở task này.
4. Hoạt hình nhún nhẹ khi đang di chuyển (so vị trí giữa 2 frame) — đơn giản bằng `sin`.
5. Khi có người chơi mới/rời → tạo/hủy renderer tương ứng.

**Nghiệm thu:**
- [ ] Unit test `SnapshotBuffer.sample` (thuần, truyền `now` giả): nội suy giữa 2 điểm đúng; trước điểm đầu; sau điểm cuối (ngoại suy giới hạn)
- [ ] Mở 2 tab, người chơi ở tab kia di chuyển mượt (không giật) ở mạng cục bộ; nếu giả lập mạng chậm (Chrome DevTools Slow 3G/latency 150ms) vẫn mượt, chỉ trễ
- [ ] Hướng nhìn đúng 8 hướng

---

## T20 — Điều khiển (bàn phím + cảm ứng)
**Phụ thuộc:** T19.

**Việc cần làm:**
1. `game/InputController.ts`: đọc phím (WASD/mũi tên di chuyển; Space/E interact; Shift/F giữ `act`; 1–4 emote). Xử lý chuẩn: hai phím đối nhau triệt tiêu; mất focus cửa sổ (`blur`) → thả hết phím; không `preventDefault` làm hỏng ô nhập (chỉ chặn khi screen = game).
2. **Bộ phát input cố định 30Hz**: accumulator trong `update` (hoặc `setInterval` 33ms với bù trừ) tạo `PlayerInput { seq++, mx,my, act, interact }`; `interact` là cờ cạnh lên (edge) — **nếu người chơi bấm trong khoảng giữa 2 lần gửi thì vẫn phải được gửi đúng 1 lần** (dùng cờ `pendingInteract`). Gọi `net.sendInput`. Lưu input vào `inputHistory` (vòng, 120 phần tử) phục vụ T24.
3. Cảm ứng (chỉ hiện khi `matchMedia('(pointer: coarse)')`): **joystick ảo** bên trái (đưa về 8 hướng với vùng chết 20%), 2 nút bên phải: **Nhặt/Đặt** (interact) và **Thái/Rửa** (giữ = act). Hỗ trợ đa chạm (vừa đi vừa bấm).
4. Chỉ gửi input khi phase `playing`; không gửi khi đang `countdown`.

**Nghiệm thu:**
- [ ] Thủ công: di chuyển được người chơi trong game thật (cùng server T12) bằng bàn phím, mượt
- [ ] Test thuần cho bộ trộn phím → `(mx,my)` (đối nhau triệt tiêu, chéo đúng)
- [ ] Gõ nhanh 20 lần Space → server nhận đúng ~20 `interact=true` (log đếm ở debug, không mất không dư)
- [ ] Alt-Tab khi đang giữ phím → nhân vật dừng
- [ ] Mobile (DevTools mô phỏng): joystick + nút hoạt động đồng thời

---

## T21 — Vẽ vật phẩm, trạng thái station, thanh tiến độ, ô mục tiêu
**Phụ thuộc:** T20.

**Việc cần làm:**
1. `game/render/ItemRenderer.ts`: hàm vẽ `Item` dùng chung (cho tay người chơi và trên station). Quy ước hình:
   - Nguyên liệu: emoji (🍅 cà chua, 🥬 xà lách, 🍞 bun, 🥩 thịt) + biểu thị trạng thái: `chopped` = emoji nhỏ hơn có chấm cắt (hoặc 2 mảnh), `cooked` = nền nâu, `burnt` = đen + 💨.
   - Đĩa: hình tròn trắng; `dirty` = xám có chấm nâu; `contents` = các emoji nhỏ xếp trong đĩa theo thứ tự.
2. `game/render/StationRenderer.ts`: mỗi frame cập nhật theo snapshot: vật trên counter/cutting/stove; số đĩa sạch trên `plate_dispenser` (chồng đĩa, hiển thị số); số đĩa bẩn trên `dish_return` & `sink`; số đĩa sạch ở `sink`.
3. **Thanh tiến độ** phía trên station khi: thớt `progress>0` (xanh lá, tỉ lệ `progress/CHOP_TIME`); bếp có thịt (cam → đỏ khi sắp cháy; khi `cooked` thanh đếm tới cháy và **nhấp nháy** khi còn < 2s); bồn rửa `progress>0` (xanh dương).
4. **Ô mục tiêu**: highlight viền vàng tile mà người chơi cục bộ đang nhìn (tính bằng đúng công thức 5.5 từ vị trí/hướng trong snapshot; dùng chung hàm `getTargetTile` đặt ở `core` — thêm vào `core/src/sim/interact.ts` + test).
5. Không tạo/hủy object mỗi frame: dùng pool hoặc cập nhật in-place.

**Nghiệm thu:**
- [ ] Chơi thật: thấy rõ cà chua → thái (thanh chạy) → chopped; thịt chín → cháy có cảnh báo; đĩa gom đủ nguyên liệu hiển thị đúng
- [ ] `getTargetTile` có unit test (8 hướng, sát tường)
- [ ] Số game object ổn định theo thời gian (không tăng) khi chơi 2 phút
- [ ] FPS ≥ 55 trên máy trung bình với 4 người chơi (đo `game.loop.actualFps`, ghi vào báo cáo)

---

## T22 — HUD (đơn hàng, giờ, điểm)
**Phụ thuộc:** T21.

**Việc cần làm:** (DOM overlay `ui/hud.ts` + `hud.css`, cập nhật theo snapshot nhưng **chỉ ghi DOM khi giá trị thay đổi**)
1. Góc trên giữa: đồng hồ `m:ss` (đỏ nhấp nháy khi ≤ 20s). Góc trên trái: **điểm** (có hiệu ứng +N bay lên khi tăng, dùng `event serve_ok`).
2. **Thanh đơn hàng** dưới trên cùng: mỗi đơn là 1 thẻ: tên món (VN), danh sách nguyên liệu bằng emoji kèm trạng thái (🔪 nếu cần thái, 🔥 nếu cần nấu), **thanh kiên nhẫn** (xanh→vàng→đỏ theo `timeLeft/patience`). Thẻ mới trượt vào, thẻ hoàn thành sáng xanh rồi biến mất, hết hạn rung đỏ rồi biến mất.
3. Phần đếm ngược trước ván: số **3-2-1-Bắt đầu!** to giữa màn hình (theo `phase`).
4. Góc phải: ping + nút âm thanh bật/tắt (chuẩn bị cho T25), nút ⏸ **không có** (game online không tạm dừng).
5. Toast sự kiện nhỏ: "Đĩa sai!" khi `serve_fail`; "Thịt cháy!" khi `burnt`.

**Nghiệm thu:**
- [ ] HUD hiển thị đúng tên/nguyên liệu 3 món
- [ ] Hết hạn/hoàn thành đơn có hiệu ứng đúng
- [ ] Khi snapshot không thay đổi giá trị, không có thao tác ghi DOM (kiểm tra bằng đếm trong debug)
- [ ] Hiển thị tốt ở 360px chiều ngang (thẻ đơn thu nhỏ, cuộn ngang nếu cần)

---

## T23 — Màn kết quả & vòng lặp chơi lại
**Phụ thuộc:** T22, T14.

**Việc cần làm:**
1. `ui/results.ts`: hiển thị **số sao** (animation lần lượt), điểm, số đơn phục vụ, số đơn hết hạn; nút **Chơi tiếp** (host; disabled đến khi qua `RESULTS_SECONDS`, hiển thị đếm ngược), người khác thấy "Đang chờ chủ phòng…"; nút **Rời phòng**.
2. Khi nhận `phase: lobby` → quay về màn lobby, giữ nguyên phòng; `ready` được reset.
3. Dọn dẹp: khi rời `game` thì hủy mọi renderer/handler input, không rò listener (kiểm tra bằng debug).
4. **Kiểm thử "chơi trọn vòng"**: viết `docs/QA_CHECKLIST.md` mục "Luồng chính" và tự chạy theo đó với 2 tab.

**Nghiệm thu (MỐC QUAN TRỌNG — game chơi được):**
- [ ] 2 người (2 tab/2 máy) tạo phòng bằng mã → chọn level → start → nấu và phục vụ ít nhất 1 món cùng nhau → hết giờ → thấy kết quả → "Chơi tiếp" → lại lobby → chơi level khác
- [ ] Lặp 5 vòng liên tiếp không lỗi, không tăng RAM bất thường (ghi nhận)
- [ ] Người thứ 3 vào giữa ván bị từ chối với thông báo rõ ràng
- [ ] Đóng 1 tab giữa ván → người còn lại chơi tiếp bình thường

---

## T24 — Dự đoán phía client (client-side prediction) + hòa giải
**Phụ thuộc:** T23.

**Mục tiêu:** nhân vật của mình phản hồi tức thì, không trễ theo ping.

**Việc cần làm:**
1. Client giữ **bản sao state di chuyển cục bộ** `{x,y,fx,fy}` của người chơi cục bộ. Mỗi lần phát input (T20): gọi **`simulateMove` từ core (T05)** với `dt = 1/SIM_HZ` để cập nhật ngay và vẽ vị trí dự đoán.
2. Khi nhận snapshot: lấy `ackSeq` của mình; bỏ khỏi `inputHistory` mọi input có `seq <= ackSeq`; **đặt lại** vị trí = vị trí snapshot rồi **phát lại (replay)** các input chưa ack bằng `simulateMove`.
3. Làm mượt hiệu chỉnh: nếu sai lệch giữa dự đoán và kết quả replay `< 0.05` tile thì bỏ qua; `0.05–1.5` thì **lerp** về trong ~100ms; `> 1.5` thì snap.
4. Chỉ dự đoán **di chuyển**. Mọi thứ khác (nhặt/đặt/thái/điểm) vẫn chờ server.
5. Bật/tắt bằng cờ `?pred=0` để so sánh khi debug.
6. Vị trí dự đoán dùng để vẽ nhân vật cục bộ và ô mục tiêu.

**Nghiệm thu:**
- [ ] Test thuần cho module `Predictor`: cho chuỗi input + snapshot trễ, kết quả cuối khớp server trong sai số 1e-6 khi không có sai khác; khi server từ chối di chuyển (va tường khác biệt giả lập) thì hòa giải đúng
- [ ] Với latency giả lập 200ms, nhân vật cục bộ đổi hướng **ngay lập tức**; không có hiện tượng "kéo lại" (rubber-banding) khi đi thẳng và khi trượt dọc tường
- [ ] `?pred=0` quay về hành vi cũ

---

## T25 — Âm thanh & hiệu ứng ("juice")
**Phụ thuộc:** T23 (có thể song song T24).

**Việc cần làm:**
1. `game/audio/Sfx.ts`: **tổng hợp bằng WebAudio** (không file âm thanh): `chop` (click ngắn lặp khi đang thái), `cook_done` (ding), `burnt` (buzz thấp), `serve_ok` (hợp âm vui), `serve_fail` (bíp thấp), `order_new` (chuông nhẹ), `pickup`/`drop` (pop nhỏ), `wash_done`, `countdown` (bíp 3-2-1, "go" cao hơn), `timeup`. Khởi tạo `AudioContext` chỉ sau tương tác đầu tiên (chính sách autoplay).
2. Phát âm theo `event` từ server; âm lượng giảm theo khoảng cách tới người chơi cục bộ (tối thiểu 30%).
3. Nhạc nền nhẹ bằng chuỗi nốt lặp (oscillator) ở lobby và ván; nút bật/tắt (HUD T22) lưu `localStorage` (`ck_sound`); mặc định **tắt nhạc nền, bật SFX**.
4. Hiệu ứng hình: hạt (particle) nhỏ khi `serve_ok` (confetti), khói khi `burnt`, tia sáng khi `chop_done`; rung nhẹ nhân vật khi `serve_fail`. Dùng pool hạt (≤ 100).

**Nghiệm thu:**
- [ ] Tất cả event đều có âm; bật/tắt hoạt động; không có tiếng khi tắt
- [ ] Không lỗi "AudioContext was not allowed to start" trong console
- [ ] FPS không giảm quá 3 so với trước khi thêm hiệu ứng

---

## T26 — Emote & cải thiện giao tiếp
**Phụ thuộc:** T25.

**Việc cần làm:**
1. Phím **1–4** (và 4 nút nhỏ trên mobile) gửi `emote`; server broadcast `{playerId, id}` (đã có rate-limit). Biểu tượng: 1 = 👍, 2 = ❓, 3 = 🔥 (gấp!), 4 = 😅.
2. Client hiển thị bong bóng emoji phía trên đầu nhân vật 2 giây (fade out), tái dùng object.
3. Hiển thị tên người đang `connected=false` mờ đi + biểu tượng 📶❌.

**Nghiệm thu:**
- [ ] Hai tab thấy emote của nhau; spam phím không làm quá 1 emote/1.5s
- [ ] Emote không phá vỡ hiển thị khi nhân vật ra rìa bản đồ

---

## T27 — Hoàn thiện responsive/mobile & trải nghiệm
**Phụ thuộc:** T26.

**Việc cần làm:**
1. Kiểm tra toàn bộ luồng trên viewport 360×640 (dọc, hiển thị khuyến nghị xoay ngang bằng overlay), 812×375 (ngang), 1366×768, 1920×1080.
2. Ngăn zoom/cuộn trang khi chạm (`touch-action: none` trên canvas, `user-scalable=no`), ngăn menu ngữ cảnh khi nhấn giữ.
3. Màn hình **hướng dẫn chơi** (nút "?" ở menu): các phím, mục tiêu, 3 công thức kèm hình emoji; hiển thị 1 lần đầu tiên (cờ `localStorage`).
4. Màn hình tải: hiển thị "Đang kết nối máy chủ…" khi tạo/vào phòng; timeout 10s → lỗi thân thiện.
5. Tiêu đề tab đổi theo trạng thái ("Chaos Kitchen — Phòng ABCD"). Thêm favicon bằng emoji SVG data URI.
6. Tối ưu bundle: `vite build` < 1.5MB gzip tổng; bật code-splitting nếu cần; cảnh báo kích thước trong báo cáo.

**Nghiệm thu:**
- [ ] Danh sách viewport ở trên đều dùng được; ảnh chụp đính kèm (hoặc mô tả) trong báo cáo
- [ ] Lighthouse (desktop) Performance ≥ 80 cho trang menu (ghi điểm)
- [ ] Hướng dẫn chơi hiển thị đúng và đóng được bằng phím Esc

---

# PHASE 4 — ĐƯA LÊN MẠNG & HOÀN TẤT

## T28 — Docker & triển khai
**Phụ thuộc:** T27.

**Việc cần làm:**
1. `Dockerfile` multi-stage: stage `build` (node:20-alpine, bật corepack pnpm, `pnpm install --frozen-lockfile`, `pnpm build`); stage `runtime` (node:20-alpine, chỉ copy `apps/server/dist`, `apps/client/dist`, user không phải root, `ENV NODE_ENV=production PORT=2567 CLIENT_DIST=/app/client`, `EXPOSE 2567`, `HEALTHCHECK` gọi `/healthz`, `CMD ["node","server/index.js"]`). Image < 250MB.
2. `.dockerignore` đầy đủ.
3. `docs/DEPLOY.md`: hướng dẫn từng bước triển khai (a) chạy local bằng `docker run -p 2567:2567`, (b) **Fly.io** (`fly launch`, `fly.toml` mẫu: `internal_port=2567`, `force_https`, **1 máy duy nhất** vì state phòng nằm trong RAM — ghi rõ), (c) **Render/Railway** (web service Docker, biến môi trường). Ghi chú WebSocket phải được bật và timeout idle ≥ 60s.
4. Client production tự dùng `wss://` theo `location` (xác nhận hoạt động qua HTTPS).
5. Thêm script `pnpm docker:build`, `pnpm docker:run`.

**Nghiệm thu:**
- [ ] `docker build` thành công; `docker run -p 2567:2567` → mở `http://localhost:2567` chơi được 2 tab đầy đủ luồng
- [ ] Container chạy bằng user không phải root; `/healthz` hoạt động; `docker stop` thoát sạch trong < 10s
- [ ] `DEPLOY.md` đủ để người không rành làm theo (có lệnh cụ thể)

---

## T29 — E2E test tự động (Playwright)
**Phụ thuộc:** T28.

**Việc cần làm:**
1. Cài `@playwright/test` ở gốc (chỉ chromium). Script `pnpm e2e`: tự build, chạy server production trên cổng ngẫu nhiên, chạy test.
2. Gắn `data-testid` cho các phần tử chính (ô tên, nút Tạo phòng, ô mã, nút Vào, mã phòng, nút Sẵn sàng, nút Bắt đầu, chọn level, điểm, đồng hồ, màn kết quả). Cho phép đọc trạng thái game qua `window.__ck_debug` **chỉ khi `?debug=1`** (snapshot mới nhất).
3. Kịch bản: (1) 2 browser context: A tạo phòng; B vào bằng mã; B ready; A start; kiểm tra đếm ngược → ván; kiểm tra cả hai thấy cả hai nhân vật; (2) A giữ phím `D` 1s → vị trí A tăng trong snapshot ở cả hai context; (3) với `DEBUG_DURATION=10`, kết thúc ván → màn kết quả → Chơi tiếp → lobby; (4) vào mã sai → toast lỗi; (5) người thứ 3 vào giữa ván bị từ chối.
4. Chạy ổn định 5 lần liên tiếp không flaky.

**Nghiệm thu:**
- [ ] `pnpm e2e` xanh 5/5 lần
- [ ] Ảnh chụp lỗi/trace lưu ở `playwright-report/` khi fail
- [ ] Thời gian chạy tổng < 3 phút

---

## T30 — Tài liệu & phát hành MVP
**Phụ thuộc:** T29.

**Việc cần làm:**
1. `README.md`: giới thiệu, ảnh/GIF (nếu chụp được), cách chạy dev, build, test, e2e, Docker, cấu trúc repo, sơ đồ kiến trúc (Mermaid: client ↔ server ↔ core), cách thêm level mới (5 bước, kèm lệnh validate), cách thêm công thức mới (file nào cần sửa), giới hạn đã biết.
2. `docs/QA_CHECKLIST.md`: danh sách kiểm thử thủ công đầy đủ (≥ 40 mục) chia nhóm: Lobby, Di chuyển, Từng loại station, Đơn hàng/điểm, Mạng (ngắt/reconnect), Mobile, Âm thanh, Hiệu năng.
3. Chạy toàn bộ QA_CHECKLIST, ghi kết quả (pass/fail + ghi chú) vào cuối file; **sửa mọi bug mức nghiêm trọng** (crash, kẹt, mất đồng bộ) phát hiện được; bug nhỏ ghi `docs/IDEAS.md`.
4. Thêm lệnh `pnpm validate:levels` (script chạy `validateLevel` cho mọi level, exit code ≠ 0 nếu lỗi) và nối vào `pnpm test`/CI.
5. (Tùy chọn nhưng khuyến nghị) GitHub Actions `.github/workflows/ci.yml`: cài đặt, typecheck, lint, test, build, e2e.
6. Gắn tag `v0.1.0`.

**Nghiệm thu:**
- [ ] README đủ để một dev mới chạy được game trong 5 phút
- [ ] QA checklist đã chạy và có kết quả; không còn bug nghiêm trọng
- [ ] CI xanh (nếu có)
- [ ] 4 người chơi thật (hoặc 3 tab + 1 bot) chơi trọn 3 level liên tiếp không lỗi

---

# PHỤ LỤC A — Backlog sau MVP (KHÔNG làm nếu chưa được giao)

Level mới (súp, pizza, nước) · nhiều loại dụng cụ (nồi, chảo cầm được) · dash/ném đồ · bẫy môi trường (lửa lan, sàn di chuyển) · tài khoản & bảng xếp hạng · chọn skin/mũ · chế độ đối kháng 2 đội · spectator · scale ngang nhiều server (Redis presence) · sprite/art thật + tilemap · phát lại ván (replay từ input log) · gamepad.

# PHỤ LỤC B — Mẫu câu lệnh giao việc cho AI

```
Bạn là lập trình viên của dự án Chaos Kitchen.
1) Đọc toàn bộ 01_CODING_RULES.md và tuân thủ tuyệt đối.
2) Thực hiện đúng task <T__> trong 02_TASKS.md (và chỉ task này).
3) Chạy typecheck/lint/test, tự tick từng tiêu chí nghiệm thu bằng bằng chứng thật.
4) Báo cáo theo mẫu mục 12 của rules. Nếu mơ hồ → chọn phương án đơn giản nhất, ghi vào docs/DECISIONS.md.
```

# PHỤ LỤC C — Khi AI làm sai / kẹt

- **AI viết luật game trong Room/Scene** → yêu cầu chuyển vào `core` (Rule R2) và thêm test.
- **AI dùng API Colyseus cũ** → yêu cầu đối chiếu docs 0.16, dán đoạn docs liên quan.
- **AI "làm thêm" ngoài task** → yêu cầu revert phần ngoài phạm vi, ghi vào `IDEAS.md`.
- **AI báo xong nhưng test đỏ** → dán output lỗi, yêu cầu sửa; không sang task mới khi repo còn đỏ.
- **Task quá lớn so với một lượt** → yêu cầu AI tự chia nhỏ thành các commit theo từng "Việc cần làm", làm tuần tự từng mục.
