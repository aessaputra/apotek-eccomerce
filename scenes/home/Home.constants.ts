export const HOME_COPY = {
  defaultUserName: 'Pelanggan',
  userRole: 'Pelanggan',
  heroTitle: 'Belanja obat makin mudah',
  searchPlaceholder: 'Cari nama produk',
  cartLabel: 'Keranjang',
  cartHint: 'Buka halaman keranjang belanja',
  searchLabel: 'Cari produk',
  searchHint: 'Buka halaman pencarian produk',
  coreErrorTitle: 'Konten utama belum berhasil dimuat',
  retryLabel: 'Coba Lagi',
  bannerWarning: 'Banner promo belum berhasil dimuat. Konten utama tetap tersedia.',
  bannerTopLoadingLabel: 'Memuat banner utama',
  bannerBottomLoadingLabel: 'Memuat banner beranda berikutnya',
  categorySectionTitle: 'Kategori',
  categoryLoadingLabel: 'Memuat kategori',
  categoryError: 'Gagal memuat kategori. Coba lagi.',
  categoryEmpty: 'Belum ada kategori tersedia',
  productSectionTitle: 'Produk Terbaru',
  productLoadingLabel: 'Memuat produk terbaru',
  productError: 'Gagal memuat produk terbaru. Coba lagi.',
  productEmpty: 'Belum ada produk tersedia',
} as const;

export const HOME_SPACE_TOKEN_TO_PX = {
  '$2.5': 10,
  $3: 12,
  '$3.5': 14,
  $4: 16,
  $5: 20,
  '$5.5': 22,
  $6: 24,
} as const;

export const HOME_CONTENT_MAX_WIDTH = {
  base: 560,
  gtSm: 720,
  gtMd: 920,
  gtLg: 1080,
} as const;

export type HomeSpaceToken = keyof typeof HOME_SPACE_TOKEN_TO_PX;
