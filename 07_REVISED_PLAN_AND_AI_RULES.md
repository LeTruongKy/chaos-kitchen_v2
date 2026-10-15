# 07 — KẾ HOẠCH SỬA ĐỔI & RULE CHO AI CODE (Chaos Kitchen)

> **Thay thế** `06_MAP_AND_FOOD_PLAN.md` ở các điểm: phục vụ tại bàn (không qua cửa `O`), ticket hiển thị tên món + hình món (không phải icon từng bước).
> **Đọc trước khi làm:** `01_CODING_RULES.md` (kiến trúc, luật R1–R8, điều cấm), phần 0 của file này (rule AI). Khi mâu thuẫn, file này thắng cho phần sản phẩm.

---

## 0. RULE BẮT BUỘC CHO AI CODE

Các rule này áp dụng cho **mọi** task trong file này. Vi phạm bất kỳ rule nào = task chưa đạt, phải làm lại.

**R0.1 — Kiểm kê trước khi sửa.** Trước khi đổi bất kỳ dòng code nào, chạy các lệnh kiểm kê ở mục 3 và dán kết quả vào báo cáo. Không được dựa vào trí nhớ hay báo cáo cũ để khẳng định một tính năng "đã có" hay "chưa có".

**R0.2 — Không đoán tên.** Tên recipe, ID nguyên liệu, tên file model, ký tự map: phải lấy từ code bằng `grep`/đọc file. Nếu không tìm thấy thì ghi "KHÔNG TỒN TẠI", không tự đặt tên rồi giả định là có.

**R0.3 — Mỗi lần chỉ một task.** Không gộp nhiều task trong một lượt. Làm xong task nào thì dừng ở điểm dừng (gate) của task đó.

**R0.4 — Bằng chứng hình ảnh là bắt buộc cho mọi thay đổi nhìn thấy được.** Chụp ảnh trong trình duyệt thật (`?r=3d&debug=1`, Playwright), lưu vào `docs/screens/<task-id>/`. Không có ảnh = không được ghi "ĐẠT".

**R0.5 — Luật game chỉ nằm trong `@kitchen/core`.** Renderer, UI, HUD không được quyết định kết quả phục vụ, điểm, hay đĩa sạch/bẩn.

**R0.6 — Core đổi = thủ tục đầy đủ.** Mỗi lần đổi luật trong core: (a) liệt kê file đổi, (b) test mới cho luật mới, (c) cập nhật golden hash và ghi `docs/DECISIONS.md` (lý do, ngày, giá trị cũ → mới), (d) chạy `pnpm -r typecheck && pnpm -r lint && pnpm test && pnpm validate:levels`, dán kết quả.

**R0.7 — Không đổi ký tự và ID đã có.** Không đổi ký tự map đang dùng, không đổi ID recipe/nguyên liệu, không đổi tên message protocol. Chỉ thêm mới, và ghi vào `docs/LEVEL_FORMAT.md` / `docs/PROTOCOL.md`.

**R0.8 — Không hard-code tên model.** Mọi model đi qua `AssetManifest`. Model thiếu thì dùng fallback **nhưng phải hiện rõ** (`console.error` + chữ đỏ `MISSING: <tên>` ở `?debug=1`). Cấm dùng fallback âm thầm.

**R0.9 — Không ghi "xong" khi chưa đủ bằng chứng.** Báo cáo theo bảng: tiêu chí | lệnh/số đo/ảnh | ĐẠT / CHƯA ĐẠT. Tiêu chí chưa có bằng chứng ghi "CHƯA KIỂM CHỨNG".

**R0.10 — Dừng ở gate.** Sau mỗi gate, dừng và chờ người dùng duyệt ảnh. Không làm task kế tiếp khi chưa được duyệt.

**R0.11 — Không làm ngoài phạm vi.** Không thêm hố (`_`), sự kiện ngẫu nhiên, xe chạy, đồ uống, khách VIP trong file này. Không sửa animation, camera, sprint trong các task này trừ khi task yêu cầu.

---

## 1. SẢN PHẨM — CÁC QUYẾT ĐỊNH ĐÃ CHỐT

