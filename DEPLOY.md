# 🚀 Hướng dẫn Publish Game "Chaos Kitchen" Lên Mạng (Miễn Phí 100% với GitHub)

Dự án đã được cấu hình sẵn toàn bộ để bạn có thể publish **miễn phí** bằng tài khoản **GitHub** và gửi link mời bạn bè vào chơi chung trên cả **PC** lẫn **Điện thoại (Mobile)**, hỗ trợ đầy đủ **Mic đàm thoại (WebRTC)**.

---

## Cách 1 (Khuyên dùng - Nhanh nhất): Dùng GitHub + Render.com (Free 100%)
Chỉ với 1 dịch vụ duy nhất, Render sẽ tự lấy code từ GitHub của bạn và chạy cả **Giao diện Web 3D** lẫn **Server Phòng chơi + Mic** trên cùng một đường link `https://...onrender.com`.

### Các bước thực hiện:
1. **Đẩy code lên GitHub**:
   ```bash
   git add .
   git commit -m "Ready for online publish"
   git push origin main
   ```
2. **Tạo Server miễn phí trên Render**:
   - Truy cập [https://render.com](https://render.com) và bấm **Sign in with GitHub**.
   - Bấm nút **New +** $\rightarrow$ Chọn **Blueprint** (hoặc **Web Service**).
   - Chọn repository GitHub chứa game của bạn.
   - Render sẽ tự động nhận diện file `render.yaml` và `Dockerfile` (Gói **Free - $0/tháng**).
   - Bấm **Apply / Create Web Service** và đợi khoảng 2–3 phút để quá trình build hoàn tất.
3. **Chơi cùng bạn bè**:
   - Sau khi Deploy xong, bạn sẽ nhận được link dạng: `https://chaos-kitchen-xxxx.onrender.com`.
   - Vào game $\rightarrow$ Bấm **Tạo phòng** $\rightarrow$ Bấm **Sao chép link** và gửi qua Zalo/Messenger/Discord cho bạn bè!

---

## Cách 2: Kết hợp GitHub Pages (Frontend 3D) + Render/Tunnel (Server)
Nếu bạn muốn tận dụng **GitHub Pages** để tải các mô hình 3D siêu nhanh từ CDN của GitHub:

1. **Bật GitHub Pages trên kho chứa GitHub của bạn**:
   - Mở repo trên GitHub $\rightarrow$ Vào mục **Settings** $\rightarrow$ **Pages** (cột bên trái).
   - Tại mục **Build and deployment** $\rightarrow$ **Source**, chọn **GitHub Actions**.
   - File `.github/workflows/deploy-pages.yml` có sẵn trong project sẽ tự động chạy và xuất bản trang web game của bạn lên:
     `https://<tên-github-của-bạn>.github.io/<tên-repo>/`
2. **Kết nối GitHub Pages với Server**:
   - Bạn có thể vào mục **Cài đặt (Settings)** ngay trong Menu game $\rightarrow$ Ô **Máy chủ Online (Server URL)** và dán địa chỉ Server của bạn vào (ví dụ `https://chaos-kitchen-xxxx.onrender.com`).
   - Khi bạn bấm **Sao chép link** trong phòng chờ, link mời sẽ tự động đính kèm cả mã phòng lẫn địa chỉ máy chủ (`?room=ABCD&server=...`), bạn bè bấm vào link là vào thẳng phòng của bạn mà không cần cài đặt gì thêm!
   - *(Mẹo nâng cao)*: Bạn cũng có thể vào **Settings $\rightarrow$ Secrets and variables $\rightarrow$ Actions $\rightarrow$ Variables** trên GitHub và thêm biến `VITE_SERVER_URL` = `wss://chaos-kitchen-xxxx.onrender.com` để gán mặc định vĩnh viễn.
