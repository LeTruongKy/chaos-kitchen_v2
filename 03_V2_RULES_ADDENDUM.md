# 03 — PHỤ LỤC QUY TẮC & ĐẶC TẢ V2 "CHAOS KITCHEN"

> **Gửi AI code:** File này là **phụ lục của `01_CODING_RULES.md`**. Đọc cả hai.
> - Mục nào file 03 nói khác file 01 → **file 03 thắng** (chỉ cho giai đoạn V2).
> - Mục nào file 03 không nhắc → áp dụng nguyên văn file 01 (kiến trúc R1–R8, điều cấm, quy trình, mẫu báo cáo, Definition of Done).
> - Mọi task nằm trong `04_V2_TASKS.md`.

---

## 1. Mục tiêu V2 & phạm vi

**Mục tiêu:** đưa Chaos Kitchen từ prototype lên **trải nghiệm gần nhất có thể với Overcooked** về (1) cách chơi, (2) hình ảnh/âm thanh/cảm giác điều khiển, (3) nội dung màn chơi, chạy trên web.

**Ưu tiên:** chất lượng game > triển khai. **KHÔNG làm deploy/Docker/CI trong V2** (đã có từ trước, giữ nguyên, không phá).

**Ràng buộc pháp lý (bắt buộc):**
- "Giống Overcooked" nghĩa là giống **cơ chế và cảm giác chơi**. Cơ chế game không bị bảo hộ bản quyền, nhưng **tuyệt đối không dùng** tên "Overcooked", logo, nhân vật (Onion King, Dog, Cat..., Chef nhân vật gốc), bản đồ gốc, âm thanh, nhạc, mô hình 3D, UI nguyên bản của Ghost Town Games / Team17. Mọi asset phải **do ta tự tạo (procedural)** hoặc **giấy phép CC0 / tương đương** (xem mục 7).
- Tên game giữ "Chaos Kitchen". Tên màn, nhân vật, nhạc: tự đặt.

**Ngoài phạm vi V2:** tài khoản, database, bảng xếp hạng online, deploy, nhiều server, chat văn bản, voice, level editor, in-app purchase.

---

## 2. Thay đổi kiến trúc

### 2.1 Bất biến vẫn giữ nguyên
R1 (server là nguồn sự thật), R2 (luật chỉ ở `@kitchen/core`), R3 (deterministic, không `Math.random`/`Date.now`), R4 (30Hz cố định), R5 (state JSON thuần), R6 (đơn vị tile), R7, R8.

### 2.2 Công nghệ client mới (thay Phaser)
| Hạng mục | V1 | V2 |
|---|---|---|
| Render game | Phaser 3 | **Three.js** (bản ghim chính xác, ví dụ r16x; kiểm tra docs/changelog bản đã chọn, không viết API theo trí nhớ) — **3D low-poly phong cách hoạt hình (toon), camera nghiêng cố định kiểu top-down 3D** |
| UI (menu/HUD) | DOM + CSS | Giữ DOM + CSS (không thêm React) |
| Âm thanh | WebAudio tổng hợp | WebAudio: **ưu tiên file âm thanh CC0 (ogg/mp3)**, giữ tổng hợp làm phương án dự phòng |
| Build | Vite | Vite (giữ) |

Phaser **bị gỡ hoàn toàn** ở task D13 sau khi renderer 3D đạt tương đương. Trước đó hai renderer cùng tồn tại sau interface chung (mục 2.3), chọn bằng `?r=2d|3d` (mặc định `2d` cho tới khi D13).

> Cho phép thêm đúng các thư viện sau và không gì khác: `three`, `@types/three`. (Không dùng `react-three-fiber`, `cannon`, `rapier`... vì vật lý đã có trong `core`.) Postprocessing viết tay bằng three/examples nếu cần, ghi vào DECISIONS.

