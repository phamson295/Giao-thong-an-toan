import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { bearingDeg, distanceM, type GpsFix } from '@gtat/shared';

/**
 * Theo dõi GPS liên tục (1 giây/lần), chuẩn hóa về kiểu GpsFix dùng chung.
 *
 * Một số máy (và trình giả lập Android khi phát lại file GPX) không trả về
 * tốc độ/hướng => tự tính từ 2 lần đọc liên tiếp.
 */
export function useGps(): { fix: GpsFix | null; error: string | null } {
  const [fix, setFix] = useState<GpsFix | null>(null);
  const [error, setError] = useState<string | null>(null);
  const prev = useRef<{ lng: number; lat: number; t: number } | null>(null);

  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Chưa cấp quyền vị trí');
        return;
      }
      const s = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 },
        (loc) => {
          const { longitude, latitude, speed, heading, accuracy } = loc.coords;
          const p = prev.current;
          prev.current = { lng: longitude, lat: latitude, t: loc.timestamp };

          // Tốc độ: ưu tiên giá trị GPS, nếu không có thì tính từ quãng đường / thời gian
          let speedKmh = speed !== null && speed > 0 ? speed * 3.6 : 0;
          let moved = 0;
          if (p) {
            moved = distanceM(p.lng, p.lat, longitude, latitude);
            const dt = (loc.timestamp - p.t) / 1000;
            if (speedKmh === 0 && dt > 0 && dt < 10) speedKmh = (moved / dt) * 3.6;
          }

          // Hướng: ưu tiên GPS, nếu không có thì lấy góc giữa 2 điểm (khi đã đi > 3 m)
          let dir: number | null = heading !== null && heading > 0 ? heading : null;
          if (dir === null && p && moved > 3) dir = bearingDeg(p.lng, p.lat, longitude, latitude);

          setFix({
            lng: longitude,
            lat: latitude,
            speedKmh,
            heading: speedKmh > 3 ? dir : null, // đứng yên thì hướng không đáng tin
            accuracyM: accuracy ?? 999,
            timestamp: loc.timestamp,
          });
        },
        (reason) => setError(String(reason)),
      );
      if (cancelled) s.remove();
      else sub = s;
    })();
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, []);

  return { fix, error };
}
