import { supabase } from '@/utils/supabase';
import * as Crypto from 'expo-crypto';
import type { ShippingOption } from '@/types/shipping';
import type { CheckoutTokenResponse } from '@/types/payment';
import type { Database, Tables, TablesInsert } from '@/types/supabase';

interface CheckoutOrderParams {
  user_id: string;
  shipping_address_id: string;
  destination_area_id?: string;
  destination_postal_code?: number;
  shipping_option: ShippingOption;
  checkout_idempotency_key?: string;
}

interface CheckoutOrderResult {
  order_id: string;
  total_amount: number;
  item_count: number;
  checkout_idempotency_key: string;
}

interface PaymentStatusSnapshot {
  payment_status: Database['public']['Enums']['payment_status'];
  status: string;
}

interface ConfirmMidtransPaymentResponse {
  confirmed?: boolean;
  payment_status?: Database['public']['Enums']['payment_status'];
  order_status?: string;
  applied?: boolean;
  message?: string;
}

interface CartLine {
  product_id: string;
  quantity: number;
}

const NETWORK_ERROR_MESSAGE = 'Koneksi internet bermasalah. Periksa jaringan Anda, lalu coba lagi.';
const NETWORK_TIMEOUT_MESSAGE =
  'Permintaan pembayaran timeout. Silakan tunggu beberapa saat lalu coba lagi.';
const DATABASE_ERROR_MESSAGE = 'Terjadi kendala database saat checkout. Silakan coba lagi.';
const MIDTRANS_ERROR_MESSAGE =
  'Layanan pembayaran Midtrans sedang bermasalah. Silakan coba beberapa saat lagi.';
const AUTH_SESSION_ERROR_MESSAGE = 'Sesi login belum siap. Silakan coba lagi dalam beberapa saat.';

const SESSION_EXPIRY_SAFETY_WINDOW_SECONDS = 60;

