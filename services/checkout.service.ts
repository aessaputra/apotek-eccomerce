import { supabase } from '@/utils/supabase';
import * as Crypto from 'expo-crypto';
import type { ShippingOption } from '@/types/shipping';
import type { CheckoutTokenResponse } from '@/types/payment';
import type { Database } from '@/types/supabase';

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

interface CancelUserOrderResponse {
  cancelled?: boolean;
  payment_status?: Database['public']['Enums']['payment_status'];
  order_status?: string;
  applied?: boolean;
  error?: string;
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

export async function createCheckoutOrder(
  params: CheckoutOrderParams,
): Promise<{ data: CheckoutOrderResult | null; error: Error | null }> {
  const idempotencyKey =
    params.checkout_idempotency_key?.trim() || generateCheckoutIdempotencyKey();

  try {
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      return {
        data: null,
        error: new Error(AUTH_SESSION_ERROR_MESSAGE),
      };
    }

    const { data, error } = await supabase.functions.invoke('create-checkout-order', {
      body: {
        shipping_address_id: params.shipping_address_id,
        destination_area_id: params.destination_area_id ?? null,
        destination_postal_code: params.destination_postal_code ?? null,
        shipping_option: params.shipping_option,
        checkout_idempotency_key: idempotencyKey,
      },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (error) {
      return {
        data: null,
        error: toUserError(error, 'Gagal membuat order checkout. Silakan coba lagi.'),
      };
    }

    const response = (data ?? {}) as Partial<CheckoutOrderResult>;

    if (
      typeof response.order_id !== 'string' ||
      typeof response.total_amount !== 'number' ||
      typeof response.item_count !== 'number' ||
      typeof response.checkout_idempotency_key !== 'string'
    ) {
      return {
        data: null,
        error: new Error('Respons checkout tidak valid. Silakan coba lagi.'),
      };
    }

    return {
      data: {
        order_id: response.order_id,
        total_amount: response.total_amount,
        item_count: response.item_count,
        checkout_idempotency_key: response.checkout_idempotency_key,
      },
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: toUserError(error, 'Gagal membuat order checkout. Silakan coba lagi.'),
    };
  }
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
      .from('order_read_model')
      .select('payment_status, status')
      .eq('id', orderId)
      .single();

    if (error) {
      return { data: null, error: toUserError(error, DATABASE_ERROR_MESSAGE) };
    }

    return {
      data: {
        payment_status: data.payment_status ?? 'pending',
        status: data.status ?? 'pending',
      },
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

export async function cancelUserOrder(
  orderId: string,
): Promise<{ data: CancelUserOrderResponse | null; error: Error | null }> {
  try {
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      return {
        data: null,
        error: new Error(AUTH_SESSION_ERROR_MESSAGE),
      };
    }

    const { data, error } = await supabase.functions.invoke('cancel-user-order', {
      body: { order_id: orderId },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (error) {
      return {
        data: null,
        error: toUserError(error, 'Gagal membatalkan pesanan. Silakan coba lagi.'),
      };
    }

    return {
      data: (data ?? null) as CancelUserOrderResponse | null,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: toUserError(error, 'Gagal membatalkan pesanan. Silakan coba lagi.'),
    };
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
    const terminalStates = ['settlement', 'capture', 'authorize', 'cancel', 'deny', 'expire'];
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
