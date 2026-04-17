import { createSnapToken } from '@/services/checkout.service';
import {
  ErrorType,
  classifyError,
  translateErrorMessage,
  withFallbackMessage,
  type AppError,
} from '@/utils/error';
import { withRetry } from '@/utils/retry';
import type { Address } from '@/types/address';
import type { CartSnapshot } from '@/types/cart';

export interface PersistedCheckoutSession {
  fingerprint: string;
  idempotency_key: string;
  order_id: string | null;
  selected_address_id: string | null;
  selected_shipping_key: string | null;
  destination_area_id: string | null;
  destination_postal_code: number | null;
  selected_address_latitude: number | null;
  selected_address_longitude: number | null;
}

interface CheckoutFingerprintInput {
  userId?: string;
  selectedAddress: Address | null;
  selectedAddressId: string | null;
  selectedShippingKey: string | null;
  quoteDestination: {
    areaId: string | null;
    postalCode: number | null;
  };
  snapshot: CartSnapshot;
}

interface PersistedCheckoutSessionInput {
  fingerprint: string;
  idempotencyKey: string;
  orderId: string | null;
  selectedAddress: Address | null;
  selectedAddressId: string | null;
  selectedShippingKey: string | null;
  quoteDestination: {
    areaId: string | null;
    postalCode: number | null;
  };
}

function stringifyCoordinate(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : 'null';
}

export function buildCheckoutFingerprint({
  userId,
  selectedAddress,
  selectedAddressId,
  selectedShippingKey,
  quoteDestination,
  snapshot,
}: CheckoutFingerprintInput): string {
  return [
    userId ?? '',
    selectedAddressId ?? '',
    stringifyCoordinate(selectedAddress?.latitude),
    stringifyCoordinate(selectedAddress?.longitude),
    selectedShippingKey ?? '',
    quoteDestination.areaId ?? '',
    quoteDestination.postalCode ?? '',
    snapshot.itemCount,
    snapshot.estimatedWeightGrams,
    snapshot.packageValue,
  ].join('|');
}

export function buildPersistedCheckoutSession({
  fingerprint,
  idempotencyKey,
  orderId,
  selectedAddress,
  selectedAddressId,
  selectedShippingKey,
  quoteDestination,
}: PersistedCheckoutSessionInput): PersistedCheckoutSession {
  return {
    fingerprint,
    idempotency_key: idempotencyKey,
    order_id: orderId,
    selected_address_id: selectedAddressId,
    selected_shipping_key: selectedShippingKey,
    destination_area_id: quoteDestination.areaId,
    destination_postal_code: quoteDestination.postalCode,
    selected_address_latitude: selectedAddress?.latitude ?? null,
    selected_address_longitude: selectedAddress?.longitude ?? null,
  };
}

export function toTranslatedCheckoutError(error: unknown, fallbackMessage: string): AppError {
  const classifiedError = withFallbackMessage(classifyError(error), fallbackMessage);

  return {
    ...classifiedError,
    message: translateErrorMessage(classifiedError),
  };
}

export async function requestSnapTokenWithRetry(orderId: string) {
  return withRetry(
    async () => {
      const { data, error } = await createSnapToken(orderId);

      if (error || !data) {
        throw error ?? new Error('Gagal membuat token pembayaran.');
      }

      return data;
    },
    {
      maxRetries: 2,
      baseDelay: 800,
      maxDelay: 4000,
      shouldRetry: error => {
        const classifiedError = classifyError(error);

        return (
          classifiedError.type === ErrorType.NETWORK ||
          classifiedError.type === ErrorType.TIMEOUT ||
          classifiedError.type === ErrorType.SERVER
        );
      },
    },
  );
}
