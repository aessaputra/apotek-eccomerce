'use client';

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RefreshCw } from '@tamagui/lucide-icons';
import {
  YStack,
  XStack,
  Text,
  useTheme,
  Card,
  Spinner,
  Separator,
  Sheet,
  Button as TamaguiButton,
} from 'tamagui';
import { getThemeColor } from '@/utils/theme';
import { CartIcon, ChevronRightIcon, MapPinIcon } from '@/components/icons';
import { CartItemCard } from '@/components/elements/CartItemCard';
import { CartSummary } from '@/components/elements/CartSummary/CartSummary';
import { StickyBottomBar } from '@/components/elements/StickyBottomBar/StickyBottomBar';
import { EmptyCartState } from '@/components/elements/EmptyCartState/EmptyCartState';
import { CartLoadingSkeleton } from '@/components/elements/CartLoadingSkeleton/CartLoadingSkeleton';
import AddressCard from '@/components/elements/AddressCard';
import { useAppSlice } from '@/slices';
import { useCartAddress } from '@/hooks/useCartAddress';
import { useCartCheckout } from '@/hooks/useCartCheckout';
import { useCartPaginated } from '@/hooks/useCartPaginated';
import { useCartShipping } from '@/hooks/useCartShipping';
import { removeCartItem } from '@/services/cart.service';
import { useCartQuantity } from '@/hooks/useCartQuantity';
import { formatAddress, resolveBadgeText } from '@/utils/address';
import { ErrorType, translateErrorMessage, type AppError } from '@/utils/error';
import type { Address } from '@/types/address';
import type { CartItemWithProduct } from '@/types/cart';
import type { ShippingOption } from '@/types/shipping';
import { BOTTOM_BAR_HEIGHT } from '@/constants/ui';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

interface CartItemRendererProps {
  item: CartItemWithProduct;
  onQuantityChange: (cartItemId: string, newQuantity: number) => void;
  onRemove: (cartItemId: string) => void;
  disabled?: boolean;
}

const CartItemRenderer = memo(function CartItemRenderer({
  item,
  onQuantityChange,
  onRemove,
  disabled: _disabled,
}: CartItemRendererProps) {
  return (
    <CartItemCard
      item={item}
      onQuantityChange={onQuantityChange}
      onRemove={onRemove}
      disabled={false}
    />
  );
});

const COURIER_CARD_PRESS_STYLE = {
  scale: 0.98,
  opacity: 0.9,
} as const;
const COURIER_CARD_ANIMATE_ONLY = ['transform', 'opacity'];

type ErrorBannerType = 'warning' | 'danger';

interface ErrorBannerProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  type?: ErrorBannerType;
}

function ErrorBanner({ title, message, onRetry, type = 'danger' }: ErrorBannerProps) {
  const isWarning = type === 'warning';
  const resolvedTitle =
    title ?? (isWarning ? 'Menampilkan data keranjang tersimpan.' : 'Gagal memuat keranjang.');

  return (
    <Card
      borderRadius="$4"
      borderWidth={1}
      borderColor={isWarning ? '$primary' : '$danger'}
      padding="$3"
      backgroundColor={isWarning ? '$surfaceSubtle' : '$surface'}>
      <YStack gap="$2">
        <Text color={isWarning ? '$primary' : '$danger'} fontWeight="700">
          {resolvedTitle}
        </Text>
        <Text color={isWarning ? '$colorSubtle' : '$danger'}>{message}</Text>
        {onRetry ? (
          <XStack justifyContent="flex-end">
            <TamaguiButton
              size="$2"
              circular
              backgroundColor="transparent"
              borderWidth={1}
              borderColor={isWarning ? '$primary' : '$danger'}
              color={isWarning ? '$primary' : '$danger'}
              onPress={onRetry}
              icon={<RefreshCw size={14} color={isWarning ? '$primary' : '$danger'} />}
              aria-label="Muat ulang keranjang"
            />
          </XStack>
        ) : null}
      </YStack>
    </Card>
  );
}

interface OfflineBannerProps {
  hasCachedData: boolean;
}

