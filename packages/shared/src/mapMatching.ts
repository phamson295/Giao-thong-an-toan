/**
 * Map matching đơn giản: tìm đoạn đường mà xe đang đi trên đó.
 * Tiêu chí: gần vị trí GPS nhất và cùng phương với hướng di chuyển
 * (để không nhầm đường song song / cầu vượt cắt ngang).
 *
 * Bản sản xuất nên thay bằng thuật toán HMM (Hidden Markov Model) có dùng lịch sử vị trí.
 */
import { angleDiff, bearingDeg, distanceToSegmentM } from './geo';
import type { GpsFix, RoadRule } from './types';

export interface MatchResult {
  road: RoadRule;
  /** Hướng của đoạn con gần nhất, theo chiều vẽ của đường. */
  segmentBearing: number;
  distanceM: number;
}

export interface MatchOptions {
  /** Khoảng cách tối đa từ GPS tới tim đường (m). */
  maxDistanceM?: number;
  /** Lệch phương tối đa (°) – so cả 2 chiều vì xe có thể đi ngược chiều vẽ. */
  maxAxisDiffDeg?: number;
}

export function matchRoad(
  fix: GpsFix,
  roads: RoadRule[],
  { maxDistanceM = 25, maxAxisDiffDeg = 35 }: MatchOptions = {},
): MatchResult | null {
  let best: MatchResult | null = null;
  let bestScore = Infinity;
  const p: [number, number] = [fix.lng, fix.lat];

  for (const road of roads) {
    for (let i = 0; i < road.coords.length - 1; i++) {
      const a = road.coords[i];
      const b = road.coords[i + 1];
      const d = distanceToSegmentM(p, a, b);
      if (d > maxDistanceM) continue;

      const segBearing = bearingDeg(a[0], a[1], b[0], b[1]);
      let axisDiff = 0;
      if (fix.heading !== null && fix.speedKmh > 5) {
        const diff = angleDiff(fix.heading, segBearing);
        axisDiff = Math.min(diff, 180 - diff); // so phương, không so chiều
        if (axisDiff > maxAxisDiffDeg) continue;
      }
      // Điểm phạt: khoảng cách + lệch phương (1° ≈ 0,5 m)
      const score = d + axisDiff * 0.5;
      if (score < bestScore) {
        bestScore = score;
        best = { road, segmentBearing: segBearing, distanceM: d };
      }
    }
  }
  return best;
}
