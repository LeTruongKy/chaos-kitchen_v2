# 05 — QUY TRÌNH LÀM ASSET BẰNG AI & SỬA ĐỒ HỌA 3D

Gồm 2 phần: **Phần I dành cho BẠN** (tự tạo asset), **Phần II dành cho AI CODE** (tích hợp asset + sửa chất lượng hình ảnh). Phần II là các task nối tiếp `04_V2_TASKS.md`; khi mâu thuẫn, file này thắng ở các mục đồ họa (D04, D05, D03).

> Game chỉ chơi local nên bản quyền ít rủi ro hơn, nhưng vẫn nên ghi nguồn từng asset vào `CREDITS.md` để sau này muốn chia sẻ không phải làm lại.

---

# PHẦN I — BẠN TỰ LÀM ASSET

## 1. Lời khuyên chiến lược (đọc trước)

Ba cách, xếp theo độ dễ và chất lượng:

| Cách | Công sức | Chất lượng | Dùng cho |
|---|---|---|---|
| **A. Dùng bộ asset CC0 có sẵn** (Kenney, Quaternius, KayKit) | Thấp nhất | Đồng bộ phong cách, ổn định | **Nhân vật có rig sẵn, quầy bếp, đồ ăn cơ bản** |
| **B. Tạo bằng AI (ảnh → 3D)** | Trung bình | Tốt cho vật đơn giản; **nhân vật dễ lỗi** | Đồ ăn, dụng cụ, vật phẩm riêng |
| **C. Tự dựng trong Blender** | Cao | Cao nhất nếu biết làm | Chỉ khi A+B không đạt |

**Khuyến nghị cho bạn:** dùng **A cho nhân vật** (đã có rig + animation, hết lo rig/animation lỗi), dùng **B cho đồ ăn/dụng cụ/quầy** nếu bộ A thiếu món, rồi để code **ép tất cả về cùng một phong cách** (toon + viền) — đây là bí quyết làm asset từ nhiều nguồn trông đồng bộ.

Lý do nhân vật nên lấy asset có sẵn: nhân vật AI-generated thường phải qua thêm 2 bước (tạo rig, gắn animation) và rất hay hỏng ở tay/chân/đầu to kiểu chibi. Đồ ăn thì ngược lại: hình khối đơn giản, AI làm rất tốt.

## 2. Nơi tải asset miễn phí (CC0, đã dựng sẵn)

> Tên và nội dung gói có thể thay đổi — mở trang và kiểm tra giấy phép từng gói trước khi tải.

| Nguồn | Có gì | Giấy phép | Ghi chú |
|---|---|---|---|
| **kenney.nl** (mục Assets → 3D) | Food Kit, Furniture/Kitchen Kit, Animated Characters (Protagonists/Retro/Survivors), Blocky Characters, Mini Characters | CC0 | Phong cách khối vuông vui mắt, **rất hợp để thử đầu tiên** |
| **quaternius.com** | Ultimate Animated Character Pack (50+ nhân vật có animation), Universal Animation Library (khoảng 260 clip) | CC0 | Gói miễn phí tải một phần, phần còn lại trả phí |
| **KayKit (kaylousberg)** | Nhân vật low-poly có rig, kèm animation | CC0 | Bản miễn phí có ít nhân vật |
| **poly.pizza** | Hàng nghìn model lẻ (bộ lọc CC0) | Từng model khác nhau | Phải xem giấy phép **từng cái** |
| **Sketchfab** (bộ lọc "Downloadable" + CC0) | Model đủ loại | Từng model khác nhau | Chất lượng không đều |
| **Mixamo** (mixamo.com, cần tài khoản Adobe miễn phí) | Tự động tạo rig cho nhân vật người (T-pose) + kho animation | Dùng miễn phí cho game | Theo tài liệu hiện có, trang vẫn chạy nhưng không còn được cập nhật |

## 3. Công cụ AI tạo model 3D (đã khảo sát, tháng 10/2026)

> Gói miễn phí các dịch vụ này **thay đổi liên tục**; số liệu dưới đây lấy từ bài viết/so sánh gần đây, hãy xem trang giá thật trước khi dựa vào.

