import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { DataPersistKeys, useDataPersist } from '@/hooks/useDataPersist';
import { createCheckoutOrder } from '@/services/checkout.service';
import {
  buildCheckoutFingerprint,
  buildPersistedCheckoutSession,
  PersistedCheckoutSession,
  requestSnapTokenWithRetry,
  toTranslatedCheckoutError,
} from '@/hooks/useCartCheckout.helpers';
import {
  ErrorType,
  classifyError,
  createTypedError,
  translateErrorMessage,
  withFallbackMessage,
  type AppError,
} from '@/utils/error';
import type { Address } from '@/types/address';
import type { CartSnapshot } from '@/types/cart';
import type { ShippingOption } from '@/types/shipping';

export interface UseCartCheckoutParams {
  userId?: string;
  selectedAddress: Address | null;
  selectedAddressId: string | null;
  loadingSelectedAddress?: boolean;
  selectedShippingOption: ShippingOption | null;
  selectedShippingKey: string | null;
  quoteDestination: {
    areaId: string | null;
    postalCode: number | null;
  };
  snapshot: CartSnapshot;
  isOffline: boolean;
  onOfflineAction?: (message: string) => void;
  onError?: (error: AppError) => void;
}

export interface UseCartCheckoutReturn {
  startingCheckout: boolean;
  activeOrderId: string | null;
  paymentError: string | null;
  handleStartCheckout: () => Promise<void>;
  checkoutFingerprint: string;
  isCheckoutResumable: boolean;
  clearCheckoutSession: () => Promise<void>;
  resetPaymentError: () => void;
}

