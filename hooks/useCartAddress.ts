import { useCallback, useEffect, useRef, useState } from 'react';
import { getAddress, getAddresses, getPreferredAddress } from '@/services/address.service';
import {
  ErrorType,
  classifyError,
  createTypedError,
  withFallbackMessage,
  type AppError,
} from '@/utils/error';
import type { Address } from '@/types/address';

type AddressAbortableService<T extends (...args: any[]) => Promise<any>> = (
  ...args: [...Parameters<T>, AbortSignal?]
) => ReturnType<T>;

const getAddressesAbortable = getAddresses as AddressAbortableService<typeof getAddresses>;
const getAddressAbortable = getAddress as AddressAbortableService<typeof getAddress>;
const getPreferredAddressAbortable = getPreferredAddress as AddressAbortableService<
  typeof getPreferredAddress
>;

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export interface UseCartAddressParams {
  userId?: string;
  isOffline: boolean;
  onOfflineAction?: (message: string) => void;
  onError?: (error: AppError) => void;
}

export interface UseCartAddressReturn {
  selectedAddress: Address | null;
  selectedAddressId: string | null;
  loadingSelectedAddress: boolean;
  availableAddresses: Address[];
  loadingAddresses: boolean;
  addressSheetOpen: boolean;
  setAddressSheetOpen: (value: boolean) => void;
  handleOpenAddressSheet: () => void;
  handleSelectAddress: (addressId: string) => void;
  resetAddressSelection: () => void;
}

