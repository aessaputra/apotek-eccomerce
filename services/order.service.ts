import { supabase } from './supabase.service';
import type { Database } from '@/types/supabase';
import { classifyError, isRetryableError, translateErrorMessage } from '@/utils/error';
import { withRetry } from '@/utils/retry';

export type Order = Database['public']['Tables']['orders']['Row'];
export const ORDERS_PAGE_SIZE = 20;
export const ORDERS_CACHE_TTL_MS = 5 * 60 * 1000;

const ORDER_LIST_SELECT = `
  id,
  created_at,
  midtrans_order_id,
  gross_amount,
  total_amount,
  courier_service,
  payment_status,
  status,
  order_items (
    id,
    order_id,
    product_id,
    quantity,
    price_at_purchase,
    products (
      id,
      name,
      slug
    )
  )
`;

const ORDER_DETAIL_SELECT = `
  *,
  order_items (
    id,
    order_id,
    product_id,
    quantity,
    price_at_purchase,
    products (
      id,
      name,
      price,
      slug,
      weight,
      product_images (
        url,
        sort_order
      )
    )
  ),
  profiles (full_name, phone_number),
  addresses (
    id,
    receiver_name,
    phone_number,
    street_address,
    city,
    province,
    postal_code
  )
`;

export interface OrderListProduct {
  id: string;
  name: string;
  slug: string;
}

export interface OrderListOrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  quantity: number;
  price_at_purchase: number;
  products: OrderListProduct | null;
}

export interface OrderListItem {
  id: string;
  created_at: string;
  midtrans_order_id: string | null;
  gross_amount: number | null;
  total_amount: number;
  courier_service: string | null;
  payment_status: string;
  status: string;
  order_items: OrderListOrderItem[];
}

export type OrderWithItems = Order & {
  order_items: {
    id: string;
    order_id: string;
    product_id: string | null;
    quantity: number;
    price_at_purchase: number;
    products?: {
      id: string;
      name: string;
      price: number;
      slug: string;
      weight: number;
      product_images?: {
        url: string;
        sort_order: number;
      }[];
    } | null;
  }[];
  profiles?: {
    full_name: string | null;
    phone_number: string | null;
  } | null;
  addresses?: {
    id: string;
    receiver_name: string;
    phone_number: string;
    street_address: string;
    city: string;
    province: string | null;
    postal_code: string;
  } | null;
};

export interface OrderListResult {
  data: OrderListItem[] | null;
  error: Error | null;
  metrics: OrderListMetrics | null;
}

export interface OrderDetailResult {
  data: OrderWithItems | null;
  error: Error | null;
}

export interface OrderListMetrics {
  durationMs: number;
  payloadBytes: number;
  fetchedAt: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export interface GetUserOrdersParams {
  offset?: number;
  limit?: number;
  signal?: AbortSignal;
  paymentStatus?: 'pending' | 'settlement' | 'deny' | 'expire' | 'cancel';
}

const DATABASE_ERROR_MESSAGE = 'Gagal memuat data pesanan. Silakan coba lagi.';

interface ErrorLike {
  message?: unknown;
  details?: unknown;
  hint?: unknown;
  code?: unknown;
  name?: unknown;
  error?: unknown;
}

function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as ErrorLike).message;
    if (typeof message === 'string') {
      return message;
    }
  }

  return '';
}

