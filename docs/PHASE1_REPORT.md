# Báo Cáo Thực Hiện Phase 1 — Chaos Kitchen

Tài liệu tham chiếu:
- `09_RSC_PLAN_V2_USER_TESTED.md` (Phase 1)
- `07_REVISED_PLAN_AND_AI_RULES.md` (Mục 0, R0.1–R0.11)
- `docs/DECISIONS.md`

---

## 1. BƯỚC 0 — KIỂM KÊ BAN ĐẦU (NGUYÊN VĂN)

### a) Kết quả grep `seated_waiting_order`, `order_taken`, `eating`, `customer_leave`

Lệnh thực thi:
```powershell
git grep -n "seated_waiting_order\|order_taken\|eating\|customer_leave" packages apps
```

Output nguyên văn:
```
apps/client/src/game/renderer3d/ThreeRenderer.ts:448:        if (c.state === 'seated_waiting_order' || c.state === 'order_taken' || c.state === 'eating') {
apps/client/src/game/renderer3d/ThreeRenderer.ts:461:        if (c.state === 'seated_waiting_order') {
apps/client/src/game/renderer3d/ThreeRenderer.ts:464:        } else if (c.state === 'eating') {
apps/client/src/game/renderer3d/ThreeRenderer.ts:471:          const headY = (c.state === 'seated_waiting_order' || c.state === 'order_taken' || c.state === 'eating')
apps/client/src/ui/campaign.css:47:  background: repeating-linear-gradient(
apps/client/src/ui/hud.ts:263:        if (c.state === 'seated_waiting_order') {
packages/core/src/__tests__/b08.test.ts:105:    state.customers.push({ id: cId, x: table.x, y: table.y, state: 'order_taken', recipe: 'salad', patience: 100, maxPatience: 100, timer: 0, colorIndex: 0 });
packages/core/src/__tests__/b09.test.ts:69:        id: i, x: 8, y: 4, state: 'order_taken', recipe: 'salad', timer: 0, patience: 60, maxPatience: 60, colorIndex: 0
packages/core/src/__tests__/b09.test.ts:110:    state.customers.push({ id: 1, x: 8, y: 4, state: 'order_taken', recipe: 'salad', timer: 0, patience: 0, maxPatience: 60, colorIndex: 0 });
packages/core/src/__tests__/bep_doi.test.ts:87:      state: 'order_taken',
packages/core/src/__tests__/bep_doi.test.ts:182:    expect(customer.state).toBe('eating');
packages/core/src/__tests__/bep_doi.test.ts:195:      state: 'order_taken',
packages/core/src/__tests__/bep_doi.test.ts:279:    expect(customer.state).toBe('eating');
packages/core/src/__tests__/fullPlaythrough.test.ts:44:      state: 'order_taken',
packages/core/src/__tests__/nha_hang_mo.test.ts:102:        state: 'order_taken',
packages/core/src/__tests__/nha_hang_mo.test.ts:134:      state: 'order_taken',
packages/core/src/__tests__/nha_hang_mo.test.ts:204:    expect(customer.state).toBe('eating');
packages/core/src/__tests__/orders.test.ts:75:      state: 'order_taken' as any,
packages/core/src/__tests__/orders.test.ts:137:    state.customers.push({ id: c1Id, x: tables[0]!.x, y: tables[0]!.y, state: 'order_taken', recipe: "salad" as import("../types").RecipeId as any as any, patience: 20, maxPatience: 70, timer: 0, colorIndex: 0 });
packages/core/src/__tests__/orders.test.ts:142:    state.customers.push({ id: c2Id, x: tables[0]!.x, y: tables[0]!.y, state: 'order_taken', recipe: "salad" as import("../types").RecipeId as any as any, patience: 10, maxPatience: 70, timer: 0, colorIndex: 0 });
packages/core/src/__tests__/orders.test.ts:208:    // Customer should be eating now
packages/core/src/__tests__/orders.test.ts:209:    expect(customer.state).toBe('eating');
packages/core/src/__tests__/pizza.test.ts:158:      state: 'order_taken',
packages/core/src/__tests__/pizza.test.ts:208:    expect(customer.state).toBe('eating'); // khách chuyển sang ăn
packages/core/src/__tests__/soup.test.ts:58:      state: 'order_taken',
packages/core/src/__tests__/soup.test.ts:165:    expect(customer.state).toBe('eating');
packages/core/src/__tests__/table.test.ts:40:      state: 'seated_waiting_order',
packages/core/src/__tests__/table.test.ts:76:  it('empty -> seated_waiting_order (handled by tickOrders)', () => {
packages/core/src/__tests__/table.test.ts:82:    expect(state.customers[0]!.state).toBe('seated_waiting_order');
packages/core/src/__tests__/table.test.ts:86:  it('seated_waiting_order -> order_taken requires empty hands', () => {
packages/core/src/__tests__/table.test.ts:95:    expect(c.state).toBe('seated_waiting_order');
packages/core/src/__tests__/table.test.ts:103:    expect(c.state).toBe('order_taken');
packages/core/src/__tests__/table.test.ts:108:  it('order_taken -> eating requires correct food', () => {
packages/core/src/__tests__/table.test.ts:111:    c.state = 'order_taken';
packages/core/src/__tests__/table.test.ts:120:    expect(c.state).toBe('order_taken');
packages/core/src/__tests__/table.test.ts:135:    expect(c.state).toBe('eating');
packages/core/src/__tests__/table.test.ts:140:  it('eating -> dirty_plate after 5s', () => {
packages/core/src/__tests__/table.test.ts:143:    c.state = 'eating';
packages/core/src/__tests__/table.test.ts:190:      c.state = 'order_taken';
packages/core/src/__tests__/table.test.ts:204:      expect(c.state).toBe('eating');
packages/core/src/__tests__/table.test.ts:206:      // Tick 5s for customer to finish eating and leave behind a dirty plate at Q
packages/core/src/__tests__/table.test.ts:235:      c.state = 'seated_waiting_order'; // Khách ngồi nhưng chưa nhận order (chưa có đơn trong state.orders)
packages/core/src/__tests__/table.test.ts:254:      c.state = 'order_taken';
packages/core/src/__tests__/table.test.ts:279:      c1.state = 'order_taken';
packages/core/src/__tests__/table.test.ts:284:      c2.state = 'order_taken';
packages/core/src/__tests__/table.test.ts:312:      c1.state = 'order_taken';
packages/core/src/__tests__/table.test.ts:316:      c2.state = 'order_taken';
packages/core/src/__tests__/table.test.ts:326:      expect(c1.state).toBe('eating');
packages/core/src/__tests__/table.test.ts:327:      expect(c2.state).toBe('order_taken'); // C2 vẫn chờ
packages/core/src/__tests__/table.test.ts:338:      expect(c2.state).toBe('eating');
packages/core/src/__tests__/table.test.ts:372:      customer.state = 'order_taken';
packages/core/src/__tests__/table.test.ts:381:      expect(customer.state).toBe('eating');
packages/core/src/__tests__/table.test.ts:469:      c1.state = 'order_taken';
packages/core/src/__tests__/table.test.ts:473:      c2.state = 'order_taken';
packages/core/src/sim/interact.ts:65:    } else if (c.state === 'seated_waiting_order') {
packages/core/src/sim/interact.ts:68:        c.state = 'order_taken';
packages/core/src/sim/orders.ts:12:    if (c.state === 'seated_waiting_order' || c.state === 'order_taken') {
packages/core/src/sim/orders.ts:29:        events.push({ type: 'customer_leave' });
packages/core/src/sim/orders.ts:31:    } else if (c.state === 'eating') {
packages/core/src/sim/orders.ts:40:        events.push({ type: 'customer_leave' });
packages/core/src/sim/orders.ts:71:            state: 'seated_waiting_order',
packages/core/src/sim/orders.ts:110:            state: 'seated_waiting_order',
packages/core/src/sim/orders.ts:144:  if (orderIdx === -1 || c.state !== 'order_taken') {
packages/core/src/sim/orders.ts:180:    // Change customer to eating
packages/core/src/sim/orders.ts:181:    c.state = 'eating';
packages/core/src/sim/stations.ts:159:              if (c && c.state === 'order_taken') {
packages/core/src/types.ts:77:  state: 'seated_waiting_order' | 'order_taken' | 'eating';
packages/core/src/types.ts:81:  timer: number;              // dùng cho eating duration
packages/core/src/types.ts:124:export type EventType = 'chop_done' | 'cook_done' | 'burnt' | 'serve_ok' | 'serve_fail' | 'order_new' | 'order_expired' | 'pickup' | 'drop' | 'wash_done' | 'trash' | 'timeup' | 'dash' | 'throw' | 'catch' | 'splat' | 'ignite' | 'extinguish' | 'pot_done' | 'soup_burnt' | 'oven_done' | 'pizza_burnt' | 'streak_up' | 'streak_lost' | 'customer_spawn' | 'customer_order' | 'customer_leave';
```

