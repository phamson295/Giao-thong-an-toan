/**
 * Màn hình chính: bản đồ 2D/3D + vị trí xe + điểm cảnh báo + bảng tốc độ.
 *
 * Luồng dữ liệu:
 *   GPS ─► useWarnings ─► SQLite cục bộ ─► WarningEngine ─► giọng nói + banner
 *   Cloud ─► syncService (khi có mạng) ─► SQLite cục bộ
 */
import NetInfo from '@react-native-community/netinfo';
import {
  Camera, GeoJSONSource, Layer, Map, UserLocation,
} from '@maplibre/maplibre-react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { bboxAround, distanceM, type HazardPoint, type HazardType } from '@gtat/shared';
import { MAP_STYLE_URL } from '../config';
import { hazardsNear } from '../db/localStore';
import { useGps } from '../location/useGps';
import { downloadRegion, regionAround } from '../offline/offlineRegion';
import { connectRealtime, report, subscribeArea, syncRegion } from '../sync/syncService';
import { useWarnings } from '../warnings/useWarnings';

/** Đồng bộ lại khi xe đi xa điểm đồng bộ trước hơn 3 km. */
const RESYNC_DISTANCE_M = 3000;

export function MapScreen() {
  useKeepAwake(); // giữ màn hình sáng khi đang dẫn đường
  const { fix, error } = useGps();
  const { warnings, match } = useWarnings(fix);
  const [is3D, setIs3D] = useState(true);
  const [online, setOnline] = useState(true);
  const [hazards, setHazards] = useState<HazardPoint[]>([]);
  const lastSyncAt = useRef<{ lng: number; lat: number } | null>(null);

  // Theo dõi trạng thái mạng
  useEffect(() => NetInfo.addEventListener((s) => setOnline(!!s.isInternetReachable)), []);

  // Kết nối realtime một lần; khi có điểm mới thì vẽ lại bản đồ
  const refreshMapHazards = useCallback(async () => {
    if (!fix) return;
    setHazards(await hazardsNear(fix.lng, fix.lat, 5000));
  }, [fix?.lng, fix?.lat]);

  useEffect(() => {
    const s = connectRealtime(() => void refreshMapHazards());
    return () => void s.disconnect();
  }, []);

  // Khi có mạng và xe đã đi xa: tải dữ liệu vùng xung quanh (10 km) + đăng ký realtime
  useEffect(() => {
    if (!fix) return;
    const last = lastSyncAt.current;
    const moved = !last || distanceM(last.lng, last.lat, fix.lng, fix.lat) > RESYNC_DISTANCE_M;
    if (moved && online) {
      lastSyncAt.current = { lng: fix.lng, lat: fix.lat };
      const area = bboxAround(fix.lng, fix.lat, 10_000);
      syncRegion(area).then(refreshMapHazards).catch(() => undefined);
      subscribeArea(area);
    } else if (moved || hazards.length === 0) {
      void refreshMapHazards();
    }
  }, [fix?.lng, fix?.lat, online]);

  const hazardGeoJson = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: hazards.map((h) => ({
        type: 'Feature',
        id: h.id,
        geometry: { type: 'Point', coordinates: [h.lng, h.lat] },
        properties: { type: h.type, community: h.source === 'community' },
      })),
    }),
    [hazards],
  );

  const speedLimit = match?.road.speedLimitCar ?? null;
  const speed = Math.round(fix?.speedKmh ?? 0);
  const overspeed = warnings.some((w) => w.kind === 'overspeed');
  const banner = warnings.find((w) => w.severity === 'danger') ?? warnings.find((w) => w.kind === 'hazard_ahead');

  const onReport = (type: HazardType) => {
    if (!fix) return;
    report(type, fix.lng, fix.lat, fix.heading)
      .then(refreshMapHazards)
      .catch(() => Alert.alert('Đã lưu', 'Báo cáo sẽ được gửi khi có mạng'));
  };

  const onDownload = () => {
    if (!fix) return;
    Alert.alert('Tải vùng offline', 'Tải bản đồ và dữ liệu cảnh báo bán kính 20 km quanh vị trí hiện tại?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Tải',
        onPress: () =>
          downloadRegion(`vung-${Date.now()}`, regionAround(fix.lng, fix.lat, 20), () => undefined)
            .then(() => Alert.alert('Xong', 'Đã tải vùng offline'))
            .catch((e) => Alert.alert('Lỗi', String(e))),
      },
    ]);
  };

  return (
    <View style={styles.root}>
      <Map style={styles.root} mapStyle={MAP_STYLE_URL} compass logo={false}>
        <Camera
          trackUserLocation="course"
          zoom={is3D ? 17 : 15}
          pitch={is3D ? 60 : 0}
          initialViewState={{ center: [105.85, 21.03], zoom: 13 }}
        />
        <UserLocation heading accuracy />

        <GeoJSONSource id="hazards" data={hazardGeoJson}>
          <Layer
            id="hazard-circles"
            type="circle"
            style={{
              circleRadius: 9,
              circleStrokeWidth: 2,
              circleStrokeColor: '#ffffff',
              circleColor: [
                'match', ['get', 'type'],
                'speed_camera', '#d32f2f',
                'red_light_camera', '#f57c00',
                'no_overtaking_start', '#1565c0',
                'police_report', '#6a1b9a',
                'accident_report', '#b71c1c',
                '#546e7a',
              ],
            }}
          />
        </GeoJSONSource>
      </Map>

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        {/* Thanh trạng thái */}
        <View style={styles.topRow}>
          <Text style={[styles.chip, { backgroundColor: online ? '#2e7d32' : '#616161' }]}>
            {online ? 'Online' : 'Offline – dùng dữ liệu đã tải'}
          </Text>
          {error && <Text style={[styles.chip, { backgroundColor: '#c62828' }]}>{error}</Text>}
        </View>

        {banner && (
          <View style={[styles.banner, banner.severity === 'danger' && styles.bannerDanger]}>
            <Text style={styles.bannerText}>{banner.message}</Text>
          </View>
        )}

        <View style={{ flex: 1 }} />

        {/* Tốc độ hiện tại + biển tốc độ tối đa */}
        <View style={styles.bottomRow}>
          <View style={[styles.speedBox, overspeed && styles.speedBoxOver]}>
            <Text style={styles.speedValue}>{speed}</Text>
            <Text style={styles.speedUnit}>km/h</Text>
          </View>
          {speedLimit !== null && (
            <View style={styles.limitSign}>
              <Text style={styles.limitText}>{speedLimit}</Text>
            </View>
          )}
          {match?.road.noOvertaking && <Text style={styles.noOvertake}>CẤM VƯỢT</Text>}

          <View style={{ flex: 1 }} />

          <View style={styles.buttons}>
            <Btn label={is3D ? '2D' : '3D'} onPress={() => setIs3D(!is3D)} />
            <Btn label="Báo CSGT" onPress={() => onReport('police_report')} />
            <Btn label="Báo tai nạn" onPress={() => onReport('accident_report')} />
            <Btn label="Tải offline" onPress={onDownload} />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function Btn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.btn} onPress={onPress}>
      <Text style={styles.btnText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFill, padding: 12 },
  topRow: { flexDirection: 'row', gap: 8 },
  chip: { color: '#fff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, overflow: 'hidden', fontSize: 13 },
  banner: { marginTop: 10, backgroundColor: '#f9a825', padding: 14, borderRadius: 10 },
  bannerDanger: { backgroundColor: '#c62828' },
  bannerText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  bottomRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  speedBox: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 4 },
  speedBoxOver: { backgroundColor: '#ffcdd2' },
  speedValue: { fontSize: 30, fontWeight: '800', color: '#212121' },
  speedUnit: { fontSize: 12, color: '#616161' },
  limitSign: { width: 64, height: 64, borderRadius: 32, borderWidth: 7, borderColor: '#d32f2f', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  limitText: { fontSize: 22, fontWeight: '800', color: '#212121' },
  noOvertake: { backgroundColor: '#fff', color: '#d32f2f', fontWeight: '800', padding: 6, borderRadius: 6 },
  buttons: { gap: 8 },
  btn: { backgroundColor: 'rgba(33,33,33,0.85)', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  btnText: { color: '#fff', fontWeight: '600' },
});
