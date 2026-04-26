'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { FlatList, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, XStack, YStack, useTheme } from 'tamagui';
import { getThemeColor } from '@/utils/theme';
import { CartIcon } from '@/components/icons';
import { CartItemRow } from '@/components/elements/CartItemRow/CartItemRow';
import { StickyBottomBar } from '@/components/elements/StickyBottomBar/StickyBottomBar';
import { EmptyCartState } from '@/components/elements/EmptyCartState/EmptyCartState';
import { useAppSlice } from '@/slices';
import { useOfflineActionMessage } from '@/scenes/cart/useOfflineActionMessage';
import { useCartAddress } from '@/hooks/useCartAddress';
import { useCartCheckout } from '@/hooks/useCartCheckout';
import { useCartPaginated } from '@/hooks/useCartPaginated';
import { useCartShipping } from '@/hooks/useCartShipping';
import { removeCartItem } from '@/services/cart.service';
import { useCartQuantity } from '@/hooks/useCartQuantity';
import { formatAddress } from '@/utils/address';
import { translateErrorMessage, type AppError } from '@/utils/error';
import type { CartItemWithProduct, ItemSummary } from '@/types/cart';
import type { TypedHref } from '@/types/routes.types';
import { BOTTOM_BAR_HEIGHT } from '@/constants/ui';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { getRecoverySuggestion } from '@/scenes/cart/cart.errors';
import { CartCheckoutDetails } from '@/scenes/cart/CartCheckoutDetails';
import { CartStatusBanners } from '@/scenes/cart/CartFeedback';
import { AddressSelectionSheet, ShippingOptionsSheet } from '@/scenes/cart/CartSheets';
import { CartLoadingSkeleton } from '@/components/elements/CartLoadingSkeleton/CartLoadingSkeleton';

function getCartFeedbackMessages({
  shippingError,
  addressError,
}: {
  shippingError: AppError | null;
  addressError: AppError | null;
}) {
  return {
    shippingErrorMessage: shippingError ? translateErrorMessage(shippingError) : null,
    addressErrorMessage: addressError ? translateErrorMessage(addressError) : null,
    shippingRecoverySuggestion: shippingError ? getRecoverySuggestion(shippingError) : null,
  };
}

