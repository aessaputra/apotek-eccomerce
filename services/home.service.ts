import { supabase } from '@/utils/supabase';
import type { Tables } from '@/types/supabase';
import {
  createEmptyHomeBanners,
  HOME_BANNER_CTA_ROUTES,
  HOME_BANNER_INTENTS,
  HOME_BANNER_MEDIA_PREFIX_BY_PLACEMENT,
  HOME_BANNER_PLACEMENTS,
  HOME_BANNER_STORAGE_BUCKET,
} from '@/constants/homeBanner.constants';
import type {
  HomeBannerCTA,
  HomeBannersByPlacement,
  HomeBannerCtaKind,
  HomeBannerCtaRoute,
  HomeBannerIntent,
  HomeBannerItem,
  HomeBannerPlacement,
  HomeBannerRow,
} from '@/types/homeBanner';
import { classifyError, isRetryableError } from '@/utils/error';
import { withRetry } from '@/utils/retry';

export type CategoryRow = Tables<'categories'>;
export type ProductRow = Tables<'products'>;
export type ProductImageRow = Tables<'product_images'>;
export const PRODUCTS_PAGE_SIZE = 24;
export const PRODUCTS_CACHE_TTL_MS = 5 * 60 * 1000;

const PRODUCT_LIST_SELECT = `
  id,
  name,
  price,
  category_id,
  created_at,
  product_images (
    url,
    sort_order
  )
`;

export interface ProductListImage {
  url: string;
  sort_order: number;
}

export interface ProductListItem {
  id: string;
  name: string;
  price: number;
  category_id: string | null;
  created_at: string;
  images: ProductListImage[];
}

export interface ProductListResult {
  data: ProductListItem[] | null;
  error: Error | null;
  metrics: ProductListMetrics | null;
}

export interface ProductListMetrics {
  durationMs: number;
  payloadBytes: number;
  fetchedAt: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export interface GetProductsOptimizedParams {
  offset?: number;
  limit?: number;
  signal?: AbortSignal;
}

export interface ProductWithImages extends ProductRow {
  images: { url: string; sort_order: number }[];
}

export interface ProductDetailsData extends ProductWithImages {
  category_name: string | null;
  category_slug: string | null;
  category_logo_url: string | null;
}

export type { HomeBannersByPlacement, HomeBannerItem, HomeBannerPlacement };

interface CartMutationResult {
  error: Error | null;
}

function isAbortError(error: unknown): error is Error {
  return error instanceof Error && error.name === 'AbortError';
}

function getPayloadBytes(value: unknown): number {
  return JSON.stringify(value).length;
}

function toUserError(error: unknown, fallback: string): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error(fallback);
}

function logHomeServiceError(context: string, error: unknown): void {
  if (!__DEV__ || isAbortError(error)) {
    return;
  }

  if (error instanceof Error) {
    console.warn(`[HomeService] ${context}:`, error.message);
    return;
  }

  console.warn(`[HomeService] ${context}:`, error);
}

function normalizeProductListRow(
  product: ProductRow & { product_images?: ProductListImage[] | null },
): ProductListItem {
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    category_id: product.category_id,
    created_at: product.created_at,
    images: (product.product_images ?? []).map(image => ({
      url: image.url,
      sort_order: image.sort_order,
    })),
  };
}

function normalizeOptionalText(value: string | null): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isHomeBannerPlacement(value: string): value is HomeBannerPlacement {
  return (HOME_BANNER_PLACEMENTS as readonly string[]).includes(value);
}

function isHomeBannerIntent(value: string): value is HomeBannerIntent {
  return (HOME_BANNER_INTENTS as readonly string[]).includes(value);
}

function isHomeBannerCtaRoute(value: string): value is HomeBannerCtaRoute {
  return (HOME_BANNER_CTA_ROUTES as readonly string[]).includes(value);
}

function isHomeBannerCtaKind(value: string): value is HomeBannerCtaKind {
  return value === 'none' || value === 'route';
}

