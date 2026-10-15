# Quyết định kỹ thuật (Decisions)

## Phase V1: Quaternius Model & Animations
- 2026-10-13: Tên xương tay phải của Quaternius là `FistR`. Điểm neo cẳng tay dự phòng là `LowerArmR`.
- 2026-10-13: Điểm neo vật cầm: gắn vào `FistR`, offset position `(0.0, 0.05, 0.15)` trong hệ tọa độ xương, scale `0.6` của model hiện tại.
- 2026-10-13: Khách (customer) và khách tức giận (customer angry) tạm thời đều dùng khóa clip `sit` (`CharacterArmature|SitDown`) do gói Quaternius chưa có clip ngồi tức giận riêng.
- 2026-10-13: Chuẩn hóa kích thước Quaternius (GATE 1): `scale_node = 0.01` (quy đổi centimet từ Blender FBX sang mét), `h_thực = h_thô * scale_node`, hệ số scale group bọc ngoài là `he_so = 0.95 / h_thực`.
- 2026-10-13: Nhận diện trạm acting (GATE 2): Bổ sung `actingStation: 'cutting' | 'sink' | null` vào `RenderFrame.players` trong `FrameBuilder` (chỉ ở client, không đổi core). Khi `actingStation` là `cutting` hoặc `sink`, clip chọn là `pickup`.
- 2026-10-13: Đưa dữ liệu debug ra window (Q3 - BƯỚC 1): Trong chế độ debug (`?debug=1`), mỗi frame cập nhật `window.__QUAT__ = { key, once, timeScale, scale, h, actingStation, ready, x, y, fx, fy, held, footL, footR }` từ `Chef.ts` để script Playwright hoặc tester có thể đo kiểm trực tiếp trên trình duyệt.

## T16
- 2026-10-05: Dùng `MockNetClient` chỉ cho giao diện T16, với cùng nhóm hàm menu/lobby dự kiến của `NetClient` T17 và một `local-player` ID cố định để phân biệt host. Lý do: T17 chưa tồn tại, còn T16 cần giao diện thao tác được với mock; T17 có thể thay thế dependency này mà không đổi giao diện.
- 2026-10-05: Thêm `jsdom@25.0.1` (dev dependency, ghim chính xác) để kiểm thử DOM tự động cho URL mời, render an toàn bằng `textContent`, và trạng thái host/non-host. Lý do: Vitest hiện chạy môi trường Node, không có DOM để nghiệm thu T16.
- 2026-10-05: Ngoại lệ lint chỉ dành cho `__tests__`: mock Colyseus cũ sử dụng `any` và `Function` để thay thế API framework runtime, nên tắt ba rule type/unused tại test thay vì làm thay đổi các mock hoặc mã runtime ngoài T16. Mã nguồn sản phẩm vẫn bị kiểm tra đầy đủ; các lỗi runtime tồn đọng đã được thay bằng `unknown`/kiểu cụ thể.

## T07
- Để đảm bảo "Hai người chơi cùng thái một thớt: tốc độ không nhân đôi", tôi đã thêm trường `lastActTick?: number` vào `StationState` trong `types.ts`. Trường này dùng để đánh dấu trạm đã được xử lý `progress += dt` trong tick hiện tại chưa, giúp tránh việc một trạm được tính tiến độ 2 lần nếu có 2 người chơi cùng nhấn `act` vào nó.

## T08
- Thêm thuộc tính `recipeWeights: { id: RecipeId; weight: number }[]` và `starThresholds: [number, number, number]` vào `GameState` trong `types.ts` để lưu trữ các thông tin này từ level truyền vào, phục vụ cho quá trình sinh đơn ngẫu nhiên và tính sao lúc hoàn thành.
- Sao chép (clone) trực tiếp giá trị vào state ở hàm `createGameState`.

## T13
- 2026-10-05: Chỉ giữ chỗ reconnect cho kết nối bị ngắt bất thường trong `countdown` hoặc `playing`; rời phòng chủ động và kick bị xóa ngay. Lý do: phù hợp ngữ nghĩa `consented` của Colyseus 0.16 và không giữ chỗ cho người chơi đã chọn rời phòng.
- 2026-10-05: Áp dụng giới hạn 1 KB cả ở `WebSocketTransport.maxPayload` lẫn kiểm tra JSON của từng handler. Lý do: transport chặn gói lớn trước khi vào Room, còn kiểm tra tại handler đảm bảo mọi đường nhận message tuân thủ cùng giới hạn.

## T14
- 2026-10-05: Bot đọc tile map từ level tĩnh trong `@kitchen/core` dựa trên `levelId` của lobby, vì `Snapshot` theo protocol không chứa `tiles`, `width` hay `height`. Lý do: giữ nguyên protocol server-authoritative đã quy định và vẫn dùng BFS trên đúng map để điều hướng bot.

## Bugfix - Black Screen (T27+)
- 2026-10-05: Thêm `buffer` (ghim chính xác phiên bản) vào `apps/client` và polyfill `Buffer`, `global` trong `apps/client/src/polyfill.ts` & `vite.config.ts`. Lý do: `colyseus.js` và `@colyseus/schema` truy cập `Buffer` lúc nạp module. Trong môi trường trình duyệt với Vite, việc thiếu `Buffer` gây lỗi `ReferenceError: Buffer is not defined` làm ứng dụng sập ngay khi mở trang dẫn đến màn hình đen.

## F05
- 2026-10-05: Chuyển logic kiểm tra phòng đang chơi (phase !== 'lobby') từ `onJoin` sang `onAuth` và ném `ServerError(4001)`. Lý do: `onAuth` chạy trước khi client chính thức tham gia vào Room, giúp từ chối kết nối sớm và chính xác theo khuyến nghị của Colyseus.
- 2026-10-05: Sử dụng `generateRoomCode` từ `@kitchen/core/utils` (thay vì lặp `Math.random`) kết hợp với `matchMaker.query` để tìm mã phòng trống. Việc xử lý mã phòng ở core giúp đồng nhất, đồng thời tránh dùng `catch {}` rỗng nuốt lỗi khởi tạo phòng.

## A00
- 2026-10-06: Task A00 xác nhận các thiết lập đã có sẵn ở repo đúng đặc tả: máy cấp đĩa (`plate_dispenser`) đã có hữu hạn đĩa `level.plates` (kiểm tra `station.cleanCount > 0` và giảm trong tương tác), đơn hết hạn đã trừ theo số điểm phạt `ORDER_EXPIRE_PENALTY` và điểm luôn `Math.max(0, ...)`.
- 2026-10-06: Quyết định chấp nhận `RESULTS_SECONDS = 5` và cập nhật lại file `01_CODING_RULES.md` từ 15 xuống 5 theo như đặc tả của A00.

## A01
- 2026-10-06: Task A01 triển khai hệ thống settings tĩnh, được hỗ trợ lưu bằng localStorage. Fallback auto detect qua navigator.hardwareConcurrency chỉ hoạt động khi ở client. Các unit tests đã pass và cover logic default, load từ storage, apply URL query param overriding mà không ghi vào localStorage, và update setting. Mặc định FPS được chọn là tắt.

## A02
- 2026-10-06: Tạo class `GameScreen` chịu trách nhiệm quản lý vòng lặp chính của client bằng `requestAnimationFrame`. Vòng lặp này sẽ đọc dữ liệu từ `FrameBuilder` và truyền frame qua `IGameRenderer.applyFrame` rồi gọi `update()`. Lý do: Cần tách biệt vòng lặp game ra khỏi Phaser để sau này hỗ trợ Three.js hoặc các renderer độc lập dễ dàng hơn.
- 2026-10-06: Bọc Phaser thành `PhaserRenderer` và thiết lập `PhaserGameScene` (chỉ còn logic vẽ) dựa trên `GameScene` cũ. Mọi logic mạng, dự đoán và bù đắp mạng đã được trích xuất thành công sang `FrameBuilder` như đặc tả.

## B01
- 2026-10-06: Cập nhật `PlayerInput` với `dash: boolean` và `throw: boolean` thay thế cho các nút hành động rác (`drop`, `emote`).
- 2026-10-06: Khởi tạo các trường mới phục vụ V2 trong `createGameState` như `projectiles: []`, `streak: 0` và thuộc tính cho hỏa hoạn (`onFire`, `fireTimer`, `burntTimer` trên các Station).
- 2026-10-06: Nâng cấp phiên bản `PROTOCOL_VERSION` lên `2` để bảo vệ đồng bộ dữ liệu. `docs/PROTOCOL.md` cũng được cập nhật. Test framework (fixtures/mocks) toàn repo được refactor sang định dạng mới, giữ test xanh 100%.

## B02
- 2026-10-06: Đã áp dụng `MoveState` (vx, vy, dash, dashCd) và thực hiện giải quyết logic gia tốc (accel/fric/max_speed) thay vì gán trực tiếp x/y. Tốc độ khung hình vật lý (dt = 1/30) được sử dụng để điều khiển bước di chuyển theo hệ số của bề mặt.
- 2026-10-06: Bề mặt `ice` được xử lý với mức gia tốc giảm (30) và ma sát thấp hơn (0.9 so với 0). Pits `_` được chặn giống hệt walls. Xử lý va chạm `resolvePlayerCollisions` đẩy người chơi khi dẫm lên nhau, và cập nhật client prediction cho khớp server.

## B04
- 2026-10-06: Tools (Pan, Pot, Extinguisher) implemented. GameScene renders them properly.

## Sprint V2 & Golden Hashes
- 2026-10-09: Thay thế cơ chế Dash cũ (xung tốc độ ngắn) bằng cơ chế Sprint liên tục tiêu hao thể lực (Sprint Energy):
  - Hằng số mới trong `constants.ts`:
    - `SPRINT_MULTIPLIER = 1.5` (tốc độ sprint = 1.5× tốc độ tối đa của người chơi = 2.6 × 1.5 = 3.9).
    - `SPRINT_MAX = 3.0` (năng lượng sprint tối đa: 3.0 đơn vị).
    - `SPRINT_DRAIN_RATE = 1.0` (tiêu hao 1 đơn vị/giây khi giữ Shift + đang di chuyển).
    - `SPRINT_REGEN_RATE = 1.0` (hồi phục 1 đơn vị/giây khi không sprint).
    - `SPRINT_REGEN_DELAY = 0.5` (trễ 0.5s trước khi bắt đầu hồi phục sau khi nhả Shift hoặc đứng yên).
    - `SPRINT_RESTART_THRESHOLD = 0.2` (sau khi cạn về 0, cần hồi lên ≥ 0.2 mới được sprint lại nhằm chống nhấp nháy/flicker; không bắt buộc hồi đầy).
  - Cho phép sprint tự do với năng lượng còn lại mà không bắt buộc phải đầy thanh (năng lượng cạn đến đâu thì sprint được đến đó).
  - Ném (`throw`) và tương tác (`interact`) hoạt động bình thường trong lúc đang sprint.
  - Cập nhật snapshot B11 (Golden Hashes) do thay đổi cấu trúc PlayerState (`sprintEnergy`, `sprintCooldown`, `sprintExhausted`) và mô phỏng di chuyển.

## T1 — 3D Recipe Thumbnails & Ticket Display
- 2026-10-09: Tạo ảnh thumbnail 3D offscreen cho 6 món ăn (`salad`, `burger`, `burger_tomato`, `tomato_soup`, `onion_soup`, `mushroom_soup`):
  - Script: `scripts/thumbs.ts` (chạy bằng `npx tsx scripts/thumbs.ts`, tương thích Windows).
  - Renderer & view: `apps/client/src/ui/thumbsView.ts` gắn vào route `/?view=thumbs`. Dùng chính hàm `createItemModel` của game (`apps/client/src/game/renderer3d/items.ts`) cùng asset thật (`AssetLoader` & `AssetManifest`).
  - Cấu hình camera & render:
    - Kích thước canvas: 256×256 px, nền trong suốt (`alpha: true`, `clearColor: 0x000000, 0`).
    - Camera: `PerspectiveCamera(35, 1, 0.1, 1000)`. Góc nghiêng ~35° (elevation angle).
    - Khung ngắm đĩa (`plate`): `camera.position(0, 56, 82)`, `lookAt(0, 10, 0)`.
    - Khung ngắm nồi súp (`pot`): `camera.position(0, 52, 70)`, `lookAt(0, 10, 0)`.
    - Ánh sáng: `DirectionalLight(0xffffff, 1.4)` tại `(30, 60, 40)` và `AmbientLight(0xffffff, 0.85)`.
  - Kết xuất lưu tại: `apps/client/public/thumbs/recipes/<recipeId>.png` và `docs/screens/t1/thumbs/<recipeId>.png`.
  - Hiển thị ticket HUD:
    - Chỉ hiển thị: Tên món tiếng Anh từ `RECIPES[recipeId].name`, ảnh thumbnail `<img class="hud-order-thumb" src="/thumbs/recipes/<recipeId>.png">`, thanh kiên nhẫn.
    - Tuyệt đối không dùng emoji, không icon nguyên liệu từng bước, không bảng dịch tiếng Việt.
    - Khi ảnh thumbnail thiếu/lỗi: hiển thị khung xám cùng tên món, đồng thời ghi log `console.error('MISSING THUMB: ' + recipeId)` và hiển thị chữ đỏ cảnh báo `"MISSING THUMB: <recipeId>"` khi có param `?debug=1`.