**Đánh giá trạng thái hiện tại:**
- `CustomerState.state` hiện chỉ hỗ trợ union 3 giá trị: `'seated_waiting_order' | 'order_taken' | 'eating'`.
- Chưa có trạng thái `'leaving'` trong core types.
- Chưa có trường `waitLeft` cho khách chờ gọi món, và chưa có trường `angry` để client biết khách đang giận.
- `customer_leave` hiện chỉ có `{ type: 'customer_leave' }`, chưa có trường `reason: 'served' | 'expired' | 'no_order_taken'`.

---

### b) Đọc `packages/core/src/sim/orders.ts` (dòng 10–43)

Đoạn code hiện tại:
```ts
10:   for (let i = state.customers.length - 1; i >= 0; i--) {
11:     const c = state.customers[i]!;
12:     if (c.state === 'seated_waiting_order' || c.state === 'order_taken') {
13:       c.patience -= dt;
14:       if (c.patience <= 1e-5) {
15:         // Customer angry, leave
16:         state.customers.splice(i, 1);
17:         state.expired++;
18:         state.score = Math.max(0, state.score - ORDER_EXPIRE_PENALTY);
19:         state.streak = 0;
20:         
21:         const table = state.stations.find(s => s.x === c.x && s.y === c.y);
22:         if (table) table.customerId = undefined;
23:         
24:         const orderIdx = state.orders.findIndex(o => o.customerId === c.id);
25:         if (orderIdx >= 0) state.orders.splice(orderIdx, 1);
26:         
27:         events.push({ type: 'order_expired' });
28:         events.push({ type: 'streak_lost' });
29:         events.push({ type: 'customer_leave' });
30:       }
31:     } else if (c.state === 'eating') {
32:       c.timer += dt;
33:       if (c.timer >= 5.0) { // 5s to eat
34:         state.customers.splice(i, 1);
35:         const table = state.stations.find(s => s.x === c.x && s.y === c.y);
36:         if (table) {
37:           table.customerId = undefined;
38:           table.item = { type: 'plate', dirty: true, contents: [] };
39:         }
40:         events.push({ type: 'customer_leave' });
41:       }
42:     }
43:   }
```