### 2.3 Giao diện renderer (tách khỏi logic)
Mọi renderer hiện thực interface duy nhất trong `apps/client/src/game/renderer/IGameRenderer.ts`:
```ts
export interface IGameRenderer {
  init(container: HTMLElement, level: LevelDef, opts: RendererOptions): Promise<void>;
  /** Gọi mỗi khi có snapshot mới (đã qua SnapshotBuffer/Predictor) */
  applyFrame(frame: RenderFrame): void;
  /** Gọi mỗi frame hiển thị, dt giây thực */
  update(dtSec: number): void;
  handleEvent(ev: GameEvent): void;
  resize(width: number, height: number, dpr: number): void;
  setQuality(q: 'low' | 'medium' | 'high'): void;
  dispose(): void;   // giải phóng sạch geometry/material/texture/listener
}
```
`RenderFrame` = dữ liệu **đã nội suy/dự đoán** sẵn (vị trí người chơi, vật phẩm, trạng thái station, đơn hàng…) để renderer **không chứa logic mạng hay luật chơi**.

### 2.4 Hợp đồng dữ liệu V2
- Tăng `PROTOCOL_VERSION = 2` (hằng trong `core/constants.ts`). Client gửi trong join options; server từ chối khác phiên bản với lỗi `version_mismatch` (hiển thị tiếng Việt: "Phiên bản game không khớp, hãy tải lại trang").
- Mọi thay đổi kiểu dữ liệu phải sửa đồng thời: `types.ts`, `protocol.ts`, `docs/PROTOCOL.md`, test.

### 2.5 Môi trường Windows
Dev chạy trên Windows/PowerShell: **cấm script chỉ chạy được bằng bash** (`.sh`). Mọi script tiện ích viết bằng Node/TS (`tsx scripts/xxx.ts`). Đường dẫn dùng `path.join`, không hard-code `/`.

---

## 3. ĐẶC TẢ GAMEPLAY V2 (nguồn sự thật)

### 3.1 Hằng số mới/đổi (đặt trong `core/constants.ts`)

| Tên | Giá trị | Ghi chú |
|---|---|---|
| `PLAYER_MAX_SPEED` | 5.2 | thay `PLAYER_SPEED` (giữ alias để không vỡ code cũ rồi xóa ở B02) |
| `PLAYER_ACCEL` | 45 | tile/s², khi có input |
| `PLAYER_FRICTION` | 38 | tile/s², khi không có input |
| `ICE_ACCEL` | 7 | trên tile băng |
| `ICE_FRICTION` | 2.5 | trên tile băng |
| `DASH_SPEED` | 13 | tile/s |
| `DASH_DURATION` | 0.2 | giây |
| `DASH_COOLDOWN` | 0.9 | giây (tính từ lúc bắt đầu lướt) |
| `PLAYER_COLLIDE` | `true` | người chơi đẩy nhau (mục 3.3) |
| `THROW_SPEED` | 9 | tile/s |
| `THROW_MAX_RANGE` | 4.5 | tile |
| `THROW_COOLDOWN` | 0.3 | giây |
| `CATCH_RADIUS` | 0.6 | tile |
| `POT_COOK_TIME` | 15 | giây từ đủ 3 nguyên liệu → súp chín |
| `POT_BURN_TIME` | 10 | giây từ chín → cháy |
| `POT_MAX` | 3 | |
| `FIRE_IGNITE_AFTER_BURNT` | 4 | giây kể từ lúc cháy khét → bốc lửa |
| `FIRE_SPREAD_INTERVAL` | 3 | giây giữa mỗi lần thử lan |
| `FIRE_SPREAD_CHANCE` | 0.6 | xác suất (dùng RNG seed) |
| `EXTINGUISH_TIME` | 1.2 | giây giữ `act` hướng vào đám cháy |
| `EXTINGUISH_RANGE` | 2.2 | tile |
| `TIP_STREAK_MAX` | 4 | |
| `CONVEYOR_SPEED` | 0.6 | tile/s |
| `ORDER_PATIENCE_BY_RECIPE` | salad 60, burger 75, burger_tomato 85, các súp 90 | thay `ORDER_PATIENCE` chung |