## Cập nhật Unit Tests Sprint (`dash.test.ts`)
- 2026-10-09: SPRINT_MAX: 3.0 → 2.0 giây. Lý do: sprint chậm hơn theo yêu cầu. Ngày: 2026-10-09. Ảnh hưởng: năng lượng sprint, thời gian cạn, golden B11.
  - Các giá trị dẫn xuất đổi theo:
    - Thời gian cạn: 2.0 giây (`SPRINT_MAX / SPRINT_DRAIN_RATE = 2.0 / 1.0 = 2.0s`, tương đương 60 ticks ở 30Hz; không phải 3.0s/90 ticks).
    - Hồi đầy sau: 2.0 giây sau khi hết trễ (`SPRINT_MAX / SPRINT_REGEN_RATE = 2.0 / 1.0 = 2.0s`, cộng trễ `SPRINT_REGEN_DELAY = 0.5s` thành tổng 2.5s).
    - Mốc bắt đầu sprint lại sau khi cạn: `SPRINT_RESTART_THRESHOLD = 0.2` (sau 0.2s hồi phục kể từ khi trễ kết thúc).
- 2026-10-09: Điều chỉnh fixture và kiểm thử trong `packages/core/src/__tests__/dash.test.ts` theo đúng bảng chân trị Sprint đã duyệt:
  | Test cũ (thiết kế ban đầu) | Test mới (bảng chân trị Sprint V2) | Lý do thay đổi |
  | :--- | :--- | :--- |
  | `Giữ Shift + di chuyển từ 3.0: sau 1s còn 2.0; sprint tốc độ ≈ 1.5× (±5%)` | `Giữ Shift + di chuyển từ đầy (SPRINT_MAX): sau 1s còn SPRINT_MAX - 1.0; sprint tốc độ ≈ 1.5× (±5%)` | Dùng hằng số SPRINT_MAX (2.0s), sau 1s còn 1.0. |
  | `Giữ Shift liên tục: đến 0 thì sprint dừng ở đúng thời điểm (±1 tick), tốc độ về bình thường` | `Giữ Shift liên tục từ đầy (SPRINT_MAX): đến 0 thì sprint dừng ở đúng thời điểm (±1 tick), tốc độ về bình thường` | Tính theo 60 ticks (2.0s) cạn thể lực từ SPRINT_MAX về 0. |
  | `Nhả Shift: sau 0.5s thanh bắt đầu hồi, đầy sau khoảng 3s; không vượt 3.0` | `Nhả Shift: sau 0.5s thanh bắt đầu hồi, đầy sau khoảng 2s (tổng 2.5s); không vượt SPRINT_MAX` | Kiểm tra thời gian hồi phục 2.0s về mức tối đa SPRINT_MAX = 2.0. |

## Cập nhật Golden Hashes B11 (`b11.test.ts`)
- 2026-10-09: Cập nhật Golden Hashes sau khi chuẩn hóa cơ chế Sprint V2 (`SPRINT_MAX = 2.0`, `sprintEnergy`, tốc độ sprint, hồi thể lực):
  - Danh sách thay đổi trong `packages/core` đã kiểm tra:
    - `constants.ts`: các hằng số sprint (`SPRINT_MAX = 2.0`, `SPRINT_MULTIPLIER = 1.25`, `SPRINT_DRAIN_RATE = 1.0`, `SPRINT_REGEN_RATE = 1.0`, `SPRINT_REGEN_DELAY = 0.5`, `SPRINT_RESTART_THRESHOLD = 0.2`).
    - `types.ts`: trường `sprintEnergy`, `sprintCooldown`, `sprintExhausted` trong `PlayerState`.
    - `sim/createState.ts`: khởi tạo `PlayerState` với `sprintEnergy: SPRINT_MAX`, `sprintCooldown: 0`, `sprintExhausted: false`.
    - `sim/movement.ts`: logic di chuyển với tiêu hao thể lực sprint, tốc độ x1.25 khi sprint, tự ngắt khi về 0, hồi phục sau trễ và ngưỡng khởi động lại.
    - Không có bất kỳ thay đổi nào ngoài sprint (map tiles, ký tự map, spawn points, recipes, orders, stations đều giữ nguyên tuyệt đối).
  - Bảng Golden Hashes cũ → mới:
    | Level | Hash cũ (Trước Sprint V2) | Hash mới (Sprint V2 - SPRINT_MAX 2.0) |
    | :--- | :--- | :--- |
    | `b08` | `c3d1339b07eb0440e4568998f1ce916e0360ce6ef2dd86e1f66a42adbd657243` | `17ca3daa275c4a4afe239082126afa4287ae7eb192d2937f5cc254058a07f71e` |
    | `level1` | `580d5ff13d903c5921a1d9ba596c31e5ea3109bfb3c2b52984d25d9946dcf07b` | `fdaa9b1782152904177e3d0dd777a8432e6d1c24e673424e7a0cb003765d64e7` |
    | `level2` | `9d7dbcc18fff6080688fc7df52dfd2083a7f5bda10cf2d07053c7717b9a1b847` | `a21307dcb7f68cdcd648e91a14c5e00fbbf974cdd6990538a170985f5f5b4f93` |
    | `level3` | `223b86603859f399ea8645e90908678478cd59ef92cdf72eada39ee7001a252d` | `62da5b304a14f241a1e18bd09b4855baca6584e4086af290fc739f5c0019f21d` |
    | `test_carry` | `cc78fdb2b1b1a17208dc852a6741c3d2b540dda55b29313c5f619d37c2e178d2` | `4fc5de590286b0cfb7ef0e3f30dfd02c1d67b6db84ac92a99ef78b2f0095c6d4` |
    | `tutorial` | `5f51a051489a1229ade6bd1803258d512a3539c4ba87f9dc2ea9367660f2adb6` | `86f4ab754604a68ec92637ff70225d7c93fb903d43b110ffdb5451f9824e5b8e` |

## Phục vụ tại bàn khách (Task T2)
- 2026-10-09: Luật phục vụ khi đặt đĩa D lên bàn Q tại (x,y):
  1. Không có khách ngồi tại Q → serve_fail, reason 'no_customer'. Đĩa giữ trong tay.
  2. Có khách C tại Q nhưng C không có đơn đang chờ → serve_fail, reason 'no_order'. Đĩa giữ trong tay.
  3. Có khách C, đơn O của C, D khớp recipe O → serve_ok. Đơn O bị xóa. Khách chuyển sang trạng thái eating, đĩa thành đĩa bẩn tại Q sau khi ăn xong (giữ nguyên luật chu trình đĩa bẩn và rửa hiện có).
  4. Có khách C, đơn O của C, D không khớp recipe O (và không khớp đơn của khách nào khác) → serve_fail, reason 'wrong_dish'. Đĩa giữ trong tay.
  5. D khớp recipe của đơn thuộc khách C2 khác (không phải khách tại Q) → serve_fail, reason 'wrong_table'. Đĩa giữ trong tay.
- Ràng buộc & Cấu trúc dữ liệu:
  - So khớp qua `customerId` của Order và `customerId`/tọa độ bàn Q của khách (không thêm trường `tableId` vào `Order`).
  - Không thêm ký tự map 'O', không thêm TileType 'serve'.
  - Bổ sung trường `reason: 'no_customer' | 'no_order' | 'wrong_dish' | 'wrong_table'` vào sự kiện `serve_fail` trong `GameEvent` và cập nhật `docs/PROTOCOL.md`.
  - Client hiển thị toast tiếng Anh ngắn gọn theo từng lý do: "No customer here", "No order for this customer", "Wrong dish", "Wrong table".

## Đĩa bẩn tại bàn & chu trình rửa (Task T3)
- 2026-10-09: Chu trình đĩa bẩn tại bàn Q và rửa đĩa tại bồn W:
  1. Sau khi khách ăn xong (5.0s), khách rời bàn và để lại đĩa bẩn `{ type: 'plate', dirty: true, contents: [] }` tại bàn Q (`station.item`).
  2. Bàn có đĩa bẩn ngăn không cho khách mới spawn vào bàn đó (`emptyTables` lọc bỏ bàn có đĩa bẩn).
  3. Người chơi tay trống tương tác `interact` với bàn Q nhặt đĩa bẩn lên tay. Dọn sạch đĩa bẩn giúp bàn Q sẵn sàng đón khách tiếp theo. Đã xử lý phòng chống stale `station.customerId` (nếu không còn khách tại bàn thì tự động xóa customerId để người chơi luôn nhặt được đĩa bẩn).
  4. Người chơi mang đĩa bẩn đến bồn rửa `W` (`station.type === 'sink'`), bấm `interact` để thả đĩa vào bồn (`sink.dirtyCount++`).
  5. Người chơi giữ hành động `act` hướng về bồn rửa trong `WASH_TIME = 3.0s` (`updateAction`): `sink.dirtyCount` giảm 1, `sink.cleanCount` tăng 1, phát sinh event `wash_done`.
  6. Người chơi tay trống tương tác `interact` với bồn rửa để lấy đĩa sạch ra (`player.held = makePlate(false)`).
  7. Người chơi mang đĩa sạch cất vào tủ đĩa `P` (`station.type === 'plate_dispenser'`), tăng `dispenser.cleanCount`, hoặc đặt lên quầy `X`.

## Súp cà chua & Map Bếp Đôi (Task T4)
- 2026-10-09: Tích hợp map "Bếp Đôi" (`bep_doi`) chứa trạm nồi `s` và công thức `tomato_soup` vào game:
  - Cấu trúc map: kích thước 16×10, không có `O` và `R`. Có 4 bàn khách `Q`, bồn rửa `W`, tủ đĩa `P`, thớt `C`, bếp chảo `S`, bếp nồi `s`, thùng rác `D`, bình cứu hỏa `E`, 4 thùng nguyên liệu `T, L, B, M`. Bàn chuyền đồ ở giữa (cụm counter `X` 4×3), lối đi 2 ô thông thoáng. Đạt chuẩn 0 lỗi và 0 cảnh báo trong `validateLevel`.
  - Quy trình súp:
    1. Lấy 3 cà chua từ thùng `T` $\rightarrow$ thái trên thớt `C` trong `CHOP_TIME = 3.0s`.
    2. Cho 3 cà chua đã thái vào nồi `s` (`pot.contents.length === 3`). Nồi chỉ nhận tối đa 3 nguyên liệu cùng loại (`tomato`, `onion`, `mushroom`).
    3. Nồi tự động nấu trên bếp trong `POT_COOK_TIME = 15.0s`, phát sinh sự kiện `pot_done`. Nếu để quên quá `POT_COOK_TIME + POT_BURN_TIME = 25.0s`, súp sẽ bị cháy (`soup_burnt`).
    4. Cầm đĩa sạch tương tác với nồi chín $\rightarrow$ múc thành công súp vào đĩa `{ id: 'soup_tomato', state: 'cooked' }`, nồi trở về rỗng.
    5. Đĩa súp khớp công thức `tomato_soup` (`matchRecipe`), mang đến bàn khách `Q` có đơn $\rightarrow$ `serve_ok`, nhận 40 điểm cơ bản + tip.
  - Golden Hash B11:
    - Bổ sung golden hash cho `bep_doi`: `7a6c2ac82ae689824e0b94dba208a57c3336def63ae37e930d2e8b4a326ea26d`.
    - Toàn bộ golden hash của các map cũ (`b08`, `level1`, `level2`, `level3`, `test_carry`, `tutorial`) được bảo toàn tuyệt đối 100%.

## Map Bếp Đôi: Nghiệm thu hoàn thành đơn Salad & Burger (Task T5)
- 2026-10-09: Hoàn thành bộ unit test `bep_doi.test.ts` cho map Bếp Đôi:
  - Kiểm tra số lượng và phân bổ trạm: 4 bàn `Q`, 1 bếp chảo `S`, 1 bếp nồi `s`, 1 bồn rửa `W`, 1 tủ đĩa `P`, 2 thớt `C`, 4 thùng nguyên liệu `T, L, B, M`, 12 quầy counter `X` ở trung tâm (khe chuyền đồ 4×3).
  - Hoàn thành đơn `salad`: lấy xà lách thái + cà chua thái + đĩa $\rightarrow$ giao bàn `Q` $\rightarrow$ `serve_ok`, điểm cộng 20 + tip.
  - Hoàn thành đơn `burger`: nấu thịt trên chảo `S` + bánh mì `B` + xà lách thái $\rightarrow$ đĩa $\rightarrow$ giao bàn `Q` $\rightarrow$ `serve_ok`, điểm cộng 35 + tip.
  - Phối hợp chuyền đồ qua quầy giữa: Người chơi 1 đặt cà chua lên quầy `X` từ bên trái, Người chơi 2 nhặt từ quầy `X` từ phía trên.
  - Đạt 100% xanh trong `validateLevel` (0 lỗi, 0 cảnh báo).

