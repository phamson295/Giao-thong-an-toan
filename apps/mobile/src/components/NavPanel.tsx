import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDistance, formatDuration, type Route, type RouteProgress } from '@gtat/shared';
import { C, TOUCH, shadow } from './theme';

function arrow(type: number | undefined): string {
  if (type === undefined) return '↑';
  if ([9, 10, 11, 18, 20, 23].includes(type)) return '↱';
  if ([14, 15, 16, 19, 21, 24].includes(type)) return '↰';
  if ([12, 13].includes(type)) return '↶';
  if ([26, 27].includes(type)) return '⟳';
  if ([4, 5, 6].includes(type)) return '⚑';
  return '↑';
}

/** Thẻ chỉ dẫn chặng kế tiếp (phía trên màn hình). */
export function NavTopCard({ progress, offRoute, online }: { progress: RouteProgress | null; offRoute: boolean; online: boolean }) {
  if (offRoute) {
    return (
      <View style={[styles.top, { backgroundColor: C.warn }]}>
        {online && <ActivityIndicator color="#fff" />}
        <Text style={styles.instruction}>
          {online ? 'Đi chệch tuyến – đang tìm lại đường…' : 'Đi chệch tuyến – hãy quay lại đường màu xanh'}
        </Text>
      </View>
    );
  }
  const step = progress?.nextStep;
  return (
    <View style={styles.top}>
      <Text style={styles.arrow}>{arrow(step?.type)}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.dist}>{progress ? formatDistance(progress.distanceToNextStepM) : '…'}</Text>
        <Text style={styles.instruction} numberOfLines={2}>{step?.instruction ?? 'Đi theo đường màu xanh'}</Text>
      </View>
    </View>
  );
}

/** Thanh tổng quãng đường còn lại + nút kết thúc (phía dưới màn hình). */
export function NavBottomBar({ route, progress, onStop }: { route: Route; progress: RouteProgress | null; onStop: () => void }) {
  const remainingM = progress?.remainingM ?? route.distanceM;
  const remainingS = progress?.remainingS ?? route.durationS;
  const eta = new Date(Date.now() + remainingS * 1000);
  const hhmm = `${eta.getHours()}:${String(eta.getMinutes()).padStart(2, '0')}`;
  return (
    <View style={styles.bottom}>
      <View style={{ flex: 1 }}>
        <Text style={styles.summary}>{formatDuration(remainingS)} · {formatDistance(remainingM)}</Text>
        <Text style={styles.sub} numberOfLines={1}>Đến lúc {hhmm} · {route.destination.name}</Text>
      </View>
      <Pressable style={styles.stop} onPress={onStop} accessibilityRole="button" accessibilityLabel="Kết thúc dẫn đường">
        <Text style={styles.stopText}>Kết thúc</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#0d47a1', padding: 14, borderRadius: 16, ...shadow },
  arrow: { fontSize: 44, color: '#fff', fontWeight: '800', width: 52, textAlign: 'center' },
  dist: { color: '#fff', fontSize: 26, fontWeight: '800' },
  instruction: { color: '#fff', fontSize: 17, fontWeight: '600', flexShrink: 1 },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, padding: 12, borderRadius: 16, ...shadow },
  summary: { fontSize: 20, fontWeight: '800', color: C.text },
  sub: { fontSize: 13, color: C.sub, marginTop: 2 },
  stop: { backgroundColor: C.danger, height: TOUCH, paddingHorizontal: 20, borderRadius: TOUCH / 2, alignItems: 'center', justifyContent: 'center' },
  stopText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
