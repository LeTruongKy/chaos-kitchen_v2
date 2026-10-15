# 04 — DANH SÁCH TASK V2 "CHAOS KITCHEN" (Nâng cấp giống Overcooked)

> **Tài liệu bắt buộc đọc trước mỗi task:** `01_CODING_RULES.md` + `03_V2_RULES_ADDENDUM.md`.
> Quy trình làm việc, báo cáo, điều cấm: như file 01 (mục 0, 12, 13) + file 03 (mục 9).
> Task V1 (T00–T30) đã xong và **không được phá**.

## Prompt mẫu giao việc (dùng cho mọi task)

```
Bạn là lập trình viên dự án Chaos Kitchen, đang làm giai đoạn V2.
1) Đọc 01_CODING_RULES.md và 03_V2_RULES_ADDENDUM.md (file 03 thắng khi mâu thuẫn).
2) Thực hiện đúng task <ID> trong 04_V2_TASKS.md, chỉ task này.
3) Chạy pnpm -r typecheck && pnpm -r lint && pnpm test (xanh) trước và sau khi làm.
4) Với task đồ họa/UI: chạy game thật, chụp ảnh lưu vào docs/screens/<ID>/, đo FPS.
5) Báo cáo theo mẫu mục 12 file 01 kèm bằng chứng từng tiêu chí. Mơ hồ thì chọn phương án đơn giản nhất và ghi docs/DECISIONS.md.
```

## Thứ tự & phụ thuộc

```
A00 → A01 → A02
A02 → B01 → B02 → B03 ─┐
          B01 → B04 → B05 → B06 → B07 → B08 → B09 → B10 → B11
B11 → C01 → C02 → C03 → C04            (gameplay chơi được qua mạng — MỐC 1)
A02 → D00 → D01 → D02 → D03 → D04 → D05 → D06 → D07 → D08   (3D song song với B/C)
C04 + D08 → D09 → D10 → D11
D11 → E01 → E02 → E03 → E04 → E05 → E06
B11 → F01..F10 (cần C04 để thử thật)
D08 → G01 → G02 → G03
E06 + F10 → H01 → H02 → H03 → H04 → H05
```
**Mốc kiểm tra:** sau C04 (gameplay mới chơi được), sau D08 (nhìn 3D chơi được), sau E06 (UI hoàn chỉnh), sau F10 (đủ màn), sau H05 (bản V2).
> Có thể giao nhóm B–C và nhóm D cho 2 phiên AI khác nhau chạy song song vì chúng chỉ giao nhau qua `RenderFrame`/`IGameRenderer`.

---

# PHASE A — NỀN & CHUẨN BỊ

## A00 — Kiểm toán hiện trạng & đưa về đúng đặc tả
**Phụ thuộc:** không.
**Việc cần làm:**
1. Chạy `pnpm install && pnpm -r typecheck && pnpm -r lint && pnpm test && pnpm build`; ghi kết quả.
2. Viết `docs/AUDIT.md`: đối chiếu code với `01_CODING_RULES.md` mục 5 (hằng số, kiểu, luật tương tác, đơn hàng, vòng đời). Mỗi chỗ **lệch** ghi: file, hiện trạng, đặc tả, quyết định (sửa về đúng spec / giữ nguyên + lý do).
3. **Bắt buộc sửa về đúng spec:** (a) máy cấp đĩa phải **có số đĩa hữu hạn** `level.plates` (không vô hạn), đĩa chỉ tăng bằng rửa; (b) đơn hết hạn trừ `ORDER_EXPIRE_PENALTY` và điểm không âm; (c) `RESULTS_SECONDS` hiện là 5 (đã đổi so với spec): chấp nhận 5, cập nhật file 01 hằng số + ghi DECISIONS.
4. Đo **baseline**: kích thước bundle (gzip), FPS trung bình client (60s, 2 tab), CPU server 4 bot 60s → ghi `docs/BASELINE.md`.
5. Gắn tag `v0.1.0` nếu chưa có; tạo nhánh `v2/main` (hoặc làm trên `main` nếu không dùng nhánh).
6. Đảm bảo mọi script tiện ích chạy trên Windows (không `.sh`).

**Nghiệm thu:**
- [ ] `docs/AUDIT.md` đủ các mục, không còn lệch chưa quyết định
- [ ] Test cho máy cấp đĩa hữu hạn (hết đĩa thì không nhận được) và đã xanh
- [ ] `docs/BASELINE.md` có 3 số đo

## A01 — Hệ thống Settings
**Phụ thuộc:** A00.
**Việc cần làm:** `apps/client/src/state/settings.ts`: `Settings = { quality: 'low'|'medium'|'high'; renderer: '2d'|'3d'; master: number; music: number; sfx: number; showFps: boolean; keybinds: {...} }`; lưu `localStorage` khóa `ck_settings_v2` (try/catch, validate từng trường, giá trị sai → mặc định); `getSettings()`, `updateSettings(patch)`, `subscribe`. Tham số URL `?r=2d|3d&q=low|medium|high&fps=1` ghi đè tạm thời. Tự đoán quality ban đầu: `navigator.hardwareConcurrency`, `devicePixelRatio`, mobile → `low`.
**Nghiệm thu:**
- [ ] Unit test: dữ liệu hỏng/thiếu trường → mặc định; patch hợp lệ lưu đúng; URL override không ghi đè bộ nhớ
- [ ] Không có màn hình UI ở task này (UI ở E04)

## A02 — Tách `IGameRenderer` (chuẩn bị đổi sang 3D)
**Phụ thuộc:** A01.
**Việc cần làm:**
1. Tạo `game/renderer/IGameRenderer.ts` đúng mục 2.3 file 03; kiểu `RenderFrame` (`players: {id,x,y,fx,fy,vx,vy,held,acting,dashing,color,name,connected}[]`, `stations`, `projectiles`, `orders`, `score`, `timeLeft`, `streak`, `localPlayerId`, `targetTile`).
2. Tạo module `game/frame/FrameBuilder.ts` gom: `SnapshotBuffer` (nội suy người khác) + `Predictor` (người cục bộ) + `getTargetTile` → xuất `RenderFrame` mỗi frame. **Toàn bộ logic mạng/dự đoán nằm ở đây, không nằm trong renderer.**
3. Bọc code Phaser hiện tại thành `PhaserRenderer implements IGameRenderer` (không đổi hình ảnh). `GameScreen` chọn renderer theo `settings.renderer`.
4. HUD vẫn là DOM, nhận `RenderFrame` qua store/callback.

**Nghiệm thu:**
- [ ] Game 2D chạy y như trước (e2e smoke xanh, ảnh chụp trước/sau giống nhau)
- [ ] Test `FrameBuilder` thuần (nội suy + dự đoán → frame đúng)
- [ ] `PhaserRenderer` không import `colyseus.js`/`NetClient`

---

# PHASE B — GAMEPLAY CORE V2 (chỉ `@kitchen/core`, TDD)

