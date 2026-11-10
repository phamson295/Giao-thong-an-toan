import { Pressable, StyleSheet, Text } from 'react-native';
import { C, TOUCH, shadow } from './theme';

interface Props {
  icon: string;
  label: string; // đọc cho trình đọc màn hình
  onPress: () => void;
  active?: boolean;
}

/** Nút tròn nổi trên bản đồ. */
export function RoundButton({ icon, label, onPress, active }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.btn, active && styles.active, pressed && styles.pressed]}
    >
      <Text style={[styles.icon, active && styles.iconActive]}>{icon}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { width: TOUCH, height: TOUCH, borderRadius: TOUCH / 2, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', ...shadow },
  active: { backgroundColor: C.primary },
  pressed: { opacity: 0.7 },
  icon: { fontSize: 20, fontWeight: '800', color: C.text },
  iconActive: { color: '#fff' },
});
