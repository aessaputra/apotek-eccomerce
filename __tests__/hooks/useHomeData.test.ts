import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react-native';
import {
  getCategories,
  getHomeBannersByPlacement,
  getLatestProductsWithImages,
} from '@/services/home.service';
import type {
  CategoryRow,
  HomeBannersByPlacement,
  ProductWithImages,
} from '@/services/home.service';
import { createEmptyHomeBanners } from '@/constants/homeBanner.constants';
import { useHomeData } from '@/hooks/useHomeData';

let focusEffectCallback: (() => void | (() => void)) | undefined;

const mockGetCategories = getCategories as jest.MockedFunction<typeof getCategories>;
const mockGetLatestProductsWithImages = getLatestProductsWithImages as jest.MockedFunction<
  typeof getLatestProductsWithImages
>;
const mockGetHomeBannersByPlacement = getHomeBannersByPlacement as jest.MockedFunction<
  typeof getHomeBannersByPlacement
>;

jest.mock('expo-router', () => {
  const React = require('react') as typeof import('react');

  return {
    useFocusEffect: (callback: () => void | (() => void)) => {
      focusEffectCallback = callback;

      React.useEffect(() => {
        return callback();
      }, [callback]);
    },
  };
});

jest.mock('@/services/home.service', () => ({
  getCategories: jest.fn(),
  getHomeBannersByPlacement: jest.fn(),
  getLatestProductsWithImages: jest.fn(),
}));

function createHomeBanners(): HomeBannersByPlacement {
  return {
    ...createEmptyHomeBanners(),
    home_banner_top: {
      id: 'banner-top',
      placementKey: 'home_banner_top',
      intent: 'informational',
      title: 'Top Banner',
      body: null,
      mediaPath: null,
      mediaUrl: null,
      ctaKind: 'route',
      cta: { label: 'Open Orders', route: 'home/all-products' },
      isActive: true,
      createdAt: '2026-04-03T00:00:00Z',
      updatedAt: '2026-04-03T00:00:00Z',
    },
    home_banner_bottom: null,
  };
}

function createCategory(index: number): CategoryRow {
  return {
    id: `category-${index}`,
    name: `Category ${index}`,
    slug: `category-${index}`,
    logo_url: `https://cdn.example.com/cat-${index}.jpg`,
    created_at: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
  };
}

function createProduct(index: number): ProductWithImages {
  return {
    id: `product-${index}`,
    name: `Product ${index}`,
    slug: `product-${index}`,
    description: `Description for product ${index}`,
    price: 10000 + index * 1000,
    stock: 10 + index,
    weight: 100 + index * 10,
    category_id: `category-${index % 3}`,
    is_active: true,
    created_at: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
    updated_at: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
    images: [
      {
        url: `https://cdn.example.com/prod-${index}.jpg`,
        sort_order: 0,
      },
    ],
  };
}