## Map Nhà Hàng Mở (Task T6)
- 2026-10-09: Thiết kế và tích hợp map "Nhà Hàng Mở" (`nha_hang_mo`) vào `packages/core/src/levels/nha_hang_mo.ts`:
  - Kích thước: 16×11 (Diner theme), không có `O`, không có `R`, không có hố `_`.
  - Cấu trúc:
    - Bếp ở phía trên (y=1..4) với trạm nấu `S` (pan), `s` (pot), thớt `C`, bồn rửa `W`, tủ đĩa `P`, thùng rác `D`, bình chữa cháy `E`, 4 thùng nguyên liệu `T, L, B, M`.
    - Quầy chia tách bếp và sảnh tiệc ở giữa (y=5): 4 ô pass counter `X` ở giữa (x=6..9) và hai lối vào bếp rộng 5 ô ở hai bên (x=1..5 và x=10..14), rộng hơn nhiều so với chuẩn tối thiểu 2 ô.
    - Sảnh ăn ở phía dưới: có đúng **4 bàn `Q` xếp thành 1 hàng ngang duy nhất** tại y=8 (x=3, 6, 9, 12), cách đều nhau 2 ô sàn, đảm bảo khách ngồi ăn hoàn toàn không chắn cửa vào bếp.
  - Kiểm định `validateLevel`: 0 lỗi, 0 cảnh báo.
  - Unit test `nha_hang_mo.test.ts`:
    - Đếm trạm và kiểm tra cấu trúc 4 bàn `Q` thẳng hàng tại y=8.
    - Kiểm tra khách ngồi ở cả 4 bàn không cản trở lối vào bếp.
    - Hoàn thành trọn vẹn 1 đơn `burger_tomato` (4 nguyên liệu) tại bàn khách `Q` và chu trình dọn đĩa bẩn $\rightarrow$ bồn rửa `W` $\rightarrow$ rửa $\rightarrow$ cất tủ đĩa `P`.
  - Golden Hash B11:
    - Bổ sung golden hash cho `nha_hang_mo`: `065199e8cdc0edf92e502048c41f13848ff69a390204ab04caf231702663d095`.
    - Bảo toàn 100% hash của 7 map trước đó.

## Trạm Lò Nướng U, Món Pizza & Map Bếp Lò Nướng (Task T7)
- 2026-10-09: Hoàn thiện toàn diện cơ chế Lò nướng `U` và món `pizza` (theo H04 & T7, áp dụng quy trình phục vụ tại bàn T2):
  - **Khai báo & Định danh (R0.6, R0.7)**:
    - Ký tự trạm ASCII mới: `U` (Oven / Lò nướng). **Tuyệt đối không dùng `O`**.
    - Ký tự thùng nguyên liệu mới: `K` (Dough / Bột mì), `Z` (Cheese / Phô mai).
    - TileType: thêm `'oven'`.
    - IngredientId: thêm `'dough' | 'cheese' | 'pizza'`.
    - RecipeId: thêm `'pizza'`.
    - EventType: thêm `'oven_done' | 'pizza_burnt'`.
    - Hằng số mới trong `constants.ts`: `OVEN_COOK_TIME = 12.0`, `OVEN_BURN_TIME = 6.0`, `ORDER_PATIENCE_BY_RECIPE['pizza'] = 90`, `RECIPE_SCORE['pizza'] = 55`.
    - Công thức `pizza` trong `recipes.ts`: yêu cầu 1 đĩa có 1 pizza chín (`cooked`), điểm 55.

  - **Bảng Chân Trị (Truth Tables)**:
    1. *Bảng chân trị sơ chế trên thớt `C` (`CHOP_TIME = 3.0s`)*:
       - `dough (raw)` + giữ phím `act` 3s $\rightarrow$ `dough (chopped)` (nhào bột làm đế bánh).
       - `tomato (raw)` + giữ phím `act` 3s $\rightarrow$ `tomato (chopped)` (sốt cà chua).
       - `cheese (raw)` + giữ phím `act` 3s $\rightarrow$ `cheese (chopped)` (phô mai sợi).
    2. *Bảng chân trị lắp ráp bánh trên quầy counter `X`*:
       - `dough (chopped)` trên quầy + cầm `tomato (chopped)` tương tác $\rightarrow$ bột chứa sốt cà chua (`contents: [tomato]`).
       - `dough (chopped)` đã có sốt cà chua + cầm `cheese (chopped)` tương tác $\rightarrow$ tự động ghép thành bánh pizza sống: `{ type: 'ingredient', id: 'pizza', state: 'raw' }`.
       - Lắp ráp theo thứ tự ngược lại (cho phô mai trước rồi cho sốt cà chua sau) đều tự động biến thành `pizza (raw)`.
    3. *Bảng chân trị trạm Lò nướng `U` (Tương tác `interact`)*:
       - Lò nướng trống + Cầm `pizza (raw)` $\rightarrow$ Đặt vào lò, bắt đầu đếm giờ nướng (`progress = 0`).
       - Lò nướng trống + Cầm vật phẩm khác $\rightarrow$ Từ chối, giữ nguyên đồ trên tay.
       - Lò nướng có `pizza (cooked)` + Cầm đĩa sạch `plate` $\rightarrow$ Vớt pizza chín lên đĩa: `plate.contents = [pizza (cooked)]`.
       - Lò nướng có `pizza (cooked / burnt)` + Tay không $\rightarrow$ Cầm trực tiếp bánh pizza ra khỏi lò.
    4. *Bảng chân trị chu trình nhiệt lò nướng (`tickStations`)*:
       - $0 \le t < 12.0s$: Bánh nướng trong lò, tiến trình tăng dần.
       - $t = 12.0s$: Bánh chín $\rightarrow$ chuyển sang `cooked`, phát sự kiện `cook_done` và `oven_done`.
       - $12.0s < t < 18.0s$ (+6.0s): Bánh chín để quên trong lò.
       - $t = 18.0s$: Bánh cháy $\rightarrow$ chuyển sang `burnt`, phát sự kiện `burnt` và `pizza_burnt`.
       - $t = 22.0s$ (+4.0s sau khi cháy): Lò nướng bốc cháy $\rightarrow$ `onFire = true`, phát sự kiện `ignite`.
       - Lò cháy + Bình chữa cháy `E` (`EXTINGUISH_TIME = 2.0s`) $\rightarrow$ Dập tắt lửa, lò trở lại bình thường (`onFire = false`).
    5. *Bảng chân trị phục vụ tại bàn `Q`*:
       - Đĩa pizza chín + Mang đến bàn khách `Q` có đơn `pizza` $\rightarrow$ Phục vụ thành công, cộng 55 điểm cơ bản + tip theo thời gian kiên nhẫn còn lại, đơn hoàn thành, khách ăn trong 5s rồi rời đi, để lại đĩa bẩn tại bàn.

  - **Map Bếp Lò Nướng (`bep_lo_nuong`)**:
    - Kích thước: 16×10, Diner theme.
    - Sơ đồ ASCII:
      ```
      ################
      #KZTLBM.UsSEPWD#
      #..............#
      #C.1...XXXX..2C#
      #......XXXX....#
      #......XXXX....#
      #..............#
      #..Q..Q..Q..Q..#
      #..............#
      ################
      ```
    - Bố trí trạm: 1 Lò nướng `U`, 6 thùng nguyên liệu `K, Z, T, L, B, M`, 2 thớt `C`, 1 bếp chảo `S`, 1 bếp nồi `s`, 1 tủ đĩa `P`, 1 bồn rửa `W`, 1 thùng rác `D`, 1 bình chữa cháy `E`, 4 bàn khách `Q`, 12 quầy counter `X` ở trung tâm.
    - Đạt 100% xanh `validateLevel`: 0 lỗi, 0 cảnh báo.

  - **Đồng bộ Renderer 3D & 2D Client**:
    - `AssetManifest`: tích hợp model `pizza` (`/assets/models/pizza.glb`), `station_oven` (`gltf/oven.gltf`), `station_crate_dough` (`gltf/crate_buns.gltf`), `dough` (`gltf/food_ingredient_bun.gltf`), `dough_chopped` (`gltf/food_ingredient_bun_bottom.gltf`), `cheese` (`gltf/food_ingredient_cheese.gltf`).
    - `stations.ts`: hỗ trợ 3D model lò nướng, hiệu ứng khói/hơi nước, thanh tiến trình nướng 12s / cháy 6s / dập lửa 2s.
    - `items.ts`: xếp bánh pizza lên đĩa `plate`, màu fallback cho dough, cheese, pizza.
    - `MapRenderer.ts` & `StationRenderer.ts`: hiển thị emoji `🔥\n🍕` và tiến trình trên minimap/2D view.

  - **Kiểm thử & Golden Hash (B11)**:
    - Unit test suite `packages/core/src/__tests__/pizza.test.ts`: 5/5 test xanh, kiểm tra toàn bộ vòng đời từ nhào bột, băm phô mai, ráp bánh, nướng bánh, lấy ra đĩa, phục vụ tại bàn, đến cháy khét và dập lửa.
    - Cập nhật golden hash `b11.test.ts`: bổ sung `"bep_lo_nuong": "3c34c04455997a792ac9dc47b0a19711ee9f43e90fe4cbbdf0f16ad0927f6012"`. Bảo toàn 100% hash của 8 map trước đó.
    - Toàn bộ repo: `pnpm -r typecheck` (0 lỗi), `pnpm test` (197 tests pass), `pnpm validate:levels` (thành công).

## Phase 0 — Chuẩn hóa Map Nền & Golden Hashes
- 2026-10-12: Thực hiện Phase 0 (theo `09_RSC_PLAN_V2_USER_TESTED.md` và `07_REVISED_PLAN_AND_AI_RULES.md`):
  - **Sửa map ASCII**:
    1. `level1`: Thay ô sàn cô lập tại (1, 1) bằng tường `#`, giữ nguyên 100% số lượng và vị trí mọi trạm, xóa sạch 96 cảnh báo unreachable.
    2. `level2`: Bổ sung 1 bồn rửa `W` tại (7, 1) và 2 bàn khách `Q` tại (12, 3) và (12, 7), đảm bảo toàn bộ đường đi thông thoáng tối thiểu 2 ô.
    3. `tutorial`: Xóa 1 quầy `X` ở tutorial (đổi thành `W` tại x=5, y=8 cạnh tủ đĩa `P`), lý do: map cần bồn rửa để rửa đĩa.
    4. `b08`: Khôi phục về commit gốc `31099c082a6877739bbe8a753a0d1dea638c7f75`. Giữ nguyên 100% vị trí các trạm và băng chuyền; dừng và báo cáo lý do cấu trúc phòng đôi cách ly không thể khử cảnh báo unreachable nếu không đổi trạm.
    5. `level3`, `bep_doi`, `nha_hang_mo`, `bep_lo_nuong`: Không có lỗi/cảnh báo, giữ nguyên 100%.
  - **Tách `test_carry`**:
    - Giữ nguyên file `test_carry.ts` và test `test_carry`.
    - Tạo `ALL_LEVELS` chứa đủ 9 map, `PLAYABLE_LEVELS` chứa 8 map chơi (loại `test_carry`).
    - `LEVELS = PLAYABLE_LEVELS` (để lobby người chơi không còn "Test", và `validate:levels` chỉ kiểm định map chơi).
    - `getLevel(id)` tra cứu trên `ALL_LEVELS` để không làm gãy các test cũ.
    - `b11.test.ts` kiểm thử snapshot trên `ALL_LEVELS` để bảo toàn kiểm thử hồi quy cho cả `test_carry`.
  - **Bảng Golden Hashes B11**:
    | Map | Hash cũ | Hash mới (Phase 0) | Trạng thái / Lý do |
    | :--- | :--- | :--- | :--- |
    | `tutorial` | `86f4ab754604a68ec92637ff70225d7c93fb903d43b110ffdb5451f9824e5b8e` | `3ec2b335ace792e9c46b2b3be78194c515e9a1f4530125a5dfbc46456c265903` | Cập nhật (xóa quầy X đổi thành W vì map cần bồn rửa để rửa đĩa) |
    | `level1` | `fdaa9b1782152904177e3d0dd777a8432e6d1c24e673424e7a0cb003765d64e7` | `77f2314b7db7d7c296d983b863863cb86619ff51e24ec5b113aa3f37dd4ad8aa` | Cập nhật (xóa ô sàn cô lập tại 1,1) |
    | `level2` | `a21307dcb7f68cdcd648e91a14c5e00fbbf974cdd6990538a170985f5f5b4f93` | `80224a22ac60ceab9788f532686f33c6ad3827fb3f6ced74a0cb094a883b88ef` | Cập nhật (thêm W và 2 bàn Q) |
    | `b08` | `17ca3daa275c4a4afe239082126afa4287ae7eb192d2937f5cc254058a07f71e` | `17ca3daa275c4a4afe239082126afa4287ae7eb192d2937f5cc254058a07f71e` | Khôi phục gốc commit 31099c (giữ nguyên 100% hash cũ) |
    | `level3` | `62da5b304a14f241a1e18bd09b4855baca6584e4086af290fc739f5c0019f21d` | `62da5b304a14f241a1e18bd09b4855baca6584e4086af290fc739f5c0019f21d` | Giữ nguyên tuyệt đối 100% |
    | `bep_doi` | `7a6c2ac82ae689824e0b94dba208a57c3336def63ae37e930d2e8b4a326ea26d` | `7a6c2ac82ae689824e0b94dba208a57c3336def63ae37e930d2e8b4a326ea26d` | Giữ nguyên tuyệt đối 100% |
    | `nha_hang_mo` | `065199e8cdc0edf92e502048c41f13848ff69a390204ab04caf231702663d095` | `065199e8cdc0edf92e502048c41f13848ff69a390204ab04caf231702663d095` | Giữ nguyên tuyệt đối 100% |
    | `bep_lo_nuong` | `3c34c04455997a792ac9dc47b0a19711ee9f43e90fe4cbbdf0f16ad0927f6012` | `3c34c04455997a792ac9dc47b0a19711ee9f43e90fe4cbbdf0f16ad0927f6012` | Giữ nguyên tuyệt đối 100% |
    | `test_carry` | `4fc5de590286b0cfb7ef0e3f30dfd02c1d67b6db84ac92a99ef78b2f0095c6d4` | `4fc5de590286b0cfb7ef0e3f30dfd02c1d67b6db84ac92a99ef78b2f0095c6d4` | Giữ nguyên tuyệt đối 100% |

