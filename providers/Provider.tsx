import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { Provider as ReduxProvider } from 'react-redux';
import { TamaguiProvider, Theme } from 'tamagui';
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
          {/* Key prop forces re-mount on theme change to ensure all consumers get fresh theme values */}
          <TamaguiProvider key={themeName} config={tamaguiConfig} defaultTheme={themeName}>
            <Theme name={themeName}>
              <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>{children}</ThemeProvider>
            </Theme>
          </TamaguiProvider>
        </ReduxProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