## B01 — Hợp đồng dữ liệu V2
**Phụ thuộc:** A02.
**Việc cần làm:** cập nhật `constants.ts`, `types.ts`, `protocol.ts`, `PROTOCOL_VERSION=2` đúng mục 3.1, 3.2, 4 file 03; cập nhật `createGameState` (khởi tạo các trường mới: `vx,vy,dashT,dashCd,throwCd`, station `onFire,fireTimer,burntTimer`, `projectiles:[]`, `streak:0`); `isPlayerInput` nhận thêm `dash`,`throw` (bắt buộc boolean; client V1 cũ bị từ chối); `docs/PROTOCOL.md` cập nhật. Giữ test cũ xanh (sửa fixture cho phù hợp).
**Nghiệm thu:**
- [ ] Typecheck xanh toàn repo (client/server dùng kiểu mới, chưa cần hành vi)
- [ ] Test `isPlayerInput` phiên bản mới ≥ 12 ca
- [ ] `toSnapshot` vẫn deep clone, gồm các trường mới

## B02 — Di chuyển có quán tính, băng trượt, va chạm người–người
**Phụ thuộc:** B01.
**Việc cần làm:** hiện thực mục 3.3 (trừ lướt) trong `sim/movement.ts`: `simulateMove` thuần (có `MoveState`), tile `~` (thêm vào `TileType` là `'ice'`, walkable như floor), tile `_` (`'pit'`, không walkable) và thêm vào parser (T02 mở rộng; validator ở B10). Va chạm người–người trong `step` sau khi mọi người di chuyển. Xóa alias `PLAYER_SPEED`.
**Nghiệm thu (test):**
- [ ] Giữ phím phải từ đứng yên: sau `PLAYER_MAX_SPEED/PLAYER_ACCEL` giây (±1 tick) đạt tốc độ tối đa; không vượt quá
- [ ] Thả phím: dừng hẳn sau `PLAYER_MAX_SPEED/PLAYER_FRICTION` giây (±1 tick)
- [ ] Trên băng: tăng tốc chậm hơn, trượt xa hơn (so sánh quãng đường dừng ≥ 5 lần sàn thường)
- [ ] Đổi hướng đột ngột không "teleport": vận tốc liên tục
- [ ] Hai người chạy ngược chiều vào nhau: tách ra, không chồng nhau, không xuyên tường (fuzz 5.000 bước)
- [ ] Không bao giờ vào tile không walkable (fuzz 10.000 bước trên cả 3 level)
- [ ] Đường chéo vẫn không nhanh hơn

## B03 — Lướt (Dash)
**Phụ thuộc:** B02.
**Việc cần làm:** mục 3.3(2). Trong `step`: `dashCd`/`dashT` giảm theo dt; không cho `interact/act/throw` khi `dashT>0`; va tường dừng lướt; xung đẩy người khác. Event `dash`.
**Nghiệm thu (test):**
- [ ] Lướt đi quãng đường ≈ `DASH_SPEED·DASH_DURATION` (±5%) trên sàn trống
- [ ] Bấm dash khi `dashCd>0` → bị bỏ qua; sau `DASH_COOLDOWN` mới lướt lại được
- [ ] Đứng yên (fx,fy mặc định) vẫn lướt theo hướng nhìn
- [ ] Lướt vào tường dừng ngay; lướt vào người khác tạo xung đẩy
- [ ] Trong lúc lướt `interact` bị bỏ qua và **không bị mất**: (quyết định: bỏ qua hẳn, ghi DECISIONS)

## B04 — Dụng cụ nấu: Chảo & Nồi (cầm được)
**Phụ thuộc:** B01.
**Việc cần làm:** mục 3.4 file 03 (bảng tình huống + nấu). Thêm ký tự `s`, cập nhật `S` (bếp có sẵn chảo). `createGameState` đặt `ToolItem` sẵn trên các stove. Thay luật stove V1 (không nhận meat trực tiếp). Tách `sim/tools.ts`. Cập nhật `recipes.ts`: `canAddToPlate` xử lý thịt từ chảo. Cập nhật tests cũ liên quan stove.
**Nghiệm thu (test, mỗi dòng bảng 3.4 ≥ 1 test):**
- [ ] Thịt sống vào chảo trên bếp: 8s chín, +6s cháy; chảo đặt trên counter: `progress` không tăng
- [ ] Nhấc chảo đang nấu dở đi rồi đặt lại bếp: tiếp tục từ `progress` cũ
- [ ] Đĩa sạch nhận thịt chín từ chảo; thịt cháy thì không
- [ ] Chảo + thùng rác → chảo rỗng còn nguyên tool
- [ ] Stove không nhận meat trực tiếp; chảo không nhận lettuce
- [ ] Tay chỉ cầm 1 vật (tool đếm là 1 vật)

## B05 — Nguyên liệu mới & Súp
**Phụ thuộc:** B04.
**Việc cần làm:** thêm `onion`, `mushroom`, crate `N`,`H`, thái được; nồi (mục 3.4–3.5): nhận 3 nguyên liệu **cùng id đã thái**, tự nấu khi đủ và nằm trên bếp; đĩa nhận `soup_*`; 3 recipe súp; `ORDER_PATIENCE_BY_RECIPE`; `matchRecipe` hỗ trợ; event `pot_done` (khi chín), `soup_burnt`.
**Nghiệm thu (test):**
- [ ] Nồi nhận 3 cà chua đã thái; không nhận cà chua raw, không nhận loại khác khi đã có loại khác, không nhận quá 3
- [ ] Nồi chưa đủ 3 không nấu (progress đứng yên) dù nằm trên bếp
- [ ] Đủ 3 → 15s chín (`pot_done`) → +10s cháy (`soup_burnt`)
- [ ] Đĩa nhận súp chín thành `soup_tomato:cooked`; `matchRecipe` → `tomato_soup`; phục vụ đúng cộng 40 + tip
- [ ] Súp cháy không lên đĩa được

## B06 — Lửa & bình chữa cháy
**Phụ thuộc:** B05.
**Việc cần làm:** mục 3.6 đầy đủ: `burntTimer`, bốc lửa, lan lửa bằng RNG seed, chặn tương tác station đang cháy, station `E` (ký tự `E`), `ToolItem extinguisher`, xịt giữ `act`, nón 60°, `EXTINGUISH_TIME`. Event `ignite`, `extinguish`.
**Nghiệm thu (test):**
- [ ] Thịt cháy trên bếp: sau đúng 4s thì bốc lửa (`ignite`), contents bị xóa; lấy chảo ra trước 4s thì không cháy
- [ ] Station cháy không nhận `interact` (không đổi state)
- [ ] Lan lửa: với seed cố định, sau 30s lửa lan sang đúng tập station đã ghi trong test (golden); station không phải counter/cutting/stove không bao giờ cháy
- [ ] Cầm bình, giữ `act` hướng vào lửa trong tầm 2.2 và nón 60°: sau 1.2s tắt (`extinguish`); ngoài nón/ngoài tầm không tắt; nhả giữa chừng thì tiến độ giảm
- [ ] Trả bình về giá `E`; hai người cùng xịt không nhanh gấp đôi
- [ ] Lửa lan nhưng vật trên station bị xóa; không lỗi khi station đang giữ tool