function OfflineBanner({ hasCachedData }: OfflineBannerProps) {
  return (
    <Card
      borderRadius="$4"
      borderWidth={1}
      borderColor="$warning"
      padding="$3"
      backgroundColor="$warningSoft">
      <YStack gap="$1">
        <Text color="$warning" fontWeight="700">
          Koneksi internet terputus
        </Text>
        <Text color="$colorSubtle">
          {hasCachedData
            ? 'Data keranjang tersimpan tetap ditampilkan.'
            : 'Koneksi internet terputus. Data keranjang tidak tersedia.'}
        </Text>
      </YStack>
    </Card>
  );
}

function getRecoverySuggestion(error: AppError): string | null {
  switch (error.type) {
    case ErrorType.NETWORK:
    case ErrorType.TIMEOUT:
      return 'Periksa koneksi internet Anda, lalu tekan tombol muat ulang.';
    case ErrorType.AUTH:
      return 'Login ulang diperlukan agar proses checkout bisa dilanjutkan.';
    case ErrorType.SERVER:
      return 'Coba lagi dalam beberapa menit. Jika masalah berlanjut, hubungi dukungan.';
    case ErrorType.VALIDATION:
      return 'Periksa alamat, kurir, dan jumlah produk sebelum mencoba lagi.';
    case ErrorType.ABORT:
      return 'Ulangi proses yang dibatalkan jika masih diperlukan.';
    case ErrorType.UNKNOWN:
    default:
      return error.retryable ? 'Silakan coba lagi beberapa saat lagi.' : null;
  }
}

interface CourierOptionCardProps {
  option: ShippingOption;
  optionKey: string;
  isSelected: boolean;
  onSelect: (shippingKey: string) => void;
  formatRupiah: (amount: number) => string;
}

const CourierOptionCard = React.memo(function CourierOptionCard({
  option,
  optionKey,
  isSelected,
  onSelect,
  formatRupiah,
}: CourierOptionCardProps) {
  const handlePress = React.useCallback(() => {
    onSelect(optionKey);
  }, [onSelect, optionKey]);

  return (
    <Card
      onPress={handlePress}
      role="button"
      aria-label={`${option.courier_name} ${option.service_name} ${formatRupiah(option.price)}`}
      animation="quick"
      animateOnly={COURIER_CARD_ANIMATE_ONLY}
      pressStyle={COURIER_CARD_PRESS_STYLE}
      borderRadius="$4"
      borderWidth={2}
      borderColor={isSelected ? '$primary' : '$surfaceBorder'}
      padding="$3"
      backgroundColor="$surface">
      <XStack justifyContent="space-between" alignItems="flex-start" gap="$2">
        <YStack flex={1} gap="$0.5">
          <Text fontSize="$4" fontWeight="700" color="$color" numberOfLines={2}>
            {option.courier_name} - {option.service_name}
          </Text>
          <Text fontSize="$3" color="$colorSubtle">
            Estimasi: {option.estimated_delivery}
          </Text>
        </YStack>
        <Text fontSize="$4" fontWeight="700" color="$primary" flexShrink={0}>
          {formatRupiah(option.price)}
        </Text>
      </XStack>
    </Card>
  );
});

interface AddressCardSheetProps {
  address: Address;
  isSelected: boolean;
  onSelect: (addressId: string) => void;
}

const AddressCardSheet = React.memo(function AddressCardSheet({
  address,
  isSelected,
  onSelect,
}: AddressCardSheetProps) {
  const handlePress = React.useCallback(() => {
    onSelect(address.id);
  }, [address.id, onSelect]);

  return (
    <AddressCard
      address={address}
      selected={isSelected}
      badgeText={resolveBadgeText(address)}
      onPress={handlePress}
    />
  );
});