**Xác nhận:**
- Đúng như phản hồi: khách ở trạng thái `seated_waiting_order` hiện **không có bộ đếm chờ gọi món riêng (`waitLeft`)**, mà đang trừ trực tiếp vào `c.patience` (vốn là thời gian chờ món sau khi đã gọi).
- Khi hết hạn ở dòng 14, khách bị xóa ngay lập tức (`splice(i, 1)`), không có thời gian chuyển tiếp 0.6s và không phân biệt lý do `no_order_taken` vs `expired`.

---

### c) Kết quả grep `customer_leave` trong `apps/client/src`

Lệnh thực thi:
```powershell
git grep -n "customer_leave" apps/client/src
```

Output:
```
(Exit code 1 - Không tìm thấy dòng nào)
```

**Xác nhận:**
- Hiện tại `apps/client/src` hoàn toàn **chưa bắt hoặc xử lý sự kiện `customer_leave`**. Client chỉ xóa model khách khi ID của khách không còn nằm trong `snap.customers` (tại `ThreeRenderer.ts` dòng 489–495).

---

## 2. BƯỚC 1 — LUẬT & QUYẾT ĐỊNH (Ghi nhận trong `docs/DECISIONS.md`)

- `CUSTOMER_ORDER_WAIT = 30` giây (hằng số trong `constants.ts`).
- `CUSTOMER_LEAVE_DURATION = 0.6` giây (thời gian khách ở trạng thái `leaving` trước khi bàn trống).
- Khách vào bàn ở trạng thái `seated_waiting_order` với bộ đếm `waitLeft = 30`.
- Hết `waitLeft` mà chưa nhận order: khách chuyển sang `leaving`, phát `customer_leave` với `reason: 'no_order_taken'`, trừ `ORDER_EXPIRE_PENALTY` (10 điểm), không tăng điểm, tính `expired++`, reset `streak = 0`.
- Khi người chơi nhận order: `waitLeft` không còn dùng (`undefined`); đơn dùng `patience` theo recipe (`ORDER_PATIENCE_BY_RECIPE`).
- Angry: khi đơn đang chờ có `patience` còn dưới 20%, khách có cờ `angry = true`.
- Theo yêu cầu trực tiếp của người dùng trong phiên làm việc: Thay vì cho nhân vật nảy người, nhân vật thực hiện animation `sitting_angry` (`raw-assets/character-animation/Sitting Angry.fbx` được nạp vào client). Trên bong bóng HUD hiển thị icon 😠.
- Sau khi giận, đơn hết hạn: khách rời sau 0.6 giây (`reason: 'expired'`), trừ 10 điểm, `expired++`, `streak = 0`.
- Phục vụ thành công: `customer_leave` với `reason: 'served'` sau 5 giây ăn (`eating`), để lại đĩa bẩn tại bàn `Q`.

