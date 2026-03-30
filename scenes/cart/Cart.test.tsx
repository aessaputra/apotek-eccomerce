import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@/test-utils/renderWithTheme';
import type { CartItemWithProduct } from '@/types/cart';
import type { User } from '@/types';

const mockPush = jest.fn();
const mockRemoveCartItem =
  jest.fn<(...args: unknown[]) => Promise<{ data: boolean; error: null }>>();
const mockGetAddresses = jest.fn<(...args: unknown[]) => Promise<{ data: never[]; error: null }>>();
const mockCreateCheckoutOrder =
  jest.fn<(...args: unknown[]) => Promise<{ data: null; error: null }>>();

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

const mockCartAddressHookState = {
  selectedAddress: null,
  selectedAddressId: null as string | null,
  loadingSelectedAddress: false,
  availableAddresses: [],
  loadingAddresses: false,
  addressSheetOpen: false,
  setAddressSheetOpen: jest.fn(),
  handleSelectAddress: jest.fn(async () => undefined),
};

const mockCartShippingHookState = {
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
  quoteDestination: null,
};

const mockCartCheckoutHookState = {
  startingCheckout: false,
  activeOrderId: null as string | null,
  paymentError: null,
  clearCheckoutSession: jest.fn(async () => undefined),
  resetPaymentError: jest.fn(() => undefined),
};

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({ push: mockPush }),
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

jest.mock('@/hooks/useCartCheckout', () => ({
  useCartCheckout: ({
    isOffline,
    onOfflineAction,
  }: {
    isOffline: boolean;
    onOfflineAction: (message: string) => void;
  }) => ({
    ...mockCartCheckoutHookState,
    handleStartCheckout: async () => {
      if (isOffline) {
        onOfflineAction('Checkout tidak tersedia offline');
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

jest.mock('@/services/checkout.service', () => ({
  createCheckoutOrder: (...args: unknown[]) => mockCreateCheckoutOrder(...args),
  createSnapToken: jest.fn(async () => ({ data: null, error: null })),
}));

jest.mock('@/components/elements/CartItemCard', () => ({
  CartItemCard: ({
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

const Cart = require('./Cart').default as React.ComponentType;

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
    mockRemoveCartItem.mockReset();
    mockGetAddresses.mockReset();
    mockCreateCheckoutOrder.mockReset();

    mockRemoveCartItem.mockResolvedValue({ data: true, error: null });
    mockGetAddresses.mockResolvedValue({ data: [], error: null });
    mockCreateCheckoutOrder.mockResolvedValue({ data: null, error: null });

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
    mockCartShippingHookState.setShippingError.mockClear();
    mockCartShippingHookState.setShippingSheetOpen.mockClear();
    mockCartShippingHookState.handleCalculateShipping.mockClear();
    mockCartShippingHookState.handleSelectShippingKey.mockClear();
    mockCartCheckoutHookState.clearCheckoutSession.mockClear();
    mockCartCheckoutHookState.resetPaymentError.mockClear();
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
});
