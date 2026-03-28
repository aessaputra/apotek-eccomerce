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
 * Minimal cart item fields needed for paginated list display.
 * Subsets CartProductDetails to reduce payload size while preserving UI-critical fields.
 */
export interface CartListItem {
  id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  product: Pick<
    CartProductDetails,
    'id' | 'name' | 'price' | 'stock' | 'weight' | 'slug' | 'is_active'
  >;
  images: Pick<CartProductImage, 'id' | 'url'>[];
}

/**
 * Performance and pagination metrics for cart list fetching.
 */
export interface CartListMetrics {
  durationMs: number;
  payloadBytes: number;
  fetchedAt: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Service return type for paginated cart list fetch.
 */
export interface CartListResult {
  data: {
    items: CartListItem[];
    snapshot: CartSnapshot;
  } | null;
  error: Error | null;
  metrics: CartListMetrics | null;
}

/**
 * Parameters for fetching paginated cart items.
 */
export interface GetCartItemsParams {
  offset?: number;
  limit?: number;
  signal?: AbortSignal;
}

/**
 * Cart with items and totals
 */
export interface CartWithItems {
  cartId: string;
  items: CartItemWithProduct[];
  snapshot: CartSnapshot;
}
