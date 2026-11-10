import { StyleSheet, Text, View } from 'react-native';
import { C, shadow } from './theme';

interface Props {
  speedKmh: number;
  limit: number | null;
  overspeed: boolean;
  noOvertaking: boolean;
  gpsOk: boolean;
}

/** Tốc độ hiện tại + biển tốc độ tối đa + nhãn cấm vượt. */
export function SpeedPanel({ speedKmh, limit, overspeed, noOvertaking, gpsOk }: Props) {
  return (
    <View style={styles.row}>
      <View style={[styles.speed, overspeed && styles.speedOver]}>
        <Text style={[styles.value, overspeed && styles.valueOver]}>{gpsOk ? Math.round(speedKmh) : '--'}</Text>
        <Text style={[styles.unit, overspeed && styles.valueOver]}>km/h</Text>
      </View>
      <View style={styles.signs}>
        {limit !== null && (
          <View style={styles.limit} accessibilityLabel={`Tốc độ tối đa ${limit}`}>
            <Text style={styles.limitText}>{limit}</Text>
          </View>
        )}
        {noOvertaking && <Text style={styles.noOvertake}>CẤM VƯỢT</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  speed: { width: 96, height: 96, borderRadius: 48, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', ...shadow },
  speedOver: { backgroundColor: C.danger },
  value: { fontSize: 36, fontWeight: '800', color: C.text, lineHeight: 40 },
  valueOver: { color: '#fff' },
  unit: { fontSize: 13, color: C.sub },
  signs: { alignItems: 'center', gap: 6 },
  limit: { width: 62, height: 62, borderRadius: 31, borderWidth: 7, borderColor: '#d32f2f', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow },
  limitText: { fontSize: 21, fontWeight: '800', color: C.text },
  noOvertake: { backgroundColor: '#fff', color: C.danger, fontWeight: '800', fontSize: 12, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: C.danger },
});
