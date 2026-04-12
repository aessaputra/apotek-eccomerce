import { supabase } from '@/utils/supabase';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { Tables } from '@/types/supabase';
import { CART_PAGE_SIZE } from '@/constants/cart.constants';
import { runDedupedRequest } from '@/utils/requestDeduplication';
import type {
  CartRealtimeChange,
  CartRealtimeConnectionState,
  CartRealtimeItem,
  CartItemWithProduct,
  CartListItem,
  CartListResult,
  CartSnapshot,
  CartWithItems,
  GetCartItemsParams,
} from '@/types/cart';

type CartRow = Tables<'carts'>;
type CartItemRow = Tables<'cart_items'>;
type ProductRow = Tables<'products'>;
type ProductImageRow = Tables<'product_images'>;

const DEFAULT_ITEM_WEIGHT_GRAMS = 200;
const GET_OR_CREATE_CART_REQUEST_PREFIX = 'cart:get-or-create:';
const UPDATE_CART_ITEM_REQUEST_PREFIX = 'cart:update-item:';

const CART_ITEMS_SELECT = `
  id,
  cart_id,
  product_id,
  quantity,
  created_at,
  product:products (
    id,
    name,
    price,
    stock,
    weight,
    slug,
    is_active,
    product_images (
      id,
      url,
      sort_order
    )
  )
`;

const CART_TOTALS_SELECT = `
  id,
  quantity,
  product:products (
    id,
    price,
    weight,
    is_active
  )
`;

type CartItemOptimizedRow = Pick<
  CartItemRow,
  'id' | 'cart_id' | 'product_id' | 'quantity' | 'created_at'
> & {
  product:
    | (Pick<ProductRow, 'id' | 'name' | 'price' | 'stock' | 'weight' | 'slug' | 'is_active'> & {
        product_images: Pick<ProductImageRow, 'id' | 'url' | 'sort_order'>[] | null;
      })
    | null;
};

type CartSnapshotRow = Pick<CartItemRow, 'quantity'> & {
  product: Pick<ProductRow, 'price' | 'weight' | 'is_active'> | null;
};

type CartRealtimeRecord = Partial<Pick<CartItemRow, 'id' | 'cart_id' | 'product_id' | 'quantity'>>;

function toCartSnapshot(rows: CartSnapshotRow[]): CartSnapshot {
  return rows.reduce(
    (snapshot, row) => {
      if (!row.product) {
        return snapshot;
      }

      const quantity = row.quantity;
      const weight = row.product.weight || DEFAULT_ITEM_WEIGHT_GRAMS;

      snapshot.itemCount += quantity;
      snapshot.estimatedWeightGrams += quantity * weight;
      snapshot.packageValue += quantity * row.product.price;

      return snapshot;
    },
    {
      itemCount: 0,
      estimatedWeightGrams: 0,
      packageValue: 0,
    } as CartSnapshot,
  );
}

function isAbortError(error: unknown): error is Error {
  if (error instanceof Error) {
    return error.name === 'AbortError';
  }

  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: unknown }).name === 'AbortError'
  );
}

function withAbortSignal<T>(query: T, signal?: AbortSignal): T {
  if (!signal) {
    return query;
  }

  if (
    typeof query === 'object' &&
    query !== null &&
    'abortSignal' in query &&
    typeof (query as { abortSignal?: unknown }).abortSignal === 'function'
  ) {
    return (query as { abortSignal: (value: AbortSignal) => T }).abortSignal(signal);
  }

  return query;
}

function getUpdateCartItemRequestKey(cartItemId: string): string {
  return `${UPDATE_CART_ITEM_REQUEST_PREFIX}${cartItemId}`;
}

function toCartRealtimeItem(
  record: CartRealtimeRecord | null | undefined,
): CartRealtimeItem | null {
  if (!record) {
    return null;
  }

  const { id, cart_id, product_id, quantity } = record;

  if (typeof id !== 'string') {
    return null;
  }

  return {
    id,
    cart_id: typeof cart_id === 'string' ? cart_id : '',
    product_id: typeof product_id === 'string' ? product_id : '',
    quantity: typeof quantity === 'number' ? quantity : 0,
  };
}

