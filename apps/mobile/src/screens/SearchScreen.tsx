import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Destination } from '@gtat/shared';
import { Sheet } from '../components/Sheet';
import { C, TOUCH } from '../components/theme';
import { searchPlaces } from '../navigation/routing';

interface Props {
  visible: boolean;
  onClose: () => void;
  onPick: (d: Destination) => void;
  recent: Destination[];
  near: { lng: number; lat: number } | null;
  online: boolean;
}

/** Tìm điểm đến theo tên, địa chỉ hoặc tọa độ. Tự tìm sau khi ngừng gõ 0,6 giây. */
export function SearchScreen({ visible, onClose, onPick, recent, near, online }: Props) {
  const [text, setText] = useState('');
  const [results, setResults] = useState<Destination[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    if (!visible) return;
    const q = text.trim();
    if (q.length < 3) {
      setResults(null);
      setError(null);
      return;
    }
    const mine = ++seq.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await searchPlaces(q, near ?? undefined);
        if (mine === seq.current) setResults(r);
      } catch {
        if (mine === seq.current) {
          setResults(null);
          setError('Không tìm được. Kiểm tra kết nối mạng, hoặc nhập tọa độ dạng "21.0285, 105.8542".');
        }
      } finally {
        if (mine === seq.current) setLoading(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [text, visible]);

  const pick = (d: Destination) => {
    Keyboard.dismiss();
    setText('');
    setResults(null);
    onPick(d);
  };

  const list = results ?? recent;
  return (
    <Sheet visible={visible} title="Tìm điểm đến" onClose={onClose} full>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Tên đường, địa danh hoặc tọa độ"
          placeholderTextColor={C.sub}
          autoFocus
          returnKeyType="search"
          autoCorrect={false}
        />
        {loading && <ActivityIndicator style={styles.spinner} color={C.primary} />}
      </View>
      {!online && <Text style={styles.offline}>Đang mất mạng: chỉ nhập được tọa độ, chưa tìm được theo tên.</Text>}
      {error && <Text style={styles.error}>{error}</Text>}
      <Text style={styles.section}>
        {results ? (results.length ? 'Kết quả' : 'Không có kết quả phù hợp') : recent.length ? 'Đã tìm gần đây' : 'Gõ ít nhất 3 ký tự để tìm'}
      </Text>
      <FlatList
        data={list}
        keyExtractor={(d, i) => `${d.lng},${d.lat},${i}`}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable style={({ pressed }) => [styles.item, pressed && { backgroundColor: C.line }]} onPress={() => pick(item)}>
            <Text style={styles.itemIcon}>{results ? '📍' : '🕘'}</Text>
            <Text style={styles.itemText} numberOfLines={2}>{item.name}</Text>
          </Pressable>
        )}
      />
      <Text style={styles.tip}>Mẹo: nhấn giữ một điểm trên bản đồ để dẫn đường tới đó.</Text>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  inputRow: { margin: 16, marginBottom: 8 },
  input: { height: TOUCH, borderRadius: TOUCH / 2, borderWidth: 2, borderColor: C.primary, paddingHorizontal: 20, fontSize: 17, color: C.text },
  spinner: { position: 'absolute', right: 18, top: 18 },
  offline: { marginHorizontal: 20, color: C.warn, fontSize: 14, fontWeight: '600' },
  error: { marginHorizontal: 20, color: C.danger, fontSize: 14 },
  section: { marginHorizontal: 20, marginTop: 12, marginBottom: 4, color: C.sub, fontSize: 13, fontWeight: '700' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: TOUCH + 4, paddingHorizontal: 20, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.line },
  itemIcon: { fontSize: 20 },
  itemText: { flex: 1, fontSize: 16, color: C.text },
  tip: { padding: 16, color: C.sub, fontSize: 13, textAlign: 'center' },
});
