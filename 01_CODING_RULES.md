# 01 — QUY TẮC CODE & ĐẶC TẢ DỰ ÁN "CHAOS KITCHEN"

> **Gửi AI code:** Đây là tài liệu BẮT BUỘC đọc hết trước khi làm BẤT KỲ task nào trong `02_TASKS.md`.
> Nếu task mâu thuẫn với file này → **file này thắng**, và bạn phải ghi mâu thuẫn vào `docs/DECISIONS.md`.
> Tuyệt đối không tự ý đổi công nghệ, cấu trúc thư mục, giao thức mạng đã quy định ở đây.

---

## 0. Cách làm việc (Workflow bắt buộc cho MỖI task)

1. Đọc lại file này + đọc task được giao + đọc các task nó phụ thuộc (`Phụ thuộc`).
2. Chạy `pnpm install && pnpm -r typecheck && pnpm -r test` để chắc chắn repo đang xanh TRƯỚC khi sửa.
3. Làm ĐÚNG và ĐỦ phạm vi task. **Không làm thêm tính năng ngoài task** ("scope creep" bị cấm). Muốn đề xuất thêm → ghi vào `docs/IDEAS.md`.
4. Nếu gặp điều mơ hồ: chọn phương án đơn giản nhất phù hợp file này, **ghi lại giả định** vào `docs/DECISIONS.md` (mỗi dòng: ngày, task, quyết định, lý do). Không dừng lại hỏi trừ khi bị chặn hoàn toàn.
5. Tự chạy lại: `pnpm -r typecheck && pnpm -r lint && pnpm -r test` — tất cả phải xanh.
6. Tự kiểm tra từng ô `[ ]` trong "Tiêu chí nghiệm thu" của task, rồi báo cáo theo mẫu ở mục 12.
7. Commit theo mục 11. Mỗi task = 1 hoặc nhiều commit nhỏ, không commit code lỗi build.

---

## 1. Sản phẩm

Game web co-op nấu ăn kiểu Overcooked, nhìn từ trên xuống (top-down 2D), **chơi online 1–4 người** trong cùng một phòng, tất cả là đồng đội: cùng nhận đơn, cùng nấu, cùng phục vụ để lấy điểm trong thời gian giới hạn.

**MVP (phải chơi được) gồm:**
- Màn hình menu: nhập tên → Tạo phòng / Vào phòng bằng mã 4 ký tự / Chơi nhanh (ghép phòng công khai).
- Lobby: danh sách người chơi, nút sẵn sàng, chủ phòng chọn màn và bấm Bắt đầu.
- 3 màn chơi (level) với độ khó tăng dần.
- Cơ chế: di chuyển, nhặt/đặt đồ, thái, nấu, lắp đĩa, phục vụ, rửa đĩa, thùng rác, đơn hàng có thời gian, điểm, sao.
- Màn kết quả, quay lại lobby chơi tiếp.
- Chạy mượt trên Chrome/Edge/Firefox/Safari desktop; điều khiển cảm ứng cơ bản trên mobile.
- Triển khai được bằng 1 Docker image.

**Không nằm trong MVP:** tài khoản/đăng nhập, database, bảng xếp hạng, chat văn bản, voice, shop skin, nhiều server/scale ngang, level editor.

---

## 2. Công nghệ (CỐ ĐỊNH — không đổi)

| Hạng mục | Lựa chọn |
|---|---|
| Ngôn ngữ | **TypeScript 5.x, `strict: true`** cho toàn bộ repo |
| Package manager | **pnpm 9** (workspace), **Node 20 LTS** |
| Client render | **Phaser 3 (>=3.80)**, chế độ Canvas/WebGL auto, **không dùng asset ngoài** ở MVP (vẽ bằng hình học + emoji) |
| Client UI (menu/lobby/HUD) | **TypeScript thuần + DOM + CSS**, không React/Vue |
| Client build | **Vite 5** |
| Server | **Node 20 + Express 4 + Colyseus 0.16** (`@colyseus/core`, `@colyseus/ws-transport`, client `colyseus.js` 0.16) |
| Đồng bộ trạng thái | **Server-authoritative**, gửi **snapshot JSON** qua `room.broadcast` (KHÔNG dùng `@colyseus/schema` cho game state) |
| Test | **Vitest** (core + server), **Playwright** (e2e, task cuối) |
| Lint/format | ESLint (typescript-eslint) + Prettier |
| Build server | `tsup` (bundle cả `@kitchen/core`), dev dùng `tsx watch` |
| Deploy | Docker multi-stage, 1 process Node phục vụ cả WebSocket lẫn file tĩnh của client |