async function getOrCreateCartInternal(
  userId: string,
): Promise<{ data: CartRow | null; error: Error | null }> {
  const { data: existingCarts, error: fetchError } = await supabase
    .from('carts')
    .select('*')
    .eq('user_id', userId)
    .limit(1);

  if (fetchError) {
    return { data: null, error: fetchError as unknown as Error };
  }

  const existingCart = existingCarts?.[0];
  if (existingCart) {
    return { data: existingCart, error: null };
  }

  const { data: newCart, error: insertError } = await supabase
    .from('carts')
    .insert({ user_id: userId })
    .select('*')
    .single();

  if (insertError) {
    return { data: null, error: insertError as unknown as Error };
  }

  return { data: newCart, error: null };
}

export async function getOrCreateCart(
  userId: string,
): Promise<{ data: CartRow | null; error: Error | null }> {
  const requestKey = `${GET_OR_CREATE_CART_REQUEST_PREFIX}${userId}`;

  try {
    return await runDedupedRequest(requestKey, async () => getOrCreateCartInternal(userId), {
      policy: 'dedupe',
    });
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unable to initialize cart.'),
    };
  }
}

export async function getCartItemsOptimized(
  cartId: string,
  params: GetCartItemsParams = {},
): Promise<CartListResult> {
  const offset = Math.max(params.offset ?? 0, 0);
  const limit = Math.max(params.limit ?? CART_PAGE_SIZE, 1);
  const includeFullSnapshot = params.includeFullSnapshot ?? false;

  if (!cartId) {
    return {
      data: null,
      error: new Error('Cart ID is required.'),
      metrics: {
        durationMs: 0,
        payloadBytes: 0,
        fetchedAt: Date.now(),
        offset,
        limit,
        hasMore: false,
      },
    };
  }

  try {
    const requestedLimit = limit + 1;
    const startedAt = Date.now();

    let query = supabase
      .from('cart_items')
      .select(CART_ITEMS_SELECT)
      .eq('cart_id', cartId)
      .eq('product.is_active', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + requestedLimit - 1);

    if (params.signal) {
      query = query.abortSignal(params.signal);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error: error as unknown as Error, metrics: null };
    }

    const rows = ((data ?? []) as unknown as CartItemOptimizedRow[]) ?? [];
    const hasMore = rows.length > limit;
    const normalizedRows = hasMore ? rows.slice(0, limit) : rows;
    const pageSnapshot = toCartSnapshot(normalizedRows);

    const transformed = normalizedRows.reduce(
      (acc: { items: CartListItem[] }, row: CartItemOptimizedRow) => {
        if (!row.product) {
          return acc;
        }

        const sortedImages = [...(row.product.product_images ?? [])].sort(
          (imageA, imageB) => imageA.sort_order - imageB.sort_order,
        );

        acc.items.push({
          id: row.id,
          product_id: row.product_id,
          quantity: row.quantity,
          created_at: row.created_at,
          product: {
            id: row.product.id,
            name: row.product.name,
            price: row.product.price,
            stock: row.product.stock,
            weight: row.product.weight || DEFAULT_ITEM_WEIGHT_GRAMS,
            slug: row.product.slug,
            is_active: row.product.is_active ?? false,
          },
          images: sortedImages.map(image => ({
            id: image.id,
            url: image.url,
          })),
        });

        return acc;
      },
      {
        items: [] as CartListItem[],
      },
    );

    let snapshot = pageSnapshot;
    let fullSnapshotPayloadBytes = 0;

    if (includeFullSnapshot) {
      const {
        snapshot: fullSnapshot,
        error: fullSnapshotError,
        payloadBytes: snapshotPayloadBytes,
      } = await getCartSnapshot(cartId, params.signal);

      if (fullSnapshotError) {
        return {
          data: null,
          error: fullSnapshotError,
          metrics: null,
        };
      }

      snapshot = fullSnapshot;
      fullSnapshotPayloadBytes = snapshotPayloadBytes;
    }

    const fetchedAt = Date.now();
    const durationMs = fetchedAt - startedAt;
    const payloadBytes = JSON.stringify(rows).length + fullSnapshotPayloadBytes;

    return {
      data: {
        items: transformed.items,
        snapshot,
      },
      error: null,
      metrics: {
        durationMs,
        payloadBytes,
        fetchedAt,
        offset,
        limit,
        hasMore,
      },
    };
  } catch (error) {
    return {
      data: null,
      error: isAbortError(error) ? error : new Error('Failed to load cart items.'),
      metrics: null,
    };
  }
}