## Phase 1 — Vòng Khách: Vào Bàn, Chờ Gọi Món, Giận, Rời Đi
- 2026-10-12: Thực hiện Phase 1 (theo `09_RSC_PLAN_V2_USER_TESTED.md` và `07_REVISED_PLAN_AND_AI_RULES.md`):
  - **Hằng số**: Thêm `CUSTOMER_ORDER_WAIT = 30` (giây) vào `constants.ts`.
  - **Trạng thái khách & bộ đếm**:
    - Khách vào bàn ở trạng thái `seated_waiting_order` với bộ đếm `waitLeft = 30` giây (`CUSTOMER_ORDER_WAIT`), `angry = false`.
    - Hết `waitLeft` mà chưa nhận order: khách chuyển sang `leaving`, phát sự kiện `customer_leave` với `reason: 'no_order_taken'`, trừ `ORDER_EXPIRE_PENALTY` (10 điểm), không tăng điểm, tính `expired++`, reset `streak = 0`, phát `streak_lost`.
    - Khi người chơi tương tác nhận order: `waitLeft` không còn dùng; đơn chuyển sang `order_taken` với thời gian kiên nhẫn `patience` theo công thức từng recipe (`ORDER_PATIENCE_BY_RECIPE`).
    - Cờ `angry`: Khi đơn đang chờ (`order_taken`) có `patience < maxPatience * 0.2` (dưới 20%), khách được bật `angry = true`. Client hiển thị icon 😠 trên bong bóng và khách nảy người.
    - Sau khi giận, đơn hết hạn (`patience <= 0`): khách chuyển sang `leaving` trong 0.6 giây trước khi biến mất, phát `customer_leave` với `reason: 'expired'`, trừ 10 điểm, `expired++`, `streak = 0`.
    - Phục vụ thành công: sau 5.0 giây ăn (`eating`), khách rời bàn, tạo đĩa bẩn tại bàn `Q`, phát `customer_leave` với `reason: 'served'` (không đổi).
  - **Giao thức & sự kiện**:
    - `CustomerState` có thêm `waitLeft?: number` và `angry?: boolean`, trạng thái hỗ trợ `'seated_waiting_order' | 'order_taken' | 'eating' | 'leaving'`.
    - Sự kiện `GameEvent` cho `customer_leave` có thêm `reason?: 'served' | 'expired' | 'no_order_taken'` và `customerId?: number`.
    - Cập nhật `docs/PROTOCOL.md`.
  - **Bảng Golden Hashes B11 (Phase 1)**:
    | Map | Hash cũ (Phase 0) | Hash mới (Phase 1) | Lý do |
    | :--- | :--- | :--- | :--- |
    | `b08` | `17ca3daa275c4a4afe239082126afa4287ae7eb192d2937f5cc254058a07f71e` | `3d673602eeca514626f0afc5a2c20ce08b858aee25380c864658081d6d03390f` | Có bàn Q/khách: State chứa `waitLeft: 30` và `angry: false` |
    | `bep_doi` | `7a6c2ac82ae689824e0b94dba208a57c3336def63ae37e930d2e8b4a326ea26d` | `26ee1a7d0494acbc23784610aee774e6f5842558674dce2cc9949051ea571ddb` | Có bàn Q/khách: State chứa `waitLeft: 30` và `angry: false` |
    | `bep_lo_nuong` | `3c34c04455997a792ac9dc47b0a19711ee9f43e90fe4cbbdf0f16ad0927f6012` | `5e118fd62555be465c14e1a8124b96dce5336f8738471563813b25e89e8b5c5b` | Có bàn Q/khách: State chứa `waitLeft: 30` và `angry: false` |
    | `level1` | `77f2314b7db7d7c296d983b863863cb86619ff51e24ec5b113aa3f37dd4ad8aa` | `5b0a5921927d4e899dbd6d5f6797e99c1331fc0b5c34bfad91805125f943a301` | Có bàn Q/khách: State chứa `waitLeft: 30` và `angry: false` |
    | `level2` | `80224a22ac60ceab9788f532686f33c6ad3827fb3f6ced74a0cb094a883b88ef` | `e884610ab611158e5adc2109b58bcb499a7f3794f3a2b3af430d47d5f012e8f6` | Có bàn Q/khách: State chứa `waitLeft: 30` và `angry: false` |
    | `level3` | `62da5b304a14f241a1e18bd09b4855baca6584e4086af290fc739f5c0019f21d` | `d0d76207f95491d08dd242ff778b671e0dcdf0c94df2329eefd3174ab5a0a4fd` | Có bàn Q/khách: State chứa `waitLeft: 30` và `angry: false` |
    | `nha_hang_mo` | `065199e8cdc0edf92e502048c41f13848ff69a390204ab04caf231702663d095` | `915b67845bb0bb46e03c15afd9efee67d3deb0631077ecb01c906c0bbb5d5349` | Có bàn Q/khách: State chứa `waitLeft: 30` và `angry: false` |
    | `test_carry` | `4fc5de590286b0cfb7ef0e3f30dfd02c1d67b6db84ac92a99ef78b2f0095c6d4` | `4fc5de590286b0cfb7ef0e3f30dfd02c1d67b6db84ac92a99ef78b2f0095c6d4` | **Giữ nguyên 100%**: không có bàn Q/khách |
    | `tutorial` | `3ec2b335ace792e9c46b2b3be78194c515e9a1f4530125a5dfbc46456c265903` | `1e9985a3c8686da9bd5787abc1407ef10d7241fd13c4b9b904bd2fd8984d813d` | Có bàn Q/khách: State chứa `waitLeft: 30` và `angry: false` |

## Phase 2 Bước A — Khắc Phục Ô Sàn Cô Lập Map Băng Chuyền (b08)
- 2026-10-12: Sửa map `b08` (`levelB08.ts`) theo tiêu chuẩn tối thiểu, không di dời bất kỳ trạm nào:
  - Thay ô sàn góc cô lập tại (1, 1) thành tường `#` (loại bỏ ô sàn bị bao vây bởi tường và thùng nguyên liệu T, L).
  - Bổ sung hành lang thông tại hàng 5 (`#..........#`), bảo toàn bao quanh bởi hàng tường 6 (`############`). Điều này cho phép thông suốt giữa khu vực bếp trái (Spawn 1), khu vực chuyển tiếp giữa và phòng ăn/rửa phải (Spawn 2, 3, 4), giải tỏa toàn bộ 25 cảnh báo `unreachable` mà không dịch chuyển bất kỳ trạm nào (`T, L, C, S, W, P, Q, D`, băng chuyền `>, v` giữ nguyên 100% tọa độ x, y).
  - Bảng đếm trạm trước/sau bằng script xác nhận số lượng trạm mọi loại giữ nguyên 100% (chênh lệch = 0).
  - `validateLevel` và `pnpm validate:levels`: 0 lỗi, 0 cảnh báo unreachable cho `b08`.
  - **Cập nhật Golden Hash B11**:
    | Map | Hash cũ (Phase 1) | Hash mới (Phase 2 Bước A) | Lý do |
    | :--- | :--- | :--- | :--- |
    | `b08` | `3d673602eeca514626f0afc5a2c20ce08b858aee25380c864658081d6d03390f` | `1ffddee03b8c7ec3ca9b84e5df0109190e9ac9c49bf78068c2a56434d8d97317` | Sửa ô sàn cô lập (1,1) thành `#` và thêm hàng hành lang 5 kết nối các phân vùng |
    | *Các map khác* | *Không đổi* | *Không đổi* | Bảo toàn 100% hash của 8 map còn lại |

## Phase 2 — Thêm 2 Map Mới (Tàu Hải Tặc & Trạm Vũ Trụ)
- 2026-10-12: Thêm 2 map mới theo yêu cầu Phase 2 trong `09_RSC_PLAN_V2_USER_TESTED.md`:
  - **Map 1: `tau_hai_tac` (Tàu Hải Tặc)**:
    - Kích thước: 15×9, theme `'ship'`, world 2.
    - Trạm & bố trí: 2 bàn khách `Q` (tại 13,1 và 7,7), 1 bồn rửa `W`, 1 tủ đĩa `P`, 1 bếp chảo `S`, 1 thớt `C`, 1 thùng rác `D`, các thùng nguyên liệu `T, L, B, M`.
    - Cơ chế: dải băng trơn `~` ở trung tâm (6 ô tại x=7..8, y=3..5), có hành lang sàn thường hai bên rộng >= 2 ô để đi vòng mà không bắt buộc phải trượt băng.
    - Món: `salad`, `burger`.
    - Spawns: 1–4 đặt trên sàn thường `.`.
    - `validateLevel`: 0 lỗi, 0 cảnh báo.
  - **Map 2: `tram_vu_tru` (Trạm Vũ Trụ)**:
    - Kích thước: 15×9, theme `'space'`, world 3.
    - Trạm & bố trí: 3 bàn khách `Q` (tại 13,1, 3,7 và 12,7), 1 bồn rửa `W`, 1 tủ đĩa `P`, 1 bếp chảo `S`, 1 thớt `C`, 1 thùng rác `D`, các thùng nguyên liệu `T, L, B, M`.
    - Cơ chế: băng chuyền 2 ô `>>` tại hàng 4 (x=6..7, y=4) đưa đồ tự động sang quầy kết thúc `X` tại (8, 4), hai đầu trạm hợp lệ, không hướng vào tường.
    - Món: `salad`, `burger`, `burger_tomato`.
    - Spawns: 1–4 đặt trên sàn thường `.`.
    - `validateLevel`: 0 lỗi, 0 cảnh báo.
  - **Bảo toàn 8 map cũ**:
    - Không sửa đổi bất kỳ map cũ nào trong Phase 2.
    - Thứ tự các map cũ trong `PLAYABLE_LEVELS` và `ALL_LEVELS` được giữ nguyên 100%.
  - **Cập nhật Golden Hashes B11**:
    | Map | Hash (Phase 2) | Trạng thái / Ghi chú |
    | :--- | :--- | :--- |
    | `b08` | `1ffddee03b8c7ec3ca9b84e5df0109190e9ac9c49bf78068c2a56434d8d97317` | **Không đổi** |
    | `bep_doi` | `26ee1a7d0494acbc23784610aee774e6f5842558674dce2cc9949051ea571ddb` | **Không đổi** |
    | `bep_lo_nuong` | `5e118fd62555be465c14e1a8124b96dce5336f8738471563813b25e89e8b5c5b` | **Không đổi** |
    | `level1` | `5b0a5921927d4e899dbd6d5f6797e99c1331fc0b5c34bfad91805125f943a301` | **Không đổi** |
    | `level2` | `e884610ab611158e5adc2109b58bcb499a7f3794f3a2b3af430d47d5f012e8f6` | **Không đổi** |
    | `level3` | `d0d76207f95491d08dd242ff778b671e0dcdf0c94df2329eefd3174ab5a0a4fd` | **Không đổi** |
    | `nha_hang_mo` | `915b67845bb0bb46e03c15afd9efee67d3deb0631077ecb01c906c0bbb5d5349` | **Không đổi** |
    | `test_carry` | `4fc5de590286b0cfb7ef0e3f30dfd02c1d67b6db84ac92a99ef78b2f0095c6d4` | **Không đổi** |
    | `tutorial` | `1e9985a3c8686da9bd5787abc1407ef10d7241fd13c4b9b904bd2fd8984d813d` | **Không đổi** |
    | `tau_hai_tac` | `7c7160e6e2d66261aa30562257d62a02216921ae8868a60305c7512a2482fdb9` | Thêm mới (Phase 2) |
    | `tram_vu_tru` | `7fe2f0298030dc9665914c572dd3af95d0ed5b5bbe40d0bd4523a66e86d8df03` | Thêm mới (Phase 2) |