> Colyseus đổi API giữa các phiên bản. **Luôn đối chiếu docs.colyseus.io đúng bản 0.16** trước khi viết code Room/Client; không dùng API của bản 0.14/0.15 theo trí nhớ.
> Khi cài package: **ghim phiên bản chính xác** (không dùng `^`/`~`) trong `package.json`.

---

## 3. Cấu trúc repo (CỐ ĐỊNH)

```
chaos-kitchen/
├─ package.json                # scripts gốc
├─ pnpm-workspace.yaml
├─ tsconfig.base.json
├─ .eslintrc.cjs  .prettierrc  .editorconfig  .gitignore  .nvmrc
├─ Dockerfile  .dockerignore
├─ README.md
├─ docs/
│  ├─ DECISIONS.md   IDEAS.md   PROTOCOL.md   QA_CHECKLIST.md   DEPLOY.md
├─ packages/
│  └─ core/                    # @kitchen/core — LOGIC THUẦN, dùng chung client + server
│     ├─ package.json  tsconfig.json  vitest.config.ts
│     └─ src/
│        ├─ index.ts           # chỉ re-export
│        ├─ constants.ts       # mọi hằng số game (mục 5)
│        ├─ types.ts           # kiểu dữ liệu game (mục 5.2)
│        ├─ protocol.ts        # kiểu message mạng (mục 6)
│        ├─ rng.ts             # RNG có seed (mulberry32)
│        ├─ recipes.ts         # công thức + hàm kiểm tra đĩa
│        ├─ level.ts           # parse + validate level ASCII
│        ├─ levels/            # level1.ts level2.ts level3.ts index.ts
│        ├─ sim/
│        │  ├─ createState.ts  # tạo GameState từ level
│        │  ├─ movement.ts     # di chuyển + va chạm
│        │  ├─ interact.ts     # nhặt/đặt đồ
│        │  ├─ action.ts       # thái/rửa (giữ phím)
│        │  ├─ stations.ts     # nấu ăn, dish return tick
│        │  ├─ orders.ts       # đơn hàng, phục vụ, điểm
│        │  ├─ step.ts         # hàm step(state, inputs, dt) tổng hợp
│        │  └─ snapshot.ts     # GameState -> Snapshot
│        └─ __tests__/
├─ apps/
│  ├─ server/                  # @kitchen/server
│  │  ├─ package.json  tsconfig.json  tsup.config.ts
│  │  └─ src/
│  │     ├─ index.ts           # bootstrap express + colyseus
│  │     ├─ config.ts          # đọc env (PORT, ...)
│  │     ├─ rooms/KitchenRoom.ts
│  │     ├─ rooms/roomCode.ts
│  │     ├─ rooms/inputQueue.ts
│  │     ├─ util/rateLimit.ts  util/sanitize.ts  util/logger.ts
│  │     └─ __tests__/
│  │  └─ scripts/bot.ts        # bot test client
│  └─ client/                  # @kitchen/client
│     ├─ package.json  tsconfig.json  vite.config.ts  index.html
│     └─ src/
│        ├─ main.ts            # khởi động, router màn hình
│        ├─ net/NetClient.ts
│        ├─ ui/                # screens (menu, lobby, hud, results), css
│        ├─ game/              # Phaser: GameScene, renderers, input, prediction, audio
│        └─ state/store.ts
```

**Quy tắc phụ thuộc (import) — tuyệt đối tuân thủ:**
- `core` KHÔNG import từ `server`, `client`, `phaser`, `colyseus`, `express`, hay bất kỳ API Node/DOM nào (`window`, `document`, `fs`, `Date.now`, `Math.random`...).
- `server` chỉ import `@kitchen/core` + thư viện server.
- `client` chỉ import `@kitchen/core` + thư viện client. **Client không bao giờ import code từ `server`** và ngược lại.

---

## 4. Nguyên tắc kiến trúc BẤT BIẾN

