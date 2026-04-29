import React, { useCallback, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button as TamaguiButton, Separator, Text, XStack, YStack } from 'tamagui';
import { StickyBottomBar } from '@/components/elements/StickyBottomBar/StickyBottomBar';
import { MapPinIcon, ShoppingBagIcon, TruckIcon } from '@/components/icons';
import { useCartCheckout } from '@/hooks/useCartCheckout';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useAppSlice } from '@/slices';
import type { Address } from '@/types/address';
import type { CartSnapshot, ItemSummary } from '@/types/cart';
import type { RouteParams } from '@/types/routes.types';
import type { ShippingOption } from '@/types/shipping';
import { translateErrorMessage, type AppError } from '@/utils/error';
import { BOTTOM_BAR_HEIGHT } from '@/constants/ui';
import { formatRupiah } from '@/scenes/cart/cart.constants';
import { resolveRouteParam } from '@/scenes/cart/payment.utils';

function parseJsonRouteParam<T>(param: string | string[] | undefined): T | null {
  const resolvedParam = resolveRouteParam(param);

  if (!resolvedParam) {
    return null;
  }

  try {
    return JSON.parse(resolvedParam) as T;
  } catch {
    return null;
  }
}

function parseSelectedCartItemIds(param: string | string[] | undefined): string[] | null {
  const parsedValue = parseJsonRouteParam<unknown>(param);

  if (!Array.isArray(parsedValue)) {
    return null;
  }

  const selectedIds = parsedValue.map(item => (typeof item === 'string' ? item.trim() : ''));

  if (selectedIds.length === 0 || selectedIds.some(item => item.length === 0)) {
    return null;
  }

  return selectedIds;
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <YStack
      borderWidth={1}
      borderColor="$danger"
      borderRadius="$3"
      padding="$3"
      backgroundColor="$dangerSoft">
      <Text color="$danger" fontSize="$3" fontWeight="600">
        {message}
      </Text>
    </YStack>
  );
}

function ReviewSection({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <YStack gap="$1.5" padding="$4">
      <XStack alignItems="center" gap="$2" paddingBottom="$1">
        {icon}
        <Text
          fontSize="$2"
          fontWeight="700"
          color="$primary"
          textTransform="uppercase"
          letterSpacing={0.5}>
          {label}
        </Text>
      </XStack>
      {children}
    </YStack>
  );
}

function TotalRow({ label, value, isTotal }: { label: string; value: string; isTotal?: boolean }) {
  return (
    <XStack justifyContent="space-between" alignItems="center">
      <Text
        fontSize={isTotal ? '$4' : '$3'}
        fontWeight={isTotal ? '700' : '400'}
        color={isTotal ? '$color' : '$colorSubtle'}>
        {label}
      </Text>
      <Text
        fontSize={isTotal ? '$5' : '$3'}
        fontWeight={isTotal ? '800' : '500'}
        color={isTotal ? '$primary' : '$color'}>
        {value}
      </Text>
    </XStack>
  );
}