## Phase 2b — Làm Lại Bố Cục tau_hai_tac và tram_vu_tru
- 2026-10-12: Thiết kế lại toàn bộ bố cục hai bản đồ `tau_hai_tac` và `tram_vu_tru` từ đầu, khắc phục vấn đề trùng lặp hàng trạm với `bep_lo_nuong`:
  - **Nguyên tắc thiết kế bắt buộc**:
    - Không sao chép bất kỳ hàng trạm nào từ bất kỳ level hiện có.
    - Kích thước hoàn toàn độc nhất:
      - `tau_hai_tac`: kích thước **20×9** (duy nhất, không trùng các map 20×10, 14×9, 16×11, 12×6, 8×4, 16×10, 15×9).
      - `tram_vu_tru`: kích thước **16×12** (duy nhất, không trùng các map khác).
  - **Bố cục Map 1 — `tau_hai_tac` (Theme ship, kích thước 20×9)**:
    - Thân tàu dài nằm ngang. Một dải băng trơn `~` rộng đúng 3 hàng (hàng 3, 4, 5) chạy suốt chiều ngang ở giữa bản đồ từ cột 1 đến cột 18 (18 ô mỗi hàng, tổng 54 ô băng). Hai đầu dải (cột 0 và 19) là tường tàu `#`.
    - Người chơi buộc phải trượt qua dải băng này để di chuyển giữa nửa trên và nửa dưới; không có đường vòng bằng sàn thường qua dải băng.
    - Đặt trạm: Hàng 1 bố trí cụm quầy `X` và thùng nguyên liệu (`T, L, B, M`). Hàng 7 bố trí bếp chảo `S`, bếp nồi `s`, bồn rửa `W`, tủ đĩa `P`. Thớt `C` và thùng rác `D` đặt ở hai đầu dải băng (hàng 2).
    - 2 bàn khách `Q` đặt ở hai góc dưới: (1, 7) và (18, 7).
    - 4 vị trí spawn đặt trên sàn thường: 2 người ở nửa trên (hàng 2), 2 người ở nửa dưới (hàng 6).
    - Món ăn: `salad`, `burger`.
  - **Bố cục Map 2 — `tram_vu_tru` (Theme space, kích thước 16×12)**:
    - Đảo trung tâm quầy `X` kích thước 4×4 tại các cột 6..9, hàng 4..7.
    - Vòng băng chuyền hình chữ U mở ở phía dưới bao gồm 11 ô conveyor (`v` đi xuống dọc cột 11, `>` đi ngang mép dưới tại hàng 9, `^` đi lên bàn khách `Q` tại cột 13 hàng 8). Băng chuyền chuyển động liên tục, không có ô nào đâm vào tường.
    - Đặt trạm: Thùng nguyên liệu `T, L, B, M` ở mép trái (cột 1). Bếp chảo `S` và thớt `C` ở mép trên (hàng 1). Bồn rửa `W`, tủ đĩa `P`, thùng rác `D` ở mép phải (cột 14).
    - 3 bàn khách `Q` đặt quanh mép dưới: (3, 10), (8, 10), và bàn kết thúc băng chuyền tại (13, 8).
    - 4 vị trí spawn quanh đảo trung tâm trên sàn thường.
    - Món ăn: `salad`, `burger`, `burger_tomato`.
  - **Theme & Palette Kiểm Thử**:
    - `ship`: Sàn ván gỗ (warm wood tone `#8b5a2b` / `0x8b5a2b`), vách gỗ, môi trường biển nước bao quanh.
    - `space`: Sàn kim loại tối (dark metallic `#1e222a` / `0x1e222a`), vách kim loại, bầu trời vũ trụ với trường sao (stars).
    - `diner`: Sàn gạch caro tương phản ấm (`#c8bca8` / `0xc8bca8`).
    - Kiểm thử tự động `themes.test.ts`: khoảng cách màu Euclidean RGB giữa các theme đều vượt ngưỡng 50 (thực tế: ship vs diner: 84.7, space vs diner: 153.9, ship vs space: 157.9).
  - **Cập nhật Golden Hashes B11 (Phase 2b)**:
    - 8 map cũ được bảo toàn 100% hash, không thay đổi bất kỳ ký tự nào.
    - Bảng Golden Hashes B11:
      | Map | Golden Hash (SHA-256) | Trạng thái Phase 2b |
      | :--- | :--- | :--- |
      | `tutorial` | `1e9985a3c8686da9bd5787abc1407ef10d7241fd13c4b9b904bd2fd8984d813d` | Giữ nguyên 100% |
      | `level1` | `5b0a5921927d4e899dbd6d5f6797e99c1331fc0b5c34bfad91805125f943a301` | Giữ nguyên 100% |
      | `level2` | `e884610ab611158e5adc2109b58bcb499a7f3794f3a2b3af430d47d5f012e8f6` | Giữ nguyên 100% |
      | `level3` | `d0d76207f95491d08dd242ff778b671e0dcdf0c94df2329eefd3174ab5a0a4fd` | Giữ nguyên 100% |
      | `b08` | `1ffddee03b8c7ec3ca9b84e5df0109190e9ac9c49bf78068c2a56434d8d97317` | Giữ nguyên 100% |
      | `bep_doi` | `26ee1a7d0494acbc23784610aee774e6f5842558674dce2cc9949051ea571ddb` | Giữ nguyên 100% |
      | `nha_hang_mo` | `915b67845bb0bb46e03c15afd9efee67d3deb0631077ecb01c906c0bbb5d5349` | Giữ nguyên 100% |
      | `bep_lo_nuong` | `5e118fd62555be465c14e1a8124b96dce5336f8738471563813b25e89e8b5c5b` | Giữ nguyên 100% |
      | `test_carry` | `4fc5de590286b0cfb7ef0e3f30dfd02c1d67b6db84ac92a99ef78b2f0095c6d4` | Giữ nguyên 100% |
      | `tau_hai_tac` | `fc1809d30335f7efacf4b28f9d1b5044292bd2d31d13ccfd34484e25551e288f` | **Cập nhật Phase 2b (Bố cục 20×9 mới)** |
      | `tram_vu_tru` | `2d1e43d0103aad94179e2349486a0825ae05228301b1743a9253ac177c29db1d` | **Cập nhật Phase 2b (Bố cục 16×12 mới)** |

## PHASE 3 — THUMBNAIL & CÔNG THỨC MÓN ĂN
- 2026-10-12: Chuẩn hóa toàn bộ tên tiếng Anh cho 7 công thức trong `packages/core/src/recipes.ts`:
  - `burger_tomato.name`: `'Tomato Burger'` (chuẩn hóa tên tiếng Anh không rỗng, nhất quán với `Salad`, `Burger`, `Tomato Soup`, `Onion Soup`, `Mushroom Soup`, `Pizza`).
  - Không sửa bất kỳ file nào trong `packages/core/src/levels/`, giữ nguyên 100% Golden Hash SHA-256 của toàn bộ 11 maps.
- 2026-10-12: Bổ sung định nghĩa `pizza` vào `RECIPE_ITEM_DEFS` trong `apps/client/src/ui/thumbsView.ts`.
- 2026-10-12: Thêm lệnh `"thumbs": "tsx scripts/thumbs.ts"` vào `package.json`. Chạy kết xuất tự động toàn bộ 7 file thumbnail 3D trong `apps/client/public/thumbs/recipes/` và `docs/screens/t1/thumbs/`.

## PHASE 4 — MENU 3D, CÀI ĐẶT, NHẠC MENU & MAX_PLAYERS
- 2026-10-12: Triển khai kiểm tra `maxPlayers` chỉ khi bắt đầu ván (start) theo R0.6:
  - Thêm thuộc tính tùy chọn `maxPlayers?: number;` vào kiểu dữ liệu `LevelDef` trong `packages/core/src/types.ts`. Giữ nguyên 100% không đụng đến các file map trong `levels/`.
  - Mặc định nếu map không khai báo `maxPlayers`, giá trị mặc định là `MAX_PLAYERS = 4`.
  - Tại `KitchenRoom.ts` (server): Khi nhận `MSG.START`, kiểm tra số người chơi hiện tại `count = this.members.length` (kể cả solo). Nếu `count > effectiveMaxPlayers`, server từ chối vào ván và gửi error `code: 'too_many_players'` kèm thông điệp `"This map allows up to N players"`.
  - Tại `apps/client/src/net/errors.ts`: Xử lý mã lỗi `too_many_players` chuyển thành thông báo toast tiếng Anh: `"This map allows up to N players"`.
- 2026-10-12: Menu 3D & WebGLRenderer:
  - MenuRenderer và ThreeRenderer dùng chung singleton `SharedWebGLRenderer` (`getSharedWebGLRenderer()`), tuyệt đối không tạo thêm `new THREE.WebGLRenderer()` khi ra/vào menu.
  - Khi rời menu, `MenuRenderer.dispose()` dừng vòng lặp render, hủy bỏ toàn bộ geometry, material của cảnh và model đầu bếp, xóa DOM overlay và sự kiện, nhưng bảo toàn renderer chia sẻ nguyên vẹn.
  - Cảnh Three.js gồm: sàn bếp diner, bàn/quầy bếp (`station_counter`), bếp nấu (`station_stove`), ánh sáng diner (directional light ấm `0xffe2b8` và ambient light `0xfff0dd`).
  - Hai đầu bếp đứng cạnh nhau lấy màu từ `PLAYER_COLORS[0]` (đỏ) và `PLAYER_COLORS[1]` (xanh dương), chạy animation `idle`, nhấp nhô nhẹ theo trục Y ($y = \sin(t \cdot 2) \cdot 1.5$) và xoay nhẹ quanh trục Y ($\theta = \sin(t \cdot 0.8) \cdot 0.25$, vận tốc góc tối đa $\approx 0.20 \text{ rad/s} \le 0.4 \text{ rad/s}$).
  - Giao diện DOM menu được căn chỉnh sao cho không che khuất quá 30% chiều cao của đầu bếp 3D.
- 2026-10-12: Panel Cài đặt:
  - Nút "Cài đặt" trên menu mở modal DOM trực tiếp trên trang mà không chuyển màn hình router (`state.screen` vẫn là `'menu'`).
  - Hỗ trợ các mục:
    - Chất lượng: Thấp (low), Trung bình (medium), Cao (high). Khi thay đổi, cập nhật ngay renderer đang chạy (`setQuality()`).
    - Nhạc nền: Bật/tắt và thanh trượt âm lượng 0–100.
    - Hiệu ứng âm thanh (SFX): Thanh trượt âm lượng 0–100.
    - Hiện FPS: Bật/tắt.
    - Nút Đóng modal.
  - Lưu và đồng bộ qua `updateSettings()` với khóa `'ck_settings_v2'`. Khi dữ liệu trong `localStorage` bị sai lệch/hỏng, hàm tự động fallback về cấu hình mặc định an toàn mà không gây crash/lỗi.
- 2026-10-12: Nhạc Menu WebAudio:
  - Sử dụng WebAudio API trong `Sfx.ts` với các bộ dao động (sine/triangle) tổng hợp giai điệu diner ấm áp.
  - Nhạc bật/tắt theo `settings.music`. Khi `settings.music === 0`, nhạc dừng ngay lập tức và không phát bất kỳ nốt nào.
  - Khi người chơi bắt đầu vào ván (`screen === 'game'`), nhạc menu lập tức dừng lại.

## Thay Đổi Theo Yêu Cầu Người Dùng (Ngoài Kế Hoạch 09)
- **2026-10-12: Thu gọn giao diện menu/lobby chiến dịch (`campaign.css`, `lobby.ts`)**:
  - *Lý do*: Theo yêu cầu trực tiếp từ người dùng: *"sau khi sửa thì menu bị dài đến mất cả nút bắt chỉnh sửa lại cho phù hợp, có thể là do việc thêm map khiến bị dài, chỉnh lại ngắn và nhỏ vừa thôi"*. Việc thêm nhiều bản đồ vào chiến dịch làm container level list nở dài theo chiều dọc vượt quá chiều cao màn hình, khiến nút "Bắt đầu" bị đẩy mất hoặc phải cuộn khó bấm.
  - *Thay đổi*: Giảm kích thước level card, thu gọn padding, font-size và đặt `max-height: 48vh; overflow-y: auto;` cho danh sách màn chơi trong `campaign.css`, đồng thời tinh chỉnh layout thẻ chọn màn trong `lobby.ts` để hiển thị gọn gàng, đảm bảo nút Bắt đầu luôn nhìn thấy và thao tác được trên mọi độ phân giải.
