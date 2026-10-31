/**
 * Kiểu dữ liệu dùng chung cho mobile, admin (web) và backend.
 * Quy ước tọa độ: lng (kinh độ), lat (vĩ độ) theo WGS84 – giống GeoJSON.
 */

/** Loại điểm cảnh báo. Các loại *_report là báo cáo cộng đồng, có thời hạn. */
export type HazardType =
  | 'speed_camera' // camera giám sát tốc độ
  | 'red_light_camera' // camera đèn đỏ
  | 'no_overtaking_start' // biển P.125 cấm vượt
  | 'no_overtaking_end' // biển hết cấm vượt
  | 'school' // khu vực trường học
  | 'police_report' // cộng đồng báo: CSGT
  | 'accident_report' // cộng đồng báo: tai nạn
  | 'road_work_report'; // cộng đồng báo: công trình, sạt lở

export type HazardSource = 'official' | 'osm' | 'community' | 'ai_camera';

export interface HazardPoint {
  id: string;
  type: HazardType;
  lng: number;
  lat: number;
  /** Hướng xe mà điểm này áp dụng (0–359°, 0 = Bắc). null = áp dụng mọi hướng. */
  heading: number | null;
  /** Giá trị kèm theo, ví dụ tốc độ giới hạn tại camera (km/h). */
  value: number | null;
  source: HazardSource;
  /** Số người xác nhận còn tồn tại (báo cáo cộng đồng). */
  confirmations: number;
  updatedAt: string; // ISO 8601
  expiresAt: string | null;
  /** Đã xóa (dùng khi đồng bộ để máy khách xóa bản ghi cục bộ). */
  deleted?: boolean;
}

/** Quy tắc giao thông của một đoạn đường (lấy từ OSM + khảo sát). */
export interface RoadRule {
  id: string;
  /** Danh sách tọa độ [lng, lat] theo thứ tự chiều vẽ của đoạn đường. */
  coords: [number, number][];
  /** Tốc độ tối đa ô tô (km/h). null = chưa có dữ liệu. */
  speedLimitCar: number | null;
  /** true = đường một chiều, chiều cho phép là chiều vẽ của coords. */
  oneway: boolean;
  noOvertaking: boolean;
  name?: string | null;
}

/** Một lần đọc GPS (đã chuẩn hóa từ expo-location / trình duyệt). */
export interface GpsFix {
  lng: number;
  lat: number;
  speedKmh: number;
  /** Hướng di chuyển (0–359°). null khi đứng yên hoặc GPS không cung cấp. */
  heading: number | null;
  accuracyM: number;
  timestamp: number; // ms
}

export type WarningKind =
  | 'overspeed'
  | 'wrong_way'
  | 'hazard_ahead'
  | 'no_overtaking_zone';

export interface Warning {
  kind: WarningKind;
  severity: 'info' | 'warn' | 'danger';
  /** Câu thông báo tiếng Việt, dùng cho màn hình và đọc bằng giọng nói. */
  message: string;
  /** Khóa chống lặp: cùng key thì giao diện chỉ đọc một lần. */
  key: string;
  hazardId?: string;
  distanceM?: number;
}

/** Khung chữ nhật [tây, nam, đông, bắc] – trùng quy ước của MapLibre. */
export type BBox = [west: number, south: number, east: number, north: number];
