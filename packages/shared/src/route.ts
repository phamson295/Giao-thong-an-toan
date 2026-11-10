/**
 * Tuyến đường và chỉ dẫn từng chặng.
 *  - Đọc kết quả tìm đường của máy chủ Valhalla, tự soạn câu chỉ dẫn tiếng Việt.
 *  - Theo dõi tiến độ trên tuyến (còn bao xa, chặng rẽ kế tiếp, có đi chệch không).
 * Tất cả là hàm thuần, chạy trên máy => tuyến đã lưu vẫn dẫn được khi mất sóng.
 */
import { distanceM, projectOnSegment } from './geo';

export interface RouteStep {
  /** Câu chỉ dẫn tiếng Việt, ví dụ "Rẽ phải vào Đường Láng". */
  instruction: string;
  /** Mã loại chỉ dẫn của Valhalla (10 = rẽ phải, 15 = rẽ trái...). */
  type: number;
  /** Vị trí điểm rẽ trong mảng coords. */
  startIndex: number;
  /** Chiều dài chặng sau điểm rẽ (m). */
  distanceM: number;
}

export interface Destination {
  lng: number;
  lat: number;
  name: string;
}

export interface Route {
  coords: [number, number][];
  /** Quãng đường cộng dồn tới từng điểm của coords (m). */
  cumM: number[];
  steps: RouteStep[];
  distanceM: number;
  durationS: number;
  destination: Destination;
}

/** Giải mã chuỗi polyline (Valhalla dùng độ chính xác 6 chữ số). Trả về [lng, lat][]. */
export function decodePolyline(str: string, precision = 6): [number, number][] {
  const factor = 10 ** precision;
  const out: [number, number][] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < str.length) {
    for (const which of [0, 1]) {
      let result = 0, shift = 0, byte: number;
      do {
        byte = str.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20 && index < str.length);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (which === 0) lat += delta;
      else lng += delta;
    }
    out.push([lng / factor, lat / factor]);
  }
  return out;
}

function cumulative(coords: [number, number][]): number[] {
  const cum = [0];
  for (let i = 1; i < coords.length; i++) {
    cum.push(cum[i - 1] + distanceM(coords[i - 1][0], coords[i - 1][1], coords[i][0], coords[i][1]));
  }
  return cum;
}

/** Câu chỉ dẫn theo mã loại của Valhalla. */
const MANEUVER_TEXT: Record<number, string> = {
  1: 'Bắt đầu đi', 2: 'Bắt đầu đi', 3: 'Bắt đầu đi',
  4: 'Đã đến điểm đến', 5: 'Điểm đến ở bên phải', 6: 'Điểm đến ở bên trái',
  7: 'Đi thẳng', 8: 'Đi thẳng', 22: 'Đi thẳng',
  9: 'Chếch sang phải', 10: 'Rẽ phải', 11: 'Ngoặt gấp sang phải',
  12: 'Quay đầu', 13: 'Quay đầu',
  14: 'Ngoặt gấp sang trái', 15: 'Rẽ trái', 16: 'Chếch sang trái',
  17: 'Đi thẳng vào đường nhánh', 18: 'Vào đường nhánh bên phải', 19: 'Vào đường nhánh bên trái',
  20: 'Ra theo lối bên phải', 21: 'Ra theo lối bên trái',
  23: 'Đi về bên phải', 24: 'Đi về bên trái',
  25: 'Nhập làn', 26: 'Vào vòng xuyến', 27: 'Ra khỏi vòng xuyến',
  28: 'Lên phà', 29: 'Xuống phà',
};
const ARRIVE_TYPES = [4, 5, 6];
const NO_STREET_TYPES = [...ARRIVE_TYPES, 12, 13, 25, 27, 28, 29];

function instructionFor(m: any): string {
  const base = MANEUVER_TEXT[m.type] ?? 'Đi tiếp';
  if (m.type === 26 && m.roundabout_exit_count) {
    return `Vào vòng xuyến, đi theo lối ra thứ ${m.roundabout_exit_count}`;
  }
  const street: string | undefined = m.street_names?.[0];
  if (!street || NO_STREET_TYPES.includes(m.type)) return base;
  if ([1, 2, 3, 7, 8, 22].includes(m.type)) return `${base} trên ${street}`;
  return `${base} vào ${street}`;
}

/** Chuyển kết quả /route của Valhalla thành Route. Ném lỗi nếu không có tuyến. */
export function parseValhallaRoute(json: any, destination: Destination): Route {
  const legs: any[] | undefined = json?.trip?.legs;
  if (!legs?.length) throw new Error(json?.error ?? 'Không tìm được đường đi');

  const coords: [number, number][] = [];
  const steps: RouteStep[] = [];
  for (const leg of legs) {
    const offset = coords.length;
    coords.push(...decodePolyline(leg.shape));
    for (const m of leg.maneuvers ?? []) {
      steps.push({
        instruction: instructionFor(m),
        type: m.type,
        startIndex: offset + (m.begin_shape_index ?? 0),
        distanceM: Math.round((m.length ?? 0) * 1000),
      });
    }
  }
  if (coords.length < 2) throw new Error('Không tìm được đường đi');
  const cumM = cumulative(coords);
  return {
    coords,
    cumM,
    steps,
    distanceM: cumM[cumM.length - 1],
    durationS: json.trip.summary?.time ?? 0,
    destination,
  };
}