- **R1. Server là nguồn sự thật.** Client chỉ gửi *ý định* (input). Client không bao giờ tự quyết định điểm, đơn hàng, trạng thái nguyên liệu, va chạm "thật".
- **R2. Toàn bộ luật chơi nằm trong `@kitchen/core`** dưới dạng hàm thuần (pure function) / cấu trúc dữ liệu thuần JSON. Server gọi `step()`; client (khi dự đoán) gọi lại đúng hàm di chuyển của core. **Cấm viết luật chơi trong Room hay Scene.**
- **R3. Core phải deterministic:** cùng `(state, inputs, dt)` → cùng kết quả. Cấm `Math.random()`, `Date.now()`, `performance.now()`, `new Date()` trong core. Dùng RNG có seed trong state (`state.rngState`).
- **R4. Bước thời gian cố định:** mô phỏng chạy ở `SIM_HZ = 30` (dt = 1/30 s). Cấm dùng dt thay đổi trong core.
- **R5. State của core là JSON thuần** (object/array/number/string/boolean/null). Cấm `Map`, `Set`, class instance, function, `undefined` trong state — để clone/serialize dễ.
- **R6. Đơn vị tọa độ trong core là "tile"** (số thực), gốc (0,0) ở góc trên-trái, x sang phải, y xuống dưới. Chỉ client mới nhân với `TILE_PX` để vẽ.
- **R7. Mọi input từ client đều không đáng tin:** server validate kiểu, miền giá trị, tần suất (mục 9).
- **R8. Không dùng biến global có thể thay đổi** (singleton state) trong core/server. Mỗi room có state riêng.

---

## 5. ĐẶC TẢ GAME (nguồn sự thật cho mọi task)

### 5.1 Hằng số (đặt trong `core/src/constants.ts`, export `const`)

| Tên | Giá trị | Ý nghĩa |
|---|---|---|
| `SIM_HZ` | 30 | Tick mô phỏng/giây |
| `SNAPSHOT_EVERY_N_TICKS` | 2 | Gửi snapshot mỗi 2 tick (15Hz) |
| `TILE_PX` | 64 | Chỉ dùng ở client |
| `PLAYER_SPEED` | 5.0 | tile/giây |
| `PLAYER_RADIUS` | 0.35 | tile |
| `INTERACT_REACH` | 0.75 | khoảng cách từ tâm người chơi theo hướng nhìn để xác định tile mục tiêu |
| `MAX_PLAYERS` | 4 | |
| `CHOP_TIME` | 3.0 | giây giữ phím thái cho 1 nguyên liệu |
| `WASH_TIME` | 3.0 | giây giữ phím rửa 1 đĩa |
| `COOK_TIME` | 8.0 | giây từ thịt sống → chín |
| `BURN_TIME` | 6.0 | giây từ chín → cháy (nếu không lấy ra) |
| `DIRTY_PLATE_RETURN_DELAY` | 5.0 | giây sau khi phục vụ thì đĩa bẩn xuất hiện ở dish_return |
| `COUNTDOWN_SECONDS` | 3 | đếm ngược trước khi chơi |
| `RESULTS_SECONDS` | 5 | thời gian tối thiểu hiển thị kết quả trước khi host được quay lại lobby |
| `ORDER_FIRST_AT` | 3.0 | giây: đơn đầu tiên xuất hiện |
| `ORDER_INTERVAL_MIN/MAX` | 14 / 22 | giây giữa các đơn (random bằng RNG seed) |
| `ORDER_MAX_ACTIVE` | 4 | số đơn tối đa cùng lúc |
| `ORDER_PATIENCE` | 70 | giây tối đa mỗi đơn trước khi hết hạn |
| `ORDER_EXPIRE_PENALTY` | 10 | điểm bị trừ khi đơn hết hạn (tổng điểm không xuống dưới 0) |
| `TIP_MAX` | 10 | tiền thưởng tối đa nếu phục vụ nhanh |
| `LEVEL_DURATION_DEFAULT` | 180 | giây/màn (có thể ghi đè trong level) |
| `INPUT_QUEUE_MAX` | 6 | |
| `INTERP_DELAY_MS` | 100 | client |

### 5.2 Kiểu dữ liệu cốt lõi (`core/src/types.ts`) — dùng ĐÚNG tên này

