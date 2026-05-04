import type { PaymentResult } from '@/types/payment';

export const PAYMENT_SUCCESS_STATUSES = ['settlement'];
export const PAYMENT_PENDING_STATUSES = ['pending', 'authorize'];
export const PAYMENT_FAILED_STATUSES = ['deny', 'cancel', 'expire', 'failure'];
export const ORDERS_ROUTE = '/orders';

export const DEEP_LINK_PATTERNS = [
  'gojek://',
  'shopeeid://',
  'gopay://',
  '//wsa.wallet.airpay.co.id/',
];

export const TRUSTED_PAYMENT_HOSTS = [
  'app.midtrans.com',
  'midtrans.com',
  'snap.midtrans.com',
  '3ds.midtrans.com',
  'secure.midtrans.com',
  'api.midtrans.com',
  'cdn.midtrans.com',
  'app.sandbox.midtrans.com',
  'sandbox.midtrans.com',
  'simulator.sandbox.midtrans.com',
  'snap-sandbox.midtrans.com',
  'api.sandbox.midtrans.com',
  'gojek.midtrans.com',
  'gopay.midtrans.com',
  'qris.midtrans.com',
];

export function resolveRouteParam(param: string | string[] | undefined): string {
  return (Array.isArray(param) ? param[0] : param) ?? '';
}

export function isDeepLink(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  return DEEP_LINK_PATTERNS.some(pattern => lowerUrl.includes(pattern));
}

export function isTrustedPaymentUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return TRUSTED_PAYMENT_HOSTS.some(host => urlObj.hostname === host);
  } catch {
    return false;
  }
}

export function translateCheckoutError(message: string | undefined, fallback: string): string {
  const normalized = (message || '').toLowerCase();

  if (
    normalized.includes('timeout') ||
    normalized.includes('timed out') ||
    normalized.includes('abort')
  ) {
    return 'Permintaan timeout. Pastikan koneksi stabil lalu coba lagi.';
  }

  if (
    normalized.includes('network') ||
    normalized.includes('fetch') ||
    normalized.includes('offline') ||
    normalized.includes('koneksi')
  ) {
    return 'Koneksi internet bermasalah. Silakan cek jaringan Anda lalu coba lagi.';
  }

  if (
    normalized.includes('midtrans') ||
    normalized.includes('snap') ||
    normalized.includes('payment')
  ) {
    return 'Layanan pembayaran sedang bermasalah. Silakan coba beberapa saat lagi.';
  }

  if (
    normalized.includes('database') ||
    normalized.includes('duplicate') ||
    normalized.includes('constraint')
  ) {
    return 'Sistem sedang sibuk menyimpan data pembayaran. Silakan coba lagi.';
  }

  return fallback;
}

export function isPollingTimeoutError(message: string | undefined): boolean {
  const normalized = (message || '').toLowerCase();

  return (
    normalized.includes('masih diproses') ||
    normalized.includes('beberapa saat lagi') ||
    normalized.includes('status pembayaran')
  );
}

export function parsePaymentNavigationStatus(url?: string): PaymentResult['status'] | null {
  const safeUrl = (url || '').toLowerCase();
  if (!safeUrl) {
    return null;
  }

  const transactionStatusMatch = safeUrl.match(/transaction_status=([^&]+)/);
  const transactionStatus =
    transactionStatusMatch && transactionStatusMatch[1]
      ? decodeURIComponent(transactionStatusMatch[1])
      : '';

  if (PAYMENT_SUCCESS_STATUSES.some(status => transactionStatus.includes(status))) {
    return 'success';
  }

  if (PAYMENT_FAILED_STATUSES.some(status => transactionStatus.includes(status))) {
    return 'cancel';
  }

  if (PAYMENT_PENDING_STATUSES.some(status => transactionStatus.includes(status))) {
    return 'pending';
  }

  const reachedFinish =
    safeUrl.includes('/finish') || safeUrl.includes('/unfinish') || safeUrl.includes('/error');

  if (reachedFinish) {
    if (safeUrl.includes('/error') || safeUrl.includes('/unfinish')) {
      return 'cancel';
    }

    return 'pending';
  }

  return null;
}
