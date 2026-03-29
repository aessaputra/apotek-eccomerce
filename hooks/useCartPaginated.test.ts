import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react-native';
import { getCartWithItems, subscribeToCartChanges } from '@/services/cart.service';
import type { CartItemWithProduct, CartRealtimeChange, CartWithItems } from '@/types/cart';
import { useCartPaginated } from './useCartPaginated';

const mockSubscribeToCartChanges = subscribeToCartChanges as jest.MockedFunction<
  typeof subscribeToCartChanges
>;
const mockGetCartWithItems = getCartWithItems as jest.MockedFunction<typeof getCartWithItems>;

let mockLatestRealtimeHandler: ((event: CartRealtimeChange) => void) | null = null;
let mockLatestConnectionHandler:
  | ((state: 'connecting' | 'connected' | 'reconnecting' | 'disconnected') => void)
  | null = null;
const mockUnsubscribe = jest.fn();

jest.mock('@/services/cart.service', () => ({
  getCartWithItems: jest.fn(),
  subscribeToCartChanges: jest.fn(
    (
      _: string,
      onChange: (event: CartRealtimeChange) => void,
      onConnectionStateChange?: (
        state: 'connecting' | 'connected' | 'reconnecting' | 'disconnected',
      ) => void,
    ) => {
      mockLatestRealtimeHandler = onChange;
      mockLatestConnectionHandler = onConnectionStateChange ?? null;
      return mockUnsubscribe;
    },
  ),
}));

function createItem(index: number, quantity: number = index + 1): CartItemWithProduct {
  return {
    id: `cart-item-${index}`,
    cart_id: 'cart-1',
    product_id: `product-${index}`,
    quantity,
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

function createCart(items: CartItemWithProduct[]): CartWithItems {
  return {
    cartId: 'cart-1',
    items,
    snapshot: {
      itemCount: items.reduce((total, item) => total + item.quantity, 0),
      estimatedWeightGrams: items.reduce(
        (total, item) => total + item.quantity * item.product.weight,
        0,
      ),
      packageValue: items.reduce((total, item) => total + item.quantity * item.product.price, 0),
    },
  };
}

describe('useCartPaginated', () => {
  afterEach(() => {
    mockLatestRealtimeHandler = null;
    mockLatestConnectionHandler = null;
    mockUnsubscribe.mockReset();
    mockGetCartWithItems.mockReset();
    mockSubscribeToCartChanges.mockClear();
    cleanup();
  });

  it('returns the empty state when userId is missing', () => {
    const { result } = renderHook(() => useCartPaginated({}));

    expect(result.current.cartId).toBeNull();
    expect(result.current.items).toEqual([]);
    expect(result.current.snapshot).toEqual({
      itemCount: 0,
      estimatedWeightGrams: 0,
      packageValue: 0,
    });
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.realtimeState).toBe('disconnected');
  });

  it('loads cart items and subscribes when userId is provided', async () => {
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
    });

    expect(result.current.cartId).toBe('cart-1');
    expect(mockGetCartWithItems).toHaveBeenCalledWith(userId);
    expect(mockSubscribeToCartChanges).toHaveBeenCalledWith(
      'cart-1',
      expect.any(Function),
      expect.any(Function),
    );
  });

  it('merges realtime quantity updates into the local cart state', async () => {
    const userId = 'user-1';
    const items = [createItem(0, 1)];

    mockGetCartWithItems.mockResolvedValue({
      data: createCart(items),
      error: null,
    });

    const { result } = renderHook(() => useCartPaginated({ userId }));

    await waitFor(() => {
      expect(result.current.items[0]?.quantity).toBe(1);
    });

    await act(async () => {
      mockLatestRealtimeHandler?.({
        type: 'UPDATE',
        new: {
          id: 'cart-item-0',
          cart_id: 'cart-1',
          product_id: 'product-0',
          quantity: 4,
        },
        old: {
          id: 'cart-item-0',
          cart_id: 'cart-1',
          product_id: 'product-0',
          quantity: 1,
        },
      });
    });

    expect(result.current.items[0]?.quantity).toBe(4);
    expect(result.current.snapshot.itemCount).toBe(4);
  });

  it('updates realtime connection state and cleans up subscriptions', async () => {
    mockGetCartWithItems.mockResolvedValue({
      data: createCart([createItem(0)]),
      error: null,
    });

    const { result, unmount } = renderHook(() => useCartPaginated({ userId: 'user-1' }));

    await waitFor(() => {
      expect(result.current.cartId).toBe('cart-1');
    });

    await act(async () => {
      mockLatestConnectionHandler?.('connected');
    });

    expect(result.current.realtimeState).toBe('connected');

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
