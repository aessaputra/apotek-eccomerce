export const SHEET_SNAP_POINTS: number[] = [60];

export const SHEET_ANIMATION_CONFIG = {
  type: 'spring' as const,
  damping: 24,
  mass: 0.9,
  stiffness: 200,
};

export function formatRupiah(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}
