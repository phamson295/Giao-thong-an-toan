/**
 * Các hàm hình học trên mặt cầu, đủ chính xác cho khoảng cách vài km.
 */
import type { BBox } from './types';

const R = 6_371_000; // bán kính Trái Đất (m)
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

/** Khoảng cách giữa 2 điểm (mét) – công thức Haversine. */
export function distanceM(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Góc phương vị từ điểm 1 tới điểm 2 (0–360°, 0 = Bắc, 90 = Đông). */
export function bearingDeg(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lng2 - lng1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Độ lệch nhỏ nhất giữa 2 hướng (0–180°). */
export function angleDiff(a: number, b: number): number {
  const d = Math.abs(((a - b) % 360) + 360) % 360;
  return d > 180 ? 360 - d : d;
}

/**
 * Chiếu điểm P lên đoạn thẳng AB.
 * Trả về khoảng cách từ P tới đoạn (mét) và vị trí hình chiếu t (0 = tại A, 1 = tại B).
 * Chiếu phẳng cục bộ quanh P – sai số không đáng kể với đoạn < vài km.
 */
export function projectOnSegment(
  p: [number, number],
  a: [number, number],
  b: [number, number],
): { distanceM: number; t: number } {
  const kx = Math.cos(toRad(p[1])) * 111_320;
  const ky = 110_540;
  const ax = (a[0] - p[0]) * kx, ay = (a[1] - p[1]) * ky;
  const bx = (b[0] - p[0]) * kx, by = (b[1] - p[1]) * ky;
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2));
  return { distanceM: Math.hypot(ax + t * dx, ay + t * dy), t };
}

/** Khoảng cách từ điểm P tới đoạn thẳng AB (mét). */
export function distanceToSegmentM(
  p: [number, number],
  a: [number, number],
  b: [number, number],
): number {
  return projectOnSegment(p, a, b).distanceM;
}

/** Khung chữ nhật bao quanh một điểm với bán kính r mét. */
export function bboxAround(lng: number, lat: number, radiusM: number): BBox {
  const dLat = radiusM / 110_540;
  const dLng = radiusM / (111_320 * Math.cos(toRad(lat)));
  return [lng - dLng, lat - dLat, lng + dLng, lat + dLat];
}