---

## 3. BƯỚC 2 — THỰC HIỆN CORE

### Danh sách file sửa đổi trong Core:
1. `packages/core/src/constants.ts`: Thêm `CUSTOMER_ORDER_WAIT = 30`, `CUSTOMER_LEAVE_DURATION = 0.6`.
2. `packages/core/src/types.ts`: Cập nhật `CustomerState` (`state: 'seated_waiting_order' | 'order_taken' | 'eating' | 'leaving'`, `waitLeft?: number`, `angry?: boolean`), `GameEvent` (`reason?: ServeFailReason | CustomerLeaveReason`, `customerId?: number`).
3. `packages/core/src/sim/orders.ts`: Triển khai đếm `waitLeft` cho `seated_waiting_order`, ngưỡng < 20% cho `angry`, trạng thái `leaving` (0.6s), sự kiện `customer_leave` với `reason: 'served' | 'expired' | 'no_order_taken'`.
4. `packages/core/src/sim/interact.ts`: Tương tác lấy order xóa `waitLeft = undefined` và gán `angry = false`.
5. `packages/core/src/sim/movement.ts`: Xử lý an toàn `input.mx` và `input.my` (tránh `NaN` khi input chỉ có `{ interact: true }`).
6. `docs/PROTOCOL.md`: Cập nhật mô tả sự kiện `customer_leave` và schema `CustomerState`.
7. `packages/core/src/__tests__/customerLifecycle.test.ts`: Bộ test tự động 5 tiêu chí vòng đời khách.
8. `packages/core/src/__tests__/b11.test.ts`: Cập nhật snapshot Golden Hashes.

### Bảng Golden Hashes trước và sau Phase 1:
| Map | Hash cũ (Phase 0) | Hash mới (Phase 1) | Lý do |
| :--- | :--- | :--- | :--- |
| `b08` | `17ca3daa275c4a4afe239082126afa4287ae7eb192d2937f5cc254058a07f71e` | `3d673602eeca514626f0afc5a2c20ce08b858aee25380c864658081d6d03390f` | Có bàn Q/khách: State chứa `waitLeft: 30` và `angry: false` |
| `bep_doi` | `7a6c2ac82ae689824e0b94dba208a57c3336def63ae37e930d2e8b4a326ea26d` | `26ee1a7d0494acbc23784610aee774e6f5842558674dce2cc9949051ea571ddb` | Có bàn Q/khách: State chứa `waitLeft: 30` và `angry: false` |
| `bep_lo_nuong` | `3c34c04455997a792ac9dc47b0a19711ee9f43e90fe4cbbdf0f16ad0927f6012` | `5e118fd62555be465c14e1a8124b96dce5336f8738471563813b25e89e8b5c5b` | Có bàn Q/khách: State chứa `waitLeft: 30` và `angry: false` |
| `level1` | `77f2314b7db7d7c296d983b863863cb86619ff51e24ec5b113aa3f37dd4ad8aa` | `5b0a5921927d4e899dbd6d5f6797e99c1331fc0b5c34bfad91805125f943a301` | Có bàn Q/khách: State chứa `waitLeft: 30` và `angry: false` |
| `level2` | `80224a22ac60ceab9788f532686f33c6ad3827fb3f6ced74a0cb094a883b88ef` | `e884610ab611158e5adc2109b58bcb499a7f3794f3a2b3af430d47d5f012e8f6` | Có bàn Q/khách: State chứa `waitLeft: 30` và `angry: false` |
| `level3` | `62da5b304a14f241a1e18bd09b4855baca6584e4086af290fc739f5c0019f21d` | `d0d76207f95491d08dd242ff778b671e0dcdf0c94df2329eefd3174ab5a0a4fd` | Có bàn Q/khách: State chứa `waitLeft: 30` và `angry: false` |
| `nha_hang_mo` | `065199e8cdc0edf92e502048c41f13848ff69a390204ab04caf231702663d095` | `915b67845bb0bb46e03c15afd9efee67d3deb0631077ecb01c906c0bbb5d5349` | Có bàn Q/khách: State chứa `waitLeft: 30` và `angry: false` |
| `test_carry` | `4fc5de590286b0cfb7ef0e3f30dfd02c1d67b6db84ac92a99ef78b2f0095c6d4` | `4fc5de590286b0cfb7ef0e3f30dfd02c1d67b6db84ac92a99ef78b2f0095c6d4` | **Giữ nguyên 100%**: không có bàn Q/khách |
| `tutorial` | `3ec2b335ace792e9c46b2b3be78194c515e9a1f4530125a5dfbc46456c265903` | `1e9985a3c8686da9bd5787abc1407ef10d7241fd13c4b9b904bd2fd8984d813d` | Có bàn Q/khách: State chứa `waitLeft: 30` và `angry: false` |

