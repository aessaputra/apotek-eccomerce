import { test, expect, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@/test-utils/renderWithTheme';
import SearchProductGrid from '@/components/elements/SearchProductGrid';
import type { ProductWithImages } from '@/services/home.service';

jest.mock('@/components/elements/ProductCard/ProductCard', () => {
  const { Pressable, Text, View } = jest.requireActual(
    'react-native',
  ) as typeof import('react-native');

  return {
    __esModule: true,
    default: ({
      item,
      onPress,
      onAddToCart,
    }: {
      item: ProductWithImages;
      onPress?: () => void;
      onAddToCart?: () => void;
    }) => (
      <View>
        <Pressable accessibilityLabel={`Buka ${item.id}`} onPress={onPress}>
          <Text>{item.name}</Text>
        </Pressable>
        <Pressable accessibilityLabel={`Tambah ${item.id}`} onPress={onAddToCart}>
          <Text>Tambah {item.id}</Text>
        </Pressable>
      </View>
    ),
  };
});

const products: ProductWithImages[] = [
  {
    id: 'product-1',
    name: 'Vitamin C',
    slug: 'vitamin-c',
    price: 25000,
    weight: 100,
    stock: 10,
    is_active: true,
    category_id: 'cat-1',
    description: 'Vitamin harian',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    images: [],
  },
  {
    id: 'product-2',
    name: 'Obat Flu',
    slug: 'obat-flu',
    price: 32000,
    weight: 100,
    stock: 5,
    is_active: true,
    category_id: 'cat-2',
    description: 'Meredakan gejala flu',
    created_at: '2025-01-02T00:00:00Z',
    updated_at: '2025-01-02T00:00:00Z',
    images: [],
  },
];

describe('<SearchProductGrid />', () => {
  test('renders nothing for empty results', async () => {
    render(
      <SearchProductGrid
        products={[]}
        iconColor="$primary"
        onProductPress={jest.fn()}
        onAddToCart={jest.fn()}
      />,
    );

    expect(screen.queryByText('Vitamin C')).toBeNull();
  });

  test('renders products and forwards press handlers', async () => {
    const onProductPress = jest.fn();
    const onAddToCart = jest.fn();

    render(
      <SearchProductGrid
        products={products}
        iconColor="$primary"
        onProductPress={onProductPress}
        onAddToCart={onAddToCart}
      />,
    );

    expect(screen.getByText('Vitamin C')).not.toBeNull();
    expect(screen.getByText('Obat Flu')).not.toBeNull();

    fireEvent.press(screen.getByLabelText('Buka product-1'));
    fireEvent.press(screen.getByLabelText('Tambah product-2'));

    expect(onProductPress).toHaveBeenCalledWith('product-1', 'Vitamin C');
    expect(onAddToCart).toHaveBeenCalledWith('product-2');
  });
});
