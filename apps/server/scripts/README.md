# Bot và load test

Khởi động server trước, rồi cho bot vào phòng hiện có:

```sh
pnpm --filter @kitchen/server bot -- --code ABCD --count 3
```

Tạo một phòng công khai và cho bot tự ready/start:

```sh
pnpm --filter @kitchen/server bot -- --create --count 4 --duration-sec 180
```

Tùy chọn: `--url ws://host:2567`, `--name-prefix Chef`, `--duration-sec 60`.

Load test tạo 5 phòng, mỗi phòng 4 bot (mặc định 180 giây; dùng `--duration-sec 60` cho yêu cầu T14):

```sh
pnpm --filter @kitchen/server loadtest -- --duration-sec 60
```

Bot in thống kê snapshot, ping, điểm và lỗi mỗi 5 giây. Nó dùng map level trong `@kitchen/core` để BFS tới trạm kế tiếp, gửi input 30Hz, tương tác và thỉnh thoảng giữ action 3.2 giây.