function hasVisibleBannerPayload(record: {
  title: string | null;
  body: string | null;
  mediaPath: string | null;
}): boolean {
  return Boolean(record.title || record.body || record.mediaPath);
}

function matchesBannerMediaPrefix(mediaPath: string, placementKey: HomeBannerPlacement): boolean {
  return mediaPath.startsWith(HOME_BANNER_MEDIA_PREFIX_BY_PLACEMENT[placementKey]);
}

export function resolveHomeBannerMediaUrl(mediaPath: string | null): string | null {
  const normalizedPath = normalizeOptionalText(mediaPath);

  if (!normalizedPath) {
    return null;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(HOME_BANNER_STORAGE_BUCKET).getPublicUrl(normalizedPath);

  return publicUrl || null;
}

export function normalizeHomeBannerRecord(record: HomeBannerRow): HomeBannerItem | null {
  if (!isHomeBannerPlacement(record.placement_key)) {
    if (__DEV__) {
      console.warn(
        '[HomeService] normalizeHomeBannerRecord invalid placement:',
        record.placement_key,
      );
    }
    return null;
  }

  if (!isHomeBannerIntent(record.intent)) {
    if (__DEV__) {
      console.warn('[HomeService] normalizeHomeBannerRecord invalid intent:', record.intent);
    }
    return null;
  }

  const title = normalizeOptionalText(record.title);
  const body = normalizeOptionalText(record.body);
  const normalizedMediaPath = normalizeOptionalText(record.media_path);
  const mediaPath =
    normalizedMediaPath && matchesBannerMediaPrefix(normalizedMediaPath, record.placement_key)
      ? normalizedMediaPath
      : null;

  if (normalizedMediaPath && !mediaPath && __DEV__) {
    console.warn(
      '[HomeService] normalizeHomeBannerRecord invalid media path for placement:',
      record.placement_key,
      normalizedMediaPath,
    );
  }

  if (!hasVisibleBannerPayload({ title, body, mediaPath })) {
    return null;
  }

  const normalizedCtaKind: HomeBannerCtaKind = isHomeBannerCtaKind(record.cta_kind)
    ? record.cta_kind
    : 'none';
  const ctaLabel = normalizeOptionalText(record.cta_label);
  const ctaRoute = normalizeOptionalText(record.cta_route);

  let cta: HomeBannerCTA | null = null;
  if (normalizedCtaKind === 'route' && ctaLabel && ctaRoute && isHomeBannerCtaRoute(ctaRoute)) {
    cta = {
      label: ctaLabel,
      route: ctaRoute,
    };
  } else if (normalizedCtaKind === 'route' && __DEV__) {
    console.warn('[HomeService] normalizeHomeBannerRecord invalid CTA payload:', record.id);
  }

  return {
    id: record.id,
    placementKey: record.placement_key,
    intent: record.intent,
    title,
    body,
    mediaPath,
    mediaUrl: resolveHomeBannerMediaUrl(mediaPath),
    ctaKind: cta ? 'route' : 'none',
    cta,
    isActive: record.is_active,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

export async function getHomeBannersByPlacement(): Promise<HomeBannersByPlacement> {
  const initialState = createEmptyHomeBanners();

  try {
    const { data, error } = await supabase
      .from('home_banners')
      .select('*')
      .eq('is_active', true)
      .in('placement_key', [...HOME_BANNER_PLACEMENTS])
      .order('updated_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data ?? []).reduce<HomeBannersByPlacement>((acc, row) => {
      const banner = normalizeHomeBannerRecord(row);

      if (!banner) {
        return acc;
      }

      if (acc[banner.placementKey]) {
        if (__DEV__) {
          console.warn(
            '[HomeService] duplicate active banner for placement, keeping latest:',
            banner.placementKey,
          );
        }
        return acc;
      }

      acc[banner.placementKey] = banner;
      return acc;
    }, initialState);
  } catch (error) {
    logHomeServiceError('getHomeBannersByPlacement error', error);
    throw toUserError(error, 'Failed to load home banners. Please try again.');
  }
}

/**
 * Fetch all active categories from Supabase
 */
export async function getCategories(): Promise<CategoryRow[]> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      if (__DEV__) console.warn('[HomeService] getCategories error:', error.message);
      return [];
    }

    return data || [];
  } catch (error) {
    if (__DEV__) console.warn('[HomeService] getCategories error:', error);
    return [];
  }
}

