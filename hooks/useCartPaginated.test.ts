import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react-native';
import { getCartWithItems } from '@/services/cart.service';
import type { CartItemWithProduct, CartWithItems, CartSnapshot } from '@/types/cart';
import { useCartPaginated } from './useCartPaginated';

jest.mock('@/services/cart.service', () => ({
  getCartWithItems: jest.fn(),
}));

const mockGetCartWithItems = getCartWithItems as jest.MockedFunction<typeof getCartWithItems>;

function createItem(index: number): CartItemWithProduct {
  return {
    id: `cart-item-${index}`,
    cart_id: 'cart-1',
    product_id: `product-${index}`,
    quantity: index + 1,
    created_at: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
    product: {
      id: `product-${index}`,
      name: `Produk ${index}`,
      price: 10000 + index,
      stock: 10,
      weight: 200,
      slug: `produk-${index}`,
      is_active: true,
    },
    images: [
      {
        id: `image-${index}`,
        url: `https://cdn.example.com/${index}.jpg`,
        sort_order: 0,
      },
    ],
  };
}

function createSnapshot(itemCount: number): CartSnapshot {
  return {
    itemCount,
    estimatedWeightGrams: itemCount * 200,
    packageValue: itemCount * 10000,
  };
}

function createCart(items: CartItemWithProduct[]): CartWithItems {
  return {
    cartId: 'cart-1',
    items,
    snapshot: createSnapshot(items.reduce((total, item) => total + item.quantity, 0)),
  };
}

describe('useCartPaginated', () => {
  afterEach(() => {
    mockGetCartWithItems.mockReset();
    cleanup();
  });

  it('returns the empty state when userId is missing', () => {
    const { result } = renderHook(() => useCartPaginated({}));

    expect(result.current.items).toEqual([]);
    expect(result.current.snapshot).toEqual({
      itemCount: 0,
      estimatedWeightGrams: 0,
      packageValue: 0,
    });
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isRefreshing).toBe(false);
  });

  it('loads cart items on mount when userId is provided', async () => {
    const userId = 'user-1';
    const items = [createItem(0)];

    mockGetCartWithItems.mockResolvedValue({
      data: createCart(items),
      error: null,
    });

    const { result } = renderHook(() => useCartPaginated({ userId }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.items).toEqual(items);
      expect(result.current.snapshot.itemCount).toBe(1);
    });

    expect(mockGetCartWithItems).toHaveBeenCalledWith(userId);
  });

  it('refreshes the cart data when refresh is called', async () => {
    const userId = 'user-1';
    const firstItems = [createItem(0)];
    const nextItems = [createItem(0), createItem(1)];

    mockGetCartWithItems
      .mockResolvedValueOnce({
        data: createCart(firstItems),
        error: null,
      })
      .mockResolvedValueOnce({
        data: createCart(nextItems),
        error: null,
      });

    const { result } = renderHook(() => useCartPaginated({ userId }));

    await waitFor(() => {
      expect(result.current.items).toEqual(firstItems);
    });

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.items).toEqual(nextItems);
      expect(result.current.snapshot.itemCount).toBe(3);
      expect(result.current.isRefreshing).toBe(false);
    });
  });

  it('stores the fetch error message when the service fails', async () => {
    const userId = 'user-1';

    mockGetCartWithItems.mockResolvedValue({
      data: null,
      error: new Error('Gagal memuat keranjang.'),
    });

    const { result } = renderHook(() => useCartPaginated({ userId }));

    await waitFor(() => {
      expect(result.current.error).toBe('Gagal memuat keranjang.');
      expect(result.current.isLoading).toBe(false);
    });
  });
});
