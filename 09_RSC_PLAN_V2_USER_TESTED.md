# 09 — PLAN V2: CHAOS KITCHEN GẦN READY SET COOK (AI code, NGƯỜI DÙNG tự test)

> **Thay thế** `08_RSC_PARITY_PLAN.md`. Plan này không yêu cầu AI chụp ảnh. Việc kiểm chứng hình ảnh và cảm giác chơi do **bạn tự làm** theo hướng dẫn trong từng phase.
> **Quy tắc chung:** `07_REVISED_PLAN_AND_AI_RULES.md` mục 0 vẫn áp dụng, **trừ R0.4** (ảnh chụp) được thay bằng **test tự động** và **bạn tự test**.

---

## 0. QUY TRÌNH CHUNG CHO MỌI PHASE

Mỗi phase có 4 phần:
1. **AI làm gì:** nội dung code.
2. **AI tự test:** test tự động phải xanh trước khi báo cáo.
3. **Bạn làm gì:** tải, chuẩn bị, hoặc chạy lệnh (nếu có).
4. **Bạn tự test:** các bước chơi/kiểm tra bằng mắt và tai, không cần chụp ảnh.

**Quy tắc chuyển phase:**
- AI chỉ báo "xong" khi **test tự động xanh**, và đã liệt kê chính xác các bước bạn cần tự test.
- Bạn làm đủ mục "Bạn tự test" và ghi **ĐẠT** hoặc **KHÔNG ĐẠT** cho từng bước.
- Nếu tất cả ĐẠT: bạn gửi cho AI câu **"PHASE <số> ĐẠT, làm PHASE <số tiếp>"**.
- Nếu có bước KHÔNG ĐẠT: gửi AI đúng số bước và mô tả hiện tượng (ví dụ: "bước 3: khách không giận khi chờ 60 giây"). Không cần ảnh.

**Lệnh bạn chạy trên Windows (PowerShell, ở thư mục repo):**
```
pnpm -r typecheck
pnpm test
pnpm validate:levels
pnpm dev
```
Sau khi `pnpm dev` chạy, mở trình duyệt tại `http://localhost:5173/?r=3d`.

---

## 1. TRẠNG THÁI XUẤT PHÁT (AI cần biết trước)

- Renderer 3D là mặc định. Có thể thêm `&debug=1` để thấy thông tin gỡ lỗi.
- Phím: di chuyển `WASD`/mũi tên, tương tác `Space`/`E`, giữ hành động `F`, sprint `Shift`, ném `J`/`Enter`, emote `1`–`4`.
- Có 9 map trong danh sách; `test_carry` là map thử, không phải map chơi.
- Ticket hiện tên tiếng Anh và thumbnail 3D.
- Chưa có màn Settings thật, menu không có nhạc, khách không có trạng thái giận.

**Các quyết định mặc định (AI dùng cho đến khi bạn đổi):**
| Quyết định | Mặc định | Đổi bằng cách |
|---|---|---|
| Sprint multiplier | **1.5** | Nói "đổi sprint về 1.25" |
| Khách giận | Icon 😠 + nảy người (không cần clip mới) | Nói "khách giận dùng clip ..." |
| Chop | Clip `wiping_sweat` tạm đến khi có clip mới | Làm Phase 5 |
| Số map chơi | 6 (3 diner, 1 ship, 1 space, 1 tutorial) | Nói số khác |

---

## PHASE 0 — KIỂM TRA NỀN VÀ SỬA MAP LỖI

### AI làm gì
1. Chạy `pnpm validate:levels` và ghi số cảnh báo `unreachable` của từng map.
2. Sửa `level1` (chỉ đổi ASCII, giữ nguyên số lượng trạm, qua `validateLevel`) để không còn ô sàn cách ly. Đây là lỗi gây cảm giác "có đường mà không đi được".
3. Tách `test_carry` khỏi danh sách map chơi: giữ file và test, bỏ khỏi `LEVELS` dành cho người chơi.
4. Kiểm tra mâu thuẫn: grep `tomato_soup` và ký tự `s` trong `levels/`, ghi kết quả vào `docs/PHASE0_REPORT.md`.