---

## 4. BƯỚC 3 — THỰC HIỆN CLIENT

1. **Hiển thị icon 😠 trên bong bóng**: Khi `c.angry = true`, icon 😠 hiển thị trên bong bóng HUD của khách.
2. **Animation giận**: Theo chỉ định trực tiếp của user, thay vì nảy người bằng code, animation `sitting_angry` được nạp từ `Sitting Angry.fbx` và kích hoạt qua `cm.playAnim('sitting_angry')` khi `c.angry = true`. Khi bình thường, khách quay lại `sitting`.
3. **Hiển thị khi rời đi**:
   - `reason: 'served'`: bong bóng kết thúc bình thường, không có icon 😠.
   - `reason: 'expired'` hoặc `'no_order_taken'`: hiển thị icon 😠 trong 0.4 giây trước khi hủy khỏi DOM.
4. **Bốn khách cùng lúc**: Mỗi khách có một bong bóng chiếu theo tọa độ riêng biệt từ bàn 3D, không chồng chéo.
5. **Hủy bộ nhớ & DOM**: Khi khách rời, model khách gọi `model.dispose()` và bị xóa khỏi Scene; bong bóng DOM gọi `el.remove()`.

---

## 5. BƯỚC 4 — KẾT QUẢ TEST TỰ ĐỘNG (NGUYÊN VĂN)

### a) `pnpm -r typecheck`
```
Scope: 3 of 4 workspace projects
packages/core typecheck$ tsc --noEmit
packages/core typecheck: Done
apps/server typecheck$ tsc --noEmit
apps/server typecheck: Done
apps/client typecheck$ tsc --noEmit
apps/client typecheck: Done
```
Exit code: **0**

### b) `pnpm validate:levels`
```
Level "Băng Chuyền (B08)" (b08):
  [WARN] floor at 3,1 unreachable
  [WARN] floor at 5,1 unreachable
  [WARN] floor at 6,1 unreachable
  [WARN] floor at 9,1 unreachable
  [WARN] floor at 10,1 unreachable
  [WARN] floor at 2,2 unreachable
  [WARN] floor at 3,2 unreachable
  [WARN] floor at 5,2 unreachable
  [WARN] floor at 6,2 unreachable
  [WARN] floor at 9,2 unreachable
  [WARN] floor at 10,2 unreachable
  [WARN] floor at 2,3 unreachable
  [WARN] floor at 3,3 unreachable
  [WARN] floor at 5,3 unreachable
  [WARN] floor at 6,3 unreachable
  [WARN] floor at 9,3 unreachable
  [WARN] floor at 10,3 unreachable
  [WARN] floor at 1,4 unreachable
  [WARN] floor at 2,4 unreachable
  [WARN] floor at 3,4 unreachable
  [WARN] floor at 5,4 unreachable
  [WARN] floor at 6,4 unreachable
  [WARN] floor at 8,4 unreachable
  [WARN] floor at 9,4 unreachable
  [WARN] floor at 10,4 unreachable
All levels validated successfully.
```
Exit code: **0** (0 lỗi)

