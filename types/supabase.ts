/**
 * Supabase database types — generated from project "Apotek Eccomerce".
 * Regenerate via Supabase MCP: generate_typescript_types(project_id).
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      addresses: {
        Row: {
          area_id: string | null;
          area_name: string | null;
          city: string;
          city_id: string | null;
          country_code: string | null;
          created_at: string;
          id: string;
          is_default: boolean | null;
          latitude: number | null;
          longitude: number | null;
          phone_number: string;
          postal_code: string;
          profile_id: string;
          province: string | null;
          province_id: string | null;
          receiver_name: string;
          street_address: string;
        };
        Insert: {
          area_id?: string | null;
          area_name?: string | null;
          city: string;
          city_id?: string | null;
          country_code?: string | null;
          created_at?: string;
          id?: string;
          is_default?: boolean | null;
          latitude?: number | null;
          longitude?: number | null;
          phone_number: string;
          postal_code: string;
          profile_id: string;
          province?: string | null;
          province_id?: string | null;
          receiver_name: string;
          street_address: string;
        };
        Update: {
          area_id?: string | null;
          area_name?: string | null;
          city?: string;
          city_id?: string | null;
          country_code?: string | null;
          created_at?: string;
          id?: string;
          is_default?: boolean | null;
          latitude?: number | null;
          longitude?: number | null;
          phone_number?: string;
          postal_code?: string;
          profile_id?: string;
          province?: string | null;
          province_id?: string | null;
          receiver_name?: string;
          street_address?: string;
        };
      };
      cart_items: {
        Row: {
          cart_id: string;
          created_at: string;
          id: string;
          product_id: string;
          quantity: number;
        };
        Insert: {
          cart_id: string;
          created_at?: string;
          id?: string;
          product_id: string;
          quantity: number;
        };
        Update: {
          cart_id?: string;
          created_at?: string;
          id?: string;
          product_id?: string;
          quantity?: number;
        };
      };
      carts: {
        Row: {
          created_at: string;
          id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          user_id?: string;
        };
      };
      categories: {
        Row: {
          created_at: string;
          id: string;
          logo_url: string | null;
          name: string;
          slug: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          logo_url?: string | null;
          name: string;
          slug: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          logo_url?: string | null;
          name?: string;
          slug?: string;
        };
      };
      home_banners: {
        Row: {
          body: string | null;
          created_at: string;
          cta_kind: string;
          cta_label: string | null;
          cta_route: string | null;
          id: string;
          intent: string;
          is_active: boolean;
          media_path: string | null;
          placement_key: string;
          title: string | null;
          updated_at: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          cta_kind: string;
          cta_label?: string | null;
          cta_route?: string | null;
          id?: string;
          intent: string;
          is_active?: boolean;
          media_path?: string | null;
          placement_key: string;
          title?: string | null;
          updated_at?: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          cta_kind?: string;
          cta_label?: string | null;
          cta_route?: string | null;
          id?: string;
          intent?: string;
          is_active?: boolean;
          media_path?: string | null;
          placement_key?: string;
          title?: string | null;
          updated_at?: string;
        };
      };
      order_items: {
        Row: {
          created_at: string;
          id: string;
          order_id: string;
          price_at_purchase: number;
          product_id: string | null;
          quantity: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          order_id: string;
          price_at_purchase: number;
          product_id?: string | null;
          quantity: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          order_id?: string;
          price_at_purchase?: number;
          product_id?: string | null;
          quantity?: number;
        };
      };
      orders: {
        Row: {
          biteship_order_id: string | null;
          checkout_idempotency_key: string | null;
          courier_code: string | null;
          courier_service: string | null;
          created_at: string;
          destination_area_id: string | null;
          destination_postal_code: number | null;
          destination_city_id: string | null;
          id: string;
          midtrans_order_id: string | null;
          midtrans_transaction_id: string | null;
          origin_area_id: string | null;
          origin_city_id: string | null;
          expired_at: string | null;
          gross_amount: number | null;
          paid_at: string | null;
          payment_status: Database['public']['Enums']['payment_status'];
          payment_type: Database['public']['Enums']['payment_type'] | null;
          shipping_address_id: string | null;
          shipping_cost: number | null;
          shipping_etd: string | null;
          snap_redirect_url: string | null;
          snap_token: string | null;
          snap_token_created_at: string | null;
          status: string;
          total_amount: number;
          updated_at: string | null;
          user_id: string | null;
          waybill_number: string | null;
        };
        Insert: {
          biteship_order_id?: string | null;
          checkout_idempotency_key?: string | null;
          courier_code?: string | null;
          courier_service?: string | null;
          created_at?: string;
          destination_area_id?: string | null;
          destination_postal_code?: number | null;
          destination_city_id?: string | null;
          expired_at?: string | null;
          gross_amount?: number | null;
          id?: string;
          midtrans_order_id?: string | null;
          midtrans_transaction_id?: string | null;
          origin_area_id?: string | null;
          origin_city_id?: string | null;
          paid_at?: string | null;
          payment_status?: Database['public']['Enums']['payment_status'];
          payment_type?: Database['public']['Enums']['payment_type'] | null;
          shipping_address_id?: string | null;
          shipping_cost?: number | null;
          shipping_etd?: string | null;
          snap_redirect_url?: string | null;
          snap_token?: string | null;
          snap_token_created_at?: string | null;
          status?: string;
          total_amount: number;
          updated_at?: string | null;
          user_id?: string | null;
          waybill_number?: string | null;
        };
        Update: {
          biteship_order_id?: string | null;
          checkout_idempotency_key?: string | null;
          courier_code?: string | null;
          courier_service?: string | null;
          created_at?: string;
          destination_area_id?: string | null;
          destination_postal_code?: number | null;
          destination_city_id?: string | null;
          expired_at?: string | null;
          gross_amount?: number | null;
          id?: string;
          midtrans_order_id?: string | null;
          midtrans_transaction_id?: string | null;
          origin_area_id?: string | null;
          origin_city_id?: string | null;
          paid_at?: string | null;
          payment_status?: Database['public']['Enums']['payment_status'];
          payment_type?: Database['public']['Enums']['payment_type'] | null;
          shipping_address_id?: string | null;
          shipping_cost?: number | null;
          shipping_etd?: string | null;
          snap_redirect_url?: string | null;
          snap_token?: string | null;
          snap_token_created_at?: string | null;
          status?: string;
          total_amount?: number;
          updated_at?: string | null;
          user_id?: string | null;
          waybill_number?: string | null;
        };
      };
      payments: {
        Row: {
          acquirer: string | null;
          approval_code: string | null;
          bank: string | null;
          bill_key: string | null;
          biller_code: string | null;
          card_type: string | null;
          channel_response_code: string | null;
          channel_response_message: string | null;
          checkout_idempotency_key: string | null;
          created_at: string;
          currency: string;
          eci: string | null;
          expiry_time: string | null;
          fraud_status: string | null;
          gross_amount: number;
          id: string;
          issuer: string | null;
          masked_card: string | null;
          merchant_id: string | null;
          midtrans_order_id: string;
          midtrans_transaction_id: string | null;
          order_id: string;
          paid_at: string | null;
          payment_code: string | null;
          payment_type: Database['public']['Enums']['payment_type'] | null;
          raw_notification: Json;
          redirect_url: string | null;
          settlement_time: string | null;
          signature_key: string | null;
          status: Database['public']['Enums']['payment_status'];
          status_code: string | null;
          status_message: string | null;
          store: string | null;
          transaction_status: string | null;
          transaction_time: string | null;
          updated_at: string;
          user_id: string | null;
          va_numbers: Json;
        };
        Insert: {
          acquirer?: string | null;
          approval_code?: string | null;
          bank?: string | null;
          bill_key?: string | null;
          biller_code?: string | null;
          card_type?: string | null;
          channel_response_code?: string | null;
          channel_response_message?: string | null;
          checkout_idempotency_key?: string | null;
          created_at?: string;
          currency?: string;
          eci?: string | null;
          expiry_time?: string | null;
          fraud_status?: string | null;
          gross_amount: number;
          id?: string;
          issuer?: string | null;
          masked_card?: string | null;
          merchant_id?: string | null;
          midtrans_order_id: string;
          midtrans_transaction_id?: string | null;
          order_id: string;
          paid_at?: string | null;
          payment_code?: string | null;
          payment_type?: Database['public']['Enums']['payment_type'] | null;
          raw_notification?: Json;
          redirect_url?: string | null;
          settlement_time?: string | null;
          signature_key?: string | null;
          status?: Database['public']['Enums']['payment_status'];
          status_code?: string | null;
          status_message?: string | null;
          store?: string | null;
          transaction_status?: string | null;
          transaction_time?: string | null;
          updated_at?: string;
          user_id?: string | null;
          va_numbers?: Json;
        };
        Update: {
          acquirer?: string | null;
          approval_code?: string | null;
          bank?: string | null;
          bill_key?: string | null;
          biller_code?: string | null;
          card_type?: string | null;
          channel_response_code?: string | null;
          channel_response_message?: string | null;
          checkout_idempotency_key?: string | null;
          created_at?: string;
          currency?: string;
          eci?: string | null;
          expiry_time?: string | null;
          fraud_status?: string | null;
          gross_amount?: number;
          id?: string;
          issuer?: string | null;
          masked_card?: string | null;
          merchant_id?: string | null;
          midtrans_order_id?: string;
          midtrans_transaction_id?: string | null;
          order_id?: string;
          paid_at?: string | null;
          payment_code?: string | null;
          payment_type?: Database['public']['Enums']['payment_type'] | null;
          raw_notification?: Json;
          redirect_url?: string | null;
          settlement_time?: string | null;
          signature_key?: string | null;
          status?: Database['public']['Enums']['payment_status'];
          status_code?: string | null;
          status_message?: string | null;
          store?: string | null;
          transaction_status?: string | null;
          transaction_time?: string | null;
          updated_at?: string;
          user_id?: string | null;
          va_numbers?: Json;
        };
      };
      product_images: {
        Row: {
          created_at: string | null;
          id: string;
          product_id: string;
          sort_order: number;
          url: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          product_id: string;
          sort_order?: number;
          url: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          product_id?: string;
          sort_order?: number;
          url?: string;
        };
      };
      products: {
        Row: {
          category_id: string | null;
          created_at: string;
          description: string | null;
          id: string;
          is_active: boolean | null;
          name: string;
          price: number;
          slug: string;
          stock: number;
          updated_at: string;
          weight: number;
        };
        Insert: {
          category_id?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          name: string;
          price: number;
          slug: string;
          stock?: number;
          updated_at?: string;
          weight?: number;
        };
        Update: {
          category_id?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          name?: string;
          price?: number;
          slug?: string;
          stock?: number;
          updated_at?: string;
          weight?: number;
        };
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          full_name: string | null;
          id: string;
          is_banned: boolean;
          phone_number: string | null;
          role: 'admin' | 'customer' | null;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string | null;
          id: string;
          is_banned?: boolean;
          phone_number?: string | null;
          role?: 'admin' | 'customer' | null;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          is_banned?: boolean;
          phone_number?: string | null;
          role?: 'admin' | 'customer' | null;
          updated_at?: string;
        };
      };
      webhook_idempotency: {
        Row: {
          created_at: string | null;
          event_key: string;
          id: string;
          provider: string;
        };
        Insert: {
          created_at?: string | null;
          event_key: string;
          id?: string;
          provider: string;
        };
        Update: {
          created_at?: string | null;
          event_key?: string;
          id?: string;
          provider?: string;
        };
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      apply_midtrans_webhook_transition: {
        Args: {
          p_provider: string;
          p_event_key: string;
          p_order_id: string;
          p_next_payment_status: string;
          p_next_order_status: string;
          p_midtrans_transaction_id?: string | null;
          p_payment_type?: string | null;
          p_biteship_order_id?: string | null;
          p_waybill_number?: string | null;
        };
        Returns: {
          applied: boolean;
          payment_status: string;
          order_status: string;
        }[];
      };
    };
    Enums: {
      payment_status:
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
      payment_type:
        | 'credit_card'
        | 'bank_transfer'
        | 'echannel'
        | 'gopay'
        | 'shopeepay'
        | 'qris'
        | 'akulaku'
        | 'kredivo'
        | 'indomaret'
        | 'alfamart'
        | 'bca_klikbca'
        | 'bca_klikpay'
        | 'bri_epay'
        | 'cimb_clicks'
        | 'danamon_online'
        | 'uob_ezpay'
        | 'other';
    };
  };
};

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
