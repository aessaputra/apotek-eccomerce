import { supabase } from '@/utils/supabase';
import type { Address } from '@/types/address';
import type {
  BiteshipCourier,
  BiteshipArea,
  BiteshipOrderPayload,
  BiteshipOrderResult,
  ShippingOption,
  ShippingQuoteParams,
  ShippingQuoteResult,
  TrackingResult,
} from '@/types/shipping';
import { toByteshipShippingAddress } from './address.service';

interface BiteshipProxyResponse<T> {
  data?: T;
  pricing?: T;
  areas?: T;
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error('Unexpected shipping service error');
}

function toInvokeError(error: unknown): Error {
  const fallback = toError(error);

  if (typeof error !== 'object' || error === null) {
    return fallback;
  }

  const maybeContext = (error as { context?: unknown }).context;
  if (typeof maybeContext !== 'string') {
    return fallback;
  }

  try {
    const parsed = JSON.parse(maybeContext) as { error?: unknown; message?: unknown };
    const contextMessage =
      (typeof parsed.error === 'string' && parsed.error) ||
      (typeof parsed.message === 'string' && parsed.message) ||
      '';

    if (!contextMessage) {
      return fallback;
    }

    return new Error(`${fallback.message}: ${contextMessage}`);
  } catch {
    return fallback;
  }
}

function toInvokeErrorMessage(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value !== 'object' || value === null) {
    return '';
  }

  const record = value as Record<string, unknown>;
  const nestedError = toInvokeErrorMessage(record.error);
  if (nestedError) {
    return nestedError;
  }

  const nestedMessage = toInvokeErrorMessage(record.message);
  if (nestedMessage) {
    return nestedMessage;
  }

  return '';
}

async function toInvokeErrorDetailed(error: unknown): Promise<Error> {
  const baseError = toInvokeError(error);
  const maybeContext =
    typeof error === 'object' && error !== null
      ? (error as { context?: unknown }).context
      : undefined;

  if (maybeContext && typeof maybeContext === 'object' && 'json' in maybeContext) {
    const maybeResponse = maybeContext as { json?: () => Promise<unknown> };

    if (typeof maybeResponse.json === 'function') {
      try {
        const parsed = await maybeResponse.json();
        const message = toInvokeErrorMessage(parsed).trim();
        if (message) {
          return new Error(`${baseError.message}: ${message}`);
        }
      } catch {
        return baseError;
      }
    }
  }

  const messageFromRoot =
    typeof error === 'object' && error !== null
      ? toInvokeErrorMessage((error as Record<string, unknown>).message).trim()
      : '';

  if (!messageFromRoot || messageFromRoot === baseError.message) {
    return baseError;
  }

  return new Error(`${baseError.message}: ${messageFromRoot}`);
}

const SESSION_EXPIRY_SAFETY_WINDOW_SECONDS = 60;

async function getValidAccessToken(): Promise<string | null> {
  const {
    data: { session: cachedSession },
  } = await supabase.auth.getSession();

  if (!cachedSession?.access_token) {
    return null;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const expiresAt = cachedSession.expires_at ?? 0;
  const isExpiredOrNearExpiry = expiresAt <= nowSeconds + SESSION_EXPIRY_SAFETY_WINDOW_SECONDS;

  if (!isExpiredOrNearExpiry) {
    return cachedSession.access_token;
  }

  const {
    data: { session: refreshedSession },
    error: refreshError,
  } = await supabase.auth.refreshSession();

  if (refreshError || !refreshedSession?.access_token) {
    return null;
  }

  return refreshedSession.access_token;
}

function toRecord(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null) {
    return value as Record<string, unknown>;
  }

  return {};
}

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function toNumberValue(value: unknown): number {
  return typeof value === 'number' ? value : 0;
}

function mapBiteshipOrderResult(data: unknown): BiteshipOrderResult {
  const result = toRecord(data);
  const courier = toRecord(result.courier);
  const trackingId = toStringValue(result.tracking_id);
  const waybillId = toStringValue(result.waybill_id);

  return {
    id: toStringValue(result.id),
    waybill_id: waybillId,
    tracking_id: trackingId,
    status: toStringValue(result.status),
    courier: {
      company: toStringValue(courier.company),
      type: toStringValue(courier.type),
      tracking_id: toStringValue(courier.tracking_id) || trackingId,
      waybill_id: toStringValue(courier.waybill_id) || waybillId,
    },
    price: toNumberValue(result.price),
    currency: toStringValue(result.currency) || 'IDR',
  };
}

function mapTrackingResult(data: unknown): TrackingResult {
  const result = toRecord(data);
  const courier = toRecord(result.courier);
  const historySource = Array.isArray(result.history) ? result.history : [];

  return {
    id: toStringValue(result.id),
    waybill_id: toStringValue(result.waybill_id),
    status: toStringValue(result.status),
    courier: {
      company: toStringValue(courier.company),
      driver_name: toStringValue(courier.driver_name) || undefined,
      driver_phone: toStringValue(courier.driver_phone) || undefined,
      driver_photo_url: toStringValue(courier.driver_photo_url) || undefined,
      driver_plate_number: toStringValue(courier.driver_plate_number) || undefined,
    },
    history: historySource.map(eventData => {
      const event = toRecord(eventData);

      return {
        note: toStringValue(event.note),
        status: toStringValue(event.status),
        updated_at: toStringValue(event.updated_at),
        service_type: toStringValue(event.service_type) || undefined,
      };
    }),
  };
}

