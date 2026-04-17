import { describe, expect, test } from '@jest/globals';
import { buildCartSnapshot, EMPTY_CART_SNAPSHOT } from '@/utils/cart';

describe('cart utils', () => {
  test('buildCartSnapshot returns empty snapshot for empty items', () => {
    expect(buildCartSnapshot([], 200)).toEqual(EMPTY_CART_SNAPSHOT);
  });

  test('buildCartSnapshot aggregates item count, weight, and package value', () => {
    const result = buildCartSnapshot(
      [
        { quantity: 2, product: { price: 10000, weight: 200 } },
        { quantity: 1, product: { price: 5000, weight: 300 } },
        { quantity: 4, product: { price: 2500, weight: 150 } },
      ],
      200,
    );

    expect(result).toEqual({
      itemCount: 7,
      estimatedWeightGrams: 1300,
      packageValue: 35000,
    });
  });

  test('buildCartSnapshot ignores rows without products and falls back on default weight', () => {
    const result = buildCartSnapshot(
      [
        { quantity: 1, product: null },
        { quantity: 3, product: { price: 12000, weight: null } },
      ],
      200,
    );

    expect(result).toEqual({
      itemCount: 3,
      estimatedWeightGrams: 600,
      packageValue: 36000,
    });
  });
});
