import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { HAZARD_LABEL, type HazardPoint } from '@gtat/shared';
import { C, TOUCH, shadow } from './theme';

interface Props {
  hazard: HazardPoint;
  onAnswer: (stillThere: boolean | null) => void; // null = không trả lời
}

/** Khi đi qua điểm do cộng đồng báo: hỏi nhanh "còn không?" – tự ẩn sau 12 giây. */
export function ConfirmHazardCard({ hazard, onAnswer }: Props) {
  useEffect(() => {
    const t = setTimeout(() => onAnswer(null), 12_000);
    return () => clearTimeout(t);
  }, [hazard.id]);

  const label = HAZARD_LABEL[hazard.type].replace(' (cộng đồng báo)', '');
  return (
    <View style={styles.card}>
      <Text style={styles.q}>Ở đây còn {label} không?</Text>
      <View style={styles.row}>
        <Pressable style={[styles.btn, { backgroundColor: C.ok }]} onPress={() => onAnswer(true)} accessibilityRole="button">
          <Text style={styles.btnText}>👍 Còn</Text>
        </Pressable>
        <Pressable style={[styles.btn, { backgroundColor: C.sub }]} onPress={() => onAnswer(false)} accessibilityRole="button">
          <Text style={styles.btnText}>👎 Không còn</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: 16, padding: 14, gap: 10, ...shadow },
  q: { fontSize: 17, fontWeight: '700', color: C.text },
  row: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, height: TOUCH, borderRadius: TOUCH / 2, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
