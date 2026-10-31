import * as Speech from 'expo-speech';
import { useEffect, useRef, useState } from 'react';
import {
  AnnouncementFilter, WarningEngine, matchRoad,
  type GpsFix, type MatchResult, type Warning,
} from '@gtat/shared';
import { LOCAL_QUERY_RADIUS_M } from '../config';
import { hazardsNear, roadRulesNear } from '../db/localStore';

/**
 * Nối GPS -> dữ liệu cục bộ -> bộ máy cảnh báo -> giọng nói.
 * Không gọi mạng: chạy được cả ở vùng không có sóng.
 */
export function useWarnings(fix: GpsFix | null) {
  const engine = useRef(new WarningEngine());
  const filter = useRef(new AnnouncementFilter());
  const busy = useRef(false);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [match, setMatch] = useState<MatchResult | null>(null);

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

        // Đọc cảnh báo mới, ưu tiên mức nguy hiểm
        const fresh = filter.current
          .pickNew(ws.filter((w) => w.severity !== 'info' || w.kind === 'hazard_ahead'), fix.timestamp)
          .sort((a, b) => (a.severity === 'danger' ? -1 : b.severity === 'danger' ? 1 : 0));
        for (const w of fresh) Speech.speak(w.message, { language: 'vi-VN' });
      } finally {
        busy.current = false;
      }
    })();
  }, [fix]);

  return { warnings, match };
}
