import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useCartAddress } from '@/hooks/useCartAddress';
import type { Address } from '@/types/address';

const mockGetAddress = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetAddresses = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetPreferredAddress = jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock('@/services/address.service', () => ({
  getAddress: (...args: unknown[]) => mockGetAddress(...args),
  getAddresses: (...args: unknown[]) => mockGetAddresses(...args),
  getPreferredAddress: (...args: unknown[]) => mockGetPreferredAddress(...args),
}));

const baseAddress: Address = {
  id: 'address-1',
  profile_id: 'profile-1',
  receiver_name: 'User',
  phone_number: '08123456789',
  street_address: 'Jl. Test 1',
  address_note: null,
  city: 'Jakarta',
  city_id: 'CITY-1',
  province: 'DKI Jakarta',
  province_id: 'PROV-1',
  area_id: 'AREA-1',
  area_name: 'Jakarta',
  postal_code: '12345',
  is_default: true,
  country_code: 'ID',
  latitude: -6.2,
  longitude: 106.8,
  created_at: new Date(Date.UTC(2026, 0, 1)).toISOString(),
};

describe('useCartAddress', () => {
  beforeEach(() => {
    mockGetAddress.mockReset();
    mockGetAddresses.mockReset();
    mockGetPreferredAddress.mockReset();

    mockGetAddress.mockResolvedValue({ data: null, error: null });
    mockGetAddresses.mockResolvedValue({ data: [], error: null });
    mockGetPreferredAddress.mockResolvedValue({ data: null, error: null });
  });

  it('blocks opening the address sheet while offline', () => {
    const onOfflineAction = jest.fn();
    const { result } = renderHook(() =>
      useCartAddress({ userId: 'user-1', isOffline: true, onOfflineAction }),
    );

    act(() => {
      result.current.handleOpenAddressSheet();
    });

    expect(onOfflineAction).toHaveBeenCalledWith('Alamat pengiriman tidak tersedia offline.');
    expect(result.current.addressSheetOpen).toBe(false);
    expect(mockGetAddresses).not.toHaveBeenCalled();
  });

  it('loads available addresses and opens the sheet when online', async () => {
    mockGetAddresses.mockResolvedValue({ data: [baseAddress], error: null });

    const { result } = renderHook(() => useCartAddress({ userId: 'user-1', isOffline: false }));

    await waitFor(() => {
      expect(mockGetPreferredAddress).toHaveBeenCalledWith('user-1', expect.any(AbortSignal));
    });

    act(() => {
      result.current.handleOpenAddressSheet();
    });

    expect(result.current.addressSheetOpen).toBe(true);

    await waitFor(() => {
      expect(result.current.availableAddresses).toEqual([baseAddress]);
    });

    expect(mockGetAddresses).toHaveBeenCalledWith('user-1', expect.any(AbortSignal));
  });

  it('hydrates the preferred address and resolves the full selected address', async () => {
    mockGetPreferredAddress.mockResolvedValue({ data: { id: 'address-1' }, error: null });
    mockGetAddress.mockResolvedValue({ data: baseAddress, error: null });

    const { result } = renderHook(() => useCartAddress({ userId: 'user-1', isOffline: false }));

    await waitFor(() => {
      expect(result.current.selectedAddressId).toBe('address-1');
    });

    await waitFor(() => {
      expect(result.current.selectedAddress).toEqual(baseAddress);
    });

    expect(mockGetPreferredAddress).toHaveBeenCalledWith('user-1', expect.any(AbortSignal));
    expect(mockGetAddress).toHaveBeenCalledWith('address-1', expect.any(AbortSignal));
  });

  it('updates selectedAddressId and closes the sheet when selecting an address', async () => {
    const { result } = renderHook(() => useCartAddress({ userId: 'user-1', isOffline: false }));

    await waitFor(() => {
      expect(mockGetPreferredAddress).toHaveBeenCalledWith('user-1', expect.any(AbortSignal));
    });

    act(() => {
      result.current.setAddressSheetOpen(true);
      result.current.handleSelectAddress('address-2');
    });

    expect(result.current.selectedAddressId).toBe('address-2');
    expect(result.current.addressSheetOpen).toBe(false);

    await waitFor(() => {
      expect(mockGetAddress).toHaveBeenCalledWith('address-2', expect.any(AbortSignal));
    });
  });

  it('reports validation error when selected address is not found', async () => {
    const onError = jest.fn();
    mockGetPreferredAddress.mockResolvedValue({ data: { id: 'address-404' }, error: null });
    mockGetAddress.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() =>
      useCartAddress({ userId: 'user-1', isOffline: false, onError }),
    );

    await waitFor(() => {
      expect(result.current.selectedAddressId).toBe('address-404');
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Alamat pengiriman tidak ditemukan.' }),
      );
    });

    expect(result.current.selectedAddress).toBeNull();
  });
});
