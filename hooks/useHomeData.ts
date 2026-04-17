import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  getCategories,
  getHomeBannersByPlacement,
  getLatestProductsWithImages,
  type CategoryRow,
  type HomeBannersByPlacement,
  type ProductWithImages,
} from '@/services/home.service';
import { createEmptyHomeBanners } from '@/constants/homeBanner.constants';

export interface HomeDataState {
  banners: HomeBannersByPlacement;
  categories: CategoryRow[];
  products: ProductWithImages[];
  isLoadingBanners: boolean;
  isLoadingCategories: boolean;
  isLoadingProducts: boolean;
  isRefreshing: boolean;
  bannerError: string | null;
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
    banners: createEmptyHomeBanners(),
    categories: [],
    products: [],
    isLoadingBanners: true,
    isLoadingCategories: true,
    isLoadingProducts: true,
    isRefreshing: false,
    bannerError: null,
    error: null,
  });

  const activeRequestIdRef = useRef(0);
  const hasLoadedOnceRef = useRef(false);
  const isMountedRef = useRef(true);
  const latestStateRef = useRef(state);

  useEffect(() => {
    latestStateRef.current = state;
  }, [state]);

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
      isLoadingBanners: shouldPreserveContent ? prev.isLoadingBanners : true,
      isLoadingCategories: shouldPreserveContent ? prev.isLoadingCategories : true,
      isLoadingProducts: shouldPreserveContent ? prev.isLoadingProducts : true,
      isRefreshing: shouldPreserveContent && reason === 'manual',
      bannerError: null,
      error: null,
    }));

    try {
      const [categoriesResult, productsResult, bannersResult] = await Promise.allSettled([
        getCategories(),
        getLatestProductsWithImages(10),
        getHomeBannersByPlacement(),
      ]);

      if (!isMountedRef.current || activeRequestIdRef.current !== requestId) {
        return;
      }

      const previousState = latestStateRef.current;
      const categories =
        categoriesResult.status === 'fulfilled' ? categoriesResult.value : previousState.categories;
      const products =
        productsResult.status === 'fulfilled' ? productsResult.value : previousState.products;
      const banners =
        bannersResult.status === 'fulfilled' ? bannersResult.value : previousState.banners;

      if (categoriesResult.status === 'fulfilled' && productsResult.status === 'fulfilled') {
        hasLoadedOnceRef.current = true;
      }

      const nextError =
        categoriesResult.status === 'rejected'
          ? categoriesResult.reason instanceof Error
            ? categoriesResult.reason.message
            : 'Failed to load data'
          : productsResult.status === 'rejected'
            ? productsResult.reason instanceof Error
              ? productsResult.reason.message
              : 'Failed to load data'
            : null;

      const nextBannerError =
        bannersResult.status === 'rejected'
          ? bannersResult.reason instanceof Error
            ? bannersResult.reason.message
            : 'Failed to load home banners'
          : null;

      if (__DEV__) {
        if (categoriesResult.status === 'rejected') {
          console.warn('[useHomeData] categories fetch error:', categoriesResult.reason);
        }
        if (productsResult.status === 'rejected') {
          console.warn('[useHomeData] products fetch error:', productsResult.reason);
        }
        if (bannersResult.status === 'rejected') {
          console.warn('[useHomeData] banners fetch error:', bannersResult.reason);
        }
      }

      setState({
        banners,
        categories,
        products,
        isLoadingBanners: false,
        isLoadingCategories: false,
        isLoadingProducts: false,
        isRefreshing: false,
        bannerError: nextBannerError,
        error: nextError,
      });
    } catch (err) {
      if (!isMountedRef.current || activeRequestIdRef.current !== requestId) {
        return;
      }

      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      if (__DEV__) console.warn('[useHomeData] fetch error:', err);

      setState(prev => ({
        ...prev,
        isLoadingBanners: false,
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