## B07 — Ném & Bắt (Throw/Catch) + Pit
**Phụ thuộc:** B03, B05.
**Việc cần làm:** mục 3.7. `sim/throw.ts`: tạo projectile, `stepProjectiles(state,dt)` (dùng chung trong `step` sau xử lý người chơi), bắt, đặt vào station theo luật nhận, `splat`. Pit không chặn đạn.
**Nghiệm thu (test):**
- [ ] Cầm cà chua ném sang phải qua 3 ô sàn: rơi vào counter trống ở ô thứ 4 → counter có cà chua
- [ ] Ném qua pit: vật bay qua, rơi đúng chỗ
- [ ] Người khác tay rỗng trong `CATCH_RADIUS` → bắt được; tay đầy → không bắt, vật tiếp tục/rơi
- [ ] Ném vào counter đã có vật → `splat`, vật mất
- [ ] Ném đĩa/tool → bị từ chối (không đổi state)
- [ ] Vượt `THROW_MAX_RANGE` → `splat`
- [ ] `throwCd` hoạt động; deterministic (golden)

## B08 — Băng chuyền
**Phụ thuộc:** B05.
**Việc cần làm:** mục 3.8. Tile `>`,`<`,`^`,`v` → `'conveyor'` với `dir`. Tick di chuyển, chuyển station kề, chờ ở cuối, nhặt bất kỳ lúc.
**Nghiệm thu (test):**
- [ ] Item trên conveyor dài 3 ô đi hết trong `3/CONVEYOR_SPEED` giây (±1 tick) và rơi vào counter trống ở cuối
- [ ] Cuối băng là counter đầy → item chờ, không mất; counter trống ra thì chuyển tiếp
- [ ] Conveyor nối conveyor; kết thúc ở cửa phục vụ với đĩa khớp đơn → phục vụ thành công như tay đưa
- [ ] Nhặt giữa chừng bằng tay rỗng được; đặt lên băng bằng interact được

## B09 — Đơn hàng V2 & Tip streak
**Phụ thuộc:** B05.
**Việc cần làm:** mục 3.9. `orderScript` trong `LevelDef` (+ `createGameState` lưu vào state `orderScript` kèm chỉ số tiếp theo), `streak`, tính reward. Event `streak_up`, `streak_lost`.
**Nghiệm thu (test):**
- [ ] `orderScript` cho đơn xuất hiện đúng giây (±1 tick), đúng thứ tự, deterministic
- [ ] Streak: phục vụ 5 đơn liên tiếp → multiplier 1,2,3,4,4; hết hạn 1 đơn → về 0
- [ ] reward = `base + round(TIP_MAX·ratio)·max(1,streak)` (bảng chân trị ≥ 8 ca)
- [ ] Không có `orderScript` → hành vi random V1 giữ nguyên (golden cũ còn đúng)
- [ ] Mỗi recipe dùng đúng patience riêng

## B10 — Level format V2 & Validator
**Phụ thuộc:** B02–B09.
**Việc cần làm:** parse đầy đủ ký tự mới (`N H s E _ ~ > < ^ v`), `LevelDef` thêm `world, theme, orderScript?, hints?, unlockStars?`; validator theo mục 3.12; `docs/LEVEL_FORMAT.md` (bảng ký tự + ví dụ + danh sách lỗi/cảnh báo). `validateLevel` trả `{errors: string[]; warnings: string[]}` (cập nhật nơi gọi).
**Nghiệm thu:**
- [ ] ≥ 15 level sai cố ý cho đúng lỗi (thiếu crate súp, `s` không có nguyên liệu, `E` bị bao kín, conveyor kết thúc vào tường, `~` trên counter…)
- [ ] Level V1 vẫn hợp lệ (chuyển `S` cũ sang `S` có chảo, test cập nhật)
- [ ] Script `pnpm validate:levels` in cả cảnh báo

## B11 — Bất biến, fuzz & Golden tests
**Phụ thuộc:** B10.
**Việc cần làm:** cập nhật `fullPlaythrough` cho chảo; thêm playthrough **súp** và **burger với chảo**; fuzz 200×60s trên mọi level có bất biến mới: không NaN; `held` hợp lệ (tool không nhân bản); tổng số `ToolItem` trên bản đồ + trong tay **không đổi** (bảo toàn); số đĩa (sạch + bẩn + đang cầm/đặt + đang trên băng/đợi quay về) **bảo toàn** trừ khi đĩa phục vụ; không vào tile cấm; `streak ≤ 4`; coverage core ≥ 85%. Tạo golden hash cho mỗi level.
**Nghiệm thu:**
- [ ] Tất cả xanh, coverage ≥ 85% (kèm bảng)
- [ ] Golden hash đã commit; đổi 1 hằng số làm golden đỏ (chứng minh test hoạt động)
- [ ] `pnpm --filter @kitchen/core test` < 60s

---

# PHASE C — MẠNG & ĐIỀU KHIỂN V2

## C01 — Server V2
**Phụ thuộc:** B11.
**Việc cần làm:** `KitchenRoom`: kiểm tra `PROTOCOL_VERSION` khi join (`version_mismatch`); input mới `dash/throw`; snapshot có `projectiles/streak`; phát event mới; `select_level` kiểm tra level; rate-limit cho `switch_chef` (4/s), `set_solo`; cập nhật `isPlayerInput`; cập nhật bot (`scripts/bot.ts`) để cầm chảo, nấu súp cơ bản (hoặc ít nhất không crash).
**Nghiệm thu:**
- [ ] Test tích hợp: join sai phiên bản bị từ chối đúng mã lỗi
- [ ] Client giả gửi `dash` → vị trí trong snapshot có vận tốc lướt; `throw` → xuất hiện projectile trong snapshot
- [ ] 4 bot × 3 phút trên level mới không lỗi; CPU < 30% một core (ghi số)

## C02 — Điều khiển V2 & Dự đoán V2
**Phụ thuộc:** C01.
**Việc cần làm:**
1. Phím: `Space/E` interact; `Shift/F` giữ act; `K` hoặc `Right Shift` = **Dash**, `J` hoặc `Enter` = **Throw**, `Tab` = đổi chef (solo), `1–4` emote. Cấu hình ở `settings.keybinds`, hiển thị trong hướng dẫn.
2. Mobile: thêm nút **Dash** và **Ném** (4 nút hành động tổng, bố cục vòng cung dưới phải), nút **Đổi chef** khi solo.
3. `InputController` gửi `dash`, `throw` là cờ cạnh (không mất khi bấm giữa 2 lần gửi).
4. `Predictor`: dùng `simulateMove` V2 (có `vx,vy,dashT,dashCd`), lưu `MoveState` đầy đủ; hòa giải theo `ackSeq`: đặt lại từ snapshot (gồm vận tốc/dash) rồi replay input chưa ack; ngưỡng lerp/snap như T24.
5. Không dự đoán va chạm người–người (chấp nhận chênh nhỏ).

**Nghiệm thu:**
- [x] Test thuần Predictor: chuỗi input có dash + snapshot trễ 6 tick -> kết quả khớp server <= 1e-6 khi không có người khác
- [x] Thủ công với latency 200ms: chạy/lướt tức thì, không rubber-band khi chạy thẳng, lướt, trượt dọc tường, đi trên băng
- [x] Phím không bị kẹt khi mất focus; nút mobile hoạt động đa chạm

