'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigation, useRouter } from 'expo-router';
import { FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatePresence, Text, XStack, YStack, useTheme } from 'tamagui';
import { getThemeColor } from '@/utils/theme';
import { CartIcon } from '@/components/icons';
import { CartItemRow } from '@/components/elements/CartItemRow/CartItemRow';
import { StickyBottomBar } from '@/components/elements/StickyBottomBar/StickyBottomBar';
import { EmptyCartState } from '@/components/elements/EmptyCartState/EmptyCartState';
import { useAppSlice } from '@/slices';
import { useCartAddress } from '@/hooks/useCartAddress';
import { useCartCheckout } from '@/hooks/useCartCheckout';
import { useCartPaginated } from '@/hooks/useCartPaginated';
import { useCartShipping } from '@/hooks/useCartShipping';
import { removeCartItem } from '@/services/cart.service';
import { useCartQuantity } from '@/hooks/useCartQuantity';
import { formatAddress } from '@/utils/address';
import { ErrorType, translateErrorMessage, type AppError } from '@/utils/error';
import type { CartItemWithProduct } from '@/types/cart';
import type { TypedHref } from '@/types/routes.types';
import { BOTTOM_BAR_HEIGHT } from '@/constants/ui';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { CartCheckoutDetails } from '@/scenes/cart/CartCheckoutDetails';
import { CartInitialLoadingOverlay, CartStatusBanners } from '@/scenes/cart/CartFeedback';
import { AddressSelectionSheet, ShippingOptionsSheet } from '@/scenes/cart/CartSheets';

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