export async function getCartSnapshot(
  cartId: string,
  signal?: AbortSignal,
): Promise<{ snapshot: CartSnapshot; payloadBytes: number; error: Error | null }> {
  if (!cartId) {
    return {
      snapshot: {
        itemCount: 0,
        estimatedWeightGrams: 0,
        packageValue: 0,
      },
      payloadBytes: 0,
      error: new Error('Cart ID is required.'),
    };
  }

  try {
    let query = supabase
      .from('cart_items')
      .select(CART_TOTALS_SELECT)
      .eq('cart_id', cartId)
      .eq('product.is_active', true);

    query = withAbortSignal(query, signal);

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return {
        snapshot: {
          itemCount: 0,
          estimatedWeightGrams: 0,
          packageValue: 0,
        },
        payloadBytes: 0,
        error: error as unknown as Error,
      };
    }

    const rows = ((data ?? []) as unknown as CartSnapshotRow[]) ?? [];

    return {
      snapshot: toCartSnapshot(rows),
      payloadBytes: JSON.stringify(rows).length,
      error: null,
    };
  } catch (error) {
    return {
      snapshot: {
        itemCount: 0,
        estimatedWeightGrams: 0,
        packageValue: 0,
      },
      payloadBytes: 0,
      error: isAbortError(error) ? error : new Error('Failed to load cart snapshot.'),
    };
  }
}

export async function getCartWithItems(
  userId: string,
  signal?: AbortSignal,
): Promise<{ data: CartWithItems | null; error: Error | null }> {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return { data: null, error: new Error('User ID is required.') };
  }

  const { data: cart, error: cartError } = await getOrCreateCart(normalizedUserId);

  if (cartError || !cart) {
    return { data: null, error: cartError ?? new Error('Unable to initialize cart.') };
  }

  let cartItemsQuery = supabase.from('cart_items').select('*').eq('cart_id', cart.id);
  cartItemsQuery = withAbortSignal(cartItemsQuery, signal);

  const { data: cartItems, error: itemsError } = await cartItemsQuery;

  if (itemsError) {
    return { data: null, error: itemsError as unknown as Error };
  }

  if (!cartItems || cartItems.length === 0) {
    return {
      data: {
        cartId: cart.id,
        items: [],
        snapshot: { itemCount: 0, estimatedWeightGrams: 0, packageValue: 0 },
      },
      error: null,
    };
  }

  const productIds = cartItems.map(item => item.product_id);

  let productsQuery = supabase
    .from('products')
    .select('id, name, price, stock, weight, slug, is_active')
    .in('id', productIds)
    .eq('is_active', true);
  productsQuery = withAbortSignal(productsQuery, signal);

  const { data: products, error: productsError } = await productsQuery;

  if (productsError) {
    return { data: null, error: productsError as unknown as Error };
  }

  let imagesQuery = supabase
    .from('product_images')
    .select('id, product_id, url, sort_order')
    .in('product_id', productIds)
    .order('sort_order', { ascending: true });
  imagesQuery = withAbortSignal(imagesQuery, signal);

  const { data: images, error: imagesError } = await imagesQuery;

  if (imagesError) {
    return { data: null, error: imagesError as unknown as Error };
  }

  const productMap = new Map<string, ProductRow>();
  for (const product of (products ?? []) as ProductRow[]) {
    productMap.set(product.id, product);
  }
  const imagesByProduct = new Map<string, ProductImageRow[]>();

  for (const image of (images ?? []) as ProductImageRow[]) {
    const existing = imagesByProduct.get(image.product_id) ?? [];
    existing.push(image);
    imagesByProduct.set(image.product_id, existing);
  }

  const itemsWithProducts: CartItemWithProduct[] = [];

  for (const item of cartItems as CartItemRow[]) {
    const product = productMap.get(item.product_id);
    if (!product) continue;

    const productImages = imagesByProduct.get(item.product_id) ?? [];

    itemsWithProducts.push({
      id: item.id,
      cart_id: item.cart_id,
      product_id: item.product_id,
      quantity: item.quantity,
      created_at: item.created_at,
      product: {
        id: product.id,
        name: product.name,
        price: product.price,
        stock: product.stock,
        weight: product.weight,
        slug: product.slug,
        is_active: product.is_active ?? false,
      },
      images: productImages.map(img => ({
        id: img.id,
        url: img.url,
        sort_order: img.sort_order,
      })),
    });
  }

  let itemCount = 0;
  let estimatedWeightGrams = 0;
  let packageValue = 0;

  for (const item of itemsWithProducts) {
    itemCount += item.quantity;
    estimatedWeightGrams += item.quantity * (item.product.weight || DEFAULT_ITEM_WEIGHT_GRAMS);
    packageValue += item.quantity * item.product.price;
  }

  const snapshot: CartSnapshot = {
    itemCount,
    estimatedWeightGrams,
    packageValue,
  };

  return {
    data: {
      cartId: cart.id,
      items: itemsWithProducts,
      snapshot,
    },
    error: null,
  };
}