```ts
export type Vec2 = { x: number; y: number };

export type TileType =
  | 'wall'            // '#'  ngoài bản đồ, không đi được, không tương tác
  | 'floor'           // '.'  đi được
  | 'counter'         // 'X'  bàn trống: đặt được 1 vật
  | 'crate'           // 'T','L','B','M' thùng nguyên liệu (vô hạn)
  | 'cutting'         // 'C'  thớt
  | 'stove'           // 'S'  bếp (có chảo cố định)
  | 'plate_dispenser' // 'P'  chỗ lấy đĩa sạch
  | 'serve'           // 'O'  cửa sổ phục vụ
  | 'dish_return'     // 'R'  chỗ đĩa bẩn quay về
  | 'sink'            // 'W'  bồn rửa
  | 'trash';          // 'D'  thùng rác

export type IngredientId = 'tomato' | 'lettuce' | 'bun' | 'meat';
export type IngredientState = 'raw' | 'chopped' | 'cooked' | 'burnt';

export interface IngredientItem { type: 'ingredient'; id: IngredientId; state: IngredientState }
export interface PlateItem { type: 'plate'; dirty: boolean; contents: IngredientItem[] } // contents luôn sắp xếp theo thứ tự cố định (mục 5.4)
export type Item = IngredientItem | PlateItem;

export type RecipeId = 'salad' | 'burger' | 'burger_tomato';

export interface Order { id: number; recipe: RecipeId; timeLeft: number; patience: number }

export interface PlayerInput { seq: number; mx: -1|0|1; my: -1|0|1; act: boolean; interact: boolean }

export interface PlayerState {
  id: string;            // sessionId
  x: number; y: number;  // tile
  fx: number; fy: number;// hướng nhìn đơn vị (một trong 8 hướng, đã normalize)
  held: Item | null;
  acting: boolean;       // đang giữ phím hành động hợp lệ (thái/rửa)
  ackSeq: number;        // input seq cuối cùng đã xử lý
}

export interface StationState {
  x: number; y: number; type: TileType;
  crate?: IngredientId;       // chỉ type 'crate'
  item: Item | null;          // counter/cutting/stove
  progress: number;           // cutting: giây đã thái; stove: giây đã nấu; sink: giây đã rửa
  dirtyCount: number;         // dish_return: số đĩa bẩn đang chờ; sink: số đĩa bẩn đã bỏ vào
  cleanCount: number;         // plate_dispenser: số đĩa sạch còn; sink: số đĩa sạch đã rửa xong
  pendingReturns: number[];   // dish_return: danh sách đếm ngược (giây) các đĩa bẩn sắp quay về
}

export interface GameState {
  levelId: string; width: number; height: number;
  tiles: TileType[];            // length = width*height, index = y*width+x
  stations: StationState[];     // chỉ các tile không phải wall/floor
  players: PlayerState[];
  orders: Order[];
  nextOrderId: number; nextOrderIn: number;
  score: number; served: number; expired: number;
  timeLeft: number; tick: number;
  rngState: number;
  ended: boolean;
}
```

### 5.3 Ký hiệu level ASCII (mỗi ký tự = 1 tile)

`#` wall · `.` floor · `X` counter · `T` crate cà chua · `L` crate xà lách · `B` crate bánh bun · `M` crate thịt · `C` thớt · `S` bếp · `P` đĩa sạch · `O` cửa phục vụ · `R` dish return · `W` bồn rửa · `D` thùng rác · `1` `2` `3` `4` = điểm spawn người chơi (tile floor).

Level là object:
```ts
export interface LevelDef {
  id: string; name: string; ascii: string[];       // mỗi dòng cùng độ dài
  duration: number;                                  // giây
  plates: number;                                    // số đĩa sạch ban đầu ở mỗi 'P'
  recipes: { id: RecipeId; weight: number }[];       // trọng số random đơn
  stars: [number, number, number];                   // ngưỡng điểm 1/2/3 sao
}
```

### 5.4 Công thức (`core/src/recipes.ts`)

| RecipeId | Tên VN | Thành phần (id:state) | Điểm gốc |
|---|---|---|---|
| `salad` | Salad | `lettuce:chopped`, `tomato:chopped` | 20 |
| `burger` | Burger | `bun:raw`, `meat:cooked`, `lettuce:chopped` | 35 |
| `burger_tomato` | Burger cà chua | `bun:raw`, `meat:cooked`, `lettuce:chopped`, `tomato:chopped` | 45 |

- Thứ tự `contents` của đĩa luôn sắp xếp theo thứ tự id: `bun, meat, lettuce, tomato`. So sánh đĩa với công thức là so sánh **tập hợp (multiset)** sau khi sắp xếp, không phụ thuộc thứ tự thêm.
- Chỉ ingredient ở các trạng thái hợp lệ ở bảng trên mới được thêm vào đĩa (bun phải `raw`, meat phải `cooked`, lettuce/tomato phải `chopped`). Nguyên liệu `burnt` KHÔNG BAO GIỜ được lên đĩa.
- `canAddToPlate(plate, ing)`: đĩa không bẩn, ing hợp lệ, không trùng id đã có trong đĩa, và danh sách sau khi thêm là **tập con** của ít nhất một công thức.

### 5.5 Luật tương tác (phím `interact`, sự kiện 1 lần mỗi lần bấm)

Tile mục tiêu = tile chứa điểm `(player.x + fx*INTERACT_REACH, player.y + fy*INTERACT_REACH)`. Nếu tile đó không phải station → không làm gì. Trường hợp theo loại station (`H` = vật đang cầm):