- **2026-10-12: Animation khách giận bằng model 3D (`ThreeRenderer.ts`, `chefAnimManifest.ts`)**:
  - *Lý do*: Theo yêu cầu trực tiếp từ người dùng: *"tôi vừa tải animation raw-assets/character-animation/Sitting Angry.fbx thay vì cho nhân vật nảy người thì hãy cho nhân vật thực hiện animation"*.
  - *Thay đổi*: Bổ sung clip animation `sitting_angry` vào `chefAnimManifest.ts` (trích xuất từ `raw-assets/character-animation/Sitting Angry.fbx`). Trong `ThreeRenderer.ts`, thay thế cơ chế giả lập nảy người bằng code toán học (`Math.sin` vị trí trục Y) bằng việc chuyển animation sang clip `sitting_angry` khi khách có `customer.angry === true` và đang ngồi tại bàn.

## LÀM LẠI LOBBY VÀ HỆ THỐNG TÙY BIẾN NHÂN VẬT (COSMETIC)
- 2026-10-12: Bố cục Lobby 3 vùng chuẩn hóa:
  - **Vùng TRÁI (Tùy biến)**:
    - Tiêu đề "Bạn". Khung xem trước lớn ở giữa render mô hình 3D đầu bếp.
    - Hai nút mũi tên trái/phải (`‹` / `›`) duyệt vòng tròn 24 mẫu ngoại hình (4 màu × 3 mũ × 2 kiểu).
    - Hàng 4 nút chọn màu tròn (Đỏ, Xanh dương, Xanh lá, Vàng), ô đang chọn có viền nổi.
    - Hàng 3 nút chọn mũ (Mũ cao, Mũ bẹt, Không mũ).
    - Hàng 2 nút chọn kiểu (Người, Mèo).
    - Nút "Random" bên dưới khung xem trước để xáo trộn ngẫu nhiên màu, mũ, kiểu.
  - **Vùng GIỮA-DƯỚI (Slot)**:
    - Header phòng gồm tên phòng, badge mã phòng, nút sao chép mã và link mời.
    - 4 khung slot nằm ngang: avatar nhỏ hiển thị đúng màu + mũ + kiểu của từng người, tên người chơi, dấu vương miện nếu là host (`👑 host`), dấu sẵn sàng (`✔ Sẵn sàng` / `⏳ Chưa sẵn sàng`). Slot trống hiển thị avatar silhouette mờ và chữ "Đang chờ". Slot của bạn có badge "Bạn".
    - Mọi dữ liệu người chơi (tên, thông tin) được gán tuyệt đối bằng `textContent`, không dùng `innerHTML`.
    - Dưới slot: nút Sẵn sàng/Hủy, nút Rời phòng, checkbox "Chơi 1 mình (2 đầu bếp)" (chỉ hiện cho host khi phòng có 1 người), ping chỉ số mạng.
  - **Vùng PHẢI (Map)**:
    - Tiêu đề "Chọn màn". Danh sách cuộn nhóm theo 3 Thế giới:
      - THẾ GIỚI 1 - NHÀ HÀNG CỔ ĐIỂN
      - THẾ GIỚI 2 - HẢI TẶC
      - THẾ GIỚI 3 - TRẠM VŨ TRỤ
    - Mỗi map là thẻ gồm: khối màu icon đại diện theo thế giới, tên map, độ khó (`Introduction`, `Easy`, `Medium`, `Hard`), số sao đạt được (từ `progress`).
    - Thiếu file ảnh `thumbs/levels/<id>.png` tự động fallback sang icon khối màu theo world + text; bật cờ `?debug=1` sẽ in cảnh báo console `MISSING MAP THUMB: <id>` và nhãn đỏ trên thẻ.
    - Dưới cùng: ô "Map đã chọn" (ảnh + tên + độ khó) và nút "BẮT ĐẦU" (START) màu cam nổi bật.
    - Chỉ host mới được chọn map và bấm START. START bị disabled khi còn người chơi chưa sẵn sàng, hiển thị thông điệp tiếng Anh rõ ràng ("Waiting for all players to get ready", "Only host can start the game", "This map allows up to N players").

- 2026-10-12: Khung xem trước nhân vật 3D (`LobbyPreviewRenderer.ts`):
  - Tái sử dụng WebGLRenderer đơn nhất qua `getSharedWebGLRenderer()`, tuyệt đối không tạo thêm `new THREE.WebGLRenderer()`.
  - PerspectiveCamera và Scene riêng biệt cho khung xem trước.
  - Tự động gắn mô hình đầu bếp procedural / asset `chef`, áp màu `PLAYER_COLORS[color]`, tạo procedural mũ cao (toque) / mũ bẹt (beret) và tai/đuôi mèo khi chọn loài mèo.
  - Đầu bếp xoay chậm quanh trục Y với vận tốc góc $\omega \approx 0.35 \text{ rad/s} \le 0.4 \text{ rad/s}$.
  - Khi rời lobby: dispose sạch sẽ mọi geometry, material, mesh, light và hủy requestAnimationFrame; chia sẻ renderer không bị dispose hay rò rỉ. Đảm bảo 20 lần ra/vào lobby không tăng số WebGLRenderer.

- 2026-10-12: Hệ thống Tùy biến (Cosmetics) & Giao thức Mạng:
  - Cấu trúc dữ liệu: `{ color: 0..3, hat: 0..2, species: 0..1 }`, lưu cục bộ tại `localStorage['ck_cosmetic']`. Bất kỳ giá trị lạ/sai kiểu đều tự động fallback về mặc định `{ color: 0, hat: 0, species: 0 }`.
  - Khởi tạo phòng hoặc tham gia phòng gửi `options.cosmetic`.
  - Server thực hiện sanitize `sanitizeCosmetic()`, giá trị ngoài phạm vi được đưa về mặc định an toàn, không kick hay từ chối người chơi.
  - Thêm thông điệp giao thức `MSG.SET_COSMETIC = 'set_cosmetic'` (tài liệu hóa trong `docs/PROTOCOL.md`) cho phép cập nhật cosmetic tức thời trong lúc ở lobby.
  - Xử lý trùng màu: Nếu 2 người chơi chọn cùng màu, server tự động giữ màu cho người vào trước và cấp màu trống tiếp theo cho người vào sau, broadcast màu thực tế cho client hiển thị.
  - **Tình trạng đồng bộ vào ván chơi**: **CHƯA NỐI**. Hiện tại ThreeRenderer trong ván chơi chỉ hiển thị màu trang phục của đầu bếp và chưa có code nạp mô hình mũ procedural hay tai/đuôi mèo vào mesh nhân vật trong ván. Ghi nhận trung thực CHƯA NỐI theo yêu cầu R0.1.

- 2026-10-12: Bảng phân loại Level Metadata (`apps/client/src/game/levelMeta.ts`):
  | Map ID | Tên hiển thị | Thế giới | Độ khó | Ghi chú |
  |---|---|---|---|---|
  | `tutorial` | Hướng dẫn | 1 | Introduction | Giới thiệu thao tác cơ bản |
  | `level1` | Bếp 1 | 1 | Easy | Map khởi đầu kinh điển |
  | `level2` | Bếp 2 | 1 | Easy | Phục vụ bàn khách |
  | `b08` | Băng Chuyền | 1 | Easy | Cơ chế băng chuyền cơ bản |
  | `bep_doi` | Bếp Đôi | 1 | Easy | Chia 2 khu vực đối xứng |
  | `level3` | Bếp 3 | 1 | Medium | Không gian bếp nâng cao |
  | `nha_hang_mo` | Nhà Hàng Mở | 1 | Medium | Không gian mở nhiều hướng di chuyển |
  | `bep_lo_nuong` | Bếp Lò Nướng | 1 | Medium | Cơ chế nướng pizza và lò nướng U |
  | `tau_hai_tac` | Tàu Hải Tặc | 2 | Hard | Sàn băng trượt giữa thân tàu dài |
  | `tram_vu_tru` | Trạm Vũ Trụ | 3 | Hard | Hệ thống băng chuyền hai vòng khép kín |
  *(Lưu ý: Map kỹ thuật `test_carry` không nằm trong danh sách map chơi).*

## TÁI CẤU TRÚC LAYOUT VÀ HIỂN THỊ LOBBY (1366×768 & 1920×1080)
- **2026-10-12: Bố cục 3 cột toàn màn hình (`lobby.css`, `lobby.ts`)**:
  - *Mục tiêu*: Lobby hiển thị gọn trong khung nhìn màn hình (100vh, `overflow: hidden`), không có thanh cuộn ngang, không bị cắt nội dung ở cả 1366×768 và 1920×1080.
  - *Grid layout*: `grid-template-columns: 22% 1fr 28%`, `grid-template-rows: 56px 1fr`, `gap: 12px`, `padding: 12px`.
  - *Header*: Chiều cao cố định 56px, chứa tên phòng "Phòng <MÃ>", badge mã, cùng các nút thao tác sao chép mã và link góc phải.
  - *Cột Trái ("BẠN")*:
    - Tiêu đề "BẠN" căn giữa, chữ vàng hổ phách in hoa.
    - Khung xem trước tỉ lệ 1:1, nền tối gradient nhẹ, bo góc 12px, có 2 nút mũi tên tròn 36px hai bên căn giữa theo trục dọc.
    - Nút "Ngẫu nhiên" full-width 44px màu tím dưới khung xem trước.
    - Mục "MÀU SẮC": 4 ô tròn 36px cạnh nhau, ô được chọn có viền trắng 3px và chấm tròn ở giữa.
    - Mục "MŨ BẾP": 3 nút ngang (Mũ cao, Mũ bẹt, Không mũ). Nút đang chọn nền xanh dương chữ trắng; nút khác nền tối chữ xám sáng.
    - Mục "KIỂU NHÂN VẬT": 2 nút ngang (Người, Mèo).
    - Tất cả nhãn danh mục là chữ nhỏ in hoa màu xám sáng (`#94a3b8`), đảm bảo độ tương phản cao, không có chữ trắng trên nền sáng.
  - *Khu Vực Giữa (Phòng & 4 Slot ngang)*:
    - Tiêu đề "ĐẦU BẾP TRONG PHÒNG (TỐI ĐA 4)".
    - Bắt buộc 4 slot xếp ngang trên cùng 1 hàng: mỗi slot chiếm 25% chiều rộng (`flex: 1` hoặc `grid-template-columns: repeat(4, 1fr)`), chiều cao ~220px. Slot của người chơi địa phương luôn xếp đầu tiên và có badge "BẠN" ở góc trái trên, "host" ở góc phải trên nếu là chủ phòng.
    - Slot người chơi: avatar 2D tròn đồng bộ màu/mũ/loài, tên người chơi (gán bằng `textContent`), badge trạng thái "Sẵn sàng" (xanh lá) / "Chưa sẵn sàng" (cam).
    - Slot trống: viền nét đứt, avatar silhouette xám mờ, nhãn "Đang chờ".
    - Dưới slot: hàng nút "Sẵn sàng" / "Hủy sẵn sàng" (xanh lá) và "Rời phòng" (cam) cùng hàng, chiều cao 44px.
    - Checkbox "Chơi 1 mình (2 đầu bếp)": chỉ hiện cho host khi phòng có 1 người, nằm dưới hàng nút với chữ sáng tương phản cao.
    - Chỉ số ping đặt tại góc dưới bên trái.
  - *Cột Phải ("CHỌN MÀN")*:
    - Tiêu đề "CHỌN MÀN" căn giữa, màu xanh dương 20px in hoa.
    - Nhóm các thế giới với tiêu đề màu vàng nhạt ("THẾ GIỚI 1 - NHÀ HÀNG CỔ ĐIỂN", "THẾ GIỚI 2 - TÀU HẢI TẶC", "THẾ GIỚI 3 - TRẠM VŨ TRỤ").
    - Danh sách thẻ map bố trí lưới 2 cột, mỗi thẻ cao ~120px, nền tối `#1e2a3a`, viền 1px xám, bo 10px. Không dùng nền trắng cho thẻ; độ tương phản chữ với nền $\ge 4.5:1$.
    - Danh sách cuộn độc lập (`overflow-y: auto`), không làm tràn màn hình.
    - Dưới cùng: khung "Màn đã chọn" (ảnh 40×40, tên, thế giới, độ khó) và nút "BẮT ĐẦU" (cao 56px, nền cam rực rỡ, chữ in hoa). Nút disabled khi có người chơi chưa sẵn sàng, tooltip tiếng Anh `"Waiting for players to be ready"`. Khách không tương tác được với danh sách thẻ map.