### 3.2 Mô hình vật phẩm V2 (sửa `types.ts`)

```ts
export type IngredientId =
  | 'tomato' | 'lettuce' | 'bun' | 'meat'
  | 'onion' | 'mushroom'
  | 'soup_tomato' | 'soup_onion' | 'soup_mushroom'; // 3 loại soup_* chỉ tồn tại trên đĩa
export type ToolId = 'pan' | 'pot' | 'extinguisher';

export interface ToolItem {
  type: 'tool';
  tool: ToolId;
  contents: IngredientItem[];   // pan: tối đa 1 meat; pot: tối đa POT_MAX cùng id đã thái; extinguisher: luôn []
  progress: number;             // giây đã nấu (chỉ có nghĩa khi đang nằm trên stove)
}
export type Item = IngredientItem | PlateItem | ToolItem;

export interface PlayerState {  // thêm
  vx: number; vy: number;       // vận tốc (tile/s)
  dashT: number;                // thời gian lướt còn lại (0 = không lướt)
  dashCd: number;               // hồi chiêu còn lại
  throwCd: number;
  ownerId?: string;             // solo mode: sessionId người điều khiển
}
export interface StationState {  // thêm
  onFire: boolean;
  fireTimer: number;            // đếm tới lần lan kế tiếp
  burntTimer: number;           // đếm từ lúc đồ cháy tới khi bốc lửa
  dir?: 'up'|'down'|'left'|'right'; // conveyor
}
export interface Projectile { id: number; item: IngredientItem; x: number; y: number; vx: number; vy: number; traveled: number; ownerId: string }
export interface GameState { /* thêm */ projectiles: Projectile[]; nextProjectileId: number; streak: number; }
export interface PlayerInput { /* thêm */ dash: boolean; throw: boolean }  // cờ cạnh lên giống interact
```

Quy tắc đĩa mở rộng: `PLATE_ORDER = ['bun','meat','lettuce','tomato','soup_tomato','soup_onion','soup_mushroom']`. `CHOPPABLE` = lettuce, tomato, onion, mushroom.

### 3.3 Di chuyển V2 (thay mục 5.8 file 01)
1. Vận tốc mục tiêu `vt = normalize(mx,my) * PLAYER_MAX_SPEED`. Mỗi tick: `v` tiến tới `vt` với gia tốc `PLAYER_ACCEL` (có input) hoặc giảm về 0 bằng `PLAYER_FRICTION` (không input). Trên tile băng dùng `ICE_*`. Tile dưới chân = tile chứa tâm người chơi.
2. Lướt (`input.dash` cạnh lên, `dashCd<=0`, `dashT<=0`): đặt `dashT=DASH_DURATION`, `dashCd=DASH_COOLDOWN`, vận tốc = hướng nhìn `(fx,fy)` × `DASH_SPEED`. Trong lúc lướt: bỏ qua input di chuyển, không `interact`/`act`; hết lướt, vận tốc giữ nguyên rồi giảm theo ma sát. Va tường thì dừng lướt.
3. Va chạm tường: giữ thuật toán tách trục (circle vs AABB) của file 01; khi chạm thì triệt tiêu thành phần vận tốc theo trục đó.
4. Va chạm người–người (nếu `PLAYER_COLLIDE`): sau khi tất cả di chuyển trong tick, với mỗi cặp chồng lấn (khoảng cách < 2·R) đẩy mỗi người ra nửa độ chồng lấn theo đường nối tâm (giải theo thứ tự cặp cố định `(i<j)`, lặp 2 lần), sau đó chạy lại giải va tường. Người đang lướt đẩy người khác thêm **xung** 4 tile/s theo hướng lướt.
5. **Pit (`_`)**: người chơi không đi vào (như tường). Vật ném bay qua được.
6. Hàm thuần dùng chung client/server: `simulateMove(player: MoveState, input, tiles, w, h, dt)` với `MoveState = {x,y,vx,vy,fx,fy,dashT,dashCd}`. Client dự đoán dùng đúng hàm này (không dự đoán va chạm người–người, chỉ tường).

