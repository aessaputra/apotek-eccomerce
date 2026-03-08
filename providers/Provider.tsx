import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { Provider as ReduxProvider } from 'react-redux';
import { PortalProvider, TamaguiProvider } from 'tamagui';
import store from '@/utils/store';
import tamaguiConfig from '@/tamagui.config';
import 'react-native-reanimated';

export default function Provider({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <ReduxProvider store={store}>
          {/* PortalProvider must wrap TamaguiProvider for Sheet, Dialog, Popover to work */}
          <PortalProvider shouldAddRootHost>
            <TamaguiProvider config={tamaguiConfig} defaultTheme="brand">
              <ThemeProvider value={DefaultTheme}>{children}</ThemeProvider>
            </TamaguiProvider>
          </PortalProvider>
        </ReduxProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