| Station | H rỗng | H có vật |
|---|---|---|
| `counter` | nếu có item → nhặt | nếu rỗng → đặt xuống. Nếu counter có **đĩa sạch** và H là ingredient hợp lệ (`canAddToPlate`) → cho vào đĩa. Nếu H là **đĩa sạch** và counter có ingredient hợp lệ → cho ingredient vào đĩa H, counter trống. Các trường hợp khác: không làm gì |
| `crate` | tạo ingredient `{id: crate, state:'raw'}` vào tay | không làm gì |
| `cutting` | nếu có item → nhặt, đồng thời `progress=0` | đặt được nếu thớt trống và H là ingredient `raw` có thể thái (`lettuce`,`tomato`); đặt xong `progress=0` |
| `stove` | nếu có item → nhặt (kể cả cháy), `progress=0` | đặt được nếu bếp trống và H là `meat` `raw`; đặt xong `progress=0`. Nếu H là **đĩa sạch** và trên bếp có meat `cooked` → cho thịt vào đĩa nếu `canAddToPlate`, bếp trống |
| `plate_dispenser` | nếu `cleanCount>0` → nhận đĩa sạch rỗng, `cleanCount--` | nếu H là đĩa sạch **rỗng** → `cleanCount++`, tay trống |
| `serve` | không làm gì | nếu H là đĩa sạch và khớp một đơn đang chờ → phục vụ thành công (mục 5.7); nếu không khớp → phát event `serve_fail`, giữ nguyên |
| `dish_return` | nếu `dirtyCount>0` → nhận đĩa bẩn `{type:'plate',dirty:true,contents:[]}`, `dirtyCount--` | không làm gì |
| `sink` | nếu `cleanCount>0` → nhận đĩa sạch rỗng, `cleanCount--` | nếu H là **đĩa bẩn** → `dirtyCount++`, tay trống |
| `trash` | không làm gì | nếu H là ingredient → xóa; nếu H là đĩa **sạch** → xóa `contents`, giữ đĩa; đĩa bẩn: không làm gì |

### 5.6 Luật hành động giữ phím (`act = true`)

- Chỉ có hiệu lực khi người chơi **đứng yên** (`mx=0 && my=0`) VÀ tile mục tiêu thỏa:
  - `cutting` có item là ingredient `raw` thái được, và **tay người chơi rỗng** → `progress += dt`; khi `progress >= CHOP_TIME` → `state='chopped'`, `progress=0`, phát event `chop_done`. `acting=true`.
  - `sink` có `dirtyCount>0` và **tay rỗng** → `progress += dt`; khi `progress >= WASH_TIME` → `dirtyCount--`, `cleanCount++`, `progress=0`, event `wash_done`. `acting=true`.
- Nếu điều kiện không còn (nhả phím, di chuyển, đổi hướng sang tile khác) thì `acting=false`; `progress` **được giữ nguyên** (không reset).

### 5.7 Nấu ăn, đơn hàng, điểm

- **Bếp:** mỗi tick, nếu stove có `meat`: `raw` → `progress += dt`; khi `>= COOK_TIME` → `state='cooked'`, `progress=0`, event `cook_done`. `cooked` → `progress += dt`; khi `>= BURN_TIME` → `state='burnt'`, event `burnt`. Thịt `burnt` ở yên đến khi người chơi lấy ra bỏ rác.
- **Đơn hàng:** `nextOrderIn` đếm ngược; về 0 và `orders.length < ORDER_MAX_ACTIVE` → tạo đơn (chọn recipe theo `weight` bằng RNG seed), `timeLeft = patience = ORDER_PATIENCE`, đặt lại `nextOrderIn` ngẫu nhiên trong `[MIN, MAX]`. Nếu đang đầy đơn thì chờ tick sau. Đơn đầu tiên tại `ORDER_FIRST_AT`. Event `order_new`.
- **Hết hạn:** `timeLeft` về 0 → xóa đơn, `expired++`, `score = max(0, score - ORDER_EXPIRE_PENALTY)`, event `order_expired`.
- **Phục vụ thành công:** chọn đơn khớp recipe **có `timeLeft` nhỏ nhất** (gần hết hạn nhất). `reward = baseScore(recipe) + round(TIP_MAX * timeLeft / patience)`. `score += reward`, `served++`, xóa đơn, đĩa biến mất khỏi tay, thêm `DIRTY_PLATE_RETURN_DELAY` vào `pendingReturns` của **một** station `dish_return` (nếu level có nhiều `R` thì chọn cái có `dirtyCount + pendingReturns.length` nhỏ nhất, hòa thì cái đầu tiên theo thứ tự index). Event `serve_ok`.
  - `pendingReturns` được lưu ở station `dish_return`. Mỗi tick trừ `dt` cho từng phần tử; phần tử `<= 0` thì bị xóa và `dirtyCount++`.
