import { useState, useEffect, useCallback } from 'react';
import {
  getCategories,
  getLatestProductsWithImages,
  type CategoryRow,
  type ProductWithImages,
} from '@/services/home.service';

export interface HomeDataState {
  categories: CategoryRow[];
  products: ProductWithImages[];
  isLoadingCategories: boolean;
  isLoadingProducts: boolean;
  error: string | null;
}

export interface UseHomeDataReturn extends HomeDataState {
  refresh: () => Promise<void>;
}

/**
 * Hook for fetching and managing Home screen data
 * Handles categories and products fetching with loading states
 */
export function useHomeData(): UseHomeDataReturn {
  const [state, setState] = useState<HomeDataState>({
    categories: [],
    products: [],
    isLoadingCategories: true,
    isLoadingProducts: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    setState(prev => ({
      ...prev,
      isLoadingCategories: true,
      isLoadingProducts: true,
      error: null,
    }));

    try {
      const [categories, products] = await Promise.all([
        getCategories(),
        getLatestProductsWithImages(10),
      ]);

      setState({
        categories,
        products,
        isLoadingCategories: false,
        isLoadingProducts: false,
        error: null,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      if (__DEV__) console.warn('[useHomeData] fetch error:', err);

      setState(prev => ({
        ...prev,
        isLoadingCategories: false,
        isLoadingProducts: false,
        error: errorMessage,
      }));
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...state,
    refresh: fetchData,
  };
}

export default useHomeData;