### c) `pnpm test` (Tổng hợp toàn bộ test suites)
```
Scope: 3 of 4 workspace projects
packages/core test$ vitest run
packages/core test:  RUN  v2.1.2 D:/TrainingProgram/chaos-kitchen2/packages/core
packages/core test:  ✓ src/__tests__/table.test.ts  (14 tests) 178ms
packages/core test:  ✓ src/__tests__/level.test.ts  (57 tests) 678ms
packages/core test:  ✓ src/__tests__/interact.test.ts  (12 tests) 69ms
packages/core test:  ✓ src/__tests__/bep_doi.test.ts  (4 tests) 85ms
packages/core test:  ✓ src/__tests__/dash.test.ts  (8 tests) 66ms
packages/core test:  ✓ src/__tests__/nha_hang_mo.test.ts  (3 tests) 79ms
packages/core test:  ✓ src/__tests__/pizza.test.ts  (5 tests) 147ms
packages/core test:  ✓ src/__tests__/orders.test.ts  (10 tests) 1310ms
packages/core test:  ✓ src/__tests__/b06.test.ts  (8 tests) 84ms
packages/core test:  ✓ src/__tests__/customerLifecycle.test.ts  (5 tests) 124ms
packages/core test:  ✓ src/__tests__/soup.test.ts  (4 tests) 71ms
packages/core test:  ✓ src/__tests__/b07.test.ts  (6 tests) 57ms
packages/core test:  ✓ src/__tests__/b05.test.ts  (4 tests) 62ms
packages/core test:  ✓ src/__tests__/movement.test.ts  (7 tests) 43ms
packages/core test:  ✓ src/__tests__/action.test.ts  (5 tests) 110ms
packages/core test:  ✓ src/__tests__/b08.test.ts  (4 tests) 80ms
packages/core test:  ✓ src/__tests__/recipes.test.ts  (3 tests) 38ms
packages/core test:  ✓ src/__tests__/b09.test.ts  (3 tests) 92ms
packages/core test:  ✓ src/__tests__/b11.test.ts  (1 test) 379ms
packages/core test:  ✓ src/__tests__/sim.test.ts  (5 tests) 71ms
packages/core test:  ✓ src/__tests__/protocol.test.ts  (1 test) 21ms
packages/core test:  ✓ src/__tests__/sample.test.ts  (1 test) 16ms
packages/core test:  ✓ src/__tests__/rng.test.ts  (3 tests) 2856ms
packages/core test:  ✓ src/__tests__/fullPlaythrough.test.ts  (4 tests) 53033ms
packages/core test:  Test Files  24 passed (24)
packages/core test:       Tests  177 passed (177)
packages/core test:    Start at  12:15:46
packages/core test:    Duration  56.65s (transform 3.35s, setup 0ms, collect 10.23s, tests 59.75s, environment 37ms, prepare 20.07s)
packages/core test: Done
apps/server test$ vitest run --fileParallelism=false
apps/server test:  RUN  v2.1.2 D:/TrainingProgram/chaos-kitchen2/apps/server
apps/server test:  ✓ src/__tests__/gameLoop.test.ts  (3 tests) 169ms
apps/server test:  ✓ src/__tests__/resilience.test.ts  (6 tests) 69ms
apps/server test:  ✓ src/__tests__/lobby.test.ts  (3 tests) 80ms
apps/server test:  ✓ src/__tests__/inputQueue.test.ts  (4 tests) 18ms
apps/server test:  ✓ src/__tests__/gameLoopClass.test.ts  (2 tests) 20ms
apps/server test:  ✓ src/__tests__/sanitize.test.ts  (8 tests) 18ms
apps/server test:  ✓ src/__tests__/rateLimit.test.ts  (3 tests) 16ms
apps/server test:  ✓ src/__tests__/roomCode.test.ts  (3 tests) 16ms
apps/server test:  ✓ src/__tests__/bot.test.ts  (3 tests) 22ms
apps/server test:  ✓ src/__tests__/sample.test.ts  (1 test) 8ms
apps/server test:  Test Files  10 passed (10)
apps/server test:       Tests  36 passed (36)
apps/server test:    Start at  12:16:47
apps/server test:    Duration  20.50s (transform 1.81s, setup 0ms, collect 5.83s, tests 434ms, environment 8ms, prepare 5.11s)
apps/server test: Done
apps/client test$ vitest run --fileParallelism=false
apps/client test:  RUN  v2.1.2 D:/TrainingProgram/chaos-kitchen2/apps/client
apps/client test:  ✓ src/__tests__/customerLifecycleClient.test.ts  (5 tests) 554ms
apps/client test:  ✓ src/__tests__/inputController.test.ts  (7 tests) 47ms
apps/client test:  ✓ src/__tests__/menuLobby.test.ts  (5 tests) 646ms
apps/client test:  ✓ src/__tests__/netClient.test.ts  (3 tests) 10722ms
apps/client test:  ✓ src/__tests__/predictor.test.ts  (3 tests) 27ms
apps/client test:  ✓ src/__tests__/settings.test.ts  (5 tests) 36ms
apps/client test:  ✓ src/__tests__/snapshotBuffer.test.ts  (4 tests) 21ms
apps/client test:  ✓ src/__tests__/store.test.ts  (2 tests) 15ms
apps/client test:  ✓ src/__tests__/router.test.ts  (1 test) 15ms
apps/client test:  Test Files  9 passed (9)
apps/client test:       Tests  35 passed (35)
apps/client test:    Start at  12:17:10
apps/client test:    Duration  54.27s (transform 3.65s, setup 0ms, collect 7.40s, tests 12.08s, environment 21.34s, prepare 5.31s)
apps/client test: Done
```
Exit code: **0** (43 test files, 248 tests passed, 0 failed).

