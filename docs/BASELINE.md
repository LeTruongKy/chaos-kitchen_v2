# BASELINE REPORT (V0.1.0)

## Kích thước Bundle (Client)
- **Kích thước gzip thực tế:** ~401.5 kB (Phaser ~335.5 kB, Game logic ~63.6 kB, CSS ~2 kB).

## Hiệu năng Client (FPS)
- **Trung bình (60s, 2 tab):** ~60 FPS (với cấu hình render 2D hiện tại bằng Phaser, số lượng object thấp).

## Hiệu năng Server (CPU)
- **Server với 4 bot chơi liên tục (60s):** CPU sử dụng khoảng < 10% trên một core (logic `core` chạy rất nhẹ với 30Hz tick rate).
