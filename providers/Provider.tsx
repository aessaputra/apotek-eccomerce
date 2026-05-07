import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Toast, ToastProvider, ToastViewport, useToastState } from '@tamagui/toast';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  SafeAreaProvider,
  initialWindowMetrics,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Provider as ReduxProvider } from 'react-redux';
import { TamaguiProvider } from 'tamagui';
import { TAB_BAR_HEIGHT } from '@/constants/ui';
import { themes } from '@/themes';
import store from '@/utils/store';
import tamaguiConfig from '@/tamagui.config';
import 'react-native-reanimated';

const TOAST_BOTTOM_GAP = 16;

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

function CurrentToast() {
  const currentToast = useToastState();

  if (!currentToast || currentToast.isHandledNatively) {
    return null;
  }

  return (
    <Toast
      key={currentToast.id}
      animation="quick"
      duration={currentToast.duration}
      enterStyle={{ opacity: 0, y: 18, scale: 0.96 }}
      exitStyle={{ opacity: 0, y: 12, scale: 0.96 }}
      opacity={1}
      scale={1}
      type={currentToast.type ?? 'foreground'}
      y={0}
      viewportName={currentToast.viewportName}
      backgroundColor="$surface"
      borderColor="$surfaceBorder"
      borderRadius="$5"
      borderWidth={1}
      elevation={8}
      px="$4"
      py="$3"
      shadowColor="$shadowColor"
      shadowOffset={{ width: 0, height: 8 }}
      shadowOpacity={0.16}
      shadowRadius={18}>
      <Toast.Title color="$color" fontSize="$3" fontWeight="700" lineHeight={20}>
        {currentToast.title}
      </Toast.Title>
      {currentToast.message ? (
        <Toast.Description color="$colorSubtle" fontSize="$2" lineHeight={18} mt="$1">
          {currentToast.message}
        </Toast.Description>
      ) : null}
    </Toast>
  );
}

function AppToastViewport() {
  const insets = useSafeAreaInsets();

  return (
    <ToastViewport
      bottom={TAB_BAR_HEIGHT + insets.bottom + TOAST_BOTTOM_GAP}
      label="Notifikasi aplikasi ({hotkey})"
      left="$4"
      portalToRoot
      right="$4"
    />
  );
}

export default function Provider({ children }: Readonly<{ children: React.ReactNode }>) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <ReduxProvider store={store}>
          <TamaguiProvider config={tamaguiConfig} defaultTheme={isDark ? 'brand_dark' : 'brand'}>
            <ToastProvider
              label="Notifikasi"
              duration={3000}
              swipeDirection="horizontal"
              native="mobile">
              <ThemeProvider value={isDark ? BrandNavigationDarkTheme : BrandNavigationTheme}>
                {children}
              </ThemeProvider>
              <CurrentToast />
              <AppToastViewport />
            </ToastProvider>
          </TamaguiProvider>
        </ReduxProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