/**
 * Fetch latest active products
 * Limited to 10 most recent products by default
 */
export async function getLatestProducts(limit: number = 10): Promise<ProductRow[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .gt('stock', 0)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      if (__DEV__) console.warn('[HomeService] getLatestProducts error:', error.message);
      return [];
    }

    return data || [];
  } catch (error) {
    if (__DEV__) console.warn('[HomeService] getLatestProducts error:', error);
    return [];
  }
}

export async function getProductsOptimized(
  categoryId: string,
  params: GetProductsOptimizedParams = {},
): Promise<ProductListResult> {
  const normalizedCategoryId = categoryId.trim();
  const offset = params.offset ?? 0;
  const requestedLimit = Math.max(params.limit ?? PRODUCTS_PAGE_SIZE, 1);
  const startedAt = Date.now();

  if (!normalizedCategoryId) {
    return {
      data: [],
      error: null,
      metrics: {
        durationMs: 0,
        payloadBytes: 0,
        fetchedAt: Date.now(),
        offset,
        limit: requestedLimit,
        hasMore: false,
      },
    };
  }

  try {
    const data = await withRetry(
      async () => {
        let query = supabase
          .from('products')
          .select(PRODUCT_LIST_SELECT)
          .eq('category_id', normalizedCategoryId)
          .eq('is_active', true)
          .gt('stock', 0)
          .order('created_at', { ascending: false })
          .range(offset, offset + requestedLimit);

        if (params.signal) {
          query = query.abortSignal(params.signal);
        }

        const { data: rows, error } = await query;

        if (error) {
          throw error;
        }

        return rows;
      },
      {
        maxRetries: 2,
        baseDelay: 250,
        maxDelay: 1000,
        shouldRetry: error => !isAbortError(error) && isRetryableError(classifyError(error)),
      },
    );

    const rows = (
      (data ?? []) as unknown as Array<ProductRow & { product_images?: ProductListImage[] | null }>
    ).map(normalizeProductListRow);
    const hasMore = rows.length > requestedLimit;
    const normalizedData = hasMore ? rows.slice(0, requestedLimit) : rows;
    const fetchedAt = Date.now();

    return {
      data: normalizedData,
      error: null,
      metrics: {
        durationMs: fetchedAt - startedAt,
        payloadBytes: getPayloadBytes(normalizedData),
        fetchedAt,
        offset,
        limit: requestedLimit,
        hasMore,
      },
    };
  } catch (error) {
    logHomeServiceError('getProductsOptimized unexpected error', error);
    return {
      data: null,
      error: isAbortError(error)
        ? error
        : toUserError(error, 'Failed to load products. Please try again.'),
      metrics: null,
    };
  }
}

export const ALL_PRODUCTS_CACHE_KEY = '__ALL__';

