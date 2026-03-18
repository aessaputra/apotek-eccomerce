/**
 * Cart type definitions for shopping cart feature.
 */

/**
 * Product image with minimal fields for cart display
 */
export interface CartProductImage {
  id: string;
  url: string;
  sort_order: number;
}

/**
 * Product details embedded in cart item
 */
export interface CartProductDetails {
  id: string;
  name: string;
  price: number;
  stock: number;
  weight: number;
  slug: string;
  is_active: boolean;
}

/**
 * Cart item with full product details and images
 */
export interface CartItemWithProduct {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  product: CartProductDetails;
  images: CartProductImage[];
}

/**
 * Cart snapshot for calculations
 */
export interface CartSnapshot {
  itemCount: number;
  estimatedWeightGrams: number;
  packageValue: number;
}

/**
 * Cart with items and totals
 */
export interface CartWithItems {
  cartId: string;
  items: CartItemWithProduct[];
  snapshot: CartSnapshot;
}
