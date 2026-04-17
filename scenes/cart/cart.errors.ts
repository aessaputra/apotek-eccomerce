import { ErrorType, type AppError } from '@/utils/error';

export function getRecoverySuggestion(error: AppError): string | null {
  switch (error.type) {
    case ErrorType.NETWORK:
    case ErrorType.TIMEOUT:
      return 'Periksa koneksi internet Anda, lalu tekan tombol muat ulang.';
    case ErrorType.AUTH:
      return 'Login ulang diperlukan agar proses checkout bisa dilanjutkan.';
    case ErrorType.SERVER:
      return 'Coba lagi dalam beberapa menit. Jika masalah berlanjut, hubungi dukungan.';
    case ErrorType.VALIDATION:
      return 'Periksa alamat, kurir, dan jumlah produk sebelum mencoba lagi.';
    case ErrorType.ABORT:
      return 'Ulangi proses yang dibatalkan jika masih diperlukan.';
    case ErrorType.UNKNOWN:
    default:
      return error.retryable ? 'Silakan coba lagi beberapa saat lagi.' : null;
  }
}
