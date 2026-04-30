import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@/test-utils/renderWithTheme';
import Cart from '@/scenes/cart/Cart';
import type { Address } from '@/types/address';
import type { CartItemWithProduct } from '@/types/cart';
import type { ShippingOption } from '@/types/shipping';
import type { User } from '@/types';

const mockPush = jest.fn();
const mockRemoveCartItem =
  jest.fn<(...args: unknown[]) => Promise<{ data: boolean; error: null }>>();
const mockGetAddresses = jest.fn<(...args: unknown[]) => Promise<{ data: never[]; error: null }>>();
const mockCreateCheckoutOrder =
  jest.fn<(...args: unknown[]) => Promise<{ data: null; error: null }>>();
const mockUseCartShippingParams = jest.fn<(...args: unknown[]) => void>();
const mockUseCartCheckoutParams = jest.fn<(...args: unknown[]) => void>();

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
  shippingError: Error | null;
  setShippingError: jest.Mock;
  selectedShippingKey: string | null;
  shippingSheetOpen: boolean;
  setShippingSheetOpen: jest.Mock;
  handleCalculateShipping: jest.Mock<() => Promise<void>>;
  handleOpenShippingSheet: jest.Mock<() => void>;
  handleSelectShippingKey: jest.Mock<(key: string) => void>;
  quoteDestination: { areaId: string; postalCode: number } | null;
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
  handleOpenShippingSheet: jest.fn(),
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
  useCartShipping: (params: { isOffline: boolean; onOfflineAction: (message: string) => void }) => {
    mockUseCartShippingParams(params);

    return {
      ...mockCartShippingHookState,
      handleOpenShippingSheet: () => {
        if (params.isOffline) {
          params.onOfflineAction('Opsi pengiriman tidak tersedia offline.');
          return;
        }

        mockCartShippingHookState.handleOpenShippingSheet();
      },
    };
  },
}));

