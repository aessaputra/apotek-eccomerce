import { test, expect, jest } from '@jest/globals';
import { render, renderWithDarkTheme, screen, fireEvent } from '@/test-utils/renderWithTheme';
import CartItemRowComponent from '@/components/elements/CartItemRow/CartItemRow';
import type { CartItemWithProduct } from '@/types/cart';

jest.mock('@/components/elements/Image/Image', () => ({
  __esModule: true,
  default: ({ source }: { source: { uri: string } }) => <>{source.uri}</>,
}));

jest.mock('@/components/elements/QuantitySelector/QuantitySelector', () => {
  const { Pressable, Text, View } = jest.requireActual(
    'react-native',
  ) as typeof import('react-native');

  return {
    __esModule: true,
    default: ({
      value,
      onChange,
      disabled,
    }: {
      value: number;
      onChange: (nextValue: number) => void;
      disabled?: boolean;
    }) => (
      <View>
        <Pressable
          accessibilityLabel="Kurangi jumlah"
          disabled={disabled}
          onPress={() => onChange(value - 1)}>
          <Text>-</Text>
        </Pressable>
        <Text>{value}</Text>
        <Pressable
          accessibilityLabel="Tambah jumlah"
          disabled={disabled}
          onPress={() => onChange(value + 1)}>
          <Text>+</Text>
        </Pressable>
      </View>
    ),
  };
});

jest.mock('@/components/elements/AppAlertDialog/AppAlertDialog', () => ({
  __esModule: true,
  default: ({
    open,
    title,
    description,
    confirmText,
    onConfirm,
  }: {
    open: boolean;
    title: string;
    description: string;
    confirmText: string;
    onConfirm: () => void;
  }) => {
    const { Pressable, Text } = jest.requireActual('react-native') as typeof import('react-native');

    return open ? (
      <>
        <Text>{title}</Text>
        <Text>{description}</Text>
        <Pressable accessibilityLabel={confirmText} onPress={onConfirm}>
          <Text>{confirmText}</Text>
        </Pressable>
      </>
    ) : null;
  },
}));

jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => ({
  __esModule: true,
  default: ({
    children,
    renderRightActions,
  }: {
    children: React.ReactNode;
    renderRightActions: (progress: { value: number }) => React.ReactNode;
  }) => (
    <>
      {children}
      {renderRightActions({ value: 1 })}
    </>
  ),
}));

jest.mock('react-native-gesture-handler', () => {
  const { Pressable } = jest.requireActual('react-native') as typeof import('react-native');

  return {
    __esModule: true,
    RectButton: ({ onPress, children }: { onPress?: () => void; children: React.ReactNode }) => (
      <Pressable accessibilityLabel="Hapus swipe" onPress={onPress}>
        {children}
      </Pressable>
    ),
  };
});

const item: CartItemWithProduct = {
  id: 'cart-item-1',
  cart_id: 'cart-1',
  product_id: 'product-1',
  quantity: 2,
  created_at: '2025-01-01T00:00:00Z',
  product: {
    id: 'product-1',
    name: 'Vitamin C 500mg',
    price: 50000,
    stock: 10,
    weight: 100,
    slug: 'vitamin-c-500mg',
    is_active: true,
  },
  images: [{ id: 'img-1', url: 'https://example.com/product.jpg', sort_order: 0 }],
};

describe('<CartItemRow />', () => {
  test('renders item details in light and dark themes', async () => {
    render(<CartItemRowComponent item={item} onQuantityChange={jest.fn()} onRemove={jest.fn()} />);

    expect(screen.getByText('Vitamin C 500mg')).not.toBeNull();
    expect(
      screen.getByText(
        new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(50000),
      ),
    ).not.toBeNull();

    renderWithDarkTheme(
      <CartItemRowComponent item={item} onQuantityChange={jest.fn()} onRemove={jest.fn()} />,
    );
    expect(screen.getAllByText('Vitamin C 500mg').length).toBeGreaterThan(0);
  });

  test('changes quantity when selector increments', async () => {
    const onQuantityChange = jest.fn();
    render(
      <CartItemRowComponent item={item} onQuantityChange={onQuantityChange} onRemove={jest.fn()} />,
    );

    fireEvent.press(screen.getByLabelText('Tambah jumlah'));

    expect(onQuantityChange).toHaveBeenCalledWith('cart-item-1', 3);
  });

  test('opens delete dialog when quantity would go below one and confirms removal', async () => {
    const onRemove = jest.fn();
    render(
      <CartItemRowComponent
        item={{ ...item, quantity: 1 }}
        onQuantityChange={jest.fn()}
        onRemove={onRemove}
      />,
    );

    fireEvent.press(screen.getByLabelText('Kurangi jumlah'));

    expect(screen.getByText('Hapus Produk')).not.toBeNull();
    fireEvent.press(screen.getByText('Hapus'));

    expect(onRemove).toHaveBeenCalledWith('cart-item-1');
  });
});
