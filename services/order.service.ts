import { supabase } from './supabase.service';
import type { Database, Tables } from '@/types/supabase';
import { classifyError, isRetryableError, translateErrorMessage } from '@/utils/error';
import { withRetry } from '@/utils/retry';

type PaymentStatus = Database['public']['Enums']['payment_status'];
export type CustomerCompletionStage = 'not_applicable' | 'awaiting_customer' | 'completed';
export type CustomerOrderBucket = 'unpaid' | 'packing' | 'shipped' | 'completed';

export interface Order {
  id: string;
  user_id: string | null;
  total_amount: number;
  status: string;
  shipping_address_id: string | null;
  created_at: string;
  shipping_cost: number | null;
  updated_at: string | null;
  delivered_at: string | null;
  complaint_window_expires_at: string | null;
  customer_completed_at: string | null;
  customer_completion_stage: CustomerCompletionStage | null;
  customer_order_bucket: CustomerOrderBucket | null;
  expired_at: string | null;
  payment_status: string;
  midtrans_order_id: string | null;
  gross_amount: number | null;
  courier_code: string | null;
  courier_service: string | null;
  shipping_etd: string | null;
  waybill_number: string | null;
  snap_redirect_url: string | null;
}
export const ORDERS_PAGE_SIZE = 20;
export const ORDERS_CACHE_TTL_MS = 5 * 60 * 1000;

const ORDER_READ_MODEL_SELECT = `
  id,
  created_at,
  total_amount,
  user_id,
  shipping_address_id,
  shipping_cost,
  updated_at,
  delivered_at,
  complaint_window_expires_at,
  customer_completed_at,
  customer_completion_stage,
  customer_order_bucket,
  status,
  payment_status,
  midtrans_order_id,
  gross_amount,
  expired_at,
  courier_code,
  courier_service,
  shipping_etd,
  waybill_number,
  snap_redirect_url
`;

const ORDER_ITEM_LIST_SELECT = `
  id,
  order_id,
  product_id,
  quantity,
  price_at_purchase,
  created_at
`;

const ORDER_ITEM_DETAIL_SELECT = `
  id,
  order_id,
  product_id,
  quantity,
  price_at_purchase,
  created_at
`;

type OrderReadModelRow = Tables<'order_read_model'>;
type AddressRow = Tables<'addresses'>;
type ProductRow = Tables<'products'>;
type ProductImageRow = Tables<'product_images'>;

export interface PaymentRelationRow {
  status: PaymentStatus;
  midtrans_order_id: string | null;
  gross_amount: number;
  expiry_time: string | null;
  redirect_url: string | null;
  updated_at: string;
  created_at: string;
}

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

interface OrderItemBaseRow {
  id: string;
  order_id: string;
  product_id: string | null;
  quantity: number;
  price_at_purchase: number;
  created_at: string;
}

interface OrderDetailProduct {
  id: string;
  name: string;
  price: number;
  slug: string;
  weight: number;
  product_images: { url: string; sort_order: number }[];
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
  customer_completion_stage: CustomerCompletionStage | null;
  customer_order_bucket: CustomerOrderBucket | null;
  order_items: OrderListOrderItem[];
}

export interface OrderWithItems extends Order {
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
    address_note: string | null;
    city: string;
    province: string | null;
    postal_code: string;
  } | null;
}

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
export const UNPAID_PAYMENT_STATUSES = ['pending'] as const;
export const HISTORY_PAYMENT_STATUSES = ['expire', 'cancel', 'deny'] as const;
export const PACKING_ORDER_STATUSES = ['processing', 'awaiting_shipment'] as const;
export const SHIPPED_ORDER_STATUSES = ['shipped', 'in_transit'] as const;
export const COMPLETED_ORDER_STATUSES = ['delivered'] as const;

export interface GetUserOrdersParams {
  offset?: number;
  limit?: number;
  signal?: AbortSignal;
  paymentStatus?: PaymentStatus;
  paymentStatuses?: PaymentStatus[];
  customerOrderBucket?: CustomerOrderBucket;
  customerOrderBuckets?: CustomerOrderBucket[];
  orderStatus?: string;
  orderStatuses?: string[];
  excludeExpiredPending?: boolean;
  includeExpiredPendingInHistory?: boolean;
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
    if (error.name === 'AbortError') {
      return true;
    }

