# KIẾN TRÚC HỆ THỐNG – GIAO THÔNG AN TOÀN

> Lập ngày 31/10/2026, dựa trên bối cảnh trao đổi với Gemini và kế hoạch `KE_HOACH.md`.
> Mục tiêu là **tận dụng tối đa công cụ đã quen**: Next.js, React, TailwindCSS, NestJS, PostGIS, Docker, Redis, Python.

---

## 1. Nguyên tắc thiết kế: "Offline-first, Cloud bổ trợ"

Bài toán lai giữa offline (vùng lõi không có sóng) và cloud realtime giải bằng **một nguyên tắc duy nhất**:

> **Bộ máy cảnh báo luôn chạy trên điện thoại và chỉ đọc dữ liệu từ SQLite cục bộ.**
> Cloud không bao giờ nằm trên đường đi của cảnh báo. Cloud chỉ **làm mới** SQLite.

```
                 ┌──────────────────────── ĐIỆN THOẠI ────────────────────────┐
  GPS ──────────►│ useGps ─► WarningEngine ◄── SQLite (hazards, road_rules) │──► Giọng nói, banner
                 │                               ▲            │              │
                 │      Gói bản đồ offline       │ upsert     │ outbox       │
                 │      (MapLibre OfflinePack)   │            ▼              │
                 └───────────────────────────────┼────────────┼──────────────┘
                                   khi có mạng   │            │
                 ┌───────────────────────────────┼────────────┼──────────────┐
                 │ CLOUD   GET /hazards?since=   │            │ POST /reports│
                 │         GET /road-rules       │            ▼              │
                 │         socket.io "hazard:upsert" ◄── NestJS ──► PostGIS   │
                 │                                    │                      │
                 │                                  Redis (pub/sub nhiều máy chủ)
                 └──────────────────────────────────────────────────────────┘
```

Lợi ích:
- Cảnh báo **giống hệt nhau** dù có mạng hay không, chỉ khác độ mới của dữ liệu.
- Mất sóng giữa đường: không lỗi, không treo. Báo cáo cộng đồng được xếp hàng (outbox), có sóng lại thì tự gửi.
- Kiểm thử dễ: logic cảnh báo là hàm thuần TypeScript (`packages/shared`), có kiểm thử tự động.

---

## 2. Tech stack đề xuất và so sánh với đề xuất của Gemini

| Hạng mục | Gemini đề xuất | Lựa chọn trong mã mẫu | Lý do |
|---|---|---|---|
| Ứng dụng di động | Chưa chốt (Android/Web App) | **React Native + Expo** | Viết bằng React/TypeScript như đã quen; dùng được GPS chạy nền, camera, SQLite, bản đồ offline – những thứ Web App (PWA) làm kém. *(Thay cho Flutter trong `KE_HOACH.md` vì đã có nền tảng React.)* |
| Bản đồ 2D/3D | Mapbox SDK / Goong SDK | **MapLibre** (`@maplibre/maplibre-react-native`, `maplibre-gl`) | Mã nguồn mở, nhánh miễn phí của Mapbox GL nên 3D (nghiêng, tòa nhà) tương đương; **có sẵn tải gói bản đồ offline**; đọc được style của Goong/Vietmap/MapTiler nên không bị khóa nhà cung cấp. Mapbox SDK v10+ tính phí theo lượt dùng. |
| Kiểu bản đồ (tile) | – | OpenFreeMap (mặc định, miễn phí) → về sau tự host PMTiles | Đổi bằng biến `EXPO_PUBLIC_MAP_STYLE_URL`. |
| Tìm đường online | GraphHopper/Valhalla | **Valhalla** trong Docker (đã để sẵn trong `docker-compose.yml`) | Hỗ trợ tốt ô tô, xe máy; một file dữ liệu OSM Việt Nam. |
| Tìm đường offline | GraphHopper/Valhalla trên máy | **Giai đoạn sau** (mục 5) | Phần khó nhất về kỹ thuật, cần module native – không nên làm ngay. |
| Dữ liệu biển báo | Thẻ OSM + YOLOv8 | Thẻ OSM (`tools/osm-import`) + khảo sát + cộng đồng; YOLO ở giai đoạn 3 (`ml/`) | Đúng hướng Gemini. Với YOLO nên dùng bản mới nhất của Ultralytics tại thời điểm triển khai. |
| Backend | **Firebase / Supabase** (serverless) | **NestJS + PostGIS + Redis** (Docker) | Xem so sánh mục 2.1. |
| Trang quản trị | – | **Next.js + Tailwind + maplibre-gl** | Duyệt báo cáo cộng đồng, sửa camera/biển báo. |
| Nhập dữ liệu, AI | – | **Python** (pyosmium, psycopg; Ultralytics YOLO) | |

