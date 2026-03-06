import { useState, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import type { Address, AddressInsert } from '@/types/address';
import { getAddress, createAddress, updateAddress } from '@/services/address.service';

export interface UseAddressDataReturn {
  /** Current address data when editing */
  address: Address | null;
  /** Whether data is being loaded */
  isLoading: boolean;
  /** Whether data is being saved */
  isSaving: boolean;
  /** Error message if loading/saving fails */
  error: string | null;
  /** Load address by ID */
  loadAddress: (addressId: string) => Promise<Address | null>;
  /** Save address (create or update) */
  saveAddress: (params: SaveAddressParams) => Promise<boolean>;
  /** Reset state */
  reset: () => void;
}

export interface SaveAddressParams {
  /** User ID for the address */
  userId: string;
  /** Address ID for edit mode, undefined for create mode */
  addressId?: string;
  /** Address data to save */
  payload: AddressInsert;
  /** Callback on successful save */
  onSuccess?: () => void;
}

/**
 * Hook for managing address data operations
 * Handles loading, creating, and updating addresses
 * Includes haptic feedback for user actions
 */
export function useAddressData(): UseAddressDataReturn {
  const [address, setAddress] = useState<Address | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load address data by ID
   */
  const loadAddress = useCallback(async (addressId: string): Promise<Address | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: err } = await getAddress(addressId);
      setIsLoading(false);

      if (err || !data) {
        setError(err?.message || 'Gagal memuat alamat');
        return null;
      }

      setAddress(data);
      return data;
    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
      return null;
    }
  }, []);

  /**
   * Save address (create new or update existing)
   */
  const saveAddress = useCallback(async (params: SaveAddressParams): Promise<boolean> => {
    const { userId, addressId, payload, onSuccess } = params;

    setIsSaving(true);
    setError(null);

    try {
      if (addressId) {
        // Update existing address
        const { error: err } = await updateAddress(addressId, userId, payload);

        if (err) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setError(err.message);
          setIsSaving(false);
          return false;
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsSaving(false);
        onSuccess?.();
        return true;
      } else {
        // Create new address
        const { error: err } = await createAddress(userId, payload);

        if (err) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setError(err.message);
          setIsSaving(false);
          return false;
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsSaving(false);
        onSuccess?.();
        return true;
      }
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
      setIsSaving(false);
      return false;
    }
  }, []);

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    setAddress(null);
    setIsLoading(false);
    setIsSaving(false);
    setError(null);
  }, []);

  return {
    address,
    isLoading,
    isSaving,
    error,
    loadAddress,
    saveAddress,
    reset,
  };
}