---

## 6. BẢNG NGHIỆM THU R0.9

| Tiêu chí | Lệnh + Output | Kết quả |
| :--- | :--- | :--- |
| **Kiểm kê đầy đủ vòng đời khách** | `git grep -n "seated_waiting_order\|..."` ghi file:dòng | **ĐẠT** |
| **Xác nhận orders.ts thiếu waitLeft** | Kiểm tra dòng 10–43 `packages/core/src/sim/orders.ts` | **ĐẠT** |
| **Ghi luật vào DECISIONS trước khi code** | Ghi nhận tại `docs/DECISIONS.md` trước khi sửa core | **ĐẠT** |
| **CUSTOMER_ORDER_WAIT = 30s** | Khai báo hằng số trong `packages/core/src/constants.ts` | **ĐẠT** |
| **Quá 30s chưa nhận đơn: rời, -10đ, expired++** | `customerLifecycle.test.ts` test 1 passed | **ĐẠT** |
| **Nhận đơn trong 29s: không rời, order_taken** | `customerLifecycle.test.ts` test 2 passed | **ĐẠT** |
| **Patience < 20%: angry = true** | `customerLifecycle.test.ts` test 3 passed | **ĐẠT** |
| **Đơn hết hạn: leaving 0.6s, reason 'expired'** | `customerLifecycle.test.ts` test 4 passed | **ĐẠT** |
| **Phục vụ thành công: ăn 5s, reason 'served'** | `customerLifecycle.test.ts` test 5 passed | **ĐẠT** |
| **Cập nhật docs/PROTOCOL.md** | Ghi nhận schema `CustomerState` và payload `customer_leave` | **ĐẠT** |
| **Client icon 😠 trên bubble khi angry** | `customerLifecycleClient.test.ts` test 2 passed | **ĐẠT** |
| **Client animation Sitting Angry** | Nạp `Sitting Angry.fbx` -> `sitting_angry` animation theo yêu cầu user | **ĐẠT** |
| **Reason đúng khi customer_leave** | `customerLifecycleClient.test.ts` test 3, 4 passed | **ĐẠT** |
| **Bốn khách 4 bong bóng không chồng** | `customerLifecycleClient.test.ts` test 1 passed | **ĐẠT** |
| **Không rò bộ nhớ khi khách rời** | `ChefModel.dispose()` & `el.remove()` trong HUD | **ĐẠT** |
| **pnpm -r typecheck** | Exit code 0, 0 lỗi TypeScript | **ĐẠT** |
| **pnpm validate:levels** | Exit code 0, 0 lỗi level | **ĐẠT** |
| **pnpm test** | 43 test files passed, 248 tests passed, 0 failed | **ĐẠT** |
| **Bảo toàn Golden test_carry (không có khách)** | `test_carry` hash giữ nguyên 100% | **ĐẠT** |
| **Không đụng chạm ngoài phạm vi** | Không đổi map, món, sprint, camera, menu, âm thanh | **ĐẠT** |