### 2.1. Backend: Firebase vs Supabase vs NestJS tự dựng

| Tiêu chí | Firebase Realtime DB | Supabase | NestJS + PostGIS + Redis (chọn) |
|---|---|---|---|
| Truy vấn không gian ("camera trong 500 m", "đoạn đường trong bbox") | **Không có sẵn**, phải tự làm geohash | Có (Supabase là PostgreSQL + PostGIS) | Có, đầy đủ PostGIS |
| Realtime | Rất tốt | Tốt | Tốt (socket.io + Redis, đã viết sẵn) |
| Logic nghiệp vụ (gộp báo cáo trùng, chống spam, hết hạn) | Cloud Functions | Edge Functions / SQL | Code NestJS – **đã quen** |
| Vận hành | Không cần máy chủ | Không cần máy chủ (bản cloud) | Phải tự chạy Docker trên VPS |
| Chi phí khi lớn | Tăng theo lượt đọc – khó dự đoán | Trung bình | Cố định theo VPS |
| Dữ liệu đặt tại Việt Nam | Không (máy chủ nước ngoài) | Bản cloud: không. Tự host: có | **Có** (thuê VPS trong nước) |

**Kết luận:** Loại Firebase vì không có truy vấn không gian. Giữa Supabase và NestJS: chọn **NestJS + PostGIS** vì đã thành thạo và toàn quyền kiểm soát. Nếu muốn khỏi vận hành máy chủ, có thể chuyển sang Supabase sau mà **không phải sửa lược đồ dữ liệu**, vì cả hai đều là PostgreSQL + PostGIS.

> Về việc lưu trữ dữ liệu người dùng Việt Nam ở trong nước (Nghị định 53/2022/NĐ-CP, Luật Bảo vệ dữ liệu cá nhân): **tôi chưa chắc chắn** ứng dụng này có thuộc diện bắt buộc hay không – cần tham vấn pháp chế. Thiết kế hiện tại không lưu danh tính người dùng (chỉ mã thiết bị ngẫu nhiên).

---

## 3. Cấu trúc thư mục

```
Giao-thong-an-toan/
├── KE_HOACH.md                 # Kế hoạch tổng thể, lộ trình
├── docs/KIEN_TRUC.md           # Tài liệu này
├── package.json                # npm workspaces (monorepo)
├── docker-compose.yml          # PostGIS, Redis, API, Martin, (Valhalla)
├── .env.example
│
├── packages/
│   └── shared/                 # ★ Mã dùng chung mobile + web + backend
│       ├── src/types.ts        #   Kiểu HazardPoint, RoadRule, GpsFix, Warning
│       ├── src/geo.ts          #   Khoảng cách, góc phương vị, bbox
│       ├── src/mapMatching.ts  #   Gắn vị trí GPS vào đoạn đường
│       ├── src/warningEngine.ts#   ★ Bộ máy cảnh báo (tốc độ, ngược chiều, cấm vượt, điểm phía trước)
│       └── test/               #   Kiểm thử tự động (npm test)
│
├── apps/
│   ├── api/                    # Backend NestJS
│   │   └── src/
│   │       ├── main.ts         #   Khởi động, bật Redis adapter nếu có REDIS_URL
│   │       ├── database/       #   Kết nối PostgreSQL (pg Pool)
│   │       ├── common/bbox.ts  #   Kiểm tra tham số bbox, since
│   │       ├── hazards/        #   GET /hazards (đồng bộ tăng dần)
│   │       ├── road-rules/     #   GET /road-rules
│   │       ├── reports/        #   POST /reports, /reports/:id/vote (cộng đồng)
│   │       └── realtime/       #   socket.io: phòng theo ô lưới 0,1°
│   │
│   ├── mobile/                 # Ứng dụng Expo (Android/iOS)
│   │   ├── App.tsx
│   │   └── src/
│   │       ├── config/         #   API_URL, MAP_STYLE_URL
│   │       ├── db/localStore.ts#   ★ SQLite: hazards, road_rules, outbox, meta
│   │       ├── sync/           #   Đồng bộ REST + realtime + hàng đợi báo cáo
│   │       ├── location/       #   Đọc GPS
│   │       ├── warnings/       #   Nối GPS → engine → giọng nói
│   │       ├── offline/        #   Tải gói bản đồ + dữ liệu một vùng
│   │       └── screens/MapScreen.tsx  # Bản đồ 2D/3D, tốc độ, nút báo cáo
│   │
│   └── admin/                  # Trang quản trị Next.js + Tailwind
│       ├── app/
│       └── components/HazardMap.tsx
│
├── db/init/                    # SQL tạo bảng + dữ liệu mẫu (tự chạy khi khởi tạo Docker)
├── tools/osm-import/           # Python: nhập maxspeed/oneway/overtaking/camera từ OSM
└── ml/                         # (Giai đoạn 3) Huấn luyện YOLO nhận diện biển báo
```

