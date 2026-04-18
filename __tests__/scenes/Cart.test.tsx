import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@/test-utils/renderWithTheme';
import type { CartItemWithProduct } from '@/types/cart';
import type { User } from '@/types';
import type { Address } from '@/types/address';
import type { ShippingOption } from '@/types/shipping';

const mockPush = jest.fn();
const mockSetOptions = jest.fn();
const mockRemoveCartItem =
  jest.fn<(...args: unknown[]) => Promise<{ data: boolean; error: null }>>();
const mockGetAddresses = jest.fn<(...args: unknown[]) => Promise<{ data: never[]; error: null }>>();
let mockUser: Pick<User, 'id'> | undefined;
let mockNetworkState: {
  status: 'checking' | 'online' | 'offline';
  isOnline: boolean;
  isOffline: boolean;
  type: string;
  isExpensive: boolean;
} = {
  status: 'online',
  isOnline: true,
  isOffline: false,
  type: 'wifi',
  isExpensive: false,
};

const mockCartHookState: {
  cartId: string | null;
  items: CartItemWithProduct[];
  snapshot: { itemCount: number; estimatedWeightGrams: number; packageValue: number };
  error: string | null;
  isLoading: boolean;
  isRefreshing: boolean;
  realtimeState: 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
  refresh: jest.Mock<() => Promise<void>>;
} = {
  cartId: 'cart-1',
  items: [],
  snapshot: { itemCount: 0, estimatedWeightGrams: 0, packageValue: 0 },
  error: null,
  isLoading: false,
  isRefreshing: false,
  realtimeState: 'connected',
  refresh: jest.fn(async () => undefined),
};

const mockCartQuantityHookState = {
  items: [] as CartItemWithProduct[],
  snapshot: { itemCount: 0, estimatedWeightGrams: 0, packageValue: 0 },
  updateQuantity: jest.fn(),
};

const mockCartAddressHookState: {
  selectedAddress: Address | null;
  selectedAddressId: string | null;
  loadingSelectedAddress: boolean;
  availableAddresses: Address[];
  loadingAddresses: boolean;
  addressSheetOpen: boolean;
  setAddressSheetOpen: jest.Mock;
  handleSelectAddress: jest.Mock<() => Promise<void>>;
} = {
  selectedAddress: null,
  selectedAddressId: null as string | null,
  loadingSelectedAddress: false,
  availableAddresses: [],
  loadingAddresses: false,
  addressSheetOpen: false,
  setAddressSheetOpen: jest.fn(),
  handleSelectAddress: jest.fn(async () => undefined),
};

const mockCartShippingHookState: {
  shippingOptions: ShippingOption[];
  selectedShippingOption: ShippingOption | null;
  loadingRates: boolean;
  shippingError: string | null;
  setShippingError: jest.Mock;
  selectedShippingKey: string | null;
  shippingSheetOpen: boolean;
  setShippingSheetOpen: jest.Mock;
  handleCalculateShipping: jest.Mock<() => Promise<void>>;
  handleSelectShippingKey: jest.Mock<(key: string) => void>;
  quoteDestination: { areaId: string | null; postalCode: number | null };
} = {
  shippingOptions: [],
  selectedShippingOption: null,
  loadingRates: false,
  shippingError: null,
  setShippingError: jest.fn(),
  selectedShippingKey: null as string | null,
  shippingSheetOpen: false,
  setShippingSheetOpen: jest.fn(),
  handleCalculateShipping: jest.fn(async () => undefined),
  handleSelectShippingKey: jest.fn((_: string) => undefined),
  quoteDestination: { areaId: null as string | null, postalCode: null as number | null },
};

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({ push: mockPush }),
  useNavigation: () => ({ setOptions: mockSetOptions }),
  useFocusEffect: (callback: () => void | (() => void)) => {
    setTimeout(() => {
      callback();
    }, 0);
  },
}));

jest.mock('@/slices', () => ({
  useAppSlice: () => ({ user: mockUser }),
}));

jest.mock('@/hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => mockNetworkState,
}));

jest.mock('@/hooks/useCartPaginated', () => ({
  useCartPaginated: () => mockCartHookState,
}));

jest.mock('@/hooks/useCartQuantity', () => ({
  useCartQuantity: () => mockCartQuantityHookState,
}));

jest.mock('@/hooks/useCartAddress', () => ({
  useCartAddress: ({
    isOffline,
    onOfflineAction,
  }: {
    isOffline: boolean;
    onOfflineAction: (message: string) => void;
  }) => ({
    ...mockCartAddressHookState,
    handleOpenAddressSheet: () => {
      if (isOffline) {
        onOfflineAction('Alamat pengiriman tidak tersedia offline.');
      }
    },
  }),
}));

