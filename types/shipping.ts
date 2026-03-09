import type { Address } from '@/types/address';

export interface BiteshipArea {
  id: string;
  name: string;
  country_name?: string;
  country_code?: string;
  administrative_division_level_1_name?: string;
  administrative_division_level_2_name?: string;
  administrative_division_level_3_name?: string;
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
  origin_area_id?: string;
  couriers?: string;
}

export interface ShippingQuoteResult {
  destination_area_id?: string;
  destination_postal_code?: number;
  options: ShippingOption[];
}