### 3.4 Dụng cụ nấu (Pan/Pot)
Tile level: `S` = bếp có sẵn **chảo**, `s` = bếp có sẵn **nồi**. Chảo/nồi là `ToolItem`, **cầm được**, đặt được lên counter/stove (không đặt lên thớt, thùng rác, cửa phục vụ…).

| Tình huống | Kết quả |
|---|---|
| Tay rỗng + target có tool (stove/counter) | nhấc tool lên tay (giữ nguyên `contents`, `progress`) |
| Tay có tool + target stove/counter **trống** | đặt tool xuống |
| Tay có `meat raw` + target có **chảo rỗng** (trên stove/counter) | thịt vào chảo (`progress=0`) |
| Tay có **chảo rỗng** + target là crate `meat`... | không làm gì |
| Tay có nguyên liệu súp **đã thái** (tomato/onion/mushroom) + target có **nồi** (contents < 3, cùng id với phần đã có) | vào nồi |
| Tay có **đĩa sạch** + target có **chảo chứa meat cooked** | thịt sang đĩa (nếu `canAddToPlate`), chảo rỗng |
| Tay có **đĩa sạch** + target có **nồi đã chín** (3 nguyên liệu, `progress>=POT_COOK_TIME` và chưa cháy) | đĩa nhận `soup_<id>` (state cooked), nồi rỗng |
| Tay có **chảo/nồi** + target counter có **đĩa sạch** | đổ sang đĩa theo hai dòng trên (đảo vai) |
| Thịt cháy trong chảo / súp cháy trong nồi | không đổ được lên đĩa; mang tới **thùng rác** → tool rỗng, `progress=0` (tool giữ lại) |
| Tool + thùng rác | xóa `contents` của tool, giữ tool |
| Rửa | **chảo/nồi bẩn không tồn tại** (không cần rửa) |

**Nấu (tick):** chỉ khi tool **nằm trên stove**. Chảo: có meat → `progress += dt`: `<COOK_TIME` raw; `>=COOK_TIME` → meat `cooked`; `>=COOK_TIME+BURN_TIME` → meat `burnt`. Nồi: chỉ nấu khi `contents.length==POT_MAX`; `progress >= POT_COOK_TIME` coi là "chín"; `>= POT_COOK_TIME+POT_BURN_TIME` → cháy (đánh dấu bằng `contents` tất cả `state:'burnt'`). Tool ở trên counter hoặc đang cầm: **không** tăng `progress` (tạm dừng).
Stove KHÔNG còn nhận meat trực tiếp (bỏ luật V1), phải có chảo.

### 3.5 Món súp (recipe mới)
| RecipeId | Thành phần (trên đĩa) | Điểm gốc |
|---|---|---|
| `tomato_soup` | `soup_tomato:cooked` | 40 |
| `onion_soup` | `soup_onion:cooked` | 40 |
| `mushroom_soup` | `soup_mushroom:cooked` | 40 |
Công thức cũ giữ nguyên. Crate mới: `N` hành tây (`onion`), `H` nấm (`mushroom`).

