import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { Provider as ReduxProvider } from 'react-redux';
import { PortalProvider, TamaguiProvider } from 'tamagui';
import store from '@/utils/store';
import tamaguiConfig from '@/tamagui.config';
import 'react-native-reanimated';

const BrandNavigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#0D9488',
    background: '#FFFFFF',
    card: '#FFFFFF',
    text: '#022C22',
    border: '#E5E7EB',
    notification: '#DC2626',
  },
};

const BrandNavigationDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#2DD4BF',
    background: '#0A0A0A',
    card: '#141414',
    text: '#FAFAFA',
    border: '#262626',
    notification: '#FB7185',
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
