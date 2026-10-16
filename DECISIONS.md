# DECISIONS — Mobile UI, Double-Tap Sprint & Touch Camera Follow

1. **Ẩn nút điều khiển ảo (BƯỚC 2)**:
   - Không xóa mã tạo nút trong `InputController.ts`; sử dụng CSS trong `apps/client/src/ui/hud.css`:
     - `.touch-btn-switch` (`🔄 Đổi Chef`): `display: none !important` trên cả PC và điện thoại.
     - `.touch-btn-dash` (`⚡ Tăng tốc`): hiển thị (`display: inline-flex`) trên PC, ẩn (`display: none !important`) trên điện thoại (`@media (max-width: 768px), (pointer: coarse)`).

2. **Thu gọn HUD điện thoại (BƯỚC 3)**:
   - Trong `@media (max-width: 768px), (pointer: coarse)`:
     - `.hud-top-bar`: chiều cao tối đa `36px` (`height: 34px`), các nút `.hud-action-pill-btn` và `.hud-audio-btn` thu gọn thành nút icon `28×28px`, ẩn `.hud-btn-label` (`Công thức (H)`, `Mic: TẮT`, `Thoát (Esc)`) và `.hud-ping`.
     - Đồng hồ (`.hud-time`) và điểm/tiền (`.hud-score`): cỡ chữ `14px`, bỏ nền lớn của `.hud-timer-wrap`.
     - Thanh đơn hàng / công thức đáy (`.hud-recipe-bar` & `.hud-orders-top`): chiều cao tối đa `56px` (`height: 36px`), đặt sát đáy (`bottom: 0`), thu gọn chỉ hiển thị tên món và thanh tiến độ/kiên nhẫn.
     - Thanh sprint (`.hud-sprint-container`): cao `28px`, đặt chính giữa phía dưới (`bottom: 42px; left: 50%; transform: translateX(-50%)`).

3. **Giữ chạm di chuyển/tương tác & Double-Tap Sprint (BƯỚC 4)**:
   - Giữ nguyên hoàn toàn logic `TapPilot` và `screenToTile` trong `GameScreen.ts` / `ThreeRenderer.ts`.
   - Bổ sung nhận diện double-tap trong `InputController.ts` (`handlePointerDownForDoubleTap`):
     - Hai lần chạm liên tiếp trong `<= 300ms` và khoảng cách `<= 40px` sẽ kích hoạt `doubleTapSprintUntil = now + 1000` (giữ `dash = true` trên cùng `PlayerInput` như phím `Shift` trong `1 giây`, không thêm trường protocol mới).
     - Chạm lần thứ ba khi đang trong thời gian sprint sẽ hủy ngay `doubleTapSprintUntil = 0`.

4. **Camera theo nhân vật & Zoom 1.4× trên Touch (BƯỚC 5 / Camera Prompt)**:
   - Phát hiện touch bằng `isTouchDevice()` (`window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window`) dùng chung giữa `InputController.ts` và `ThreeRenderer.ts`.
   - Khi touch: `desiredDist = baseDist / 1.4` (zoom 1.4×, giữ nguyên góc nghiêng `58°` và `FOV = 30°`).
   - Mỗi frame trong `updateCameraFollow(dtSec)`: mục tiêu nhìn là vị trí người chơi cục bộ `(p.x * TILE_PX, 0, p.y * TILE_PX - 6)`, kẹp trong biên `[halfFrameW, mapW - halfFrameW]` và `[-6 + halfFrameZ, mapH - 6 - halfFrameZ]` (nếu bản đồ nhỏ hơn khung ở trục nào thì khóa ở giữa bản đồ trục đó), và nội suy mượt bằng lerp với `k = 6` (`alpha = Math.min(1, 6 * dtSec)`).
   - Trên PC (không touch): giữ nguyên hoàn toàn camera cố định toàn bản đồ.