### 3.6 Lửa & bình chữa cháy
- Khi thịt trong chảo / súp trong nồi chuyển `burnt` **và tool đang nằm trên stove**: `burntTimer += dt` ở station đó. Khi `burntTimer >= FIRE_IGNITE_AFTER_BURNT` → `onFire=true`, `fireTimer=0`, **xóa `contents` của tool trên station** (tool vẫn còn, `progress=0`), event `ignite`. Nếu người chơi lấy tool ra / bỏ rác trước khi tới ngưỡng → `burntTimer=0`.
- Station đang cháy: **không ai tương tác được** (bỏ qua `interact`/`act`), trừ bình chữa cháy.
- Lan lửa: mỗi `FIRE_SPREAD_INTERVAL` giây, mỗi station cháy thử lan sang từng station kề (4 hướng) thuộc loại `counter | cutting | stove` chưa cháy, với xác suất `FIRE_SPREAD_CHANCE` (RNG seed trong state). Vật trên station bị cháy lan sẽ bị xóa ngay.
- Người chơi đứng gần lửa **không bị thương** (không có cơ chế chết/thiêu người).
- **Bình chữa cháy** (`ToolItem` tool `extinguisher`): lấy từ station `E` (giá treo; tay rỗng + target `E` còn bình → cầm; tay có bình + target `E` trống → trả). Khi cầm bình và giữ `act` (đứng yên hoặc di chuyển được — **cho phép di chuyển khi xịt**): tìm station đang cháy **gần nhất** trong nón 60° theo hướng nhìn, trong `EXTINGUISH_RANGE`; nếu có: tích `extinguishProgress` (lưu trong `StationState.progress`) tới `EXTINGUISH_TIME` → `onFire=false`, `burntTimer=0`, event `extinguish`. Nhả/ra khỏi tầm → progress giảm dần 1x tốc độ tăng.
- Thêm tile ký tự `E`.

### 3.7 Ném & bắt
- Nút `throw` (cạnh lên): người cầm **nguyên liệu** (không phải đĩa/tool) và `throwCd<=0` → tạo `Projectile` tại vị trí người chơi + 0.5·hướng nhìn, vận tốc `THROW_SPEED·(fx,fy)`, `held=null`, `throwCd=THROW_COOLDOWN`, event `throw`.
- Mỗi tick vật bay tiến `THROW_SPEED·dt`; bay qua `floor` và `pit` bình thường. Kết thúc khi:
  1. Trong `CATCH_RADIUS` của người chơi (≠ người ném trong 0.25s đầu), người đó tay rỗng → **bắt được** (`held=item`), event `catch`.
  2. Chạm tile station: nếu station nhận được vật đó theo luật đặt (counter trống; thớt nếu thái được; chảo/nồi nếu hợp lệ; thùng rác → bị xóa; đĩa sạch trên counter nếu `canAddToPlate`) → **đặt vào**; nếu không nhận → rơi xuống: vật **biến mất** (event `splat`).
  3. Chạm tường / `traveled >= THROW_MAX_RANGE` / tile `floor` hết tầm → vật **biến mất** (`splat`).
- Vật ném giữ nguyên `state` (đã thái vẫn là chopped).

### 3.8 Băng chuyền
Ký tự `>` `<` `^` `v` = conveyor hướng phải/trái/lên/xuống (không đi lên được, như counter). Item đặt lên (bằng `interact`) di chuyển theo hướng với `CONVEYOR_SPEED` (lưu `progress` 0..1 trong station). Khi `progress>=1`: chuyển sang station kề theo hướng nếu nó nhận được vật (conveyor khác, counter trống, thớt hợp lệ, cửa phục vụ nếu là đĩa, thùng rác); nếu không nhận được → item **đứng chờ ở cuối** (`progress=1`). Cho phép nhặt bất kỳ lúc nào bằng tay rỗng. Chấp nhận mọi `Item`.

### 3.9 Đơn hàng V2 & tip streak
- Level có thể khai báo `orderScript?: { at: number; recipe: RecipeId }[]` (giây từ đầu ván) → đơn xuất hiện **đúng kịch bản** (deterministic, giống Overcooked). Không có `orderScript` → random như V1.
- `patience` theo `ORDER_PATIENCE_BY_RECIPE` (ghi đè được bởi level).
- **Tip streak:** `state.streak` bắt đầu 0. Phục vụ thành công: `streak = min(streak+1, TIP_STREAK_MAX)`; đơn hết hạn: `streak = 0`. `reward = base + round(TIP_MAX · timeLeft/patience) · max(1, streak)`.
- Snapshot có `streak`; HUD hiển thị `x1..x4`.

