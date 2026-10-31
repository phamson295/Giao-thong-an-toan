/**
 * Bộ máy cảnh báo – chạy HOÀN TOÀN trên thiết bị, không cần mạng.
 * Mạng chỉ dùng để cập nhật dữ liệu (hazards, road rules) vào bộ nhớ cục bộ.
 *
 * Cách dùng: mỗi lần có GPS mới, gọi engine.update(fix, match, hazardsGần).
 * Kết quả là danh sách cảnh báo đang hiệu lực; giao diện tự lọc theo `key`
 * để mỗi cảnh báo chỉ đọc giọng nói một lần.
 */
import { angleDiff, bearingDeg, distanceM } from './geo';
import type { MatchResult } from './mapMatching';
import type { GpsFix, HazardPoint, HazardType, Warning } from './types';

export interface WarningConfig {
  /** Dung sai tốc độ trước khi cảnh báo (km/h). */
  overspeedToleranceKmh: number;
  /** Phải vượt tốc độ liên tục bao lâu mới cảnh báo (ms) – tránh nhiễu GPS. */
  overspeedHoldMs: number;
  /** Đi ngược chiều liên tục bao lâu mới cảnh báo (ms). */
  wrongWayHoldMs: number;
  /** Lệch hướng so với chiều cho phép để coi là ngược chiều (°). */
  wrongWayAngleDeg: number;
  /** Tầm nhìn trước tối thiểu (m); tăng theo tốc độ. */
  lookaheadMinM: number;
  /** Số giây xe chạy tới điểm cảnh báo – dùng tính tầm nhìn trước. */
  lookaheadSeconds: number;
  /** Điểm nằm trong nón ±x° phía trước mới cảnh báo. */
  aheadConeDeg: number;
  /** Độ chính xác GPS tệ hơn mức này thì bỏ qua cảnh báo tốc độ/ngược chiều. */
  maxAccuracyM: number;
}

export const DEFAULT_CONFIG: WarningConfig = {
  overspeedToleranceKmh: 3,
  overspeedHoldMs: 3_000,
  wrongWayHoldMs: 5_000,
  wrongWayAngleDeg: 120,
  lookaheadMinM: 300,
  lookaheadSeconds: 20,
  aheadConeDeg: 45,
  maxAccuracyM: 30,
};

const HAZARD_LABEL: Record<HazardType, string> = {
  speed_camera: 'camera giám sát tốc độ',
  red_light_camera: 'camera đèn đỏ',
  no_overtaking_start: 'biển cấm vượt',
  no_overtaking_end: 'biển hết cấm vượt',
  school: 'khu vực trường học',
  police_report: 'cảnh sát giao thông (cộng đồng báo)',
  accident_report: 'tai nạn (cộng đồng báo)',
  road_work_report: 'công trình, sạt lở (cộng đồng báo)',
};

/** Làm tròn khoảng cách cho dễ nghe: 287 m -> 300 m. */
function roundDistance(m: number): number {
  if (m < 100) return Math.round(m / 10) * 10;
  return Math.round(m / 50) * 50;
}

export class WarningEngine {
  private overspeedSince: number | null = null;
  private wrongWaySince: number | null = null;
  private cfg: WarningConfig;

  constructor(config: Partial<WarningConfig> = {}) {
    this.cfg = { ...DEFAULT_CONFIG, ...config };
  }