## C03 — Chế độ Solo 2 đầu bếp
**Phụ thuộc:** C02.
**Việc cần làm:** mục 3.11: lobby có công tắc **Chơi 1 mình (2 đầu bếp)** (chỉ hiện khi phòng có 1 người, host); server tạo 2 PlayerState, ánh xạ input, `switch_chef`, snapshot `activeChefId`; client: highlight chef đang điều khiển (vòng sáng + mũi tên trên đầu), camera/HUD hiển thị rõ; Tab đổi; khi đổi chef chef cũ **đứng yên và hết tín hiệu `act`**; hủy dự đoán chef cũ đúng cách.
**Nghiệm thu:**
- [x] Một người một mình: tạo phòng → bật Solo → Start → điều khiển 2 chef luân phiên, hoàn thành 1 salad (e2e)
- [x] Đổi chef giữa lúc đang thái → chef cũ dừng thái (progress giữ), chef mới đi nhặt đồ được
- [x] Khi có người thứ 2 vào lobby → Solo tự tắt

## C04 — Kiểm thử mạng V2 (MỐC 1)
**Phụ thuộc:** C03.
**Việc cần làm:** cập nhật e2e Playwright: kịch bản burger với chảo, kịch bản súp, kịch bản lửa (cố tình để cháy → ignite → lấy bình → extinguish), kịch bản ném (2 người, qua counter), dash; chạy ở renderer 2D (vì 3D chưa xong). Cập nhật QA_CHECKLIST (thêm ≥ 25 mục V2).
**Nghiệm thu:**
- [x] `pnpm e2e` xanh 5/5 lần (hoặc 6/6)
- [x] 2 người thật chơi trọn 1 ván có chảo + súp + lửa không lỗi
- [x] **Báo cáo MỐC 1** kèm video/GIF hoặc ảnh chụp nhiều khung

---

# PHASE D — ĐỒ HỌA 3D (Three.js)

## D00 — Khung 3D & quyết định kỹ thuật
**Phụ thuộc:** A02.
**Việc cần làm:**
1. Cài `three` + `@types/three` (ghim phiên bản). Ghi DECISIONS: phiên bản, lý do.
2. `game/renderer3d/ThreeRenderer.ts` implements `IGameRenderer`: tạo `WebGLRenderer` (antialias theo quality, `setPixelRatio(min(dpr, 2))`), scene, camera theo mục 5 file 03, vòng `update`, `resize`, `dispose`. Thêm fallback: nếu WebGL không khả dụng → tự về renderer 2D + toast.
3. Hiển thị tạm: một mặt phẳng + hộp thể hiện từng tile theo màu loại station, hình tròn cho người chơi (chưa đẹp) — chỉ để kiểm tra pipeline và camera.
4. Tham số `?r=3d` chọn renderer.
5. `?debug=1`: hiện `renderer.info` (draw calls, triangles, memory) và FPS.

**Nghiệm thu:**
- [x] Mở `?r=3d`: thấy bản đồ 3 level đúng vị trí tile, người chơi di chuyển đúng (so với 2D)
- [x] Camera tự fit mọi tỉ lệ (360×640, 1366×768, 1920×1080, 21:9) — ảnh chụp
- [x] Đổi level 20 lần: `renderer.info.memory.geometries/textures` không tăng
- [x] WebGL bị tắt → quay về 2D không crash

## D01 — Toon, viền, ánh sáng, bóng
**Phụ thuộc:** D00.
**Việc cần làm:** `renderer3d/materials.ts`: gradient map 3 bậc (tạo bằng `DataTexture`), hàm `toon(color)` (cache theo màu), hàm `withOutline(mesh, thickness)` (inverted hull, dùng chung material viền), cấu hình đèn (Directional có shadow + Hemisphere), bóng theo quality; theme palette (diner/ship/space) ở `renderer3d/themes.ts`; nền & fog nhẹ theo theme.
**Nghiệm thu:**
- [x] Ảnh chụp: vật thể có 3 bậc sáng + viền đen mảnh, bóng đổ đúng hướng
- [x] `quality=low` tắt bóng + viền, FPS cải thiện ≥ 20% so với `high` (ghi số)
- [x] Không rò material/texture (cache có `dispose`)

## D02 — Sàn, tường, nền theo theme
**Phụ thuộc:** D01.
**Việc cần làm:** sàn ô cờ bằng `InstancedMesh`; tile `ice` bóng bẩy xanh nhạt (vật liệu riêng, có vệt sáng); tile `pit` hiển thị hố sâu (đen + viền gạch quanh, có hiệu ứng tối dần xuống); tường ngoài/khung bếp, trang trí nền theo theme (diner: cửa sổ, đèn treo; ship: lan can, sóng biển bên dưới nhún nhẹ; space: sao, hành tinh xa, đèn nhấp nháy) — tất cả **procedural**, không asset ngoài; mọi trang trí nằm ngoài vùng chơi và không che tầm nhìn.
**Nghiệm thu:**
- [x] Ảnh chụp cả 3 theme, nhận ra được theme từ cái nhìn đầu tiên
- [x] Draw call tăng ≤ 30 so với D00; FPS ≥ 55 (`medium`)

## D03 — Mô hình Station
**Phụ thuộc:** D02.
**Việc cần làm:** `renderer3d/stations/*.ts` mỗi loại một factory `createXxx(): THREE.Group` (primitives, có viền): counter (mặt bàn + thân tủ + chân), cutting (bàn + thớt gỗ + dao), stove (bệ + 2 vòng đốt phát sáng khi có nồi/chảo), plate_dispenser (kệ + chồng đĩa — chiều cao chồng theo `cleanCount`), serve (cửa sổ + chuông + biển "SERVE"), dish_return (khay + chồng đĩa bẩn theo `dirtyCount`), sink (bồn + vòi + mặt nước, chồng đĩa bẩn/sạch), trash (thùng + nắp), crate (4 loại + 2 mới: thùng mở nắp, bên trong thấy đồ ăn đặc trưng), extinguisher_rack (giá + bình đỏ khi còn), conveyor (băng + vạch chạy cuộn theo thời gian `uvOffset`/thanh trượt, mũi tên chiều), ice/pit đã ở D02. Hướng quầy: station quay mặt về phía floor kề (nếu nhiều hướng thì ưu tiên theo thứ tự cố định).
**Nghiệm thu:**
- [x] Ảnh chụp từng loại station cạnh nhau (một "bảng mẫu" ở `?debug=1&view=stations`)
- [x] Nhìn từ camera game phân biệt được **mọi** loại station khi không có chữ
- [x] Tất cả factory dùng chung geometry/material cache; draw call mỗi station ≤ 6

## D04 — Đầu bếp (nhân vật) & hoạt họa
**Phụ thuộc:** D01.
**Việc cần làm:**
1. `renderer3d/chef/Chef.ts`: nhân vật procedural đủ bộ phận (mục 5 file 03), có xương giả (Group lồng nhau) để quay tay/chân; màu áo theo màu người chơi; tên + vòng "người của tôi" (ring sáng dưới chân người cục bộ).
2. Máy trạng thái hoạt họa **từ `RenderFrame`** (không từ luật game): `idle` (thở nhẹ), `run` (đung đưa tay chân theo tốc độ), `carry` (2 tay giơ trước), `chop` (tay dao lên xuống khi `acting` tại thớt), `wash` (tay vẫy), `dash` (nghiêng người ra trước + vệt), `throw` (vung tay 0.2s khi có event), `panic` (vẫy tay khi trong 2 tile quanh lửa). Chuyển trạng thái có blend 0.1s.
3. Squash & stretch khi bắt đầu/dừng chạy; quay thân mượt về hướng `(fx,fy)` (lerp góc, tránh xoay vòng dài).
4. Vật đang cầm gắn vào tay (nhận mô hình từ D05).
5. Tối đa 4 chef; tái sử dụng object (không tạo mới khi có người vào/ra: pool).

