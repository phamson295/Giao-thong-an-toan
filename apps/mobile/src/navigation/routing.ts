/**
 * Gọi dịch vụ ngoài: tìm địa điểm theo tên (Photon) và tìm đường (Valhalla).
 * Cả hai CẦN MẠNG. Tuyến tìm được sẽ được lưu vào máy để tiếp tục dẫn khi mất sóng.
 */
import { parseLatLng, parseValhallaRoute, type Destination, type Route, type VehicleType } from '@gtat/shared';
import { GEOCODER_URL, ROUTING_URL } from '../config';

async function fetchJson(url: string, init?: RequestInit, timeoutMs = 20_000): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new Error(body?.error ?? `Lỗi máy chủ (${res.status})`);
    return body;
  } finally {
    clearTimeout(timer);
  }
}

// Khung bao lãnh thổ Việt Nam – ưu tiên kết quả trong nước
const VN_BBOX = '102.1,8.3,109.7,23.5';

/**
 * Tìm địa điểm. Nếu người dùng gõ tọa độ ("21.03, 105.85") thì trả thẳng tọa độ, không cần mạng.
 * @param near vị trí hiện tại, để ưu tiên kết quả gần
 */
export async function searchPlaces(text: string, near?: { lng: number; lat: number }): Promise<Destination[]> {
  const coord = parseLatLng(text);
  if (coord) return [{ ...coord, name: `Tọa độ ${coord.lat.toFixed(5)}, ${coord.lng.toFixed(5)}` }];

  const params = [`q=${encodeURIComponent(text)}`, 'limit=8', `bbox=${VN_BBOX}`];
  if (near) params.push(`lat=${near.lat.toFixed(4)}`, `lon=${near.lng.toFixed(4)}`);
  const json = await fetchJson(`${GEOCODER_URL}/api/?${params.join('&')}`);

  return (json?.features ?? []).map((f: any): Destination => {
    const p = f.properties ?? {};
    const parts = [p.name, p.street, p.district, p.city ?? p.county, p.state].filter(Boolean);
    return {
      lng: f.geometry.coordinates[0],
      lat: f.geometry.coordinates[1],
      name: [...new Set(parts)].join(', ') || 'Địa điểm không tên',
    };
  });
}

/** Tìm đường từ vị trí hiện tại tới điểm đến. */
export async function fetchRoute(
  from: { lng: number; lat: number },
  to: Destination,
  vehicle: VehicleType,
): Promise<Route> {
  const json = await fetchJson(`${ROUTING_URL}/route`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      locations: [{ lat: from.lat, lon: from.lng }, { lat: to.lat, lon: to.lng }],
      // motor_scooter: tránh đường cao tốc, phù hợp xe máy ở Việt Nam
      costing: vehicle === 'moto' ? 'motor_scooter' : 'auto',
      units: 'kilometers',
    }),
  });
  return parseValhallaRoute(json, to);
}
