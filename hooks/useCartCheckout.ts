import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { DataPersistKeys, useDataPersist } from '@/hooks/useDataPersist';
import { createCheckoutOrder, createSnapToken } from '@/services/checkout.service';
import {
  ErrorType,
  classifyError,
  isRetryableError,
  translateErrorMessage,
  type AppError,
} from '@/utils/error';
import { withRetry } from '@/utils/retry';
import type { Address } from '@/types/address';
import type { CartSnapshot } from '@/types/cart';
import type { ShippingOption } from '@/types/shipping';

interface PersistedCheckoutSession {
  fingerprint: string;
  idempotency_key: string;
  order_id: string | null;
  selected_address_id: string | null;
  selected_shipping_key: string | null;
  destination_area_id: string | null;
  destination_postal_code: number | null;
  selected_address_latitude: number | null;
  selected_address_longitude: number | null;
}

function createTypedError(type: ErrorType, message: string): AppError {
  const draft: AppError = {
    type,
    message,
    retryable: false,
  };

  return {
    ...draft,
    retryable: isRetryableError(draft),
  };
}

function withFallbackMessage(error: AppError, fallback: string): AppError {
  if (error.message?.trim()) {
    return error;
  }

  return {
    ...error,
    message: fallback,
  };
}

function stringifyCoordinate(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : 'null';
}

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
      [
        userId ?? '',
        selectedAddressId ?? '',
        stringifyCoordinate(selectedAddress?.latitude),
        stringifyCoordinate(selectedAddress?.longitude),
        selectedShippingKey ?? '',
        quoteDestination.areaId ?? '',
        quoteDestination.postalCode ?? '',
        snapshot.itemCount,
        snapshot.estimatedWeightGrams,
        snapshot.packageValue,
      ].join('|'),
    [
      selectedAddressId,
      selectedAddress?.latitude,
      selectedAddress?.longitude,
      selectedShippingKey,
      quoteDestination.areaId,
      quoteDestination.postalCode,
      snapshot.estimatedWeightGrams,
      snapshot.itemCount,
      snapshot.packageValue,
      userId,
    ],
  );

  const handleCheckoutError = useCallback(
    (error: unknown, fallbackMessage: string) => {
      const classifiedError = withFallbackMessage(classifyError(error), fallbackMessage);
      const translatedMessage = translateErrorMessage(classifiedError);

      onError?.({
        ...classifiedError,
        message: translatedMessage,
      });
    },
    [onError],
  );

  const clearCheckoutSession = useCallback(async () => {
    setCheckoutIdempotencyKey(null);
    setActiveOrderId(null);
    setPaymentError(null);
    await removePersistData(DataPersistKeys.CHECKOUT_SESSION);
  }, [removePersistData]);

  const requestSnapTokenWithRetry = useCallback(async (orderId: string) => {
    return withRetry(
      async () => {
        const { data, error } = await createSnapToken(orderId);

        if (error || !data) {
          throw error ?? new Error('Gagal membuat token pembayaran.');
        }

        return data;
      },
      {
        maxRetries: 2,
        baseDelay: 800,
        maxDelay: 4000,
        shouldRetry: error => {
          const classifiedError = classifyError(error);

          return (
            classifiedError.type === ErrorType.NETWORK ||
            classifiedError.type === ErrorType.TIMEOUT ||
            classifiedError.type === ErrorType.SERVER
          );
        },
      },
    );
  }, []);

  const syncCheckoutSession = useCallback(async () => {
    if (!userId) {
      setCheckoutIdempotencyKey(null);
      setActiveOrderId(null);
      await removePersistData(DataPersistKeys.CHECKOUT_SESSION);
      return;
    }

    const persisted = await getPersistData<PersistedCheckoutSession>(
      DataPersistKeys.CHECKOUT_SESSION,
    );

    if (!persisted) {
      setCheckoutIdempotencyKey(null);
      setActiveOrderId(null);
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
      (persisted.destination_area_id !== null || persisted.destination_postal_code !== null) &&
      quoteDestination.areaId === null &&
      quoteDestination.postalCode === null;
    const isHydrationPending =
      isWaitingAddressHydration || isWaitingShippingHydration || isWaitingQuoteHydration;

    if (hasKnownMismatch) {
      setCheckoutIdempotencyKey(null);
      setActiveOrderId(null);
      await removePersistData(DataPersistKeys.CHECKOUT_SESSION);
      return;
    }

    if (persisted.fingerprint === checkoutFingerprint || isHydrationPending) {
      setCheckoutIdempotencyKey(persisted.idempotency_key);
      setActiveOrderId(persisted.order_id);
      return;
    }

    setCheckoutIdempotencyKey(null);
    setActiveOrderId(null);
    await removePersistData(DataPersistKeys.CHECKOUT_SESSION);
  }, [
    checkoutFingerprint,
    getPersistData,
    loadingSelectedAddress,
    removePersistData,
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

      await setPersistData<PersistedCheckoutSession>(DataPersistKeys.CHECKOUT_SESSION, {
        fingerprint: checkoutFingerprint,
        idempotency_key: currentIdempotencyKey,
        order_id: orderIdForPayment,
        selected_address_id: selectedAddressId,
        selected_shipping_key: selectedShippingKey,
        destination_area_id: quoteDestination.areaId,
        destination_postal_code: quoteDestination.postalCode,
        selected_address_latitude: selectedAddress?.latitude ?? null,
        selected_address_longitude: selectedAddress?.longitude ?? null,
      });

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
        await setPersistData<PersistedCheckoutSession>(DataPersistKeys.CHECKOUT_SESSION, {
          fingerprint: checkoutFingerprint,
          idempotency_key: orderData.checkout_idempotency_key,
          order_id: orderData.order_id,
          selected_address_id: selectedAddressId,
          selected_shipping_key: selectedShippingKey,
          destination_area_id: quoteDestination.areaId,
          destination_postal_code: quoteDestination.postalCode,
          selected_address_latitude: selectedAddress?.latitude ?? null,
          selected_address_longitude: selectedAddress?.longitude ?? null,
        });
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
    checkoutFingerprint,
    checkoutIdempotencyKey,
    clearCheckoutSession,
    handleCheckoutError,
    isOffline,
    onError,
    onOfflineAction,
    quoteDestination.areaId,
    quoteDestination.postalCode,
    requestSnapTokenWithRetry,
    router,
    selectedAddress,
    selectedAddressId,
    selectedShippingOption,
    selectedShippingKey,
    setPersistData,
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
