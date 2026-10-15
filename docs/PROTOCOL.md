# Giao thức mạng (Protocol) V2

Sử dụng Schema-less JSON qua Room state của Colyseus (cho việc broad-cast state) và JSON messages cho tương tác.

**PROTOCOL_VERSION: 2**

## Client Messages (Client -> Server)
| Loại (Type) | Payload |
|-------------|---------|
| `ready` | `{ "ready": boolean }` |
| `select_level` | `{ "levelId": "level_1" }` |
| `start` | `{}` |
| `input` | `{ "seq": 123, "mx": 1, "my": 0, "act": false, "interact": true, "dash": false, "throw": false }` |
| `emote` | `{ "id": 1 }` |
| `ping` | `{ "t": 1670000000 }` |
| `back_to_lobby` | `{}` |
| `set_cosmetic` | `{ "color": 0, "hat": 0, "species": 0 }` |

> **Lưu ý về `input.dash`**: `dash: true` tương ứng với hành động **giữ phím Sprint** (Shift). Khi người chơi vừa giữ Sprint vừa di chuyển, vận tốc được nhân 1.5× và tiêu hao `sprintEnergy` (1 đơn vị/giây).

## Server Messages (Server -> Client)
| Loại (Type) | Payload |
|-------------|---------|
| `lobby` | `{ "code": "ABCD", "phase": "lobby", "levelId": "level_1", "hostId": "session-1", "players": [{ "id": "session-1", "name": "P1", "color": 15158332, "ready": true, "connected": true, "cosmetic": { "color": 0, "hat": 0, "species": 0 } }] }` |
| `phase` | `{ "phase": "playing", "countdown": 3 }` |
| `snapshot` | `{ "tick": 100, "timeLeft": 120, "score": 50, "streak": 0, "players": [...], "stations": [...], "orders": [...], "projectiles": [...] }` |
| `event` | `{ "type": "chop_done", "x": 5, "y": 5 }` *(Lưu ý: Luôn gửi từng object đơn lẻ, không gửi mảng. Với `serve_fail`: có thêm `"reason": "no_customer" | "no_order" | "wrong_dish" | "wrong_table"`)* |
| `results` | `{ "score": 100, "stars": 3, "served": 5, "expired": 0 }` |
| `emote` | `{ "playerId": "session-1", "id": 1 }` |
| `pong` | `{ "t": 1670000000 }` |
| `error` | `{ "code": "invalid_state", "message": "Cannot start game" }` |

### Chi tiết Sự kiện `serve_fail`
Khi tương tác phục vụ đĩa lên bàn khách `Q` thất bại:
```json
{
  "type": "serve_fail",
  "reason": "no_customer" | "no_order" | "wrong_dish" | "wrong_table",
  "x": 3.5,
  "y": 4.5,
  "playerId": "session-1"
}
```
- `no_customer`: Đặt đĩa lên bàn `Q` nhưng bàn không có khách ngồi.
- `no_order`: Bàn có khách nhưng khách chưa được nhận đơn hoặc không có đơn đang chờ.
- `wrong_dish`: Món trên đĩa không khớp đơn của khách và cũng không khớp đơn của bất kỳ khách nào khác.
- `wrong_table`: Món trên đĩa khớp đơn của một khách khác (ngồi ở bàn khác), giao nhầm bàn.

### Chi tiết Sự kiện `customer_leave` (Phase 1)
Khi khách rời bàn (do được phục vụ, hết kiên nhẫn, hoặc hết giờ chờ gọi món):
```json
{
  "type": "customer_leave",
  "reason": "served" | "expired" | "no_order_taken",
  "customerId": 1,
  "x": 3.5,
  "y": 4.5
}
```
- `served`: Phục vụ thành công món ăn, khách đã ăn xong 5s và rời đi.
- `expired`: Đơn món của khách hết hạn (patience <= 0), khách giận và rời đi sau 0.6s.
- `no_order_taken`: Khách ngồi chờ gọi món quá 30 giây (`CUSTOMER_ORDER_WAIT`) mà không có người chơi đến nhận order; khách giận và rời đi sau 0.6s.

### Chi tiết Customer State trong Snapshot (Phase 1)
Mỗi phần tử trong mảng `customers` bao gồm:
```json
{
  "id": 1,
  "tableX": 3,
  "tableY": 4,
  "recipeId": "salad",
  "state": "seated_waiting_order" | "order_taken" | "eating" | "leaving",
  "waitLeft": 28.5,
  "angry": false,
  "timer": 0
}
```
- `state`: Trạng thái vòng đời của khách:
  - `seated_waiting_order`: Khách mới vào bàn, đang đợi người chơi tương tác nhận đơn. `waitLeft` đếm ngược từ 30s về 0.
  - `order_taken`: Người chơi đã nhận đơn, đơn được đưa vào danh sách `orders`. Khi đơn kiên nhẫn < 20%, `angry` bật `true`.
  - `eating`: Đã phục vụ đúng món, khách đang ăn trong 5s.
  - `leaving`: Khách đang rời bàn trong 0.6s (`CUSTOMER_LEAVE_DURATION`). Sau 0.6s, khách được xóa khỏi game và bàn trống.
- `waitLeft`: Thời gian chờ nhận order còn lại (giây). Chỉ tồn tại/hoạt động khi `state === 'seated_waiting_order'`.
- `angry`: Cờ trạng thái tức giận (`true` khi đơn kiên nhẫn < 20%, hoặc khi hết giờ/hết kiên nhẫn đang rời đi).


### Chi tiết Player State trong Snapshot
Mỗi phần tử trong mảng `players` bao gồm:
```json
{
  "id": "session-1",
  "x": 2.5,
  "y": 3.0,
  "vx": 0,
  "vy": 0,
  "fx": 1,
  "fy": 0,
  "dashT": 0,
  "dashCd": 0,
  "throwCd": 0,
  "sprintEnergy": 3.0,
  "sprintCooldown": 0,
  "sprintExhausted": false,
  "held": null,
  "acting": false,
  "ackSeq": 123
}
```
- `sprintEnergy`: Mức năng lượng sprint hiện tại (tối đa `SPRINT_MAX = 3.0`).
- `sprintCooldown`: Thời gian trễ trước khi bắt đầu hồi năng lượng (`SPRINT_REGEN_DELAY = 0.5s`).
- `sprintExhausted`: Cờ báo cạn kiệt thể lực (khi năng lượng về 0). Khi cạn kiệt, cần hồi phục lên `>= SPRINT_RESTART_THRESHOLD` (0.2) mới có thể sprint lại.