| # | Hạng mục | Quyết định | Trạng thái hiện tại (theo người dùng) |
|---|---|---|---|
| Q1 | Ticket trên đầu khách | Hiển thị **tên món ** + **hình món** + thanh kiên nhẫn. **Không** hiển thị icon từng bước nguyên liệu | Đã có tên + hình. Giữ nguyên, chỉ cần kiểm chứng |
| Q2 | Nơi phục vụ | **Tại bàn khách** (tile `Q`), không phục vụ qua cửa `O` | Người dùng báo đã phục vụ tại bàn. Cần kiểm chứng và loại `O` khỏi luật phục vụ |
| Q3 | Đĩa bẩn | Xuất hiện **tại bàn khách** sau khi khách ăn xong. Người chơi mang đĩa bẩn đến bồn rửa `W`, rửa, trả đĩa sạch | Đã có. Giữ nguyên, cần test hồi quy |
| Q4 | Súp cà chua | **Phải có** trong ít nhất một map và có order thật trong ván | Người dùng báo chưa thấy trên map. Cần kiểm kê (mục 3) |
| Q5 | Map | Theo mục 5 của `06` (Bếp Đôi, Nhà Hàng Mở, Bếp Lò Nướng) **nhưng** mọi map đều có bàn khách `Q`, không có `O` | Chưa làm |
| Q6 | Chuỗi chơi | nhận order → biết món (ticket) → nấu → ghép đĩa → mang đến bàn khách đúng order → đĩa bẩn tại bàn → mang đi rửa → trả đĩa sạch | Hầu hết đã có |

---

## 2. CẦN KIỂM KÊ TRƯỚC (T0) — KHÔNG SỬA GÌ

Các câu hỏi phải trả lời bằng bằng chứng (lệnh + đoạn code, file:dòng):

**K1. Súp cà chua có tồn tại trong code không?**
- `grep -rn "tomato_soup\|soup_tomato" packages apps`
- Ghi: recipe có trong `recipes.ts`? nguyên liệu `soup_tomato` có trong `types.ts`? điểm có trong `constants.ts`?
- Kiểm tra: có level nào dùng ký tự nồi `s` không? `grep -rn "'s'\|\"s\"\|s:" packages/core/src/levels`. Có level nào có order `tomato_soup` trong `orderScript` hoặc trong danh sách recipe không?
- **Kết luận cần ghi:** (a) logic súp có/không, (b) map nào chứa nồi, (c) lý do súp không xuất hiện trong ván (không có nồi, không có recipe trong level, hay không có order).

**K2. Phục vụ đang xử lý ở đâu?**
- `grep -rn "serve" packages/core/src` — tìm hàm phục vụ, điều kiện tile, và xem có kiểm tra bàn khách hay chỉ kiểm tra tile `serve`.
- `grep -rn "'O'\|\"O\"\|'Q'\|\"Q\"\|table" packages/core/src/level.ts packages/core/src/sim`
- Ghi rõ: phục vụ thành công khi đặt đĩa lên tile nào? Có kiểm tra đơn có gắn với bàn không?

**K3. Đơn hàng có gắn với bàn không?**
- Mở `types.ts`, tìm kiểu `Order`. Có trường như `tableId` không?
- Nếu không: đơn hàng hiện là toàn cục, khách chỉ là hình minh họa. Ghi rõ điều này, vì nó quyết định cách làm T2.

**K4. Ticket đang lấy dữ liệu từ đâu?**
- Tìm code render ticket (HUD DOM hoặc 3D). Ghi: tên món lấy từ đâu, hình món lấy từ đâu (file ảnh, canvas, hay emoji).

**K5. Đĩa bẩn tại bàn**
- Tìm nơi tạo đĩa bẩn sau phục vụ. Ghi: đĩa bẩn được đặt vào tile nào (`R` hay `Q`)?

**K6. Danh sách map**
- `grep -rn "ascii" packages/core/src/levels` và liệt kê từng map: có `Q`, `O`, `s`, `S`, `W`, `R` không? Đếm số lần xuất hiện.

**Điểm dừng T0:** báo cáo bảng K1–K6 với bằng chứng. **Dừng, chờ duyệt** trước khi làm T1.

---

## 3. CÁC TASK

### T1 — Ticket: tên món + hình món (không icon từng bước)

**Mục tiêu:** ticket trên đầu khách chỉ có tên món, hình món, thanh kiên nhẫn.

