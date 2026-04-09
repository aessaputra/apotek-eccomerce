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
  expired_at,
  midtrans_order_id,
  gross_amount,
  total_amount,
  courier_code,
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
      slug,
      product_images (
        url,
        sort_order
      )
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
  product_images?: {
    url: string;
    sort_order: number;
  }[];
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
  expired_at: string | null;
  midtrans_order_id: string | null;
  gross_amount: number | null;
  total_amount: number;
  courier_code: string | null;
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

export interface OrderTabCounts {
  unpaid: number;
  packing: number;
  shipped: number;
  completed: number;
}

export type OrderStatusVariant = 'success' | 'warning' | 'danger' | 'primary' | 'neutral';

export interface OrderStatusDisplay {
  label: string;
  variant: OrderStatusVariant;
}

export const UNPAID_ORDER_STATUSES = ['pending'] as const;
export const UNPAID_PAYMENT_STATUSES = ['pending', 'authorize'] as const;
export const PACKING_ORDER_STATUSES = ['paid', 'processing', 'awaiting_shipment'] as const;
export const SHIPPED_ORDER_STATUSES = ['shipped', 'in_transit'] as const;
export const COMPLETED_ORDER_STATUSES = ['delivered'] as const;

export interface GetUserOrdersParams {
  offset?: number;
  limit?: number;
  signal?: AbortSignal;
  paymentStatus?: 'pending' | 'settlement' | 'deny' | 'expire' | 'cancel' | 'authorize';
  paymentStatuses?: ('pending' | 'settlement' | 'deny' | 'expire' | 'cancel' | 'authorize')[];
  orderStatus?: string;
  orderStatuses?: string[];
}

const DATABASE_ERROR_MESSAGE = 'Gagal memuat data pesanan. Silakan coba lagi.';
const FAILED_PAYMENT_STATES = ['deny', 'expire', 'cancel'];
const SUCCESS_PAYMENT_STATES = ['settlement'];
const REFUND_STATES = ['refund', 'partial_refund', 'chargeback', 'partial_chargeback'];

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

