# Chaos Kitchen - Level Format V2

File này mô tả định dạng cấu hình màn chơi (Level) trong Chaos Kitchen phiên bản 2, bao gồm bảng ký tự ASCII, cấu trúc LevelDef và các quy tắc được sử dụng bởi hệ thống Validator.

## Bảng ký tự ASCII

Các ký tự được hỗ trợ trong map ASCII (`def.ascii`):

| Ký tự | Loại Tile | Mô tả |
|---|---|---|
| `#` | Wall | Tường, không thể đi qua, chặn ném/lướt. |
| `.` | Floor | Sàn nhà bình thường, có thể đi qua. |
| `~` | Ice | Sàn băng, di chuyển trơn trượt. |
| `_` | Pit | Hố, không thể đi qua, nhưng có thể ném vật phẩm bay qua. |
| `1`, `2`, `3`, `4` | Floor (Spawn) | Sàn nhà kèm vị trí xuất hiện ban đầu của người chơi 1-4. |
| `X` | Counter | Bàn bếp trống. |
| `C` | Cutting | Bàn thái nguyên liệu (thớt). |
| `S` | Stove | Bếp lò, sinh ra kèm một cái chảo (pan). |
| `s` | Stove | Bếp lò, sinh ra kèm một cái nồi (pot) để nấu súp. |
| `P` | Plate Dispenser | Tủ lấy đĩa sạch. |
| `O` | Serve | Cửa phục vụ món ăn (thành phẩm). |
| `R` | Dish Return | Cửa trả đĩa bẩn. |
| `W` | Sink | Bồn rửa đĩa bẩn. |
| `D` | Trash | Thùng rác. |
| `E` | Extinguisher | Giá treo bình chữa cháy. |
| `T` | Crate (Tomato) | Thùng nguyên liệu Cà chua. |
| `L` | Crate (Lettuce)| Thùng nguyên liệu Xà lách. |
| `B` | Crate (Bun) | Thùng nguyên liệu Bánh mì. |
| `M` | Crate (Meat) | Thùng nguyên liệu Thịt. |
| `N` | Crate (Onion) | Thùng nguyên liệu Hành tây. |
| `H` | Crate (Mushroom)| Thùng nguyên liệu Nấm. |
| `>`, `<`, `^`, `v` | Conveyor | Băng chuyền tương ứng hướng Phải, Trái, Lên, Xuống. |

## Cấu trúc LevelDef

Một cấu hình level (`LevelDef`) bao gồm:

```typescript
export interface LevelDef {
  id: string;                                        // ID duy nhất của level
  name: string;                                      // Tên hiển thị
  ascii: string[];                                   // Bản đồ (các chuỗi phải có cùng độ dài)
  duration: number;                                  // Thời gian chơi (giây)
  plates: number;                                    // Số đĩa sạch ban đầu ở tủ
  recipes: { id: RecipeId; weight: number }[];       // Danh sách công thức và tỷ lệ xuất hiện
  stars: [number, number, number];                   // Mốc điểm đạt 1, 2, 3 sao
  world: number;                                     // ID thế giới
  theme: 'diner' | 'ship' | 'space';                 // Theme của map
  orderScript?: { at: number; recipe: RecipeId }[];  // (Tùy chọn) Kịch bản đơn hàng cố định
  hints?: { at: number; text: string }[];            // (Tùy chọn) Gợi ý hiện lên màn hình
  unlockStars?: number;                              // (Tùy chọn) Số sao cần thiết để mở khóa
}
```

## Danh sách Lỗi (Errors) & Cảnh báo (Warnings)

Khi dùng lệnh `pnpm validate:levels` hoặc chạy server/test, validator sẽ kiểm tra từng level. Nếu có **lỗi**, level bị coi là không hợp lệ và không thể nạp. Cảnh báo mang tính thông báo về thiết kế chưa tối ưu.

### Lỗi (Errors)
* **`duration <= 0`**: Thời gian chơi phải > 0.
* **`stars not increasing`**: Mốc điểm sao phải tăng dần (1 sao < 2 sao < 3 sao).
* **`empty map`**: Mảng `ascii` rỗng.
* **`rows not same length`**: Các hàng trong mảng `ascii` không dài bằng nhau.
* **`invalid char <c>`**: Ký tự lạ không có trong bảng hỗ trợ.
* **`E is enclosed by walls`**: Bình chữa cháy (`E`) bị bao quanh cả 4 hướng bởi tường (`#`). Người chơi không thể tương tác.
* **`conveyor at x,y ends in wall`**: Băng chuyền đổ thẳng vào tường (`#`).
* **`missing or multiple 1/2/3/4`**: Mỗi người chơi (từ 1 đến 4) phải có đúng một điểm spawn trên map.
* **`missing P/O/R/W/D/C/S`**: Thiếu các trạm thiết yếu: Lấy đĩa (P), Giao hàng (O), Trả đĩa (R), Rửa đĩa (W), Thùng rác (D), Thái (C), Bếp (S).
* **`missing s (pot) for soup recipes`**: Map có công thức nấu súp nhưng thiếu nồi (`s`).
* **`missing crate <X>`**: Map yêu cầu nguyên liệu (do công thức) nhưng thiếu thùng chứa tương ứng (VD: burger cần M, B, L).

### Cảnh báo (Warnings)
* **`floor at edge`**: Các ô sàn (bao gồm `.` hoặc sàn băng `~`, hố `_`) nằm ở viền ngoài của bản đồ (không được bao bọc bởi tường).
* **`pot 's' exists but no soup recipe`**: Đặt nồi nấu súp (`s`) trên map nhưng không cấu hình recipe súp nào.
* **`station <c> at x,y isolated`**: Trạm làm việc không giáp với bất kỳ ô sàn (`.`, `~`, `1-4`) nào, khiến người chơi không thể tiếp cận.
* **`floor at x,y unreachable`**: Có phân vùng sàn nhà bị cô lập hoàn toàn (không liên thông với khu vực có vị trí xuất hiện ban đầu). Chú ý: Bỏ qua lỗi này nếu map có Hố (`_`).

## Ví dụ Level

```typescript
export const levelB08: LevelDef = {
  id: 'b08',
  name: 'Băng Chuyền (B08)',
  duration: 180,
  plates: 4,
  world: 1,
  theme: 'diner',
  recipes: [
    { id: 'salad', weight: 1 }
  ],
  stars: [20, 60, 100],
  ascii: [
    '##########',
    '#T.>.XW.2#',
    '#L.v.>P.3#',
    '#C1v.XO.4#',
    '#S..R.D..#',
    '##########'
  ]
};
```
