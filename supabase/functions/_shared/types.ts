export type PaymentStatus =
  | 'pending'
  | 'settlement'
  | 'deny'
  | 'expire'
  | 'cancel'
  | 'refund'
  | 'partial_refund'
  | 'chargeback'
  | 'partial_chargeback'
  | 'authorize';

export interface MidtransWebhookPayload {
  transaction_time?: string;
  transaction_status: string;
  transaction_id?: string;
  status_message?: string;
  status_code: string;
  signature_key: string;
  payment_type?: string;
  order_id: string;
  merchant_id?: string;
  gross_amount: string;
  fraud_status?: string;
  currency?: string;
  approval_code?: string;
  masked_card?: string;
  channel_response_code?: string;
  channel_response_message?: string;
  card_type?: string;
  bank?: string;
  eci?: string;
  biller_code?: string;
  bill_key?: string;
  permata_va_number?: string;
  va_numbers?: Array<{ bank: string; va_number: string }>;
  payment_code?: string;
  store?: string;
  settlement_time?: string;
  expiry_time?: string;
  issuer?: string;
  acquirer?: string;
  redirect_url?: string;
}

export interface MidtransStatusResponse {
  status_code: string;
  status_message: string;
  transaction_id?: string;
  order_id: string;
  merchant_id?: string;
  gross_amount: string;
  currency?: string;
  payment_type?: string;
  transaction_time?: string;
  transaction_status: string;
  fraud_status?: string;
  approval_code?: string;
  signature_key?: string;
  bank?: string;
  biller_code?: string;
  bill_key?: string;
  permata_va_number?: string;
  va_numbers?: Array<{ bank: string; va_number: string }>;
  payment_code?: string;
  store?: string;
  settlement_time?: string;
  expiry_time?: string;
  issuer?: string;
  acquirer?: string;
  card_type?: string;
  masked_card?: string;
  eci?: string;
  channel_response_code?: string;
  channel_response_message?: string;
  redirect_url?: string;
}

export interface SnapItemDetail {
  id: string;
  price: number;
  quantity: number;
  name: string;
  brand?: string;
  category?: string;
  merchant_name?: string;
}

export interface SnapPayload {
  transaction_details: {
    order_id: string;
    gross_amount: number;
  };
  item_details: SnapItemDetail[];
  customer_details: {
    first_name: string;
    last_name?: string;
    email?: string;
    phone?: string;
  };
  enabled_payments?: string[];
  expiry?: {
    start_time?: string;
    unit: 'minute' | 'hour' | 'day';
    duration: number;
  };
}

export interface SnapResponse {
  token: string;
  redirect_url: string;
}

export interface AuthUser {
  id: string;
  email?: string;
  phone?: string;
  role?: string;
  aud?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
}

export interface MidtransStatusMapping {
  newPaymentStatus: PaymentStatus;
  newOrderStatus: string;
  shouldReduceStock: boolean;
}

export interface OrderItemProduct {
  name?: string;
  description?: string;
  weight?: number;
  categories?: {
    name?: string;
  };
}

export interface OrderItem {
  product_id: string | null;
  quantity: number;
  price_at_purchase: number;
  products?: OrderItemProduct;
}

export interface Order {
  id: string;
  user_id?: string | null;
  total_amount: number;
  gross_amount?: number | null;
  shipping_cost?: number | null;
  status: string;
  payment_status: PaymentStatus;
  payment_type?: string | null;
  checkout_idempotency_key?: string | null;
  midtrans_order_id?: string | null;
  midtrans_transaction_id?: string | null;
  destination_area_id?: string | null;
  destination_postal_code?: number | null;
  courier_code?: string | null;
  courier_service?: string | null;
  tracking_id?: string | null;
  biteship_order_id?: string | null;
  waybill_number?: string | null;
  snap_token?: string | null;
  snap_redirect_url?: string | null;
  snap_token_created_at?: string | null;
  order_items?: OrderItem[];
  profiles?: {
    id?: string;
    full_name?: string;
    phone_number?: string;
  };
  addresses?: {
    phone_number?: string;
    street_address?: string;
    latitude?: string | number | null;
    longitude?: string | number | null;
  };
}

export interface BiteshipOrderResponse {
  success: boolean;
  id: string;
  status: string;
  courier?: {
    tracking_id?: string;
    waybill_id?: string;
    company?: string;
    type?: string;
  };
}
