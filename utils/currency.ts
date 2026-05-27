const RUPIAH_FORMATTER = new Intl.NumberFormat('id-ID', {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

/**
 * Formats a numeric amount as Indonesian Rupiah with the app's readable spacing.
 * Example: 56000 -> "Rp 56.000".
 */
export function formatRupiah(amount: number): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;

  return `Rp ${RUPIAH_FORMATTER.format(Math.round(safeAmount))}`;
}
