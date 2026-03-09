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
          city: string;
          city_id: string | null;
          country_code: string | null;
          created_at: string;
          district_id: string | null;
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
          subdistrict_id: string | null;
        };
        Insert: {
          city: string;
          city_id?: string | null;
          country_code?: string | null;
          created_at?: string;
          district_id?: string | null;
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
          subdistrict_id?: string | null;
        };
        Update: {
          city?: string;
          city_id?: string | null;
          country_code?: string | null;
          created_at?: string;
          district_id?: string | null;
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
          courier_code: string | null;
          courier_service: string | null;
          created_at: string;
          destination_city_id: string | null;
          id: string;
          midtrans_order_id: string | null;
          midtrans_transaction_id: string | null;
          origin_city_id: string | null;
          payment_status: string;
          payment_type: string | null;
          shipping_address_id: string | null;
          shipping_cost: number | null;
          shipping_etd: string | null;
          status: string;
          total_amount: number;
          user_id: string | null;
          waybill_number: string | null;
        };
        Insert: {
          courier_code?: string | null;
          courier_service?: string | null;
          created_at?: string;
          destination_city_id?: string | null;
          id?: string;
          midtrans_order_id?: string | null;
          midtrans_transaction_id?: string | null;
          origin_city_id?: string | null;
          payment_status?: string;
          payment_type?: string | null;
          shipping_address_id?: string | null;
          shipping_cost?: number | null;
          shipping_etd?: string | null;
          status?: string;
          total_amount: number;
          user_id?: string | null;
          waybill_number?: string | null;
        };
        Update: {
          courier_code?: string | null;
          courier_service?: string | null;
          created_at?: string;
          destination_city_id?: string | null;
          id?: string;
          midtrans_order_id?: string | null;
          midtrans_transaction_id?: string | null;
          origin_city_id?: string | null;
          payment_status?: string;
          payment_type?: string | null;
          shipping_address_id?: string | null;
          shipping_cost?: number | null;
          shipping_etd?: string | null;
          status?: string;
          total_amount?: number;
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
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
  };
};

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