### AI tự test
- `pnpm -r typecheck` exit 0.
- `pnpm test` không có test fail.
- Thêm test: mọi map chơi (không tính `test_carry`) không có ô `floor` cách ly; bot đi được từ mọi spawn tới mọi trạm.
- `pnpm validate:levels` không có lỗi; cảnh báo `unreachable` = 0 với map chơi.

### Bạn làm gì
- Không cần tải gì.
- Chạy 4 lệnh ở mục 0 và gửi AI kết quả dòng cuối.

### Bạn tự test
1. Chạy `pnpm dev`, vào game, chọn **Bếp Nhỏ (level1)** trong lobby (hoặc chơi thử).
2. Đi từ góc trái trên sang góc phải dưới, đi qua mọi lối. **ĐẠT** nếu không bị kẹt ở khe 1 ô.
3. Đứng cạnh mọi thùng nguyên liệu, thớt, bếp, bồn rửa: **ĐẠT** nếu tương tác được.
4. Mở lobby, kiểm tra danh sách map: **ĐẠT** nếu không còn "Test".

**Gate:** bạn gửi "PHASE 0 ĐẠT".

---

## PHASE 1 — VÒNG KHÁCH: VÀO BÀN, GỌI MÓN, GIẬN, RỜI ĐI

### AI làm gì
1. Khách có trạng thái: `seated_waiting_order` → `order_taken` → `eating` → rời bàn. Thêm trạng thái `angry` khi kiên nhẫn còn dưới 20%.
2. Khi `angry`: hiện icon 😠 trên bong bóng, khách nảy người (animation có sẵn, không cần clip mới), rồi rời sau 0.6 giây.
3. Sự kiện `customer_leave` có thêm lý do: `served` (ăn xong) hoặc `expired` (hết kiên nhẫn). Client hiện khác nhau.
4. Với 4 khách cùng lúc, không chồng vị trí, mỗi khách một bong bóng riêng.

### AI tự test
- Test core: khách chuyển đúng trạng thái theo thời gian; `angry` kích hoạt đúng ngưỡng 20%; `customer_leave` có đúng lý do.
- Test client: bong bóng đúng số lượng khách; icon 😠 xuất hiện khi `angry`.

### Bạn làm gì
- Không cần tải gì.

### Bạn tự test
1. Vào **Bếp Nhỏ**, bắt đầu ván. Chờ khách vào bàn: **ĐẠT** nếu khách ngồi đúng ghế, không đứng giữa bàn.
2. Không nhận order của một khách. Đếm thời gian đến khi khách nổi giận. **ĐẠT** nếu có 😠 và khách nảy người trước khi rời (khoảng 20% thời gian kiên nhẫn của món, ví dụ salad 60 giây thì khoảng 48 giây sau khi vào bàn... nếu tính từ khi gọi món thì khác: xem ghi chú dưới).
   - *Ghi chú:* kiên nhẫn tính từ khi order được nhận. Khách chưa gọi món thì không giận.
3. Nhận order, rồi để hết hạn: **ĐẠT** nếu khách rời bàn kèm thông báo hết hạn và điểm bị trừ 10.
4. Phục vụ đúng: **ĐẠT** nếu khách ăn, đĩa bẩn xuất hiện, khách rời bàn không có icon giận.
5. Để 4 khách cùng lúc (chờ 4 đơn): **ĐẠT** nếu 4 khách ở 4 bàn khác nhau, không chồng lên nhau.

**Gate:** "PHASE 1 ĐẠT".

---

## PHASE 2 — SÁU MAP THEO KIỂU READY SET COOK