    const message = error.message.trim().toLowerCase();
    return message.includes('aborted') || message.includes('abort');
  }

  if (!error || typeof error !== 'object') {
    return false;
  }

  const { name, code } = error as ErrorLike;
  if (
    (typeof name === 'string' && name === 'AbortError') ||
    (typeof code === 'string' && code === 'ABORT_ERR')
  ) {
    return true;
  }

  const nestedMessage = getNestedErrorMessage(error).trim().toLowerCase();
  return nestedMessage.includes('aborted') || nestedMessage.includes('abort');
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

function getComparableTimestamp(value: string | null | undefined): number {
  if (!value) {
    return 0;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function sortByLatestActivityDesc<
  T extends { updated_at?: string | null; created_at?: string | null },
>(rows: T[] | null | undefined): T[] {
  return [...(rows ?? [])].sort((left, right) => {
    const rightTimestamp = Math.max(
      getComparableTimestamp(right.updated_at),
      getComparableTimestamp(right.created_at),
    );
    const leftTimestamp = Math.max(
      getComparableTimestamp(left.updated_at),
      getComparableTimestamp(left.created_at),
    );

    return rightTimestamp - leftTimestamp;
  });
}

function getLatestPayment(
  payments: PaymentRelationRow[] | null | undefined,
): PaymentRelationRow | null {
  return sortByLatestActivityDesc(payments)[0] ?? null;
}

export function getCanonicalPaymentStatus(
  payments: PaymentRelationRow[] | null | undefined,
): PaymentStatus | 'pending' {
  return getLatestPayment(payments)?.status ?? 'pending';
}

function normalizeOrderReadModelRow(row: OrderReadModelRow): Order {
  return {
    id: row.id ?? '',
    user_id: row.user_id,
    total_amount: row.total_amount ?? 0,
    status: row.status ?? 'pending',
    shipping_address_id: row.shipping_address_id,
    created_at: row.created_at ?? '',
    shipping_cost: row.shipping_cost,
    updated_at: row.updated_at,
    delivered_at: row.delivered_at,
    complaint_window_expires_at: row.complaint_window_expires_at,
    customer_completed_at: row.customer_completed_at,
    customer_completion_stage: row.customer_completion_stage as CustomerCompletionStage | null,
    customer_order_bucket: row.customer_order_bucket as CustomerOrderBucket | null,
    expired_at: row.expired_at,
    payment_status: row.payment_status ?? 'pending',
    midtrans_order_id: row.midtrans_order_id,
    gross_amount: row.gross_amount,
    courier_code: row.courier_code,
    courier_service: row.courier_service,
    shipping_etd: row.shipping_etd,
    waybill_number: row.waybill_number,
    snap_redirect_url: row.snap_redirect_url,
  };
}

function normalizeOrderListRow(
  row: OrderReadModelRow,
  orderItems: OrderListOrderItem[],
): OrderListItem {
  const normalized = normalizeOrderReadModelRow(row);
  return {
    id: normalized.id,
    created_at: normalized.created_at,
    expired_at: normalized.expired_at,
    midtrans_order_id: normalized.midtrans_order_id,
    gross_amount: normalized.gross_amount,
    total_amount: normalized.total_amount,
    courier_code: normalized.courier_code,
    courier_service: normalized.courier_service,
    payment_status: normalized.payment_status,
    status: normalized.status,
    customer_completion_stage: normalized.customer_completion_stage,
    customer_order_bucket: normalized.customer_order_bucket,
    order_items: orderItems,
  };
}

function normalizeOrderDetailRow(
  row: OrderReadModelRow,
  orderItems: OrderWithItems['order_items'],
  address: AddressRow | null,
): OrderWithItems {
  const normalized = normalizeOrderReadModelRow(row);
  return {
    ...normalized,
    order_items: orderItems,
    profiles: null,
    addresses: address
      ? {
          id: address.id,
          receiver_name: address.receiver_name,
          phone_number: address.phone_number,
          street_address: address.street_address,
          address_note: address.address_note,
          city: address.city,
          province: address.province,
          postal_code: address.postal_code,
        }
      : null,
  };
}

async function fetchOrderListItems(orderIds: string[]): Promise<Map<string, OrderListOrderItem[]>> {
  const groupedItems = new Map<string, OrderListOrderItem[]>();

  if (orderIds.length === 0) {
    return groupedItems;
  }

  const { data, error } = await supabase
    .from('order_items')
    .select(ORDER_ITEM_LIST_SELECT)
    .in('order_id', orderIds)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  const rawItems = (data ?? []) as OrderItemBaseRow[];
  const productIds = rawItems.flatMap(item => (item.product_id ? [item.product_id] : []));
  const productsById = await fetchProductsById(productIds);

  for (const item of rawItems) {
    const existing = groupedItems.get(item.order_id) ?? [];
    existing.push({
      id: item.id,
      order_id: item.order_id,
      product_id: item.product_id,
      quantity: item.quantity,
      price_at_purchase: item.price_at_purchase,
      products: item.product_id ? (productsById.get(item.product_id) ?? null) : null,
    });
    groupedItems.set(item.order_id, existing);
  }

  return groupedItems;
}

async function fetchOrderDetailItems(orderId: string): Promise<OrderWithItems['order_items']> {
  const { data, error } = await supabase
    .from('order_items')
    .select(ORDER_ITEM_DETAIL_SELECT)
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  const rawItems = (data ?? []) as OrderItemBaseRow[];
  const productIds = rawItems.flatMap(item => (item.product_id ? [item.product_id] : []));
  const productsById = await fetchDetailedProductsById(productIds);

  return rawItems.map(item => ({
    id: item.id,
    order_id: item.order_id,
    product_id: item.product_id,
    quantity: item.quantity,
    price_at_purchase: item.price_at_purchase,
    products: item.product_id ? (productsById.get(item.product_id) ?? null) : null,
  }));
}

async function fetchShippingAddress(addressId: string | null): Promise<AddressRow | null> {
  if (!addressId) {
    return null;
  }

  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .eq('id', addressId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as AddressRow | null) ?? null;
}

async function fetchProductsById(productIds: string[]): Promise<Map<string, OrderListProduct>> {
  const uniqueProductIds = [...new Set(productIds)];
  const productMap = new Map<string, OrderListProduct>();

  if (uniqueProductIds.length === 0) {
    return productMap;
  }

  const [{ data: products, error: productError }, { data: images, error: imageError }] =
    await Promise.all([
      supabase.from('products').select('id, name, slug').in('id', uniqueProductIds),
      supabase
        .from('product_images')
        .select('product_id, url, sort_order')
        .in('product_id', uniqueProductIds),
    ]);

  if (productError) {
    throw productError;
  }

  if (imageError) {
    throw imageError;
  }

  const imagesByProductId = new Map<string, { url: string; sort_order: number }[]>();
  for (const image of (images ?? []) as Pick<
    ProductImageRow,
    'product_id' | 'url' | 'sort_order'
  >[]) {
    const existing = imagesByProductId.get(image.product_id) ?? [];
    existing.push({ url: image.url, sort_order: image.sort_order });
    imagesByProductId.set(image.product_id, existing);
  }

  for (const product of (products ?? []) as Pick<ProductRow, 'id' | 'name' | 'slug'>[]) {
    productMap.set(product.id, {
      id: product.id,
      name: product.name,
      slug: product.slug,
      product_images: [...(imagesByProductId.get(product.id) ?? [])].sort(
        (left, right) => left.sort_order - right.sort_order,
      ),
    });
  }

  return productMap;
}

async function fetchDetailedProductsById(
  productIds: string[],
): Promise<Map<string, OrderDetailProduct>> {
  const uniqueProductIds = [...new Set(productIds)];
  const productMap = new Map<string, OrderDetailProduct>();

  if (uniqueProductIds.length === 0) {
    return productMap;
  }

  const [{ data: products, error: productError }, { data: images, error: imageError }] =
    await Promise.all([
      supabase.from('products').select('id, name, price, slug, weight').in('id', uniqueProductIds),
      supabase
        .from('product_images')
        .select('product_id, url, sort_order')
        .in('product_id', uniqueProductIds),
    ]);

  if (productError) {
    throw productError;
  }

  if (imageError) {
    throw imageError;
  }

  const imagesByProductId = new Map<string, { url: string; sort_order: number }[]>();
  for (const image of (images ?? []) as Pick<
    ProductImageRow,
    'product_id' | 'url' | 'sort_order'
  >[]) {
    const existing = imagesByProductId.get(image.product_id) ?? [];
    existing.push({ url: image.url, sort_order: image.sort_order });
    imagesByProductId.set(image.product_id, existing);
  }

  for (const product of (products ?? []) as Pick<
    ProductRow,
    'id' | 'name' | 'price' | 'slug' | 'weight'
  >[]) {
    productMap.set(product.id, {
      id: product.id,
      name: product.name,
      price: product.price,
      slug: product.slug,
      weight: product.weight,
      product_images: [...(imagesByProductId.get(product.id) ?? [])].sort(
        (left, right) => left.sort_order - right.sort_order,
      ),
    });
  }

  return productMap;
}

async function fetchPastPurchaseProductsById(productIds: string[]): Promise<
  Map<
    string,
    {
      id: string;
      name: string;
      price: number;
      slug: string;
      is_active: boolean | null;
      stock: number;
      product_images: { url: string; sort_order: number }[];
    }
  >
> {
  const uniqueProductIds = [...new Set(productIds)];
  const productMap = new Map<
    string,
    {
      id: string;
      name: string;
      price: number;
      slug: string;
      is_active: boolean | null;
      stock: number;
      product_images: { url: string; sort_order: number }[];
    }
  >();

  if (uniqueProductIds.length === 0) {
    return productMap;
  }

  const [{ data: products, error: productError }, { data: images, error: imageError }] =
    await Promise.all([
      supabase
        .from('products')
        .select('id, name, price, slug, is_active, stock')
        .in('id', uniqueProductIds),
      supabase
        .from('product_images')
        .select('product_id, url, sort_order')
        .in('product_id', uniqueProductIds),
    ]);

  if (productError) {
    throw productError;
  }

  if (imageError) {
    throw imageError;
  }

  const imagesByProductId = new Map<string, { url: string; sort_order: number }[]>();
  for (const image of (images ?? []) as Pick<
    ProductImageRow,
    'product_id' | 'url' | 'sort_order'
  >[]) {
    const existing = imagesByProductId.get(image.product_id) ?? [];
    existing.push({ url: image.url, sort_order: image.sort_order });
    imagesByProductId.set(image.product_id, existing);
  }

  for (const product of (products ?? []) as Pick<
    ProductRow,
    'id' | 'name' | 'price' | 'slug' | 'is_active' | 'stock'
  >[]) {
    productMap.set(product.id, {
      ...product,
      product_images: [...(imagesByProductId.get(product.id) ?? [])].sort(
        (left, right) => left.sort_order - right.sort_order,
      ),
    });
  }

  return productMap;
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
    | 'customerOrderBucket'
    | 'customerOrderBuckets'
    | 'paymentStatus'
    | 'paymentStatuses'
    | 'orderStatus'
    | 'orderStatuses'
    | 'excludeExpiredPending'
    | 'includeExpiredPendingInHistory'
  >,
): Promise<number> {
  const hasPaymentFilter = Boolean(
    (params.paymentStatuses && params.paymentStatuses.length > 0) || params.paymentStatus,
  );

  if (!hasPaymentFilter) {
    let query = supabase
      .from('order_read_model')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (params.orderStatuses && params.orderStatuses.length > 0) {
      query = query.in('status', params.orderStatuses);
    } else if (params.orderStatus) {
      query = query.eq('status', params.orderStatus);
    }

    if (params.customerOrderBuckets && params.customerOrderBuckets.length > 0) {
      query = query.in('customer_order_bucket', params.customerOrderBuckets);
    } else if (params.customerOrderBucket) {
      query = query.eq('customer_order_bucket', params.customerOrderBucket);
    }

    if (params.excludeExpiredPending) {
      query = query.or(`expired_at.is.null,expired_at.gt.${new Date().toISOString()}`);
    }

    const { count, error } = await query;

    if (error) {
      throw error;
    }

    return count ?? 0;
  }

  let query = supabase
    .from('order_read_model')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (params.orderStatuses && params.orderStatuses.length > 0) {
    query = query.in('status', params.orderStatuses);
  } else if (params.orderStatus) {
    query = query.eq('status', params.orderStatus);
  }

  if (params.customerOrderBuckets && params.customerOrderBuckets.length > 0) {
    query = query.in('customer_order_bucket', params.customerOrderBuckets);
  } else if (params.customerOrderBucket) {
    query = query.eq('customer_order_bucket', params.customerOrderBucket);
  }

  if (params.paymentStatuses && params.paymentStatuses.length > 0) {
    if (params.includeExpiredPendingInHistory) {
      query = query.or(
        `payment_status.in.(${params.paymentStatuses.join(',')}),and(status.eq.pending,payment_status.eq.pending,expired_at.lt.${new Date().toISOString()})`,
      );
    } else {
      query = query.in('payment_status', params.paymentStatuses);
    }
  } else if (params.paymentStatus) {
    query = query.eq('payment_status', params.paymentStatus);
  }

  if (params.excludeExpiredPending) {
    query = query.or(`expired_at.is.null,expired_at.gt.${new Date().toISOString()}`);
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
      select: ORDER_READ_MODEL_SELECT,
    });
  }

  try {
    const data = await withRetry(
      async () => {
        let query = supabase
          .from('order_read_model')
          .select(ORDER_READ_MODEL_SELECT)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .range(offset, offset + fetchLimit - 1);

        if (params.paymentStatuses && params.paymentStatuses.length > 0) {
          if (params.includeExpiredPendingInHistory) {
            query = query.or(
              `payment_status.in.(${params.paymentStatuses.join(',')}),and(status.eq.pending,payment_status.eq.pending,expired_at.lt.${new Date().toISOString()})`,
            );
          } else {
            query = query.in('payment_status', params.paymentStatuses);
          }
        } else if (params.paymentStatus) {
          query = query.eq('payment_status', params.paymentStatus);
        }

        if (params.orderStatuses && params.orderStatuses.length > 0) {
          query = query.in('status', params.orderStatuses);
        } else if (params.orderStatus) {
          query = query.eq('status', params.orderStatus);
        }

        if (params.customerOrderBuckets && params.customerOrderBuckets.length > 0) {
          query = query.in('customer_order_bucket', params.customerOrderBuckets);
        } else if (params.customerOrderBucket) {
          query = query.eq('customer_order_bucket', params.customerOrderBucket);
        }

        if (params.excludeExpiredPending) {
          query = query.or(`expired_at.is.null,expired_at.gt.${new Date().toISOString()}`);
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

        const normalizedRows = ((rows ?? []) as OrderReadModelRow[]).filter(
          row => row.id && row.created_at && row.status,
        );
        const orderIds = normalizedRows.flatMap(row => (row.id ? [row.id] : []));
        const orderItemsByOrderId = await fetchOrderListItems(orderIds);

        return normalizedRows.map(row =>
          normalizeOrderListRow(row, orderItemsByOrderId.get(row.id ?? '') ?? []),
        );
      },
      {
        maxRetries: 2,
        baseDelay: 250,
        maxDelay: 1000,
        shouldRetry: error => !isAbortError(error) && isRetryableError(classifyError(error)),
      },
    );

    const rows = data ?? [];

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
      countOrdersByFilters(userId, { customerOrderBucket: 'unpaid' }),
      countOrdersByFilters(userId, { customerOrderBucket: 'packing' }),
      countOrdersByFilters(userId, { customerOrderBucket: 'shipped' }),
      countOrdersByFilters(userId, { customerOrderBucket: 'completed' }),
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
      .from('order_read_model')
      .select(ORDER_READ_MODEL_SELECT)
      .eq('id', orderId)
      .single();

    if (error) {
      logSupabaseError('getOrderById query failed', error);
      return { data: null, error: normalizeSupabaseError(error, DATABASE_ERROR_MESSAGE) };
    }

    const normalizedRow = data as OrderReadModelRow;
    const [orderItems, address] = await Promise.all([
      fetchOrderDetailItems(orderId),
      fetchShippingAddress(normalizedRow.shipping_address_id),
    ]);

    return { data: normalizeOrderDetailRow(normalizedRow, orderItems, address), error: null };
  } catch (error) {
    logSupabaseError('getOrderById unexpected error', error);
    return { data: null, error: normalizeSupabaseError(error, DATABASE_ERROR_MESSAGE) };
  }
}

export interface ConfirmOrderReceivedResult {
  data: {
    order_id: string;
    status: string;
    customer_completion_stage: CustomerCompletionStage;
    customer_completed_at: string | null;
  } | null;
  error: Error | null;
}

export async function confirmOrderReceived(orderId: string): Promise<ConfirmOrderReceivedResult> {
  const normalizedOrderId = orderId.trim();

  if (!normalizedOrderId) {
    return { data: null, error: new Error('Order ID is required.') };
  }

  try {
    const { data, error } = await supabase.functions.invoke('confirm-order-received', {
      body: { order_id: normalizedOrderId },
    });

    if (error) {
      return {
        data: null,
        error: normalizeSupabaseError(error, 'Gagal mengonfirmasi penerimaan pesanan.'),
      };
    }

    const resultData =
      data && typeof data === 'object' && 'data' in data
        ? ((data as { data?: ConfirmOrderReceivedResult['data'] }).data ?? null)
        : null;

    return {
      data: resultData,
      error: null,
    };
  } catch (error) {
    logSupabaseError('confirmOrderReceived unexpected error', error);
    return {
      data: null,
      error: normalizeSupabaseError(error, 'Gagal mengonfirmasi penerimaan pesanan.'),
    };
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
export function getOrderStatusLabel(
  status: string,
  customerCompletionStage: CustomerCompletionStage | null = 'completed',
): string {
  const labels: Record<string, string> = {
    draft: 'Draft',
    pending: 'Menunggu Pembayaran',
    paid: 'Diproses',
    processing: 'Diproses',
    awaiting_shipment: 'Siap Dikirim',
    shipped: 'Diserahkan ke Kurir',
    in_transit: 'Dalam Perjalanan',
    delivered: customerCompletionStage === 'completed' ? 'Selesai' : 'Terkirim',
    cancelled: 'Dibatalkan',
  };

  return labels[status] || status;
}

export function getOrderStatusDisplay(
  status: string,
  customerCompletionStage: CustomerCompletionStage | null = 'completed',
): OrderStatusDisplay {
  const displays: Record<string, OrderStatusDisplay> = {
    draft: { label: 'Draft', variant: 'neutral' },
    pending: { label: 'Menunggu Pembayaran', variant: 'warning' },
    paid: { label: 'Diproses', variant: 'primary' },
    processing: { label: 'Diproses', variant: 'primary' },
    awaiting_shipment: { label: 'Siap Dikirim', variant: 'primary' },
    shipped: { label: 'Diserahkan ke Kurir', variant: 'primary' },
    in_transit: { label: 'Dalam Perjalanan', variant: 'primary' },
    delivered:
      customerCompletionStage === 'completed'
        ? { label: 'Selesai', variant: 'success' }
        : { label: 'Terkirim', variant: 'primary' },
    cancelled: { label: 'Dibatalkan', variant: 'danger' },
  };

  return (
    displays[status] || {
      label: getOrderStatusLabel(status, customerCompletionStage),
      variant: 'neutral',
    }
  );
}

export function isBackendExpired(expiredAt: string | null | undefined): boolean {
  if (!expiredAt) return false;
  return new Date(expiredAt) < new Date();
}

export function getOrderPrimaryStatusDisplay(
  orderStatus: string,
  paymentStatus: string,
  expiredAt?: string | null,
  customerCompletionStage?: CustomerCompletionStage | null,
): OrderStatusDisplay {
  if (paymentStatus === 'pending') {
    const isExpired = isBackendExpired(expiredAt);

    if (isExpired) {
      return { label: 'Pembayaran Kadaluarsa', variant: 'danger' };
    }

    return { label: 'Menunggu Pembayaran', variant: 'warning' };
  }

  if (orderStatus === 'cancelled') {
    return getOrderStatusDisplay(orderStatus);
  }

  if (FAILED_PAYMENT_STATES.includes(paymentStatus)) {
    return { label: getPaymentStatusLabel(paymentStatus), variant: 'danger' };
  }

  if (REFUND_STATES.includes(paymentStatus)) {
    return { label: getPaymentStatusLabel(paymentStatus), variant: 'warning' };
  }

  return getOrderStatusDisplay(orderStatus, customerCompletionStage);
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
    return getPaymentStatusLabel(paymentStatus);
  }

  return null;
}

export interface PastPurchaseProduct {
  id: string;
  name: string;
  price: number;
  slug: string;
  imageUrl: string | null;
}

const PAST_PURCHASE_LIMIT = 10;

const PAST_PURCHASE_ITEM_SELECT = `
  id,
  order_id,
  product_id,
  created_at
`;

interface PastPurchaseRow {
  order_id: string;
  product_id: string | null;
  created_at: string;
}

export async function getPastPurchasedProducts(
  userId: string,
): Promise<{ data: PastPurchaseProduct[]; error: Error | null }> {
  const normalizedUserId = userId.trim();

  if (!normalizedUserId) {
    return { data: [], error: new Error('User ID is required.') };
  }

  try {
    const { data: orderRows, error: orderError } = await supabase
      .from('order_read_model')
      .select('id, created_at')
      .eq('user_id', normalizedUserId)
      .eq('customer_order_bucket', 'completed')
      .eq('payment_status', 'settlement')
      .order('created_at', { ascending: false })
      .limit(50);

    if (orderError) {
      logSupabaseError('getPastPurchasedProducts query failed', orderError);
      return {
        data: [],
        error: normalizeSupabaseError(orderError, 'Gagal memuat produk yang pernah dibeli.'),
      };
    }

    const orderedIds = (
      (orderRows ?? []) as { id: string | null; created_at: string | null }[]
    ).flatMap(row => (row.id ? [row.id] : []));

    if (orderedIds.length === 0) {
      return { data: [], error: null };
    }

    const { data, error } = await supabase
      .from('order_items')
      .select(PAST_PURCHASE_ITEM_SELECT)
      .in('order_id', orderedIds)
      .order('created_at', { ascending: false });

    if (error) {
      logSupabaseError('getPastPurchasedProducts items query failed', error);
      return {
        data: [],
        error: normalizeSupabaseError(error, 'Gagal memuat produk yang pernah dibeli.'),
      };
    }

    const orderRank = new Map(orderedIds.map((orderId, index) => [orderId, index]));
    const rows = ((data ?? []) as PastPurchaseRow[]).sort((left, right) => {
      const orderDiff =
        (orderRank.get(left.order_id) ?? Number.MAX_SAFE_INTEGER) -
        (orderRank.get(right.order_id) ?? Number.MAX_SAFE_INTEGER);

      if (orderDiff !== 0) {
        return orderDiff;
      }

      return getComparableTimestamp(right.created_at) - getComparableTimestamp(left.created_at);
    });

    const seen = new Set<string>();
    const products: PastPurchaseProduct[] = [];
    const productIds = rows.flatMap(row => (row.product_id ? [row.product_id] : []));
    const purchasableProductsById = await fetchPastPurchaseProductsById(productIds);

    for (const row of rows) {
      if (!row.product_id) {
        continue;
      }

      if (seen.has(row.product_id)) {
        continue;
      }

      const product = purchasableProductsById.get(row.product_id);

      if (!product) {
        continue;
      }

      if (!product.is_active || product.stock <= 0) {
        continue;
      }

      seen.add(row.product_id);

      const sortedImages = [...product.product_images].sort((a, b) => a.sort_order - b.sort_order);

      products.push({
        id: product.id,
        name: product.name,
        price: product.price,
        slug: product.slug,
        imageUrl: sortedImages[0]?.url ?? null,
      });

      if (products.length >= PAST_PURCHASE_LIMIT) {
        break;
      }
    }

    return { data: products, error: null };
  } catch (error) {
    logSupabaseError('getPastPurchasedProducts unexpected error', error);
    return {
      data: [],
      error: normalizeSupabaseError(error, 'Gagal memuat produk yang pernah dibeli.'),
    };
  }
}
