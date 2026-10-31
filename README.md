# Giao thông an toàn

Ứng dụng dẫn đường và cảnh báo giao thông (tốc độ, cấm vượt, ngược chiều, camera, báo cáo cộng đồng), hoạt động **cả online và offline**.

- Kế hoạch tổng thể: [`KE_HOACH.md`](KE_HOACH.md)
- Kiến trúc, tech stack, cấu trúc thư mục, cách chạy: [`docs/KIEN_TRUC.md`](docs/KIEN_TRUC.md)

| Thư mục | Nội dung |
|---|---|
| `packages/shared` | Bộ máy cảnh báo + kiểu dữ liệu dùng chung (TypeScript) |
| `apps/api` | Backend NestJS + PostGIS + Redis + socket.io |
| `apps/mobile` | Ứng dụng Expo / React Native + MapLibre (2D/3D, offline) |
| `apps/admin` | Trang quản trị Next.js + Tailwind |
| `tools/osm-import` | Nhập dữ liệu OpenStreetMap vào PostGIS (Python) |
| `db/init` | Lược đồ CSDL |
