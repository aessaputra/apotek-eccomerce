import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { Address } from '@/types/address';
import type { ShippingOption } from '@/types/shipping';
import type { CartSnapshot } from '@/types/cart';
import { DataPersistKeys } from '@/hooks/useDataPersist';
import { useCartCheckout } from '@/hooks/useCartCheckout';

const mockPush = jest.fn();
const mockGetPersistData = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockSetPersistData = jest.fn<(...args: unknown[]) => Promise<boolean>>();
const mockRemovePersistData = jest.fn<(...args: unknown[]) => Promise<boolean>>();
const mockCreateCheckoutOrder = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockCreateSnapToken = jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({ push: mockPush }),
  useFocusEffect: (callback: () => void | (() => void)) => {
    callback();
  },
}));

jest.mock('expo-crypto', () => ({
  __esModule: true,
  randomUUID: () => 'uuid-1',
}));

jest.mock('@/hooks/useDataPersist', () => ({
  DataPersistKeys: { CHECKOUT_SESSION: 'CHECKOUT_SESSION' },
  useDataPersist: () => ({
    getPersistData: (...args: unknown[]) => mockGetPersistData(...args),
    setPersistData: (...args: unknown[]) => mockSetPersistData(...args),
    removePersistData: (...args: unknown[]) => mockRemovePersistData(...args),
  }),
}));

jest.mock('@/services/checkout.service', () => ({
  createCheckoutOrder: (...args: unknown[]) => mockCreateCheckoutOrder(...args),
  createSnapToken: (...args: unknown[]) => mockCreateSnapToken(...args),
}));

const selectedAddress: Address = {
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
  latitude: null,
  longitude: null,
  created_at: new Date(Date.UTC(2026, 0, 1)).toISOString(),
};

const selectedShippingOption: ShippingOption = {
  courier_name: 'JNE',
  courier_code: 'jne',
  service_name: 'REG',
  service_code: 'reg',
  shipping_type: 'parcel',
  price: 15000,
  currency: 'IDR',
  estimated_delivery: '2-3 hari',
};

const snapshot: CartSnapshot = {
  itemCount: 2,
  estimatedWeightGrams: 400,
  packageValue: 50000,
};

const selectedAddressWithCoords: Address = {
  ...selectedAddress,
  latitude: -6.2,
  longitude: 106.8,
};