export interface RouteProgress {
  /** Khoảng cách từ xe tới tuyến (m). Lớn => đã đi chệch. */
  offRouteM: number;
  /** Chỉ số đoạn gần nhất – truyền lại lần sau để tìm nhanh. */
  segmentIndex: number;
  remainingM: number;
  remainingS: number;
  /** Chặng rẽ kế tiếp (null khi đã qua hết). */
  nextStep: RouteStep | null;
  nextStepIndex: number;
  distanceToNextStepM: number;
  arrived: boolean;
}

/**
 * Xác định xe đang ở đâu trên tuyến.
 * @param hint segmentIndex của lần gọi trước (tìm quanh đó trước, tránh nhảy sang đoạn tuyến
 *             đi qua cùng chỗ lần thứ hai).
 */
export function routeProgress(route: Route, lng: number, lat: number, hint = 0): RouteProgress {
  const { coords, cumM } = route;
  const p: [number, number] = [lng, lat];

  const search = (from: number, to: number) => {
    let best = { distanceM: Infinity, t: 0, i: from };
    for (let i = Math.max(0, from); i < Math.min(coords.length - 1, to); i++) {
      const r = projectOnSegment(p, coords[i], coords[i + 1]);
      if (r.distanceM < best.distanceM) best = { ...r, i };
    }
    return best;
  };
  let best = search(hint - 3, hint + 60);
  if (best.distanceM > 60) best = search(0, coords.length - 1); // lạc xa => tìm toàn tuyến

  const along = cumM[best.i] + best.t * (cumM[best.i + 1] - cumM[best.i]);
  const remainingM = Math.max(0, route.distanceM - along);
  const nextStepIndex = route.steps.findIndex((s) => cumM[s.startIndex] > along + 5);
  const nextStep = nextStepIndex >= 0 ? route.steps[nextStepIndex] : null;

  return {
    offRouteM: best.distanceM,
    segmentIndex: best.i,
    remainingM,
    remainingS: route.distanceM > 0 ? (route.durationS * remainingM) / route.distanceM : 0,
    nextStep,
    nextStepIndex,
    distanceToNextStepM: nextStep ? cumM[nextStep.startIndex] - along : remainingM,
    arrived: remainingM < 30 && best.distanceM < 50,
  };
}

export interface NavPrompt {
  key: string;
  message: string;
}

/**
 * Câu nhắc bằng giọng nói cho chặng rẽ kế tiếp: nhắc trước từ xa, rồi nhắc lại khi tới nơi.
 * Dùng chung AnnouncementFilter để mỗi câu chỉ đọc một lần.
 */
export function navigationPrompts(progress: RouteProgress, speedKmh: number): NavPrompt[] {
  if (progress.arrived) return [{ key: 'nav:arrived', message: 'Bạn đã đến nơi' }];
  const step = progress.nextStep;
  if (!step) return [];
  const d = progress.distanceToNextStepM;
  // Nhắc trước khoảng 20 giây chạy xe, tối thiểu 200 m
  const farAt = Math.max(200, (speedKmh / 3.6) * 20);
  const arriving = ARRIVE_TYPES.includes(step.type);
  if (d <= 40) return [{ key: `nav:${progress.nextStepIndex}:near`, message: step.instruction }];
  if (d <= farAt) {
    const rounded = d < 100 ? Math.round(d / 10) * 10 : Math.round(d / 50) * 50;
    const text = arriving ? 'sẽ đến điểm đến' : lowerFirst(step.instruction);
    return [{ key: `nav:${progress.nextStepIndex}:far`, message: `Còn ${rounded} mét, ${text}` }];
  }
  return [];
}

const lowerFirst = (s: string) => s.charAt(0).toLocaleLowerCase('vi') + s.slice(1);

/** Hiển thị quãng đường: 850 m, 1,2 km, 35 km. */
export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m / 10) * 10} m`;
  if (m < 10_000) return `${(m / 1000).toFixed(1).replace('.', ',')} km`;
  return `${Math.round(m / 1000)} km`;
}

/** Hiển thị thời gian: 5 phút, 1 giờ 20 phút. */
export function formatDuration(s: number): string {
  const min = Math.max(1, Math.round(s / 60));
  if (min < 60) return `${min} phút`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} giờ ${m} phút` : `${h} giờ`;
}

/**
 * Đọc tọa độ người dùng gõ tay: "21.0285, 105.8542" hoặc "21.0285 105.8542" (vĩ độ trước).
 * Trả về null nếu không phải tọa độ hợp lệ.
 */
export function parseLatLng(text: string): { lat: number; lng: number } | null {
  const m = text.trim().match(/^(-?\d{1,2}(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:[.,]\d+)?)$/);
  if (!m) return null;
  const lat = Number(m[1].replace(',', '.'));
  const lng = Number(m[2].replace(',', '.'));
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}
