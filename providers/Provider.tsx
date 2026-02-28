import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { Provider as ReduxProvider } from 'react-redux';
import { TamaguiProvider } from 'tamagui';
import useColorScheme from '@/hooks/useColorScheme';
import store from '@/utils/store';
import tamaguiConfig from '@/tamagui.config';
import 'react-native-reanimated';

export default function Provider({ children }: Readonly<{ children: React.ReactNode }>) {
  const { colorScheme, isDark } = useColorScheme();
  const themeName = colorScheme ?? 'light';
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <ReduxProvider store={store}>
          {/* TamaguiProvider handles theme reactivity via defaultTheme — no key or <Theme> wrapper needed */}
          <TamaguiProvider config={tamaguiConfig} defaultTheme={themeName}>
            <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>{children}</ThemeProvider>
          </TamaguiProvider>
        </ReduxProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
