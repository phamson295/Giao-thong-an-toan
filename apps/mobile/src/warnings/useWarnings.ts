import { useEffect, useRef, useState } from 'react';
import {
  AnnouncementFilter, WarningEngine, matchRoad,
  type GpsFix, type HazardPoint, type MatchResult, type Warning,
} from '@gtat/shared';
import { LOCAL_QUERY_RADIUS_M } from '../config';
import { hazardsNear, roadRulesNear } from '../db/localStore';
import { mutedTypes, type Settings } from '../settings/settings';

/**
 * Nối GPS -> dữ liệu cục bộ -> bộ máy cảnh báo -> giọng nói.
 * Không gọi mạng: chạy được cả ở vùng không có sóng.
 */
export function useWarnings(fix: GpsFix | null, settings: Settings, speak: (text: string) => void) {
  const engine = useRef(new WarningEngine());
  const filter = useRef(new AnnouncementFilter());
  const busy = useRef(false);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [match, setMatch] = useState<MatchResult | null>(null);
  /** Các điểm cảnh báo quanh xe (dùng để hỏi người dùng xác nhận khi đi qua). */
  const [nearby, setNearby] = useState<HazardPoint[]>([]);

  useEffect(() => {
    engine.current.setConfig({
      vehicle: settings.vehicle,
      overspeedToleranceKmh: settings.toleranceKmh,
      mutedHazardTypes: mutedTypes(settings),
    });
  }, [settings]);

  useEffect(() => {
    if (!fix || busy.current) return; // bỏ qua nếu lần xử lý trước chưa xong
    busy.current = true;
    (async () => {
      try {
        const [roads, hazards] = await Promise.all([
          roadRulesNear(fix.lng, fix.lat),
          hazardsNear(fix.lng, fix.lat, LOCAL_QUERY_RADIUS_M),
        ]);
        const m = matchRoad(fix, roads);
        const ws = engine.current.update(fix, m, hazards);
        setMatch(m);
        setWarnings(ws);
        setNearby(hazards);

        // Đọc cảnh báo mới, ưu tiên mức nguy hiểm
        const fresh = filter.current
          .pickNew(ws.filter((w) => w.severity !== 'info' || w.kind === 'hazard_ahead'), fix.timestamp)
          .sort((a, b) => (a.severity === 'danger' ? -1 : b.severity === 'danger' ? 1 : 0));
        for (const w of fresh) speak(w.message);
      } catch {
        // Lỗi đọc CSDL cục bộ: bỏ qua lượt này, lượt GPS sau thử lại
      } finally {
        busy.current = false;
      }
    })();
  }, [fix]);

  return { warnings, match, nearby };
}
