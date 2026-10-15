# BÁO CÁO TỔNG KẾT PHASE V1 — QUATERNIUS INTEGRATION

## 1. Kết Quả Tổng Quan
- **Trạng thái**: **V1 ĐẠT — ĐÃ XÁC NHẬN BẰNG TRÌNH DUYỆT (Playwright headless --use-gl=swiftshader)**
- **Kiểm tra Gate 1, 2, 3**: ĐẠT 100%
- **Kiểm thử tự động trình duyệt (Q3 / scripts/verify-quat.ts)**: 5/5 bước ĐẠT.
- **Ràng buộc core**: KHÔNG sửa đổi bất kỳ file nào trong `packages/core` trong suốt Phase V1.

---

## 2. Việc Đã Làm (Completed)
1. **Nguồn Asset & Bản quyền**:
   - Sử dụng bộ model Quaternius CC0 (`chef_male.fbx`) đặt tại `apps/client/public/assets/quat/chef_male.fbx`.
   - Lưu trữ giấy phép CC0 1.0 tại `raw-assets/quaternius/LICENSE.txt`.
2. **Gate 1 (Scale & Normalization)**:
   - Đo đạc chính xác node armature: `scale_node = 0.01`, `h_thô = 316.4144`, `h_thực = 3.1641m`.
   - Tính toán hệ số tỷ lệ chuẩn: `hệ_số = 0.95 / h_thực = 0.30023916`.
   - Áp dụng scale trên outer wrapper group `this.group.scale.setScalar(this.modelScale)`.
   - Căn chỉnh mặt sàn: `this.group.position.y = -minY_thực * hệ_số`.
3. **Gate 3 (Gắn vật cầm vào tay phải)**:
   - Xác định chính xác xương tay phải: `FistR` (32 xương Quaternius, không có tiền tố mixamo).
   - Neo vật cầm: `FistR.add(this.carryAnchor)`.
   - Áp dụng offset chuẩn: `position.set(0, 0.05, 0.15)` và `scale.setScalar(0.6)`.
   - Ghi nhận quyết định trong `docs/DECISIONS.md`.
4. **Gate 2 (Phân giải ô tương tác & Ánh xạ Clip)**:
   - Thêm `actingStation: 'cutting' | 'sink' | null` vào `PlayerFrame` phía client (`FrameBuilder.ts`).
   - Lấy trạm từ ô phía trước người chơi: `floor(x + fx * INTERACT_REACH)`, `floor(y + fy * INTERACT_REACH)` với `INTERACT_REACH = 0.75`.
   - Xây dựng `quatPick.ts` ánh xạ thuần túy theo bảng ưu tiên: `dashing` → `run(1.3)`, `throwing` → `punch(once)`, `victory` → `victory(once)`, `nearFire` → `death(once)`, `actingStation != null` → `pickup`, `speed > 0.3 && holding` → `carry_run`, `speed > 0.3 && !holding` → `run` / `walk`, còn lại `idle`.
   - Xóa bỏ logic chọn clip Mixamo cũ trong `Chef.ts`.
5. **Kiểm thử tự động & Trình duyệt**:
   - Viết bộ test `quatPick.test.ts` (11 tests) và `quatProfile.test.ts` (5 tests), toàn bộ xanh.
   - Viết và chạy `scripts/verify-quat.ts` với Playwright headless (`--use-gl=swiftshader`):
     + Bước 4: Đứng yên 2s → `key = idle` (ĐẠT).
     + Bước 5: Đi thẳng phải 2s → `key = walk`, độ dịch chuyển xương `FootL = 21.8945`, `FootR = 24.0197` (ĐẠT).
     + Bước 6: Quay mặt về thớt C(1, 3) giữ F 1s → `key = pickup`, `actingStation = cutting` (ĐẠT).
     + Bước 7: Quay mặt về bồn W(9, 1) giữ F 1s → `key = pickup`, `actingStation = sink` (ĐẠT).
     + Bước 8: Cầm cà chua từ crate T(1, 1), đi 2s → `key = carry_run` (ĐẠT).
   - Log chi tiết lưu tại `docs/screens/quat-v1/log.txt` và screenshot tại `docs/screens/quat-v1/verify-quat-q3.png`.

---

## 3. Việc Chưa Làm (Pending for future phases)
1. **Đa dạng hóa nhân vật**:
   - Hiện mới tích hợp model `chef_male.fbx` của Quaternius.
   - Chưa mở rộng menu chọn 8 nhân vật Quaternius khác nhau theo nguyện vọng người dùng.
2. **Animation chuyên biệt**:
   - Chưa có clip chặt thái (chop) hoặc rửa bát (wash) riêng biệt; hiện đang mượn clip `PickUp`.

---

## 4. Các Điểm "TẠM" Hiện Tại
1. `actingStation` (`cutting` / `sink`): Tạm dùng clip `PickUp` của Quaternius để diễn hoạt chặt thái và rửa bát.
2. `throwing`: Tạm dùng clip `Punch` (đấm) để diễn hoạt ném đồ.
3. `nearFire`: Tạm dùng clip `Death` (gục ngã) khi đứng gần đám cháy.
4. `victory`: Tạm dùng clip `Victory` khi hết giờ / phục vụ món thành công.
5. `sitDown`: Hiện chưa có cơ chế ghế ngồi trong gameplay, chỉ load clip sẵn sàng.

---

## 5. Rủi Ro & Khuyến Nghị
1. **Lag phần mềm / SwiftShader**:
   - Chạy WebGL bằng SwiftShader trên môi trường headless có thể gây sụt giảm khung hình đột ngột khi tải asset. Đã bổ sung clamp giới hạn accumulator trong `InputController.ts` (`Math.min(accumulator + delta, TICK_MS * 4)`) để ngăn ngừa lỗi ngắt kết nối WebSocket do dồn dập gói tin.
2. **Tương thích khung xương**:
   - Khung xương Quaternius có cấu trúc 32 xương riêng biệt (khác với chuẩn Mixamo 67 xương). Nếu nạp thêm model từ nguồn khác cần định nghĩa bộ profile ánh xạ tương ứng.
