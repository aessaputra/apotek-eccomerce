import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
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
  isRefreshing: boolean;
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
    isRefreshing: false,
    error: null,
  });

  const activeRequestIdRef = useRef(0);
  const hasLoadedOnceRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      activeRequestIdRef.current += 1;
    };
  }, []);

  const fetchData = useCallback(async (reason: 'initial' | 'focus' | 'manual' = 'manual') => {
    const requestId = activeRequestIdRef.current + 1;
    activeRequestIdRef.current = requestId;

    const shouldPreserveContent = hasLoadedOnceRef.current;

    setState(prev => ({
      ...prev,
      isLoadingCategories: shouldPreserveContent ? prev.isLoadingCategories : true,
      isLoadingProducts: shouldPreserveContent ? prev.isLoadingProducts : true,
      isRefreshing: shouldPreserveContent && reason === 'manual',
      error: null,
    }));

    try {
      const [categories, products] = await Promise.all([
        getCategories(),
        getLatestProductsWithImages(10),
      ]);

      if (!isMountedRef.current || activeRequestIdRef.current !== requestId) {
        return;
      }

      hasLoadedOnceRef.current = true;

      setState({
        categories,
        products,
        isLoadingCategories: false,
        isLoadingProducts: false,
        isRefreshing: false,
        error: null,
      });
    } catch (err) {
      if (!isMountedRef.current || activeRequestIdRef.current !== requestId) {
        return;
      }

      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      if (__DEV__) console.warn('[useHomeData] fetch error:', err);

      setState(prev => ({
        ...prev,
        isLoadingCategories: false,
        isLoadingProducts: false,
        isRefreshing: false,
        error: errorMessage,
      }));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchData(hasLoadedOnceRef.current ? 'focus' : 'initial');
    }, [fetchData]),
  );

  return {
    ...state,
    refresh: () => fetchData(hasLoadedOnceRef.current ? 'manual' : 'initial'),
  };
}

export default useHomeData;