export async function getAllProductsOptimized(
  params: GetProductsOptimizedParams = {},
): Promise<ProductListResult> {
  const offset = params.offset ?? 0;
  const requestedLimit = Math.max(params.limit ?? PRODUCTS_PAGE_SIZE, 1);
  const startedAt = Date.now();

  try {
    const data = await withRetry(
      async () => {
        let query = supabase
          .from('products')
          .select(PRODUCT_LIST_SELECT)
          .eq('is_active', true)
          .gt('stock', 0)
          .order('created_at', { ascending: false })
          .range(offset, offset + requestedLimit);

        if (params.signal) {
          query = query.abortSignal(params.signal);
        }

        const { data: rows, error } = await query;

        if (error) {
          throw error;
        }

        return rows;
      },
      {
        maxRetries: 2,
        baseDelay: 250,
        maxDelay: 1000,
        shouldRetry: error => !isAbortError(error) && isRetryableError(classifyError(error)),
      },
    );

    const rows = (
      (data ?? []) as unknown as Array<ProductRow & { product_images?: ProductListImage[] | null }>
    ).map(normalizeProductListRow);
    const hasMore = rows.length > requestedLimit;
    const normalizedData = hasMore ? rows.slice(0, requestedLimit) : rows;
    const fetchedAt = Date.now();

    return {
      data: normalizedData,
      error: null,
      metrics: {
        durationMs: fetchedAt - startedAt,
        payloadBytes: getPayloadBytes(normalizedData),
        fetchedAt,
        offset,
        limit: requestedLimit,
        hasMore,
      },
    };
  } catch (error) {
    logHomeServiceError('getAllProductsOptimized unexpected error', error);
    return {
      data: null,
      error: isAbortError(error)
        ? error
        : toUserError(error, 'Failed to load products. Please try again.'),
      metrics: null,
    };
  }
}

/**
 * Fetch product images for a list of product IDs
 */
export async function getProductImages(productIds: string[]): Promise<ProductImageRow[]> {
  if (productIds.length === 0) return [];

  try {
    const { data, error } = await supabase
      .from('product_images')
      .select('*')
      .in('product_id', productIds)
      .order('sort_order', { ascending: true });

    if (error) {
      if (__DEV__) console.warn('[HomeService] getProductImages error:', error.message);
      return [];
    }

    return data || [];
  } catch (error) {
    if (__DEV__) console.warn('[HomeService] getProductImages error:', error);
    return [];
  }
}

/**
 * Fetch products with their images in a single call
 * This performs two queries and merges the results
 */
export async function getLatestProductsWithImages(
  limit: number = 10,
): Promise<ProductWithImages[]> {
  try {
    // Fetch products
    const products = await getLatestProducts(limit);

    if (products.length === 0) return [];

    // Fetch images for these products
    const productIds = products.map(p => p.id);
    const images = await getProductImages(productIds);

    // Group images by product_id
    const imagesByProduct = images.reduce(
      (acc, image) => {
        if (!acc[image.product_id]) acc[image.product_id] = [];
        acc[image.product_id].push({ url: image.url, sort_order: image.sort_order });
        return acc;
      },
      {} as Record<string, { url: string; sort_order: number }[]>,
    );

    // Merge products with their images
    const productsWithImages: ProductWithImages[] = products.map(product => ({
      ...product,
      images: imagesByProduct[product.id] || [],
    }));

    return productsWithImages;
  } catch (error) {
    if (__DEV__) console.warn('[HomeService] getLatestProductsWithImages error:', error);
    return [];
  }
}

/**
 * Search products by name using Supabase ilike pattern
 */
export async function searchProducts(query: string): Promise<ProductWithImages[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .gt('stock', 0)
    .ilike('name', `%${trimmedQuery}%`)
    .order('name', { ascending: true })
    .limit(50);

  if (error) {
    if (__DEV__) console.warn('[HomeService] searchProducts error:', error.message);
    throw new Error('Failed to search products. Please try again.');
  }

  if (!data || data.length === 0) return [];

  const productIds = data.map(p => p.id);
  const images = await getProductImages(productIds);

  const imagesByProduct = images.reduce(
    (acc, image) => {
      if (!acc[image.product_id]) acc[image.product_id] = [];
      acc[image.product_id].push({ url: image.url, sort_order: image.sort_order });
      return acc;
    },
    {} as Record<string, { url: string; sort_order: number }[]>,
  );

  const productsWithImages: ProductWithImages[] = data.map(product => ({
    ...product,
    images: imagesByProduct[product.id] || [],
  }));

  return productsWithImages;
}