jest.mock('@/hooks/useCartShipping', () => ({
  useCartShipping: ({
    isOffline,
    onOfflineAction,
  }: {
    isOffline: boolean;
    onOfflineAction: (message: string) => void;
  }) => ({
    ...mockCartShippingHookState,
    handleOpenShippingSheet: () => {
      if (isOffline) {
        onOfflineAction('Opsi pengiriman tidak tersedia offline.');
      }
    },
  }),
}));

jest.mock('@/hooks/useDataPersist', () => ({
  DataPersistKeys: { CHECKOUT_SESSION: 'CHECKOUT_SESSION' },
  useDataPersist: () => ({
    getPersistData: jest.fn(async () => undefined),
    setPersistData: jest.fn(async () => true),
    removePersistData: jest.fn(async () => true),
  }),
}));

jest.mock('@/services/address.service', () => ({
  getAddress: jest.fn(async () => ({ data: null, error: null })),
  getPreferredAddress: jest.fn(async () => ({ data: null, error: null })),
  getAddresses: (...args: unknown[]) => mockGetAddresses(...args),
}));

jest.mock('@/services/cart.service', () => ({
  updateCartItemQuantity: jest.fn(async () => ({ data: true, error: null })),
  removeCartItem: (...args: unknown[]) => mockRemoveCartItem(...args),
}));

jest.mock('@/services/shipping.service', () => ({
  getShippingRatesForAddress: jest.fn(async () => ({ data: { options: [] }, error: null })),
}));

jest.mock('@/components/elements/CartItemRow/CartItemRow', () => ({
  CartItemRow: ({
    item,
    onRemove,
  }: {
    item: CartItemWithProduct;
    onRemove: (cartItemId: string) => void;
  }) => {
    const { Pressable, Text, View } = jest.requireActual(
      'react-native',
    ) as typeof import('react-native');

    return (
      <View>
        <Text>{item.product.name}</Text>
        <Pressable accessibilityLabel={`remove ${item.id}`} onPress={() => onRemove(item.id)}>
          <Text>Remove {item.id}</Text>
        </Pressable>
      </View>
    );
  },
}));

jest.mock('@/components/elements/StickyBottomBar/StickyBottomBar', () => ({
  StickyBottomBar: ({
    disabled,
    onConfirm,
    confirmText,
  }: {
    disabled?: boolean;
    onConfirm: () => void;
    confirmText?: string;
  }) => {
    const { Pressable, Text, View } = jest.requireActual(
      'react-native',
    ) as typeof import('react-native');

    return (
      <View>
        <Text testID="sticky-disabled">{String(Boolean(disabled))}</Text>
        <Pressable accessibilityLabel="sticky-confirm" disabled={disabled} onPress={onConfirm}>
          <Text>{confirmText ?? 'Konfirmasi'}</Text>
        </Pressable>
      </View>
    );
  },
}));

jest.mock('@/components/elements/CartSummary/CartSummary', () => ({
  CartSummary: () => {
    const { Text } = jest.requireActual('react-native') as typeof import('react-native');
    return <Text>Cart Summary</Text>;
  },
}));

jest.mock('@/components/elements/CartLoadingSkeleton/CartLoadingSkeleton', () => ({
  CartLoadingSkeleton: () => {
    const { Text } = jest.requireActual('react-native') as typeof import('react-native');
    return <Text>Cart Loading Skeleton</Text>;
  },
}));

jest.mock('@/components/elements/EmptyCartState/EmptyCartState', () => ({
  EmptyCartState: ({ onBrowse }: { onBrowse: () => void }) => {
    const { Pressable, Text, View } = jest.requireActual(
      'react-native',
    ) as typeof import('react-native');
    return (
      <View>
        <Text>Empty Cart State</Text>
        <Pressable accessibilityLabel="browse-products" onPress={onBrowse}>
          <Text>Browse products</Text>
        </Pressable>
      </View>
    );
  },
}));

jest.mock('@/components/elements/AddressCard', () => ({
  __esModule: true,
  default: () => {
    const { Text } = jest.requireActual('react-native') as typeof import('react-native');
    return <Text>Address Card</Text>;
  },
}));

