import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { updateCartItemQuantity } from '@/services/cart.service';
import type { CartItemWithProduct, CartSnapshot } from '@/types/cart';
import { useCartQuantity } from '@/hooks/useCartQuantity';

jest.mock('@/services/cart.service', () => ({
  updateCartItemQuantity: jest.fn(),
}));

const mockUpdateCartItemQuantity = updateCartItemQuantity as jest.MockedFunction<
  typeof updateCartItemQuantity
>;

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

function createItem(quantity: number): CartItemWithProduct {
  return {
    id: 'cart-item-1',
    cart_id: 'cart-1',
    product_id: 'product-1',
    quantity,
    created_at: new Date(Date.UTC(2026, 0, 1)).toISOString(),
    product: {
      id: 'product-1',
      name: 'Produk 1',
      price: 10000,
      stock: 10,
      weight: 200,
      slug: 'produk-1',
      is_active: true,
    },
    images: [{ id: 'image-1', url: 'https://cdn.example.com/1.jpg', sort_order: 0 }],
  };
}

function createSnapshot(quantity: number): CartSnapshot {
  return {
    itemCount: quantity,
    estimatedWeightGrams: quantity * 200,
    packageValue: quantity * 10000,
  };
}

describe('useCartQuantity', () => {
  afterEach(() => {
    mockUpdateCartItemQuantity.mockReset();
  });

  it('applies quantity updates optimistically without waiting for the service', async () => {
    const deferred = createDeferred<{ data: null; error: null }>();
    mockUpdateCartItemQuantity.mockReturnValue(
      deferred.promise as ReturnType<typeof updateCartItemQuantity>,
    );

    const { result, rerender } = renderHook<
      ReturnType<typeof useCartQuantity>,
      { quantity: number }
    >(
      ({ quantity }) =>
        useCartQuantity({
          items: [createItem(quantity)],
          snapshot: createSnapshot(quantity),
        }),
      {
        initialProps: { quantity: 1 },
      },
    );

    await act(async () => {
      result.current.updateQuantity('cart-item-1', 3);
    });

    expect(result.current.items[0]?.quantity).toBe(3);
    expect(result.current.snapshot.itemCount).toBe(3);

    rerender({ quantity: 1 });
    expect(result.current.items[0]?.quantity).toBe(3);

    deferred.resolve({ data: null, error: null });

    rerender({ quantity: 3 });

    await waitFor(() => {
      expect(result.current.items[0]?.quantity).toBe(3);
      expect(result.current.snapshot.itemCount).toBe(3);
    });
  });

  it('clears the optimistic overlay and reports explicit failures', async () => {
    const deferred = createDeferred<Awaited<ReturnType<typeof updateCartItemQuantity>>>();
    mockUpdateCartItemQuantity.mockReturnValue(deferred.promise);

    const onError = jest.fn();

    const { result } = renderHook(() =>
      useCartQuantity({
        items: [createItem(1)],
        snapshot: createSnapshot(1),
        onError,
      }),
    );

    await act(async () => {
      result.current.updateQuantity('cart-item-1', 2);
    });

    expect(result.current.items[0]?.quantity).toBe(2);

    deferred.resolve({
      data: null,
      error: new Error('Gagal memperbarui keranjang.'),
    });

    await waitFor(() => {
      expect(result.current.items[0]?.quantity).toBe(1);
      expect(onError).toHaveBeenCalledWith('Gagal memperbarui keranjang.');
    });
  });
});
