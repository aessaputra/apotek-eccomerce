import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
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

export default function Provider({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <ReduxProvider store={store}>
          <PortalProvider shouldAddRootHost>
            <TamaguiProvider config={tamaguiConfig} defaultTheme="brand">
              <ThemeProvider value={BrandNavigationTheme}>{children}</ThemeProvider>
            </TamaguiProvider>
          </PortalProvider>
        </ReduxProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