- **Hết giờ:** `timeLeft <= 0` → `ended = true`. Sao = số ngưỡng trong `level.stars` mà `score` đạt được (0–3).

### 5.8 Di chuyển & va chạm

- Input `(mx,my)` được normalize (đường chéo không nhanh hơn). Vận tốc = `PLAYER_SPEED`. Nếu `(mx,my) != 0` thì cập nhật `(fx,fy)` = vector đã normalize.
- Người chơi là **hình tròn** bán kính `PLAYER_RADIUS`. Tile không đi được: mọi tile trừ `floor`. Va chạm với hình vuông tile (circle vs AABB), **tách trục X rồi Y** để trượt dọc tường.
- Người chơi **không** va chạm với nhau ở MVP (đi xuyên qua nhau) — tránh kẹt.
- Vị trí luôn bị giữ trong bản đồ.

### 5.9 Vòng đời phòng (phase)

`lobby` → (host bấm Bắt đầu, tất cả người chơi không phải host đã `ready`) → `countdown` (3s) → `playing` → `finished` → (host bấm "Chơi tiếp" sau ≥ `RESULTS_SECONDS`, hoặc tự động sau 60s) → `lobby`.
- Không cho vào phòng khi phase khác `lobby` (trả lỗi `game_in_progress`).
- Cho phép chơi 1 người (để test).

---

## 6. Giao thức mạng (nguồn sự thật = `core/src/protocol.ts` + `docs/PROTOCOL.md`)

Room Colyseus tên **`kitchen`**. **ID phòng = mã 4 ký tự** `[ABCDEFGHJKLMNPQRSTUVWXYZ]` (loại I, O), ghi đè `this.roomId` trong `onCreate`. Tham gia bằng mã → `client.joinById(code, {name})`. Chơi nhanh → `client.joinOrCreate('kitchen', {name, public:true})`. Phòng tạo thủ công → `client.create('kitchen', {name, public:false})` và gọi `setPrivate(true)`.

**Join options:** `{ name: string, public?: boolean }` — tên 1–16 ký tự, server sanitize (mục 9).

### Client → Server (`room.send(type, payload)`)
| type | payload | ghi chú |
|---|---|---|
| `ready` | `{ ready: boolean }` | chỉ ở phase lobby |
| `select_level` | `{ levelId: string }` | chỉ host, phase lobby |
| `start` | `{}` | chỉ host, phase lobby |
| `input` | `PlayerInput` | gửi **mỗi 1/30 giây** khi đang `playing`, `seq` tăng dần từ 1; `interact` chỉ `true` đúng 1 input mỗi lần bấm |
| `emote` | `{ id: 0\|1\|2\|3 }` | rate-limit |
| `ping` | `{ t: number }` | server trả `pong` cùng `t` |
| `back_to_lobby` | `{}` | chỉ host, phase finished |

### Server → Client (`client.send`/`room.broadcast`)
| type | payload |
|---|---|
| `lobby` | `{ code, phase, levelId, hostId, players: { id, name, color, ready, connected }[] }` — gửi lại mỗi khi có thay đổi |
| `phase` | `{ phase: 'lobby'\|'countdown'\|'playing'\|'finished', countdown?: number }` |
| `snapshot` | `Snapshot` (dưới) — mỗi `SNAPSHOT_EVERY_N_TICKS` tick |
| `event` | `{ type: EventType, x?, y?, playerId?, recipe? }` — `EventType` = `chop_done, cook_done, burnt, serve_ok, serve_fail, order_new, order_expired, pickup, drop, wash_done, trash` |
| `results` | `{ score, stars, served, expired }` |
| `emote` | `{ playerId, id }` |
| `pong` | `{ t }` |
| `error` | `{ code: string, message: string }` |

```ts
export interface Snapshot {
  tick: number; timeLeft: number; score: number;
  players: PlayerState[];
  stations: StationState[];   // gửi đầy đủ (MVP)
  orders: Order[];
}
```

---

## 7. Quy tắc viết code TypeScript