| Công cụ | Miễn phí thế nào | Ghi chú |
|---|---|---|
| **Hunyuan 3D (Tencent)** | Được đánh giá là lựa chọn miễn phí tốt nhất; một bài so sánh ghi khoảng 20 lượt tạo/ngày | Xuất GLB/OBJ. **Mã nguồn mở, có thể chạy trên máy bạn** nếu có card đồ họa rời (khoảng 8–16GB VRAM) |
| **Meshy** | Gói free: 100 credit/tháng, **giới hạn 10 lượt tải/tháng**, dùng model cũ hơn | Xuất GLB/FBX/OBJ; có tự động rig + animation mẫu |
| **Tripo** | Gói free ~300 credit/tháng, **model tạo ra bị công khai** | Có image→3D, text→3D, nhiều ảnh→3D |
| **3D AI Studio / Sorceress / Cinevva** | Có gói/credit khởi đầu miễn phí; gom nhiều engine (Hunyuan, Meshy, Tripo…) | Tiện để so sánh nhiều engine cùng ảnh đầu vào |
| **Cinevva Auto Rigger** | Miễn phí, chạy trên trình duyệt: nhận GLB, trả GLB đã rig (người và 4 chân) | Dùng khi có nhân vật AI cần rig |
| **Blender** (blender.org) | Miễn phí hoàn toàn | Dùng để dọn model (xem mục 6) |

**Mẹo:** tạo ảnh đầu vào (2D) bằng bất kỳ công cụ tạo ảnh AI nào bạn có (kể cả bản miễn phí), rồi dùng **image→3D** thay vì text→3D. Kết quả đúng ý và đồng bộ phong cách hơn nhiều.

## 4. Danh sách asset cần có (làm theo thứ tự ưu tiên)

### Ưu tiên 1 — Đủ để chơi đẹp
| # | Asset | Tên file (`apps/client/public/assets/models/`) | Ghi chú |
|---|---|---|---|
| 1 | Đầu bếp (đã rig) | `chef.glb` | Clip cần: `Idle`, `Run`, `Interact` (thái/rửa), `Throw`. Thiếu `Carry`/`Dash` thì code tự xử lý bằng tư thế tay + nghiêng người |
| 2 | Cà chua nguyên quả | `tomato.glb` | |
| 3 | Cà chua thái lát | `tomato_sliced.glb` | |
| 4 | Xà lách nguyên | `lettuce.glb` | |
| 5 | Xà lách thái | `lettuce_chopped.glb` | |
| 6 | Bánh bun (2 nửa: đáy + nắp) | `bun_bottom.glb`, `bun_top.glb` | |
| 7 | Thịt patty | `patty.glb` | Chín/cháy do code đổi màu, **không cần** làm 3 bản |
| 8 | Đĩa | `plate.glb` | Đĩa bẩn do code đổi màu + vết |
| 9 | Chảo | `pan.glb` | Cán dài |
| 10 | Nồi | `pot.glb` | 2 quai |
| 11 | Bình chữa cháy | `extinguisher.glb` | |

### Ưu tiên 2
Hành tây nguyên + vòng hành, nấm nguyên + lát, bát súp, quầy (counter), thớt + dao, bếp 2 họng, bồn rửa, máy cấp đĩa, cửa phục vụ có chuông, thùng rác, thùng nguyên liệu (mở nắp), giá bình chữa cháy, băng chuyền.
→ Phần lớn có sẵn trong **Kenney Furniture/Kitchen Kit** hoặc tự code procedural nếu thiếu (AI code đã có sẵn bản procedural làm dự phòng).

## 5. Quy trình làm một vật phẩm bằng AI (ví dụ cà chua)

1. **Tạo ảnh tham chiếu 2D** bằng công cụ tạo ảnh AI. Mẫu prompt (đổi tên vật):
   > `A single cartoon tomato, chunky simplified shape, smooth glossy surface, saturated red with a small green stem, soft even studio lighting, plain white background, centered, three-quarter view, game asset style, no shadow on the ground, no text`
   - Luôn: **một vật duy nhất, nền trắng trơn, không đổ bóng xuống sàn, không chữ.**
   - Giữ **cùng một câu mô tả phong cách** cho mọi vật (ví dụ "chunky simplified cartoon, saturated colors, soft even lighting") để cả bộ đồng bộ.