**Việc cần làm:**
1. Gỡ mọi hiển thị icon từng bước nguyên liệu trên ticket (nếu có). Ticket chỉ giữ 3 phần: tên món, hình món, thanh kiên nhẫn.
2. Tên món lấy từ bảng `RECIPE_NAME_VI` trong client (một nơi duy nhất). Các món hiện có: Salad, Burger, Burger Cà Chua, Súp Cà Chua, Súp Hành Tây, Súp Nấm. Thiếu món nào thì ticket dùng tên ID và in cảnh báo.
3. Hình món: tạo thumbnail **từ chính model 3D của món** bằng renderer offscreen (1 lần, khi tải game hoặc qua script `scripts/thumbs.ts`), lưu `apps/client/public/thumbs/recipes/<recipeId>.png` (256×256, nền trong suốt). Ticket dùng ảnh này.
4. Nếu thumbnail thiếu: dùng tên món + khung xám, và hiện `MISSING THUMB: <recipeId>` ở `?debug=1`. Không dùng emoji thay thế âm thầm.
5. Tối đa 4 ticket hiển thị cùng lúc, khớp `ORDER_MAX_ACTIVE`.

**Tiêu chí nghiệm thu:**
- [ ] Ảnh ticket của mỗi món đang có trong game (Salad, Burger, Burger Cà Chua, các súp đang có trong ván)
- [ ] Không còn icon nguyên liệu từng bước trên ticket (grep + ảnh)
- [ ] Thumbnail nằm đúng đường dẫn, có đủ mọi recipe đang dùng trong các map
- [ ] Thiếu thumbnail thì hiện cảnh báo rõ, không im lặng

**Gate:** ảnh ticket cho từng món + ảnh 4 ticket cùng lúc. Dừng chờ duyệt.

---

### T2 — Phục vụ tại bàn khách (bỏ phục vụ qua cửa O)

**Mục tiêu:** một đơn chỉ được giao tại đúng bàn của khách có đơn đó.

**Điều kiện tiên quyết:** kết quả K2 và K3 từ T0. Nếu K3 cho thấy `Order` chưa có bàn, task này gồm cả việc thêm bàn vào đơn.

**Việc cần làm (phần core — làm theo R0.6):**
1. Mỗi `Order` có trường `tableId` (chỉ số bàn `Q` trong map, hoặc tọa độ tile bàn). Khi tạo đơn, gán một bàn `Q` đang trống. Không có bàn trống thì không tạo đơn mới (ghi lý do vào log, không lỗi).
2. Phục vụ thành công khi: người chơi đặt đĩa đã đủ món đúng công thức lên tile `Q` **và** `order.tableId` trùng tile đó **và** món trên đĩa khớp công thức của đơn.
3. Đặt đĩa sai món lên bàn đúng → `serve_fail` (lý do: `wrong_dish`). Đặt đĩa đúng món lên bàn sai (bàn không có đơn đó) → `serve_fail` (lý do: `wrong_table`). Đĩa không bị mất, người chơi vẫn cầm.
4. Tile `O` (cửa phục vụ) **không còn** là điểm giao món. Đặt đĩa lên `O` không làm gì. Giữ tile `O` trong parser để không vỡ map cũ, nhưng các map mới **không dùng** `O`.
5. Khi đơn được giao: bàn đó bị trống, đĩa thành đĩa bẩn đặt tại bàn (xem T3), khách rời bàn sau 0.4s.

**Việc cần làm (phần hiển thị):**
- Khi đặt đĩa lên bàn, bàn hiện viền sáng nếu đĩa đang cầm khớp một đơn đang chờ ở bàn đó (chỉ hiển thị, không quyết định luật).

**Tiêu chí nghiệm thu (test core):**
- [ ] Giao đúng món đúng bàn → thành công, điểm cộng, đĩa bẩn xuất hiện tại bàn đó
- [ ] Giao đúng món bàn khác → `serve_fail` `wrong_table`, đĩa còn trong tay
- [ ] Giao sai món bàn đúng → `serve_fail` `wrong_dish`
- [ ] Đặt đĩa lên `O` → không có thay đổi state
- [ ] Hai đơn cùng món ở hai bàn: giao cho bàn nào thì bàn đó được tính, không lẫn

**Tiêu chí nghiệm thu (trình duyệt):**
- [ ] Ảnh: người chơi mang đĩa đến bàn có khách đúng đơn, giao thành công (`docs/screens/t2/`)
- [ ] Ảnh: giao sai bàn → thông báo rõ
- [ ] Log: `serve_ok` và `serve_fail` đúng lý do