---

## 4. Thiết kế đồng bộ dữ liệu

| Cơ chế | Cách làm | Ghi chú |
|---|---|---|
| Đồng bộ tăng dần | `GET /hazards?bbox=...&since=<serverTime lần trước>` | Chỉ tải bản ghi thay đổi; lưu `since` theo từng vùng |
| Xóa | Xóa mềm (`deleted_at`) → máy khách nhận `deleted: true` và xóa cục bộ | Xóa cứng thì máy khách không biết để xóa |
| Đồng hồ | Dùng `serverTime` do máy chủ trả về | Tránh sai lệch giờ trên điện thoại |
| Realtime | socket.io, máy khách `subscribe` theo bbox → vào các phòng ô lưới 0,1° (~11 km) | Chỉ nhận sự kiện gần mình, tiết kiệm pin, dữ liệu |
| Gửi báo cáo khi mất sóng | Ghi vào bảng `outbox`, gửi khi kết nối lại | Lỗi 4xx thì bỏ, không thử lại mãi |
| Báo cáo trùng | Cùng loại trong 50 m → tăng `confirmations` thay vì tạo điểm mới | |
| Báo cáo sai | `denials ≥ confirmations + 3` → tự xóa mềm | Chỉ áp dụng nguồn `community` |
| Hết hạn | CSGT 60 phút, tai nạn 120 phút, công trình 7 ngày; camera do cộng đồng báo: chờ kiểm duyệt | Sửa trong `reports.service.ts` |
| Chống spam | Tối đa 10 báo cáo/giờ/thiết bị | |

---

## 5. Tìm đường offline – hướng triển khai (giai đoạn sau)

| Phương án | Ưu điểm | Nhược điểm |
|---|---|---|
| **GraphHopper chạy trên Android** (thư viện Java, viết Expo Module bằng Kotlin) | GraphHopper viết bằng Java nên nhúng được vào Android; file đồ thị cho 1 tỉnh khá nhỏ | Phải viết module native; chỉ Android; cần kiểm tra phiên bản GraphHopper hiện tại còn hỗ trợ chạy trên Android hay không (**tôi chưa xác minh**) |
| Valhalla trên máy (thư viện C++) | Một bộ dữ liệu dùng cho cả máy chủ và điện thoại | Biên dịch C++ cho Android/iOS phức tạp |
| **Tính sẵn tuyến khi còn mạng** rồi lưu lại | Đơn giản nhất, làm ngay được | Không tìm lại được đường nếu đi chệch tuyến trong vùng mất sóng |

**Đề xuất:** Giai đoạn 1–2 dùng phương án 3 (gọi Valhalla trên máy chủ, lưu tuyến vào SQLite trước khi vào vùng lõi). Nghiên cứu phương án 1 song song cho nhu cầu tuần tra thực địa.

---

## 6. Hướng dẫn chạy thử

```bash
# 1. CSDL + Redis
docker compose up -d db redis

# 2. Backend
npm install
npm run dev:api            # http://localhost:3000/hazards?bbox=105.8,20.9,105.9,21.1

# 3. Trang quản trị
npm run dev:admin          # http://localhost:3002

# 4. Ứng dụng điện thoại (cần Android Studio hoặc điện thoại thật)
cd apps/mobile
npx expo prebuild          # sinh thư mục android/ (MapLibre cần native, không chạy được trên Expo Go)
npx expo run:android

# 5. Kiểm thử bộ máy cảnh báo
npm test

# 6. Nhập dữ liệu OSM
cd tools/osm-import && pip install -r requirements.txt
python import_osm.py vung.osm.pbf
```

### Đã kiểm tra khi viết mã mẫu
- `packages/shared`: 6/6 bài kiểm thử đạt (tốc độ, ngược chiều, camera phía trước/phía sau, hết hạn, chống đọc lặp).
- `apps/api`: biên dịch thành công; chạy với PostgreSQL 16 + PostGIS thật: đồng bộ, gộp báo cáo trùng, tự xóa khi bị phủ nhận, kiểm tra dữ liệu đầu vào, phát realtime qua socket.io đều hoạt động.
- `apps/mobile`: kiểm tra kiểu TypeScript đạt, Metro đóng gói Android thành công. **Chưa chạy trên điện thoại thật.**
- `apps/admin`: `next build` thành công.
- `tools/osm-import`: nhập thử file OSM mẫu thành công (đúng chiều đường một chiều `oneway=-1`).