export default function Cart() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { user } = useAppSlice();
  const { isOffline } = useNetworkStatus();
  const subtleColor = getThemeColor(theme, 'colorPress');
  const [offlineActionMessage, setOfflineActionMessage] = useState<string | null>(null);
  const [cartActionError, setCartActionError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<AppError | null>(null);
  const offlineMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {
    items: serverItems,
    snapshot: serverSnapshot,
    error,
    isLoading,
    isRefreshing,
    refresh,
  } = useCartPaginated({
    userId: user?.id,
  });
  const { items, snapshot, updateQuantity } = useCartQuantity({
    items: serverItems,
    snapshot: serverSnapshot,
    onError: setCartActionError,
  });

  const listContentContainerStyle = useMemo(
    () => ({
      padding: 16,
      gap: 12,
      paddingBottom: BOTTOM_BAR_HEIGHT + insets.bottom + 16,
    }),
    [insets.bottom],
  );

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
    isOffline,
    onOfflineAction,
    onError: setAddressError,
  });

  const handleEditAddress = useCallback(
    (addressId: string) => {
      setAddressSheetOpen(false);

      const addressFormHref: TypedHref = {
        pathname: '/profile/address-form',
        params: { id: addressId },
      };

      router.push(addressFormHref);
    },
    [router, setAddressSheetOpen],
  );

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
    isOffline,
    onOfflineAction,
  });

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
    isOffline,
    onOfflineAction,
    onError: setShippingError,
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

    return () => {
      if (offlineMessageTimerRef.current) {
        clearTimeout(offlineMessageTimerRef.current);
        offlineMessageTimerRef.current = null;
      }
    };
  }, [offlineActionMessage]);

  const handleWrappedStartCheckout = useCallback(async () => {
    setShippingError(null);
    await handleStartCheckout();
  }, [handleStartCheckout, setShippingError]);

  const handleCartRefresh = useCallback(() => {
    if (isOffline) {
      setOfflineActionMessage('Muat ulang keranjang tidak tersedia offline.');
      return;
    }

    void refresh();
  }, [isOffline, refresh]);

  const renderCartItem = useCallback(
    ({ item }: { item: CartItemWithProduct }) => (
      <CartItemRow
        item={item}
        onQuantityChange={handleQuantityChange}
        onRemove={handleRemoveItem}
      />
    ),
    [handleQuantityChange, handleRemoveItem],
  );

  const showInitialLoadingOverlay = isLoading && items.length === 0;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: !showInitialLoadingOverlay,
    });

    return () => {
      navigation.setOptions({
        headerShown: true,
      });
    };
  }, [navigation, showInitialLoadingOverlay]);

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

  return (
    <YStack flex={1} backgroundColor="$background" position="relative">
      <AnimatePresence initial={false}>
        {showInitialLoadingOverlay ? (
          <CartInitialLoadingOverlay />
        ) : (
          <YStack
            key="cart-content"
            flex={1}
            animation="quick"
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
            opacity={1}>
            <FlatList
              data={items}
              renderItem={renderCartItem}
              keyExtractor={item => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={listContentContainerStyle}
              ListHeaderComponent={
                <CartStatusBanners
                  isOffline={isOffline}
                  hasCachedData={items.length > 0}
                  offlineActionMessage={offlineActionMessage}
                  fetchError={error}
                  onRetryFetch={handleCartRefresh}
                  cartActionError={cartActionError}
                  onDismissCartActionError={() => setCartActionError(null)}
                />
              }
              ListEmptyComponent={
                <YStack marginTop="$1">
                  <EmptyCartState onBrowse={() => router.push('/home')} />
                </YStack>
              }
              ListFooterComponent={
                items.length > 0 && !isLoading ? (
                  <CartCheckoutDetails
                    loadingSelectedAddress={loadingSelectedAddress}
                    selectedAddress={selectedAddress}
                    selectedAddressFullText={selectedAddressFullText}
                    onOpenAddressSheet={handleOpenAddressSheet}
                    addressErrorMessage={addressErrorMessage}
                    loadingRates={loadingRates}
                    selectedShippingOption={selectedShippingOption}
                    isOffline={isOffline}
                    onOpenShippingSheet={handleOpenShippingSheet}
                    snapshot={snapshot}
                    activeOrderId={activeOrderId}
                    paymentError={paymentError}
                    startingCheckout={startingCheckout}
                    onCancelPendingCheckout={() => {
                      void clearCheckoutSession();
                    }}
                    onContinuePendingCheckout={() => {
                      resetPaymentError();
                      void handleWrappedStartCheckout();
                    }}
                    shippingOptionsCount={shippingOptions.length}
                    shippingErrorMessage={shippingErrorMessage}
                    shippingRecoverySuggestion={shippingRecoverySuggestion}
                    onRetryShipping={() => {
                      void handleCalculateShipping();
                    }}
                  />
                ) : null
              }
              refreshing={isOffline ? false : isRefreshing}
              onRefresh={isOffline ? undefined : handleCartRefresh}
            />

            <ShippingOptionsSheet
              open={shippingSheetOpen}
              onOpenChange={setShippingSheetOpen}
              shippingOptions={shippingOptions}
              selectedShippingKey={selectedShippingKey}
              onSelectShippingKey={handleSelectShippingKey}
              onConfirm={() => setShippingSheetOpen(false)}
              isOffline={isOffline}
            />

            <AddressSelectionSheet
              open={addressSheetOpen}
              onOpenChange={setAddressSheetOpen}
              loadingAddresses={loadingAddresses}
              availableAddresses={availableAddresses}
              selectedAddressId={selectedAddressId}
              onSelectAddress={handleSelectAddress}
              onEditAddress={handleEditAddress}
            />

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
                  grandTotal={snapshot.packageValue + (selectedShippingOption?.price ?? 0)}
                  isLoading={startingCheckout}
                  disabled={(!selectedShippingOption && !activeOrderId) || isOffline}
                  onConfirm={handleWrappedStartCheckout}
                  confirmText={activeOrderId ? 'Lanjutkan Pembayaran' : 'Konfirmasi'}
                />
              </>
            ) : null}
          </YStack>
        )}
      </AnimatePresence>
    </YStack>
  );
}
