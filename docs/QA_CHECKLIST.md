# QA Checklist

## Luồng chính (T23)
Đây là các bước để tự kiểm thử "chơi trọn vòng" giữa 2 tab trình duyệt.

- [ ] Mở 2 tab trình duyệt ẩn danh hoặc khác session.
- [ ] Tab 1 (Host): Tạo phòng mới, ghi nhận mã phòng (VD: `ABCD`).
- [ ] Tab 2 (Client): Nhập mã phòng `ABCD` để tham gia.
- [ ] Tab 1 & Tab 2: Xác nhận cả hai cùng vào một sảnh chờ (Lobby).
- [ ] Tab 1 (Host): Chọn màn chơi (ví dụ màn 1) và bấm "Bắt đầu".
- [ ] Tab 1 & Tab 2: Xác nhận cả hai vào màn hình Game, hiển thị đếm ngược "3-2-1-Bắt đầu!".
- [ ] Cùng nấu ăn:
  - Tab 1 điều khiển lấy đĩa, thức ăn, sơ chế, nấu.
  - Tab 2 điều khiển nhân vật thứ hai tương tự, đồng bộ màn hình.
  - Giao ít nhất 1 món thành công (báo điểm).
- [ ] Chờ hết thời gian vòng chơi.
- [ ] Tab 1 & Tab 2: Xác nhận game kết thúc, hiện màn hình KẾT QUẢ.
- [ ] Ở màn hình KẾT QUẢ:
  - Tab 1 (Host): Hiển thị nút "Chơi tiếp" kèm thời gian đếm ngược (disabled 5 giây).
  - Tab 2 (Client): Hiển thị "Đang chờ chủ phòng…".
  - Kiểm tra thống kê đúng số điểm, số đơn, số sao hiển thị.
- [ ] Bấm nút "Chơi tiếp" (Host).
- [ ] Tab 1 & Tab 2: Xác nhận cả hai cùng bị đưa lại về màn hình Lobby cũ.
- [ ] Lặp lại quy trình chọn bài và chơi thêm màn khác mà không bị lỗi.
- [ ] Người thứ 3: Mở Tab 3 khi game đang chạy, nhập mã phòng `ABCD`. Xác nhận bị từ chối vào phòng do game đang diễn ra.
- [ ] Người chơi ngắt kết nối giữa chừng: Đóng Tab 2 giữa ván. Tab 1 tiếp tục chơi bình thường.

## Nâng cấp V2 (C04)

- [ ] V2.1: Chơi 1 mình (Solo Mode). Tại lobby, host (nếu đứng 1 mình) có nút tích "Chơi 1 mình (2 đầu bếp)". Bấm Start.
- [ ] V2.2: Trong game Solo, xác nhận có thể đổi qua lại 2 đầu bếp bằng phím Tab (hoặc nút Đổi trên mobile). Đầu bếp đang điều khiển có vòng highlight.
- [ ] V2.3: Đầu bếp không điều khiển đứng yên.
- [ ] V2.4: Nếu người thứ 2 tham gia khi Host đang ở Lobby và bật Solo, Solo Mode tự động tắt.
- [ ] V2.5: Cầm Nồi và Chảo trên tay, đi lại bình thường không lỗi.
- [ ] V2.6: Thịt sống (meat) đặt vào Chảo (nằm trên bếp) → progress tăng. Để đúng 8s → chín (cooked).
- [ ] V2.7: Để quên thịt trên bếp thêm 6s (sau khi chín) → thành thịt cháy (burnt).
- [ ] V2.8: Nhấc Chảo đang nấu dở ra khỏi bếp → progress tạm dừng. Đặt lại → tiếp tục nấu.
- [ ] V2.9: Nấu súp: Thái 3 nguyên liệu giống nhau (VD: 3 cà chua đã thái) rồi bỏ vào Nồi trên bếp.
- [ ] V2.10: Không thể nấu nếu Nồi chỉ có 1 hoặc 2 nguyên liệu, hoặc sai nguyên liệu. Đợi đủ 3 nguyên liệu giống nhau.
- [ ] V2.11: Đợi 15s cho Súp trong Nồi chín.
- [ ] V2.12: Súp cháy nếu để quên 10s sau khi chín. Không thể dọn súp cháy ra đĩa.
- [ ] V2.13: Cháy (Lửa): Cố tình để thịt hoặc súp cháy, đợi thêm 4 giây → bốc lửa.
- [ ] V2.14: Vật phẩm đang nằm trên bếp sẽ bị biến mất nếu trạm bị cháy.
- [ ] V2.15: Đợi thêm thời gian (với RNG) → lửa lan sang trạm bên cạnh.
- [ ] V2.16: Không thể tương tác (interact) với bất kỳ trạm nào đang bốc lửa.
- [ ] V2.17: Cầm Bình cứu hỏa (từ trạm E), hướng mặt về ngọn lửa, giữ nút Act (F/Shift) trong 1.2s → dập tắt lửa.
- [ ] V2.18: Vứt Bình cứu hỏa đi hoặc trả về giá E.
- [ ] V2.19: Ném (Throw) V2: Cầm nguyên liệu, ném sang phía đối diện (bấm J/Enter). Rơi vào khoảng trống trên quầy.
- [ ] V2.20: Ném vào người thứ 2 đang rảnh tay → người đó tự bắt lấy.
- [ ] V2.21: Ném vào người thứ 2 đang cầm đồ hoặc quầy đang đầy → nguyên liệu rớt xuống đất nát bấy (splat) và biến mất.
- [ ] V2.22: Ném không thể bay qua tường nhưng có thể xuyên qua Hố rỗng (Pit).
- [ ] V2.23: Lướt (Dash): Bấm phím K/Shift phải. Nhân vật phóng tới trước một quãng ngắn.
- [ ] V2.24: Không thể lướt liên tiếp, phải chờ thời gian hồi chiêu (Cooldown).
- [ ] V2.25: Trong lúc lướt, nhân vật không thể Tương tác hay Ném hay Thái đồ.
- [ ] V2.26: Băng chuyền (Conveyor): Đặt vật phẩm lên băng chuyền, vật phẩm tự trôi đến điểm đích.
- [ ] V2.27: Nếu ở cuối băng chuyền không còn khoảng trống, vật phẩm kẹt lại và chờ. Không bị biến mất.
- [ ] V2.28: Vứt món ăn trực tiếp lên băng chuyền nối tới cửa phục vụ → ghi nhận đơn hàng nếu đúng đơn.
- [ ] V2.29: Phục vụ 5 đơn đúng liên tiếp → Điểm thưởng (Streak) nhân hệ số tối đa x4. Bỏ qua đơn → Streak về 0.
- [ ] V2.30: Trượt băng (Ice): Di chuyển trên sàn trơn sẽ gia tốc chậm hơn nhưng có quán tính trượt dài khi buông phím.
