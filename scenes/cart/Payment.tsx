import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Spinner, Text, XStack, YStack, Button as TamaguiButton } from 'tamagui';
import AppAlertDialog from '@/components/elements/AppAlertDialog';
import { CloseIcon, LockIcon } from '@/components/icons';
import { useAppSlice, appActions } from '@/slices';
import type { RouteParams } from '@/types/routes.types';
import { pollOrderPaymentStatus } from '@/services/checkout.service';
import { DataPersistKeys, useDataPersist } from '@/hooks/useDataPersist';
import type { PaymentResult } from '@/types/payment';

const PAYMENT_SUCCESS_STATUSES = ['settlement'];
const PAYMENT_PENDING_STATUSES = ['pending', 'authorize'];
const PAYMENT_FAILED_STATUSES = ['deny', 'cancel', 'expire', 'failure'];
const ORDERS_ROUTE = '/(tabs)/orders';

const DEEP_LINK_PATTERNS = [
  'gojek://',
  'shopeeid://',
  'gopay://',
  '//wsa.wallet.airpay.co.id/',
  'simulator.sandbox.midtrans.com',
];

const TRUSTED_PAYMENT_HOSTS = [
  // Production
  'app.midtrans.com',
  'midtrans.com',
  'snap.midtrans.com',
  '3ds.midtrans.com',
  'secure.midtrans.com',
  'api.midtrans.com',
  'cdn.midtrans.com',
  // Sandbox
  'app.sandbox.midtrans.com',
  'sandbox.midtrans.com',
  'snap-sandbox.midtrans.com',
  'api.sandbox.midtrans.com',
  // Payment methods
  'gojek.midtrans.com',
  'gopay.midtrans.com',
  'qris.midtrans.com',
];

function isDeepLink(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  return DEEP_LINK_PATTERNS.some(pattern => lowerUrl.includes(pattern));
}

function isTrustedPaymentUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return TRUSTED_PAYMENT_HOSTS.some(host => urlObj.hostname.endsWith(host));
  } catch {
    return false;
  }
}

function translateCheckoutError(message: string | undefined, fallback: string): string {
  const normalized = (message || '').toLowerCase();

  if (
    normalized.includes('timeout') ||
    normalized.includes('timed out') ||
    normalized.includes('abort')
  ) {
    return 'Permintaan timeout. Pastikan koneksi stabil lalu coba lagi.';
  }

  if (
    normalized.includes('network') ||
    normalized.includes('fetch') ||
    normalized.includes('offline') ||
    normalized.includes('koneksi')
  ) {
    return 'Koneksi internet bermasalah. Silakan cek jaringan Anda lalu coba lagi.';
  }

  if (
    normalized.includes('midtrans') ||
    normalized.includes('snap') ||
    normalized.includes('payment')
  ) {
    return 'Layanan pembayaran sedang bermasalah. Silakan coba beberapa saat lagi.';
  }

  if (
    normalized.includes('database') ||
    normalized.includes('duplicate') ||
    normalized.includes('constraint')
  ) {
    return 'Sistem sedang sibuk menyimpan data pembayaran. Silakan coba lagi.';
  }

  return fallback;
}

function isPollingTimeoutError(message: string | undefined): boolean {
  const normalized = (message || '').toLowerCase();

  return (
    normalized.includes('masih diproses') ||
    normalized.includes('beberapa saat lagi') ||
    normalized.includes('status pembayaran')
  );
}