**Nghiệm thu:**
- [x] Ảnh/GIF từng trạng thái; mắt thường phân biệt được cầm đồ vs tay không, đang chạy vs đứng
- [x] Hướng nhìn mượt; không xoay ngược chiều dài khi đổi hướng
- [x] 4 chef + animation: ≥ 55 FPS `medium`; bộ nhớ không tăng khi vào/ra 20 lần

## D05 — Mô hình đồ ăn & dụng cụ theo trạng thái
**Phụ thuộc:** D01.
**Việc cần làm:** `renderer3d/items/ItemFactory.ts`: `createItem(item: Item): THREE.Object3D` + `updateItem(obj, item)` (cập nhật in-place khi trạng thái đổi, không tạo lại nếu chỉ đổi state). Mô hình & trạng thái:
- Cà chua: cầu đỏ + cuống xanh / chopped = 3 lát tròn xếp / cooked,burnt không áp dụng
- Xà lách: bầu lá xanh / chopped = mảnh lá vụn xếp
- Bánh bun: 2 nửa bánh (trên-dưới) nâu vàng
- Thịt: patty hồng (raw) / nâu (cooked, có vạch nướng) / đen (burnt)
- Hành tây: củ tím-trắng / chopped = vòng hành
- Nấm: mũ nâu + thân / chopped = lát
- Đĩa: đĩa tròn trắng, **bày món theo `contents`** (burger xếp tầng: bun dưới, thịt, rau, cà chua, bun trên; salad = đống rau + lát cà chua; súp = chén súp màu theo loại có hơi nước)
- Đĩa bẩn: ố nâu + vài mảnh vụn
- Chảo: chảo đen cán dài (có/không thịt, thịt đổi màu theo trạng thái)
- Nồi: nồi inox 2 quai (nội dung nhìn thấy mặt súp đổi màu/độ đầy theo số nguyên liệu, sôi bọt khi nấu)
- Bình chữa cháy: đỏ, vòi đen
**Dùng AssetManifest:** nếu có file CC0 phù hợp thì dùng, **luôn có fallback procedural**.
**Nghiệm thu:**
- [x] Bảng mẫu `?debug=1&view=items`: mọi vật × mọi trạng thái, ảnh chụp
- [x] `updateItem` không sinh object mới khi chỉ đổi `state` (kiểm tra bằng đếm)
- [x] Đĩa burger đủ/đang thiếu nhìn khác nhau rõ ràng

## D06 — Hiển thị trạng thái động của Station & Hiệu ứng (VFX)
**Phụ thuộc:** D03, D05.
**Việc cần làm:** hệ hạt `renderer3d/vfx/Particles.ts` (pool, `Points`/`InstancedMesh` + billboard), các hiệu ứng theo mục 5 file 03: hơi nước, xèo xèo, khói cháy, **lửa** (nhiều billboard + ánh sáng điểm yếu `PointLight` tối đa 3 đèn cùng lúc), bọt xà phòng, vụn thái, bụi chạy/lướt, confetti, bọt trắng bình chữa, vệt ném. **Thanh tiến độ** 3D billboard trên station: thái (xanh lá), rửa (xanh dương), nấu (cam→đỏ, nhấp nháy < 2s trước khi cháy), xịt lửa (trắng). Station cháy: vỏ đen + lửa. Station highlight vàng ở `targetTile` (viền phát sáng nhấp nhô nhẹ). Dấu "!" đỏ bật trên chảo/nồi khi sắp cháy.
**Nghiệm thu:**
- [x] Ảnh/GIF mỗi hiệu ứng, kích hoạt từ event/trạng thái thật trong game
- [x] Tối đa 400 hạt hoạt động đồng thời; không tạo object mới mỗi frame (pool)
- [x] `quality=low`: giảm số hạt 60%, tắt PointLight
- [x] FPS ≥ 55 khi có 3 đám lửa + 4 chef + 2 nồi sôi

## D07 — Khung hình (RenderFrame) → 3D hoàn chỉnh & Camera
**Phụ thuộc:** D04, D05, D06.
**Việc cần làm:** `ThreeRenderer.applyFrame` nối tất cả: người chơi, vật trên station, vật bay (projectile: quỹ đạo parabol nhẹ + xoay, bóng dưới đất), đĩa bẩn đang chờ quay về (hiển thị khay ở dish_return), thùng crate, bảng điểm. Camera dịch nhẹ theo trung điểm các chef (mục 5), rung nhẹ (screen shake 0.15s) khi `ignite`/`serve_fail`. Chuyển đổi mượt giữa các trạng thái màn hình (loading level, fade).
**Nghiệm thu:**
- [x] Chơi trọn 1 ván ở `?r=3d` đủ chảo, súp, lửa, ném, băng chuyền (dùng level thử tạm hoặc level trong F)
- [x] Mọi `event` của server có phản hồi hình ảnh tương ứng (bảng đối chiếu event → hiệu ứng trong báo cáo)
- [x] 2 tab 2 người: mượt, không giật

## D08 — Tối ưu & chuẩn hóa chất lượng (MỐC 2)
**Phụ thuộc:** D07.
**Việc cần làm:** `scripts/perf.ts` đo FPS/draw calls/triangles/memory; tối ưu (merge geometry tĩnh, instancing, giảm viền, LOD đơn giản, tắt bóng cho vật nhỏ, giới hạn pixel ratio, `renderer.setAnimationLoop`, ngừng render khi tab ẩn); 3 mức quality đúng định nghĩa; thử trên giả lập CPU 4× chậm; kiểm tra rò bộ nhớ (chơi 10 phút, bộ nhớ không tăng > 20%).
**Nghiệm thu (đo và ghi):**
- [ ] ≥ 55 FPS `medium` / ≥ 45 FPS `high` / ≥ 30 FPS `low` trên laptop GPU tích hợp, 1080p
- [ ] Draw calls ≤ 300, triangles ≤ 150k
- [ ] Rò bộ nhớ: không
- [ ] Báo cáo MỐC 2 kèm ảnh 3 theme + GIF

## D09 — Chuyển hẳn sang 3D, gỡ Phaser
**Phụ thuộc:** C04, D08.
**Việc cần làm:** đặt `renderer` mặc định `3d`; giữ nút "Chế độ đồ họa nhẹ" (fallback 2D) **chỉ nếu** dung lượng/duy trì hợp lý — **quyết định: gỡ Phaser hoàn toàn**; xóa `PhaserRenderer`, dependency `phaser`, code liên quan; chuyển các tiện ích dùng chung (SnapshotBuffer, FrameBuilder…) giữ nguyên. Nếu WebGL không có → hiển thị thông báo rõ ràng ("Trình duyệt không hỗ trợ WebGL"). Cập nhật e2e, README.
**Nghiệm thu:**
- [ ] `pnpm why phaser` không còn; build xanh; bundle gzip ≤ 2.5MB (không âm thanh)
- [ ] e2e xanh trên renderer 3D
- [ ] Không còn tham chiếu `phaser` trong code

