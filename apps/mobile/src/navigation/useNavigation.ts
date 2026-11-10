/**
 * Quản lý tuyến đang dẫn: tìm đường, lưu tuyến vào máy, theo dõi tiến độ,
 * nhắc rẽ bằng giọng nói, tự tìm lại đường khi đi chệch (nếu có mạng).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AnnouncementFilter, navigationPrompts, routeProgress,
  type Destination, type GpsFix, type Route, type RouteProgress, type VehicleType,
} from '@gtat/shared';
import { OFF_ROUTE_M } from '../config';
import { getJsonMeta, removeMeta, setJsonMeta } from '../db/localStore';
import { fetchRoute } from './routing';

const ROUTE_KEY = 'active_route';
const RECENT_KEY = 'recent_destinations';
/** Đi chệch liên tục bao lâu thì tìm lại đường (ms). */
const OFF_ROUTE_HOLD_MS = 8_000;

export interface NavigationState {
  route: Route | null;
  progress: RouteProgress | null;
  /** Đang tìm đường (hiện vòng chờ). */
  loading: boolean;
  offRoute: boolean;
  error: string | null;
  recent: Destination[];
  start: (to: Destination) => Promise<void>;
  stop: () => void;
}

export function useNavigation(
  fix: GpsFix | null,
  vehicle: VehicleType,
  online: boolean,
  speak: (text: string) => void,
): NavigationState {
  const [route, setRoute] = useState<Route | null>(null);
  const [progress, setProgress] = useState<RouteProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [offRoute, setOffRoute] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<Destination[]>([]);

  const filter = useRef(new AnnouncementFilter(10 * 60_000));
  const hint = useRef(0);
  const offSince = useRef<number | null>(null);
  const rerouting = useRef(false);
  const fixRef = useRef(fix);
  fixRef.current = fix;

  // Mở app: khôi phục tuyến đang dẫn dở (ví dụ app bị tắt giữa vùng mất sóng)
  useEffect(() => {
    getJsonMeta<Route | null>(ROUTE_KEY, null).then((r) => r?.coords?.length && setRoute(r)).catch(() => undefined);
    getJsonMeta<Destination[]>(RECENT_KEY, []).then(setRecent).catch(() => undefined);
  }, []);

  const apply = useCallback((r: Route | null) => {
    hint.current = 0;
    offSince.current = null;
    filter.current = new AnnouncementFilter(10 * 60_000);
    setOffRoute(false);
    setProgress(null);
    setRoute(r);
    (r ? setJsonMeta(ROUTE_KEY, r) : removeMeta(ROUTE_KEY)).catch(() => undefined);
  }, []);

  const start = useCallback(async (to: Destination) => {
    const here = fixRef.current;
    if (!here) {
      setError('Chưa xác định được vị trí hiện tại');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await fetchRoute(here, to, vehicle);
      apply(r);
      speak(`Bắt đầu dẫn đường tới ${to.name.split(',')[0]}`);
      setRecent((prev) => {
        const next = [to, ...prev.filter((d) => d.name !== to.name)].slice(0, 8);
        setJsonMeta(RECENT_KEY, next).catch(() => undefined);
        return next;
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(/abort|network|fetch/i.test(msg) ? 'Không kết nối được máy chủ tìm đường. Cần có mạng để tìm đường.' : msg);
    } finally {
      setLoading(false);
    }
  }, [vehicle, apply, speak]);

  const stop = useCallback(() => apply(null), [apply]);

  // Mỗi lần có GPS: cập nhật tiến độ, nhắc rẽ, kiểm tra đi chệch
  useEffect(() => {
    if (!fix || !route) return;
    const p = routeProgress(route, fix.lng, fix.lat, hint.current);
    hint.current = p.segmentIndex;
    setProgress(p);

    if (p.arrived) {
      speak('Bạn đã đến nơi');
      apply(null);
      return;
    }

    const isOff = p.offRouteM > OFF_ROUTE_M && fix.accuracyM < 40;
    if (!isOff) {
      offSince.current = null;
      setOffRoute(false);
      for (const w of filter.current.pickNew(
        navigationPrompts(p, fix.speedKmh).map((n) => ({ ...n, kind: 'hazard_ahead' as const, severity: 'info' as const })),
        fix.timestamp,
      )) speak(w.message);
      return;
    }

    offSince.current ??= fix.timestamp;
    if (fix.timestamp - offSince.current < OFF_ROUTE_HOLD_MS) return;
    if (!offRoute) {
      setOffRoute(true);
      speak(online ? 'Bạn đã đi chệch tuyến. Đang tìm lại đường' : 'Bạn đã đi chệch tuyến. Hãy quay lại đường màu xanh');
    }
    if (online && !rerouting.current) {
      rerouting.current = true;
      fetchRoute(fix, route.destination, vehicle)
        .then(apply)
        .catch(() => undefined) // mất mạng: giữ tuyến cũ để người dùng tự quay lại
        .finally(() => setTimeout(() => (rerouting.current = false), 15_000));
    }
  }, [fix, route]);

  return { route, progress, loading, offRoute, error, recent, start, stop };
}