export default function CheckoutReview() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAppSlice();
  const { isOffline } = useNetworkStatus();
  const params = useLocalSearchParams<RouteParams<'cart/review'>>();
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const selectedAddress = useMemo(
    () => parseJsonRouteParam<Address>(params.addressPayload),
    [params.addressPayload],
  );
  const selectedAddressFullText = useMemo(
    () => resolveRouteParam(params.addressText),
    [params.addressText],
  );
  const selectedShippingOption = useMemo(
    () => parseJsonRouteParam<ShippingOption>(params.shippingOptionPayload),
    [params.shippingOptionPayload],
  );
  const snapshot = useMemo(
    () => parseJsonRouteParam<CartSnapshot>(params.snapshotPayload),
    [params.snapshotPayload],
  );
  const itemSummaries = useMemo(
    () => parseJsonRouteParam<ItemSummary[]>(params.itemSummariesPayload),
    [params.itemSummariesPayload],
  );
  const selectedCartItemIds = useMemo(
    () => parseSelectedCartItemIds(params.selectedCartItemIdsPayload),
    [params.selectedCartItemIdsPayload],
  );
  const selectedShippingKey = useMemo(
    () => resolveRouteParam(params.selectedShippingKey),
    [params.selectedShippingKey],
  );
  const quoteAreaId = useMemo(() => resolveRouteParam(params.quoteAreaId), [params.quoteAreaId]);
  const quotePostalCode = useMemo(() => {
    const value = resolveRouteParam(params.quotePostalCode);

    if (!value) {
      return null;
    }

    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }, [params.quotePostalCode]);

  const invalidReviewState =
    !selectedAddress || !selectedShippingOption || !snapshot || !selectedCartItemIds;

  const {
    startingCheckout,
    activeOrderId,
    paymentError,
    handleStartCheckout,
    clearCheckoutSession,
    resetPaymentError,
  } = useCartCheckout({
    userId: user?.id,
    selectedAddress,
    selectedAddressId: selectedAddress?.id ?? null,
    loadingSelectedAddress: false,
    selectedShippingOption,
    selectedShippingKey: selectedShippingKey || null,
    selectedCartItemIds: selectedCartItemIds ?? [],
    quoteDestination: {
      areaId: quoteAreaId || null,
      postalCode: quotePostalCode,
    },
    snapshot: snapshot ?? {
      itemCount: 0,
      estimatedWeightGrams: 0,
      packageValue: 0,
    },
    isOffline,
    onOfflineAction: message => setCheckoutError(message),
    onError: (error: AppError) => setCheckoutError(translateErrorMessage(error)),
  });

  const totalAmount = useMemo(() => {
    if (!snapshot || !selectedShippingOption) {
      return 0;
    }

    return snapshot.packageValue + selectedShippingOption.price;
  }, [selectedShippingOption, snapshot]);

  const handleContinueToPayment = useCallback(async () => {
    setCheckoutError(null);
    resetPaymentError();
    await handleStartCheckout();
  }, [handleStartCheckout, resetPaymentError]);

  const handleCancelPendingCheckout = useCallback(async () => {
    await clearCheckoutSession();
    router.replace('/cart');
  }, [clearCheckoutSession, router]);

  if (invalidReviewState) {
    return (
      <YStack
        flex={1}
        backgroundColor="$background"
        alignItems="center"
        justifyContent="center"
        px="$5"
        gap="$3">
        <Text textAlign="center" color="$danger" fontWeight="700">
          Data review pesanan tidak lengkap.
        </Text>
        <Text textAlign="center" color="$colorSubtle" fontSize="$3">
          Kembali ke keranjang lalu pilih alamat dan kurir sebelum melanjutkan checkout.
        </Text>
        <TamaguiButton
          backgroundColor="$primary"
          color="$onPrimary"
          borderRadius="$3"
          minHeight={44}
          onPress={() => router.replace('/cart')}
          aria-label="Kembali ke keranjang">
          Kembali ke Keranjang
        </TamaguiButton>
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="$background">
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          gap: 12,
          paddingBottom: BOTTOM_BAR_HEIGHT + insets.bottom + 16,
        }}
        showsVerticalScrollIndicator={false}>
        <YStack
          borderWidth={1}
          borderColor="$primary"
          borderRadius="$4"
          backgroundColor="$surface"
          padding="$4"
          gap="$1.5">
          <Text color="$color" fontSize="$3" lineHeight="$4">
            Tinjau Kembali detail pesanan Anda sebelum Melanjutkan pembayaran
          </Text>
          <Text color="$colorSubtle" fontSize="$2" lineHeight="$3">
            Produk yang tidak dipilih tetap tersimpan di keranjang.
          </Text>
        </YStack>

        {checkoutError ? <ErrorBanner message={checkoutError} /> : null}
        {paymentError ? <ErrorBanner message={paymentError} /> : null}
        {isOffline ? <ErrorBanner message="Checkout tidak tersedia offline." /> : null}

        <YStack
          borderWidth={1}
          borderColor="$surfaceBorder"
          borderRadius="$4"
          backgroundColor="$surface"
          overflow="hidden">
          <ReviewSection icon={<MapPinIcon size={16} color="$primary" />} label="Alamat Pengiriman">
            <YStack gap="$0.5" paddingLeft="$5">
              <XStack alignItems="baseline" gap="$2" flex={1}>
                <Text color="$color" fontWeight="700" numberOfLines={1}>
                  {selectedAddress.receiver_name}
                </Text>
                <Text color="$colorSubtle" fontSize="$2" numberOfLines={1}>
                  {selectedAddress.phone_number}
                </Text>
              </XStack>
              <Text color="$colorSubtle" fontSize="$3" numberOfLines={3}>
                {selectedAddressFullText}
              </Text>
            </YStack>
          </ReviewSection>

          <Separator marginHorizontal="$4" />

          <ReviewSection icon={<TruckIcon size={16} color="$primary" />} label="Pengiriman">
            <YStack gap="$0.5" paddingLeft="$5">
              <Text color="$color" fontWeight="700" numberOfLines={1}>
                {selectedShippingOption.courier_name} — {selectedShippingOption.service_name}
              </Text>
              <Text color="$colorSubtle" fontSize="$2" numberOfLines={1}>
                Estimasi {selectedShippingOption.estimated_delivery}
              </Text>
              <Text color="$primary" fontWeight="700" fontSize="$3" paddingTop="$1">
                {formatRupiah(selectedShippingOption.price)}
              </Text>
            </YStack>
          </ReviewSection>

          <Separator marginHorizontal="$4" />

          <ReviewSection
            icon={<ShoppingBagIcon size={16} color="$primary" />}
            label="Ringkasan Pesanan">
            {itemSummaries && itemSummaries.length > 0 ? (
              <YStack gap="$1" paddingBottom="$2">
                {itemSummaries.map((item, index) => (
                  <XStack key={index} justifyContent="space-between" alignItems="center">
                    <Text color="$color" fontSize="$3" numberOfLines={2} flex={1}>
                      {item.name}
                    </Text>
                    <Text color="$colorSubtle" fontSize="$2" paddingLeft="$2">
                      ×{item.quantity}
                    </Text>
                  </XStack>
                ))}
              </YStack>
            ) : null}
            <TotalRow
              label={`Subtotal ${snapshot.itemCount} barang`}
              value={formatRupiah(snapshot.packageValue)}
            />
            <TotalRow label="Ongkos kirim" value={formatRupiah(selectedShippingOption.price)} />
            <Separator marginVertical="$1" />
            <TotalRow label="Total" value={formatRupiah(totalAmount)} isTotal />
          </ReviewSection>
        </YStack>

        {activeOrderId ? (
          <YStack
            borderWidth={1}
            borderColor="$warning"
            borderRadius="$3"
            padding="$3"
            backgroundColor="$warningSoft"
            gap="$2">
            <Text color="$warning" fontWeight="700">
              Checkout Tertunda
            </Text>
            <Text color="$colorSubtle" fontSize="$2">
              Pesanan sudah dibuat. Lanjutkan pembayaran atau batalkan sesi checkout ini.
            </Text>
            <XStack justifyContent="flex-end">
              <TamaguiButton
                size="$2"
                borderRadius="$3"
                backgroundColor="transparent"
                borderWidth={1}
                borderColor="$surfaceBorder"
                color="$color"
                onPress={() => {
                  void handleCancelPendingCheckout();
                }}
                aria-label="Batalkan checkout tertunda">
                Batalkan Checkout
              </TamaguiButton>
            </XStack>
          </YStack>
        ) : null}
      </ScrollView>

      <StickyBottomBar
        grandTotal={totalAmount}
        isLoading={startingCheckout}
        disabled={isOffline}
        hideTotal
        onConfirm={() => {
          void handleContinueToPayment();
        }}
        confirmText={activeOrderId ? 'Lanjutkan Pembayaran' : 'Lanjutkan ke Pembayaran'}
      />
    </YStack>
  );
}
