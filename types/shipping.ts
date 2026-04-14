import type { Address } from '@/types/address';

export interface BiteshipArea {
  id: string;
  name: string;
  country_name?: string;
  country_code?: string;
  administrative_division_level_1_name?: string;
  administrative_division_level_1_type?: string;
  administrative_division_level_2_name?: string;
  administrative_division_level_2_type?: string;
  administrative_division_level_3_name?: string;
  administrative_division_level_3_type?: string;
  postal_code?: number;
}

export interface ShippingOption {
  courier_name: string;
  courier_code: string;
  service_name: string;
  service_code: string;
  shipping_type: string;
  price: number;
  currency: string;
  estimated_delivery: string;
}

export interface ShippingQuoteParams {
  address: Address;
  package_weight_grams: number;
  package_value?: number;
  package_name?: string;
  couriers?: string;
}

export interface ShippingQuoteResult {
  destination_area_id?: string;
  destination_postal_code?: number;
  options: ShippingOption[];
}

export interface TrackingEvent {
  note: string;
  status: string;
  updated_at: string;
  service_type?: string;
}

export interface TrackingResult {
  id: string;
  waybill_id: string;
  status: string;
  link?: string | null;
  order_id?: string | null;
  origin?: {
    contact_name?: string | null;
    address?: string | null;
  };
  destination?: {
    contact_name?: string | null;
    address?: string | null;
  };
  courier: {
    company: string;
    driver_name?: string;
    driver_phone?: string;
    driver_photo_url?: string;
    driver_plate_number?: string;
  };
  history: TrackingEvent[];
}
