import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Sheet } from '../components/Sheet';
import { C, TOUCH } from '../components/theme';
import { deleteRegion, downloadRegion, listRegions, regionAround, type SavedRegion } from '../offline/offlineRegion';

interface Props {
  visible: boolean;
  onClose: () => void;
  position: { lng: number; lat: number } | null;
  online: boolean;
}

const RADII = [10, 20, 50];

/** Tải và quản lý vùng bản đồ dùng khi mất sóng. */
export function OfflineScreen({ visible, onClose, position, online }: Props) {
  const [regions, setRegions] = useState<SavedRegion[]>([]);
  const [radius, setRadius] = useState(20);
  const [job, setJob] = useState<{ percent: number; dataDone: boolean } | null>(null);

  const refresh = useCallback(() => listRegions().then(setRegions).catch(() => setRegions([])), []);
  useEffect(() => {
    if (visible) void refresh();
  }, [visible]);

  const start = async () => {
    if (!position) return;
    const d = new Date();
    const name = `Vùng ${radius} km – ${d.getDate()}/${d.getMonth() + 1} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
    setJob({ percent: 0, dataDone: false });
    try {
      await downloadRegion(name, regionAround(position.lng, position.lat, radius), (p) =>
        setJob({ percent: p.mapPercent, dataDone: p.dataDone }));
      Alert.alert('Đã tải xong', 'Vùng này dùng được khi không có sóng.');
    } catch (e) {
      Alert.alert('Tải chưa xong', `${e instanceof Error ? e.message : e}\nPhần đã tải vẫn được giữ lại.`);
    } finally {
      setJob(null);
      void refresh();
    }
  };

  const remove = (r: SavedRegion) =>
    Alert.alert('Xóa vùng đã tải?', r.name, [
      { text: 'Giữ lại', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: () => deleteRegion(r.id).then(refresh).catch(() => undefined) },
    ]);

  const canStart = !!position && online && !job;
  return (
    <Sheet visible={visible} title="Bản đồ offline" onClose={onClose} full>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text style={styles.intro}>
          Trước khi vào vùng không có sóng, hãy tải bản đồ và dữ liệu cảnh báo quanh vị trí hiện tại.
          Nên tải bằng WiFi.
        </Text>

        <Text style={styles.label}>Bán kính tải</Text>
        <View style={styles.radii}>
          {RADII.map((r) => (
            <Pressable key={r} style={[styles.radius, r === radius && styles.radiusOn]} onPress={() => setRadius(r)} disabled={!!job}>
              <Text style={[styles.radiusText, r === radius && styles.radiusTextOn]}>{r} km</Text>
            </Pressable>
          ))}
        </View>
        {radius >= 50 && <Text style={styles.warn}>Vùng 50 km có thể nặng vài trăm MB và tải lâu.</Text>}

        <Pressable style={[styles.primary, !canStart && styles.disabled]} onPress={start} disabled={!canStart}>
          <Text style={styles.primaryText}>{job ? `Đang tải… ${job.percent}%` : '⬇️  Tải vùng quanh vị trí hiện tại'}</Text>
        </Pressable>
        {job && (
          <View>
            <View style={styles.barBg}><View style={[styles.bar, { width: `${job.percent}%` }]} /></View>
            <Text style={styles.sub}>
              Dữ liệu cảnh báo: {job.dataDone ? 'đã xong' : 'đang tải'} · Giữ màn hình này mở cho tới khi xong.
            </Text>
          </View>
        )}
        {!online && <Text style={styles.warn}>Đang mất mạng – không tải được vùng mới.</Text>}
        {!position && <Text style={styles.warn}>Chưa xác định được vị trí hiện tại.</Text>}

        <Text style={[styles.label, { marginTop: 28 }]}>Vùng đã tải ({regions.length})</Text>
        {regions.length === 0 && <Text style={styles.sub}>Chưa có vùng nào.</Text>}
        {regions.map((r) => (
          <View key={r.id} style={styles.region}>
            <View style={{ flex: 1 }}>
              <Text style={styles.regionName}>{r.name}</Text>
              <Text style={styles.sub}>{r.complete ? 'Đã tải đủ' : `Mới tải ${r.percent}%`} · {r.sizeMb} MB</Text>
            </View>
            <Pressable style={styles.del} onPress={() => remove(r)} accessibilityRole="button" accessibilityLabel={`Xóa ${r.name}`}>
              <Text style={styles.delText}>Xóa</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 15, color: C.text, lineHeight: 22, marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '800', color: C.primary, marginBottom: 8, textTransform: 'uppercase' },
  radii: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  radius: { flex: 1, height: TOUCH, borderRadius: 12, borderWidth: 2, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  radiusOn: { borderColor: C.primary, backgroundColor: '#e3f0fd' },
  radiusText: { fontSize: 16, color: C.text },
  radiusTextOn: { fontWeight: '800', color: C.primary },
  primary: { height: TOUCH, borderRadius: TOUCH / 2, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  disabled: { backgroundColor: '#9aa0a6' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  barBg: { height: 8, borderRadius: 4, backgroundColor: C.line, marginTop: 12, overflow: 'hidden' },
  bar: { height: 8, backgroundColor: C.ok },
  sub: { fontSize: 13, color: C.sub, marginTop: 4 },
  warn: { fontSize: 13, color: C.warn, marginTop: 8, fontWeight: '600' },
  region: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line },
  regionName: { fontSize: 16, color: C.text, fontWeight: '600' },
  del: { height: 44, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1, borderColor: C.danger, alignItems: 'center', justifyContent: 'center' },
  delText: { color: C.danger, fontWeight: '700' },
});