export default function Cart() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { user } = useAppSlice();
  const { isOffline } = useNetworkStatus();
  const subtleColor = getThemeColor(theme, 'colorPress');
  const { offlineActionMessage, showOfflineActionMessage } = useOfflineActionMessage();
  const [cartActionError, setCartActionError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<AppError | null>(null);
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
      flexGrow: items.length === 0 ? 1 : 0,
    }),
    [insets.bottom, items.length],
  );

  const onOfflineAction = useCallback(
    (message: string) => {
      showOfflineActionMessage(message);
    },
    [showOfflineActionMessage],
  );

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
        showOfflineActionMessage('Perubahan jumlah produk tidak tersedia offline.');
        return;
      }

      setCartActionError(null);

      updateQuantity(cartItemId, newQuantity);
    },
    [isOffline, showOfflineActionMessage, updateQuantity],
  );

  const handleRemoveItem = useCallback(
    async (cartItemId: string) => {
      if (isOffline) {
        showOfflineActionMessage('Hapus produk tidak tersedia offline.');
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
    [isOffline, refresh, showOfflineActionMessage],
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
    loadingSelectedAddress,
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

  const quoteAreaId = quoteDestination?.areaId ?? null;
  const quotePostalCode = quoteDestination?.postalCode ?? null;

  const { shippingErrorMessage, addressErrorMessage, shippingRecoverySuggestion } = useMemo(
    () => getCartFeedbackMessages({ shippingError, addressError }),
    [addressError, shippingError],
  );

  const handleReviewCheckout = useCallback(() => {
    if (!selectedAddress || !selectedShippingOption) {
      return;
    }

    setShippingError(null);

    const itemSummaries: ItemSummary[] = items.map(item => ({
      name: item.product.name,
      quantity: item.quantity,
    }));

    const reviewHref: TypedHref = {
      pathname: '/cart/review',
      params: {
        addressPayload: JSON.stringify(selectedAddress),
        addressText: selectedAddressFullText,
        shippingOptionPayload: JSON.stringify(selectedShippingOption),
        selectedShippingKey: selectedShippingKey ?? undefined,
        snapshotPayload: JSON.stringify(snapshot),
        itemSummariesPayload: JSON.stringify(itemSummaries),
        quoteAreaId: quoteAreaId ?? undefined,
        quotePostalCode: typeof quotePostalCode === 'number' ? String(quotePostalCode) : undefined,
      },
    };

    router.push(reviewHref);
  }, [
    items,
    quoteAreaId,
    quotePostalCode,
    router,
    selectedAddress,
    selectedAddressFullText,
    selectedShippingKey,
    selectedShippingOption,
    setShippingError,
    snapshot,
  ]);

  const handleWrappedStartCheckout = useCallback(async () => {
    setShippingError(null);
    await handleStartCheckout();
  }, [handleStartCheckout, setShippingError]);

  const handleCartRefresh = useCallback(() => {
    if (isOffline) {
      showOfflineActionMessage('Muat ulang keranjang tidak tersedia offline.');
      return;
    }

    void refresh();
  }, [isOffline, refresh, showOfflineActionMessage]);

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
  const shouldShowEmptyCartState = items.length === 0 && !error && !isOffline;
  const hasCartItems = items.length > 0;
  const shouldShowCheckoutBar = !isLoading && hasCartItems;
  const checkoutDisabled = (!selectedShippingOption && !activeOrderId) || isOffline;

  const handleDismissCartActionError = useCallback(() => {
    setCartActionError(null);
  }, []);

  const handleBrowseProducts = useCallback(() => {
    router.push('/home');
  }, [router]);

  const handleCancelPendingCheckout = useCallback(() => {
    void clearCheckoutSession();
  }, [clearCheckoutSession]);

  const handleContinuePendingCheckout = useCallback(() => {
    resetPaymentError();
    void handleWrappedStartCheckout();
  }, [handleWrappedStartCheckout, resetPaymentError]);

  const handleRetryShipping = useCallback(() => {
    void handleCalculateShipping();
  }, [handleCalculateShipping]);

  const listHeaderComponent = useMemo(
    () => (
      <CartStatusBanners
        isOffline={isOffline}
        hasCachedData={items.length > 0}
        offlineActionMessage={offlineActionMessage}
        fetchError={error}
        onRetryFetch={handleCartRefresh}
        cartActionError={cartActionError}
        onDismissCartActionError={handleDismissCartActionError}
      />
    ),
    [
      cartActionError,
      error,
      handleCartRefresh,
      handleDismissCartActionError,
      isOffline,
      items.length,
      offlineActionMessage,
    ],
  );

  const listEmptyComponent = useMemo(() => {
    if (!shouldShowEmptyCartState) {
      return null;
    }

    return (
      <YStack marginTop="$1">
        <EmptyCartState onBrowse={handleBrowseProducts} />
      </YStack>
    );
  }, [handleBrowseProducts, shouldShowEmptyCartState]);

  const listFooterComponent = useMemo(() => {
    if (items.length === 0 || isLoading) {
      return null;
    }

    return (
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
        activeOrderId={activeOrderId}
        paymentError={paymentError}
        startingCheckout={startingCheckout}
        onCancelPendingCheckout={handleCancelPendingCheckout}
        onContinuePendingCheckout={handleContinuePendingCheckout}
        shippingOptionsCount={shippingOptions.length}
        shippingErrorMessage={shippingErrorMessage}
        shippingRecoverySuggestion={shippingRecoverySuggestion}
        onRetryShipping={handleRetryShipping}
      />
    );
  }, [
    activeOrderId,
    addressErrorMessage,
    handleCancelPendingCheckout,
    handleContinuePendingCheckout,
    handleOpenAddressSheet,
    handleOpenShippingSheet,
    handleRetryShipping,
    isLoading,
    isOffline,
    items.length,
    loadingRates,
    loadingSelectedAddress,
    paymentError,
    selectedAddress,
    selectedAddressFullText,
    selectedShippingOption,
    shippingErrorMessage,
    shippingOptions.length,
    shippingRecoverySuggestion,
    startingCheckout,
  ]);

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
    <YStack flex={1} backgroundColor="$background">
      {showInitialLoadingOverlay ? (
        <CartLoadingSkeleton />
      ) : (
        <YStack flex={1}>
          <FlatList
            data={items}
            renderItem={renderCartItem}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            bounces={false}
            initialNumToRender={6}
            maxToRenderPerBatch={6}
            updateCellsBatchingPeriod={50}
            windowSize={5}
            removeClippedSubviews={Platform.OS === 'android'}
            contentContainerStyle={listContentContainerStyle}
            ListHeaderComponent={listHeaderComponent}
            ListEmptyComponent={listEmptyComponent}
            ListFooterComponent={listFooterComponent}
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

          {shouldShowCheckoutBar ? (
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
                disabled={checkoutDisabled}
                onConfirm={activeOrderId ? handleWrappedStartCheckout : handleReviewCheckout}
                confirmText={activeOrderId ? 'Lanjutkan Pembayaran' : 'Konfirmasi'}
              />
            </>
          ) : null}
        </YStack>
      )}
    </YStack>
  );
}
