import { StyleSheet, Text, View } from 'react-native';
import type { Warning } from '@gtat/shared';
import { C, shadow } from './theme';

const ICON: Record<Warning['kind'], string> = {
  overspeed: '⚠️',
  wrong_way: '⛔',
  hazard_ahead: '📍',
  no_overtaking_zone: '🚫',
};

/** Dải cảnh báo lớn, đổi màu theo mức độ. */
export function WarningBanner({ warning }: { warning: Warning }) {
  const bg = warning.severity === 'danger' ? C.danger : warning.severity === 'warn' ? C.warn : C.primary;
  return (
    <View style={[styles.box, { backgroundColor: bg }]} accessibilityLiveRegion="assertive">
      <Text style={styles.icon}>{ICON[warning.kind]}</Text>
      <Text style={styles.text}>{warning.message.replace('ki lô mét trên giờ', 'km/h')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, ...shadow },
  icon: { fontSize: 26 },
  text: { flex: 1, color: '#fff', fontSize: 18, fontWeight: '700' },
});