jest.mock('@/components/icons', () => ({
  CartIcon: () => {
    const { Text } = jest.requireActual('react-native') as typeof import('react-native');
    return <Text>CartIcon</Text>;
  },
  ChevronRightIcon: () => {
    const { Text } = jest.requireActual('react-native') as typeof import('react-native');
    return <Text>ChevronRightIcon</Text>;
  },
  MapPinIcon: () => {
    const { Text } = jest.requireActual('react-native') as typeof import('react-native');
    return <Text>MapPinIcon</Text>;
  },
}));

const Cart = require('@/scenes/cart/Cart').default as React.ComponentType;

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
  area_name: 'Jakarta Selatan',
  postal_code: '12345',
  is_default: true,
  country_code: 'ID',
  latitude: -6.2,
  longitude: 106.8,
  created_at: new Date(Date.UTC(2026, 0, 1)).toISOString(),
};

const shippingOption: ShippingOption = {
  courier_name: 'JNE',
  courier_code: 'jne',
  service_name: 'REG',
  service_code: 'reg',
  shipping_type: 'parcel',
  price: 15000,
  currency: 'IDR',
  estimated_delivery: '2-3 hari',
};

function createItem(index: number): CartItemWithProduct {
  return {
    id: `cart-item-${index}`,
    cart_id: 'cart-1',
    product_id: `product-${index}`,
    quantity: 1,
    created_at: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
    product: {
      id: `product-${index}`,
      name: `Produk ${index}`,
      price: 10000 + index,
      stock: 10,
      weight: 100,
      slug: `produk-${index}`,
      is_active: true,
    },
    images: [{ id: `img-${index}`, url: `https://example.com/${index}.jpg`, sort_order: 0 }],
  };
}