export default function Payment() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, dispatch, markCartCleared } = useAppSlice();
  const { removePersistData } = useDataPersist();
  const { paymentUrl, orderId } = useLocalSearchParams<RouteParams<'cart/payment'>>();
  const resolvedPaymentUrl = useMemo(
    () => (Array.isArray(paymentUrl) ? paymentUrl[0] : paymentUrl) ?? '',
    [paymentUrl],
  );
  const resolvedOrderId = useMemo(
    () => (Array.isArray(orderId) ? orderId[0] : orderId) ?? '',
    [orderId],
  );

  const isValidPaymentUrl = useMemo(
    () => isTrustedPaymentUrl(resolvedPaymentUrl),
    [resolvedPaymentUrl],
  );

  const [isPolling, setIsPolling] = useState(false);
  const [paymentResult, setPaymentResult] = useState<PaymentResult['status'] | null>(null);
  const [postPaymentState, setPostPaymentState] = useState<'idle' | 'verifying' | 'timeout'>(
    'idle',
  );
  const [postPaymentMessage, setPostPaymentMessage] = useState<string | null>(null);
  const [confirmCloseDialogOpen, setConfirmCloseDialogOpen] = useState(false);
  const [webviewLoading, setWebviewLoading] = useState(true);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const finalizeOnceRef = useRef(false);
  const shouldHidePaymentChrome =
    postPaymentState !== 'idle' || isPolling || paymentResult === 'success';

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
  }, [resolvedPaymentUrl, shouldHidePaymentChrome]);

  const finalizePaymentFlow = useCallback(
    async (_reason: PaymentResult['status']) => {
      if (finalizeOnceRef.current) {
        return;
      }

      finalizeOnceRef.current = true;
      setPaymentResult(_reason);
      setConfirmCloseDialogOpen(false);
      setWebviewLoading(false);
      setPaymentError(null);
      setPostPaymentState('verifying');
      setPostPaymentMessage(null);

      if (!resolvedOrderId) {
        await removePersistData(DataPersistKeys.CHECKOUT_SESSION);
        router.replace(ORDERS_ROUTE);
        return;
      }

      setIsPolling(true);
      const { data, error } = await pollOrderPaymentStatus(resolvedOrderId, 12, 2000);
      setIsPolling(false);

      const paymentStatus = data?.payment_status ?? '';
      const terminalFailedStates = ['deny', 'cancel', 'expire'];

      await removePersistData(DataPersistKeys.CHECKOUT_SESSION);

      if (!error && PAYMENT_SUCCESS_STATUSES.includes(paymentStatus)) {
        if (user?.id) {
          dispatch(appActions.invalidateUnpaidOrdersCache(user.id));
          dispatch(
            appActions.invalidateOrdersByStatusCache({ cacheKey: 'packing', userId: user.id }),
          );
          dispatch(
            appActions.invalidateOrdersByStatusCache({ cacheKey: 'shipped', userId: user.id }),
          );
          dispatch(
            appActions.invalidateOrdersByStatusCache({ cacheKey: 'completed', userId: user.id }),
          );
        }

        dispatch(markCartCleared(Date.now()));

        router.replace(`/orders/success?orderId=${resolvedOrderId}`);
        return;
      }

      if (error) {
        if (isPollingTimeoutError(error.message)) {
          setPostPaymentState('timeout');
          setPostPaymentMessage('Pembayaran sedang diproses. Cek status di halaman Pesanan.');
          return;
        }

        setPostPaymentState('timeout');
        setPostPaymentMessage(
          translateCheckoutError(
            error.message,
            'Status pembayaran belum dapat dipastikan. Silakan cek halaman pesanan.',
          ),
        );
        return;
      }

      if (terminalFailedStates.includes(paymentStatus)) {
        setPaymentError('Pembayaran terdeteksi gagal atau dibatalkan. Silakan ulangi pembayaran.');

        if (user?.id) {
          dispatch(appActions.invalidateUnpaidOrdersCache(user.id));
          dispatch(
            appActions.invalidateOrdersByStatusCache({ cacheKey: 'packing', userId: user.id }),
          );
          dispatch(
            appActions.invalidateOrdersByStatusCache({ cacheKey: 'shipped', userId: user.id }),
          );
          dispatch(
            appActions.invalidateOrdersByStatusCache({ cacheKey: 'completed', userId: user.id }),
          );
        }

        router.replace(ORDERS_ROUTE);
        return;
      }

      setPostPaymentState('timeout');
      setPostPaymentMessage('Pembayaran sedang diproses. Cek status di halaman Pesanan.');
    },
    [dispatch, markCartCleared, removePersistData, resolvedOrderId, router, user?.id],
  );

  const handlePaymentNavigation = useCallback((url?: string): PaymentResult['status'] | null => {
    const safeUrl = (url || '').toLowerCase();
    if (!safeUrl) {
      return null;
    }

    const transactionStatusMatch = safeUrl.match(/transaction_status=([^&]+)/);
    const transactionStatus =
      transactionStatusMatch && transactionStatusMatch[1]
        ? decodeURIComponent(transactionStatusMatch[1])
        : '';

    if (PAYMENT_SUCCESS_STATUSES.some(status => transactionStatus.includes(status))) {
      return 'success';
    }

    if (PAYMENT_FAILED_STATUSES.some(status => transactionStatus.includes(status))) {
      return 'cancel';
    }

    if (PAYMENT_PENDING_STATUSES.some(status => transactionStatus.includes(status))) {
      return 'pending';
    }

    const reachedFinish =
      safeUrl.includes('/finish') || safeUrl.includes('/unfinish') || safeUrl.includes('/error');

    if (reachedFinish) {
      if (safeUrl.includes('/error') || safeUrl.includes('/unfinish')) {
        return 'cancel';
      }

      return 'pending';
    }

    return null;
  }, []);

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
            onShouldStartLoadWithRequest={request => {
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
            }}
            onNavigationStateChange={navState => {
              const navigationStatus = handlePaymentNavigation(navState.url);
              if (navigationStatus) {
                void finalizePaymentFlow(navigationStatus);
              }
            }}
            onError={() => {
              setPaymentError('Koneksi pembayaran terputus. Kami akan cek status order Anda.');
              void finalizePaymentFlow('pending');
            }}
            onHttpError={() => {
              setPaymentError(
                'Halaman pembayaran tidak dapat dimuat. Kami cek status pembayaran Anda.',
              );
              void finalizePaymentFlow('pending');
            }}
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
