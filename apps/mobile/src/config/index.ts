/** Cấu hình – đọc từ biến môi trường EXPO_PUBLIC_* (xem .env.example ở thư mục gốc). */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3000'; // 10.0.2.2 = máy tính khi chạy giả lập Android

/**
 * Kiểu bản đồ (vector tile). Mặc định dùng OpenFreeMap (miễn phí, dữ liệu OSM, có tòa nhà 3D).
 * Có thể thay bằng style của Goong/Vietmap/MapTiler (cần API key) hoặc máy chủ tile riêng.
 */
export const MAP_STYLE_URL =
  process.env.EXPO_PUBLIC_MAP_STYLE_URL ?? 'https://tiles.openfreemap.org/styles/liberty';

/** Bán kính lấy điểm cảnh báo quanh xe từ CSDL cục bộ (m). */
export const LOCAL_QUERY_RADIUS_M = 1500;

/**
 * Máy chủ tìm đường (giao thức Valhalla). Mặc định là máy chủ công cộng của cộng đồng
 * OpenStreetMap Đức – CHỈ để thử nghiệm, giới hạn lượt dùng. Khi triển khai thật hãy trỏ
 * về máy chủ Valhalla riêng (đã để sẵn trong docker-compose.yml).
 */
export const ROUTING_URL = process.env.EXPO_PUBLIC_ROUTING_URL ?? 'https://valhalla1.openstreetmap.de';

/** Dịch vụ tìm địa điểm theo tên (giao thức Photon, dữ liệu OSM). Cũng chỉ để thử nghiệm. */
export const GEOCODER_URL = process.env.EXPO_PUBLIC_GEOCODER_URL ?? 'https://photon.komoot.io';

/** Lệch tuyến quá mức này (m) thì coi là đi chệch đường. */
export const OFF_ROUTE_M = 60;
