# Bối cảnh dự án cho Claude

## Người dùng
- Công chức Chi cục Kiểm lâm. Ứng dụng phục vụ lái xe và tuần tra thực địa (vùng lõi rừng thường mất sóng).
- Trả lời **bằng tiếng Việt**, có cấu trúc, đi thẳng vấn đề, ưu tiên hướng dẫn từng bước làm được ngay.
- Có nhiều phương án thì so sánh ưu nhược điểm. Chưa chắc chắn thì nói rõ, không tự đoán.
- Máy tính: **Windows**. Dự án đặt tại `D:\AI_CLAUDE\giao-thong-app` (trong cmd dùng `cd /d` khi đổi ổ đĩa). Đã có JDK 21 và Android SDK (khoảng `D:\AI_CLAUDE\tools`, cần xác định thư mục con chứa `platform-tools`).

## Dự án
Ứng dụng dẫn đường và cảnh báo giao thông: tốc độ giới hạn, cấm vượt, ngược chiều, camera, báo cáo cộng đồng. Nguyên tắc **offline-first**: bộ máy cảnh báo chạy trên điện thoại, chỉ đọc SQLite cục bộ; cloud chỉ đồng bộ dữ liệu.

Tài liệu chính (đọc trước khi làm):
- `KE_HOACH.md` – kế hoạch, lộ trình, pháp lý, nhận diện biển báo bằng camera (mục 10)
- `docs/KIEN_TRUC.md` – tech stack, cấu trúc thư mục, thiết kế đồng bộ
- `docs/HUONG_DAN_CHAY_THU.md` – cài Android Studio, chạy thử, giả lập lái xe bằng GPX
- `docs/HUONG_DAN_TAO_APK.md` – build APK gửi đồng nghiệp
- `docs/HUONG_DAN_SU_DUNG.md` – hướng dẫn cho người dùng thử (bố cục màn hình, dẫn đường, báo cáo, offline)

## Cấu trúc (npm workspaces)
- `packages/shared` – bộ máy cảnh báo + kiểu dữ liệu (TypeScript thuần). Kiểm thử: `npm test`
- `apps/api` – NestJS + PostGIS (`pg` thuần) + Redis + socket.io. Chạy: `npm run dev:api`
- `apps/mobile` – Expo SDK 58, React Native 0.88, `@maplibre/maplibre-react-native` v11 (API mới: `Map`, `Camera`, `GeoJSONSource`, `Layer`), expo-sqlite. Chạy: `npm run android`
- `apps/admin` – Next.js 16 + Tailwind 4 + maplibre-gl v6 (import kiểu `import * as maplibregl`)
- `db/init` – lược đồ SQL; `tools/osm-import` – Python nhập OSM; `tools/gia-lap` – tuyến GPX giả lập

## Trạng thái (10/11/2026)
- Chức năng app: cảnh báo (tốc độ theo ô tô/xe máy, ngược chiều, cấm vượt, camera), tìm điểm đến + dẫn đường từng chặng (Valhalla/Photon, tuyến lưu SQLite để dẫn tiếp khi mất sóng), báo cáo cộng đồng + hỏi xác nhận khi đi qua, cài đặt, quản lý vùng offline.
- Đã kiểm tra: `npm install` ở gốc monorepo; shared 12/12 test; API chạy với PostGIS thật (trước khi thêm `speedLimitMoto`, sau đó chỉ typecheck); mobile typecheck + Metro bundle OK; admin typecheck OK.
- **Chưa** build APK, **chưa** chạy trên điện thoại thật => giao diện mới chưa được thử thực tế. Định dạng Valhalla/Photon đã thử với máy chủ thật (qua curl + mã `route.ts`), chưa thử từ trong app.
- Dữ liệu trong `db/init/002_seed.sql` là tọa độ giả lập.
- Máy chủ tìm đường/tìm địa điểm mặc định là dịch vụ công cộng nước ngoài, chỉ để thử (xem `docs/KIEN_TRUC.md` mục 7).

## Việc tiếp theo
1. Build APK trên máy Windows (mục 2 của `docs/HUONG_DAN_TAO_APK.md`), xử lý lỗi build nếu có.
2. Chạy thử trên điện thoại/máy ảo, giả lập tuyến GPX; thử tìm đường thật, sửa lỗi giao diện phát sinh.
3. Nhập dữ liệu OSM tỉnh thử nghiệm, đánh giá độ đầy đủ dữ liệu tốc độ.
4. Triển khai backend lên VPS (phương án C) khi cần thử nghiệm rộng.