### AI làm gì
1. Làm 6 map chơi (chi tiết ở mục 2 của phase này). Mỗi map: đường đi một chiều theo vòng, lối đi tối thiểu 2 ô, không khe 1 ô, không hố `_`.
2. Mỗi map có ít nhất 2 bàn `Q`, 1 bồn `W`, 1 tủ đĩa `P`, và đủ thùng cho các món của map.
3. Map ship dùng theme `ship`; map space dùng theme `space` (đã có code). Mỗi map ship/space có ít nhất một băng `~` hoặc băng chuyền.
4. Thêm test cho từng map: bot đi được mọi trạm; `validateLevel` không lỗi; không có `unreachable`.

**Danh sách 6 map (mặc định):**

| # | Tên | Theme | Đặc điểm |
|---|---|---|---|
| 1 | Học việc | diner | Map nhỏ, 1 bàn, 1 chef cần đủ, không cần chuyền |
| 2 | Bếp Nhỏ | diner | Map cơ bản: 1 bếp chảo, 1 bồn, 4 bàn |
| 3 | Bếp Đôi | diner | Chia đôi bằng quầy có khe chuyền, 2 bàn |
| 4 | Nhà Hàng Mở | diner | Bàn xếp hàng, 4–8 khách, lối vào bếp không bị chắn |
| 5 | Tàu Hải Tặc | ship | Băng trơn `~` ở giữa, 2 bàn |
| 6 | Trạm Vũ Trụ | space | Băng chuyền `>`/`<` chạy hai làn, 3 bàn |

### AI tự test
- Mọi map qua `validateLevel` không lỗi.
- Bot hoàn thành ít nhất 1 đơn salad hoặc burger trên mỗi map.
- Không có ô `unreachable` trên bất kỳ map nào.

### Bạn làm gì
- Không cần tải gì.
- Khi AI báo xong từng map, **đợi AI báo map tiếp theo** (không làm cả 6 một lúc). Đây là chỗ bạn kiểm tra từng map.

### Bạn tự test (làm cho từng map)
1. Chọn map trong lobby, bắt đầu ván.
2. Đi hết các lối từ điểm vào đến mọi trạm: **ĐẠT** nếu không cần đi ngược chiều liên tục (đường một chiều).
3. Đứng hai người ở hai đầu map, đi ngược chiều nhau: **ĐẠT** nếu không bị kẹt trong lối 2 ô.
4. Với map ship: đứng trên băng `~`, thả phím: **ĐẠT** nếu nhân vật trượt rồi dừng từ từ.
5. Với map space: đặt đồ lên băng chuyền: **ĐẠT** nếu đồ trôi theo hướng mũi tên.
6. Mỗi map tự chơi 1 salad: **ĐẠT** nếu hoàn thành được.

**Gate:** sau mỗi map, bạn gửi "MAP <tên> ĐẠT". Khi đủ 6 map: "PHASE 2 ĐẠT".

---

## PHASE 3 — MÓN ĂN VÀ THUMBNAIL

### AI làm gì
1. Giữ 7 món: Salad, Burger, Burger Cà Chua, Tomato Soup, Onion Soup, Mushroom Soup, Pizza.
2. Mỗi món xuất hiện ít nhất ở 2 map (cân đối `orderScript` hoặc danh sách món của map).
3. Thumbnail đủ 7 món; ticket không hiện fallback; nếu thiếu, chữ đỏ `MISSING THUMB` (chỉ ở `?debug=1`).
4. Thêm script `pnpm thumbs` (nếu chưa có) để tạo lại thumbnail từ model.

### AI tự test
- Test: mỗi recipe có thumbnail file tồn tại.
- Test: mỗi recipe xuất hiện ở ít nhất 2 map.
- Bot làm được mỗi món ít nhất 1 lần (test tích hợp, không cần người).

### Bạn làm gì
- Không cần tải gì.
- Chạy `pnpm thumbs` nếu AI yêu cầu, rồi báo kết quả dòng cuối.

### Bạn tự test
1. Ở lobby hoặc lúc chơi, nhìn ticket: **ĐẠT** nếu có tên tiếng Anh và hình món cho cả 7 món (đợi đủ đơn của từng loại).
2. Chơi từng món một lần trong ván: **ĐẠT** nếu món được ghép đúng công thức khi bạn gom nguyên liệu.
3. Súp: đủ 3 nguyên liệu cùng loại vào nồi, đợi nấu, múc ra đĩa: **ĐẠT** nếu có súp trên đĩa.
4. Pizza: **ĐẠT** nếu tạo được và nướng được trong map có lò.