2. **Đưa ảnh vào công cụ image→3D** (Hunyuan 3D, Meshy, Tripo…). Nếu còn credit: tạo 2–3 lần, chọn bản đẹp nhất.
3. **Kiểm tra trong trình xem:** hình dạng đúng, không méo, không lỗ, texture không có "ánh sáng/bóng đổ dính vào màu".
4. **Tải xuống định dạng GLB.**
5. **Dọn trong Blender (xem mục 6)** hoặc đưa thẳng cho AI code xử lý (task V03 có công cụ chuẩn hóa tự động).
6. Đặt file vào đúng thư mục, ghi vào `CREDITS.md` (công cụ, ngày tạo, prompt).

**Với nhân vật tự tạo bằng AI (nếu bạn vẫn muốn):**
- Prompt ảnh: `chibi cartoon chef character, big head, short limbs, chef hat, apron, standing in a T-pose with arms straight out, front view, plain white background, game asset style`. **Bắt buộc dáng chữ T** hoặc chữ A.
- Image→3D → cho ra GLB → **Cinevva Auto Rigger** hoặc **Mixamo** (cần FBX/OBJ, T-pose) để gắn rig → tải animation (Idle, Run, Throw…) → xuất FBX có skin → chuyển sang GLB bằng Blender.
- Rủi ro: đầu to + chân ngắn thường bị rig sai (vai kéo theo mũ, tay dính thân). Nếu thấy méo thì quay về dùng nhân vật CC0 có sẵn.

## 6. Dọn model trong Blender (hoặc bỏ qua nếu dùng công cụ tự động ở V03)

1. File → Import → glTF 2.0.
2. Chọn model: `Object → Set Origin → Origin to Geometry`, rồi dời về **đáy** (vật phẩm) — nếu không dời, code tự chuẩn hóa ở V03.
3. `Ctrl+A → All Transforms` (áp dụng scale/rotate).
4. Số tam giác nhiều quá (> 3.000 cho đồ ăn): modifier **Decimate** (Ratio 0.3–0.5).
5. Mở Shading: nếu texture có **bóng đổ vẽ sẵn** (vùng tối dính trên màu) → tạo lại ảnh đầu vào với "ánh sáng đều" hoặc chỉnh trong Blender.
6. File → Export → glTF 2.0 (`.glb`), bật *Apply Modifiers*, **+Y Up**.
7. Tối ưu thêm (tùy chọn, dòng lệnh): `npx @gltf-transform/cli optimize in.glb out.glb --texture-compress webp`.

## 7. Cách nhờ AI giúp bạn chọn/đánh giá ảnh

Chụp ảnh màn hình model đã tạo, gửi AI kèm câu hỏi: *"So với mô tả ở mục 5 file 05, model này có lỗi gì (méo, thiếu chi tiết, bóng dính màu, tỉ lệ sai)? Nên tạo lại hay chỉ cần chỉnh?"* Đỡ tốn credit tạo lại mù quáng.

## 8. Ảnh tham khảo phong cách (rất quan trọng)

Tạo thư mục `docs/reference/`, bỏ vào **5–10 ảnh** bạn thấy "đẹp, đúng ý" (ảnh chụp game hài hước nấu ăn, ảnh render 3D hoạt hình, bảng màu bạn thích). AI code xem được ảnh và dùng làm chuẩn so sánh ở các task V01/V10. **Ảnh để học phong cách (ánh sáng, màu, tỉ lệ), không sao chép nguyên bản asset của ai.**

---

# PHẦN II — TASK CHO AI CODE (nối tiếp 04_V2_TASKS.md)

> Đọc `01_CODING_RULES.md`, `03_V2_RULES_ADDENDUM.md`, `04_V2_TASKS.md` trước. Quy trình & báo cáo như cũ. Mọi task đồ họa **bắt buộc**: chạy game thật, chụp ảnh (`docs/screens/<task>/`), **so với ảnh trong `docs/reference/`** và nêu rõ chỗ còn thua kém.

## Nguyên nhân hình 3D hiện tại xấu (AI code cần xử lý) — để hiểu bối cảnh
Hình tạo hoàn toàn từ khối cơ bản; không có bảng màu cố định; tỉ lệ nhân vật/đồ vật chưa "mập mạp dễ thương"; ánh sáng phẳng, bóng yếu; cạnh sắc và không bo; chi tiết nhỏ (mắt, nếp gấp, mặt nước, lát cắt) thiếu; không có tiếp xúc bóng (contact shadow); không có chỉnh màu cuối (tone mapping).

