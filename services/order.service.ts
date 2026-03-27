import { supabase } from './supabase.service';
import type { Database } from '@/types/supabase';

export type Order = Database['public']['Tables']['orders']['Row'];
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
  data: OrderWithItems[] | null;
  error: Error | null;
}

export interface OrderDetailResult {
  data: OrderWithItems | null;
  error: Error | null;
}

const DATABASE_ERROR_MESSAGE = 'Gagal memuat data pesanan. Silakan coba lagi.';

function logSupabaseError(context: string, error: unknown): void {
  if (!__DEV__) {
    return;
  }

  if (error instanceof Error) {
    console.error(`[order.service] ${context}:`, {
      message: error.message,
      name: error.name,
      stack: error.stack?.split('\n').slice(0, 3).join('\n'),
    });
  } else {
    console.error(`[order.service] ${context}:`, error);
  }
}

function toUserError(error: unknown, fallback: string): Error {
  if (error instanceof Error) {
    return error;
  }
  return new Error(fallback);
}

/**
 * Get all orders for a user, sorted by creation date (newest first)
 */
export async function getUserOrders(userId: string): Promise<OrderListResult> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(
        `
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
      `,
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      logSupabaseError('getUserOrders query failed', error);
      return { data: null, error: toUserError(error, DATABASE_ERROR_MESSAGE) };
    }

    return { data: data as unknown as OrderWithItems[], error: null };
  } catch (error) {
    logSupabaseError('getUserOrders unexpected error', error);
    return { data: null, error: toUserError(error, DATABASE_ERROR_MESSAGE) };
  }
}

/**
 * Get a single order by ID with full details
 */
export async function getOrderById(orderId: string): Promise<OrderDetailResult> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(
        `
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
      `,
      )
      .eq('id', orderId)
      .single();

    if (error) {
      logSupabaseError('getOrderById query failed', error);
      return { data: null, error: toUserError(error, DATABASE_ERROR_MESSAGE) };
    }

    return { data: data as unknown as OrderWithItems, error: null };
  } catch (error) {
    logSupabaseError('getOrderById unexpected error', error);
    return { data: null, error: toUserError(error, DATABASE_ERROR_MESSAGE) };
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
