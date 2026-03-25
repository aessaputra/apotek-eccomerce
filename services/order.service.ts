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
      image_url: string | null;
      price: number;
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
    full_address: string;
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
            image_url,
            price
          )
        ),
        profiles (full_name, phone_number),
        addresses (id, receiver_name, phone_number, full_address)
      `,
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: toUserError(error, DATABASE_ERROR_MESSAGE) };
    }

    return { data: data as unknown as OrderWithItems[], error: null };
  } catch (error) {
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
            image_url,
            price
          )
        ),
        profiles (full_name, phone_number),
        addresses (id, receiver_name, phone_number, full_address)
      `,
      )
      .eq('id', orderId)
      .single();

    if (error) {
      return { data: null, error: toUserError(error, DATABASE_ERROR_MESSAGE) };
    }

    return { data: data as unknown as OrderWithItems, error: null };
  } catch (error) {
    return { data: null, error: toUserError(error, DATABASE_ERROR_MESSAGE) };
  }
}

/**
 * Get payment status label in Bahasa Indonesia
 */
export function getPaymentStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Menunggu Pembayaran',
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
    processing: 'Diproses',
    awaiting_shipment: 'Menunggu Pengiriman',
    shipped: 'Dikirim',
    delivered: 'Terkirim',
    cancelled: 'Dibatalkan',
  };

  return labels[status] || status;
}