describe('<Cart />', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockSetOptions.mockClear();
    mockRemoveCartItem.mockReset();
    mockGetAddresses.mockReset();

    mockRemoveCartItem.mockResolvedValue({ data: true, error: null });
    mockGetAddresses.mockResolvedValue({ data: [], error: null });

    mockUser = { id: 'user-1' };
    mockNetworkState = {
      status: 'online',
      isOnline: true,
      isOffline: false,
      type: 'wifi',
      isExpensive: false,
    };

    mockCartHookState.items = [createItem(1), createItem(2)];
    mockCartHookState.snapshot = { itemCount: 2, estimatedWeightGrams: 200, packageValue: 50000 };
    mockCartHookState.error = null;
    mockCartHookState.isLoading = false;
    mockCartHookState.isRefreshing = false;
    mockCartHookState.realtimeState = 'connected';
    mockCartHookState.refresh.mockClear();
    mockCartQuantityHookState.items = mockCartHookState.items;
    mockCartQuantityHookState.snapshot = mockCartHookState.snapshot;
    mockCartQuantityHookState.updateQuantity.mockClear();
    mockCartAddressHookState.setAddressSheetOpen.mockClear();
    mockCartAddressHookState.handleSelectAddress.mockClear();
    mockCartAddressHookState.selectedAddress = null;
    mockCartAddressHookState.selectedAddressId = null;
    mockCartShippingHookState.setShippingError.mockClear();
    mockCartShippingHookState.setShippingSheetOpen.mockClear();
    mockCartShippingHookState.handleCalculateShipping.mockClear();
    mockCartShippingHookState.handleSelectShippingKey.mockClear();
    mockCartShippingHookState.selectedShippingOption = null;
    mockCartShippingHookState.selectedShippingKey = null;
    mockCartShippingHookState.quoteDestination = { areaId: null, postalCode: null };
  });

  it('renders cart items when user is logged in', () => {
    render(<Cart />);

    expect(screen.getByText('Produk 1')).not.toBeNull();
    expect(screen.getByText('Produk 2')).not.toBeNull();
    expect(screen.queryByText('Login Terlebih Dahulu')).toBeNull();
  });

  it('shows error banner on fetch error', () => {
    mockCartHookState.error = 'Gagal sinkronisasi keranjang';

    render(<Cart />);

    expect(screen.getByText('Gagal memuat keranjang.')).not.toBeNull();
    expect(screen.getByText('Gagal sinkronisasi keranjang')).not.toBeNull();
  });

  it('routes empty-cart browse action directly to /home', () => {
    mockCartHookState.items = [];
    mockCartHookState.snapshot = { itemCount: 0, estimatedWeightGrams: 0, packageValue: 0 };
    mockCartQuantityHookState.items = [];
    mockCartQuantityHookState.snapshot = mockCartHookState.snapshot;

    render(<Cart />);

    fireEvent.press(screen.getByLabelText('browse-products'));

    expect(mockPush).toHaveBeenCalledWith('/home');
  });

  it('opens the review scene when checkout data is complete', () => {
    mockCartAddressHookState.selectedAddress = selectedAddress;
    mockCartAddressHookState.selectedAddressId = selectedAddress.id;
    mockCartShippingHookState.selectedShippingOption = shippingOption;
    mockCartShippingHookState.selectedShippingKey = 'jne-reg';
    mockCartShippingHookState.quoteDestination = {
      areaId: 'AREA-1',
      postalCode: 12345,
    };

    render(<Cart />);

    fireEvent.press(screen.getByLabelText('sticky-confirm'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/cart/review',
      params: {
        addressPayload: JSON.stringify(selectedAddress),
        addressText: 'Jl. Test 1, Jakarta, DKI Jakarta, 12345',
        shippingOptionPayload: JSON.stringify(shippingOption),
        selectedShippingKey: 'jne-reg',
        snapshotPayload: JSON.stringify(mockCartHookState.snapshot),
        itemSummariesPayload: JSON.stringify([
          { name: 'Produk 1', quantity: 1 },
          { name: 'Produk 2', quantity: 1 },
        ]),
        quoteAreaId: 'AREA-1',
        quotePostalCode: '12345',
      },
    });
  });

  it('shows a full-screen spinner during the initial cart load', () => {
    mockCartHookState.items = [];
    mockCartHookState.snapshot = { itemCount: 0, estimatedWeightGrams: 0, packageValue: 0 };
    mockCartHookState.isLoading = true;
    mockCartQuantityHookState.items = [];
    mockCartQuantityHookState.snapshot = mockCartHookState.snapshot;

    render(<Cart />);

    expect(screen.getByLabelText('Memuat keranjang')).not.toBeNull();
    expect(screen.queryByText('Empty Cart State')).toBeNull();
    expect(screen.queryByText('Cart Loading Skeleton')).toBeNull();
  });

  it('hides the navigation header during the first cart load', () => {
    mockCartHookState.items = [];
    mockCartHookState.snapshot = { itemCount: 0, estimatedWeightGrams: 0, packageValue: 0 };
    mockCartHookState.isLoading = true;
    mockCartQuantityHookState.items = [];
    mockCartQuantityHookState.snapshot = mockCartHookState.snapshot;

    render(<Cart />);

    expect(mockSetOptions).toHaveBeenCalledWith({ headerShown: false });
  });

  it('shows the navigation header again after the initial load completes', () => {
    mockCartHookState.items = [];
    mockCartHookState.snapshot = { itemCount: 0, estimatedWeightGrams: 0, packageValue: 0 };
    mockCartHookState.isLoading = true;
    mockCartQuantityHookState.items = [];
    mockCartQuantityHookState.snapshot = mockCartHookState.snapshot;

    const view = render(<Cart />);

    mockCartHookState.items = [createItem(1)];
    mockCartHookState.snapshot = { itemCount: 1, estimatedWeightGrams: 100, packageValue: 10001 };
    mockCartHookState.isLoading = false;
    mockCartQuantityHookState.items = mockCartHookState.items;
    mockCartQuantityHookState.snapshot = mockCartHookState.snapshot;

    view.rerender(<Cart />);

    expect(screen.getByText('Produk 1')).not.toBeNull();
    expect(mockSetOptions).toHaveBeenNthCalledWith(1, { headerShown: false });
    expect(mockSetOptions).toHaveBeenLastCalledWith({ headerShown: true });
  });

  it('does not show realtime synchronization text while the cart reconnects', () => {
    mockCartHookState.realtimeState = 'reconnecting';

    render(<Cart />);

    expect(screen.queryByText('Sinkronisasi keranjang menyambung kembali...')).toBeNull();
    expect(screen.queryByText('Menyambungkan sinkronisasi keranjang...')).toBeNull();
  });

  it('keeps the overlay hidden while refreshing an existing cart', () => {
    mockCartHookState.items = [createItem(1)];
    mockCartHookState.snapshot = { itemCount: 1, estimatedWeightGrams: 100, packageValue: 10001 };
    mockCartHookState.isLoading = true;
    mockCartQuantityHookState.items = mockCartHookState.items;
    mockCartQuantityHookState.snapshot = mockCartHookState.snapshot;

    render(<Cart />);

    expect(screen.queryByLabelText('Memuat keranjang')).toBeNull();
    expect(screen.getByText('Produk 1')).not.toBeNull();
    expect(mockSetOptions).toHaveBeenCalledWith({ headerShown: true });
  });
});
