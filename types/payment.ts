import type { Database } from '@/types/supabase';

export interface PaymentResult {
  status: 'success' | 'pending' | 'cancel' | 'error';
  message?: string;
}

export interface CheckoutTokenResponse {
  snapToken: string;
  redirectUrl: string;
}

export interface PaymentStatus {
  orderId: string;
  status: Database['public']['Enums']['payment_status'];
}