### 3.10 Đĩa V2
- Số đĩa sạch ban đầu theo level (`plates`) ở `plate_dispenser`; **không sinh thêm**, chỉ tăng nhờ rửa đĩa bẩn (đúng luật file 01). Nếu `repo` hiện tại đang để đĩa vô hạn → task A00 đưa về đúng luật.

### 3.11 Chế độ chơi 1 người (Solo, 2 đầu bếp)
- Nếu phòng có đúng 1 người chơi và host bật `solo` ở lobby → server tạo **2 `PlayerState`** (`ownerId` = sessionId người đó). Người chơi điều khiển **chef đang hoạt động**; chef còn lại nhận input rỗng.
- Message mới `switch_chef` (phím Tab / nút trên mobile): đổi chef hoạt động (rate-limit 4/giây). Snapshot gửi `activeChefId`.
- Core **không biết** solo; chỉ server ánh xạ input. Tiêu chí cân bằng: level ở chế độ solo vẫn dùng nguyên `LevelDef`.

### 3.12 Level format V2 (`LevelDef` thêm)
```ts
world: number;                // 1,2,3...
orderScript?: { at: number; recipe: RecipeId }[];
hints?: { at: number; text: string }[];   // gợi ý hiện trên HUD (màn học việc)
unlockStars?: number;         // số sao tích lũy cần để mở khóa (campaign)
theme: 'diner' | 'ship' | 'space' ;       // chỉ ảnh hưởng đồ họa
```
Ký tự mới: `N` `H` `s` `E` `_` `~` `>` `<` `^` `v`. Bảng đầy đủ nằm trong `core/level.ts` + `docs/LEVEL_FORMAT.md`.
Validator V2 thêm: `E` cần ≥1 floor kề; **nếu level có `s` hoặc recipe súp → bắt buộc có crate nguyên liệu tương ứng + ít nhất 1 `s`**; **nếu level có pit chia đôi khu vực (BFS thấy floor không liên thông)** thì mỗi phần phải có ≥1 spawn **hoặc** level phải cho phép ném (cảnh báo, không lỗi cứng) và mọi station quan trọng vẫn *có thể với tới bằng ném hoặc đi*; conveyor phải kết thúc ở station nhận được hoặc có `warning`; băng `~` chỉ trên floor.

### 3.13 Campaign (không cần database)
- Tiến trình lưu trong **`localStorage`** (khóa `ck_progress_v2`: `{ stars: Record<levelId, 0..3>, best: Record<levelId, number> }`). Bọc try/catch; dữ liệu hỏng → reset.
- Mở khóa: level `unlockStars` ≤ tổng sao đang có. Level đầu luôn mở. Lobby: host chỉ chọn được level đã mở **trên máy host**; người khác chơi theo level host chọn.

---

## 4. Giao thức V2 (bổ sung vào mục 6 file 01)

Client → Server:
| type | payload | ghi chú |
|---|---|---|
| `input` | `PlayerInput` (có thêm `dash`,`throw`) | |
| `switch_chef` | `{}` | chỉ solo, đang `playing` |
| `set_solo` | `{ solo: boolean }` | chỉ host, lobby, khi chỉ có 1 người |
| `select_level` | `{ levelId }` | server kiểm tra level tồn tại (không kiểm tra unlock) |

Server → Client: `snapshot` thêm `projectiles`, `streak`, `activeChefId?`; `lobby` thêm `solo: boolean`; `event.type` thêm: `dash, throw, catch, splat, ignite, extinguish, pot_done, soup_burnt, streak_up, streak_lost`.

---

## 5. ĐỊNH HƯỚNG ĐỒ HỌA (Art Direction)

