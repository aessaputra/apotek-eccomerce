import { useCallback, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { deleteAddress, getAddresses, setDefaultAddress } from '@/services/address.service';
import type { Address } from '@/types/address';

export type AddressSection = {
  data: Address[];
};

export interface UseAddressListResult {
  addresses: Address[];
  orderedAddresses: Address[];
  sections: AddressSection[];
  loading: boolean;
  refreshing: boolean;
  refreshAddresses: () => void;
  deleteSavedAddress: (address: Address) => Promise<void>;
  setPrimaryAddress: (addressId: string) => Promise<void>;
}

export function useAddressList(userId: string | undefined): UseAddressListResult {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAddresses = useCallback(async () => {
    if (!userId) return;

    const { data, error } = await getAddresses(userId);

    if (error) {
      Alert.alert('Error', 'Gagal memuat alamat: ' + error.message);
    } else {
      setAddresses(data || []);
    }

    setLoading(false);
    setRefreshing(false);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadAddresses();
    }, [loadAddresses]),
  );

  const refreshAddresses = useCallback(() => {
    setRefreshing(true);
    loadAddresses();
  }, [loadAddresses]);

  const deleteSavedAddress = useCallback(
    async (address: Address) => {
      if (!userId) return;

      const { error } = await deleteAddress(address.id, userId);

      if (error) {
        Alert.alert('Error', 'Gagal menghapus alamat: ' + error.message);
      } else {
        loadAddresses();
      }
    },
    [userId, loadAddresses],
  );

  const setPrimaryAddress = useCallback(
    async (addressId: string) => {
      if (!userId) return;

      const { error } = await setDefaultAddress(addressId, userId);

      if (error) {
        Alert.alert('Error', 'Gagal mengatur alamat utama: ' + error.message);
      } else {
        loadAddresses();
      }
    },
    [userId, loadAddresses],
  );

  const orderedAddresses = useMemo(() => {
    const defaultAddress = addresses.find(address => address.is_default);
    const otherAddresses = addresses.filter(address => !address.is_default);

    return defaultAddress ? [defaultAddress, ...otherAddresses] : otherAddresses;
  }, [addresses]);

  const sections = useMemo<AddressSection[]>(
    () => (orderedAddresses.length > 0 ? [{ data: orderedAddresses }] : []),
    [orderedAddresses],
  );

  return {
    addresses,
    orderedAddresses,
    sections,
    loading,
    refreshing,
    refreshAddresses,
    deleteSavedAddress,
    setPrimaryAddress,
  };
}