## V01 — Art Bible & "Phòng chụp mẫu" (Look-Dev)
**Phụ thuộc:** D01.
**Việc cần làm:**
1. Viết `docs/ART_BIBLE.md` dựa trên ảnh trong `docs/reference/`: bảng màu (tối đa **12 màu chủ đạo** + 4 màu nhấn, ghi mã hex), quy tắc tỉ lệ ("đầu bằng ~40% chiều cao nhân vật", "mọi cạnh bo", "vật phẩm to hơn thực tế ~1.5 lần để dễ nhìn"), quy tắc ánh sáng (hướng ánh sáng, màu sáng ấm / bóng lạnh), độ dày viền, độ bóng vật liệu (nhựa/gỗ/kim loại).
2. Tạo trang `?view=lookdev`: một "bàn chụp" nền xám trung tính với 1 chef + 1 mẫu mỗi loại vật + 1 mẫu mỗi loại quầy, có thể xoay camera bằng chuột, nút chuyển quality, nút bật/tắt viền/bóng/AO.
3. Cấu hình render theo Art Bible: `renderer.toneMapping = ACESFilmicToneMapping` (hoặc tương đương đã chọn, ghi DECISIONS), `outputColorSpace = SRGBColorSpace`, đèn chính ấm + đèn bổ sung lạnh từ phía sau (rim light), `HemisphereLight` nhẹ, bóng mềm (PCFSoftShadowMap, `radius` phù hợp), **bóng tiếp xúc** (blob shadow tròn mờ dưới chân nhân vật và vật phẩm trên sàn).
4. **Bo cạnh:** dùng `RoundedBoxGeometry` (từ `three/examples/jsm/geometries/RoundedBoxGeometry`) cho mọi khối hộp procedural (quầy, thớt, bệ bếp…), bán kính theo Art Bible.
5. Ảnh chụp so sánh **trước/sau** cùng góc camera.

**Nghiệm thu:**
- [ ] `docs/ART_BIBLE.md` đủ các mục, có mã màu
- [ ] `?view=lookdev` hoạt động; ảnh trước/sau cho thấy cải thiện rõ ràng (người chủ dự án sẽ duyệt)
- [ ] Không còn cạnh sắc ở quầy và đồ vật procedural
- [ ] FPS ở `medium` vẫn ≥ 55

## V02 — Tải GLB: Asset Loader, Chuẩn hóa tự động & Trình xem asset
**Phụ thuộc:** V01.
**Việc cần làm:**
1. Cài `GLTFLoader`, `DRACOLoader` (tùy chọn), `SkeletonUtils` (từ `three/examples/jsm`), không thêm thư viện khác.
2. `game/assets/AssetManifest.ts`: danh sách `AssetId → {file, kind:'item'|'station'|'character', targetSize:{height?:number; width?:number}, pivot:'bottom'|'center', rotateY?:number, tintable?:boolean}`; mọi asset **luôn có fallback procedural** (nếu file thiếu/lỗi tải thì dùng bản procedural, không crash, ghi `warn` một lần).
3. `game/assets/ModelNormalizer.ts`: nhận scene GLB → (a) **tự co/giãn** về `targetSize` bằng bounding box; (b) **đặt pivot** (đáy hoặc giữa) và xoay đúng mặt trước (+Z); (c) **thay mọi material** bằng `MeshToonMaterial` giữ nguyên `map`, bỏ metalness/PBR, màu nhân theo `tint`; (d) gắn viền (inverted hull) cho `Mesh` không phải `SkinnedMesh` (với `SkinnedMesh` dùng phương pháp viền tương thích hoặc post-process, ghi DECISIONS); (e) bật `castShadow`/`receiveShadow`; (f) cảnh báo nếu > 5.000 tam giác (item) hoặc > 12.000 (nhân vật).
4. Cache: mỗi GLB tải **một lần**, nhân bản bằng `SkeletonUtils.clone` (nhân vật) hoặc `clone` (vật); dùng chung geometry/material; `dispose()` đúng.
5. Trang `?view=assets`: lưới hiển thị mọi asset trong manifest kèm tên, số tam giác, kích thước sau chuẩn hóa, khung lưới 1×1 tile để đối chiếu tỉ lệ, đánh dấu đỏ nếu dùng fallback.
6. `docs/ASSETS.md`: quy cách asset (mục 4–6 phần I), bảng manifest, cách thêm asset mới trong 3 bước.