describe('useCartCheckout', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockGetPersistData.mockReset();
    mockSetPersistData.mockReset();
    mockRemovePersistData.mockReset();
    mockCreateCheckoutOrder.mockReset();
    mockCreateSnapToken.mockReset();

    mockSetPersistData.mockResolvedValue(true);
    mockRemovePersistData.mockResolvedValue(true);
    mockGetPersistData.mockResolvedValue(undefined);
  });

  it('keeps persisted checkout session during hydration and restores on remount', async () => {
    const persistedSession = {
      fingerprint: 'user-1|address-1|null|null|jne-reg|AREA-1|12345|2|400|50000',
      idempotency_key: 'idem-1',
      order_id: 'order-1',
      selected_address_id: 'address-1',
      selected_shipping_key: 'jne-reg',
      destination_area_id: 'AREA-1',
      destination_postal_code: 12345,
      selected_address_latitude: null,
      selected_address_longitude: null,
    };

    mockGetPersistData.mockResolvedValue(persistedSession);

    const initialProps: { addressId: string | null; shippingKey: string | null } = {
      addressId: null,
      shippingKey: null,
    };

    const { result, rerender, unmount } = renderHook(
      ({ addressId, shippingKey }: { addressId: string | null; shippingKey: string | null }) =>
        useCartCheckout({
          userId: 'user-1',
          selectedAddress,
          selectedAddressId: addressId,
          loadingSelectedAddress: false,
          selectedShippingOption,
          selectedShippingKey: shippingKey,
          quoteDestination: { areaId: 'AREA-1', postalCode: 12345 },
          snapshot,
          isOffline: false,
        }),
      {
        initialProps,
      },
    );

    await waitFor(() => {
      expect(result.current.activeOrderId).toBe('order-1');
    });
    expect(mockRemovePersistData).not.toHaveBeenCalled();

    rerender({ addressId: 'address-1', shippingKey: 'jne-reg' });

    await waitFor(() => {
      expect(result.current.activeOrderId).toBe('order-1');
    });
    expect(mockRemovePersistData).not.toHaveBeenCalled();

    unmount();

    const remount = renderHook(() =>
      useCartCheckout({
        userId: 'user-1',
        selectedAddress,
        selectedAddressId: 'address-1',
        loadingSelectedAddress: false,
        selectedShippingOption,
        selectedShippingKey: 'jne-reg',
        quoteDestination: { areaId: 'AREA-1', postalCode: 12345 },
        snapshot,
        isOffline: false,
      }),
    );

    await waitFor(() => {
      expect(remount.result.current.activeOrderId).toBe('order-1');
    });
  });

  it('clears persisted session when hydrated inputs confirm mismatch', async () => {
    mockGetPersistData.mockResolvedValue({
      fingerprint: 'user-1|address-1|null|null|jne-reg|AREA-1|12345|2|400|50000',
      idempotency_key: 'idem-1',
      order_id: 'order-1',
      selected_address_id: 'address-1',
      selected_shipping_key: 'jne-reg',
      destination_area_id: 'AREA-1',
      destination_postal_code: 12345,
      selected_address_latitude: null,
      selected_address_longitude: null,
    });

    const { result } = renderHook(() =>
      useCartCheckout({
        userId: 'user-1',
        selectedAddress,
        selectedAddressId: 'address-2',
        loadingSelectedAddress: false,
        selectedShippingOption,
        selectedShippingKey: 'sicepat-best',
        quoteDestination: { areaId: 'AREA-1', postalCode: 12345 },
        snapshot,
        isOffline: false,
      }),
    );

    await waitFor(() => {
      expect(result.current.activeOrderId).toBeNull();
    });

    expect(mockRemovePersistData).toHaveBeenCalledWith(DataPersistKeys.CHECKOUT_SESSION);
  });

  it('persists selected address and shipping key in checkout session payload', async () => {
    mockCreateCheckoutOrder.mockResolvedValue({
      data: {
        order_id: 'order-new',
        checkout_idempotency_key: 'idem-new',
      },
      error: null,
    });
    mockCreateSnapToken.mockResolvedValue({
      data: {
        redirectUrl: 'https://pay.example.com',
      },
      error: null,
    });

    const { result } = renderHook(() =>
      useCartCheckout({
        userId: 'user-1',
        selectedAddress,
        selectedAddressId: 'address-1',
        loadingSelectedAddress: false,
        selectedShippingOption,
        selectedShippingKey: 'jne-reg',
        quoteDestination: { areaId: 'AREA-1', postalCode: 12345 },
        snapshot,
        isOffline: false,
      }),
    );

    await act(async () => {
      await result.current.handleStartCheckout();
    });

    expect(mockSetPersistData).toHaveBeenCalledWith(
      DataPersistKeys.CHECKOUT_SESSION,
      expect.objectContaining({
        selected_address_id: 'address-1',
        selected_shipping_key: 'jne-reg',
        destination_area_id: 'AREA-1',
        destination_postal_code: 12345,
        selected_address_latitude: null,
        selected_address_longitude: null,
      }),
    );
  });

  it('resumes payment with activeOrderId and no selectedShippingOption', async () => {
    mockGetPersistData.mockResolvedValue({
      fingerprint: 'user-1|address-1|null|null|jne-reg|AREA-1|12345|2|400|50000',
      idempotency_key: 'idem-1',
      order_id: 'order-1',
      selected_address_id: 'address-1',
      selected_shipping_key: 'jne-reg',
      destination_area_id: 'AREA-1',
      destination_postal_code: 12345,
      selected_address_latitude: null,
      selected_address_longitude: null,
    });

    mockCreateSnapToken.mockResolvedValue({
      data: {
        redirectUrl: 'https://pay.example.com/resume',
      },
      error: null,
    });

    const { result } = renderHook(() =>
      useCartCheckout({
        userId: 'user-1',
        selectedAddress,
        selectedAddressId: null,
        loadingSelectedAddress: false,
        selectedShippingOption: null,
        selectedShippingKey: null,
        quoteDestination: { areaId: 'AREA-1', postalCode: 12345 },
        snapshot,
        isOffline: false,
      }),
    );

    await waitFor(() => {
      expect(result.current.activeOrderId).toBe('order-1');
    });

    await act(async () => {
      await result.current.handleStartCheckout();
    });

    expect(mockCreateCheckoutOrder).not.toHaveBeenCalled();
    expect(mockCreateSnapToken).toHaveBeenCalledWith('order-1');
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/cart/payment',
      params: {
        paymentUrl: 'https://pay.example.com/resume',
        orderId: 'order-1',
      },
    });
  });

  it('clears persisted checkout session when same address id has different coordinates', async () => {
    mockGetPersistData.mockResolvedValue({
      fingerprint: 'user-1|address-1|-6.2|106.8|grab-instant|AREA-1|12345|2|400|50000',
      idempotency_key: 'idem-1',
      order_id: 'order-1',
      selected_address_id: 'address-1',
      selected_shipping_key: 'grab-instant',
      destination_area_id: 'AREA-1',
      destination_postal_code: 12345,
      selected_address_latitude: -6.2,
      selected_address_longitude: 106.8,
    });

    const { result } = renderHook(() =>
      useCartCheckout({
        userId: 'user-1',
        selectedAddress: {
          ...selectedAddressWithCoords,
          latitude: -6.25,
          longitude: 106.85,
        },
        selectedAddressId: 'address-1',
        loadingSelectedAddress: false,
        selectedShippingOption: {
          ...selectedShippingOption,
          courier_code: 'grab',
          service_code: 'instant',
        },
        selectedShippingKey: 'grab-instant',
        quoteDestination: { areaId: 'AREA-1', postalCode: 12345 },
        snapshot,
        isOffline: false,
      }),
    );

    await waitFor(() => {
      expect(result.current.activeOrderId).toBeNull();
    });

    expect(mockRemovePersistData).toHaveBeenCalledWith(DataPersistKeys.CHECKOUT_SESSION);
  });

  it('clears persisted session when same address coordinates already mismatch before shipping hydration', async () => {
    mockGetPersistData.mockResolvedValue({
      fingerprint: 'user-1|address-1|-6.2|106.8|grab-instant|AREA-1|12345|2|400|50000',
      idempotency_key: 'idem-1',
      order_id: 'order-1',
      selected_address_id: 'address-1',
      selected_shipping_key: 'grab-instant',
      destination_area_id: 'AREA-1',
      destination_postal_code: 12345,
      selected_address_latitude: -6.2,
      selected_address_longitude: 106.8,
    });

    const { result } = renderHook(() =>
      useCartCheckout({
        userId: 'user-1',
        selectedAddress: {
          ...selectedAddressWithCoords,
          latitude: -6.25,
          longitude: 106.85,
        },
        selectedAddressId: 'address-1',
        loadingSelectedAddress: false,
        selectedShippingOption: null,
        selectedShippingKey: null,
        quoteDestination: { areaId: null, postalCode: null },
        snapshot,
        isOffline: false,
      }),
    );

    await waitFor(() => {
      expect(result.current.activeOrderId).toBeNull();
    });

    expect(mockRemovePersistData).toHaveBeenCalledWith(DataPersistKeys.CHECKOUT_SESSION);
  });

  it('clears persisted session when address id already mismatches before shipping hydration', async () => {
    mockGetPersistData.mockResolvedValue({
      fingerprint: 'user-1|address-1|-6.2|106.8|grab-instant|AREA-1|12345|2|400|50000',
      idempotency_key: 'idem-1',
      order_id: 'order-1',
      selected_address_id: 'address-1',
      selected_shipping_key: 'grab-instant',
      destination_area_id: 'AREA-1',
      destination_postal_code: 12345,
      selected_address_latitude: -6.2,
      selected_address_longitude: 106.8,
    });

    const { result } = renderHook(() =>
      useCartCheckout({
        userId: 'user-1',
        selectedAddress: selectedAddressWithCoords,
        selectedAddressId: 'address-2',
        loadingSelectedAddress: false,
        selectedShippingOption: null,
        selectedShippingKey: null,
        quoteDestination: { areaId: null, postalCode: null },
        snapshot,
        isOffline: false,
      }),
    );

    await waitFor(() => {
      expect(result.current.activeOrderId).toBeNull();
    });

    expect(mockRemovePersistData).toHaveBeenCalledWith(DataPersistKeys.CHECKOUT_SESSION);
  });

  it('keeps persisted session while same-address coordinates are still hydrating', async () => {
    mockGetPersistData.mockResolvedValue({
      fingerprint: 'user-1|address-1|-6.2|106.8|grab-instant|AREA-1|12345|2|400|50000',
      idempotency_key: 'idem-1',
      order_id: 'order-1',
      selected_address_id: 'address-1',
      selected_shipping_key: 'grab-instant',
      destination_area_id: 'AREA-1',
      destination_postal_code: 12345,
      selected_address_latitude: -6.2,
      selected_address_longitude: 106.8,
    });

    const { result } = renderHook(() =>
      useCartCheckout({
        userId: 'user-1',
        selectedAddress: {
          ...selectedAddressWithCoords,
          latitude: null,
          longitude: null,
        },
        selectedAddressId: 'address-1',
        loadingSelectedAddress: true,
        selectedShippingOption: null,
        selectedShippingKey: null,
        quoteDestination: { areaId: null, postalCode: null },
        snapshot,
        isOffline: false,
      }),
    );

    await waitFor(() => {
      expect(result.current.activeOrderId).toBe('order-1');
    });

    expect(mockRemovePersistData).not.toHaveBeenCalled();
  });

  it('clears persisted session while loading when same-address mismatching coordinates are already populated', async () => {
    mockGetPersistData.mockResolvedValue({
      fingerprint: 'user-1|address-1|-6.2|106.8|grab-instant|AREA-1|12345|2|400|50000',
      idempotency_key: 'idem-1',
      order_id: 'order-1',
      selected_address_id: 'address-1',
      selected_shipping_key: 'grab-instant',
      destination_area_id: 'AREA-1',
      destination_postal_code: 12345,
      selected_address_latitude: -6.2,
      selected_address_longitude: 106.8,
    });

    const { result } = renderHook(() =>
      useCartCheckout({
        userId: 'user-1',
        selectedAddress: {
          ...selectedAddressWithCoords,
          latitude: -6.25,
          longitude: 106.85,
        },
        selectedAddressId: 'address-1',
        loadingSelectedAddress: true,
        selectedShippingOption: null,
        selectedShippingKey: null,
        quoteDestination: { areaId: null, postalCode: null },
        snapshot,
        isOffline: false,
      }),
    );

    await waitFor(() => {
      expect(result.current.activeOrderId).toBeNull();
    });

    expect(mockRemovePersistData).toHaveBeenCalledWith(DataPersistKeys.CHECKOUT_SESSION);
  });

  it('clears persisted session when only destination area changes on the same address', async () => {
    mockGetPersistData.mockResolvedValue({
      fingerprint: 'user-1|address-1|-6.2|106.8|grab-instant|AREA-1|12345|2|400|50000',
      idempotency_key: 'idem-1',
      order_id: 'order-1',
      selected_address_id: 'address-1',
      selected_shipping_key: 'grab-instant',
      destination_area_id: 'AREA-1',
      destination_postal_code: 12345,
      selected_address_latitude: -6.2,
      selected_address_longitude: 106.8,
    });

    const { result } = renderHook(() =>
      useCartCheckout({
        userId: 'user-1',
        selectedAddress: selectedAddressWithCoords,
        selectedAddressId: 'address-1',
        loadingSelectedAddress: false,
        selectedShippingOption: null,
        selectedShippingKey: 'grab-instant',
        quoteDestination: { areaId: 'AREA-2', postalCode: 12345 },
        snapshot,
        isOffline: false,
      }),
    );

    await waitFor(() => {
      expect(result.current.activeOrderId).toBeNull();
    });

    expect(mockRemovePersistData).toHaveBeenCalledWith(DataPersistKeys.CHECKOUT_SESSION);
  });

  it('clears persisted session when only destination postal code changes on the same address', async () => {
    mockGetPersistData.mockResolvedValue({
      fingerprint: 'user-1|address-1|-6.2|106.8|grab-instant|AREA-1|12345|2|400|50000',
      idempotency_key: 'idem-1',
      order_id: 'order-1',
      selected_address_id: 'address-1',
      selected_shipping_key: 'grab-instant',
      destination_area_id: 'AREA-1',
      destination_postal_code: 12345,
      selected_address_latitude: -6.2,
      selected_address_longitude: 106.8,
    });

    const { result } = renderHook(() =>
      useCartCheckout({
        userId: 'user-1',
        selectedAddress: selectedAddressWithCoords,
        selectedAddressId: 'address-1',
        loadingSelectedAddress: false,
        selectedShippingOption: null,
        selectedShippingKey: 'grab-instant',
        quoteDestination: { areaId: 'AREA-1', postalCode: 54321 },
        snapshot,
        isOffline: false,
      }),
    );

    await waitFor(() => {
      expect(result.current.activeOrderId).toBeNull();
    });

    expect(mockRemovePersistData).toHaveBeenCalledWith(DataPersistKeys.CHECKOUT_SESSION);
  });
});
