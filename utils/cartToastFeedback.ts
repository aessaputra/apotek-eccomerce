import type { useToastController } from '@tamagui/toast';

type ToastController = ReturnType<typeof useToastController>;

const CART_TOAST_COPY = {
  loginRequired: 'Silakan masuk untuk menambahkan produk ke keranjang.',
  success: 'Produk ditambahkan ke keranjang.',
  failure: 'Produk belum masuk keranjang. Coba lagi sebentar lagi.',
  stockFailure: 'Stok produk belum cukup. Periksa jumlah atau pilih produk lain.',
  networkFailure: 'Koneksi bermasalah. Periksa internet Anda lalu coba lagi.',
} as const;

function getErrorText(error: Error | null | undefined) {
  return error?.message?.toLowerCase() ?? '';
}

export function getAddToCartFailureMessage(error: Error | null | undefined): string {
  const message = getErrorText(error);

  if (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('timeout') ||
    message.includes('abort') ||
    message.includes('offline')
  ) {
    return CART_TOAST_COPY.networkFailure;
  }

  if (
    message.includes('stock') ||
    message.includes('stok') ||
    message.includes('insufficient') ||
    message.includes('not enough')
  ) {
    return CART_TOAST_COPY.stockFailure;
  }

  return CART_TOAST_COPY.failure;
}

export function showAddToCartLoginToast(toast: ToastController) {
  toast.show(CART_TOAST_COPY.loginRequired, {
    message: 'Masuk diperlukan agar keranjang Anda tersimpan.',
    type: 'foreground',
  });
}

export function showAddToCartSuccessToast(toast: ToastController, productName?: string | null) {
  toast.show(CART_TOAST_COPY.success, {
    message: productName ? `${productName} sudah ada di keranjang.` : undefined,
    type: 'background',
  });
}

export function showAddToCartFailureToast(toast: ToastController, error?: Error | null) {
  toast.show(getAddToCartFailureMessage(error), { type: 'foreground' });
}
