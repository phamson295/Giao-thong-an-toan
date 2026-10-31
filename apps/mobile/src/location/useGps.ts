import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import type { GpsFix } from '@gtat/shared';

/** Theo dõi GPS liên tục (1 giây/lần), chuẩn hóa về kiểu GpsFix dùng chung. */
export function useGps(): { fix: GpsFix | null; error: string | null } {
  const [fix, setFix] = useState<GpsFix | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Chưa cấp quyền vị trí');
        return;
      }
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 },
        (loc) => {
          const { longitude, latitude, speed, heading, accuracy } = loc.coords;
          const speedKmh = speed !== null && speed >= 0 ? speed * 3.6 : 0;
          setFix({
            lng: longitude,
            lat: latitude,
            speedKmh,
            // Khi đứng yên, hướng GPS không đáng tin
            heading: heading !== null && heading >= 0 && speedKmh > 3 ? heading : null,
            accuracyM: accuracy ?? 999,
            timestamp: loc.timestamp,
          });
        },
        (reason) => setError(String(reason)),
      );
    })();
    return () => sub?.remove();
  }, []);

  return { fix, error };
}