**Nghiệm thu:**
- [ ] Bỏ file `tomato.glb` vào thư mục → `?view=assets` hiển thị đúng kích thước/pivot; xóa file → tự dùng fallback, không lỗi console ngoài 1 cảnh báo
- [ ] Hai model từ hai nguồn khác nhau (ví dụ Kenney + AI) đặt cạnh nhau **trông cùng phong cách** (toon + viền) — ảnh chụp
- [ ] Đổi level 20 lần: `renderer.info.memory` không tăng
- [ ] Unit test `ModelNormalizer` trên model dựng bằng code (bounding box, pivot đúng)

## V03 — Nhân vật từ GLB (rig + animation)
**Phụ thuộc:** V02.
**Việc cần làm:**
1. `renderer3d/chef/ChefModel.ts`: nạp `chef.glb` (có rig), `AnimationMixer` cho mỗi chef (tối đa 4), ánh xạ **trạng thái → clip** qua bảng cấu hình `chefClips.ts` (tên clip có thể khác nhau tùy bộ asset: dùng tên không phân biệt hoa thường + bảng alias, ví dụ `idle|Idle|Idle_A`, `run|Run|Running`). Clip thiếu → dự phòng: (a) `carry` thiếu → dùng `idle/run` + nâng 2 xương tay lên (nếu tìm được xương `arm|hand`), (b) `dash` thiếu → clip `run` tốc độ ×1.6 + nghiêng người, (c) `chop/wash` thiếu → clip `interact` hoặc rung nhẹ tay.
2. Chuyển clip bằng `crossFadeTo` 0.12s; tốc độ `run` nhân theo `|v|/PLAYER_MAX_SPEED`.
3. **Nhiều màu người chơi từ một model:** đổi màu vật liệu của phần "áo" (xác định theo tên material, cấu hình trong manifest) và có `tintable`; nếu model chỉ có 1 material thì thêm dải màu (băng đô/khăn) procedural gắn vào xương cổ.
4. Mũ/tùy biến (D10): gắn procedural vào xương `head`; nếu không có xương → gắn theo vị trí cố định trên đầu.
5. Vật cầm gắn vào xương tay phải (hoặc điểm neo trước ngực nếu không tìm thấy xương) với offset cấu hình.
6. Giữ nguyên bản procedural cũ làm fallback (`?chef=procedural` để so sánh).

**Nghiệm thu:**
- [ ] Ảnh/GIF các trạng thái idle, run, carry, interact, throw, dash trên chef GLB
- [ ] 4 chef màu khác nhau cùng lúc, ≥ 55 FPS `medium`
- [ ] Xóa `chef.glb` → tự dùng chef procedural, game vẫn chơi được
- [ ] Không có xương xoắn/vỡ hình khi chuyển clip (kiểm tra bằng mắt, chụp ảnh các khung chuyển)

## V04 — Vật phẩm từ GLB + biến thể trạng thái
**Phụ thuộc:** V02.
**Việc cần làm:**
1. Ánh xạ `Item` → model: nguyên liệu `raw` → model nguyên, `chopped` → model đã thái (nếu không có file thì dùng model nguyên **thu nhỏ 60% × 3 bản xếp tam giác** làm tạm); `cooked`/`burnt` của thịt: **cùng một model `patty.glb`**, đổi màu bằng `tint` (raw hồng `#e07a7a`, cooked nâu `#8a5230`, burnt đen `#2a1d17`) kèm vạch nướng (decal/vertex color đơn giản hoặc thay texture bằng canvas procedural).
2. Đĩa: `plate.glb`; **bày món theo `contents`**: burger xếp tầng cao dần (bun_bottom → patty → lettuce → tomato → bun_top), salad = rau + lát cà chua, súp = tô + mặt súp màu theo loại có hơi nước. Đĩa bẩn: tint ngả nâu xám + vài vết procedural.
3. Chảo/nồi/bình: từ GLB; nội dung nhìn thấy theo `contents/progress` (như D05).
4. `updateItem` vẫn cập nhật tại chỗ, không tạo object mới khi chỉ đổi state.
5. Bảng mẫu `?view=items` cập nhật.

**Nghiệm thu:**
- [ ] Ảnh bảng mẫu mọi vật × mọi trạng thái với asset GLB (và với fallback)
- [ ] Đĩa burger thiếu/đủ nhìn khác nhau rõ; đĩa bẩn khác đĩa sạch rõ
- [ ] `updateItem` không sinh object mới (đếm trong test/debug)