- `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`. Cấm `any` (dùng `unknown` + type guard). Cấm `// @ts-ignore` (nếu bắt buộc dùng `@ts-expect-error` kèm lý do).
- Cấm `console.log` rải rác: server dùng `util/logger.ts`; client dùng `debug()` chỉ bật khi `?debug=1`.
- Tên: file `camelCase.ts` (class/component `PascalCase.ts`), biến/hàm `camelCase`, kiểu/class `PascalCase`, hằng số `UPPER_SNAKE_CASE`. Không viết tắt khó hiểu.
- Hàm ≤ 60 dòng, file ≤ 400 dòng; vượt thì tách. Một hàm một việc.
- Hàm trong `core/sim` có chữ ký kiểu `fn(state: GameState, ...args): void | Result` và **mutate trực tiếp `state`** (tránh clone mỗi tick), trả về danh sách `GameEvent[]` nếu có sự kiện. Các hàm kiểm tra (`canAddToPlate`...) là thuần, không mutate.
- Mọi hằng số "số ma thuật" phải nằm trong `constants.ts`.
- Comment bằng **tiếng Việt hoặc tiếng Anh nhất quán** (chọn tiếng Việt cho comment, tiếng Anh cho tên). Chỉ comment "tại sao", không comment điều hiển nhiên. Mỗi file public API có JSDoc 1–2 dòng.
- Xử lý lỗi: không nuốt lỗi (`catch {}` rỗng bị cấm). Trong Room, bọc handler message bằng try/catch, log và trả `error` cho client, **không để server crash**.
- Không để code chết, không để `TODO` mà không kèm ID task (`// TODO(T12): ...`).

## 8. Quy tắc client

- Phaser chỉ dùng cho **canvas game** (`GameScene`). Menu/lobby/HUD/kết quả là DOM overlay đặt chồng lên canvas, style trong `ui/*.css`.
- Mô hình: `main.ts` quản lý trạng thái màn hình `menu | lobby | game | results` bằng store nhỏ (`state/store.ts`, pub/sub tự viết, không thư viện).
- **Render không chứa luật.** Renderer chỉ đọc `Snapshot` và vẽ. Mọi thứ hiển thị phải suy ra từ snapshot.
- Vòng lặp: input gửi theo timer cố định 30Hz (accumulator), render theo `requestAnimationFrame` (Phaser `update`).
- **Nội suy (interpolation):** vẽ các người chơi *khác* ở thời điểm `now - INTERP_DELAY_MS` bằng cách nội suy giữa 2 snapshot gần nhất (buffer ≥ 3 snapshot). Người chơi *cục bộ* dùng dự đoán (task T24); trước T24 thì vẽ theo snapshot.
- **Không dùng asset ngoài ở MVP:** hình = `Phaser.GameObjects.Graphics`/`Rectangle`/`Arc` + `Text` emoji. Màu lấy từ `ui/theme.ts` (một nơi duy nhất). Âm thanh tạo bằng WebAudio (T25).
- Hiệu năng: mục tiêu 60 FPS với 4 người chơi, ≤ 150 game object. Cấm tạo/hủy object mỗi frame (tái sử dụng, pool). Cấm `new` Graphics mỗi frame.
- Hỗ trợ `devicePixelRatio`, tự scale canvas vừa cửa sổ giữ tỉ lệ (Phaser `Scale.FIT`, `autoCenter`).
- Phím mặc định: **WASD/phím mũi tên** = di chuyển; **Space** hoặc **E** = interact (nhặt/đặt); **Shift** hoặc **F** (giữ) = hành động (thái/rửa); **1–4** = emote. Không dùng chuột cho gameplay.

## 9. Quy tắc server

- `KitchenRoom` chỉ làm: quản lý người chơi/phase, nhận message → validate → đưa vào hàng đợi input; gọi `step()` của core; gửi snapshot/event. **Không chứa luật game.**
- Vòng lặp: `this.setSimulationInterval(cb, 1000/SIM_HZ)`; trong `cb` dùng **accumulator** để chạy đúng số tick cố định (không dùng dt thực làm dt mô phỏng). Giới hạn tối đa 5 tick bù/lần gọi.
- Input queue theo người chơi (`inputQueue.ts`): mỗi tick lấy 1 input; nếu rỗng thì **lặp lại input di chuyển cuối cùng nhưng đặt `interact=false`**; hàng đợi tối đa `INPUT_QUEUE_MAX`, đầy thì bỏ input cũ nhất. Chỉ chấp nhận `seq` lớn hơn `lastSeq` đã nhận; input cũ bỏ qua.
- **Validate mọi message:** kiểm tra `typeof`, `Number.isFinite`, giá trị `mx,my ∈ {-1,0,1}`, `seq` là số nguyên ≥ 0, chuỗi bị cắt độ dài. Message sai → bỏ qua và đếm vi phạm; > 50 vi phạm/10 giây → `client.leave(4000)`.
- **Rate limit** (token bucket trong `util/rateLimit.ts`): `input` ≤ 60/giây, `emote` ≤ 1 / 1.5 giây, `ping` ≤ 2/giây, các message khác ≤ 5/giây.
- Tên người chơi: trim, bỏ ký tự điều khiển, cắt 16 ký tự, rỗng → `Player###`. Chuỗi phải được escape khi client hiển thị (dùng `textContent`, **cấm `innerHTML` với dữ liệu người dùng**).
- Màu người chơi: gán theo thứ tự trống từ bảng 4 màu cố định trong `constants.ts`.
- Reconnect: dùng `allowReconnection(client, 30)` khi rớt mạng lúc phase ≠ lobby. Trong lúc chờ, nhân vật đứng yên.
- Dọn dẹp: phòng rỗng thì tự `disconnect()`; clear mọi interval; không rò rỉ listener.
- Cấu hình bằng biến môi trường (`PORT` mặc định 2567, `NODE_ENV`, `CORS_ORIGIN`). Có endpoint `GET /healthz` trả `200 ok`.