export async function getProductDetailsById(productId: string): Promise<ProductDetailsData | null> {
  const normalizedId = productId.trim();
  if (!normalizedId) return null;

  try {
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', normalizedId)
      .eq('is_active', true)
      .maybeSingle();

    if (productError) {
      if (__DEV__)
        console.warn('[HomeService] getProductDetailsById product error:', productError.message);
      return null;
    }

    if (!product) return null;

    const [imagesResult, categoryResult] = await Promise.all([
      supabase
        .from('product_images')
        .select('*')
        .eq('product_id', normalizedId)
        .order('sort_order', { ascending: true }),
      product.category_id
        ? supabase
            .from('categories')
            .select('name,slug,logo_url')
            .eq('id', product.category_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (imagesResult.error) {
      if (__DEV__)
        console.warn(
          '[HomeService] getProductDetailsById images error:',
          imagesResult.error.message,
        );
    }

    if (categoryResult.error) {
      if (__DEV__)
        console.warn(
          '[HomeService] getProductDetailsById category error:',
          categoryResult.error.message,
        );
    }

    return {
      ...product,
      images: (imagesResult.data || []).map(image => ({
        url: image.url,
        sort_order: image.sort_order,
      })),
      category_name: categoryResult.data?.name ?? null,
      category_slug: categoryResult.data?.slug ?? null,
      category_logo_url: categoryResult.data?.logo_url ?? null,
    };
  } catch (error) {
    if (__DEV__) console.warn('[HomeService] getProductDetailsById error:', error);
    return null;
  }
}

export async function addProductToCart(
  userId: string,
  productId: string,
  quantityToAdd: number = 1,
): Promise<CartMutationResult> {
  const normalizedUserId = userId.trim();
  const normalizedProductId = productId.trim();

  if (!normalizedUserId || !normalizedProductId || quantityToAdd <= 0) {
    return { error: new Error('Invalid cart mutation payload.') };
  }

  try {
    const { data: existingCarts, error: existingCartsError } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', normalizedUserId)
      .limit(1);

    if (existingCartsError) {
      return { error: existingCartsError as unknown as Error };
    }

    let cartId = existingCarts?.[0]?.id ?? null;

    if (!cartId) {
      const { data: insertedCart, error: insertedCartError } = await supabase
        .from('carts')
        .insert({ user_id: normalizedUserId })
        .select('id')
        .single();

      if (insertedCartError) {
        return { error: insertedCartError as unknown as Error };
      }

      cartId = insertedCart.id;
    }

    const { data: existingItem, error: existingItemError } = await supabase
      .from('cart_items')
      .select('id, quantity')
      .eq('cart_id', cartId)
      .eq('product_id', normalizedProductId)
      .maybeSingle();

    if (existingItemError) {
      return { error: existingItemError as unknown as Error };
    }

    if (existingItem) {
      const { error: updateError } = await supabase
        .from('cart_items')
        .update({ quantity: existingItem.quantity + quantityToAdd })
        .eq('id', existingItem.id);

      if (updateError) {
        return { error: updateError as unknown as Error };
      }

      return { error: null };
    }

    const { error: insertItemError } = await supabase.from('cart_items').insert({
      cart_id: cartId,
      product_id: normalizedProductId,
      quantity: quantityToAdd,
    });

    if (insertItemError) {
      return { error: insertItemError as unknown as Error };
    }

    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Format price to Indonesian Rupiah format
 * Example: 56000 -> "Rp 56.000"
 */
export function formatPrice(price: number): string {
  return `Rp ${price.toLocaleString('id-ID')}`;
}

/**
 * Get primary image URL from product images
 * Returns null if no images available
 */
export function getPrimaryImageUrl(product: ProductWithImages): string | null {
  if (!product.images || product.images.length === 0) return null;

  // Sort by sort_order and return the first one
  const sortedImages = [...product.images].sort((a, b) => a.sort_order - b.sort_order);
  return sortedImages[0].url;
}