**Gate:** "PHASE 3 ĐẠT".

---

## PHASE 4 — MENU, CÀI ĐẶT VÀ LOBBY

### Bạn cần làm TRƯỚC khi AI bắt đầu phase này
- **Quyết định phong cách menu.** Chọn một:
  - **A:** menu có nền 3D với đầu bếp đứng (cần nhân vật 3D, đã có trong game).
  - **B:** menu chỉ có nhạc nền và nút (đơn giản hơn, làm nhanh).
- Nếu chọn A và muốn đầu bếp khác: tải theo **mục 4.1** bên dưới.

### 4.1 Hướng dẫn tải nhân vật (chỉ khi bạn muốn đổi nhân vật menu/khách)
**Nguồn miễn phí, giấy phép CC0 (dùng thoải mái cho chơi local):**
1. Vào **kenney.nl** → mục Assets → tìm **"Animated Characters"** (bộ Protagonists hoặc Survivors). Tải file ZIP.
2. Hoặc vào **quaternius.com** → mục **Ultimate Animated Character Pack**. Tải miễn phí phần có sẵn.
3. Giải nén vào `raw-assets/<tên-bộ>/`. **Không copy vào game ngay**; AI sẽ làm việc đó.
4. Báo AI tên thư mục đã tải.

### AI làm gì
1. Menu theo phong cách bạn chọn (A hoặc B).
2. Màn **Cài đặt** thật: chất lượng đồ họa (low/medium/high), bật/tắt nhạc, âm lượng SFX, bật/tắt hiện FPS. Lưu `localStorage` qua `settings.ts` đã có.
3. Lobby: kiểm tra `maxPlayers` của map khi bắt đầu; từ chối nếu vượt, báo lỗi rõ.
4. Nhạc menu bật/tắt được, nhớ lựa chọn sau F5.

### AI tự test
- Test settings: lưu, đọc lại, giá trị sai thì về mặc định.
- Test lobby: map có `maxPlayers` = 2 thì bắt đầu với 3 người bị từ chối.
- Test menu: nút gọi đúng hành động.

### Bạn làm gì
- Quyết định A/B (xem trên).
- Nếu chọn A và đổi nhân vật: làm theo mục 4.1.

### Bạn tự test
1. Mở game: **ĐẠT** nếu menu hiện đủ nút (Tạo phòng, Vào, Chơi nhanh, Hướng dẫn, Cài đặt).
2. Bấm Cài đặt: đổi chất lượng sang low, tắt nhạc, bật hiện FPS. Tắt trình duyệt, mở lại: **ĐẠT** nếu các lựa chọn còn nguyên.
3. Nhạc menu: bật/tắt được, **ĐẠT** nếu nghe đúng.
4. Vào lobby: tạo phòng 1 người, chọn map `maxPlayers` = 2 (nếu có), mời thêm 2 tab trình duyệt, bấm Bắt đầu: **ĐẠT** nếu bị từ chối với thông báo rõ.
5. Phương án A: quan sát đầu bếp trên menu có đứng/chuyển động nhẹ: **ĐẠT** nếu có.

**Gate:** "PHASE 4 ĐẠT".

---

## PHASE 5 — ANIMATION: CHOP, WASH, ANGRY

### Bạn cần làm TRƯỚC (tải animation từ Mixamo)
**Mục đích:** thay clip `wiping_sweat` tạm cho hành động thái và rửa.

**Cách tải (làm đúng từng bước):**
1. Vào **mixamo.com**, đăng nhập bằng tài khoản Adobe miễn phí.
2. Ô tìm kiếm bên trái, gõ từng tên và chọn kết quả:
   - Thái: thử **"Chopping"** hoặc **"Kneading"**. Nếu không có, thử **"Typing"** (dáng cúi tay thao tác).
   - Rửa: thử **"Wiping"** hoặc **"Washing"**.
   - Giận: thử **"Angry"** hoặc **"Frustrated"** hoặc **"Terrified"** (đã có trong thư mục).