## D10 — Nhân vật tùy biến (cosmetic)
**Phụ thuộc:** D09.
**Việc cần làm:** hệ cosmetic: **màu áo** (8 màu), **mũ** (mũ đầu bếp cao, mũ bếp trưởng bẹt, nón len, không mũ), **mặt/loài** procedural: người, mèo, gấu, cáo, thỏ (khác nhau ở tai/mũi/đuôi, cùng khung xương). Lưu `localStorage` (`ck_cosmetic`), gửi trong join options (`cosmetic: {color, hat, species}`) → server sanitize (đúng tập giá trị cho phép) → phát trong `lobby` → mọi client hiển thị đúng. Màn chọn nhân vật trong lobby với **xem trước 3D xoay** (canvas nhỏ riêng).
**Nghiệm thu:**
- [ ] 2 người chọn khác nhau thấy đúng ngoại hình của nhau trong lobby & ván
- [ ] Giá trị rác bị server thay bằng mặc định; xung đột màu tự đổi sang màu trống
- [ ] Xem trước xoay mượt, giải phóng tài nguyên khi đóng

## D11 — Rà soát đồ họa tổng thể
**Phụ thuộc:** D10.
**Việc cần làm:** duyệt từng level × theme × 1/2/4 người; sửa vấn đề che khuất (vật cao che người), viền răng cưa, bóng lệch, màu chìm; kiểm tra khả năng đọc ở 360×640; chế độ **màu dễ nhìn** (tùy chọn: tăng tương phản, chấm hình dạng cho 4 người chơi) trong Settings. Chụp bộ ảnh tham chiếu `docs/screens/final/`.
**Nghiệm thu:**
- [ ] Danh sách vấn đề đã duyệt (≥ 20 mục) và trạng thái
- [ ] Ảnh tham chiếu đủ 3 theme × 2 kích thước
- [ ] Không có chữ/vật bị cắt ở viền màn hình ở mọi tỉ lệ đã liệt kê

---

# PHASE E — GIAO DIỆN & TRẢI NGHIỆM (UI/UX)

## E01 — HUD kiểu "phiếu order"
**Phụ thuộc:** D09.
**Việc cần làm:** thiết kế lại HUD (DOM): phiếu đơn trượt vào từ **trái trên**, mỗi phiếu có icon món, danh sách nguyên liệu + biểu tượng thao tác (🔪 thái / 🔥 nấu / 🥣 nồi), thanh kiên nhẫn chạy cạnh dưới đổi màu (xanh/vàng/đỏ), phiếu rung và đỏ khi < 20%, mất đi có hiệu ứng (xé/trượt). Đồng hồ tròn (vòng chạy) trên cùng giữa, hiển thị số giây khi < 30s (đỏ nhấp nháy). Điểm với icon đồng xu, hiệu ứng nổi `+N` có phân tách `base` / `tip ×streak`. **Chỉ báo tip streak** `x1..x4` bên cạnh điểm (nảy khi tăng, rung khi mất). Toast sự kiện: "Lửa!!", "Thịt cháy!", "Đĩa sai!". Thu nhỏ hợp lý ở mobile (≤ 3 phiếu hiển thị, cuộn).
**Nghiệm thu:**
- [ ] Ảnh chụp desktop + mobile; mọi trạng thái (mới/gần hết hạn/hoàn thành/hết hạn)
- [ ] Không ghi DOM khi giá trị không đổi (đếm trong debug)
- [ ] Thông tin trên phiếu đúng cho cả 6 món

## E02 — Menu & Lobby với nền 3D
**Phụ thuộc:** E01, D10.
**Việc cần làm:** menu có nền 3D (một góc bếp theme diner, các đầu bếp đứng/nhảy, hơi nước), logo "Chaos Kitchen" 3D hoặc chữ bo tròn lớn; lobby hiển thị **các chef 3D đứng thành hàng** với tên/biểu tượng sẵn sàng (thay cho danh sách chữ); chọn màn bằng thẻ có ảnh minh họa (chụp tự động `scripts/thumbs.ts` từ renderer → lưu `public/thumbs/*.jpg`); công tắc **Solo**; chọn nhân vật (D10). Tối ưu: nền 3D dùng chung renderer/WebGL context với game nếu khả thi, hoặc tạm dừng render khi không hiển thị.
**Nghiệm thu:**
- [ ] Ảnh chụp menu/lobby với 1, 2, 4 người; bấm được mọi nút ở mobile
- [ ] Vào/ra màn hình 30 lần: không rò context WebGL (số `WebGLRenderer` active ≤ 2)
- [ ] Chữ người chơi dùng `textContent` (không XSS)

## E03 — Màn "giới thiệu màn chơi" & "Kết quả" đẹp
**Phụ thuộc:** E02.
**Việc cần làm:** trước ván: thẻ giới thiệu 3 giây (tên màn, theme, công thức xuất hiện, điều **mới** của màn như "Cẩn thận lửa!", ngưỡng sao) rồi countdown 3-2-1-GO bằng chữ lớn nảy; sau ván: bảng kết quả **chi tiết**: sao hiện lần lượt kèm âm tăng dần, điểm = tổng giao món + tổng tip, số đơn thành công/hết hạn, **tip streak cao nhất**, MVP nhỏ (người giao nhiều nhất / thái nhiều nhất — server tính từ events, cần thêm `stats` vào `results`), so sánh kỷ lục cá nhân (từ campaign progress), nút Chơi tiếp / Chọn màn / Rời. Nếu 3 sao: confetti 3D.
**Nghiệm thu:**
- [ ] `results` payload bổ sung `stats` (cập nhật protocol, docs, test)
- [ ] Ảnh chụp 0/1/2/3 sao
- [ ] Thẻ giới thiệu hiển thị đúng thông tin từ `LevelDef`

## E04 — Màn Cài đặt
**Phụ thuộc:** A01, E02.
**Việc cần làm:** UI Settings (menu & trong ván bằng Esc, **không dừng game** khi mở trong ván): chất lượng đồ họa, hiện FPS, âm lượng 3 kênh, **gán lại phím** (cho từng hành động, phát hiện trùng), xem hướng dẫn, chế độ màu dễ nhìn. Áp dụng ngay không cần tải lại (đổi quality gọi `renderer.setQuality`).
**Nghiệm thu:**
- [ ] Đổi mọi tùy chọn có hiệu lực ngay và còn lại sau F5
- [ ] Gán phím trùng bị từ chối với thông báo
- [ ] Mở Settings giữa ván: nhân vật vẫn bị điều khiển bởi server (không dừng), input bàn phím không bị kẹt khi đóng