**Gate:** diff của core (file đổi, test, golden) + ảnh + log. Dừng chờ duyệt.

---

### T3 — Đĩa bẩn tại bàn & chu trình rửa (kiểm chứng hồi quy)

**Mục tiêu:** giữ nguyên hành vi người dùng đã thích, sau khi đổi T2 không được hỏng.

**Việc cần làm:**
1. Đĩa bẩn sinh ra **tại tile bàn** (`Q`) sau khi giao. Đĩa này là vật có thể nhặt.
2. Người chơi nhặt đĩa bẩn từ bàn (tay trống, đứng cạnh bàn, bấm tương tác), mang đến `W`, giữ tương tác để rửa (`WASH_TIME`), rồi đặt đĩa sạch vào tủ đĩa `P` hoặc khu đĩa sạch.
3. Không có đĩa bẩn ở `R` trong map mới (nếu `R` còn tồn tại trong map cũ, giữ nguyên).

**Tiêu chí nghiệm thu:**
- [ ] Test: chuỗi đầy đủ giao món → đĩa bẩn tại bàn → nhặt → rửa → đĩa sạch quay về `P`
- [ ] Ảnh: đĩa bẩn tại bàn (`docs/screens/t3/dirty-table.png`), đĩa đang rửa tại `W`
- [ ] Không có đĩa bẩn "trôi" không nhặt được (đếm trong fuzz test)

**Gate:** ảnh + test. Dừng chờ duyệt.

---

### T4 — Súp cà chua hoạt động trong ván (nếu K1 cho thấy thiếu)

**Điều kiện:** chỉ làm phần nào K1 xác định là thiếu. Không làm lại phần đã có.

**Việc cần làm:**
1. Nếu thiếu recipe/nguyên liệu/điểm: thêm theo mục 8.1 của `PROJECT_REPORT` (qua R0.6).
2. Thêm **ít nhất một map** có nồi `s` (đặt trên bếp `S` hoặc trạm nồi riêng) và có `tomato_soup` trong danh sách món. Dùng map Bếp Đôi (T5) hoặc một map hiện có, không dùng map không được duyệt.
3. Đảm bảo `orderScript` hoặc bộ random của map có `tomato_soup`.
4. Quy trình súp (đã có trong code, cần kiểm chứng): thái 3 cà chua → cho vào nồi (cùng loại, tối đa 3) → nồi tự nấu khi đủ 3 → lấy nồi/đổ súp vào đĩa → mang đến bàn đúng order.

**Tiêu chí nghiệm thu:**
- [ ] `grep` cho thấy `tomato_soup` tồn tại ở recipe, nguyên liệu, điểm, và map có nồi
- [ ] Test: bot hoàn thành 1 đơn súp cà chua trong map đó
- [ ] Ảnh: nồi đang nấu (có tiến trình), súp trên đĩa, giao tại bàn (`docs/screens/t4/`)
- [ ] Ticket súp hiển thị đúng tên và hình (liên kết T1)

**Gate:** ảnh + test + kết quả K1. Dừng chờ duyệt.

---

### T5 — Map "Bếp Đôi" (theo 06 mục 5.2, sửa theo luật mới)

**Yêu cầu bổ sung so với 06:**
- Có **ít nhất 2 bàn `Q`** (đủ để có nhiều đơn song song), đặt ở phía khu phục vụ, gần khu rửa `W`.
- **Không dùng `O`, không dùng `R`** trong map này.
- Có nồi `s` và bếp `S` ở phía nấu để có thể làm súp (liên kết T4).
- Lối đi chính rộng tối thiểu 2 ô, không có hố `_`.
- Có ít nhất một khe 2 ô chuyền đồ giữa hai nửa.

**Việc cần làm:**
1. Vẽ bản đồ ASCII, ghi sơ đồ vào báo cáo.
2. Đăng ký vào `levels/index.ts`, không đổi map cũ.
3. `validateLevel` không error; bot đi được từ mọi spawn tới mọi trạm và mọi bàn `Q`.