**Phong cách:** 3D low-poly hoạt hình, màu rực rỡ, hình khối "mập", viền đen mảnh quanh vật thể, đổ bóng mềm. Camera nghiêng cố định.

| Hạng mục | Quy định |
|---|---|
| Camera | `PerspectiveCamera` FOV 28–32°, nghiêng ~55° so với mặt sàn, nhìn vào tâm bản đồ; **tự tính khoảng cách để toàn bộ bản đồ + HUD vừa khung** ở mọi tỉ lệ màn hình; có thể dịch nhẹ theo trung điểm các chef (tối đa 0.5 tile) |
| Hệ tọa độ | `core (x,y)` → three `(x, 0, y)`; 1 tile = 1 đơn vị three; trục Y three hướng lên |
| Vật liệu | `MeshToonMaterial` + gradient map 3 bậc; **viền** bằng kỹ thuật "inverted hull" (mesh lật mặt phóng to 1.04, màu `#1b1b1b`); cho phép tắt viền ở quality `low` |
| Ánh sáng | 1 `DirectionalLight` (đổ bóng, shadow map 1024 ở `medium`, 2048 ở `high`, tắt ở `low`) + `HemisphereLight` + màu nền theo `theme` |
| Sàn | Gạch ô cờ 2 sắc theo theme, dùng `InstancedMesh` |
| Quầy/Station | Mỗi loại một mô hình riêng nhận diện được từ xa (xem D03): counter gỗ, thớt có dao, bếp có 2 vòng lửa, bồn rửa có vòi, máy cấp đĩa chồng đĩa, cửa phục vụ có chuông, thùng rác có nắp, giá bình chữa cháy đỏ, thùng nguyên liệu mở nắp có ruột đồ ăn |
| Đầu bếp | **Procedural** từ primitives: thân (capsule), đầu (sphere), mũ đầu bếp (cylinder+sphere), 2 tay, 2 chân; màu theo `PLAYER_COLORS`; **trạng thái animation**: `idle, run, carry (giơ 2 tay), chop, wash, dash, throw, panic (khi gần lửa)`; squash & stretch khi bắt đầu/dừng chạy; bóng tròn dưới chân |
| Đồ ăn | Mỗi nguyên liệu 4 trạng thái nhìn khác nhau rõ (raw/chopped/cooked/burnt); đĩa; chảo; nồi; bình chữa cháy |
| Hiệu ứng (VFX) | hơi nước bốc từ nồi/chảo đang nấu, xèo xèo (hạt nhỏ) khi chảo có thịt, khói đen khi cháy, **lửa** (billboard + hạt cam/đỏ), bọt xà phòng khi rửa, vụn khi thái, bụi khi lướt/chạy, confetti khi giao đúng, bọt trắng khi xịt bình, vệt khi ném vật |
| UI | Phong cách "phiếu order" (ticket) giấy trượt vào từ **trái trên**; đồng hồ tròn; điểm có icon đồng xu; chỉ số tip streak `x2`; font bo tròn đậm (font hệ thống bo tròn hoặc font OFL **tự host** trong repo, ghi giấy phép) |
| Theme | `diner` (bếp cam/kem), `ship` (xanh biển, sàn nghiêng nhẹ trang trí), `space` (tím/xanh đậm, đèn nhấp nháy) — chỉ đổi màu, mô hình trang trí nền, ánh sáng |

**Ngân sách hiệu năng (đo được, ghi vào báo cáo):**
- ≥ 55 FPS ổn định ở `medium` với 4 chef, laptop GPU tích hợp (Intel Iris/UHD) ở 1080p.
- Draw call ≤ 300; tam giác ≤ 150k; bộ nhớ GPU texture ≤ 128MB.
- Không tạo object mới mỗi frame; mọi hạt dùng pool; `dispose()` đầy đủ khi đổi level (kiểm tra bằng `renderer.info.memory` không tăng sau 20 lần đổi).
- Bundle client gzip ≤ 2.5MB (không tính file âm thanh).