## V05 — Quầy bếp từ asset & làm đẹp môi trường
**Phụ thuộc:** V02, V01.
**Việc cần làm:**
1. Nếu có bộ Kitchen/Furniture CC0: ánh xạ từng loại station sang model (counter, bếp, bồn, tủ…) qua manifest; các phần thiếu giữ procedural bo cạnh (V01). Mọi model qua `ModelNormalizer` để đồng bộ phong cách.
2. Tăng chi tiết nhỏ có chọn lọc (không làm nặng): thớt có dao, bếp có vòng đốt phát sáng khi nấu, bồn có mặt nước gợn, cửa phục vụ có chuông đung đưa khi giao, thùng rác có nắp bật khi bỏ đồ, đĩa chồng cao theo số lượng.
3. Sàn: ô cờ có **gờ nhẹ** giữa các ô và vân nhẹ (texture procedural nhỏ), tường nền có đèn/cửa sổ theo theme.
4. Màu theo bảng màu Art Bible, không dùng màu ngoài bảng.

**Nghiệm thu:**
- [ ] Ảnh chụp 3 theme trước/sau; mỗi loại station nhận diện được khi không có chữ
- [ ] Draw calls ≤ 300; FPS ≥ 55 `medium`

## V06 — Hậu kỳ nhẹ & chỉnh màu (tùy chọn theo quality)
**Phụ thuộc:** V05.
**Việc cần làm:** (chỉ ở `high` và tùy chọn ở `medium`) `EffectComposer` với: FXAA/SMAA (chống răng cưa), **bloom nhẹ** chỉ cho lửa/bếp/đèn, vignette nhẹ, tăng bão hòa vừa phải (color grading đơn giản); tắt hoàn toàn ở `low`; nút bật/tắt trong Settings. Không dùng SSAO nặng; nếu muốn ambient occlusion, dùng **AO nướng giả** (gradient tối ở chân tường/quầy bằng vertex color hoặc texture).
**Nghiệm thu:**
- [ ] Ảnh có/không hậu kỳ; FPS `high` ≥ 45, `medium` không đổi so với trước nếu tắt
- [ ] Tắt hậu kỳ không còn tài nguyên composer treo (kiểm tra dispose)

## V07 — Rà soát chất lượng hình ảnh theo ảnh tham khảo
**Phụ thuộc:** V03–V06.
**Việc cần làm:** với mỗi level × theme: chụp ảnh gameplay (2 người, 4 người) cạnh ảnh tham khảo; lập bảng "khác biệt → nguyên nhân → sửa" (≥ 15 mục: tỉ lệ, màu, bóng, độ đậm viền, độ bóng vật liệu, độ bão hòa, bố cục camera, UI chồng lên cảnh…); sửa các mục ảnh hưởng lớn nhất; chụp lại; **chủ dự án duyệt** (ghi nhận xét vào `docs/VISUAL_REVIEW.md`).
**Nghiệm thu:**
- [ ] `docs/VISUAL_REVIEW.md` có ảnh trước/sau và quyết định từng mục
- [ ] Chủ dự án xác nhận (hoặc nêu mục cần làm lại) — vòng lặp tối đa 3 lần cho mỗi hạng mục
- [ ] Không phá FPS/ngân sách ở file 03 mục 5

---

# PHỤ LỤC — Cách giao việc & phản hồi hiệu quả

- **Giao theo thứ tự V01 → V02 → V03/V04/V05 → V06 → V07.** Đừng đổi sang asset ngoài trước khi V02 xong, vì V02 là nơi ép mọi model về cùng phong cách.
- **Phản hồi hình ảnh phải cụ thể**, gửi kèm ảnh chụp màn hình và chỉ đúng chỗ. Ví dụ tốt: *"Đầu bếp nhìn ngược sáng nên mặt tối, tăng đèn bổ sung phía trước; cái nồi to quá so với cái bếp, giảm 25%."* Ví dụ không tốt: *"Xấu quá, làm đẹp lên."*
- **Mỗi lần chỉ sửa 1–2 hạng mục** rồi chụp lại; sửa 10 thứ cùng lúc sẽ khó biết cái nào làm đẹp hơn.
- **Nếu một loại asset AI tạo ra liên tục lỗi** (đặc biệt nhân vật): bỏ, chuyển sang asset CC0 có sẵn; không cố ép.