function isAbortError(error: unknown): error is Error {
  if (error instanceof Error) {
    return error.name === 'AbortError';
  }

  if (!error || typeof error !== 'object') {
    return false;
  }

  const { name, code } = error as ErrorLike;
  return (
    (typeof name === 'string' && name === 'AbortError') ||
    (typeof code === 'string' && code === 'ABORT_ERR')
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

function getNestedErrorMessage(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (!value || typeof value !== 'object') {
    return '';
  }

  const record = value as ErrorLike;
  const nestedError = getNestedErrorMessage(record.error);
  if (nestedError) {
    return nestedError;
  }

  return getErrorMessage(value);
}

function getPayloadBytes(value: unknown): number {
  return JSON.stringify(value).length;
}

function logSupabaseError(context: string, error: unknown): void {
  if (!__DEV__) {
    return;
  }

  if (isAbortError(error)) {
    return;
  }

  if (error instanceof Error) {
    console.warn(`[order.service] ${context}:`, {
      message: error.message,
      name: error.name,
      stack: error.stack?.split('\n').slice(0, 3).join('\n'),
    });
  } else {
    const message = getNestedErrorMessage(error);

    if (error && typeof error === 'object') {
      const { code, details, hint, name } = error as ErrorLike;

      console.warn(`[order.service] ${context}:`, {
        message: message || DATABASE_ERROR_MESSAGE,
        name: typeof name === 'string' ? name : 'UnknownError',
        code: typeof code === 'string' ? code : undefined,
        details: typeof details === 'string' ? details : undefined,
        hint: typeof hint === 'string' ? hint : undefined,
      });
      return;
    }

    console.warn(`[order.service] ${context}:`, message || String(error));
  }
}

function toAbortError(error: unknown): Error {
  if (error instanceof Error && error.name === 'AbortError') {
    return error;
  }

  const message = getNestedErrorMessage(error).trim();
  const abortError = new Error(message || 'The operation was aborted.');
  abortError.name = 'AbortError';
  return abortError;
}

function normalizeSupabaseError(error: unknown, fallback: string): Error {
  if (isAbortError(error)) {
    return toAbortError(error);
  }

  const classifiedError = classifyError(error);
  const translatedMessage = translateErrorMessage(classifiedError).trim();
  if (translatedMessage) {
    return new Error(translatedMessage);
  }

  const nestedMessage = getNestedErrorMessage(error).trim();
  return new Error(nestedMessage || fallback);
}

/**
 * Get paginated, list-optimized orders for a user, sorted by creation date (newest first)
 */
export async function getOrdersOptimized(
  userId: string,
  params: GetUserOrdersParams = {},
): Promise<OrderListResult> {
  const offset = Math.max(params.offset ?? 0, 0);
  const pageSize = Math.max(params.limit ?? ORDERS_PAGE_SIZE, 1);
  const fetchLimit = pageSize + 1;
  const startedAt = Date.now();

  try {
    const data = await withRetry(
      async () => {
        let query = supabase
          .from('orders')
          .select(ORDER_LIST_SELECT)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .range(offset, offset + fetchLimit - 1);

        if (params.paymentStatus) {
          query = query.eq('payment_status', params.paymentStatus);
        }

        const queryWithSignal = withAbortSignal(query, params.signal);

        const { data: rows, error } = await queryWithSignal;

        if (error) {
          throw error;
        }

        return rows;
      },
      {
        maxRetries: 2,
        baseDelay: 250,
        maxDelay: 1000,
        shouldRetry: error => !isAbortError(error) && isRetryableError(classifyError(error)),
      },
    );

    const rows = (data ?? []) as unknown as OrderListItem[];
    const hasMore = rows.length > pageSize;
    const normalizedData = hasMore ? rows.slice(0, pageSize) : rows;
    const fetchedAt = Date.now();

    return {
      data: normalizedData,
      error: null,
      metrics: {
        durationMs: fetchedAt - startedAt,
        payloadBytes: getPayloadBytes(normalizedData),
        fetchedAt,
        offset,
        limit: pageSize,
        hasMore,
      },
    };
  } catch (error) {
    logSupabaseError('getOrdersOptimized unexpected error', error);
    return {
      data: null,
      error: isAbortError(error)
        ? toAbortError(error)
        : normalizeSupabaseError(error, DATABASE_ERROR_MESSAGE),
      metrics: null,
    };
  }
}

export async function getUserOrders(
  userId: string,
  params: GetUserOrdersParams = {},
): Promise<OrderListResult> {
  return getOrdersOptimized(userId, params);
}

/**
 * Get a single order by ID with full details
 */
export async function getOrderById(orderId: string): Promise<OrderDetailResult> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(ORDER_DETAIL_SELECT)
      .eq('id', orderId)
      .single();

    if (error) {
      logSupabaseError('getOrderById query failed', error);
      return { data: null, error: normalizeSupabaseError(error, DATABASE_ERROR_MESSAGE) };
    }

    return { data: data as unknown as OrderWithItems, error: null };
  } catch (error) {
    logSupabaseError('getOrderById unexpected error', error);
    return { data: null, error: normalizeSupabaseError(error, DATABASE_ERROR_MESSAGE) };
  }
}

/**
 * Get payment status label in Bahasa Indonesia
 */
export function getPaymentStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Menunggu Pembayaran',
    capture: 'Pembayaran Dikonfirmasi',
    settlement: 'Pembayaran Berhasil',
    deny: 'Pembayaran Ditolak',
    expire: 'Pembayaran Kadaluarsa',
    cancel: 'Pembayaran Dibatalkan',
    refund: 'Pengembalian Dana',
    partial_refund: 'Pengembalian Sebagian',
    chargeback: 'Chargeback',
    partial_chargeback: 'Chargeback Sebagian',
    authorize: 'Otorisasi',
  };

  return labels[status] || status;
}

/**
 * Get order status label in Bahasa Indonesia
 */
export function getOrderStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Draft',
    pending: 'Menunggu Konfirmasi',
    processing: 'Diproses',
    awaiting_shipment: 'Menunggu Pengiriman',
    shipped: 'Dikirim',
    delivered: 'Terkirim',
    cancelled: 'Dibatalkan',
  };

  return labels[status] || status;
}
