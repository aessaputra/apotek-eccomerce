import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { Provider as ReduxProvider } from 'react-redux';
import { PortalProvider, TamaguiProvider } from 'tamagui';
import { themes } from '@/themes';
import store from '@/utils/store';
import tamaguiConfig from '@/tamagui.config';
import 'react-native-reanimated';

const BrandNavigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: themes.brand.primary,
    background: themes.brand.background,
    card: themes.brand.surface,
    text: themes.brand.color,
    border: themes.brand.borderColor,
    notification: themes.brand.danger,
  },
};

const BrandNavigationDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: themes.brand_dark.primary,
    background: themes.brand_dark.background,
    card: themes.brand_dark.surface,
    text: themes.brand_dark.color,
    border: themes.brand_dark.borderColor,
    notification: themes.brand_dark.danger,
  },
};

export default function Provider({ children }: Readonly<{ children: React.ReactNode }>) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <ReduxProvider store={store}>
          <PortalProvider shouldAddRootHost>
            <TamaguiProvider config={tamaguiConfig} defaultTheme={isDark ? 'brand_dark' : 'brand'}>
              <ThemeProvider value={isDark ? BrandNavigationDarkTheme : BrandNavigationTheme}>
                {children}
              </ThemeProvider>
            </TamaguiProvider>
          </PortalProvider>
        </ReduxProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
