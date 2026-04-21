import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  getCategories,
  getAllProductsOptimized,
  getHomeBannersByPlacement,
  getLatestProductsWithImages,
  normalizeHomeBannerRecord,
  resolveHomeBannerMediaUrl,
} from '@/services/home.service';
import type { HomeBannerRow } from '@/types/homeBanner';

const mockOrder = jest.fn();
const mockIn = jest.fn();
const mockEq = jest.fn();
const mockSelect = jest.fn();
const mockFrom = jest.fn();
const mockGetPublicUrl = jest.fn();

jest.mock('@/utils/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    storage: {
      from: jest.fn(() => ({
        getPublicUrl: (...args: unknown[]) => mockGetPublicUrl(...args),
      })),
    },
  },
}));

jest.mock('@/utils/error', () => ({
  classifyError: jest.fn(),
  isRetryableError: jest.fn(() => false),
}));

jest.mock('@/utils/retry', () => ({
  withRetry: jest.fn(),
}));

const { withRetry } = jest.requireMock('@/utils/retry') as {
  withRetry: jest.Mock;
};

function createBannerRow(partial: Partial<HomeBannerRow> = {}): HomeBannerRow {
  return {
    id: 'banner-1',
    placement_key: 'home_banner_top',
    intent: 'informational',
    title: 'Banner title',
    body: 'Banner body',
    media_path: null,
    cta_kind: 'route',
    cta_label: 'Open',
    cta_route: 'home/all-products',
    is_active: true,
    created_at: '2026-04-03T00:00:00Z',
    updated_at: '2026-04-03T00:00:00Z',
    ...partial,
  };
}

describe('home.service home banners', () => {
  let consoleWarnSpy: jest.SpiedFunction<typeof console.warn>;

  beforeEach(() => {
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockFrom.mockReset();
    mockSelect.mockReset();
    mockEq.mockReset();
    mockIn.mockReset();
    mockOrder.mockReset();
    mockGetPublicUrl.mockReset();
    withRetry.mockReset();

    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ in: mockIn });
    mockIn.mockReturnValue({ order: mockOrder });
    mockGetPublicUrl.mockImplementation((...args: unknown[]) => {
      const [path] = args as [string];

      return {
        data: { publicUrl: `https://cdn.example.com/${path}` },
      };
    });
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it('resolves public URLs for banner media paths', () => {
    expect(resolveHomeBannerMediaUrl('banners/home_banner_top/banner.webp')).toBe(
      'https://cdn.example.com/banners/home_banner_top/banner.webp',
    );
  });

  it('normalizes a valid banner row', () => {
    const record = normalizeHomeBannerRecord(
      createBannerRow({ media_path: 'banners/home_banner_top/banner.webp' }),
    );

    expect(record).not.toBeNull();
    expect(record?.cta?.route).toBe('home/all-products');
    expect(record?.mediaUrl).toBe('https://cdn.example.com/banners/home_banner_top/banner.webp');
  });

  it('drops invalid CTA payloads but keeps the banner content', () => {
    const record = normalizeHomeBannerRecord(
      createBannerRow({ cta_route: 'invalid-route', cta_label: 'Open' }),
    );

    expect(record).not.toBeNull();
    expect(record?.cta).toBeNull();
    expect(record?.ctaKind).toBe('none');
  });

  it('returns null for banners without visible payload', () => {
    const record = normalizeHomeBannerRecord(
      createBannerRow({ title: null, body: null, media_path: null, cta_kind: 'none' }),
    );

    expect(record).toBeNull();
  });

  it('maps active banners by placement and keeps one per placement', async () => {
    mockOrder.mockImplementation(async () => ({
      data: [
        createBannerRow({
          id: 'banner-top',
          placement_key: 'home_banner_top',
          cta_route: 'home/all-products',
        }),
        createBannerRow({
          id: 'banner-bottom',
          placement_key: 'home_banner_bottom',
          cta_kind: 'none',
          cta_label: null,
          cta_route: null,
        }),
      ],
      error: null,
    }));
    mockFrom.mockReturnValue({ select: mockSelect });

    const banners = await getHomeBannersByPlacement();

    expect(mockFrom).toHaveBeenCalledWith('home_banners');
    expect(banners.home_banner_top?.cta?.route).toBe('home/all-products');
    expect(banners.home_banner_bottom?.placementKey).toBe('home_banner_bottom');
  });

  it('throws when categories query fails instead of silently returning empty data', async () => {
    const order = jest.fn(async () => ({ data: null, error: new Error('categories failed') }));
    const select = jest.fn(() => ({ order }));

    mockFrom.mockImplementation((table: string) => {
      if (table === 'categories') {
        return { select };
      }

      return { select: mockSelect };
    });

    await expect(getCategories()).rejects.toThrow('categories failed');
  });

  it('throws when latest products query fails instead of pretending the home feed is empty', async () => {
    const productLimit = jest.fn(async () => ({ data: null, error: new Error('products failed') }));
    const productOrder = jest.fn(() => ({ limit: productLimit }));
    const productGt = jest.fn(() => ({ order: productOrder }));
    const productEq = jest.fn(() => ({ gt: productGt }));
    const productSelect = jest.fn(() => ({ eq: productEq }));

    mockFrom.mockImplementation((table: string) => {
      if (table === 'products') {
        return { select: productSelect };
      }

      return { select: mockSelect };
    });

    await expect(getLatestProductsWithImages(10)).rejects.toThrow('products failed');
  });

  it('suppresses warning logs for aborted optimized product requests', async () => {
    withRetry.mockRejectedValueOnce({ name: 'UnknownError', message: 'Aborted' });

    const result = await getAllProductsOptimized();

    expect(result.data).toBeNull();
    expect(result.error?.name).toBe('AbortError');
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });
});
