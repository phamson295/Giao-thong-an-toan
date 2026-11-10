/**
 * Cài đặt của người dùng – lưu trong SQLite (bảng meta) nên giữ nguyên sau khi tắt app.
 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { HazardType, VehicleType } from '@gtat/shared';
import { getJsonMeta, setJsonMeta } from '../db/localStore';

export interface Settings {
  vehicle: VehicleType;
  /** Cho phép vượt giới hạn bao nhiêu km/h mới cảnh báo. */
  toleranceKmh: number;
  /** Đọc cảnh báo bằng giọng nói. */
  voice: boolean;
  alertCameras: boolean;
  alertSigns: boolean;
  alertCommunity: boolean;
  /** Mở app ở chế độ 3D. */
  start3D: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  vehicle: 'car',
  toleranceKmh: 3,
  voice: true,
  alertCameras: true,
  alertSigns: true,
  alertCommunity: true,
  start3D: true,
};

/** Các loại điểm cảnh báo bị tắt theo cài đặt. */
export function mutedTypes(s: Settings): HazardType[] {
  const out: HazardType[] = [];
  if (!s.alertCameras) out.push('speed_camera', 'red_light_camera');
  if (!s.alertSigns) out.push('no_overtaking_start', 'no_overtaking_end', 'school');
  if (!s.alertCommunity) out.push('police_report', 'accident_report', 'road_work_report');
  return out;
}

interface Ctx {
  settings: Settings;
  loaded: boolean;
  update: (patch: Partial<Settings>) => void;
}
const SettingsContext = createContext<Ctx>({ settings: DEFAULT_SETTINGS, loaded: false, update: () => undefined });

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getJsonMeta<Partial<Settings>>('settings', {})
      .then((saved) => setSettings({ ...DEFAULT_SETTINGS, ...saved }))
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      setJsonMeta('settings', next).catch(() => undefined);
      return next;
    });
  }, []);

  return <SettingsContext.Provider value={{ settings, loaded, update }}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);