function mapBiteshipCourier(data: unknown): BiteshipCourier {
  const courier = toRecord(data);

  return {
    courier_name: toStringValue(courier.courier_name),
    courier_code: toStringValue(courier.courier_code),
    courier_service_name: toStringValue(courier.courier_service_name),
    courier_service_code: toStringValue(courier.courier_service_code),
    tier: toStringValue(courier.tier),
    description: toStringValue(courier.description),
    service_type: toStringValue(courier.service_type),
    shipping_type: toStringValue(courier.shipping_type),
    shipment_duration_range: toStringValue(courier.shipment_duration_range),
    shipment_duration_unit: toStringValue(courier.shipment_duration_unit),
    available_for_cash_on_delivery: Boolean(courier.available_for_cash_on_delivery),
    available_for_proof_of_delivery: Boolean(courier.available_for_proof_of_delivery),
    available_for_instant_waybill_id: Boolean(courier.available_for_instant_waybill_id),
  };
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
    const { data, error } = await invokeBiteship({
      action: 'maps',
      payload: { input },
    });

    if (error) {
      return { data: [], error };
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
  if (digitsOnly.length !== 5) {
    return null;
  }

  const parsed = Number.parseInt(digitsOnly, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

async function invokeBiteship(
  body: Record<string, unknown>,
): Promise<{ data: unknown; error: Error | null }> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    return {
      data: null,
      error: new Error('Sesi login belum siap. Silakan coba lagi dalam beberapa saat.'),
    };
  }

  const { data, error } = await supabase.functions.invoke('biteship', {
    body,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!error) {
    return { data, error: null };
  }

  return { data, error: await toInvokeErrorDetailed(error) };
}

export async function getShippingRatesForAddress(
  params: ShippingQuoteParams,
): Promise<{ data: ShippingQuoteResult | null; error: Error | null }> {
  try {
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

    const { data, error } = await invokeBiteship({
      action: 'rates',
      payload: {
        ...(destinationAreaId
          ? { destination_area_id: destinationAreaId }
          : { destination_postal_code: destinationPostalCode }),
        ...(params.couriers ? { couriers: params.couriers } : {}),
        items: [
          {
            name: packageName,
            value: params.package_value ?? 0,
            quantity: 1,
            weight: Math.round(params.package_weight_grams),
          },
        ],
      },
    });

    if (error) {
      return { data: null, error: toInvokeError(error) };
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

export const createBiteshipDraftOrder = async (
  orderId: string,
  params: Partial<BiteshipOrderPayload>,
): Promise<{ data: BiteshipOrderResult | null; error: Error | null }> => {
  try {
    const { data, error } = await invokeBiteship({
      action: 'draft_order',
      payload: {
        order_id: orderId,
        ...params,
      },
    });

    if (error) {
      return { data: null, error: toInvokeError(error) };
    }

    const response = toRecord(data);
    const mappedResult = mapBiteshipOrderResult(response.data ?? response);

    return { data: mappedResult, error: null };
  } catch (error) {
    return { data: null, error: toError(error) };
  }
};

export const createBiteshipOrder = async (
  orderId: string,
  params: BiteshipOrderPayload,
): Promise<{
  data: {
    biteship_order_id: string;
    waybill_id: string;
    tracking_id: string;
    status: string;
  } | null;
  error: Error | null;
}> => {
  try {
    const { data, error } = await invokeBiteship({
      action: 'create_order',
      payload: {
        order_id: orderId,
        ...params,
      },
    });

    if (error) {
      return { data: null, error: toInvokeError(error) };
    }

    const response = toRecord(data);
    const result = toRecord(response.data ?? response);

    return {
      data: {
        biteship_order_id: toStringValue(result.biteship_order_id) || toStringValue(result.id),
        waybill_id: toStringValue(result.waybill_number),
        tracking_id: toStringValue(result.tracking_id),
        status: toStringValue(result.status),
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: toError(error) };
  }
};

export const trackShipment = async (
  waybillId: string,
): Promise<{ data: TrackingResult | null; error: Error | null }> => {
  try {
    const { data, error } = await invokeBiteship({
      action: 'track',
      payload: {
        waybill_id: waybillId,
      },
    });

    if (error) {
      return { data: null, error: toInvokeError(error) };
    }

    const response = toRecord(data);
    const mappedResult = mapTrackingResult(response.data ?? response);

    return { data: mappedResult, error: null };
  } catch (error) {
    return { data: null, error: toError(error) };
  }
};

export const getCouriers = async (): Promise<{
  data: BiteshipCourier[] | null;
  error: Error | null;
}> => {
  try {
    const { data, error } = await invokeBiteship({
      action: 'couriers',
      payload: {},
    });

    if (error) {
      return { data: null, error: toInvokeError(error) };
    }

    const response = toRecord(data);
    const result = response.data ?? response;
    const couriers = Array.isArray(result) ? result.map(mapBiteshipCourier) : null;

    return { data: couriers, error: null };
  } catch (error) {
    return { data: null, error: toError(error) };
  }
};