## E05 — Màn học việc (Tutorial) trong game
**Phụ thuộc:** F01 (bản đồ tutorial), E01.
**Việc cần làm:** hệ `hints` của level: hiển thị gợi ý theo thời gian **và theo hành động** (`HintEngine` đọc event/state: ví dụ chờ "người chơi đã cầm cà chua" mới sang gợi ý "Đặt lên thớt rồi giữ Shift"); mũi tên 3D chỉ vào station cần tới; level tutorial không tính sao; lần đầu mở game tự đề xuất vào tutorial (có nút bỏ qua, nhớ lựa chọn). Nội dung tutorial: di chuyển → lấy cà chua → thái → lấy đĩa → làm salad → phục vụ → rửa đĩa → (tùy chọn) lướt/ném.
**Nghiệm thu:**
- [ ] Một người mới (hoặc bot kịch bản) làm theo gợi ý hoàn thành đơn đầu tiên không cần đọc tài liệu khác
- [ ] Gợi ý không che HUD; có nút bỏ qua
- [ ] HintEngine có unit test (chuỗi event → chuỗi gợi ý)

## E06 — Bản đồ chiến dịch (Campaign Map) & tiến trình
**Phụ thuộc:** E03, F01.
**Việc cần làm:** màn **chọn màn** kiểu bản đồ thế giới: 3 thế giới (theme diner/ship/space), các nút level nối bằng đường, hiện số sao (0–3), khóa/mở theo `unlockStars`, hiệu ứng mở khóa; lưu tiến trình `localStorage` (mục 3.13); lobby của host dùng bản đồ này để chọn màn (người khác chỉ xem màn đang chọn); nút **Chế độ nhanh** vẫn cho chọn màn tự do trong các màn đã mở. Module `progress.ts` thuần + test.
**Nghiệm thu:**
- [ ] Test `progress.ts`: lưu/đọc/hỏng dữ liệu/ghi đè khi điểm cao hơn/mở khóa đúng ngưỡng
- [ ] Ảnh chụp bản đồ ở các trạng thái 0 sao, giữa chừng, đủ sao
- [ ] Xóa tiến trình được trong Settings (có xác nhận)

---

# PHASE F — NỘI DUNG MÀN CHƠI

> Mỗi level: tạo file `core/src/levels/<id>.ts`, qua `validateLevel` (không error), có `orderScript` (trừ màn chỉ random), có test "bot tham chiếu hoàn thành được ≥ 1 đơn" bằng script mô phỏng trong `__tests__/levels/<id>.test.ts` (dùng `walkTo` như T09, mô phỏng đủ quy trình của các món chính) và **hiệu chỉnh ngưỡng sao** bằng script `scripts/calibrate.ts` (mô phỏng bot heuristic 1–4 người, lấy điểm trung bình `P`: ngưỡng sao = `[0.35P, 0.6P, 0.85P]` làm tròn 5, ghi trong DECISIONS). Kích thước bản đồ ≥ 12×9; mỗi màn có `name` tiếng Việt vui nhộn, `theme`, `world`, `unlockStars`.

| ID | Tên | World/Theme | Điều mới / thiết kế bắt buộc | recipes | unlockStars |
|---|---|---|---|---|---|
| `tut` (F01) | Học Việc | 1 / diner | 1 chef cần đủ; map nhỏ ≥ 10×7; 1 thớt, 1 bồn, đủ crate salad; `hints` | salad | 0 |
| `w1l1` (F02) | Bếp Nhỏ | 1 / diner | = level1 cũ (đã nâng: chảo `S`) | salad, burger | 0 |
| `w1l2` (F03) | Hai Bên Quầy | 1 / diner | = level2 cũ (nút cổ chai) | salad, burger, burger_tomato | 2 |
| `w1l3` (F04) | Súp Đầu Tiên | 1 / diner | 2 bếp `s` (nồi) + 1 bếp `S`; crate cà chua/hành; **chỉ súp + salad**; học nồi | tomato_soup, onion_soup, salad | 4 |
| `w2l1` (F05) | Bếp Lửa | 2 / ship | **nhiều counter gỗ sát bếp**, 1 giá `E`; burger + súp nhiều; sàn có lối đi hẹp; `orderScript` ép cháy khi vội | burger, burger_tomato, mushroom_soup | 7 |
| `w2l2` (F06) | Qua Vực | 2 / ship | **pit chia 2 nửa** có 2 cầu hẹp 1 ô **hoặc** chỉ ném qua được: nửa trái nguyên liệu+thớt, nửa phải bếp+phục vụ; **bắt buộc ném** cho đơn nhanh | burger, salad | 10 |
| `w2l3` (F07) | Băng Chuyền | 2 / ship | 2 băng: băng 1 đưa nguyên liệu từ kho sang khu sơ chế, băng 2 đưa đĩa tới cửa phục vụ; dish_return ở đầu băng | burger_tomato, tomato_soup, salad | 13 |
| `w3l1` (F08) | Sàn Băng | 3 / space | sàn băng `~` lớn ở giữa, bếp ở 4 góc, quầy hẹp; 4 người chơi; dash hữu ích | burger, onion_soup, mushroom_soup | 16 |
| `w3l2` (F09) | Bếp Hỗn Loạn | 3 / space | = level3 cũ nâng cấp: 3 bếp (2 chảo+1 nồi), 2 `R`/`W`, giá `E`, băng nhỏ | tất cả | 20 |
| `w3l3` (F10) | Đại Tiệc | 3 / space | **tổng hợp**: pit + băng + băng trơn + lửa; dài 240s; `orderScript` dày | tất cả | 25 |

**Nghiệm thu chung cho mỗi task F01–F10:**
- [ ] `validateLevel` không error; cảnh báo (nếu có) được giải thích
- [ ] Test bot tham chiếu hoàn thành ≥ 1 đơn ở mọi số người 1–4 (nếu `1 người` quá khó → bật solo)
- [ ] Ngưỡng sao đã hiệu chỉnh bằng `calibrate.ts` (kèm số liệu)
- [ ] Ảnh chụp 3D của bản đồ (`docs/screens/Fxx/`), nhìn thấy rõ bố cục
- [ ] Chơi thử thật ≥ 1 ván hoàn chỉnh với 2 người; ghi lại nhận xét độ khó

---

# PHASE G — ÂM THANH

## G01 — Bộ âm thanh dùng file + fallback tổng hợp
**Phụ thuộc:** D09.
**Việc cần làm:** `game/audio/AudioEngine.ts` thay `Sfx.ts`: `loadManifest()` tải file ogg/mp3 (CC0, ghi CREDITS) với **fallback** tổng hợp WebAudio (giữ code cũ) khi thiếu file/lỗi tải; 3 kênh gain `master/music/sfx` + settings (E04); `playSfx(id, {x?, volume?, loop?})`, âm 3D đơn giản (giảm theo khoảng cách + `StereoPannerNode` theo x); giới hạn số âm đồng thời (16) và chống phát chồng cùng id < 40ms; kích hoạt AudioContext sau tương tác đầu tiên; tải nhạc nền lười (lazy).
**Nghiệm thu:**
- [ ] Rút hết file âm thanh → game vẫn chạy với âm tổng hợp, không lỗi
- [ ] Mỗi `event` của server có SFX tương ứng (bảng đối chiếu trong báo cáo)
- [ ] Âm lượng 3 kênh hoạt động và lưu bền

## G02 — Nhạc nền thích ứng
**Phụ thuộc:** G01.
**Việc cần làm:** nhạc theo `theme` (3 bản loop, CC0 hoặc tự tổng hợp bằng chuỗi nốt); crossfade giữa menu → ván; **Panic mode** khi `timeLeft<=30`: `playbackRate` 1.25 + lớp phụ; `timeLeft<=10`: tick-tock; kết thúc ván: nhạc dịu lại + jingle theo số sao; âm lượng hạ khi mở Settings/kết quả.
**Nghiệm thu:**
- [ ] Không có tiếng "click" ở điểm loop (nghe kiểm tra, mô tả)
- [ ] Panic bật/tắt đúng thời điểm (log thời gian)
- [ ] Tab ẩn → nhạc tạm dừng, quay lại → tiếp tục

