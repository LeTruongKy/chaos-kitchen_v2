# AUDIT: Đối chiếu hiện trạng code với đặc tả (01_CODING_RULES.md mục 5)

| Hạng mục | Hiện trạng | Đặc tả | Quyết định / Hành động |
| --- | --- | --- | --- |
| Máy cấp đĩa (plate_dispenser) | Có số đĩa hữu hạn, lấy đĩa giảm cleanCount, trả đĩa tăng cleanCount (`core/src/sim/interact.ts`). | Phải có số đĩa hữu hạn `level.plates`. | Giữ nguyên vì code hiện tại đã hoàn toàn đúng theo spec mới. |
| Đơn hàng hết hạn (Order expiration) | Trừ điểm theo `ORDER_EXPIRE_PENALTY`, tổng điểm dùng `Math.max(0, ...)` đảm bảo không âm. | Hết hạn trừ `ORDER_EXPIRE_PENALTY` và điểm không được âm. | Giữ nguyên vì code hiện tại đã hoàn toàn đúng theo spec mới. |
| Thời gian đếm ngược kết quả (RESULTS_SECONDS) | Là 5 giây (`core/src/constants.ts`). | Đặc tả gốc trong `01_CODING_RULES.md` là 15 giây. | Giữ nguyên 5s, đã cập nhật lại `01_CODING_RULES.md` và ghi vào `DECISIONS.md`. |
| Các hằng số khác trong `constants.ts` | Đã khớp với bảng hằng số mục 5.1. | Phải dùng đúng các giá trị hằng số như chỉ định. | Giữ nguyên. |
| Vòng đời (Phase) | Tuân thủ vòng đời: `lobby` -> `countdown` -> `playing` -> `finished`. | Đúng theo yêu cầu. | Giữ nguyên. |
| Luật tương tác (interact) | Đầy đủ cho các station như `crate`, `counter`, `stove`, `cutting`. | Được chỉ định rõ ở mục 5.5. | Giữ nguyên. |
