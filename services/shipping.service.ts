import { supabase } from '@/utils/supabase';
import { parsePostalCode } from '@/utils/postalCode';
import type { Address } from '@/types/address';
import type {
  BiteshipArea,
  ShippingOption,
  ShippingQuoteParams,
  ShippingQuoteResult,
  TrackingEvent,
  TrackingResult,
} from '@/types/shipping';

export type { TrackingResult } from '@/types/shipping';

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

function toNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function mapTrackingEvent(value: unknown): TrackingEvent | null {
  const record = toRecord(value);
  const note = toStringValue(record.note).trim();
  const status = toStringValue(record.status).trim();
  const updatedAt = toStringValue(record.updated_at).trim();

  if (!note || !status || !updatedAt) {
    return null;
  }

  return {
    note,
    status,
    updated_at: updatedAt,
    service_type: toNullableString(record.service_type) ?? undefined,
  };
}

function isTrackingEvent(event: TrackingEvent | null): event is TrackingEvent {
  return event !== null;
}

function mapTrackingResult(value: unknown): TrackingResult {
  const record = toRecord(value);
  const courier = toRecord(record.courier);
  const origin = toRecord(record.origin);
  const destination = toRecord(record.destination);
  const history = Array.isArray(record.history)
    ? record.history.map(mapTrackingEvent).filter(isTrackingEvent)
    : [];

  const id = toStringValue(record.id).trim();
  const waybillId = toStringValue(record.waybill_id).trim();
  const status = toStringValue(record.status).trim();
  const courierCompany = toStringValue(courier.company).trim();

  if (!id || !waybillId || !status || !courierCompany) {
    throw new Error('Tracking response is missing required fields.');
  }

  return {
    id,
    waybill_id: waybillId,
    status,
    link: toNullableString(record.link),
    order_id: toNullableString(record.order_id),
    origin: {
      contact_name: toNullableString(origin.contact_name),
      address: toNullableString(origin.address),
    },
    destination: {
      contact_name: toNullableString(destination.contact_name),
      address: toNullableString(destination.address),
    },
    courier: {
      company: courierCompany,
      driver_name: toNullableString(courier.driver_name) ?? undefined,
      driver_phone: toNullableString(courier.driver_phone) ?? undefined,
      driver_photo_url: toNullableString(courier.driver_photo_url) ?? undefined,
      driver_plate_number: toNullableString(courier.driver_plate_number) ?? undefined,
    },
    history,
  };
}

function normalizeAreaId(address: Address): string | null {
  return address.area_id || null;
}

function parseCoord(value: number | string | null | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
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

export async function getAreaById(
  areaId: string,
): Promise<{ data: BiteshipArea | null; error: Error | null }> {
  try {
    const { data, error } = await invokeBiteship({
      action: 'maps',
      payload: { input: areaId },
    });

    if (error) {
      return { data: null, error };
    }

    const response = (data || {}) as BiteshipProxyResponse<BiteshipArea[]>;
    const areas = Array.isArray(response.areas)
      ? response.areas
      : Array.isArray(response.data as unknown[] | undefined)
        ? ((response.data as unknown[]).filter(Boolean) as BiteshipArea[])
        : [];

    // Only return exact ID match, not fallback to first result
    const area = areas.find(a => a.id === areaId) || null;
    return { data: area, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
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

    const recipientName =
      typeof params.address.receiver_name === 'string' ? params.address.receiver_name.trim() : '';
    const packageName =
      params.package_name || (recipientName ? `Order for ${recipientName}` : 'Pharmacy order');

    const destLat = parseCoord(params.address.latitude);
    const destLng = parseCoord(params.address.longitude);
    const hasDestCoords = destLat !== null && destLng !== null;

    const { data, error } = await invokeBiteship({
      action: 'rates',
      payload: {
        ...(destinationAreaId
          ? { destination_area_id: destinationAreaId }
          : { destination_postal_code: destinationPostalCode }),
        ...(hasDestCoords
          ? {
              destination_latitude: destLat,
              destination_longitude: destLng,
            }
          : {}),
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

export async function getPublicOrderTracking(
  orderId: string,
): Promise<{ data: TrackingResult | null; error: Error | null }> {
  try {
    const normalizedOrderId = orderId.trim();
    if (!normalizedOrderId) {
      return { data: null, error: new Error('Order ID is required.') };
    }

    const { data, error } = await invokeBiteship({
      action: 'track_public',
      payload: {
        order_id: normalizedOrderId,
      },
    });

    if (error) {
      return { data: null, error: toInvokeError(error) };
    }

    return {
      data: mapTrackingResult(data),
      error: null,
    };
  } catch (error) {
    return { data: null, error: toError(error) };
  }
}
