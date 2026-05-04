import { supabase } from '@/utils/supabase';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { Tables } from '@/types/supabase';
import { CART_PAGE_SIZE, DEFAULT_CART_ITEM_WEIGHT_GRAMS } from '@/constants/cart.constants';
import { runDedupedRequest } from '@/utils/requestDeduplication';
import { buildCartSnapshot, EMPTY_CART_SNAPSHOT } from '@/utils/cart';
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

export interface CartMutationResult {
  error: Error | null;
}
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

interface NormalizedAddToCartInput {
  userId: string;
  productId: string;
  quantityToAdd: number;
}

interface NormalizedCartListParams {
  offset: number;
  limit: number;
  includeFullSnapshot: boolean;
}

interface CartItemPageResult {
  rows: CartItemOptimizedRow[];
  normalizedRows: CartItemOptimizedRow[];
  hasMore: boolean;
}

interface CartPageSnapshotResult {
  snapshot: CartSnapshot;
  fullSnapshotPayloadBytes: number;
}

function toCartSnapshot(rows: CartSnapshotRow[]): CartSnapshot {
  return buildCartSnapshot(rows, DEFAULT_CART_ITEM_WEIGHT_GRAMS);
}

function createEmptyCartSnapshot(): CartSnapshot {
  return { ...EMPTY_CART_SNAPSHOT };
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

function normalizeAddToCartInput(
  userId: string,
  productId: string,
  quantityToAdd: number,
): { data: NormalizedAddToCartInput | null; error: Error | null } {
  const normalizedUserId = userId.trim();
  const normalizedProductId = productId.trim();

  if (!normalizedUserId || !normalizedProductId || quantityToAdd <= 0) {
    return { data: null, error: new Error('Invalid cart mutation payload.') };
  }

  return {
    data: {
      userId: normalizedUserId,
      productId: normalizedProductId,
      quantityToAdd,
    },
    error: null,
  };
}

function normalizeCartListParams(params: GetCartItemsParams): NormalizedCartListParams {
  return {
    offset: Math.max(params.offset ?? 0, 0),
    limit: Math.max(params.limit ?? CART_PAGE_SIZE, 1),
    includeFullSnapshot: params.includeFullSnapshot ?? false,
  };
}

function toSortedCartImages(images: Pick<ProductImageRow, 'id' | 'url' | 'sort_order'>[] | null) {
  return [...(images ?? [])]
    .sort((imageA, imageB) => imageA.sort_order - imageB.sort_order)
    .map(image => ({
      id: image.id,
      url: image.url,
      sort_order: image.sort_order,
    }));
}

function toCartItemWithProduct(row: CartItemOptimizedRow): CartItemWithProduct | null {
  if (!row.product) {
    return null;
  }

  return {
    id: row.id,
    cart_id: row.cart_id,
    product_id: row.product_id,
    quantity: row.quantity,
    created_at: row.created_at,
    product: {
      id: row.product.id,
      name: row.product.name,
      price: row.product.price,
      stock: row.product.stock,
      weight: row.product.weight || DEFAULT_CART_ITEM_WEIGHT_GRAMS,
      slug: row.product.slug,
      is_active: row.product.is_active ?? false,
    },
    images: toSortedCartImages(row.product.product_images),
  };
}

function toCartWithItems(
  rows: CartItemOptimizedRow[],
  cartId: string,
): { cartId: string; items: CartItemWithProduct[]; snapshot: CartSnapshot } {
  const items = rows.reduce((acc: CartItemWithProduct[], row) => {
    const item = toCartItemWithProduct(row);

    if (item) {
      acc.push(item);
    }

    return acc;
  }, []);

  return {
    cartId,
    items,
    snapshot:
      items.length === 0
        ? createEmptyCartSnapshot()
        : buildCartSnapshot(items, DEFAULT_CART_ITEM_WEIGHT_GRAMS),
  };
}

function toCartListItem(item: CartItemWithProduct): CartListItem {
  return {
    id: item.id,
    product_id: item.product_id,
    quantity: item.quantity,
    created_at: item.created_at,
    product: item.product,
    images: item.images.map(image => ({
      id: image.id,
      url: image.url,
    })),
  };
}

function toCartListItems(rows: CartItemOptimizedRow[]): CartListItem[] {
  return rows.reduce((items: CartListItem[], row) => {
    const item = toCartItemWithProduct(row);

    if (item) {
      items.push(toCartListItem(item));
    }

    return items;
  }, []);
}

async function fetchCartItemPage(
  cartId: string,
  offset: number,
  limit: number,
  signal?: AbortSignal,
): Promise<{ data: CartItemPageResult | null; error: Error | null }> {
  const requestedLimit = limit + 1;

  let query = supabase
    .from('cart_items')
    .select(CART_ITEMS_SELECT)
    .eq('cart_id', cartId)
    .eq('product.is_active', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + requestedLimit - 1);

  query = withAbortSignal(query, signal);

  const { data, error } = await query;

  if (error) {
    return { data: null, error: error as unknown as Error };
  }

  const rows = ((data ?? []) as unknown as CartItemOptimizedRow[]) ?? [];
  const hasMore = rows.length > limit;

  return {
    data: {
      rows,
      normalizedRows: hasMore ? rows.slice(0, limit) : rows,
      hasMore,
    },
    error: null,
  };
}

async function resolveCartPageSnapshot(
  cartId: string,
  normalizedRows: CartItemOptimizedRow[],
  includeFullSnapshot: boolean,
  signal?: AbortSignal,
): Promise<{ data: CartPageSnapshotResult | null; error: Error | null }> {
  if (!includeFullSnapshot) {
    return {
      data: {
        snapshot: toCartSnapshot(normalizedRows),
        fullSnapshotPayloadBytes: 0,
      },
      error: null,
    };
  }

  const { snapshot, error, payloadBytes } = await getCartSnapshot(cartId, signal);

  if (error) {
    return { data: null, error };
  }

  return {
    data: {
      snapshot,
      fullSnapshotPayloadBytes: payloadBytes,
    },
    error: null,
  };
}

function buildCartListMetrics(
  rows: CartItemOptimizedRow[],
  fullSnapshotPayloadBytes: number,
  startedAt: number,
  offset: number,
  limit: number,
  hasMore: boolean,
) {
  const fetchedAt = Date.now();

  return {
    durationMs: fetchedAt - startedAt,
    payloadBytes: JSON.stringify(rows).length + fullSnapshotPayloadBytes,
    fetchedAt,
    offset,
    limit,
    hasMore,
  };
}

async function getExistingCartItem(
  cartId: string,
  productId: string,
): Promise<{ data: { id: string; quantity: number } | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('cart_items')
    .select('id, quantity')
    .eq('cart_id', cartId)
    .eq('product_id', productId)
    .maybeSingle();

  if (error) {
    return { data: null, error: error as unknown as Error };
  }

  return {
    data: data ? { id: data.id, quantity: data.quantity } : null,
    error: null,
  };
}

async function incrementExistingCartItemQuantity(
  cartItemId: string,
  nextQuantity: number,
): Promise<CartMutationResult> {
  const { error } = await supabase
    .from('cart_items')
    .update({ quantity: nextQuantity })
    .eq('id', cartItemId);

  return {
    error: error ? (error as unknown as Error) : null,
  };
}

async function insertCartItem(
  cartId: string,
  productId: string,
  quantity: number,
): Promise<CartMutationResult> {
  const { error } = await supabase.from('cart_items').insert({
    cart_id: cartId,
    product_id: productId,
    quantity,
  });

  return {
    error: error ? (error as unknown as Error) : null,
  };
}

async function getCartItemRows(
  cartId: string,
  signal?: AbortSignal,
): Promise<{ data: CartItemOptimizedRow[] | null; error: Error | null }> {
  try {
    let query = supabase
      .from('cart_items')
      .select(CART_ITEMS_SELECT)
      .eq('cart_id', cartId)
      .eq('product.is_active', true)
      .order('created_at', { ascending: false });

    query = withAbortSignal(query, signal);

    const { data, error } = await query;

    if (error) {
      return { data: null, error: error as unknown as Error };
    }

    return {
      data: ((data ?? []) as unknown as CartItemOptimizedRow[]) ?? [],
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: isAbortError(error) ? error : new Error('Failed to load cart items.'),
    };
  }
}

async function getCartItemRow(
  cartItemId: string,
  signal?: AbortSignal,
): Promise<{ data: CartItemOptimizedRow | null; error: Error | null }> {
  try {
    let query = supabase
      .from('cart_items')
      .select(CART_ITEMS_SELECT)
      .eq('id', cartItemId)
      .eq('product.is_active', true)
      .maybeSingle();

    query = withAbortSignal(query, signal);

    const { data, error } = await query;

    if (error) {
      return { data: null, error: error as unknown as Error };
    }

    if (!data) {
      return { data: null, error: new Error('Cart item not found.') };
    }

    return {
      data: data as unknown as CartItemOptimizedRow,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: isAbortError(error) ? error : new Error('Failed to load cart item.'),
    };
  }
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

export async function addProductToCart(
  userId: string,
  productId: string,
  quantityToAdd: number = 1,
): Promise<CartMutationResult> {
  const { data: normalizedInput, error: inputError } = normalizeAddToCartInput(
    userId,
    productId,
    quantityToAdd,
  );

  if (inputError || !normalizedInput) {
    return { error: inputError ?? new Error('Invalid cart mutation payload.') };
  }

  try {
    const { data: cart, error: cartError } = await getOrCreateCart(normalizedInput.userId);

    if (cartError || !cart) {
      return { error: cartError ?? new Error('Unable to initialize cart.') };
    }

    const { data: existingItem, error: existingItemError } = await getExistingCartItem(
      cart.id,
      normalizedInput.productId,
    );

    if (existingItemError) {
      return { error: existingItemError };
    }

    if (existingItem) {
      return incrementExistingCartItemQuantity(
        existingItem.id,
        existingItem.quantity + normalizedInput.quantityToAdd,
      );
    }

    return insertCartItem(cart.id, normalizedInput.productId, normalizedInput.quantityToAdd);
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Failed to add product to cart.') };
  }
}

export async function getCartItemsOptimized(
  cartId: string,
  params: GetCartItemsParams = {},
): Promise<CartListResult> {
  const { offset, limit, includeFullSnapshot } = normalizeCartListParams(params);

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
    const startedAt = Date.now();

    const { data: pageResult, error: pageError } = await fetchCartItemPage(
      cartId,
      offset,
      limit,
      params.signal,
    );

    if (pageError || !pageResult) {
      return {
        data: null,
        error: pageError ?? new Error('Failed to load cart items.'),
        metrics: null,
      };
    }

    const { data: snapshotResult, error: snapshotError } = await resolveCartPageSnapshot(
      cartId,
      pageResult.normalizedRows,
      includeFullSnapshot,
      params.signal,
    );

    if (snapshotError || !snapshotResult) {
      return {
        data: null,
        error: snapshotError ?? new Error('Failed to load cart snapshot.'),
        metrics: null,
      };
    }

    return {
      data: {
        items: toCartListItems(pageResult.normalizedRows),
        snapshot: snapshotResult.snapshot,
      },
      error: null,
      metrics: buildCartListMetrics(
        pageResult.rows,
        snapshotResult.fullSnapshotPayloadBytes,
        startedAt,
        offset,
        limit,
        pageResult.hasMore,
      ),
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
      snapshot: createEmptyCartSnapshot(),
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
        snapshot: createEmptyCartSnapshot(),
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
      snapshot: createEmptyCartSnapshot(),
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

  const { data: rows, error } = await getCartItemRows(cart.id, signal);

  if (error || !rows) {
    return { data: null, error: error ?? new Error('Failed to load cart items.') };
  }

  return {
    data: toCartWithItems(rows, cart.id),
    error: null,
  };
}

export async function getCartItemWithProduct(
  cartItemId: string,
  signal?: AbortSignal,
): Promise<{ data: CartItemWithProduct | null; error: Error | null }> {
  const normalizedCartItemId = cartItemId.trim();

  if (!normalizedCartItemId) {
    return { data: null, error: new Error('Cart item ID is required.') };
  }

  const { data: row, error } = await getCartItemRow(normalizedCartItemId, signal);

  if (error || !row) {
    return { data: null, error: error ?? new Error('Cart item not found.') };
  }

  const item = toCartItemWithProduct(row);

  if (!item) {
    return { data: null, error: new Error('Cart item not found.') };
  }

  return { data: item, error: null };
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
