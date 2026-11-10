import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MapScreen } from './src/screens/MapScreen';
import { SettingsProvider } from './src/settings/settings';

export default function App() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <StatusBar style="auto" />
        <MapScreen />
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
