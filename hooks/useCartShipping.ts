import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getShippingRatesForAddress } from '@/services/shipping.service';
import { ErrorType, classifyError, isRetryableError, type AppError } from '@/utils/error';
import type { Address } from '@/types/address';
import type { CartSnapshot } from '@/types/cart';
import type { ShippingOption } from '@/types/shipping';

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

export interface UseCartShippingParams {
  selectedAddress: Address | null;
  selectedAddressId: string | null;
  snapshot: CartSnapshot;
  isOffline: boolean;
  onOfflineAction?: (message: string) => void;
}

export interface UseCartShippingReturn {
  shippingOptions: ShippingOption[];
  selectedShippingOption: ShippingOption | null;
  loadingRates: boolean;
  shippingError: AppError | null;
  setShippingError: React.Dispatch<React.SetStateAction<AppError | null>>;
  selectedShippingKey: string | null;
  shippingSheetOpen: boolean;
  setShippingSheetOpen: (value: boolean) => void;
  handleCalculateShipping: () => Promise<void>;
  handleSelectShippingKey: (shippingKey: string) => void;
  handleOpenShippingSheet: () => void;
  resetShippingSelection: () => void;
  quoteDestination: {
    areaId: string | null;
    postalCode: number | null;
  };
}

export function useCartShipping({
  selectedAddress,
  selectedAddressId,
  snapshot,
  isOffline,
  onOfflineAction,
}: UseCartShippingParams): UseCartShippingReturn {
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShippingKey, setSelectedShippingKey] = useState<string | null>(null);
  const [loadingRates, setLoadingRates] = useState(false);
  const [shippingError, setShippingError] = useState<AppError | null>(null);
  const [shippingSheetOpen, setShippingSheetOpen] = useState(false);
  const [quoteDestinationAreaId, setQuoteDestinationAreaId] = useState<string | null>(null);
  const [quoteDestinationPostalCode, setQuoteDestinationPostalCode] = useState<number | null>(null);

  const expectedQuoteSignatureRef = useRef<string | null>(null);
  const shippingQuoteRequestIdRef = useRef(0);
  const previousShippingInputSignatureRef = useRef<string | null>(null);
  const shouldOpenShippingSheetRef = useRef(false);

  const selectedShippingOption = useMemo(
    () =>
      shippingOptions.find(
        option => `${option.courier_code}-${option.service_code}` === selectedShippingKey,
      ) ?? null,
    [shippingOptions, selectedShippingKey],
  );

  const resetShippingSelection = useCallback(() => {
    shouldOpenShippingSheetRef.current = false;
    expectedQuoteSignatureRef.current = null;
    setSelectedShippingKey(null);
    setShippingOptions([]);
    setQuoteDestinationAreaId(null);
    setQuoteDestinationPostalCode(null);
  }, []);

  const handleCalculateShipping = useCallback(async () => {
    if (isOffline) {
      onOfflineAction?.('Perhitungan ongkir tidak tersedia offline.');
      return;
    }

    setShippingError(null);
    setShippingOptions([]);
    expectedQuoteSignatureRef.current = null;

    if (!selectedAddress) {
      setShippingError(
        createTypedError(ErrorType.VALIDATION, 'Pilih alamat pengiriman terlebih dahulu.'),
      );
      return;
    }

    if (snapshot.estimatedWeightGrams <= 0 || snapshot.itemCount <= 0) {
      setShippingError(
        createTypedError(
          ErrorType.VALIDATION,
          'Keranjang kosong. Tambahkan produk sebelum menghitung ongkir.',
        ),
      );
      return;
    }

    const requestId = ++shippingQuoteRequestIdRef.current;
    const signature = `${selectedAddress.id}-${snapshot.itemCount}-${snapshot.estimatedWeightGrams}-${snapshot.packageValue}`;
    expectedQuoteSignatureRef.current = signature;

    const isStaleQuoteResponse = () =>
      shippingQuoteRequestIdRef.current !== requestId ||
      expectedQuoteSignatureRef.current !== signature;

    setLoadingRates(true);
    try {
      const maxRetries = 2;
      let lastError: AppError | null = null;

      for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
        const { data, error } = await getShippingRatesForAddress({
          address: selectedAddress,
          package_weight_grams: snapshot.estimatedWeightGrams,
          package_value: snapshot.packageValue,
          package_name: `Checkout package (${snapshot.itemCount} item)`,
        });

        if (isStaleQuoteResponse()) {
          return;
        }

        if (!error) {
          const options = data?.options ?? [];
          setShippingOptions(options);
          setQuoteDestinationAreaId(data?.destination_area_id ?? null);
          setQuoteDestinationPostalCode(data?.destination_postal_code ?? null);

          if (options.length === 0) {
            setShippingError(
              createTypedError(
                ErrorType.VALIDATION,
                'Tidak ada layanan kurir yang tersedia untuk alamat ini.',
              ),
            );
          }

          return;
        }

        lastError = withFallbackMessage(
          classifyError(error),
          'Gagal menghitung ongkir. Silakan coba lagi.',
        );

        if (!lastError.retryable || attempt === maxRetries) {
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 400 * (attempt + 1)));
      }

      if (lastError && !isStaleQuoteResponse()) {
        setShippingError(lastError);
      }
    } catch (error) {
      if (isStaleQuoteResponse()) {
        return;
      }

      setShippingError(
        withFallbackMessage(classifyError(error), 'Gagal menghitung ongkir. Silakan coba lagi.'),
      );
    } finally {
      if (shippingQuoteRequestIdRef.current === requestId) {
        setLoadingRates(false);
      }
    }
  }, [
    isOffline,
    onOfflineAction,
    selectedAddress,
    snapshot.estimatedWeightGrams,
    snapshot.itemCount,
    snapshot.packageValue,
  ]);

  const handleSelectShippingKey = useCallback((shippingKey: string) => {
    setSelectedShippingKey(currentKey => (currentKey === shippingKey ? currentKey : shippingKey));
  }, []);

  const handleOpenShippingSheet = useCallback(() => {
    if (isOffline) {
      onOfflineAction?.('Perhitungan ongkir tidak tersedia offline.');
      return;
    }

    if (loadingRates || !selectedAddressId) {
      return;
    }

    if (shippingOptions.length === 0) {
      shouldOpenShippingSheetRef.current = true;
      void handleCalculateShipping();
      return;
    }

    setShippingSheetOpen(true);
  }, [
    handleCalculateShipping,
    isOffline,
    loadingRates,
    onOfflineAction,
    selectedAddressId,
    shippingOptions.length,
  ]);

  useEffect(() => {
    if (!selectedAddress?.id) {
      previousShippingInputSignatureRef.current = null;
      resetShippingSelection();
      return;
    }

    const shippingInputSignature = [
      selectedAddress.id,
      snapshot.itemCount,
      snapshot.estimatedWeightGrams,
      snapshot.packageValue,
    ].join('-');

    if (previousShippingInputSignatureRef.current === shippingInputSignature) {
      return;
    }

    previousShippingInputSignatureRef.current = shippingInputSignature;
    resetShippingSelection();

    if (snapshot.itemCount > 0 && snapshot.estimatedWeightGrams > 0) {
      void handleCalculateShipping();
    }
  }, [
    handleCalculateShipping,
    resetShippingSelection,
    selectedAddress?.id,
    snapshot.estimatedWeightGrams,
    snapshot.itemCount,
    snapshot.packageValue,
  ]);

  useEffect(() => {
    if (loadingRates || !shouldOpenShippingSheetRef.current) {
      return;
    }

    if (shippingOptions.length === 0) {
      if (shippingError) {
        shouldOpenShippingSheetRef.current = false;
      }

      return;
    }

    shouldOpenShippingSheetRef.current = false;
    setShippingSheetOpen(true);
  }, [loadingRates, shippingError, shippingOptions.length]);

  useEffect(() => {
    if (shippingOptions.length === 0 || selectedShippingKey !== null) {
      return;
    }

    const jne = shippingOptions.find(
      option =>
        option.courier_code.toLowerCase() === 'jne' && option.service_code.toLowerCase() === 'reg',
    );

    if (jne) {
      setSelectedShippingKey(jne.courier_code + '-' + jne.service_code);
    }
  }, [shippingOptions, selectedShippingKey]);

  return {
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
    resetShippingSelection,
    quoteDestination: {
      areaId: quoteDestinationAreaId,
      postalCode: quoteDestinationPostalCode,
    },
  };
}