describe('useHomeData', () => {
  let consoleWarnSpy: jest.SpiedFunction<typeof console.warn>;

  beforeEach(() => {
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    focusEffectCallback = undefined;
    mockGetCategories.mockReset();
    mockGetHomeBannersByPlacement.mockReset();
    mockGetLatestProductsWithImages.mockReset();
    cleanup();
  });

  it('fetches categories and products on initial mount', async () => {
    const categories = [createCategory(1), createCategory(2)];
    const products = [createProduct(1), createProduct(2)];

    mockGetCategories.mockResolvedValue(categories);
    mockGetHomeBannersByPlacement.mockResolvedValue(createHomeBanners());
    mockGetLatestProductsWithImages.mockResolvedValue(products);

    const { result } = renderHook(() => useHomeData());

    expect(result.current.isLoadingCategories).toBe(true);
    expect(result.current.isLoadingProducts).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoadingCategories).toBe(false);
      expect(result.current.isLoadingProducts).toBe(false);
    });

    expect(result.current.categories).toEqual(categories);
    expect(result.current.banners.home_banner_top?.title).toBe('Top Banner');
    expect(result.current.products).toEqual(products);
    expect(result.current.error).toBeNull();
    expect(result.current.bannerError).toBeNull();
    expect(mockGetCategories).toHaveBeenCalledTimes(1);
    expect(mockGetHomeBannersByPlacement).toHaveBeenCalledTimes(1);
    expect(mockGetLatestProductsWithImages).toHaveBeenCalledWith(10);
  });

  it('handles errors gracefully', async () => {
    const errorMessage = 'Network error';
    mockGetCategories.mockRejectedValue(new Error(errorMessage));
    mockGetHomeBannersByPlacement.mockRejectedValue(new Error('Banner error'));
    mockGetLatestProductsWithImages.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useHomeData());

    await waitFor(() => {
      expect(result.current.isLoadingCategories).toBe(false);
      expect(result.current.isLoadingProducts).toBe(false);
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.bannerError).toBe('Banner error');
    expect(result.current.banners).toEqual(createEmptyHomeBanners());
    expect(result.current.categories).toEqual([]);
    expect(result.current.products).toEqual([]);
  });

  it('exposes refresh function that can be called manually', async () => {
    const categories = [createCategory(1)];
    const products = [createProduct(1)];

    mockGetCategories.mockResolvedValue(categories);
    mockGetHomeBannersByPlacement.mockResolvedValue(createHomeBanners());
    mockGetLatestProductsWithImages.mockResolvedValue(products);

    const { result } = renderHook(() => useHomeData());

    await waitFor(() => {
      expect(result.current.isLoadingCategories).toBe(false);
    });

    mockGetCategories.mockClear();
    mockGetHomeBannersByPlacement.mockClear();
    mockGetLatestProductsWithImages.mockClear();

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockGetCategories).toHaveBeenCalledTimes(1);
    expect(mockGetHomeBannersByPlacement).toHaveBeenCalledTimes(1);
    expect(mockGetLatestProductsWithImages).toHaveBeenCalledTimes(1);
  });

  it('sets loading states correctly during fetch', async () => {
    let resolveCategories: (value: CategoryRow[]) => void = () => {};
    let resolveProducts: (value: ProductWithImages[]) => void = () => {};

    mockGetCategories.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveCategories = resolve;
        }),
    );
    mockGetLatestProductsWithImages.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveProducts = resolve;
        }),
    );

    mockGetHomeBannersByPlacement.mockResolvedValue(createHomeBanners());

    const { result } = renderHook(() => useHomeData());

    expect(result.current.isLoadingBanners).toBe(true);
    expect(result.current.isLoadingCategories).toBe(true);
    expect(result.current.isLoadingProducts).toBe(true);

    await act(async () => {
      resolveCategories([createCategory(1)]);
      resolveProducts([createProduct(1)]);
    });

    await waitFor(() => {
      expect(result.current.isLoadingCategories).toBe(false);
      expect(result.current.isLoadingProducts).toBe(false);
      expect(result.current.isLoadingBanners).toBe(false);
    });
  });

  it('maintains previous data while refreshing', async () => {
    const initialCategories = [createCategory(1)];
    const initialProducts = [createProduct(1)];
    const refreshedCategories = [...initialCategories, createCategory(2)];
    const refreshedProducts = [...initialProducts, createProduct(2)];

    mockGetCategories
      .mockResolvedValueOnce(initialCategories)
      .mockResolvedValueOnce(refreshedCategories);
    mockGetHomeBannersByPlacement.mockResolvedValueOnce(createHomeBanners()).mockResolvedValueOnce({
      ...createHomeBanners(),
      home_banner_bottom: {
        id: 'banner-bottom',
        placementKey: 'home_banner_bottom',
        intent: 'branding',
        title: 'Bottom Banner',
        body: null,
        mediaPath: 'banners/home_banner_bottom/banner.webp',
        mediaUrl: 'https://example.com/banner.webp',
        ctaKind: 'none',
        cta: null,
        isActive: true,
        createdAt: '2026-04-03T00:00:00Z',
        updatedAt: '2026-04-03T00:00:00Z',
      },
    });
    mockGetLatestProductsWithImages
      .mockResolvedValueOnce(initialProducts)
      .mockResolvedValueOnce(refreshedProducts);

    const { result } = renderHook(() => useHomeData());

    await waitFor(() => {
      expect(result.current.categories).toEqual(initialCategories);
      expect(result.current.products).toEqual(initialProducts);
      expect(result.current.banners.home_banner_top?.title).toBe('Top Banner');
    });

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.categories).toEqual(refreshedCategories);
      expect(result.current.products).toEqual(refreshedProducts);
      expect(result.current.banners.home_banner_bottom?.title).toBe('Bottom Banner');
    });

    expect(mockGetCategories).toHaveBeenCalledTimes(2);
    expect(mockGetHomeBannersByPlacement).toHaveBeenCalledTimes(2);
    expect(mockGetLatestProductsWithImages).toHaveBeenCalledTimes(2);
  });

  it('keeps previous home content visible during focus revalidation', async () => {
    const initialCategories = [createCategory(1)];
    const initialProducts = [createProduct(1)];
    const refreshedCategories = [...initialCategories, createCategory(2)];
    const refreshedProducts = [...initialProducts, createProduct(2)];

    let resolveCategories: ((value: CategoryRow[]) => void) | undefined;
    let resolveProducts: ((value: ProductWithImages[]) => void) | undefined;

    mockGetCategories.mockResolvedValueOnce(initialCategories).mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveCategories = resolve;
        }),
    );
    mockGetHomeBannersByPlacement
      .mockResolvedValueOnce(createHomeBanners())
      .mockResolvedValueOnce(createHomeBanners());
    mockGetLatestProductsWithImages.mockResolvedValueOnce(initialProducts).mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveProducts = resolve;
        }),
    );

    const { result } = renderHook(() => useHomeData());

    await waitFor(() => {
      expect(result.current.categories).toEqual(initialCategories);
      expect(result.current.products).toEqual(initialProducts);
      expect(result.current.banners.home_banner_top?.title).toBe('Top Banner');
      expect(result.current.isLoadingCategories).toBe(false);
      expect(result.current.isLoadingProducts).toBe(false);
    });

    await act(async () => {
      focusEffectCallback?.();
    });

    expect(result.current.categories).toEqual(initialCategories);
    expect(result.current.products).toEqual(initialProducts);
    expect(result.current.banners.home_banner_top?.title).toBe('Top Banner');
    expect(result.current.isLoadingCategories).toBe(false);
    expect(result.current.isLoadingProducts).toBe(false);
    expect(result.current.isLoadingBanners).toBe(false);
    expect(result.current.isRefreshing).toBe(false);

    await act(async () => {
      resolveCategories?.(refreshedCategories);
      resolveProducts?.(refreshedProducts);
    });

    await waitFor(() => {
      expect(result.current.categories).toEqual(refreshedCategories);
      expect(result.current.products).toEqual(refreshedProducts);
    });
  });

  it('returns empty arrays when services return empty results', async () => {
    mockGetCategories.mockResolvedValue([]);
    mockGetHomeBannersByPlacement.mockResolvedValue(createEmptyHomeBanners());
    mockGetLatestProductsWithImages.mockResolvedValue([]);

    const { result } = renderHook(() => useHomeData());

    await waitFor(() => {
      expect(result.current.isLoadingCategories).toBe(false);
      expect(result.current.isLoadingProducts).toBe(false);
    });

    expect(result.current.categories).toEqual([]);
    expect(result.current.products).toEqual([]);
    expect(result.current.banners).toEqual(createEmptyHomeBanners());
    expect(result.current.error).toBeNull();
  });

  it('keeps core home content visible when banner fetch fails', async () => {
    const categories = [createCategory(1)];
    const products = [createProduct(1)];

    mockGetCategories.mockResolvedValue(categories);
    mockGetLatestProductsWithImages.mockResolvedValue(products);
    mockGetHomeBannersByPlacement.mockRejectedValue(new Error('Banner fetch failed'));

    const { result } = renderHook(() => useHomeData());

    await waitFor(() => {
      expect(result.current.isLoadingBanners).toBe(false);
      expect(result.current.isLoadingProducts).toBe(false);
      expect(result.current.isLoadingCategories).toBe(false);
    });

    expect(result.current.categories).toEqual(categories);
    expect(result.current.products).toEqual(products);
    expect(result.current.bannerError).toBe('Banner fetch failed');
    expect(result.current.error).toBeNull();
  });
});