export async function updateCartItemQuantity(
  cartItemId: string,
  newQuantity: number,
): Promise<{ data: CartRealtimeItem | null; error: Error | null }> {
  const normalizedCartItemId = cartItemId.trim();
  if (!normalizedCartItemId) {
    return { data: null, error: new Error('Cart item ID is required.') };
  }

  if (newQuantity <= 0) {
    return { data: null, error: new Error('Quantity must be greater than 0.') };
  }

  const requestKey = getUpdateCartItemRequestKey(normalizedCartItemId);

  try {
    return await runDedupedRequest(
      requestKey,
      async signal => {
        let query = supabase
          .from('cart_items')
          .update({ quantity: newQuantity })
          .eq('id', normalizedCartItemId)
          .select('id, quantity, product_id, cart_id')
          .single();

        query = withAbortSignal(query, signal);

        const { data: updatedCartItem, error: updateError } = await query;

        if (updateError) {
          return { data: null, error: updateError as unknown as Error };
        }

        const normalizedItem = toCartRealtimeItem(updatedCartItem as CartRealtimeRecord | null);

        if (!normalizedItem) {
          return { data: null, error: new Error('Cart item not found.') };
        }

        return { data: normalizedItem, error: null };
      },
      { policy: 'replace' },
    );
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to update cart item quantity.'),
    };
  }
}

export async function removeCartItem(
  cartItemId: string,
): Promise<{ data: boolean; error: Error | null }> {
  const normalizedCartItemId = cartItemId.trim();
  if (!normalizedCartItemId) {
    return { data: false, error: new Error('Cart item ID is required.') };
  }

  const { error: deleteError } = await supabase
    .from('cart_items')
    .delete()
    .eq('id', normalizedCartItemId);

  if (deleteError) {
    return { data: false, error: deleteError as unknown as Error };
  }

  return { data: true, error: null };
}

export async function clearCart(userId: string): Promise<{ data: boolean; error: Error | null }> {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return { data: false, error: new Error('User ID is required.') };
  }

  const { data: cart, error: cartError } = await getOrCreateCart(normalizedUserId);
  if (cartError || !cart) {
    return { data: false, error: cartError || new Error('Cart not found') };
  }

  const { error: deleteError } = await supabase.from('cart_items').delete().eq('cart_id', cart.id);

  if (deleteError) {
    return { data: false, error: deleteError as unknown as Error };
  }

  return { data: true, error: null };
}

export { getCartItemsOptimized as getCartOptimized };

export function subscribeToCartChanges(
  cartId: string,
  onChange: (event: CartRealtimeChange) => void,
  onConnectionStateChange?: (state: CartRealtimeConnectionState) => void,
): () => void {
  const normalizedCartId = cartId.trim();
  const channelName = `cart:${normalizedCartId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;

  if (!normalizedCartId) {
    onConnectionStateChange?.('disconnected');
    return () => {};
  }

  onConnectionStateChange?.('connecting');

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'cart_items',
        filter: `cart_id=eq.${normalizedCartId}`,
      },
      (payload: RealtimePostgresChangesPayload<CartRealtimeRecord>) => {
        if (__DEV__) {
          const payloadItem = toCartRealtimeItem(payload.new) ?? toCartRealtimeItem(payload.old);
          console.log('[Realtime] Cart change:', payload.eventType, payloadItem?.id);
        }

        const eventType = payload.eventType;

        if (eventType === 'INSERT' || eventType === 'UPDATE' || eventType === 'DELETE') {
          onChange({
            type: eventType,
            new: toCartRealtimeItem(payload.new),
            old: toCartRealtimeItem(payload.old),
          });
        }
      },
    )
    .subscribe(status => {
      if (__DEV__) {
        console.log('[Realtime] Cart subscription status:', status);
      }

      switch (status) {
        case 'SUBSCRIBED':
          onConnectionStateChange?.('connected');
          break;
        case 'TIMED_OUT':
        case 'CHANNEL_ERROR':
          onConnectionStateChange?.('reconnecting');
          break;
        case 'CLOSED':
          onConnectionStateChange?.('disconnected');
          break;
        default:
          break;
      }
    });

  return () => {
    onConnectionStateChange?.('disconnected');
    void channel.unsubscribe();
    void supabase.removeChannel(channel);
  };
}