3. Chọn một nhân vật bất kỳ ở góc trên (ví dụ **Y Bot** hoặc **X Bot**) để xem trước. Nhân vật này chỉ dùng để xem; **clip sẽ áp lên đầu bếp** trong game vì cùng bộ xương Mixamo.
4. Khi chọn animation, bên phải có các tùy chọn:
   - **Skin:** chọn **Without Skin** (quan trọng, để file nhẹ).
   - **In Place:** tick nếu clip có di chuyển (ví dụ chặt đứng tại chỗ thường không cần tick; xem preview).
   - **Format:** FBX Binary (.fbx).
   - **Frames per Second:** 30.
   - **Keyframe Reduction:** none.
5. Bấm **Download**. Lưu vào `raw-assets/mixamo/`.
6. Báo AI tên file đã tải.

### AI làm gì
1. Nạp các clip mới qua `clipPrep.ts` (không viết lại chuẩn hóa).
2. Map trạng thái: `acting` tại thớt → clip chop; `acting` tại bồn → clip wash; khách `angry` → clip angry (hoặc giữ idle nếu không có).
3. Nếu clip thiếu: giữ fallback hiện có, log `ANIM MISSING: <tên>` ở `?debug=1`.

### AI tự test
- Test: mọi clip mới có số track khớp xương = 0.
- Test: trạng thái `acting` tại thớt → clip `chop`; tại bồn → `wash`.
- Test: không còn gọi `wiping_sweat` cho chop/wash (nếu đã có clip mới).

### Bạn tự test
1. Vào ván, cầm cà chua đặt lên thớt, giữ `F`: **ĐẠT** nếu nhân vật làm động tác thái (không phải lau mồ hôi).
2. Đặt đĩa bẩn vào bồn rửa, giữ `F`: **ĐẠT** nếu động tác là rửa.
3. Để khách giận (chờ đến khi angry): **ĐẠT** nếu khách có dáng giận hoặc icon 😠 + nảy.
4. Chân không trượt: chạy thẳng 3 giây, **ĐẠT** nếu chân bước thật (không trượt như trượt băng).

**Gate:** "PHASE 5 ĐẠT".

---

## PHASE 6 — ÂM THANH CHO MỌI SỰ KIỆN

### AI làm gì
Thêm SFX cho các sự kiện đang câm: `ignite`, `extinguish`, `throw`, `customer_leave`, `streak_up`, `streak_lost`, `oven_done`, `pizza_burnt`, `pot_done`, `soup_burnt`. Dùng WebAudio (không cần file ngoài).

### AI tự test
- Test: mọi sự kiện trong danh sách có hàm âm tương ứng (không nhảy vào nhánh rỗng).
- Test: tắt âm thanh thì không phát âm nào.

### Bạn làm gì
- Không cần tải gì.

### Bạn tự test
Chơi một ván có đủ các việc sau, nghe và ghi:
1. Ném đồ: **ĐẠT** nếu có tiếng.
2. Để thịt cháy rồi lửa bốc: **ĐẠT** nếu có tiếng báo cháy và tiếng khi lửa tắt.
3. Khách rời bàn giận hoặc ăn xong: **ĐẠT** nếu khác nhau.
4. Chuỗi phục vụ tăng và đứt: **ĐẠT** nếu có tiếng.
5. Nồi súp chín và khét: **ĐẠT** nếu có tiếng.
6. Tắt âm thanh bằng nút: **ĐẠT** nếu không còn tiếng.

**Gate:** "PHASE 6 ĐẠT".

---

## PHASE 7 — CHẤT LƯỢNG VÀ DỌN DẸP

### AI làm gì
1. Giảm lỗi lint (hiện 158). Ưu tiên file chạy thật. Không sửa cho qua lint.
2. Xóa asset không dùng: thư mục `models/minion/`, `walk_backup.fbx` (sau khi bạn đồng ý, xem dưới).
3. Cập nhật `docs/SYSTEM_SUMMARY.md` cho khớp với trạng thái mới.

