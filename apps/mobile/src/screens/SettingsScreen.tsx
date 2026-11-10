import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Sheet } from '../components/Sheet';
import { C, TOUCH } from '../components/theme';
import { useSettings } from '../settings/settings';

interface Props {
  visible: boolean;
  onClose: () => void;
  onOpenOffline: () => void;
}

export function SettingsScreen({ visible, onClose, onOpenOffline }: Props) {
  const { settings, update } = useSettings();
  return (
    <Sheet visible={visible} title="Cài đặt" onClose={onClose} full>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <Group title="Phương tiện">
          <Choice
            value={settings.vehicle}
            options={[{ value: 'car', label: '🚗 Ô tô' }, { value: 'moto', label: '🏍️ Xe máy' }]}
            onChange={(vehicle) => update({ vehicle })}
          />
          <Text style={styles.hint}>Dùng để chọn giới hạn tốc độ và cách tìm đường (xe máy tránh đường cao tốc).</Text>
        </Group>

        <Group title="Cảnh báo vượt tốc độ">
          <Choice
            value={settings.toleranceKmh}
            options={[{ value: 0, label: 'Đúng giới hạn' }, { value: 3, label: 'Quá 3 km/h' }, { value: 5, label: 'Quá 5 km/h' }]}
            onChange={(toleranceKmh) => update({ toleranceKmh })}
          />
        </Group>

        <Group title="Âm thanh và loại cảnh báo">
          <Toggle label="Đọc cảnh báo bằng giọng nói" value={settings.voice} onChange={(voice) => update({ voice })} />
          <Toggle label="Camera tốc độ, camera đèn đỏ" value={settings.alertCameras} onChange={(alertCameras) => update({ alertCameras })} />
          <Toggle label="Biển cấm vượt, khu vực trường học" value={settings.alertSigns} onChange={(alertSigns) => update({ alertSigns })} />
          <Toggle label="Báo cáo của cộng đồng (CSGT, tai nạn…)" value={settings.alertCommunity} onChange={(alertCommunity) => update({ alertCommunity })} />
          <Text style={styles.hint}>Cảnh báo vượt tốc độ và đi ngược chiều luôn bật.</Text>
        </Group>

        <Group title="Bản đồ">
          <Toggle label="Mở ứng dụng ở chế độ 3D" value={settings.start3D} onChange={(start3D) => update({ start3D })} />
          <Pressable style={styles.link} onPress={onOpenOffline} accessibilityRole="button">
            <Text style={styles.linkText}>⬇️  Bản đồ offline (dùng khi mất sóng)</Text>
            <Text style={styles.chev}>›</Text>
          </Pressable>
        </Group>

        <Text style={styles.disclaimer}>
          Ứng dụng chỉ hỗ trợ nhắc nhở. Người lái xe phải tuân theo biển báo và tình huống thực tế trên đường.
          Không thao tác trên điện thoại khi xe đang chạy.
        </Text>
      </ScrollView>
    </Sheet>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable style={styles.toggle} onPress={() => onChange(!value)} accessibilityRole="switch" accessibilityState={{ checked: value }}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </Pressable>
  );
}

function Choice<T extends string | number>({ value, options, onChange }: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.choice}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            style={[styles.choiceBtn, on && styles.choiceOn]}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
          >
            <Text style={[styles.choiceText, on && styles.choiceTextOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { paddingHorizontal: 20, paddingTop: 20 },
  groupTitle: { fontSize: 14, fontWeight: '800', color: C.primary, marginBottom: 8, textTransform: 'uppercase' },
  hint: { fontSize: 13, color: C.sub, marginTop: 6 },
  toggle: { flexDirection: 'row', alignItems: 'center', minHeight: TOUCH, borderBottomWidth: 1, borderBottomColor: C.line },
  toggleLabel: { flex: 1, fontSize: 16, color: C.text, paddingRight: 12 },
  choice: { flexDirection: 'row', gap: 8 },
  choiceBtn: { flex: 1, minHeight: TOUCH, borderRadius: 12, borderWidth: 2, borderColor: C.line, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  choiceOn: { borderColor: C.primary, backgroundColor: '#e3f0fd' },
  choiceText: { fontSize: 15, color: C.text, textAlign: 'center' },
  choiceTextOn: { fontWeight: '800', color: C.primary },
  link: { flexDirection: 'row', alignItems: 'center', minHeight: TOUCH },
  linkText: { flex: 1, fontSize: 16, color: C.text },
  chev: { fontSize: 26, color: C.sub },
  disclaimer: { margin: 20, fontSize: 13, color: C.sub, lineHeight: 19 },
});