**Tiêu chí nghiệm thu:**
- [ ] `pnpm validate:levels` xanh
- [ ] Bot hoàn thành ít nhất 1 đơn salad và 1 đơn burger trong map này (test)
- [ ] Ảnh toàn cảnh + ảnh collision (`docs/screens/t5/`): mọi ô sàn trống đi được, mọi quầy chặn
- [ ] Sơ đồ ASCII + bảng số lượng trạm (đếm `Q`, `S`, `s`, `W`, `P`, `T`, `L`, `B`, `M`, `C`)

**Gate:** ảnh + sơ đồ. Dừng chờ duyệt.

---

### T6 — Map "Nhà Hàng Mở" (theo 06 mục 5.3, cùng luật T5)

Làm sau khi T5 được duyệt. Cùng tiêu chí như T5, thêm: có ít nhất 4 bàn `Q` xếp thành hàng, khách không chắn cửa vào bếp.

**Gate:** ảnh + sơ đồ. Dừng chờ duyệt.

---

### T7 — Lò nướng `U` và pizza (để sau)

Chỉ làm khi T1–T6 đã duyệt. Làm theo mục 7 bước 3 của `06`, nhưng phục vụ tại bàn theo T2. Thêm `U` vào parser (không dùng `O`), thêm `dough` và `cheese` qua R0.6.

**Gate:** bảng chân trị cho lò và pizza, ảnh các bước, golden. Dừng chờ duyệt.

---

## 4. THỨ TỰ LÀM

```
T0 (kiểm kê) → T1 (ticket) → T2 (phục vụ tại bàn) → T3 (đĩa bẩn hồi quy)
             → T4 (súp, nếu thiếu) → T5 (Bếp Đôi) → T6 (Nhà Hàng Mở) → T7 (pizza)
```

T1 và T2 có thể tách hai lượt AI khác nhau vì không chồng lấn file, nhưng mỗi lượt vẫn có gate riêng.

---

## 5. MẪU PROMPT GIAO TỪNG TASK (dùng cho mọi task)

```
Thực hiện task <T#> trong 07_REVISED_PLAN_AND_AI_RULES.md.
1. Đọc mục 0 (rule AI) và mục của task. Đọc 01_CODING_RULES.md phần kiến trúc.
2. Chạy kiểm kê liên quan (mục 2). Dán kết quả trước khi sửa.
3. Làm đúng phạm vi task. Không làm task khác.
4. Viết test trước khi đổi luật (nếu là core).
5. Chạy: pnpm -r typecheck && pnpm -r lint && pnpm test && pnpm validate:levels. Dán kết quả.
6. Chụp ảnh trình duyệt thật theo tiêu chí, lưu vào docs/screens/<T#>/.
7. Báo cáo bảng: tiêu chí | bằng chứng | ĐẠT/CHƯA ĐẠT. Thiếu bằng chứng ghi CHƯA KIỂM CHỨNG.
8. DỪNG ở gate. Không làm task kế tiếp.
```

---

## 6. CÁCH BẠN KIỂM TRA SAU MỖI GATE (trong 2 phút)

- **T1:** nhìn đầu khách: tên món và hình món rõ, không có icon nguyên liệu nhỏ.
- **T2:** mang đĩa đúng món đến đúng bàn → được điểm. Thử mang đến bàn khác → có thông báo.
- **T3:** giao xong → đĩa bẩn ở bàn → mang đến bồn → rửa → đĩa sạch.
- **T4:** vào map có nồi → có đơn súp cà chua → nấu → giao tại bàn.
- **T5/T6:** đi thử từ cửa vào tới mọi bàn và mọi trạm, không bị kẹt ở khe 1 ô.

Gửi ảnh cho mình ở mỗi gate để duyệt. Nếu AI báo "xong" mà ảnh không khớp tiêu chí, ghi lại đúng chỗ không khớp và gửi lại rule R0.9.

---

## 7. ĐIỀU CẤM CỤ THỂ TRONG LƯỢT NÀY

- Dùng `O` làm điểm giao món trong bất kỳ map mới nào.
- Đặt tên món bằng tiếng Anh trên ticket (tên hiển thị phải tiếng Việt).
- Dùng emoji thay thế hình món mà không báo `MISSING THUMB`.
- Sửa animation, camera, sprint, hoặc hằng số tốc độ.
- Thêm hố `_`, sự kiện ngẫu nhiên, khách VIP, đồ uống.
- Ghi "xong" khi thiếu ảnh hoặc test.
