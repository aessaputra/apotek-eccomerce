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

export interface BiteshipOrderItem {
  name: string;
  description?: string;
  value: number;
  quantity: number;
  weight: number;
  category?: string;
  height?: number;
  length?: number;
  width?: number;
}

export interface BiteshipOrderPayload {
  origin_contact_name?: string;
  origin_contact_phone?: string;
  origin_address?: string;
  origin_area_id?: string;
  origin_postal_code?: number;
  origin_coordinate?: { latitude: number; longitude: number };
  destination_contact_name: string;
  destination_contact_phone: string;
  destination_address: string;
  destination_area_id?: string;
  destination_postal_code?: number;
  destination_coordinate?: { latitude: number; longitude: number };
  courier_company: string;
  courier_type: string;
  delivery_type: 'now' | 'scheduled';
  delivery_date?: string;
  delivery_time?: string;
  items: BiteshipOrderItem[];
  metadata?: Record<string, unknown>;
  reference_id?: string;
  origin_collection_method?: 'pickup' | 'drop_off';
  destination_cash_on_delivery?: number;
  courier_insurance?: number;
}

export interface BiteshipCourier {
  courier_name: string;
  courier_code: string;
  courier_service_name: string;
  courier_service_code: string;
  tier: string;
  description: string;
  service_type: string;
  shipping_type: string;
  shipment_duration_range: string;
  shipment_duration_unit: string;
  available_for_cash_on_delivery: boolean;
  available_for_proof_of_delivery: boolean;
  available_for_instant_waybill_id: boolean;
}

export interface BiteshipOrderResult {
  id: string;
  waybill_id: string;
  tracking_id: string;
  status: string;
  courier: {
    company: string;
    type: string;
    tracking_id: string;
    waybill_id: string;
  };
  price: number;
  currency: string;
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
  courier: {
    company: string;
    driver_name?: string;
    driver_phone?: string;
    driver_photo_url?: string;
    driver_plate_number?: string;
  };
  history: TrackingEvent[];
}