## 6. ĐỊNH HƯỚNG ÂM THANH
- Nhạc nền: 1 bản/`theme`, vòng lặp mượt (loop point sạch); khi `timeLeft <= 30s` chuyển **Panic**: tăng `playbackRate` 1.25 + thêm lớp trống/chuông; trước khi hết giờ 10s có tiếng đếm tích tắc.
- SFX phân tầng: tiếng thái, xèo xèo chảo, sôi nồi, rửa chén, bước chân nhẹ (khi chạy), lướt "vút", ném "vút", bắt "bốp", lửa cháy (loop), xịt bình, chuông đơn mới, chuông giao đúng, buzz giao sai, đơn hết hạn, tick-tock, countdown 3-2-1-GO, kết thúc ván, sao hiện ra (3 nốt tăng dần).
- Âm lượng có 3 kênh `master/music/sfx` lưu `localStorage` (`ck_audio`). Âm 3D đơn giản: giảm theo khoảng cách + pan trái/phải theo x.
- Mặc định: nhạc bật 50%, SFX 80%.

## 7. QUY TẮC ASSET & BẢN QUYỀN
1. Thư mục `apps/client/public/assets/` (+ `src/assets/`). Mỗi asset ngoài **bắt buộc** có dòng trong `CREDITS.md`: tên, tác giả, URL nguồn, giấy phép, ngày tải.
2. Chỉ dùng **CC0** (ưu tiên Kenney.nl, OpenGameArt mục CC0, Quaternius, Poly Pizza mục CC0). **Cấm** CC-BY-NC, "free for personal use", asset rút từ game thương mại, bất kỳ file nào có liên quan Overcooked. Khi không chắc giấy phép → **không dùng**, tự tạo procedural.
3. Mọi model ngoài (glTF/GLB) nén ≤ 300KB/file; texture ≤ 1024²; dùng `AssetManifest` (`game/assets/manifest.ts`) với **fallback procedural** cho từng asset (game vẫn chạy khi thiếu file).
4. Không tải asset lúc chạy từ domain bên ngoài; mọi file nằm trong repo.
5. Font: ưu tiên font hệ thống bo tròn; nếu dùng font ngoài chỉ giấy phép OFL và tự host.

## 8. Quy tắc test bổ sung
- **Golden determinism test:** chạy `step()` 3.600 tick (2 phút) với kịch bản input cố định (seed cố định) trên mỗi level; băm (hash) JSON state cuối; so sánh với giá trị lưu trong repo `__tests__/golden/*.json`. Đổi luật cố ý thì cập nhật golden và ghi vào DECISIONS.
- Mọi cơ chế mới (dash, ném, lửa, nồi, băng chuyền, băng trượt, tip streak) có test bảng chân trị riêng như file 01 (mục 10).
- **Visual smoke (Playwright):** chụp ảnh canvas 3D ở mỗi level, kiểm tra **không toàn pixel đen/đơn sắc** (tính phương sai màu > ngưỡng) và `console.error = 0`. Không so ảnh pixel-perfect.
- Test đo hiệu năng bán tự động: script `scripts/perf.ts` mở trình duyệt, chơi 60s, in FPS trung bình/min, draw calls, bộ nhớ.

## 9. Definition of Done V2 (bổ sung)
- [ ] Mọi mục DoD file 01
- [ ] Không phá luồng V1 (e2e smoke vẫn xanh)
- [ ] Golden test cập nhật hợp lệ (nếu đổi luật)
- [ ] Với task đồ họa/UI: đính kèm **ảnh chụp thật** (đường dẫn `docs/screens/<task>/`) + số đo FPS
- [ ] `CREDITS.md` cập nhật nếu thêm asset ngoài
- [ ] `docs/PROTOCOL.md`, `docs/LEVEL_FORMAT.md` cập nhật nếu đổi hợp đồng