export function useCartAddress({
  userId,
  isOffline,
  onOfflineAction,
  onError,
}: UseCartAddressParams): UseCartAddressReturn {
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [loadingSelectedAddress, setLoadingSelectedAddress] = useState(false);
  const [availableAddresses, setAvailableAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [addressSheetOpen, setAddressSheetOpen] = useState(false);

  const hydrationRequestIdRef = useRef(0);
  const selectedAddressIdRef = useRef<string | null>(null);
  const loadAddressesAbortControllerRef = useRef<AbortController | null>(null);
  const hydrateSelectedAddressAbortControllerRef = useRef<AbortController | null>(null);
  const loadSelectedAddressAbortControllerRef = useRef<AbortController | null>(null);

  const resetAddressSelection = useCallback(() => {
    setSelectedAddressId(null);
    setSelectedAddress(null);
  }, []);

  useEffect(() => {
    selectedAddressIdRef.current = selectedAddressId;
  }, [selectedAddressId]);

  const loadAddressesForSheet = useCallback(async () => {
    if (!userId) {
      loadAddressesAbortControllerRef.current?.abort();
      loadAddressesAbortControllerRef.current = null;
      setAvailableAddresses([]);
      setLoadingAddresses(false);
      return;
    }

    loadAddressesAbortControllerRef.current?.abort();
    const abortController = new AbortController();
    loadAddressesAbortControllerRef.current = abortController;

    setLoadingAddresses(true);
    try {
      const { data, error } = await getAddressesAbortable(userId, abortController.signal);

      if (abortController.signal.aborted) {
        return;
      }

      setLoadingAddresses(false);

      if (error) {
        onError?.(createTypedError(ErrorType.SERVER, `Gagal memuat alamat: ${error.message}`));
        return;
      }

      setAvailableAddresses(data ?? []);
    } catch (error) {
      if (abortController.signal.aborted || isAbortError(error)) {
        return;
      }

      setLoadingAddresses(false);
      onError?.(
        withFallbackMessage(classifyError(error), 'Gagal memuat alamat. Silakan coba lagi.'),
      );
    } finally {
      if (loadAddressesAbortControllerRef.current === abortController) {
        loadAddressesAbortControllerRef.current = null;
      }
    }
  }, [onError, userId]);

  useEffect(() => {
    const hydrateSelectedAddress = async () => {
      if (isOffline) {
        hydrateSelectedAddressAbortControllerRef.current?.abort();
        hydrateSelectedAddressAbortControllerRef.current = null;
        setLoadingSelectedAddress(false);
        return;
      }

      if (!userId || selectedAddressId) {
        return;
      }

      const selectedAddressIdAtRequestStart = selectedAddressIdRef.current;
      const requestId = ++hydrationRequestIdRef.current;

      hydrateSelectedAddressAbortControllerRef.current?.abort();
      const abortController = new AbortController();
      hydrateSelectedAddressAbortControllerRef.current = abortController;

      setLoadingSelectedAddress(true);
      try {
        const { data, error } = await getPreferredAddressAbortable(userId, abortController.signal);

        if (abortController.signal.aborted) {
          return;
        }

        if (
          requestId !== hydrationRequestIdRef.current ||
          selectedAddressIdRef.current !== selectedAddressIdAtRequestStart
        ) {
          return;
        }

        setLoadingSelectedAddress(false);

        if (error) {
          onError?.(
            withFallbackMessage(
              classifyError(error),
              'Gagal memuat alamat utama. Silakan coba lagi.',
            ),
          );
          return;
        }

        if (!data?.id) {
          setSelectedAddress(null);
          return;
        }

        setSelectedAddressId(data.id);
      } catch (error) {
        if (abortController.signal.aborted || isAbortError(error)) {
          return;
        }

        if (
          requestId !== hydrationRequestIdRef.current ||
          selectedAddressIdRef.current !== selectedAddressIdAtRequestStart
        ) {
          return;
        }

        setLoadingSelectedAddress(false);
        onError?.(
          withFallbackMessage(
            classifyError(error),
            'Gagal memuat alamat utama. Silakan coba lagi.',
          ),
        );
      } finally {
        if (hydrateSelectedAddressAbortControllerRef.current === abortController) {
          hydrateSelectedAddressAbortControllerRef.current = null;
        }
      }
    };

    void hydrateSelectedAddress();

    return () => {
      hydrateSelectedAddressAbortControllerRef.current?.abort();
      hydrateSelectedAddressAbortControllerRef.current = null;
    };
  }, [isOffline, onError, selectedAddressId, userId]);

  useEffect(() => {
    const loadSelectedAddress = async () => {
      if (isOffline) {
        loadSelectedAddressAbortControllerRef.current?.abort();
        loadSelectedAddressAbortControllerRef.current = null;
        setLoadingSelectedAddress(false);
        return;
      }

      if (!selectedAddressId) {
        loadSelectedAddressAbortControllerRef.current?.abort();
        loadSelectedAddressAbortControllerRef.current = null;
        setSelectedAddress(null);
        return;
      }

      loadSelectedAddressAbortControllerRef.current?.abort();
      const abortController = new AbortController();
      loadSelectedAddressAbortControllerRef.current = abortController;

      setLoadingSelectedAddress(true);
      try {
        const { data, error } = await getAddressAbortable(
          selectedAddressId,
          abortController.signal,
        );

        if (abortController.signal.aborted) {
          return;
        }

        setLoadingSelectedAddress(false);

        if (error || !data) {
          setSelectedAddress(null);
          if (error) {
            onError?.(
              withFallbackMessage(classifyError(error), 'Alamat pengiriman tidak ditemukan.'),
            );
          } else {
            onError?.(createTypedError(ErrorType.VALIDATION, 'Alamat pengiriman tidak ditemukan.'));
          }
          return;
        }

        setSelectedAddress(data);
      } catch (error) {
        if (abortController.signal.aborted || isAbortError(error)) {
          return;
        }

        setLoadingSelectedAddress(false);
        setSelectedAddress(null);
        onError?.(withFallbackMessage(classifyError(error), 'Gagal memuat alamat pengiriman.'));
      } finally {
        if (loadSelectedAddressAbortControllerRef.current === abortController) {
          loadSelectedAddressAbortControllerRef.current = null;
        }
      }
    };

    void loadSelectedAddress();

    return () => {
      loadSelectedAddressAbortControllerRef.current?.abort();
      loadSelectedAddressAbortControllerRef.current = null;
    };
  }, [isOffline, onError, selectedAddressId]);

  useEffect(() => {
    return () => {
      loadAddressesAbortControllerRef.current?.abort();
      loadAddressesAbortControllerRef.current = null;
      hydrateSelectedAddressAbortControllerRef.current?.abort();
      hydrateSelectedAddressAbortControllerRef.current = null;
      loadSelectedAddressAbortControllerRef.current?.abort();
      loadSelectedAddressAbortControllerRef.current = null;
    };
  }, []);

  const handleOpenAddressSheet = useCallback(() => {
    if (isOffline) {
      onOfflineAction?.('Alamat pengiriman tidak tersedia offline.');
      return;
    }

    void loadAddressesForSheet();
    setAddressSheetOpen(true);
  }, [isOffline, loadAddressesForSheet, onOfflineAction]);

  const handleSelectAddress = useCallback((addressId: string) => {
    setSelectedAddressId(addressId);
    setAddressSheetOpen(false);
  }, []);

  return {
    selectedAddress,
    selectedAddressId,
    loadingSelectedAddress,
    availableAddresses,
    loadingAddresses,
    addressSheetOpen,
    setAddressSheetOpen,
    handleOpenAddressSheet,
    handleSelectAddress,
    resetAddressSelection,
  };
}
