import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { HazardType } from '@gtat/shared';
import { Sheet } from './Sheet';
import { C } from './theme';

const OPTIONS: { type: HazardType; icon: string; label: string; color: string }[] = [
  { type: 'police_report', icon: '🚓', label: 'CSGT', color: '#6a1b9a' },
  { type: 'accident_report', icon: '💥', label: 'Tai nạn', color: '#c62828' },
  { type: 'road_work_report', icon: '🚧', label: 'Công trình, sạt lở', color: '#ef6c00' },
  { type: 'speed_camera', icon: '📷', label: 'Camera tốc độ', color: '#1565c0' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onPick: (type: HazardType, label: string) => void;
}

/** Bảng chọn loại báo cáo: 4 ô lớn, chạm một lần là gửi. */
export function ReportSheet({ visible, onClose, onPick }: Props) {
  return (
    <Sheet visible={visible} title="Báo cáo tại vị trí này" onClose={onClose}>
      <View style={styles.grid}>
        {OPTIONS.map((o) => (
          <Pressable
            key={o.type}
            style={({ pressed }) => [styles.tile, { backgroundColor: o.color }, pressed && { opacity: 0.75 }]}
            onPress={() => onPick(o.type, o.label)}
            accessibilityRole="button"
            accessibilityLabel={`Báo cáo ${o.label}`}
          >
            <Text style={styles.icon}>{o.icon}</Text>
            <Text style={styles.label}>{o.label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.note}>Báo cáo gửi kèm vị trí hiện tại. Mất sóng thì sẽ tự gửi khi có mạng.</Text>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 16 },
  tile: { flexGrow: 1, flexBasis: '45%', height: 110, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 6 },
  icon: { fontSize: 36 },
  label: { color: '#fff', fontSize: 17, fontWeight: '800', textAlign: 'center' },
  note: { color: C.sub, fontSize: 13, paddingHorizontal: 20, paddingBottom: 12 },
});
