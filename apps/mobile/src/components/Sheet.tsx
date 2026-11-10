import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, TOUCH } from './theme';

interface Props {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** true: chiếm toàn màn hình (tìm kiếm, cài đặt); false: trượt lên từ đáy. */
  full?: boolean;
}

/** Khung hộp thoại dùng chung: tiêu đề + nút đóng lớn. */
export function Sheet({ visible, title, onClose, children, full }: Props) {
  return (
    <Modal visible={visible} transparent={!full} animationType="slide" onRequestClose={onClose}>
      {full ? (
        <SafeAreaView style={styles.full}>
          <Header title={title} onClose={onClose} />
          {children}
        </SafeAreaView>
      ) : (
        <View style={styles.backdrop}>
          <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Đóng" />
          <SafeAreaView edges={['bottom']} style={styles.bottom}>
            <Header title={title} onClose={onClose} />
            {children}
          </SafeAreaView>
        </View>
      )}
    </Modal>
  );
}

function Header({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      <Pressable onPress={onClose} style={styles.close} accessibilityRole="button" accessibilityLabel="Đóng">
        <Text style={styles.closeText}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1, backgroundColor: C.card },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  bottom: { backgroundColor: C.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'center', paddingLeft: 20, paddingRight: 8, borderBottomWidth: 1, borderBottomColor: C.line },
  title: { flex: 1, fontSize: 20, fontWeight: '800', color: C.text },
  close: { width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 22, color: C.sub },
});
