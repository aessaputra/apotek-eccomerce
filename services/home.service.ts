import { supabase } from '@/utils/supabase';
import type { Tables } from '@/types/supabase';

export type CategoryRow = Tables<'categories'>;
export type ProductRow = Tables<'products'>;
export type ProductImageRow = Tables<'product_images'>;

export interface ProductWithImages extends ProductRow {
  images: { url: string; sort_order: number }[];
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
