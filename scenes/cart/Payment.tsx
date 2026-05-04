import React, { useCallback, useEffect, useMemo } from 'react';
import { BackHandler, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Spinner, Text, XStack, YStack, Button as TamaguiButton } from 'tamagui';
import AppAlertDialog from '@/components/elements/AppAlertDialog';
import { CloseIcon, LockIcon } from '@/components/icons';
import { useAppSlice } from '@/slices';
import type { RouteParams } from '@/types/routes.types';
import { useDataPersist } from '@/hooks/useDataPersist';
import type { PaymentResult } from '@/types/payment';
import {
  isDeepLink,
  isTrustedPaymentUrl,
  ORDERS_ROUTE,
  parsePaymentNavigationStatus,
  resolveRouteParam,
} from '@/scenes/cart/payment.utils';
import { usePaymentFlow } from '@/scenes/cart/usePaymentFlow';

export {
  isDeepLink,
  isPollingTimeoutError,
  isTrustedPaymentUrl,
  parsePaymentNavigationStatus,
  translateCheckoutError,
} from '@/scenes/cart/payment.utils';

export default function Payment() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, dispatch, markCartRefreshRequested } = useAppSlice();
  const { removePersistData } = useDataPersist();
  const { paymentUrl, orderId } = useLocalSearchParams<RouteParams<'cart/payment'>>();
  const resolvedPaymentUrl = useMemo(() => resolveRouteParam(paymentUrl), [paymentUrl]);
  const resolvedOrderId = useMemo(() => resolveRouteParam(orderId), [orderId]);

  const isValidPaymentUrl = useMemo(
    () => isTrustedPaymentUrl(resolvedPaymentUrl),
    [resolvedPaymentUrl],
  );

  const {
    confirmCloseDialogOpen,
    finalizePaymentFlow,
    isPolling,
    paymentError,
    paymentResult,
    postPaymentMessage,
    postPaymentState,
    setConfirmCloseDialogOpen,
    setPaymentError,
    setWebviewLoading,
    shouldHidePaymentChrome,
    webviewLoading,
  } = usePaymentFlow({
    resolvedOrderId,
    userId: user?.id,
    dispatch,
    markCartRefreshRequested,
    router,
    removePersistData,
  });

  useEffect(() => {
    if (!resolvedPaymentUrl) {
      return;
    }

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (shouldHidePaymentChrome) {
        return true;
      }

      setConfirmCloseDialogOpen(true);
      return true;
    });

    return () => backHandler.remove();
  }, [resolvedPaymentUrl, setConfirmCloseDialogOpen, shouldHidePaymentChrome]);

  const handlePaymentNavigation = useCallback(
    (url?: string): PaymentResult['status'] | null => parsePaymentNavigationStatus(url),
    [],
  );

  const handleShouldStartLoadWithRequest = useCallback(
    (request: { url?: string }) => {
      const url = request.url || '';

      if (isDeepLink(url)) {
        void Linking.canOpenURL(url)
          .then(canOpen => {
            if (canOpen) {
              return Linking.openURL(url);
            }

            setPaymentError('Aplikasi pembayaran tidak dapat dibuka di perangkat ini.');
            return Promise.resolve();
          })
          .catch(() => {
            setPaymentError('Aplikasi pembayaran tidak dapat dibuka di perangkat ini.');
          });
        return false;
      }

      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return false;
      }

      const navigationStatus = handlePaymentNavigation(url);
      if (navigationStatus) {
        void finalizePaymentFlow(navigationStatus);
        return false;
      }

      if (!isTrustedPaymentUrl(url)) {
        setPaymentError('Navigasi ke halaman tidak dikenal diblokir untuk keamanan.');
        return false;
      }

      return true;
    },
    [finalizePaymentFlow, handlePaymentNavigation, setPaymentError],
  );

  const handleNavigationStateChange = useCallback(
    (navState: { url?: string }) => {
      const navigationStatus = handlePaymentNavigation(navState.url);
      if (navigationStatus) {
        void finalizePaymentFlow(navigationStatus);
      }
    },
    [finalizePaymentFlow, handlePaymentNavigation],
  );

  const handleWebViewError = useCallback(() => {
    setPaymentError('Koneksi pembayaran terputus. Kami akan cek status order Anda.');
    void finalizePaymentFlow('pending');
  }, [finalizePaymentFlow, setPaymentError]);

  const handleWebViewHttpError = useCallback(() => {
    setPaymentError('Halaman pembayaran tidak dapat dimuat. Kami cek status pembayaran Anda.');
    void finalizePaymentFlow('pending');
  }, [finalizePaymentFlow, setPaymentError]);

  if (!resolvedPaymentUrl || !isValidPaymentUrl) {
    return (
      <YStack
        flex={1}
        backgroundColor="$background"
        alignItems="center"
        justifyContent="center"
        px="$5"
        gap="$3">
        <Text textAlign="center" color="$danger" fontWeight="700">
          {!resolvedPaymentUrl
            ? 'Link pembayaran tidak ditemukan.'
            : 'Link pembayaran tidak valid.'}
        </Text>
        <Text textAlign="center" color="$colorSubtle" fontSize="$3">
          Silakan coba lagi atau hubungi customer service.
        </Text>
        <TamaguiButton
          backgroundColor="$primary"
          color="$onPrimary"
          borderRadius="$3"
          minHeight={44}
          onPress={() => router.replace(ORDERS_ROUTE)}
          aria-label="Kembali ke pesanan">
          Kembali ke Pesanan
        </TamaguiButton>
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="$background">
      {!shouldHidePaymentChrome && (
        <XStack
          alignItems="center"
          justifyContent="space-between"
          paddingHorizontal="$3"
          paddingBottom="$3"
          paddingTop={insets.top + 12}
          gap="$2"
          backgroundColor="$background">
          <XStack flex={1} alignItems="center" gap="$2">
            <LockIcon size={16} color="$primary" />
            <Text fontSize="$5" fontWeight="600" color="$color">
              Pembayaran
            </Text>
          </XStack>
          <TamaguiButton
            backgroundColor="transparent"
            color="$primary"
            borderRadius="$3"
            minHeight={36}
            paddingHorizontal="$2"
            icon={<CloseIcon size={16} color="$primary" />}
            onPress={() => setConfirmCloseDialogOpen(true)}
            aria-label="Tutup pembayaran">
            Tutup
          </TamaguiButton>
        </XStack>
      )}

      {postPaymentState === 'verifying' || isPolling ? (
        <YStack flex={1} alignItems="center" justifyContent="center" gap="$3" padding="$4">
          <Spinner size="large" color="$primary" />
          <Text textAlign="center" color="$color" fontWeight="700" fontSize="$5">
            {paymentResult === 'success'
              ? 'Pembayaran berhasil! Memverifikasi pesanan...'
              : 'Memverifikasi status pembayaran...'}
          </Text>
          <Text textAlign="center" color="$colorPress" fontSize="$3">
            Mohon tunggu sebentar, kami sedang memastikan status pembayaran dari server.
          </Text>
        </YStack>
      ) : postPaymentState === 'timeout' ? (
        <YStack flex={1} alignItems="center" justifyContent="center" gap="$3" padding="$4">
          <Text textAlign="center" color="$color" fontWeight="700" fontSize="$5">
            Pembayaran sedang diproses
          </Text>
          <Text textAlign="center" color="$colorPress" fontSize="$3">
            {postPaymentMessage ?? 'Pembayaran sedang diproses. Cek status di halaman Pesanan.'}
          </Text>
          <TamaguiButton
            backgroundColor="$primary"
            color="$onPrimary"
            borderRadius="$3"
            minHeight={44}
            marginTop="$1"
            onPress={() => router.replace(ORDERS_ROUTE)}
            aria-label="Lihat pesanan">
            Lihat Pesanan
          </TamaguiButton>
        </YStack>
      ) : (
        <YStack flex={1} position="relative">
          <WebView
            source={{ uri: resolvedPaymentUrl }}
            style={{ flex: 1 }}
            onLoadStart={() => setWebviewLoading(true)}
            onLoadEnd={() => setWebviewLoading(false)}
            onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
            onNavigationStateChange={handleNavigationStateChange}
            onError={handleWebViewError}
            onHttpError={handleWebViewHttpError}
          />

          {webviewLoading && (
            <YStack
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              alignItems="center"
              justifyContent="center"
              backgroundColor="$background"
              gap="$3"
              padding="$4">
              <Spinner size="large" color="$primary" />
              <Text textAlign="center" color="$colorPress">
                Memuat halaman pembayaran...
              </Text>
            </YStack>
          )}
        </YStack>
      )}

      {!shouldHidePaymentChrome ? (
        <AppAlertDialog
          open={confirmCloseDialogOpen}
          onOpenChange={setConfirmCloseDialogOpen}
          title="Batalkan Pembayaran?"
          description="Pembayaran Anda belum selesai. Yakin ingin keluar?"
          confirmLabel="Batalkan & Keluar"
          cancelLabel="Lanjutkan Bayar"
          cancelColor="$primary"
          cancelTextColor="$onPrimary"
          confirmColor="$background"
          confirmTextColor="$danger"
          confirmBorderColor="$danger"
          onConfirm={() => {
            void finalizePaymentFlow('pending');
          }}
        />
      ) : null}

      {paymentError ? (
        <YStack px="$4" pb="$3" bg="$background">
          <Text color="$danger" textAlign="center" fontSize="$3">
            {paymentError}
          </Text>
        </YStack>
      ) : null}
    </YStack>
  );
}
