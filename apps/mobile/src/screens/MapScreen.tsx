/**
 * Màn hình chính: bản đồ 2D/3D + vị trí xe + tuyến dẫn đường + cảnh báo.
 *
 * Bố cục (ưu tiên nhìn nhanh, chạm ít khi đang lái):
 *   Trên   : ô tìm điểm đến  (hoặc thẻ chỉ dẫn rẽ khi đang dẫn đường) + dải cảnh báo
 *   Phải   : các nút tròn – về vị trí, 2D/3D, âm thanh, cài đặt
 *   Dưới   : tốc độ + biển giới hạn (trái), nút BÁO CÁO (phải), thanh quãng đường còn lại
 *
 * Luồng dữ liệu:
 *   GPS ─► useWarnings ─► SQLite cục bộ ─► WarningEngine ─► giọng nói + banner
 *   Cloud ─► syncService (khi có mạng) ─► SQLite cục bộ
 */
import NetInfo from '@react-native-community/netinfo';
import { Camera, GeoJSONSource, Layer, Map, UserLocation } from '@maplibre/maplibre-react-native';
import { useKeepAwake } from 'expo-keep-awake';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  bboxAround, distanceM, speedLimitFor,
  type Destination, type HazardPoint, type HazardType,
} from '@gtat/shared';
import { ConfirmHazardCard } from '../components/ConfirmHazardCard';
import { NavBottomBar, NavTopCard } from '../components/NavPanel';
import { ReportSheet } from '../components/ReportSheet';
import { RoundButton } from '../components/RoundButton';
import { SpeedPanel } from '../components/SpeedPanel';
import { C, TOUCH, shadow } from '../components/theme';
import { WarningBanner } from '../components/WarningBanner';
import { MAP_STYLE_URL } from '../config';
import { hazardsNear } from '../db/localStore';
import { useGps } from '../location/useGps';
import { useNavigation } from '../navigation/useNavigation';
import { useSettings } from '../settings/settings';
import { connectRealtime, report, subscribeArea, syncRegion, vote } from '../sync/syncService';
import { useWarnings } from '../warnings/useWarnings';
import { OfflineScreen } from './OfflineScreen';
import { SearchScreen } from './SearchScreen';
import { SettingsScreen } from './SettingsScreen';

/** Đồng bộ lại khi xe đi xa điểm đồng bộ trước hơn 3 km. */
const RESYNC_DISTANCE_M = 3000;
/** Đi qua điểm cộng đồng báo trong khoảng này (m) thì hỏi xác nhận. */
const CONFIRM_DISTANCE_M = 80;

type Panel = 'search' | 'settings' | 'offline' | 'report' | null;