  update(fix: GpsFix, match: MatchResult | null, hazards: HazardPoint[]): Warning[] {
    const out: Warning[] = [];
    const reliable = fix.accuracyM <= this.cfg.maxAccuracyM;

    // 1. Vượt tốc độ
    const limit = match?.road.speedLimitCar ?? null;
    if (reliable && limit !== null && fix.speedKmh > limit + this.cfg.overspeedToleranceKmh) {
      this.overspeedSince ??= fix.timestamp;
      if (fix.timestamp - this.overspeedSince >= this.cfg.overspeedHoldMs) {
        out.push({
          kind: 'overspeed',
          severity: 'warn',
          message: `Bạn đang vượt tốc độ. Tốc độ tối đa ${limit} ki lô mét trên giờ`,
          key: `overspeed:${match!.road.id}:${limit}`,
        });
      }
    } else {
      this.overspeedSince = null;
    }

    // 2. Đi ngược chiều trên đường một chiều
    const wrongWayNow =
      reliable &&
      match !== null &&
      match.road.oneway &&
      fix.heading !== null &&
      fix.speedKmh > 5 &&
      angleDiff(fix.heading, match.segmentBearing) > this.cfg.wrongWayAngleDeg;
    if (wrongWayNow) {
      this.wrongWaySince ??= fix.timestamp;
      if (fix.timestamp - this.wrongWaySince >= this.cfg.wrongWayHoldMs) {
        out.push({
          kind: 'wrong_way',
          severity: 'danger',
          message: 'Cảnh báo! Bạn đang đi ngược chiều đường một chiều',
          key: `wrong_way:${match!.road.id}`,
        });
      }
    } else {
      this.wrongWaySince = null;
    }

    // 3. Đang trong đoạn cấm vượt
    if (match?.road.noOvertaking) {
      out.push({
        kind: 'no_overtaking_zone',
        severity: 'info',
        message: 'Đoạn đường cấm vượt',
        key: `no_overtaking:${match.road.id}`,
      });
    }

    // 4. Điểm cảnh báo phía trước
    out.push(...this.hazardsAhead(fix, hazards));
    return out;
  }

  private hazardsAhead(fix: GpsFix, hazards: HazardPoint[]): Warning[] {
    if (fix.heading === null || fix.speedKmh < 5) return [];
    const lookahead = Math.max(
      this.cfg.lookaheadMinM,
      (fix.speedKmh / 3.6) * this.cfg.lookaheadSeconds,
    );
    const now = fix.timestamp;
    const result: Warning[] = [];

    for (const h of hazards) {
      if (h.deleted) continue;
      if (h.expiresAt && Date.parse(h.expiresAt) < now) continue;

      const d = distanceM(fix.lng, fix.lat, h.lng, h.lat);
      if (d > lookahead) continue;
      // Điểm phải nằm phía trước mũi xe
      const toHazard = bearingDeg(fix.lng, fix.lat, h.lng, h.lat);
      if (d > 30 && angleDiff(fix.heading, toHazard) > this.cfg.aheadConeDeg) continue;
      // Biển/camera có hướng: chỉ áp dụng cho xe đi cùng hướng
      if (h.heading !== null && angleDiff(fix.heading, h.heading) > this.cfg.aheadConeDeg) continue;

      const rounded = roundDistance(d);
      const valueText = h.value ? `, giới hạn ${h.value}` : '';
      // Chia 2 mốc: xa (>150 m) và gần (≤150 m) => key khác nhau => đọc 2 lần.
      const stage = d > 150 ? 'far' : 'near';
      result.push({
        kind: 'hazard_ahead',
        severity: h.type.endsWith('_camera') || h.type === 'accident_report' ? 'warn' : 'info',
        message: `Phía trước ${rounded} mét có ${HAZARD_LABEL[h.type]}${valueText}`,
        key: `hazard:${h.id}:${stage}`,
        hazardId: h.id,
        distanceM: Math.round(d),
      });
    }
    return result.sort((a, b) => (a.distanceM ?? 0) - (b.distanceM ?? 0));
  }
}

/**
 * Bộ lọc chống đọc lặp: trả về các cảnh báo CHƯA từng đọc.
 * Một key được phép đọc lại sau `repeatAfterMs` (mặc định 2 phút).
 */
export class AnnouncementFilter {
  private spoken = new Map<string, number>();
  constructor(private repeatAfterMs = 120_000) {}

  pickNew(warnings: Warning[], now: number): Warning[] {
    const fresh = warnings.filter((w) => {
      const last = this.spoken.get(w.key);
      return last === undefined || now - last > this.repeatAfterMs;
    });
    for (const w of fresh) this.spoken.set(w.key, now);
    return fresh;
  }
}