jest.mock('@/hooks/useCartCheckout', () => ({
  useCartCheckout: (params: { isOffline: boolean; onOfflineAction: (message: string) => void }) => {
    mockUseCartCheckoutParams(params);

    return {
      ...mockCartCheckoutHookState,
      handleStartCheckout: async () => {
        if (params.isOffline) {
          params.onOfflineAction('Checkout tidak tersedia offline');
        }
      },
    };
  },
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

jest.mock('@/components/elements/CartItemRow/CartItemRow', () => ({
  CartItemRow: ({
    item,
    isSelected,
    onSelectionChange,
    onQuantityChange,
    onRemove,
  }: {
    item: CartItemWithProduct;
    isSelected?: boolean;
    onSelectionChange: (cartItemId: string, nextSelected: boolean) => void;
    onQuantityChange: (cartItemId: string, nextQuantity: number) => void;
    onRemove: (cartItemId: string) => void;
  }) => {
    const { Pressable, Text, View } = jest.requireActual(
      'react-native',
    ) as typeof import('react-native');

    return (
      <View>
        <Text>{item.product.name}</Text>
        <Text>{isSelected ? `selected ${item.id}` : `not selected ${item.id}`}</Text>
        <Pressable
          testID={`cart-item-checkbox-${item.id}`}
          accessibilityLabel={`toggle ${item.id}`}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: Boolean(isSelected) }}
          onPress={() => onSelectionChange(item.id, !isSelected)}>
          <Text>{isSelected ? 'Terpilih' : 'Tidak terpilih'}</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={`increase ${item.id}`}
          onPress={() => onQuantityChange(item.id, item.quantity + 1)}>
          <Text>Increase {item.id}</Text>
        </Pressable>
        <Pressable accessibilityLabel={`remove ${item.id}`} onPress={() => onRemove(item.id)}>
          <Text>Remove {item.id}</Text>
        </Pressable>
      </View>
    );
  },
}));

jest.mock('@/components/elements/StickyBottomBar/StickyBottomBar', () => ({
  StickyBottomBar: ({
    grandTotal,
    disabled,
    onConfirm,
    confirmText,
  }: {
    grandTotal: number;
    disabled?: boolean;
    onConfirm: () => void;
    confirmText?: string;
  }) => {
    const { Pressable, Text, View } = jest.requireActual(
      'react-native',
    ) as typeof import('react-native');

    return (
      <View>
        <Text testID="sticky-grand-total">{String(grandTotal)}</Text>
        <Text testID="sticky-disabled">{String(Boolean(disabled))}</Text>
        <Pressable accessibilityLabel="sticky-confirm" disabled={disabled} onPress={onConfirm}>
          <Text>{confirmText ?? 'Konfirmasi'}</Text>
        </Pressable>
      </View>
    );
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

jest.mock('@/components/elements/AppAlertDialog', () => ({
  __esModule: true,
  default: ({
    open,
    title,
    description,
    confirmText,
    onOpenChange,
  }: {
    open: boolean;
    title: string;
    description: string;
    confirmText?: string;
    onOpenChange: (open: boolean) => void;
  }) => {
    const { Pressable, Text, View } = jest.requireActual(
      'react-native',
    ) as typeof import('react-native');

    if (!open) {
      return null;
    }

    return (
      <View accessibilityRole="alert">
        <Text>{title}</Text>
        <Text>{description}</Text>
        <Pressable accessibilityLabel={confirmText ?? 'OK'} onPress={() => onOpenChange(false)}>
          <Text>{confirmText ?? 'OK'}</Text>
        </Pressable>
      </View>
    );
  },
}));

jest.mock('@/components/elements/AddressCard', () => ({
  __esModule: true,
  default: ({
    address,
    onEdit,
    onPress,
  }: {
    address: Address;
    onEdit?: () => void;
    onPress?: () => void;
  }) => {
    const { Pressable, Text, View } = jest.requireActual(
      'react-native',
    ) as typeof import('react-native');
    return (
      <View>
        <Text>Address Card</Text>
        <Pressable accessibilityLabel={`select-${address.id}`} onPress={onPress}>
          <Text>Pilih {address.id}</Text>
        </Pressable>
        <Pressable accessibilityLabel={`edit-${address.id}`} onPress={onEdit}>
          <Text>Ubah {address.id}</Text>
        </Pressable>
      </View>
    );
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
      sku: `SKU-PRODUK-${index}`,
    } as CartItemWithProduct['product'] & { sku: string },
    images: [{ id: `img-${index}`, url: `https://example.com/${index}.jpg`, sort_order: 0 }],
  };
}

function createAddress(): Address {
  return {
    id: 'address-1',
    profile_id: 'profile-1',
    receiver_name: 'User Test',
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
}

function createShippingOption(): ShippingOption {
  return {
    courier_name: 'JNE',
    courier_code: 'jne',
    service_name: 'REG',
    service_code: 'reg',
    shipping_type: 'parcel',
    price: 12000,
    currency: 'IDR',
    estimated_delivery: '2-3 hari',
  };
}

function setCartItems(items: CartItemWithProduct[]) {
  mockCartHookState.items = items;
  mockCartHookState.snapshot = items.reduce(
    (cartSnapshot, item) => ({
      itemCount: cartSnapshot.itemCount + item.quantity,
      estimatedWeightGrams: cartSnapshot.estimatedWeightGrams + item.quantity * item.product.weight,
      packageValue: cartSnapshot.packageValue + item.quantity * item.product.price,
    }),
    { itemCount: 0, estimatedWeightGrams: 0, packageValue: 0 },
  );
  mockCartQuantityHookState.items = mockCartHookState.items;
  mockCartQuantityHookState.snapshot = mockCartHookState.snapshot;
}

function setReadyForCheckout() {
  const address = createAddress();
  const shippingOption = createShippingOption();

  mockCartAddressHookState.selectedAddress = address;
  mockCartAddressHookState.selectedAddressId = address.id;
  mockCartShippingHookState.shippingOptions = [shippingOption];
  mockCartShippingHookState.selectedShippingOption = shippingOption;
  mockCartShippingHookState.selectedShippingKey = 'jne-reg';
  mockCartShippingHookState.quoteDestination = { areaId: 'AREA-1', postalCode: 12345 };
}

describe('<Cart />', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockRemoveCartItem.mockReset();
    mockGetAddresses.mockReset();
    mockCreateCheckoutOrder.mockReset();
    mockUseCartShippingParams.mockClear();
    mockUseCartCheckoutParams.mockClear();

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

    setCartItems([createItem(1), createItem(2)]);
    mockCartHookState.error = null;
    mockCartHookState.isLoading = false;
    mockCartHookState.isRefreshing = false;
    mockCartHookState.realtimeState = 'connected';
    mockCartHookState.refresh.mockClear();
    mockCartQuantityHookState.updateQuantity.mockClear();
    mockCartAddressHookState.selectedAddress = null;
    mockCartAddressHookState.selectedAddressId = null;
    mockCartAddressHookState.loadingSelectedAddress = false;
    mockCartAddressHookState.availableAddresses = [];
    mockCartAddressHookState.loadingAddresses = false;
    mockCartAddressHookState.addressSheetOpen = false;
    mockCartAddressHookState.setAddressSheetOpen.mockClear();
    mockCartAddressHookState.handleSelectAddress.mockClear();
    mockCartShippingHookState.shippingOptions = [];
    mockCartShippingHookState.selectedShippingOption = null;
    mockCartShippingHookState.loadingRates = false;
    mockCartShippingHookState.shippingError = null;
    mockCartShippingHookState.selectedShippingKey = null;
    mockCartShippingHookState.shippingSheetOpen = false;
    mockCartShippingHookState.quoteDestination = null;
    mockCartShippingHookState.setShippingError.mockClear();
    mockCartShippingHookState.setShippingSheetOpen.mockClear();
    mockCartShippingHookState.handleCalculateShipping.mockClear();
    mockCartShippingHookState.handleOpenShippingSheet.mockClear();
    mockCartShippingHookState.handleSelectShippingKey.mockClear();
    mockCartCheckoutHookState.startingCheckout = false;
    mockCartCheckoutHookState.activeOrderId = null;
    mockCartCheckoutHookState.paymentError = null;
    mockCartCheckoutHookState.clearCheckoutSession.mockClear();
    mockCartCheckoutHookState.resetPaymentError.mockClear();
  });

  it('renders cart items when user is logged in', () => {
    render(<Cart />);

    expect(screen.getByText('Produk 1')).not.toBeNull();
    expect(screen.getByText('Produk 2')).not.toBeNull();
    expect(screen.queryByText('SKU-PRODUK-1')).toBeNull();
    expect(screen.queryByText('SKU-PRODUK-2')).toBeNull();
    expect(screen.queryByText('Login Terlebih Dahulu')).toBeNull();
  });

  it('selects loaded cart rows by default and toggles individual rows', () => {
    render(<Cart />);

    expect(screen.getByTestId('cart-selected-count').children.join('')).toBe('2 produk dipilih');
    expect(screen.getByTestId('cart-item-checkbox-cart-item-1').props.accessibilityState).toEqual({
      checked: true,
    });

    fireEvent.press(screen.getByTestId('cart-item-checkbox-cart-item-1'));

    expect(screen.getByTestId('cart-selected-count').children.join('')).toBe('1 produk dipilih');
    expect(screen.getByTestId('cart-item-checkbox-cart-item-1').props.accessibilityState).toEqual({
      checked: false,
    });

    fireEvent.press(screen.getByTestId('cart-item-checkbox-cart-item-1'));

    expect(screen.getByTestId('cart-selected-count').children.join('')).toBe('2 produk dipilih');
    expect(screen.getByTestId('cart-item-checkbox-cart-item-1').props.accessibilityState).toEqual({
      checked: true,
    });
  });

  it('supports select-all and deselect-all copy', () => {
    render(<Cart />);

    expect(screen.getByText('Batalkan semua')).not.toBeNull();

    fireEvent.press(screen.getByTestId('cart-item-checkbox-cart-item-1'));

    expect(screen.getByText('Pilih semua')).not.toBeNull();

    fireEvent.press(screen.getByTestId('cart-select-all-toggle'));
    expect(screen.getByTestId('cart-selected-count').children.join('')).toBe('2 produk dipilih');
    expect(screen.getByText('Batalkan semua')).not.toBeNull();

    fireEvent.press(screen.getByTestId('cart-select-all-toggle'));
    expect(screen.getByTestId('cart-selected-count').children.join('')).toBe('0 produk dipilih');
    expect(screen.getByText('Pilih minimal satu produk untuk checkout')).not.toBeNull();
  });

  it('does not auto-select newly refetched rows after manual selection unless select-all mode is active', () => {
    const { rerender } = render(<Cart />);

    fireEvent.press(screen.getByTestId('cart-item-checkbox-cart-item-1'));
    setCartItems([createItem(1), createItem(2), createItem(3)]);
    rerender(<Cart />);

    expect(screen.getByTestId('cart-selected-count').children.join('')).toBe('1 produk dipilih');
    expect(screen.getByTestId('cart-item-checkbox-cart-item-3').props.accessibilityState).toEqual({
      checked: false,
    });

    fireEvent.press(screen.getByTestId('cart-select-all-toggle'));
    setCartItems([createItem(1), createItem(2), createItem(3), createItem(4)]);
    rerender(<Cart />);

    expect(screen.getByTestId('cart-selected-count').children.join('')).toBe('4 produk dipilih');
    expect(screen.getByTestId('cart-item-checkbox-cart-item-4').props.accessibilityState).toEqual({
      checked: true,
    });
  });

  it('disables checkout and shows an empty-selection message when no rows are selected', () => {
    setReadyForCheckout();
    render(<Cart />);

    expect(screen.getByTestId('sticky-disabled').children.join('')).toBe('false');

    fireEvent.press(screen.getByTestId('cart-select-all-toggle'));

    expect(screen.getByText('Pilih minimal satu produk untuk checkout')).not.toBeNull();
    expect(screen.getByTestId('sticky-disabled').children.join('')).toBe('true');
  });

  it('shows an alert dialog instead of inline shipping error when calculating shipping with no selected rows', () => {
    setReadyForCheckout();
    mockCartShippingHookState.shippingError = new Error(
      'Keranjang kosong. Tambahkan produk sebelum menghitung ongkir.',
    );

    render(<Cart />);

    fireEvent.press(screen.getByTestId('cart-select-all-toggle'));
    fireEvent.press(screen.getByLabelText('Pilih opsi pengiriman'));

    expect(screen.getByText('Keranjang kosong')).not.toBeNull();
    expect(
      screen.getByText('Tambahkan atau pilih produk sebelum menghitung ongkir.'),
    ).not.toBeNull();
    expect(
      screen.queryByText('Keranjang kosong. Tambahkan produk sebelum menghitung ongkir.'),
    ).toBeNull();
    expect(mockCartShippingHookState.setShippingError).toHaveBeenCalledWith(null);

    fireEvent.press(screen.getByLabelText('Mengerti'));

    expect(screen.queryByText('Keranjang kosong')).toBeNull();
  });

  it('keeps normal shipping flow when at least one row is selected', () => {
    setReadyForCheckout();
    render(<Cart />);

    fireEvent.press(screen.getByLabelText('Pilih opsi pengiriman'));

    expect(screen.queryByText('Keranjang kosong')).toBeNull();
    expect(mockCartShippingHookState.handleOpenShippingSheet).toHaveBeenCalledTimes(1);
  });

  it('passes selected cart row IDs and selected snapshot to the review route', () => {
    setReadyForCheckout();
    render(<Cart />);

    fireEvent.press(screen.getByTestId('cart-item-checkbox-cart-item-1'));
    fireEvent.press(screen.getByLabelText('sticky-confirm'));

    const pushedRoute = mockPush.mock.calls[0]?.[0];
    expect(pushedRoute).toMatchObject({ pathname: '/cart/review' });

    if (typeof pushedRoute !== 'object' || pushedRoute === null || !('params' in pushedRoute)) {
      throw new Error('Expected review route params');
    }

    const params = (pushedRoute as { params: Record<string, string | undefined> }).params;

    expect(JSON.parse(params.selectedCartItemIdsPayload ?? '[]')).toEqual(['cart-item-2']);
    expect(JSON.parse(params.itemSummariesPayload ?? '[]')).toEqual([
      { name: 'Produk 2', quantity: 1 },
    ]);
    expect(JSON.parse(params.snapshotPayload ?? '{}')).toEqual({
      itemCount: 1,
      estimatedWeightGrams: 100,
      packageValue: 10002,
    });
    expect(screen.getByTestId('sticky-grand-total').children.join('')).toBe('22002');
  });

  it('passes selected cart row IDs and selected snapshot into shipping and checkout hooks', async () => {
    setReadyForCheckout();
    render(<Cart />);

    fireEvent.press(screen.getByTestId('cart-item-checkbox-cart-item-1'));

    await waitFor(() => {
      expect(mockUseCartShippingParams).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedCartItemIds: ['cart-item-2'],
          snapshot: {
            itemCount: 1,
            estimatedWeightGrams: 100,
            packageValue: 10002,
          },
        }),
      );
      expect(mockUseCartCheckoutParams).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedCartItemIds: ['cart-item-2'],
          snapshot: {
            itemCount: 1,
            estimatedWeightGrams: 100,
            packageValue: 10002,
          },
        }),
      );
    });
  });

  it('keeps selection during quantity changes and prunes removed rows from selection', async () => {
    const { rerender } = render(<Cart />);

    fireEvent.press(screen.getByLabelText('increase cart-item-1'));

    expect(mockCartQuantityHookState.updateQuantity).toHaveBeenCalledWith('cart-item-1', 2);
    expect(screen.getByTestId('cart-selected-count').children.join('')).toBe('2 produk dipilih');

    fireEvent.press(screen.getByTestId('cart-item-checkbox-cart-item-2'));
    fireEvent.press(screen.getByLabelText('remove cart-item-1'));

    await waitFor(() => {
      expect(mockRemoveCartItem).toHaveBeenCalledWith('cart-item-1');
    });

    setCartItems([createItem(2)]);
    rerender(<Cart />);

    expect(screen.getByTestId('cart-selected-count').children.join('')).toBe('0 produk dipilih');
    expect(screen.getByText('Pilih minimal satu produk untuk checkout')).not.toBeNull();
  });

  it('shows error banner on fetch error', () => {
    mockCartHookState.error = 'Gagal sinkronisasi keranjang';

    render(<Cart />);

    expect(screen.getByText('Gagal memuat keranjang.')).not.toBeNull();
    expect(screen.getByText('Gagal sinkronisasi keranjang')).not.toBeNull();
  });

  it('does not show the empty-cart state when fetch fails with no cart items', () => {
    mockCartHookState.items = [];
    mockCartHookState.snapshot = { itemCount: 0, estimatedWeightGrams: 0, packageValue: 0 };
    mockCartHookState.error = 'Gagal sinkronisasi keranjang';
    mockCartQuantityHookState.items = [];
    mockCartQuantityHookState.snapshot = mockCartHookState.snapshot;

    render(<Cart />);

    expect(screen.getByText('Gagal memuat keranjang.')).not.toBeNull();
    expect(screen.getByText('Gagal sinkronisasi keranjang')).not.toBeNull();
    expect(screen.queryByText('Empty Cart State')).toBeNull();
  });

  it('does not show the empty-cart state while offline with no cached cart data', () => {
    mockCartHookState.items = [];
    mockCartHookState.snapshot = { itemCount: 0, estimatedWeightGrams: 0, packageValue: 0 };
    mockCartQuantityHookState.items = [];
    mockCartQuantityHookState.snapshot = mockCartHookState.snapshot;
    mockNetworkState = {
      status: 'offline',
      isOnline: false,
      isOffline: true,
      type: 'unknown',
      isExpensive: false,
    };

    render(<Cart />);

    expect(screen.getByText('Koneksi internet terputus')).not.toBeNull();
    expect(
      screen.getByText('Koneksi internet terputus. Data keranjang tidak tersedia.'),
    ).not.toBeNull();
    expect(screen.queryByText('Empty Cart State')).toBeNull();
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

  it('routes edit address from the cart sheet back to cart after save', () => {
    mockCartAddressHookState.addressSheetOpen = true;
    mockCartAddressHookState.availableAddresses = [createAddress()];
    mockCartAddressHookState.selectedAddressId = 'address-1';

    render(<Cart />);

    fireEvent.press(screen.getByLabelText('edit-address-1'));

    expect(mockCartAddressHookState.setAddressSheetOpen).toHaveBeenCalledWith(false);
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/profile/address-form',
      params: { id: 'address-1', returnTo: '/cart' },
    });
  });

  it('shows the skeleton during the initial cart load', () => {
    mockCartHookState.items = [];
    mockCartHookState.snapshot = { itemCount: 0, estimatedWeightGrams: 0, packageValue: 0 };
    mockCartHookState.isLoading = true;
    mockCartQuantityHookState.items = [];
    mockCartQuantityHookState.snapshot = mockCartHookState.snapshot;

    render(<Cart />);

    expect(screen.getByText('Cart Loading Skeleton')).not.toBeNull();
    expect(screen.queryByText('Empty Cart State')).toBeNull();
  });

  it('does not show realtime synchronization text while the cart reconnects', () => {
    mockCartHookState.realtimeState = 'reconnecting';

    render(<Cart />);

    expect(screen.queryByText('Sinkronisasi keranjang menyambung kembali...')).toBeNull();
    expect(screen.queryByText('Menyambungkan sinkronisasi keranjang...')).toBeNull();
  });

  it('does not show the skeleton while refreshing an existing cart', () => {
    mockCartHookState.items = [createItem(1)];
    mockCartHookState.snapshot = { itemCount: 1, estimatedWeightGrams: 100, packageValue: 10001 };
    mockCartHookState.isLoading = true;
    mockCartQuantityHookState.items = mockCartHookState.items;
    mockCartQuantityHookState.snapshot = mockCartHookState.snapshot;

    render(<Cart />);

    expect(screen.queryByText('Cart Loading Skeleton')).toBeNull();
    expect(screen.getByText('Produk 1')).not.toBeNull();
  });

  it('silently refreshes the cart after successfully removing an item', async () => {
    mockCartHookState.items = [createItem(1)];
    mockCartHookState.snapshot = { itemCount: 1, estimatedWeightGrams: 100, packageValue: 10001 };
    mockCartQuantityHookState.items = mockCartHookState.items;
    mockCartQuantityHookState.snapshot = mockCartHookState.snapshot;

    render(<Cart />);

    fireEvent.press(screen.getByLabelText('remove cart-item-1'));

    await waitFor(() => {
      expect(mockRemoveCartItem).toHaveBeenCalledWith('cart-item-1');
    });

    await waitFor(() => {
      expect(mockCartHookState.refresh).toHaveBeenCalledWith({ silent: true });
    });
  });
});
