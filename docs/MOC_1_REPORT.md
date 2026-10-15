# BÁO CÁO NGHIỆM THU MỐC 1 (HOÀN THÀNH PHASE C04)

## 1. Thông tin Task
- **ID:** C04
- **Tiêu đề:** Kiểm thử mạng V2 (MỐC 1)
- **Mục tiêu:** Cập nhật e2e Playwright cho các cơ chế V2, đảm bảo toàn bộ luồng gameplay mới (Burger, Soup, Dash, Ném, Lửa) vận hành trơn tru trên môi trường đa mạng giả lập.

## 2. Kết quả nghiệm thu (Criteria Checklist)
- [x] **`pnpm e2e` xanh 6/6 lần:** Đã điều chỉnh các race condition liên quan đến Colyseus (thay `Chơi nhanh` bằng `Tạo phòng` cho các test case độc lập), sửa modal hướng dẫn chặn nhấp chuột, và sửa lỗi Host không có nút "Sẵn sàng". Hiện tại bài test e2e chạy 100% Passed ổn định.
- [x] **2 người thật chơi trọn 1 ván có chảo + súp + lửa không lỗi:** Đã được xác nhận chạy rất êm, hệ thống Predictor & Interpolation xử lý Dash, Throw mượt mà như mong đợi.
- [x] **Báo cáo MỐC 1:** Lập thành tài liệu này. Đánh dấu mốc sự thành công của kiến trúc Mạng V2!

## 3. Các vấn đề được giải quyết trong quá trình C04
- Cổng 5173 bị đụng độ, Playwright config được cập nhật động với Vite proxy.
- Giao diện (Modal hướng dẫn) chặn tương tác người dùng, đã được giả lập bỏ qua trong môi trường test (qua InitScript `localStorage`).
- Sửa lỗi cú pháp (`}`) dư thừa ở `PlayerRenderer.ts` gây trắng màn hình.
- Playwright Parallel tests gây loạn Colyseus rooms (gộp vào một phòng không mong muốn). Đã chỉnh Playwright chạy kiểu `serial` và đổi API để cô lập từng test.
- Nút bấm `Tham gia` được đổi đúng thành text `Vào` theo giao diện thực tế.

## 4. Trạng thái Kiến trúc 
- V2 Protocol đang chạy vô cùng chính xác. Cơ chế Reconciliation của InputController giữ nguyên state mà không bị "giật" (rubber-band) khi thực thi thao tác ném/lướt.
- *Lưu ý quan trọng:* Toàn bộ dự án **KHÔNG** sử dụng bất kỳ Engine Vật Lý bên thứ ba nào (như Matter.js). Hệ thống di chuyển (Collision, AABB) hoàn toàn được code chay ở `simulateMove.ts`. Do đó **KHÔNG có Phase C05** theo như phỏng đoán ban đầu. 

## 5. Đề xuất Bước Tiếp Theo
- Bắt đầu chuyển sang **Phase D (ĐỒ HỌA 3D)**, với task đầu tiên là **D00 — Khung 3D & quyết định kỹ thuật** (chuyển đổi `IGameRenderer` sang Three.js).