## 10. Quy tắc test

- Mọi hàm trong `core` có unit test Vitest; mục tiêu **coverage ≥ 85% cho `packages/core/src`** (đo bằng `@vitest/coverage-v8`).
- Test đặt trong `__tests__/` cùng package, tên `*.test.ts`. Test mô tả bằng tiếng Việt rõ ràng (`it('thịt sống đặt lên bếp sau 8s thì chín')`).
- Test phải deterministic (không phụ thuộc thời gian thực, mạng ngoài).
- Mỗi lần sửa bug phải thêm test tái hiện bug.
- Server có test tích hợp: khởi động Room thật trên cổng ngẫu nhiên, nối 2 client `colyseus.js`, kiểm tra luồng lobby → start → nhận snapshot.
- Lệnh bắt buộc có trong `package.json` gốc: `dev`, `build`, `start`, `test`, `lint`, `typecheck`, `format`.

## 11. Git & commit

- Nhánh: làm trực tiếp trên `main` hoặc `task/Txx-ten-ngan` nếu repo có nhiều người.
- Commit theo **Conventional Commits**: `feat(core): ...`, `fix(server): ...`, `test(core): ...`, `chore: ...`, `docs: ...`. Thân commit ghi `Task: Txx`.
- Không commit `node_modules`, `dist`, `.env`, file lớn > 1MB.

## 12. Mẫu báo cáo khi hoàn thành task

```
## Báo cáo T<ID> — <tên task>
**Đã làm:** (gạch đầu dòng ngắn)
**File tạo/sửa:** (danh sách đường dẫn)
**Cách chạy/kiểm tra:** (lệnh chính xác)
**Tiêu chí nghiệm thu:** [x] ... [x] ... (liệt kê từng mục, đánh dấu thật)
**Giả định/Quyết định:** (hoặc "không")
**Vấn đề còn tồn đọng:** (hoặc "không")
```
Không được tick `[x]` cho tiêu chí chưa tự kiểm tra thật sự.

## 13. ĐIỀU CẤM (vi phạm = làm lại)

1. Đổi stack, đổi tên package/thư mục/kiểu dữ liệu/message đã định nghĩa ở trên.
2. Đặt luật game ngoài `@kitchen/core`.
3. Dùng `Math.random`/`Date.now` trong `core`.
4. Client tự tính điểm/đơn hàng/trạng thái nguyên liệu.
5. Thêm thư viện không có trong mục 2 mà không ghi `docs/DECISIONS.md` kèm lý do (chỉ cho phép thư viện dev nhỏ như `@types/*`).
6. Dùng `any`, `@ts-ignore`, `eval`, `innerHTML` với dữ liệu người dùng.
7. Làm thêm tính năng ngoài task; sửa file ngoài phạm vi task mà không giải thích.
8. Tick `[x]` nghiệm thu khi chưa chạy kiểm tra.
9. Để repo ở trạng thái không build được sau khi kết thúc task.
10. Hard-code URL/cổng server trong client (dùng `import.meta.env` và `window.location`).

## 14. Definition of Done (áp dụng cho mọi task)

- [ ] `pnpm -r typecheck`, `pnpm -r lint`, `pnpm -r test` đều xanh
- [ ] Đủ mọi mục trong "Tiêu chí nghiệm thu" của task
- [ ] Không có cảnh báo TS/ESLint mới
- [ ] Có test cho logic mới (nếu là core/server)
- [ ] Cập nhật `docs/PROTOCOL.md`/`docs/DECISIONS.md` nếu có đổi/giả định
- [ ] Đã commit đúng quy ước
- [ ] Đã gửi báo cáo theo mẫu mục 12