- **2026-10-12: Khắc phục triệt để lỗi khung xem trước 3D hiện nền xám (`LobbyPreviewRenderer.ts`, `main.ts`)**:
  - *Nguyên nhân phát hiện qua kiểm kê*:
    1. `main.ts` trước đây chạy `syncMenuScene` khi `screen === 'menu' || screen === 'lobby'`, khiến vòng lặp render của `MenuRenderer` (vẽ nền diner phòng ăn mờ) chạy song song và ghi đè lên renderer WebGL dùng chung mỗi khung hình, làm mất cảnh vẽ của lobby.
    2. Camera của `LobbyPreviewRenderer` trước đây đặt ở $(Z=44, Y=16)$ nhìn $(Y=13)$, trong khi mô hình đầu bếp qua `ModelNormalizer` có chiều cao chuẩn $2.2 \times \text{TILE\_PX} \approx 70.4$ đơn vị (từ $y=1.2$ đến $72$), khiến phần lớn cơ thể nhân vật nằm ngoài view frustum của camera.
    3. Canvas khởi tạo trước khi layout trình duyệt hoàn tất reflow nên có kích thước $0 \times 0$.
    4. Trễ khi tải mô hình FBX khiến canvas trống trong lúc chờ asset.
  - *Giải pháp*:
    1. Tách biệt `MenuRenderer`: Trong `main.ts`, chỉ chạy `syncMenuScene` khi `state.screen === 'menu'`. Khi chuyển sang `'lobby'`, giải phóng sạch sẽ `menuRenderer.dispose()` để trả lại renderer dùng chung hoàn toàn cho `LobbyPreviewRenderer`.
    2. Căn chỉnh vị trí camera: Đặt camera tại $(0, 36, 175)$ hướng nhìn $(0, 36, 0)$ với FOV 32°. Ở khoảng cách này, nhân vật cao ~70.4 đơn vị chiếm chính xác ~70% chiều cao khung nhìn của viewport.
    3. Tích hợp `ResizeObserver` theo dõi kích thước container khung xem trước để cập nhật viewport canvas và aspect ratio camera ngay khi bố cục thay đổi.
    4. Khởi tạo ngay mô hình đầu bếp hình học 3D procedural (thân, đầu, mắt, mũi, mũ) ngay khi tạo renderer, sau đó nâng cấp mượt mà sang mô hình FBX khi hoàn tất tải asset, đảm bảo canvas luôn có nhân vật hiển thị ngay lập tức.
    5. Đèn chiếu: Sử dụng ambient light (0.85) và directional light (0.95) đặt lệch góc tạo bóng khối tự nhiên cho nhân vật.
    6. Dọn dẹp hoàn toàn tài nguyên (geometry, material, mesh, lighting, event listener) khi unmount lobby, bảo toàn renderer dùng chung không rò rỉ bộ nhớ.

## XÁC NHẬN VÀ SỬA LỖI TỒN ĐỌNG (BƯỚC 1 - PHASE 6)
- **Xác nhận lịch sử Golden Hash `b08`**:
  - `git log --oneline -- packages/core/src/levels/levelB08.ts` chỉ có commit gốc `31099c0`.
  - Thay đổi trong `levelB08.ts` chỉ gồm 2 điểm: bổ sung hàng sàn `#..........#` trong Phase 0 (khớp kích thước 12×7 và sửa ô không tới được) và chuyển ô sàn cô lập `#.T.>..XW..#` thành tường `##T.>..XW..#` trong Phase 2A.
  - Xác nhận: Thay đổi chỉ do Phase 0 và Phase 2A. Golden hash mới của `b08` đã được kiểm định đầy đủ trong `b11.test.ts`.
- **Tên món `burger_tomato`**:
  - Giữ nguyên tên hiển thị tiếng Anh hiện tại là `'Tomato Burger'` trong `recipes.ts`.
  - Trạng thái: **CHỜ NGƯỜI DÙNG CHỌN** (không tự ý đổi sang tên khác).
- **Tiêu chí "mỗi món xuất hiện ở ít nhất 2 map"**:
  - Trạng thái: **HOÃN** (Do tuân thủ nghiêm ngặt ràng buộc không chỉnh sửa `packages/core/src/levels/` để bảo vệ map ASCII và golden hash, việc phân bổ lại món sẽ thực hiện khi thiết kế map ở phase phù hợp).
  - Hai món `onion_soup` và `mushroom_soup` được ghi rõ: "chỉ kiểm tra công thức" (kiểm tra `RECIPES`, thành phần, điểm số và logic ghép đĩa `matchRecipe`).
- **Thông báo lỗi `too_many_players` trong `errors.ts`**:
  - Đã loại bỏ số 2 cứng trong fallback: fallback mặc định là `"This map has a player limit."`.
  - Khi server trả về `message` chứa giới hạn người chơi (ví dụ `"This map allows up to N players"`), client hiển thị nguyên văn thông điệp đó.

## THIẾT KẾ LẠI MAP: TUTORIAL (HỌC VIỆC) VÀ LEVEL1 (BẾP NHỎ)
- **2026-10-12: Thiết kế lại bố cục Tutorial (14×8) và Level 1 (16×9)**:
  - *Tutorial (Học Việc, 14×8)*:
    - Bố cục nhỏ gọn, khép kín, viền tường `#` bao quanh.
    - Trạm: 1 thớt `C`, 1 bồn rửa `W`, 1 bàn khách `Q` đặt sát `W` (khoảng cách 1 ô, thời gian đi bộ 0.38s < 10s), 1 máy cấp đĩa `P`, 1 thùng rác `D`, các quầy sơ chế `X`, 2 thùng nguyên liệu salad (`T` cà chua, `L` xà lách).
    - 2 điểm xuất phát `1` và `2`. Toàn bộ trạm và bàn `Q` tiếp cận được từ mọi spawn.
    - Chỉ phục vụ 1 công thức `salad`. Không chứa trạm nấu hay nguyên liệu thừa (`B, M, S = 0`).
  - *Level 1 (Bếp Nhỏ, 16×9)*:
    - Bố cục nhà hàng cơ bản khép kín, hành lang di chuyển dạng vòng 2 ô thông thoáng.
    - Trạm: 1 bếp chảo `S`, 1 bồn rửa `W`, 4 bàn khách `Q` đặt gần `W` (khoảng cách tối đa 5 ô, thời gian đi bộ 1.92s < 10s), 2 thớt `C`, 1 bình chữa cháy `E`, 1 máy cấp đĩa `P`, 1 thùng rác `D`, quầy counter `X`, 4 thùng nguyên liệu (`T, L, B, M`).
    - 4 điểm xuất phát `1, 2, 3, 4`. Toàn bộ trạm và 4 bàn `Q` tiếp cận được từ mọi spawn.
    - Phục vụ 2 công thức: `salad` và `burger`.
  - *Độ khác biệt hai bản đồ*: Tỉ lệ trùng khớp ký tự cùng tọa độ giữa `tutorial` và `level1` là `51 / 112 = 0.4554 < 0.5`.
  - *Danh sách map chơi*: Loại bỏ `level2`, `level3`, `levelB08` khỏi `PLAYABLE_LEVELS` (vẫn lưu trữ trong `ALL_LEVELS`). Cập nhật `apps/client/src/game/levelMeta.ts` cho lobby hiển thị `tutorial` (Introduction, 'Hướng dẫn') và `level1` (Easy, 'Bếp Nhỏ').
  - *Cập nhật Golden Hashes (`b11.test.ts`)*:
    | Map | Hash cũ | Hash mới | Lý do |
    |---|---|---|---|
    | `tutorial` | `1e9985a3c8686da9bd5787abc1407ef10d7241fd13c4b9b904bd2fd8984d813d` | `540c157da40d428ec2684cb3492aebca429f3e0975f7fda09e1591df354d4664` | Redesign map 14×8 Học Việc theo đặc tả |
    | `level1` | `5b0a5921927d4e899dbd6d5f6797e99c1331fc0b5c34bfad91805125f943a301` | `6e48418e18218f864347d5353d10060aa7f55e254702106683629dd4b208a2c0` | Redesign map 16×9 Bếp Nhỏ theo đặc tả |
    - Golden hashes của tất cả các map khác (`b08`, `bep_doi`, `bep_lo_nuong`, `level2`, `level3`, `nha_hang_mo`, `tau_hai_tac`, `test_carry`, `tram_vu_tru`) bảo toàn 100% không đổi.

## THIẾT KẾ LẠI MAP: BẾP ĐÔI (BEP_DOI)
- **2026-10-12: Thiết kế lại bố cục Bếp Đôi (16×10, theme diner)**:
  - *Ý tưởng thiết kế*:
    - Bếp đôi chia làm 2 nửa độc lập bằng quầy counter `X` ở cột 8, có đúng 2 khe chuyền đồ 1 ô tại tọa độ (8, 2) và (8, 6).
    - Nửa trái (sơ chế): 2 thớt `C` tại (2, 1) và (3, 1), 4 thùng nguyên liệu `T, L, B, M` dọc cột 1, thùng rác `D` tại (1, 7). Đảo sơ chế `X` tại các cột 4..5.
    - Nửa phải (nấu và ra món): bếp chảo `S` tại (10, 1), nồi súp `s` tại (11, 1), tủ đĩa `P` tại (12, 1), bồn rửa `W` tại (14, 3), 3 bàn khách `Q` tại (14, 4..6). Đảo quầy `X` tại cột 11.
    - Điểm xuất phát: Spawn 1 tại nửa trái (3, 2), Spawn 2 tại nửa phải (10, 6). Cả 2 spawn đều trên ô sàn `.`.
    - Khoảng cách từ bàn khách `Q` tới bồn rửa `W`: 1, 2, 3 ô (tất cả đều ≤ 4 ô đi bộ).
    - Toàn bộ hành lang và lối đi chính rộng tối thiểu 2 ô. Không có bất kỳ khe 1 ô nào ngoài 2 khe chuyền đồ.
    - Công thức phục vụ: Salad, Burger, Tomato Soup. Thời gian: 180s, Đĩa: 4, Sao: [60, 140, 220].
  - *Độ khác biệt so với Bếp Nhỏ (`level1`)*:
    - Tỉ lệ trùng khớp ký tự cùng tọa độ giữa `bep_doi` và `level1`: `71 / 144 = 0.4931 < 0.5`.
  - *Cập nhật Golden Hash (`b11.test.ts`)*:
    | Map | Hash cũ | Hash mới | Lý do |
    |---|---|---|---|
    | `bep_doi` | `26ee1a7d0494acbc23784610aee774e6f5842558674dce2cc9949051ea571ddb` | `5227eddc7b8fbc052f4d52078fb79502a772c9a9db435a665333aa817ab5d400` | Redesign map 16×10 Bếp Đôi theo đặc tả |
    - Tất cả 10 golden hashes của các map khác giữ nguyên 100%.

## THIẾT KẾ LẠI MAP: NHÀ HÀNG MỞ (NHA_HANG_MO - M3)
- **2026-10-13: Khắc phục usability Nhà Hàng Mở (18×10, theme diner, độ khó Medium)**:
  - *Lý do*: Báo cáo trước bị từ chối do thiếu quầy `X` để đặt đồ (X = 0), bàn khách `Q` và bong bóng hội thoại che thùng nguyên liệu và bồn rửa.
  - *Ý tưởng thiết kế sửa đổi*:
    - Bổ sung 6 quầy `X`: 2 quầy `X` tại hàng 1 (x=8, 9) kề cạnh 2 thớt `C` (x=6, 7); đảo trung tâm hàng 4 có 4 quầy `X` bao quanh tủ đĩa `P` và bồn rửa `W` (x=6, 7, 9, 10).
    - Toàn bộ 6 bàn khách `Q` được chuyển xuống khu vực hàng 7 và 8 (x=3, 7, 11, 15 ở hàng 7; x=5, 13 ở hàng 8).
    - Phía trên mỗi bàn khách `Q` đều có tối thiểu 2 ô sàn trống liên tiếp, đảm bảo bong bóng thoại của khách không bao giờ che thùng nguyên liệu `T, L, B, M` (ở hàng 1) hay bồn rửa `W` (ở hàng 4).
    - Khoảng cách đi bộ BFS từ mọi bàn `Q` tới bồn rửa `W` (8, 4) đều ≤ 8 ô (các khoảng cách lần lượt: 6, 2, 4, 8, 5, 7 ô).
    - Không có bất kỳ trạm nào phải đứng thao tác ở ô tương tác của bàn `Q`.
  - *Cập nhật Golden Hash (`b11.test.ts`)*:
    | Map | Hash cũ | Hash mới | Lý do |
    |---|---|---|---|
    | `nha_hang_mo` | `84c2929d7e3f3fe75283bf4da91da85db1405bfa5975fc036259408a28685c16` | `c98e4739c05825f1664eaefb67bb9e3c1fffa2817fcf4a0be82591655acc3fb5` | Sửa usability M3: thêm 6 quầy X, chuyển Q xuống hàng 7-8 tránh che T, L, B, M, W |
    - Tất cả các golden hashes khác giữ nguyên.