export function useCartCheckout({
  userId,
  selectedAddress,
  selectedAddressId,
  loadingSelectedAddress = false,
  selectedShippingOption,
  selectedShippingKey,
  quoteDestination,
  snapshot,
  isOffline,
  onOfflineAction,
  onError,
}: UseCartCheckoutParams): UseCartCheckoutReturn {
  const router = useRouter();
  const { getPersistData, setPersistData, removePersistData } = useDataPersist();

  const [startingCheckout, setStartingCheckout] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [checkoutIdempotencyKey, setCheckoutIdempotencyKey] = useState<string | null>(null);

  const checkoutInProgressRef = useRef(false);

  const checkoutFingerprint = useMemo(
    () =>
      buildCheckoutFingerprint({
        userId,
        selectedAddress,
        selectedAddressId,
        selectedShippingKey,
        quoteDestination,
        snapshot,
      }),
    [quoteDestination, selectedAddress, selectedAddressId, selectedShippingKey, snapshot, userId],
  );

  const resetCheckoutState = useCallback(() => {
    setCheckoutIdempotencyKey(null);
    setActiveOrderId(null);
  }, []);

  const handleCheckoutError = useCallback(
    (error: unknown, fallbackMessage: string) => {
      onError?.(toTranslatedCheckoutError(error, fallbackMessage));
    },
    [onError],
  );

  const clearCheckoutSession = useCallback(async () => {
    resetCheckoutState();
    setPaymentError(null);
    await removePersistData(DataPersistKeys.CHECKOUT_SESSION);
  }, [removePersistData, resetCheckoutState]);

  const persistCheckoutSession = useCallback(
    async (idempotencyKey: string, orderId: string | null) => {
      await setPersistData<PersistedCheckoutSession>(
        DataPersistKeys.CHECKOUT_SESSION,
        buildPersistedCheckoutSession({
          fingerprint: checkoutFingerprint,
          idempotencyKey,
          orderId,
          selectedAddress,
          selectedAddressId,
          selectedShippingKey,
          quoteDestination,
        }),
      );
    },
    [
      checkoutFingerprint,
      quoteDestination,
      selectedAddress,
      selectedAddressId,
      selectedShippingKey,
      setPersistData,
    ],
  );

  const syncCheckoutSession = useCallback(async () => {
    if (!userId) {
      resetCheckoutState();
      await removePersistData(DataPersistKeys.CHECKOUT_SESSION);
      return;
    }

    const persisted = await getPersistData<PersistedCheckoutSession>(
      DataPersistKeys.CHECKOUT_SESSION,
    );

    if (!persisted) {
      resetCheckoutState();
      return;
    }

    const persistedAddressId = persisted.selected_address_id ?? null;
    const persistedShippingKey = persisted.selected_shipping_key ?? null;
    const persistedLatitude = persisted.selected_address_latitude ?? null;
    const persistedLongitude = persisted.selected_address_longitude ?? null;
    const currentLatitude = selectedAddress?.latitude ?? null;
    const currentLongitude = selectedAddress?.longitude ?? null;
    const isSamePersistedAddress =
      Boolean(persistedAddressId) && persistedAddressId === selectedAddressId;
    const isSameAddressCoordinateHydrating =
      isSamePersistedAddress && loadingSelectedAddress && Boolean(selectedAddress);
    const canCompareLatitude =
      Boolean(selectedAddress) &&
      (!isSameAddressCoordinateHydrating || currentLatitude !== null || persistedLatitude === null);
    const canCompareLongitude =
      Boolean(selectedAddress) &&
      (!isSameAddressCoordinateHydrating ||
        currentLongitude !== null ||
        persistedLongitude === null);
    const hasKnownAddressIdMismatch =
      Boolean(persistedAddressId) &&
      Boolean(selectedAddressId) &&
      persistedAddressId !== selectedAddressId;
    const hasKnownAddressCoordinateMismatch =
      canCompareLatitude && currentLatitude !== persistedLatitude;
    const hasKnownAddressLongitudeMismatch =
      canCompareLongitude && currentLongitude !== persistedLongitude;
    const hasKnownShippingMismatch =
      Boolean(persistedShippingKey) &&
      Boolean(selectedShippingKey) &&
      persistedShippingKey !== selectedShippingKey;
    const hasKnownQuoteAreaMismatch =
      persisted.destination_area_id !== null &&
      quoteDestination.areaId !== null &&
      persisted.destination_area_id !== quoteDestination.areaId;
    const hasKnownQuotePostalCodeMismatch =
      persisted.destination_postal_code !== null &&
      quoteDestination.postalCode !== null &&
      persisted.destination_postal_code !== quoteDestination.postalCode;
    const hasKnownMismatch =
      hasKnownAddressIdMismatch ||
      hasKnownAddressCoordinateMismatch ||
      hasKnownAddressLongitudeMismatch ||
      hasKnownShippingMismatch ||
      hasKnownQuoteAreaMismatch ||
      hasKnownQuotePostalCodeMismatch;
    const isWaitingAddressHydration =
      Boolean(persistedAddressId) &&
      (!selectedAddressId || (persistedAddressId === selectedAddressId && !selectedAddress));
    const isWaitingShippingHydration = Boolean(persistedShippingKey) && !selectedShippingKey;
    const isWaitingQuoteHydration =
      Boolean(persistedShippingKey) &&
      persistedShippingKey === selectedShippingKey &&
      ((persisted.destination_area_id !== null && quoteDestination.areaId === null) ||
        (persisted.destination_postal_code !== null && quoteDestination.postalCode === null));
    const isHydrationPending =
      isWaitingAddressHydration || isWaitingShippingHydration || isWaitingQuoteHydration;

    if (hasKnownMismatch) {
      resetCheckoutState();
      await removePersistData(DataPersistKeys.CHECKOUT_SESSION);
      return;
    }

    if (persisted.fingerprint === checkoutFingerprint || isHydrationPending) {
      setCheckoutIdempotencyKey(persisted.idempotency_key);
      setActiveOrderId(persisted.order_id);
      return;
    }

    resetCheckoutState();
    await removePersistData(DataPersistKeys.CHECKOUT_SESSION);
  }, [
    checkoutFingerprint,
    getPersistData,
    loadingSelectedAddress,
    removePersistData,
    resetCheckoutState,
    selectedAddress,
    selectedAddressId,
    selectedShippingKey,
    quoteDestination.areaId,
    quoteDestination.postalCode,
    userId,
  ]);

  useEffect(() => {
    void syncCheckoutSession();
  }, [syncCheckoutSession]);

  useFocusEffect(
    useCallback(() => {
      void syncCheckoutSession();
    }, [syncCheckoutSession]),
  );

  useEffect(() => {
    if (activeOrderId) {
      return;
    }

    setPaymentError(null);
  }, [activeOrderId]);

  const handleStartCheckout = useCallback(async () => {
    if (isOffline) {
      onOfflineAction?.('Checkout tidak tersedia offline.');
      return;
    }

    if (checkoutInProgressRef.current) {
      return;
    }

    checkoutInProgressRef.current = true;

    if (!userId) {
      onError?.(createTypedError(ErrorType.AUTH, 'Silakan login terlebih dahulu.'));
      checkoutInProgressRef.current = false;
      return;
    }

    if (!selectedAddress) {
      onError?.(createTypedError(ErrorType.VALIDATION, 'Pilih alamat pengiriman terlebih dahulu.'));
      checkoutInProgressRef.current = false;
      return;
    }

    try {
      const currentIdempotencyKey = checkoutIdempotencyKey ?? Crypto.randomUUID();
      if (!checkoutIdempotencyKey) {
        setCheckoutIdempotencyKey(currentIdempotencyKey);
      }

      let orderIdForPayment = activeOrderId;

      await persistCheckoutSession(currentIdempotencyKey, orderIdForPayment);

      setStartingCheckout(true);

      if (!orderIdForPayment) {
        if (!selectedShippingOption) {
          onError?.(
            createTypedError(ErrorType.VALIDATION, 'Pilih kurir sebelum melanjutkan pembayaran.'),
          );
          return;
        }

        const { data: orderData, error: orderError } = await createCheckoutOrder({
          user_id: userId,
          shipping_address_id: selectedAddress.id,
          destination_area_id: quoteDestination.areaId ?? undefined,
          destination_postal_code: quoteDestination.postalCode ?? undefined,
          shipping_option: selectedShippingOption,
          checkout_idempotency_key: currentIdempotencyKey,
        });

        if (orderError || !orderData) {
          handleCheckoutError(
            orderError ?? new Error('Gagal membuat order checkout.'),
            'Gagal membuat order checkout. Silakan coba lagi.',
          );
          return;
        }

        orderIdForPayment = orderData.order_id;
        setCheckoutIdempotencyKey(orderData.checkout_idempotency_key);
        setActiveOrderId(orderData.order_id);
        await persistCheckoutSession(orderData.checkout_idempotency_key, orderData.order_id);
      }

      const snapData = await requestSnapTokenWithRetry(orderIdForPayment);

      await clearCheckoutSession();

      router.push({
        pathname: '/cart/payment',
        params: {
          paymentUrl: snapData.redirectUrl,
          orderId: orderIdForPayment,
        },
      });
    } catch (error) {
      const paymentProcessingError = withFallbackMessage(
        classifyError(error),
        'Gagal memproses pembayaran. Silakan lanjutkan pembayaran kembali.',
      );
      setPaymentError(translateErrorMessage(paymentProcessingError));
    } finally {
      setStartingCheckout(false);
      checkoutInProgressRef.current = false;
    }
  }, [
    activeOrderId,
    checkoutIdempotencyKey,
    clearCheckoutSession,
    handleCheckoutError,
    isOffline,
    onError,
    onOfflineAction,
    quoteDestination.areaId,
    quoteDestination.postalCode,
    router,
    persistCheckoutSession,
    selectedAddress,
    selectedShippingOption,
    userId,
  ]);

  const resetPaymentError = useCallback(() => {
    setPaymentError(null);
  }, []);

  return {
    startingCheckout,
    activeOrderId,
    paymentError,
    handleStartCheckout,
    checkoutFingerprint,
    isCheckoutResumable: Boolean(activeOrderId),
    clearCheckoutSession,
    resetPaymentError,
  };
}