### AI tự test
- `pnpm lint` số lỗi không tăng so với trước phase này; ghi số trước/sau.
- `pnpm -r typecheck` và `pnpm test` xanh.

### Bạn làm gì
- Đọc danh sách file sẽ xóa AI đưa ra, trả lời **"đồng ý xóa"** hoặc **"giữ lại file X"**.
- Có thể tự sao lưu thư mục `raw-assets/` trước khi AI làm việc này (kéo ra ổ khác).

### Bạn tự test
1. Chạy lại `pnpm dev` và chơi một ván đầy đủ 3 phút: **ĐẠT** nếu không lỗi đỏ trong console.
2. Vào mọi màn hình (menu, lobby, game, kết quả, cài đặt): **ĐẠT** nếu không màn nào vỡ.

**Gate:** "PHASE 7 ĐẠT".

---

## PHASE 8 — MỞ RỘNG (CHỈ KHI BẠN YÊU CẦU)

### 8.1 Nồi chiên và khoai tây chiên
**Bạn làm trước:**
- Tìm model nồi chiên và khoai tây trong **Kenney Food Kit** (ví dụ tên có chữ "fries" hoặc "fryer"). Nếu không có nồi chiên, dùng nồi hiện có và ghi nhận là tạm.

**AI làm:** thêm ký tự `F` (nồi chiên), nguyên liệu `potato`, món `fries`. Theo quy trình R0.6 (test golden, DECISIONS).

**Bạn tự test:** thái khoai, bỏ nồi chiên, đợi, lấy ra đĩa; burger + khoai ghép thành combo (2 đĩa, 2 món).

### 8.2 Máy xay và đồ uống
**Bạn làm trước:** tìm model máy xay trong Kenney Food Kit (ví dụ "blender"). Nếu không có, tải **Kenney Furniture Kit** hoặc **KayKit Restaurant Bits** (đã có trong `raw-assets/`) và tìm "blender".

**AI làm:** ký tự `K`, nguyên liệu trái cây, món sinh tố phục vụ bằng ly.

**Bạn tự test:** bỏ hoa quả vào máy, giữ nút xay, lấy ly, giao tại bàn.

### 8.3 Theme ship và space đầy đủ
**AI làm:** nền, sàn, âm thanh biển/vũ trụ, trang trí theo theme (đã có code; bổ sung nội dung).

**Bạn tự test:** vào map ship và space, nhận ra theme khác `diner` ngay khi vào: **ĐẠT** nếu có.

**Gate cho phase 8:** từng mục riêng, mỗi mục "ĐẠT" độc lập.

---

## 2. THỨ TỰ VÀ PHỤ THUỘC

```
Phase 0 → Phase 1 → Phase 2 (từng map) → Phase 3
                           ↘ Phase 4 (có thể làm song song Phase 3 nếu bạn đã quyết định A/B)
Phase 5 sau Phase 1 (cần khách và hành động)
Phase 6 sau Phase 2
Phase 7 sau tất cả phase 0–6
Phase 8 chỉ khi bạn yêu cầu
```

## 3. VIỆC KHÔNG LÀM TRONG PLAN NÀY
- Thêm người chơi (vẫn tối đa 4).
- Tài khoản, lưu tiến trình lên server, bảng xếp hạng.
- Gamepad (bạn đã xác nhận không cần).
- Hố `_`, sự kiện ngẫu nhiên, xe chạy.
- Thay đổi camera.

## 4. CÂU ĐỂ GỬI AI MỖI LẦN

Mẫu:
```
PHASE <số> ĐẠT, làm PHASE <số tiếp>.
```
Hoặc khi có lỗi:
```
PHASE <số>, bước <n> KHÔNG ĐẠT: <mô tả hiện tượng ngắn gọn>.
```
Hoặc khi cần đổi quyết định mặc định:
```
Đổi <tên quyết định> thành <giá trị>.
```