## THIẾT KẾ LẠI MAP: BẾP LÒ NƯỚNG (BEP_LO_NUONG - M4)
- **2026-10-13: Khắc phục usability Bếp Lò Nướng (18×9, theme diner, độ khó Medium)**:
  - *Lý do*: Báo cáo trước bị từ chối do thiếu quầy `X` để làm bánh pizza (X = 0), bàn khách `Q` và bong bóng hội thoại che thùng nguyên liệu phô mai `Z`, cà chua `T` và lò nướng `U`.
  - *Ý tưởng thiết kế sửa đổi*:
    - Bổ sung 4 quầy `X`: 1 quầy `X` tại (5, 1) kề thớt `C(4, 1)` và lò nướng `U(6, 1)`; 1 quầy `X` tại (14, 1) kề thớt `C(13, 1)`; đảo trung tâm hàng 4 có 2 quầy `X` tại (7, 4) và (9, 4) kề bồn rửa `W(8, 4)`, máy đĩa `P(6, 4)` và thùng rác `D(10, 4)`.
    - Quy trình làm pizza tối ưu: bột `K` → thái tại `C(4, 1)` → đặt đế bột lên `X(5, 1)` → lấy phô mai `Z` thái tại `C` đặt lên bánh trên `X` → lấy cà chua `T` thái tại `C` đặt lên bánh trên `X` → tạo thành pizza sống → đặt vào lò `U(6, 1)` → nướng chín → lấy đĩa sạch tại `P` lấy pizza ra phục vụ bàn `Q`.
    - Hai bàn khách `Q` được chuyển xuống hàng 7 (x=3, 14), cách xa các thùng nguyên liệu và lò nướng ở hàng 1 tối thiểu 5 ô sàn trống, đảm bảo bong bóng thoại không che bất kỳ trạm nào.
    - Khoảng cách đi bộ BFS từ cả 2 bàn `Q` tới bồn rửa `W` (8, 4) là 6 ô và 7 ô (tất cả đều ≤ 8 ô).
  - *Cập nhật Golden Hash (`b11.test.ts`)*:
    | Map | Hash cũ | Hash mới | Lý do |
    |---|---|---|---|
    | `bep_lo_nuong` | `153190cece3e14974d368ecb326edd7dd90a856c1bc2583a7217a79ef2c613b1` | `3c2b2d700da40a47d2a297e1308ca95a883e6e3f07dba3e5f1d3a950a458b9e3` | Sửa usability M4: thêm 4 quầy X phục vụ làm pizza, chuyển 2 bàn Q xuống hàng 7 tránh che Z, T, U |
    - Tất cả các golden hashes khác giữ nguyên.

## THIẾT KẾ LẠI MAP: TÀU HẢI TẶC (TAU_HAI_TAC - M5)
- **2026-10-13: Khắc phục usability Tàu Hải Tặc (20×9, theme ship, độ khó Hard)**:
  - *Lý do*: Báo cáo trước bị từ chối do thiếu quầy `X` để đặt đồ (X = 0), không có quầy `X` cạnh thớt để thao tác sơ chế.
  - *Ý tưởng thiết kế sửa đổi*:
    - Bổ sung 4 quầy `X` tại hàng 1: quầy `X` tại (7, 1) nằm ngay cạnh thớt `C(6, 1)` và bếp `S(8, 1)`, giúp người chơi có thể đặt xà lách lên quầy `X` trước khi thái, gom đĩa salad và đặt nguyên liệu; cùng 3 quầy `X` tại (13..15, 1) ở khu vực mở rộng.
    - Giữ nguyên dải băng trơn `~` chiếm đúng 3 hàng (hàng index 3, 4, 5, các cột 2..17, tổng cộng 48 ô băng).
    - Hai bàn khách `Q` đặt tại hàng 7 ở cột 6 và cột 12.
    - Phía trên mỗi bàn khách `Q` có 5 ô sàn/băng trống liên tiếp, đảm bảo bong bóng thoại không che bất kỳ trạm nguyên liệu hay bồn rửa nào.
    - Khoảng cách đi bộ BFS từ cả 2 bàn `Q` tới bồn rửa `W` (10, 1) là 8 ô và 6 ô (tất cả đều ≤ 8 ô).
  - *Cập nhật Golden Hash (`b11.test.ts`)*:
    | Map | Hash cũ | Hash mới | Lý do |
    |---|---|---|---|
    | `tau_hai_tac` | `8049f8241eed4701e7e3a1413d778d6f6011e01bbdb590e6467adc57115e15d9` | `7afab1abbab7de127ea93446594b3e68100d6a3232bf4a3a11d59be26d0dc2ed` | Sửa usability M5: thêm 4 quầy X (kề C và S), bảo toàn 48 ô băng ~ và luật trượt |
    - Tất cả các golden hashes khác giữ nguyên.

## THIẾT KẾ LẠI MAP: TRẠM VŨ TRỤ (TRAM_VU_TRU - M6)
- **2026-10-13: Khắc phục usability Trạm Vũ Trụ (16×12, theme space, độ khó Hard)**:
  - *Lý do*: Báo cáo trước bị từ chối do bồn rửa `W` và máy đĩa `P` ở (9, 1) và (10, 1) bị bàn khách `Q(10, 3)` và bong bóng thoại che khuất, người chơi đứng thao tác tại `W` bị khách chắn.
  - *Ý tưởng thiết kế sửa đổi*:
    - Di chuyển trạm `P`, `W`, `D` sang các cột 11, 12, 13 ở hàng 1: `P(11, 1)`, `W(12, 1)`, `D(13, 1)`.
    - Cột 10 và 14 ở hàng 1 trở thành sàn trống `.` (không có trạm nào trên đầu bàn `Q(10, 3)` hay `Q(14, 4)`).
    - Cột 12 là hành lang mở dài 9 ô từ hàng 2 đến hàng 10, người chơi tiếp cận bồn rửa `W(12, 1)` từ ô (12, 2) hoàn toàn thông thoáng, không trùng hay kề cạnh bất kỳ ô tương tác của bàn `Q` nào.
    - Giữ nguyên khối quầy `X` 4×4 (16 ô `X`) ở trung tâm và dải băng chuyền chữ U 14 ô trôi quanh khối `X` kết thúc tại bàn `Q(10, 3)`.
    - Khoảng cách đi bộ BFS từ cả 3 bàn `Q` tới bồn rửa `W` (12, 1) là 2 ô, 3 ô, 5 ô (tất cả đều ≤ 8 ô).
  - *Cập nhật Golden Hash (`b11.test.ts`)*:
    | Map | Hash cũ | Hash mới | Lý do |
    |---|---|---|---|
    | `tram_vu_tru` | `3de7a682a24692530a2ee75b4c6dce4d8256444945932a18a6682a5341faa7d3` | `9d3b0c647d91d1d785d2b0e53bf751a9c8f4b67fd97e32155ee88972e8b962aa` | Sửa usability M6: chuyển P, W, D sang cột 11..13, thông thoáng lối tiếp cận W không bị khách ở Q chắn |
    - Tất cả các golden hashes khác giữ nguyên.

## TỰ ĐỘNG CẮT (AUTO-CHOP) VÀ TỰ ĐỘNG RỬA CHÉN (AUTO-WASH) — TỐI ƯU TRẢI NGHIỆM NGƯỜI CHƠI (QoL)
- **2026-10-13: Triển khai cơ chế Auto-Action cho thớt C và bồn rửa W**:
  - **Mục tiêu**:
    1. Tăng sự tiện lợi cho người chơi: khi bỏ đồ lên thớt `C`, nhân vật tự động cắt mà không cần giữ phím `F`. Khi cắt xong, đồ đã thái tự động ở trên tay người chơi luôn (`player.held`), thớt trống.
    2. Nếu người chơi ngắt giữa chừng (di chuyển đi): giữ nguyên tiến độ cắt (`station.progress`). Tuyệt đối không cho phép nhặt đồ trên thớt khi đang cắt dở (`progress > 0 && state === 'raw'`) để tránh làm mất tiến độ.
    3. Khi người chơi quay lại đứng đối diện thớt và ấn `F`: tiếp tục tự động cắt từ tiến độ cũ mà không cần giữ phím `F`.
    4. Tương tự với bồn rửa chén `W`: khi bỏ đĩa dơ vào bồn, nhân vật tự động rửa không cần giữ `F`. Khi rửa xong, nhân vật tự động cầm đĩa sạch trên tay (`player.held = makePlate(false)`). Nếu ngắt giữa chừng, tiến độ rửa được giữ nguyên; quay lại ấn `F` sẽ tiếp tục tự động rửa.
  - **Giải pháp kỹ thuật**:
    1. `packages/core/src/types.ts`: Bổ sung `autoAction?: 'chop' | 'wash'` vào `PlayerState`.
    2. `packages/core/src/sim/interact.ts`:
       - `interactCutting`: Khi đặt nguyên liệu `raw` thái được (`canChop`) lên thớt trống, gán `player.autoAction = 'chop'`.
       - Khi tay không tương tác với thớt: nếu `player.autoAction === 'chop' || (station.item.type === 'ingredient' && station.item.state === 'raw' && station.progress > 0)`, từ chối nhặt (`return []`) để bảo vệ tiến độ đang cắt.
       - `interactSink`: Khi đặt đĩa dơ (`plate.dirty`) vào bồn rửa, gán `player.autoAction = 'wash'`.
    3. `packages/core/src/sim/action.ts`:
       - Cho phép hành động tiến hành khi có `player.autoAction` hoặc `input.act`.
       - Nhấn `input.act` khi đang đứng trước thớt/bồn rửa hợp lệ sẽ kích hoạt/tiếp tục `player.autoAction`.
       - Khi người chơi di chuyển (`mx !== 0 || my !== 0`), huỷ cờ `player.autoAction = undefined` và `player.acting = false`, nhưng giữ nguyên `station.progress`.
       - Khi thớt hoàn thành cắt (`progress >= CHOP_TIME`): nếu tay rỗng, tự động gán `player.held = station.item; station.item = null; station.progress = 0;`, xóa `autoAction` và phát sự kiện `chop_done`.
       - Khi bồn rửa hoàn thành (`progress >= WASH_TIME`): giảm `dirtyCount--`, nếu tay rỗng tự động gán `player.held = makePlate(false); station.progress = 0;`, xóa `autoAction` và phát sự kiện `wash_done`.
    4. `packages/core/src/sim/step.ts`: Nếu người chơi ở trạng thái chờ/chưa gửi input nhưng có cờ `autoAction`, tự động sinh input nhàn rỗi (`mx: 0, my: 0, act: false`) để duy trì tiến trình cắt/rửa (rất hữu ích trong chế độ solo khi đổi chef bằng phím Tab).
  - **File sửa**:
    - `packages/core/src/types.ts`
    - `packages/core/src/sim/interact.ts`
    - `packages/core/src/sim/action.ts`
    - `packages/core/src/sim/step.ts`
    - `packages/core/src/__tests__/autoAction.test.ts` (test mới với 5 kịch bản toàn diện)
    - Cập nhật các test case cũ phản ánh luật mới (đồ sau khi thái/rửa tự động nằm trên tay người chơi): `action.test.ts`, `interact.test.ts`, `table.test.ts`, `soup.test.ts`, `pizza.test.ts`, `phase2Maps.test.ts`, `nha_hang_mo.test.ts`, `levelRedesign.test.ts`, `bep_doi.test.ts`.
  - **Kết quả kiểm thử**:
    - `pnpm -r typecheck`: 100% xanh (0 lỗi trên core, server, client).
    - `pnpm test`: 100% xanh (toàn bộ 240 unit tests của core, 63 tests client, tất cả server tests đều pass).
    - `pnpm validate:levels`: 100% xanh.
    - Golden Hashes `b11.test.ts`: 100% trùng khớp và được bảo toàn.

## TÍCH HỢP QUATERNIUS 3D MODEL (PHASE V1)
- **2026-10-13: Quy chuẩn bộ xương và gắn vật cầm Quaternius Chef_Male (GATE 3)**:
  - Quaternius Chef_Male: tay phải = FistR (không có Hand). Offset (0,0.05,0.15), scale 0.6.
  - Xương phụ: LowerArmR.
  - Chuẩn hóa scale model (GATE 1): node gốc `CharacterArmature` có `scale_node = 0.01`, bbox `h_thô = 316.41`, `h_thực = 3.1641`, `hệ_số = 0.95 / h_thực = 0.300239`. Đặt scale trên group bọc ngoài, pivot `group.position.y = -minY_thực * hệ_số`. Logged: `QUAT scale_node=0.01 h_thô=316.41 h_thực=3.16 hệ_số=0.3002`.
- **2026-10-13: Debug window.__QUAT__ (PHASE V1 Q3 BƯỚC 1)**:
  - Trong chế độ debug (?debug=1), mỗi frame cập nhật window.__QUAT__ = { key, once, timeScale, scale, h, actingStation, ready }.
  - Chỉ cập nhật khi `isMe` (chef chủ động của người chơi cục bộ) để tránh ghi đè dữ liệu.