export default function Cart() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { user } = useAppSlice();
  const { isOffline } = useNetworkStatus();
  const isNetworkUnavailable = isOffline;
  const subtleColor = getThemeColor(theme, 'colorPress');
  const [offlineActionMessage, setOfflineActionMessage] = useState<string | null>(null);
  const [cartActionError, setCartActionError] = useState<string | null>(null);
  const [delegatedError, setDelegatedError] = useState<AppError | null>(null);
  const [addressError, setAddressError] = useState<AppError | null>(null);
  const offlineMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {
    items: serverItems,
    snapshot: serverSnapshot,
    error,
    isLoading,
    isRefreshing,
    refresh,
    realtimeState,
  } = useCartPaginated({
    userId: user?.id,
  });
  const { items, snapshot, updateQuantity } = useCartQuantity({
    items: serverItems,
    snapshot: serverSnapshot,
    onError: setCartActionError,
  });

  const onOfflineAction = useCallback((message: string) => {
    setOfflineActionMessage(message);
  }, []);

  const {
    selectedAddress,
    selectedAddressId,
    loadingSelectedAddress,
    availableAddresses,
    loadingAddresses,
    addressSheetOpen,
    setAddressSheetOpen,
    handleOpenAddressSheet,
    handleSelectAddress,
  } = useCartAddress({
    userId: user?.id,
    isOffline: isNetworkUnavailable,
    onOfflineAction,
    onError: setAddressError,
  });

  const {
    shippingOptions,
    selectedShippingOption,
    loadingRates,
    shippingError,
    setShippingError,
    selectedShippingKey,
    shippingSheetOpen,
    setShippingSheetOpen,
    handleCalculateShipping,
    handleSelectShippingKey,
    handleOpenShippingSheet,
    quoteDestination,
  } = useCartShipping({
    selectedAddress,
    selectedAddressId,
    snapshot,
    isOffline: isNetworkUnavailable,
    onOfflineAction,
  });

  useEffect(() => {
    if (!delegatedError) {
      return;
    }

    setShippingError(delegatedError);
    setDelegatedError(null);
  }, [delegatedError, setShippingError]);

  const handleQuantityChange = useCallback(
    (cartItemId: string, newQuantity: number) => {
      if (isOffline) {
        setOfflineActionMessage('Perubahan jumlah produk tidak tersedia offline.');
        return;
      }

      setCartActionError(null);

      updateQuantity(cartItemId, newQuantity);
    },
    [isOffline, updateQuantity],
  );

  const handleRemoveItem = useCallback(
    async (cartItemId: string) => {
      if (isOffline) {
        setOfflineActionMessage('Hapus produk tidak tersedia offline.');
        return;
      }

      setCartActionError(null);

      const { error: removeError } = await removeCartItem(cartItemId);

      if (removeError) {
        setCartActionError(removeError.message);
        return;
      }

      await refresh({ silent: true });
    },
    [isOffline, refresh],
  );

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
    selectedAddressId,
    selectedShippingOption,
    selectedShippingKey,
    quoteDestination,
    snapshot,
    isOffline: isNetworkUnavailable,
    onOfflineAction,
    onError: setDelegatedError,
  });

  useEffect(() => {
    if (selectedAddressId || selectedAddress) {
      setAddressError(null);
    }
  }, [selectedAddress, selectedAddressId]);

  const selectedAddressFullText = useMemo(() => {
    if (!selectedAddress) {
      return '';
    }

    return formatAddress(selectedAddress);
  }, [selectedAddress]);

  const hasCachedCartData = useMemo(() => {
    return items.length > 0;
  }, [items.length]);

  const shippingErrorMessage = useMemo(() => {
    if (!shippingError) {
      return null;
    }

    return translateErrorMessage(shippingError);
  }, [shippingError]);

  const addressErrorMessage = useMemo(() => {
    if (!addressError) {
      return null;
    }

    return translateErrorMessage(addressError);
  }, [addressError]);

  const shippingRecoverySuggestion = useMemo(() => {
    if (!shippingError) {
      return null;
    }

    return getRecoverySuggestion(shippingError);
  }, [shippingError]);

  const formatRupiah = useCallback((amount: number): string => {
    return `Rp ${amount.toLocaleString('id-ID')}`;
  }, []);

  useEffect(() => {
    if (offlineMessageTimerRef.current) {
      clearTimeout(offlineMessageTimerRef.current);
      offlineMessageTimerRef.current = null;
    }

    if (!offlineActionMessage) {
      return;
    }

    offlineMessageTimerRef.current = setTimeout(() => {
      setOfflineActionMessage(null);
      offlineMessageTimerRef.current = null;
    }, 3000);
  }, [offlineActionMessage]);

  const handleWrappedStartCheckout = useCallback(async () => {
    setShippingError(null);
    setDelegatedError(null);
    await handleStartCheckout();
  }, [handleStartCheckout, setShippingError]);

  const handleCartRefresh = useCallback(() => {
    if (isOffline) {
      setOfflineActionMessage('Muat ulang keranjang tidak tersedia offline.');
      return;
    }

    void refresh();
  }, [isOffline, refresh]);

  useEffect(() => {
    return () => {
      if (offlineMessageTimerRef.current) {
        clearTimeout(offlineMessageTimerRef.current);
        offlineMessageTimerRef.current = null;
      }
    };
  }, []);

  if (!user) {
    return (
      <YStack flex={1} backgroundColor="$background">
        <YStack flex={1} alignItems="center" justifyContent="center" padding="$5" gap="$4">
          <CartIcon size={64} color={subtleColor} />
          <Text fontSize="$6" fontWeight="700" color="$color" textAlign="center">
            Login Terlebih Dahulu
          </Text>
          <Text fontSize="$4" color="$colorPress" textAlign="center" maxWidth={300} lineHeight="$4">
            Masuk ke akun Anda untuk menghitung ongkir berdasarkan alamat tersimpan.
          </Text>
        </YStack>
      </YStack>
    );
  }

  if (isLoading && items.length === 0) {
    return (
      <YStack flex={1} backgroundColor="$background" padding="$4" gap="$3">
        <CartLoadingSkeleton rowCount={4} />
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="$background" position="relative">
      <FlatList
        data={items}
        renderItem={({ item }: { item: CartItemWithProduct }) => (
          <CartItemRenderer
            item={item}
            onQuantityChange={handleQuantityChange}
            onRemove={handleRemoveItem}
            disabled={false}
          />
        )}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 16,
          gap: 12,
          paddingBottom: BOTTOM_BAR_HEIGHT + insets.bottom + 16,
        }}
        ListHeaderComponent={
          <YStack gap="$3">
            {isOffline ? <OfflineBanner hasCachedData={hasCachedCartData} /> : null}

            {offlineActionMessage ? (
              <Card
                borderRadius="$4"
                borderWidth={1}
                borderColor="$warning"
                padding="$3"
                backgroundColor="$surfaceSubtle">
                <Text color="$warning" fontWeight="600">
                  {offlineActionMessage}
                </Text>
              </Card>
            ) : null}

            {!isOffline && realtimeState !== 'connected' ? (
              <Card
                borderRadius="$4"
                borderWidth={1}
                borderColor={realtimeState === 'reconnecting' ? '$warning' : '$surfaceBorder'}
                padding="$3"
                backgroundColor="$surfaceSubtle">
                <Text
                  color={realtimeState === 'reconnecting' ? '$warning' : '$colorSubtle'}
                  fontWeight="600">
                  {realtimeState === 'reconnecting'
                    ? 'Sinkronisasi keranjang menyambung kembali...'
                    : 'Menyambungkan sinkronisasi keranjang...'}
                </Text>
              </Card>
            ) : null}

            {error ? <ErrorBanner message={error} onRetry={handleCartRefresh} /> : null}

            {cartActionError ? (
              <ErrorBanner
                title="Gagal memperbarui keranjang."
                message={cartActionError}
                onRetry={() => setCartActionError(null)}
                type="warning"
              />
            ) : null}
          </YStack>
        }
        ListEmptyComponent={
          !isLoading ? (
            <YStack marginTop="$1">
              <EmptyCartState onBrowse={() => router.push('/home')} />
            </YStack>
          ) : null
        }
        ListFooterComponent={
          items.length > 0 && !isLoading ? (
            <YStack gap="$4" paddingTop="$1">
              {loadingSelectedAddress ? (
                <YStack alignItems="center" justifyContent="center" paddingVertical="$5">
                  <Spinner size="large" color="$primary" />
                </YStack>
              ) : selectedAddress ? (
                <Card
                  bordered
                  elevate
                  size="$4"
                  backgroundColor="$surface"
                  borderColor="$surfaceBorder"
                  onPress={handleOpenAddressSheet}
                  aria-label="Ganti alamat pengiriman">
                  <XStack padding="$4" gap="$3" alignItems="center">
                    <XStack alignSelf="flex-start" marginTop="$1">
                      <MapPinIcon size={20} color="$primary" />
                    </XStack>

                    <YStack gap="$1" flex={1}>
                      <XStack alignItems="center" gap="$1" flex={1}>
                        <Text color="$color" fontWeight="700" numberOfLines={1}>
                          {selectedAddress.receiver_name}
                        </Text>
                        <Text color="$colorSubtle" fontSize="$3">
                          {' | '}
                        </Text>
                        <Text color="$colorSubtle" fontSize="$3" numberOfLines={1} flex={1}>
                          {selectedAddress.phone_number}
                        </Text>
                      </XStack>
                      <Text color="$colorSubtle" numberOfLines={2}>
                        {selectedAddressFullText}
                      </Text>
                    </YStack>

                    <XStack alignItems="center" justifyContent="center">
                      <ChevronRightIcon size={16} color="$colorSubtle" />
                    </XStack>
                  </XStack>
                </Card>
              ) : (
                <Card
                  borderRadius="$4"
                  borderWidth={1}
                  borderStyle="dashed"
                  borderColor="$surfaceBorder"
                  backgroundColor="$surface"
                  padding="$4">
                  <YStack gap="$3">
                    <XStack alignItems="center" gap="$2">
                      <MapPinIcon size={18} color="$primary" />
                      <Text color="$color" fontWeight="600">
                        Belum ada alamat
                      </Text>
                    </XStack>
                    <TamaguiButton
                      backgroundColor="$primary"
                      color="$onPrimary"
                      borderRadius="$3"
                      minHeight={44}
                      onPress={handleOpenAddressSheet}
                      aria-label="Tambah alamat pengiriman">
                      Tambah Alamat
                    </TamaguiButton>
                  </YStack>
                </Card>
              )}

              {addressErrorMessage ? (
                <Card
                  borderRadius="$4"
                  borderWidth={1}
                  borderColor="$danger"
                  padding="$3"
                  backgroundColor="$surface">
                  <Text color="$danger">{addressErrorMessage}</Text>
                </Card>
              ) : null}

              <Card
                bordered
                elevate
                size="$4"
                backgroundColor="$surface"
                borderColor="$surfaceBorder"
                opacity={isNetworkUnavailable ? 0.7 : 1}
                onPress={handleOpenShippingSheet}>
                <Card.Header padded>
                  <XStack alignItems="center" justifyContent="space-between" gap="$3">
                    <Text fontSize="$4" fontWeight="600" color="$color" numberOfLines={1} flex={1}>
                      Opsi Pengiriman
                    </Text>
                    {loadingRates ? (
                      <Spinner size="small" color="$primary" />
                    ) : (
                      <ChevronRightIcon size={16} color="$colorSubtle" />
                    )}
                  </XStack>
                </Card.Header>

                <Separator />

                <XStack padding="$3" gap="$3" alignItems="center">
                  {selectedShippingOption ? (
                    <>
                      <YStack flex={1} gap="$0.5" minWidth={0}>
                        <Text color="$color" fontWeight="700" numberOfLines={1}>
                          {selectedShippingOption.courier_name} -{' '}
                          {selectedShippingOption.service_name}
                        </Text>
                        <Text color="$colorSubtle" fontSize="$3" numberOfLines={1}>
                          Estimasi: {selectedShippingOption.estimated_delivery}
                        </Text>
                      </YStack>
                      <Text color="$primary" fontWeight="700" flexShrink={0}>
                        {formatRupiah(selectedShippingOption.price)}
                      </Text>
                    </>
                  ) : (
                    <Text flex={1} color="$colorSubtle" fontWeight="500" textAlign="center">
                      Pilih Kurir
                    </Text>
                  )}
                </XStack>

                {isOffline ? (
                  <XStack px="$3" pb="$3">
                    <Text fontSize="$2" color="$warning" fontWeight="600">
                      Tidak tersedia offline
                    </Text>
                  </XStack>
                ) : null}
              </Card>

              <Card bordered elevate size="$4">
                <Card.Header padded>
                  <Text fontSize="$4" fontWeight="600" color="$color">
                    Ringkasan Pesanan
                  </Text>
                </Card.Header>
                <Separator />
                <CartSummary
                  subtotal={snapshot.packageValue}
                  shippingCost={selectedShippingOption?.price}
                  shippingName={selectedShippingOption?.courier_name}
                  itemCount={snapshot.itemCount}
                  isLoadingShipping={loadingRates}
                />
              </Card>

              {activeOrderId ? (
                <Card
                  borderRadius="$4"
                  borderWidth={1}
                  borderColor="$warning"
                  padding="$3"
                  backgroundColor="$warningSoft">
                  <YStack gap="$2.5">
                    <Text color="$warning" fontWeight="700">
                      Pembayaran Tertunda
                    </Text>
                    <Text color="$colorSubtle" fontSize="$2">
                      {paymentError ??
                        'Order sudah dibuat. Lanjutkan pembayaran untuk menggunakan order yang sama tanpa membuat order baru. Pilihan kurir tidak wajib dipilih ulang saat melanjutkan pembayaran.'}
                    </Text>
                    <XStack justifyContent="flex-end" gap="$2">
                      <TamaguiButton
                        size="$2"
                        borderRadius="$3"
                        backgroundColor="transparent"
                        borderWidth={1}
                        borderColor="$surfaceBorder"
                        color="$color"
                        onPress={() => {
                          void clearCheckoutSession();
                        }}
                        aria-label="Batalkan checkout tertunda">
                        Batalkan
                      </TamaguiButton>
                      <TamaguiButton
                        size="$2"
                        borderRadius="$3"
                        backgroundColor="$primary"
                        color="$onPrimary"
                        disabled={isNetworkUnavailable || startingCheckout}
                        opacity={isNetworkUnavailable || startingCheckout ? 0.7 : 1}
                        onPress={() => {
                          resetPaymentError();
                          void handleWrappedStartCheckout();
                        }}
                        aria-label="Lanjutkan pembayaran">
                        {startingCheckout ? 'Memproses...' : 'Lanjutkan Pembayaran'}
                      </TamaguiButton>
                    </XStack>
                  </YStack>
                </Card>
              ) : null}

              {shippingError && shippingOptions.length === 0 && !loadingRates ? (
                <XStack justifyContent="flex-end" marginTop="$-2">
                  <TamaguiButton
                    size="$2"
                    circular
                    backgroundColor="transparent"
                    borderWidth={1}
                    borderColor="$surfaceBorder"
                    color="$primary"
                    onPress={() => {
                      void handleCalculateShipping();
                    }}
                    icon={<RefreshCw size={14} color="$primary" />}
                    aria-label="Muat ulang ongkir"
                  />
                </XStack>
              ) : null}

              {shippingError ? (
                <Card
                  borderRadius="$4"
                  borderWidth={1}
                  borderColor="$danger"
                  padding="$3"
                  backgroundColor="$surface">
                  <YStack gap="$1.5">
                    <Text color="$danger">{shippingErrorMessage ?? 'Terjadi kesalahan.'}</Text>
                    {shippingRecoverySuggestion ? (
                      <Text color="$colorSubtle" fontSize="$2">
                        {shippingRecoverySuggestion}
                      </Text>
                    ) : null}
                  </YStack>
                </Card>
              ) : null}
            </YStack>
          ) : null
        }
        refreshing={isNetworkUnavailable ? false : isRefreshing}
        onRefresh={isNetworkUnavailable ? undefined : handleCartRefresh}
      />

      <Sheet
        modal
        dismissOnOverlayPress
        dismissOnSnapToBottom
        moveOnKeyboardChange
        snapPoints={[60]}
        open={shippingSheetOpen}
        onOpenChange={setShippingSheetOpen}
        animation="medium"
        animationConfig={{
          type: 'spring',
          damping: 24,
          mass: 0.9,
          stiffness: 200,
        }}>
        <Sheet.Overlay
          animation="lazy"
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
          backgroundColor="$sheetOverlay"
        />
        <Sheet.Handle />
        <Sheet.Frame
          backgroundColor="$surfaceSubtle"
          borderTopLeftRadius="$6"
          borderTopRightRadius="$6">
          <YStack flex={1}>
            <YStack px="$4" pt="$2" pb="$3">
              <Text fontSize="$6" fontWeight="700" color="$color">
                Opsi Pengiriman
              </Text>
            </YStack>

            <Sheet.ScrollView showsVerticalScrollIndicator={false}>
              <YStack gap="$2" px="$4" pb="$4">
                {shippingOptions.map(option => {
                  const optionKey = `${option.courier_code}-${option.service_code}`;

                  return (
                    <CourierOptionCard
                      key={optionKey}
                      option={option}
                      optionKey={optionKey}
                      isSelected={selectedShippingKey === optionKey}
                      onSelect={handleSelectShippingKey}
                      formatRupiah={formatRupiah}
                    />
                  );
                })}
              </YStack>
            </Sheet.ScrollView>

            <YStack px="$4" pt="$2" pb="$4">
              <TamaguiButton
                borderRadius="$3"
                minHeight={44}
                backgroundColor="$primary"
                color="$surface"
                disabled={isNetworkUnavailable}
                opacity={isNetworkUnavailable ? 0.6 : 1}
                onPress={() => setShippingSheetOpen(false)}>
                Konfirmasi
              </TamaguiButton>
              {isOffline ? (
                <Text fontSize="$2" color="$warning" textAlign="center" marginTop="$2">
                  Tidak tersedia offline
                </Text>
              ) : null}
            </YStack>
          </YStack>
        </Sheet.Frame>
      </Sheet>

      <Sheet
        modal
        dismissOnOverlayPress
        dismissOnSnapToBottom
        moveOnKeyboardChange
        snapPoints={[60]}
        open={addressSheetOpen}
        onOpenChange={setAddressSheetOpen}
        animation="medium"
        animationConfig={{
          type: 'spring',
          damping: 24,
          mass: 0.9,
          stiffness: 200,
        }}>
        <Sheet.Overlay
          animation="lazy"
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
          backgroundColor="$sheetOverlay"
        />
        <Sheet.Handle />
        <Sheet.Frame
          backgroundColor="$surfaceSubtle"
          borderTopLeftRadius="$6"
          borderTopRightRadius="$6">
          <YStack flex={1}>
            <YStack px="$4" pt="$2" pb="$3">
              <Text fontSize="$6" fontWeight="700" color="$color">
                Pilih Alamat
              </Text>
            </YStack>

            {loadingAddresses ? (
              <YStack flex={1} alignItems="center" justifyContent="center">
                <Spinner size="large" color="$primary" />
              </YStack>
            ) : availableAddresses.length === 0 ? (
              <YStack flex={1} alignItems="center" justifyContent="center" px="$4">
                <Card
                  borderRadius="$4"
                  borderWidth={1}
                  borderStyle="dashed"
                  borderColor="$surfaceBorder"
                  backgroundColor="$surface"
                  padding="$4"
                  width="100%">
                  <YStack gap="$3" alignItems="center">
                    <MapPinIcon size={28} color="$primary" />
                    <Text color="$color" fontWeight="600" textAlign="center">
                      Belum ada alamat
                    </Text>
                  </YStack>
                </Card>
              </YStack>
            ) : (
              <Sheet.ScrollView showsVerticalScrollIndicator={false}>
                <YStack gap="$2" px="$4" pb="$4">
                  {availableAddresses.map(address => (
                    <AddressCardSheet
                      key={address.id}
                      address={address}
                      isSelected={address.id === selectedAddressId}
                      onSelect={handleSelectAddress}
                    />
                  ))}
                </YStack>
              </Sheet.ScrollView>
            )}
          </YStack>
        </Sheet.Frame>
      </Sheet>

      {!isLoading && items.length > 0 ? (
        <>
          {isOffline ? (
            <XStack
              position="absolute"
              left={16}
              right={16}
              bottom={BOTTOM_BAR_HEIGHT + insets.bottom + 8}
              justifyContent="center"
              pointerEvents="none">
              <Text fontSize="$2" color="$warning" fontWeight="600">
                Checkout tidak tersedia offline
              </Text>
            </XStack>
          ) : null}
          <StickyBottomBar
            grandTotal={snapshot.packageValue + (selectedShippingOption?.price || 0)}
            isLoading={startingCheckout}
            disabled={(!selectedShippingOption && !activeOrderId) || isNetworkUnavailable}
            onConfirm={handleWrappedStartCheckout}
            confirmText={activeOrderId ? 'Lanjutkan Pembayaran' : 'Konfirmasi'}
          />
        </>
      ) : null}
    </YStack>
  );
}