async function countOrdersByFilters(
  userId: string,
  params: Pick<
    GetUserOrdersParams,
    'paymentStatus' | 'paymentStatuses' | 'orderStatus' | 'orderStatuses'
  >,
): Promise<number> {
  let query = supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (params.paymentStatuses && params.paymentStatuses.length > 0) {
    query = query.in(
      'payment_status',
      params.paymentStatuses as Database['public']['Enums']['payment_status'][],
    );
  } else if (params.paymentStatus) {
    query = query.eq(
      'payment_status',
      params.paymentStatus as Database['public']['Enums']['payment_status'],
    );
  }

  if (params.orderStatuses && params.orderStatuses.length > 0) {
    query = query.in('status', params.orderStatuses);
  } else if (params.orderStatus) {
    query = query.eq('status', params.orderStatus);
  }

  const { count, error } = await query;

  if (error) {
    throw error;
  }

  return count ?? 0;
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

  if (__DEV__) {
    console.log('[order.service] getOrdersOptimized start', {
      userId,
      offset,
      pageSize,
      fetchLimit,
      paymentStatus: params.paymentStatus ?? null,
      paymentStatuses: params.paymentStatuses ?? null,
      orderStatus: params.orderStatus ?? null,
      orderStatuses: params.orderStatuses ?? null,
      hasSignal: Boolean(params.signal),
      select: ORDER_LIST_SELECT,
    });
  }

  try {
    const data = await withRetry(
      async () => {
        let query = supabase
          .from('orders')
          .select(ORDER_LIST_SELECT)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .range(offset, offset + fetchLimit - 1);

        if (params.paymentStatuses && params.paymentStatuses.length > 0) {
          query = query.in(
            'payment_status',
            params.paymentStatuses as Database['public']['Enums']['payment_status'][],
          );
        } else if (params.paymentStatus) {
          query = query.eq(
            'payment_status',
            params.paymentStatus as Database['public']['Enums']['payment_status'],
          );
        }

        if (params.orderStatuses && params.orderStatuses.length > 0) {
          query = query.in('status', params.orderStatuses);
        } else if (params.orderStatus) {
          query = query.eq('status', params.orderStatus);
        }

        if (__DEV__) {
          console.log('[order.service] executing orders query', {
            userId,
            offset,
            fetchLimit,
            paymentStatus: params.paymentStatus ?? null,
            paymentStatuses: params.paymentStatuses ?? null,
            orderStatus: params.orderStatus ?? null,
            orderStatuses: params.orderStatuses ?? null,
          });
        }

        const queryWithSignal = withAbortSignal(query, params.signal);

        const { data: rows, error } = await queryWithSignal;

        if (__DEV__) {
          console.log('[order.service] orders query completed', {
            userId,
            offset,
            rowCount: rows?.length ?? 0,
            hasError: Boolean(error),
            errorMessage: error?.message ?? null,
            errorCode: error?.code ?? null,
            errorDetails: error?.details ?? null,
            errorHint: error?.hint ?? null,
          });
        }

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

    if (__DEV__) {
      console.log('[order.service] getOrdersOptimized success', {
        userId,
        offset,
        returnedCount: normalizedData.length,
        hasMore,
        durationMs: fetchedAt - startedAt,
      });
    }

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
    if (__DEV__) {
      console.log('[order.service] getOrdersOptimized caught error', {
        userId,
        offset,
        paymentStatus: params.paymentStatus ?? null,
        error,
      });
    }

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

export async function getOrderTabCounts(
  userId: string,
): Promise<{ data: OrderTabCounts | null; error: Error | null }> {
  try {
    const [unpaid, packing, shipped, completed] = await Promise.all([
      countOrdersByFilters(userId, {
        orderStatuses: [...UNPAID_ORDER_STATUSES],
        paymentStatuses: [...UNPAID_PAYMENT_STATUSES],
      }),
      countOrdersByFilters(userId, { orderStatuses: [...PACKING_ORDER_STATUSES] }),
      countOrdersByFilters(userId, { orderStatuses: [...SHIPPED_ORDER_STATUSES] }),
      countOrdersByFilters(userId, { orderStatuses: [...COMPLETED_ORDER_STATUSES] }),
    ]);

    return {
      data: {
        unpaid,
        packing,
        shipped,
        completed,
      },
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: normalizeSupabaseError(error, 'Gagal memuat jumlah pesanan.'),
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
    pending: 'Menunggu Pembayaran',
    paid: 'Diproses',
    processing: 'Diproses',
    awaiting_shipment: 'Dikemas',
    shipped: 'Dikirim',
    in_transit: 'Dalam Pengiriman',
    delivered: 'Terkirim',
    cancelled: 'Dibatalkan',
  };

  return labels[status] || status;
}

export function getOrderStatusDisplay(status: string): OrderStatusDisplay {
  const displays: Record<string, OrderStatusDisplay> = {
    draft: { label: 'Draft', variant: 'neutral' },
    pending: { label: 'Menunggu Pembayaran', variant: 'warning' },
    paid: { label: 'Diproses', variant: 'primary' },
    processing: { label: 'Diproses', variant: 'primary' },
    awaiting_shipment: { label: 'Dikemas', variant: 'primary' },
    shipped: { label: 'Dikirim', variant: 'primary' },
    in_transit: { label: 'Dalam Pengiriman', variant: 'primary' },
    delivered: { label: 'Terkirim', variant: 'success' },
    cancelled: { label: 'Dibatalkan', variant: 'danger' },
  };

  return (
    displays[status] || {
      label: getOrderStatusLabel(status),
      variant: 'neutral',
    }
  );
}

export function getOrderPrimaryStatusDisplay(
  orderStatus: string,
  paymentStatus: string,
  expiredAt?: string | null,
): OrderStatusDisplay {
  if (paymentStatus === 'pending') {
    const isExpired = expiredAt && new Date(expiredAt) < new Date();

    if (isExpired) {
      return { label: 'Pembayaran Kadaluarsa', variant: 'danger' };
    }

    return { label: 'Menunggu Pembayaran', variant: 'warning' };
  }

  if (FAILED_PAYMENT_STATES.includes(paymentStatus)) {
    return { label: getPaymentStatusLabel(paymentStatus), variant: 'danger' };
  }

  if (REFUND_STATES.includes(paymentStatus)) {
    return { label: getPaymentStatusLabel(paymentStatus), variant: 'warning' };
  }

  if (SUCCESS_PAYMENT_STATES.includes(paymentStatus)) {
    return getOrderStatusDisplay(orderStatus);
  }

  return getOrderStatusDisplay(orderStatus);
}

export function getOrderSecondaryStatusDisplay(
  orderStatus: string,
  paymentStatus: string,
): string | null {
  if (paymentStatus === 'pending' && orderStatus === 'pending') {
    return null;
  }

  if (FAILED_PAYMENT_STATES.includes(paymentStatus)) {
    return null;
  }

  if (SUCCESS_PAYMENT_STATES.includes(paymentStatus)) {
    return `Pembayaran: ${getPaymentStatusLabel(paymentStatus)}`;
  }

  return null;
}