async function getValidAccessToken(): Promise<string | null> {
  const {
    data: { session: cachedSession },
  } = await supabase.auth.getSession();

  if (!cachedSession?.access_token) {
    return null;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const expiresAt = cachedSession.expires_at ?? 0;
  const isExpiredOrNearExpiry = expiresAt <= nowSeconds + SESSION_EXPIRY_SAFETY_WINDOW_SECONDS;

  if (!isExpiredOrNearExpiry) {
    return cachedSession.access_token;
  }

  const {
    data: { session: refreshedSession },
    error: refreshError,
  } = await supabase.auth.refreshSession();

  if (refreshError || !refreshedSession?.access_token) {
    return null;
  }

  return refreshedSession.access_token;
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error('Terjadi kesalahan yang tidak diketahui.');
}

function normalizeErrorMessage(error: unknown): string {
  const fallback = toError(error);
  const message = fallback.message.toLowerCase();

  if (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('failed to fetch') ||
    message.includes('connection') ||
    message.includes('offline')
  ) {
    return NETWORK_ERROR_MESSAGE;
  }

  if (message.includes('timeout') || message.includes('timed out') || message.includes('abort')) {
    return NETWORK_TIMEOUT_MESSAGE;
  }

  const maybeCode =
    typeof error === 'object' && error !== null ? (error as { code?: unknown }).code : '';
  if (typeof maybeCode === 'string' && maybeCode.startsWith('23')) {
    return DATABASE_ERROR_MESSAGE;
  }

  if (message.includes('midtrans') || message.includes('snap') || message.includes('payment')) {
    return MIDTRANS_ERROR_MESSAGE;
  }

  return fallback.message;
}

function toUserError(error: unknown, fallbackMessage: string): Error {
  const normalizedMessage = normalizeErrorMessage(error).trim();
  return new Error(normalizedMessage || fallbackMessage);
}

function generateCheckoutIdempotencyKey(): string {
  return Crypto.randomUUID();
}

async function getOrCreateCartId(
  userId: string,
): Promise<{ data: string | null; error: Error | null }> {
  const { data: cartRows, error: cartError } = await supabase
    .from('carts')
    .select('id')
    .eq('user_id', userId)
    .limit(1);

  if (cartError) {
    return { data: null, error: cartError as unknown as Error };
  }

  const existingCartId = cartRows?.[0]?.id;
  if (existingCartId) {
    return { data: existingCartId, error: null };
  }

  const { data: insertedCart, error: insertCartError } = await supabase
    .from('carts')
    .insert({ user_id: userId })
    .select('id')
    .single();

  if (insertCartError) {
    return { data: null, error: insertCartError as unknown as Error };
  }

  return { data: insertedCart.id, error: null };
}

async function getCartLines(cartId: string): Promise<{ data: CartLine[]; error: Error | null }> {
  const { data: cartItems, error: cartItemsError } = await supabase
    .from('cart_items')
    .select('product_id, quantity')
    .eq('cart_id', cartId);

  if (cartItemsError) {
    return { data: [], error: cartItemsError as unknown as Error };
  }

  const lines = (cartItems ?? []) as CartLine[];

  return { data: lines, error: null };
}

export async function createCheckoutOrder(
  params: CheckoutOrderParams,
): Promise<{ data: CheckoutOrderResult | null; error: Error | null }> {
  const idempotencyKey =
    params.checkout_idempotency_key?.trim() || generateCheckoutIdempotencyKey();

  const { data: cartId, error: cartIdError } = await getOrCreateCartId(params.user_id);
  if (cartIdError || !cartId) {
    return {
      data: null,
      error: toUserError(cartIdError, 'Gagal menyiapkan keranjang checkout. Silakan coba lagi.'),
    };
  }

  const { data: existingOrder, error: existingOrderError } = await supabase
    .from('orders')
    .select('id, total_amount')
    .eq('checkout_idempotency_key', idempotencyKey)
    .eq('user_id', params.user_id)
    .limit(1)
    .maybeSingle();

  if (existingOrderError) {
    return {
      data: null,
      error: toUserError(existingOrderError, DATABASE_ERROR_MESSAGE),
    };
  }

  if (existingOrder) {
    const { data: existingItems, error: existingItemsError } = await supabase
      .from('order_items')
      .select('quantity')
      .eq('order_id', existingOrder.id);

    if (existingItemsError) {
      return {
        data: null,
        error: toUserError(existingItemsError, DATABASE_ERROR_MESSAGE),
      };
    }

    const existingItemCount = (existingItems ?? []).reduce((sum, item) => sum + item.quantity, 0);

    return {
      data: {
        order_id: existingOrder.id,
        total_amount: existingOrder.total_amount,
        item_count: existingItemCount,
        checkout_idempotency_key: idempotencyKey,
      },
      error: null,
    };
  }

  const { data: cartLines, error: cartLinesError } = await getCartLines(cartId);
  if (cartLinesError) {
    return { data: null, error: cartLinesError };
  }

  if (cartLines.length === 0) {
    return {
      data: null,
      error: new Error('Keranjang kosong. Tambahkan produk sebelum melanjutkan pembayaran.'),
    };
  }

  const productIds = cartLines.map(item => item.product_id);
  const { data: products, error: productError } = await supabase
    .from('products')
    .select('id, name, price, stock, is_active')
    .in('id', productIds);

  if (productError) {
    return { data: null, error: toUserError(productError, DATABASE_ERROR_MESSAGE) };
  }

  const productMap = new Map(
    (
      ((products ?? []) as Pick<
        Tables<'products'>,
        'id' | 'name' | 'price' | 'stock' | 'is_active'
      >[]) ?? []
    ).map(product => [product.id, product]),
  );

  let totalAmount = 0;
  let itemCount = 0;
  const orderItems: TablesInsert<'order_items'>[] = [];

  for (const line of cartLines) {
    const product = productMap.get(line.product_id);
    if (!product || product.is_active === false) {
      return {
        data: null,
        error: new Error('Ada produk yang sudah tidak tersedia. Silakan perbarui keranjang.'),
      };
    }

    if (line.quantity > product.stock) {
      return {
        data: null,
        error: new Error(`Stok produk ${product.name} tidak mencukupi.`),
      };
    }

    totalAmount += product.price * line.quantity;
    itemCount += line.quantity;

    orderItems.push({
      product_id: product.id,
      quantity: line.quantity,
      price_at_purchase: product.price,
      order_id: '',
    });
  }

  const { shipping_option: shippingOption } = params;
  const orderPayload: TablesInsert<'orders'> = {
    user_id: params.user_id,
    shipping_address_id: params.shipping_address_id,
    total_amount: totalAmount,
    status: 'pending',
    payment_status: 'pending',
    expired_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    shipping_cost: shippingOption.price,
    shipping_etd: shippingOption.estimated_delivery,
    courier_code: shippingOption.courier_code,
    courier_service: shippingOption.service_code,
    origin_area_id: null,
    destination_area_id: params.destination_area_id ?? null,
    destination_postal_code: params.destination_postal_code ?? null,
    checkout_idempotency_key: idempotencyKey,
  };

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert(orderPayload)
    .select('id')
    .single();

  if (orderError) {
    if ((orderError as { code?: string }).code === '23505') {
      const { data: duplicateOrder, error: duplicateOrderError } = await supabase
        .from('orders')
        .select('id, total_amount')
        .eq('checkout_idempotency_key', idempotencyKey)
        .eq('user_id', params.user_id)
        .limit(1)
        .single();

      if (duplicateOrderError) {
        return { data: null, error: toUserError(duplicateOrderError, DATABASE_ERROR_MESSAGE) };
      }

      const { data: duplicateItems, error: duplicateItemsError } = await supabase
        .from('order_items')
        .select('quantity')
        .eq('order_id', duplicateOrder.id);

      if (duplicateItemsError) {
        return { data: null, error: toUserError(duplicateItemsError, DATABASE_ERROR_MESSAGE) };
      }

      const duplicateItemCount = (duplicateItems ?? []).reduce(
        (sum, item) => sum + item.quantity,
        0,
      );

      return {
        data: {
          order_id: duplicateOrder.id,
          total_amount: duplicateOrder.total_amount,
          item_count: duplicateItemCount,
          checkout_idempotency_key: idempotencyKey,
        },
        error: null,
      };
    }

    return { data: null, error: toUserError(orderError, DATABASE_ERROR_MESSAGE) };
  }

  const orderId = order.id;

  const orderItemsPayload = orderItems.map(item => ({ ...item, order_id: orderId }));
  const { error: orderItemsError } = await supabase.from('order_items').insert(orderItemsPayload);

  if (orderItemsError) {
    await supabase.from('orders').delete().eq('id', orderId);

    return { data: null, error: toUserError(orderItemsError, DATABASE_ERROR_MESSAGE) };
  }

  return {
    data: {
      order_id: orderId,
      total_amount: totalAmount,
      item_count: itemCount,
      checkout_idempotency_key: idempotencyKey,
    },
    error: null,
  };
}

export async function createSnapToken(
  orderId: string,
): Promise<{ data: CheckoutTokenResponse | null; error: Error | null }> {
  try {
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      return {
        data: null,
        error: new Error(AUTH_SESSION_ERROR_MESSAGE),
      };
    }

    const { data, error } = await supabase.functions.invoke('create-snap-token', {
      body: { order_id: orderId },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (error) {
      return { data: null, error: toUserError(error, MIDTRANS_ERROR_MESSAGE) };
    }

    const response = (data ?? {}) as {
      snap_token?: unknown;
      snap_redirect_url?: unknown;
      redirect_url?: unknown;
      snapToken?: unknown;
      redirectUrl?: unknown;
    };

    const snapToken =
      typeof response.snap_token === 'string'
        ? response.snap_token
        : typeof response.snapToken === 'string'
          ? response.snapToken
          : '';

    const redirectUrl =
      typeof response.snap_redirect_url === 'string'
        ? response.snap_redirect_url
        : typeof response.redirect_url === 'string'
          ? response.redirect_url
          : typeof response.redirectUrl === 'string'
            ? response.redirectUrl
            : '';

    if (!redirectUrl || !snapToken) {
      return {
        data: null,
        error: new Error('Respons token pembayaran tidak valid. Silakan coba lagi.'),
      };
    }

    return {
      data: {
        snapToken,
        redirectUrl,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: toUserError(error, MIDTRANS_ERROR_MESSAGE) };
  }
}

export async function getOrderPaymentStatus(
  orderId: string,
): Promise<{ data: PaymentStatusSnapshot | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('payment_status, status')
      .eq('id', orderId)
      .single();

    if (error) {
      return { data: null, error: toUserError(error, DATABASE_ERROR_MESSAGE) };
    }

    return {
      data: data as PaymentStatusSnapshot,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: toUserError(error, 'Gagal memeriksa status pembayaran. Silakan coba lagi.'),
    };
  }
}

export async function confirmMidtransPayment(
  orderId: string,
): Promise<{ data: ConfirmMidtransPaymentResponse | null; error: Error | null }> {
  try {
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      return {
        data: null,
        error: new Error(AUTH_SESSION_ERROR_MESSAGE),
      };
    }

    const { data, error } = await supabase.functions.invoke('confirm-midtrans-payment', {
      body: { order_id: orderId },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (error) {
      return { data: null, error: toUserError(error, MIDTRANS_ERROR_MESSAGE) };
    }

    return {
      data: (data ?? null) as ConfirmMidtransPaymentResponse | null,
      error: null,
    };
  } catch (error) {
    return { data: null, error: toUserError(error, MIDTRANS_ERROR_MESSAGE) };
  }
}

export async function pollOrderPaymentStatus(
  orderId: string,
  maxAttempts = 12,
  delayMs = 2000,
): Promise<{ data: PaymentStatusSnapshot | null; error: Error | null }> {
  const safeMaxAttempts = Math.min(Math.max(1, maxAttempts), 12);
  const confirmAttempts = new Set([0, 2, 4, 6, 8, 10]);

  for (let index = 0; index < safeMaxAttempts; index += 1) {
    if (confirmAttempts.has(index)) {
      const { error: confirmError } = await confirmMidtransPayment(orderId);

      if (confirmError) {
        return { data: null, error: confirmError };
      }
    }

    const { data, error } = await getOrderPaymentStatus(orderId);

    if (error) {
      return { data: null, error };
    }

    const paymentStatus = data?.payment_status ?? '';
    const terminalStates = ['settlement', 'authorize', 'cancel', 'deny', 'expire', 'failure'];
    if (terminalStates.includes(paymentStatus)) {
      return { data, error: null };
    }

    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  return {
    data: null,
    error: new Error(
      'Status pembayaran masih diproses. Silakan cek halaman pesanan Anda beberapa saat lagi.',
    ),
  };
}
