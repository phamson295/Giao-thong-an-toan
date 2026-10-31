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
