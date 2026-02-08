import { Fragment, useState, useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import BottomSheetContents from '@/components/layouts/BottomSheetContents';
import BottomSheet from '@/components/elements/BottomSheet';
import useColorScheme from '@/hooks/useColorScheme';
import { loadImages, loadFonts, colors } from '@/theme';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAppSlice } from '@/slices';
import Provider from '@/providers';
import { AuthProvider } from '@/providers';

SplashScreen.preventAutoHideAsync();

function Router() {
  const { isDark } = useColorScheme();
  const { checked } = useAppSlice();
  const [assetsReady, setAssetsReady] = useState(false);
  const [isOpen, setOpen] = useState(false);

  useEffect(() => {
    (async () => {
      await Promise.all([loadImages(), loadFonts()]);
      setAssetsReady(true);
    })();
  }, []);

  useEffect(() => {
    if (assetsReady && checked) {
      SplashScreen.hideAsync();
      setOpen(true);
    }
  }, [assetsReady, checked]);

  return (
    <Fragment>
      <Slot />
      <StatusBar style="light" />
      <BottomSheet
        isOpen={isOpen}
        initialOpen
        backgroundStyle={isDark && { backgroundColor: colors.surfaceDark }}>
        <BottomSheetContents onClose={() => setOpen(false)} />
      </BottomSheet>
    </Fragment>
  );
}

export default function RootLayout() {
  return (
    <Provider>
      <AuthProvider>
        <Router />
      </AuthProvider>
    </Provider>
  );
}
