import { supabase } from '@/utils/supabase';
import config from '@/utils/config';
import type { Address } from '@/types/address';
import type {
  BiteshipArea,
  ShippingOption,
  ShippingQuoteParams,
  ShippingQuoteResult,
} from '@/types/shipping';
import { toByteshipShippingAddress } from './address.service';

interface BiteshipProxyResponse<T> {
  data?: T;
  pricing?: T;
  areas?: T;
}

function normalizeAreaId(address: Address): string | null {
  return address.subdistrict_id || address.district_id || address.city_id || address.province_id;
}

function normalizeDeliveryEstimate(rate: Record<string, unknown>): string {
  const duration = typeof rate.duration === 'string' ? rate.duration.trim() : '';
  if (duration) {
    return duration;
  }

  const range =
    typeof rate.shipment_duration_range === 'string' ? rate.shipment_duration_range : '';
  const unit = typeof rate.shipment_duration_unit === 'string' ? rate.shipment_duration_unit : '';

  if (range && unit) {
    return `${range} ${unit}`;
  }

  return '-';
}

function mapRateToShippingOption(rate: Record<string, unknown>): ShippingOption {
  const serviceName =
    (typeof rate.courier_service_name === 'string' && rate.courier_service_name) ||
    (typeof rate.description === 'string' && rate.description) ||
    'Unknown service';

  return {
    courier_name:
      (typeof rate.courier_name === 'string' && rate.courier_name) ||
      (typeof rate.company === 'string' && rate.company) ||
      'Unknown courier',
    courier_code:
      (typeof rate.courier_code === 'string' && rate.courier_code) ||
      (typeof rate.company === 'string' && rate.company) ||
      'unknown',
    service_name: serviceName,
    service_code:
      (typeof rate.courier_service_code === 'string' && rate.courier_service_code) ||
      (typeof rate.type === 'string' && rate.type) ||
      'unknown',
    shipping_type: (typeof rate.shipping_type === 'string' && rate.shipping_type) || 'parcel',
    price: typeof rate.price === 'number' ? rate.price : 0,
    currency: (typeof rate.currency === 'string' && rate.currency) || 'IDR',
    estimated_delivery: normalizeDeliveryEstimate(rate),
  };
}

export async function searchBiteshipArea(
  input: string,
): Promise<{ data: BiteshipArea[]; error: Error | null }> {
  try {
    const { data, error } = await supabase.functions.invoke('biteship', {
      body: {
        action: 'maps',
        payload: { input },
      },
    });

    if (error) {
      return { data: [], error: error as unknown as Error };
    }

    const response = (data || {}) as BiteshipProxyResponse<BiteshipArea[]>;
    const areas = Array.isArray(response.areas)
      ? response.areas
      : Array.isArray(response.data as unknown[] | undefined)
        ? ((response.data as unknown[]).filter(Boolean) as BiteshipArea[])
        : [];

    return { data: areas, error: null };
  } catch (error) {
    return { data: [], error: error as Error };
  }
}

async function resolveDestinationAreaId(
  address: Address,
): Promise<{ areaId: string | null; error: Error | null }> {
  const existingAreaId = normalizeAreaId(address);
  if (existingAreaId) {
    return { areaId: existingAreaId, error: null };
  }

  return { areaId: null, error: null };
}

function parsePostalCode(postalCode: string): number | null {
  const digitsOnly = postalCode.replace(/\D/g, '');
  if (!digitsOnly) {
    return null;
  }

  const parsed = Number.parseInt(digitsOnly, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function getShippingRatesForAddress(
  params: ShippingQuoteParams,
): Promise<{ data: ShippingQuoteResult | null; error: Error | null }> {
  try {
    const originAreaId = params.origin_area_id || config.biteshipOriginAreaId;
    if (!originAreaId) {
      return {
        data: null,
        error: new Error(
          'Missing biteship origin area id. Set EXPO_PUBLIC_BITESHIP_ORIGIN_AREA_ID.',
        ),
      };
    }

    if (params.package_weight_grams <= 0) {
      return {
        data: null,
        error: new Error('Package weight must be greater than 0 grams.'),
      };
    }

    const { areaId: destinationAreaId, error: areaError } = await resolveDestinationAreaId(
      params.address,
    );
    if (areaError) {
      return { data: null, error: areaError };
    }

    const destinationPostalCode = parsePostalCode(params.address.postal_code);

    if (!destinationAreaId && !destinationPostalCode) {
      return {
        data: null,
        error: new Error(
          'Selected address is missing destination area mapping and valid postal code.',
        ),
      };
    }

    const normalized = toByteshipShippingAddress(params.address);
    const packageName =
      params.package_name ||
      (normalized.recipient_name ? `Order for ${normalized.recipient_name}` : 'Pharmacy order');

    const { data, error } = await supabase.functions.invoke('biteship', {
      body: {
        action: 'rates',
        payload: {
          origin_area_id: originAreaId,
          ...(destinationAreaId
            ? { destination_area_id: destinationAreaId }
            : { destination_postal_code: destinationPostalCode }),
          couriers: params.couriers || config.biteshipCouriers,
          items: [
            {
              name: packageName,
              value: params.package_value ?? 0,
              quantity: 1,
              weight: Math.round(params.package_weight_grams),
            },
          ],
        },
      },
    });

    if (error) {
      return { data: null, error: error as unknown as Error };
    }

    const response = (data || {}) as BiteshipProxyResponse<Record<string, unknown>[]>;
    const pricing = Array.isArray(response.pricing)
      ? response.pricing
      : Array.isArray(response.data)
        ? response.data
        : [];

    const options = pricing.map(mapRateToShippingOption).filter(option => option.price > 0);

    return {
      data: {
        ...(destinationAreaId
          ? { destination_area_id: destinationAreaId }
          : { destination_postal_code: destinationPostalCode ?? undefined }),
        options,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}
