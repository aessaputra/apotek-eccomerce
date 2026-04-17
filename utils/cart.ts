import type { CartSnapshot } from '@/types/cart';

export const EMPTY_CART_SNAPSHOT: CartSnapshot = {
  itemCount: 0,
  estimatedWeightGrams: 0,
  packageValue: 0,
};

export interface CartSnapshotSourceItem {
  quantity: number;
  product: {
    price: number;
    weight: number | null;
  } | null;
}

export function buildCartSnapshot<T extends CartSnapshotSourceItem>(
  items: T[],
  defaultWeightGrams: number,
): CartSnapshot {
  return items.reduce<CartSnapshot>(
    (snapshot, item) => {
      if (!item.product) {
        return snapshot;
      }

      snapshot.itemCount += item.quantity;
      snapshot.estimatedWeightGrams += item.quantity * (item.product.weight || defaultWeightGrams);
      snapshot.packageValue += item.quantity * item.product.price;

      return snapshot;
    },
    { ...EMPTY_CART_SNAPSHOT },
  );
}
