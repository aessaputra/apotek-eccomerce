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
          city: string;
          city_id: string | null;
          country_code: string | null;
          created_at: string;
          district_id: string | null;
          id: string;
          is_default: boolean | null;
          latitude: string | null;
          longitude: string | null;
          phone_number: string;
          postal_code: string;
          profile_id: string;
          province: string | null;
          province_id: string | null;
          receiver_name: string;
          street_address: string;
          subdistrict_id: string | null;
        };
        Insert: {
          area_id?: string | null;
          city: string;
          city_id?: string | null;
          country_code?: string | null;
          created_at?: string;
          district_id?: string | null;
          id?: string;
          is_default?: boolean | null;
          latitude?: string | null;
          longitude?: string | null;
          phone_number: string;
          postal_code: string;
          profile_id: string;
          province?: string | null;
          province_id?: string | null;
          receiver_name: string;
          street_address: string;
          subdistrict_id?: string | null;
        };
        Update: {
          area_id?: string | null;
          city?: string;
          city_id?: string | null;
          country_code?: string | null;
          created_at?: string;
          district_id?: string | null;
          id?: string;
          is_default?: boolean | null;
          latitude?: string | null;
          longitude?: string | null;
          phone_number?: string;
          postal_code?: string;
          profile_id?: string;
          province?: string | null;
          province_id?: string | null;
          receiver_name?: string;
          street_address?: string;
          subdistrict_id?: string | null;
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
          payment_status: string;
          payment_type: string | null;
          shipping_address_id: string | null;
          shipping_cost: number | null;
          shipping_etd: string | null;
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
          id?: string;
          midtrans_order_id?: string | null;
          midtrans_transaction_id?: string | null;
          origin_area_id?: string | null;
          origin_city_id?: string | null;
          payment_status?: string;
          payment_type?: string | null;
          shipping_address_id?: string | null;
          shipping_cost?: number | null;
          shipping_etd?: string | null;
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
          id?: string;
          midtrans_order_id?: string | null;
          midtrans_transaction_id?: string | null;
          origin_area_id?: string | null;
          origin_city_id?: string | null;
          payment_status?: string;
          payment_type?: string | null;
          shipping_address_id?: string | null;
          shipping_cost?: number | null;
          shipping_etd?: string | null;
          status?: string;
          total_amount?: number;
          updated_at?: string | null;
          user_id?: string | null;
          waybill_number?: string | null;
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
    Enums: { [_ in never]: never };
  };
};

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
