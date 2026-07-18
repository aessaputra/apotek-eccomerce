import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, BackHandler, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
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

const INJECTED_JAVASCRIPT = `
  (function() {
    document.addEventListener('click', function(e) {
      var target = e.target.closest('a');
      if (target && target.hasAttribute('download')) {
        var url = target.href;
        if (url.startsWith('data:')) {
          e.preventDefault();
          e.stopPropagation();
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'DOWNLOAD_QRIS',
            url: url,
            filename: target.getAttribute('download') || 'qris.png'
          }));
        } else if (url.startsWith('blob:')) {
          e.preventDefault();
          e.stopPropagation();
          fetch(url).then(function(res) { return res.blob(); }).then(function(blob) {
            var reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = function() {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'DOWNLOAD_QRIS',
                url: reader.result,
                filename: target.getAttribute('download') || 'qris.png'
              }));
            }
          });
        }
      }
    }, true);
  })();
  true;
`;

export default function Payment() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const { user, dispatch, markCartRefreshRequested } = useAppSlice();
  const { removePersistData } = useDataPersist();
  const { paymentUrl, orderId } = useLocalSearchParams<RouteParams<'cart/payment'>>();
  const resolvedPaymentUrl = useMemo(() => resolveRouteParam(paymentUrl), [paymentUrl]);
  const resolvedOrderId = useMemo(() => resolveRouteParam(orderId), [orderId]);
  const [webViewLoadError, setWebViewLoadError] = useState<string | null>(null);

  const isValidPaymentUrl = useMemo(
    () => isTrustedPaymentUrl(resolvedPaymentUrl),
    [resolvedPaymentUrl],
  );

  const {
    confirmCloseDialogOpen,
    finalizePaymentFlow,
    isPolling,
    paymentError,
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

  const announcePaymentStatus = useCallback((message: string) => {
    AccessibilityInfo.announceForAccessibility(message);
  }, []);

  const handleShouldStartLoadWithRequest = useCallback(
    (request: { url?: string }) => {
      const url = request.url || '';

      if (isDeepLink(url)) {
        void Linking.canOpenURL(url)
          .then(canOpen => {
            if (canOpen) {
              return Linking.openURL(url);
            }

            const deepLinkError = 'Aplikasi pembayaran tidak dapat dibuka di perangkat ini.';
            setPaymentError(deepLinkError);
            announcePaymentStatus(deepLinkError);
            return Promise.resolve();
          })
          .catch(() => {
            const deepLinkError = 'Aplikasi pembayaran tidak dapat dibuka di perangkat ini.';
            setPaymentError(deepLinkError);
            announcePaymentStatus(deepLinkError);
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
        const securityError = 'Navigasi ke halaman tidak dikenal diblokir untuk keamanan.';
        setPaymentError(securityError);
        announcePaymentStatus(securityError);
        return false;
      }

      return true;
    },
    [announcePaymentStatus, finalizePaymentFlow, handlePaymentNavigation, setPaymentError],
  );

  const handleWebViewLoadStart = useCallback(() => {
    setWebViewLoadError(null);
    setWebviewLoading(true);
    announcePaymentStatus('Memuat halaman pembayaran.');
  }, [announcePaymentStatus, setWebviewLoading]);

  const handleWebViewLoadProgress = useCallback(
    (event: { nativeEvent: { progress: number } }) => {
      setWebviewLoading(event.nativeEvent.progress < 1);
    },
    [setWebviewLoading],
  );

  const handleWebViewLoadEnd = useCallback(() => {
    setWebviewLoading(false);
  }, [setWebviewLoading]);

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
    const errorMessage =
      'Koneksi pembayaran terputus. Muat ulang halaman atau cek status pembayaran.';
    setWebViewLoadError(errorMessage);
    setPaymentError(errorMessage);
    announcePaymentStatus(errorMessage);
  }, [announcePaymentStatus, setPaymentError]);

  const handleWebViewHttpError = useCallback(() => {
    const errorMessage =
      'Halaman pembayaran tidak dapat dimuat. Muat ulang halaman atau cek status pembayaran.';
    setWebViewLoadError(errorMessage);
    setPaymentError(errorMessage);
    announcePaymentStatus(errorMessage);
  }, [announcePaymentStatus, setPaymentError]);

  const handleRetryWebViewLoad = useCallback(() => {
    setWebViewLoadError(null);
    setPaymentError(null);
    setWebviewLoading(true);
    webViewRef.current?.reload();
    announcePaymentStatus('Mencoba memuat ulang halaman pembayaran.');
  }, [announcePaymentStatus, setPaymentError, setWebviewLoading]);

  const handleCheckPaymentStatus = useCallback(() => {
    void finalizePaymentFlow('pending');
  }, [finalizePaymentFlow]);

  const handleWebViewMessage = useCallback(
    async (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'DOWNLOAD_QRIS' && data.url) {
          const base64Data = data.url.split(',')[1];
          if (!base64Data) return;
          const filename = data.filename || `qris-${Date.now()}.png`;
          const file = new File(Paths.cache, filename);
          file.write(base64Data, {
            encoding: 'base64',
          });

          const isAvailable = await Sharing.isAvailableAsync();
          if (isAvailable) {
            await Sharing.shareAsync(file.uri, {
              mimeType: 'image/png',
              dialogTitle: 'Simpan QRIS',
            });
          } else {
            setPaymentError('Fitur berbagi tidak didukung di perangkat ini.');
          }
        }
      } catch (e) {
        if (__DEV__) {
          console.warn('[Payment] Failed to process webview message:', e);
        }
      }
    },
    [setPaymentError],
  );

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
          minHeight={48}
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
            minHeight={48}
            paddingHorizontal="$2"
            icon={<CloseIcon size={16} color="$primary" />}
            onPress={() => setConfirmCloseDialogOpen(true)}
            aria-label="Tutup pembayaran">
            Tutup
          </TamaguiButton>
        </XStack>
      )}

      {postPaymentState === 'verifying' || isPolling ? (
        <YStack
          flex={1}
          alignItems="center"
          justifyContent="center"
          gap="$4"
          padding="$4"
          role="alert"
          aria-live="polite">
          <Spinner size="large" color="$primary" />
          <YStack gap="$2" alignItems="center">
            <Text textAlign="center" color="$color" fontWeight="700" fontSize="$5">
              Memproses Pembayaran...
            </Text>
            <Text textAlign="center" color="$colorPress" fontSize="$3">
              Mohon tunggu sebentar.
            </Text>
          </YStack>
        </YStack>
      ) : postPaymentState === 'timeout' ? (
        <YStack
          flex={1}
          alignItems="center"
          justifyContent="center"
          gap="$3"
          padding="$4"
          role="alert"
          aria-live="polite">
          <Text textAlign="center" color="$color" fontWeight="700" fontSize="$5">
            Pembayaran sedang diproses
          </Text>
          <Text textAlign="center" color="$colorPress" fontSize="$3">
            {postPaymentMessage ?? 'Cek status terbaru di halaman Pesanan.'}
          </Text>
          <TamaguiButton
            backgroundColor="$primary"
            color="$onPrimary"
            borderRadius="$3"
            minHeight={48}
            marginTop="$1"
            onPress={() => router.replace(ORDERS_ROUTE)}
            aria-label="Lihat pesanan">
            Lihat Pesanan
          </TamaguiButton>
        </YStack>
      ) : (
        <YStack flex={1} position="relative">
          <WebView
            ref={webViewRef}
            source={{ uri: resolvedPaymentUrl }}
            style={{ flex: 1 }}
            startInLoadingState
            injectedJavaScript={INJECTED_JAVASCRIPT}
            onMessage={handleWebViewMessage}
            onLoadStart={handleWebViewLoadStart}
            onLoadProgress={handleWebViewLoadProgress}
            onLoadEnd={handleWebViewLoadEnd}
            onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
            onNavigationStateChange={handleNavigationStateChange}
            onError={handleWebViewError}
            onHttpError={handleWebViewHttpError}
          />

          {webviewLoading && !webViewLoadError ? (
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
              padding="$4"
              role="alert"
              aria-live="polite">
              <Spinner size="large" color="$primary" />
              <Text textAlign="center" color="$colorPress">
                Memuat halaman pembayaran...
              </Text>
            </YStack>
          ) : null}

          {webViewLoadError ? (
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
              padding="$4"
              role="alert"
              aria-live="assertive">
              <Text textAlign="center" color="$danger" fontWeight="700" fontSize="$5">
                Halaman pembayaran bermasalah
              </Text>
              <Text textAlign="center" color="$colorPress" fontSize="$3">
                {webViewLoadError}
              </Text>
              <TamaguiButton
                backgroundColor="$primary"
                color="$onPrimary"
                borderRadius="$3"
                minHeight={48}
                onPress={handleRetryWebViewLoad}
                aria-label="Muat ulang halaman pembayaran">
                Muat Ulang
              </TamaguiButton>
              <TamaguiButton
                backgroundColor="transparent"
                color="$primary"
                borderColor="$primary"
                borderWidth={1}
                borderRadius="$3"
                minHeight={48}
                onPress={handleCheckPaymentStatus}
                aria-label="Cek status pembayaran">
                Cek Status Pembayaran
              </TamaguiButton>
            </YStack>
          ) : null}
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
        <YStack px="$4" pb="$3" bg="$background" role="alert" aria-live="assertive">
          <Text color="$danger" textAlign="center" fontSize="$3">
            {paymentError}
          </Text>
        </YStack>
      ) : null}
    </YStack>
  );
}