export function MapScreen() {
  useKeepAwake(); // giữ màn hình sáng khi đang dẫn đường
  const { settings, loaded, update } = useSettings();
  const { fix, error: gpsError } = useGps();
  const [online, setOnline] = useState(true);
  const [is3D, setIs3D] = useState(true);
  const [following, setFollowing] = useState(true);
  const [panel, setPanel] = useState<Panel>(null);
  const [hazards, setHazards] = useState<HazardPoint[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [asking, setAsking] = useState<HazardPoint | null>(null);

  const lastSyncAt = useRef<{ lng: number; lat: number } | null>(null);
  const asked = useRef(new Set<string>());
  const ownReports = useRef<{ lng: number; lat: number; t: number }[]>([]);

  // Giọng nói: một chỗ duy nhất quyết định có đọc hay không
  const voiceRef = useRef(settings.voice);
  voiceRef.current = settings.voice;
  const speak = useCallback((text: string) => {
    if (voiceRef.current) Speech.speak(text, { language: 'vi-VN' });
  }, []);

  const { warnings, match, nearby } = useWarnings(fix, settings, speak);
  const nav = useNavigation(fix, settings.vehicle, online, speak);

  useEffect(() => {
    if (loaded) setIs3D(settings.start3D);
  }, [loaded]);

  useEffect(() => NetInfo.addEventListener((s) => setOnline(s.isInternetReachable !== false && !!s.isConnected)), []);

  const showToast = useCallback((text: string) => {
    setToast(text);
    setTimeout(() => setToast((cur) => (cur === text ? null : cur)), 3500);
  }, []);

  useEffect(() => {
    if (nav.error) Alert.alert('Chưa tìm được đường', nav.error);
  }, [nav.error]);

  // ----- Dữ liệu điểm cảnh báo trên bản đồ -----
  const refreshMapHazards = useCallback(async () => {
    if (!fix) return;
    setHazards(await hazardsNear(fix.lng, fix.lat, 5000).catch(() => []));
  }, [fix?.lng, fix?.lat]);
  const refreshRef = useRef(refreshMapHazards);
  refreshRef.current = refreshMapHazards;

  useEffect(() => {
    const s = connectRealtime(() => void refreshRef.current());
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
      syncRegion(area).catch(() => undefined).finally(() => void refreshRef.current());
      subscribeArea(area);
    } else if (moved || hazards.length === 0) {
      void refreshMapHazards();
    }
  }, [fix?.lng, fix?.lat, online]);

  // ----- Hỏi xác nhận khi đi qua điểm do cộng đồng báo -----
  useEffect(() => {
    if (!fix || asking || fix.speedKmh < 5 || !settings.alertCommunity) return;
    const now = Date.now();
    const candidate = nearby.find((h) =>
      h.source === 'community' &&
      h.type.endsWith('_report') &&
      !asked.current.has(h.id) &&
      distanceM(fix.lng, fix.lat, h.lng, h.lat) < CONFIRM_DISTANCE_M &&
      // không hỏi lại điểm chính mình vừa báo
      !ownReports.current.some((r) => now - r.t < 15 * 60_000 && distanceM(r.lng, r.lat, h.lng, h.lat) < 150));
    if (candidate) {
      asked.current.add(candidate.id);
      setAsking(candidate);
    }
  }, [fix, nearby]);

  const answerHazard = (stillThere: boolean | null) => {
    const h = asking;
    setAsking(null);
    if (!h || stillThere === null) return;
    vote(h.id, stillThere ? 'confirm' : 'deny').then(() => refreshRef.current()).catch(() => undefined);
    showToast('Cảm ơn bạn đã xác nhận');
  };

  // ----- Hành động của người dùng -----
  const onReport = (type: HazardType, label: string) => {
    setPanel(null);
    if (!fix) {
      showToast('Chưa có vị trí GPS – chưa gửi được báo cáo');
      return;
    }
    ownReports.current.push({ lng: fix.lng, lat: fix.lat, t: Date.now() });
    report(type, fix.lng, fix.lat, fix.heading).then(() => refreshRef.current()).catch(() => undefined);
    showToast(online ? `Đã gửi báo cáo: ${label}` : `Đã lưu báo cáo: ${label}. Sẽ gửi khi có mạng`);
  };

  const goTo = (d: Destination) => {
    setPanel(null);
    setFollowing(true);
    void nav.start(d);
  };

  const onLongPress = (lngLat: [number, number]) => {
    if (nav.loading) return;
    Alert.alert('Dẫn đường tới điểm này?', `${lngLat[1].toFixed(5)}, ${lngLat[0].toFixed(5)}`, [
      { text: 'Không', style: 'cancel' },
      { text: 'Dẫn đường', onPress: () => goTo({ lng: lngLat[0], lat: lngLat[1], name: 'Điểm đã chọn trên bản đồ' }) },
    ]);
  };

  const confirmStop = () =>
    Alert.alert('Kết thúc dẫn đường?', undefined, [
      { text: 'Tiếp tục đi', style: 'cancel' },
      { text: 'Kết thúc', style: 'destructive', onPress: nav.stop },
    ]);

  // ----- Dữ liệu vẽ lên bản đồ -----
  const hazardGeoJson = useMemo<GeoJSON.FeatureCollection>(() => ({
    type: 'FeatureCollection',
    features: hazards.map((h) => ({
      type: 'Feature',
      id: h.id,
      geometry: { type: 'Point', coordinates: [h.lng, h.lat] },
      properties: { type: h.type },
    })),
  }), [hazards]);

  const routeGeoJson = useMemo<GeoJSON.FeatureCollection>(() => ({
    type: 'FeatureCollection',
    features: nav.route
      ? [
          { type: 'Feature', properties: { kind: 'line' }, geometry: { type: 'LineString', coordinates: nav.route.coords } },
          { type: 'Feature', properties: { kind: 'dest' }, geometry: { type: 'Point', coordinates: [nav.route.destination.lng, nav.route.destination.lat] } },
        ]
      : [],
  }), [nav.route]);

  const limit = match ? speedLimitFor(match.road, settings.vehicle) : null;
  const overspeed = warnings.some((w) => w.kind === 'overspeed');
  const banner =
    warnings.find((w) => w.severity === 'danger') ??
    warnings.find((w) => w.kind === 'hazard_ahead') ??
    warnings.find((w) => w.kind === 'overspeed');
  const navigating = !!nav.route;

  return (
    <View style={styles.root}>
      <Map
        style={styles.root}
        mapStyle={MAP_STYLE_URL}
        compass={false}
        logo={false}
        onLongPress={(e) => onLongPress(e.nativeEvent.lngLat)}
      >
        <Camera
          trackUserLocation={following ? 'course' : undefined}
          onTrackUserLocationChange={(e) => {
            if (!e.nativeEvent.trackUserLocation) setFollowing(false); // người dùng kéo bản đồ
          }}
          zoom={is3D ? 17 : 15.5}
          pitch={is3D ? 60 : 0}
          initialViewState={{ center: [105.85, 21.03], zoom: 13 }}
        />
        <UserLocation heading accuracy />

        <GeoJSONSource id="route" data={routeGeoJson}>
          <Layer id="route-casing" type="line" filter={['==', ['get', 'kind'], 'line']}
            style={{ lineColor: '#0b3d91', lineWidth: 11, lineCap: 'round', lineJoin: 'round' }} />
          <Layer id="route-line" type="line" filter={['==', ['get', 'kind'], 'line']}
            style={{ lineColor: C.route, lineWidth: 7, lineCap: 'round', lineJoin: 'round' }} />
          <Layer id="route-dest" type="circle" filter={['==', ['get', 'kind'], 'dest']}
            style={{ circleRadius: 11, circleColor: '#d32f2f', circleStrokeWidth: 4, circleStrokeColor: '#ffffff' }} />
        </GeoJSONSource>

        <GeoJSONSource id="hazards" data={hazardGeoJson}>
          <Layer
            id="hazard-circles"
            type="circle"
            style={{
              circleRadius: 10,
              circleStrokeWidth: 3,
              circleStrokeColor: '#ffffff',
              circleColor: [
                'match', ['get', 'type'],
                'speed_camera', '#d32f2f',
                'red_light_camera', '#f57c00',
                'no_overtaking_start', '#1565c0',
                'police_report', '#6a1b9a',
                'accident_report', '#b71c1c',
                'road_work_report', '#ef6c00',
                '#546e7a',
              ],
            }}
          />
        </GeoJSONSource>
      </Map>

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        {/* ===== Trên: tìm kiếm / chỉ dẫn rẽ ===== */}
        {navigating ? (
          <NavTopCard progress={nav.progress} offRoute={nav.offRoute} online={online} />
        ) : (
          <Pressable style={styles.search} onPress={() => setPanel('search')} accessibilityRole="search" accessibilityLabel="Tìm điểm đến">
            <Text style={styles.searchIcon}>🔍</Text>
            <Text style={styles.searchText}>Bạn muốn đi đâu?</Text>
          </Pressable>
        )}

        <View style={styles.chips} pointerEvents="none">
          {!online && <Text style={[styles.chip, { backgroundColor: '#616161' }]}>Mất mạng – đang dùng dữ liệu đã tải</Text>}
          {gpsError && <Text style={[styles.chip, { backgroundColor: C.danger }]}>{gpsError}</Text>}
          {!gpsError && !fix && <Text style={[styles.chip, { backgroundColor: C.warn }]}>Đang tìm tín hiệu GPS…</Text>}
          {fix && fix.accuracyM > 30 && <Text style={[styles.chip, { backgroundColor: C.warn }]}>GPS yếu</Text>}
        </View>

        {banner && <View style={styles.gap}><WarningBanner warning={banner} /></View>}
        {nav.loading && (
          <View style={[styles.gap, styles.loading]}>
            <ActivityIndicator color={C.primary} />
            <Text style={styles.loadingText}>Đang tìm đường…</Text>
          </View>
        )}

        {/* ===== Giữa: cột nút bên phải ===== */}
        <View style={styles.middle} pointerEvents="box-none">
          <View style={styles.side}>
            {!following && <RoundButton icon="◎" label="Về vị trí của tôi" active onPress={() => setFollowing(true)} />}
            <RoundButton icon={is3D ? '2D' : '3D'} label={is3D ? 'Chuyển sang bản đồ 2D' : 'Chuyển sang bản đồ 3D'} onPress={() => setIs3D(!is3D)} />
            <RoundButton icon={settings.voice ? '🔊' : '🔇'} label={settings.voice ? 'Tắt giọng nói' : 'Bật giọng nói'}
              onPress={() => {
                if (settings.voice) Speech.stop();
                update({ voice: !settings.voice });
                showToast(settings.voice ? 'Đã tắt giọng nói' : 'Đã bật giọng nói');
              }} />
            <RoundButton icon="⚙️" label="Cài đặt" onPress={() => setPanel('settings')} />
          </View>
        </View>

        {/* ===== Dưới: xác nhận, tốc độ, báo cáo, thanh dẫn đường ===== */}
        {asking && <View style={styles.gap}><ConfirmHazardCard hazard={asking} onAnswer={answerHazard} /></View>}
        {toast && <Text style={styles.toast}>{toast}</Text>}

        <View style={styles.bottomRow} pointerEvents="box-none">
          <SpeedPanel
            speedKmh={fix?.speedKmh ?? 0}
            limit={limit}
            overspeed={overspeed}
            noOvertaking={!!match?.road.noOvertaking}
            gpsOk={!!fix}
          />
          <Pressable style={({ pressed }) => [styles.report, pressed && { opacity: 0.8 }]} onPress={() => setPanel('report')}
            accessibilityRole="button" accessibilityLabel="Báo cáo CSGT, tai nạn, công trình, camera">
            <Text style={styles.reportIcon}>⚠️</Text>
            <Text style={styles.reportText}>Báo cáo</Text>
          </Pressable>
        </View>

        {nav.route && <View style={styles.gap}><NavBottomBar route={nav.route} progress={nav.progress} onStop={confirmStop} /></View>}
      </SafeAreaView>

      <SearchScreen visible={panel === 'search'} onClose={() => setPanel(null)} onPick={goTo}
        recent={nav.recent} near={fix} online={online} />
      <SettingsScreen visible={panel === 'settings'} onClose={() => setPanel(null)} onOpenOffline={() => setPanel('offline')} />
      <OfflineScreen visible={panel === 'offline'} onClose={() => setPanel(null)} position={fix} online={online} />
      <ReportSheet visible={panel === 'report'} onClose={() => setPanel(null)} onPick={onReport} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFill, padding: 12 },
  gap: { marginTop: 10 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: TOUCH, borderRadius: TOUCH / 2, backgroundColor: C.card, paddingHorizontal: 20, ...shadow },
  searchIcon: { fontSize: 18 },
  searchText: { fontSize: 17, color: C.sub },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: { color: '#fff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, overflow: 'hidden', fontSize: 13, fontWeight: '600' },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'center', backgroundColor: C.card, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, ...shadow },
  loadingText: { fontSize: 15, color: C.text, fontWeight: '600' },
  middle: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  side: { gap: 12 },
  toast: { alignSelf: 'center', backgroundColor: C.dark, color: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, overflow: 'hidden', fontSize: 15, marginTop: 10, textAlign: 'center' },
  bottomRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 10 },
  report: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 64, paddingHorizontal: 22, borderRadius: 32, backgroundColor: C.warn, ...shadow },
  reportIcon: { fontSize: 24 },
  reportText: { color: '#fff', fontSize: 18, fontWeight: '800' },
});