## G03 — SFX đầy đủ & cân bằng
**Phụ thuộc:** G01.
**Việc cần làm:** hoàn thiện toàn bộ danh sách mục 6 file 03; vòng lặp có điều kiện (xèo xèo khi chảo có thịt đang nấu, sôi khi nồi nấu, lửa cháy khi có station cháy, rửa chén khi có người `acting` tại bồn) — bật/tắt theo `RenderFrame`, âm lượng theo khoảng cách tới chef cục bộ; cân bằng mức (không âm nào lấn át chuông đơn mới).
**Nghiệm thu:**
- [ ] Bảng "event/trạng thái → âm" đầy đủ, không thiếu mục nào ở mục 6
- [ ] Không còn âm lặp "kẹt" sau khi hết ván / rời phòng (kiểm tra `activeSources = 0`)

---

# PHASE H — HOÀN THIỆN

## H01 — Tay cầm (Gamepad)
**Phụ thuộc:** C02, E04.
**Việc cần làm:** Gamepad API: stick trái di chuyển (deadzone 0.2, quy về 8 hướng hoặc analog → 8 hướng), A interact, X giữ act, B dash, Y throw, LB/RB đổi chef; hiển thị gợi ý nút theo thiết bị (bàn phím/tay cầm); ghép/ngắt tay cầm không làm lỗi; menu điều hướng được bằng tay cầm (D-pad + A/B).
**Nghiệm thu:**
- [ ] Test thuần hàm ánh xạ trục → `(mx,my)`
- [ ] Chơi trọn 1 ván bằng tay cầm (nếu không có thiết bị thật: giả lập bằng sự kiện/ghi chú rõ)

## H02 — Hiệu năng, độ ổn định & kiểm thử tải V2
**Phụ thuộc:** F10, G03.
**Việc cần làm:** chạy `scripts/perf.ts` mọi level × 4 người; sửa nút cổ chai; `loadtest` 5 phòng × 4 bot với level mới 3 phút; kiểm tra rò RAM server/client 15 phút; thêm giới hạn kích thước snapshot (cảnh báo nếu > 8KB) và **tối ưu snapshot**: chỉ gửi `stations` thay đổi (delta theo `tick` + gửi đầy đủ mỗi 2 giây) — cập nhật protocol, client phải xử lý cả hai, test mất gói/tham gia muộn (reconnect nhận full).
**Nghiệm thu:**
- [ ] Băng thông server→client giảm ≥ 40% so với trước (đo, ghi số)
- [ ] Reconnect nhận trạng thái đầy đủ đúng; test mô phỏng bỏ lỡ delta
- [ ] Số đo FPS/CPU/RAM trong `docs/PERF_REPORT.md`

## H03 — Kiểm thử chất lượng toàn diện (QA)
**Phụ thuộc:** H02.
**Việc cần làm:** `docs/QA_CHECKLIST.md` ≥ 120 mục (mỗi cơ chế, mỗi level, mỗi nền tảng: Chrome/Edge/Firefox/Safari desktop, Android Chrome, iOS Safari); chạy toàn bộ và ghi kết quả; sửa mọi bug nghiêm trọng; bug nhỏ vào `IDEAS.md` có độ ưu tiên; e2e V2 đủ kịch bản (chảo, súp, lửa, ném, băng chuyền, băng trượt, solo, reconnect); chạy ổn định 10/10.
**Nghiệm thu:**
- [ ] Bảng kết quả QA hoàn chỉnh; không còn bug "mất đồng bộ/kẹt/crash"
- [ ] `pnpm e2e` xanh 10/10
- [ ] 4 người thật (hoặc 3 tab + 1 bot) chơi liên tục 3 màn không lỗi

## H04 — (Tùy chọn) Pizza & lò nướng
**Phụ thuộc:** H03. **Chỉ làm khi được giao riêng.**
**Yêu cầu:** đề xuất đặc tả ngắn vào `docs/DECISIONS.md` **trước khi code** và chờ duyệt: bột (crate) → nhào (giữ `act` tại thớt) → thêm sốt cà chua đã thái + phô mai (crate mới `Z`) lên bột trên counter → đặt vào `oven` (station mới `U`) 12s → bánh chín → lên đĩa → phục vụ; có chu trình cháy/lửa như bếp. Tất cả các lớp (core, protocol, 3D, âm thanh, level, test) phải theo đúng quy trình như B04–B06.

## H05 — Hoàn tất V2
**Phụ thuộc:** H03.
**Việc cần làm:** cập nhật README (ảnh/GIF 3D, hướng dẫn chơi, cách thêm level/công thức/theme mới), `CREDITS.md` đầy đủ & kiểm tra giấy phép từng asset, `docs/LEVEL_FORMAT.md`, `docs/PROTOCOL.md`, `docs/ARCHITECTURE.md` (sơ đồ Mermaid V2); gắn tag `v1.0.0`; chạy lại toàn bộ DoD V2.
**Nghiệm thu:**
- [ ] Mọi tài liệu cập nhật; `CREDITS.md` khớp 100% thư mục asset
- [ ] Người mới clone repo chạy được game trong 5 phút (đã thử trên máy sạch/thư mục mới)
- [ ] Báo cáo cuối: bảng đối chiếu "Chaos Kitchen V2 vs cơ chế Overcooked" (đã có / còn thiếu)

---

# PHỤ LỤC — Thứ tự ưu tiên nếu muốn thấy kết quả sớm

1. **Tuần 1:** A00 → A02 → B01 → B02 → B03 → B04 (có chảo cầm tay + quán tính + lướt).
2. **Tuần 2:** D00 → D01 → D02 → D03 (nhìn 3D đầu tiên) song song B05 → B06.
3. **Tuần 3:** B07 → B11, D04 → D06.
4. **Tuần 4:** C01 → C04, D07 → D08 (**MỐC 1 + MỐC 2: chơi 3D với cơ chế mới**).
5. **Tuần 5–6:** D09 → D11, E01 → E06, F01 → F10, G01 → G03.
6. **Tuần 7:** H01 → H05.

# PHỤ LỤC — Khi AI làm sai / kẹt (bổ sung)

- **Đồ họa "xấu/lệch":** yêu cầu AI chụp ảnh thật bằng Playwright và so với bảng mô tả ở mục 5 file 03; sửa theo từng hạng mục, không viết lại cả renderer.
- **FPS thấp:** yêu cầu chạy `scripts/perf.ts`, đưa số liệu draw calls/triangles, rồi tối ưu đúng nút cổ chai (không tắt tính năng bừa).
- **AI đặt luật vào renderer:** bắt chuyển về `core` (R2) và thêm test.
- **AI dùng asset không rõ giấy phép:** gỡ ngay, thay bằng procedural, ghi DECISIONS.
- **Task quá lớn:** bắt AI chia theo từng mục "Việc cần làm", commit riêng từng mục, báo cáo từng chặng.
