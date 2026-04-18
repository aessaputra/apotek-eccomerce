import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';
import { useFocusEffect, useRouter } from 'expo-router';
import { OrderStatusTabs } from '@/components/elements/OrderStatusTabs';
import type { OrderTab } from '@/components/elements/OrderStatusTabs';
import { OrdersHeroCard } from '@/components/elements/OrdersHeroCard';
import { BuyAgainCarousel } from '@/components/elements/BuyAgainCarousel';
import AppAlertDialog from '@/components/elements/AppAlertDialog';
import { CheckCircleIcon } from '@/components/icons';
import { TAB_BAR_HEIGHT } from '@/constants/ui';
import { useAppSlice } from '@/slices';
import {
  getOrderTabCounts,
  getPastPurchasedProducts,
  addProductToCart,
  type OrderTabCounts,
  type PastPurchaseProduct,
} from '@/services';

const EMPTY_COUNTS: OrderTabCounts = {
  unpaid: 0,
  packing: 0,
  shipped: 0,
  completed: 0,
};

export default function Orders() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, dispatch, completedOrdersTabViewedByUser, markCompletedOrdersTabViewed } =
    useAppSlice();
  const [counts, setCounts] = useState<OrderTabCounts>(EMPTY_COUNTS);
  const [pastProducts, setPastProducts] = useState<PastPurchaseProduct[]>([]);
  const [isLoadingPastProducts, setIsLoadingPastProducts] = useState(Boolean(user?.id));
  const [cartSuccessProductName, setCartSuccessProductName] = useState<string | null>(null);
  const latestRequestIdRef = useRef(0);
  const hasViewedCompletedOrdersTab = user?.id
    ? completedOrdersTabViewedByUser[user.id] === true
    : false;

  const loadData = useCallback(async () => {
    if (!user?.id) {
      latestRequestIdRef.current += 1;
      setCounts(EMPTY_COUNTS);
      setPastProducts([]);
      setIsLoadingPastProducts(false);
      return;
    }

    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;
    setIsLoadingPastProducts(true);

    const [countsResult, productsResult] = await Promise.all([
      getOrderTabCounts(user.id),
      getPastPurchasedProducts(user.id, 2),
    ]);

    if (latestRequestIdRef.current !== requestId) {
      return;
    }

    setIsLoadingPastProducts(false);

    if (!countsResult.error && countsResult.data) {
      setCounts(countsResult.data);
    } else if (__DEV__ && countsResult.error) {
      console.warn('[Orders] Failed to load order tab counts:', countsResult.error.message);
    }

    if (!productsResult.error) {
      setPastProducts(productsResult.data);
    } else if (__DEV__) {
      console.warn('[Orders] Failed to load past products:', productsResult.error.message);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const displayCounts = useMemo(() => {
    if (!hasViewedCompletedOrdersTab) {
      return counts;
    }

    return {
      ...counts,
      completed: 0,
    };
  }, [counts, hasViewedCompletedOrdersTab]);

  const handleTabChange = useCallback(
    (tab: OrderTab) => {
      if (tab === 'completed' && user?.id && !hasViewedCompletedOrdersTab) {
        dispatch(markCompletedOrdersTabViewed(user.id));
      }

      router.push(`/orders/${tab}`);
    },
    [dispatch, hasViewedCompletedOrdersTab, markCompletedOrdersTabViewed, router, user?.id],
  );

  const handleProductPress = useCallback(
    (product: PastPurchaseProduct) => {
      router.push({
        pathname: '/product-details',
        params: { id: product.id, name: product.name },
      });
    },
    [router],
  );

  const handleAddToCart = useCallback(
    async (product: PastPurchaseProduct) => {
      if (!user?.id) {
        return;
      }

      const { error } = await addProductToCart(user.id, product.id, 1);

      if (error) {
        if (__DEV__) {
          console.warn('[Orders] Failed to add product to cart:', error.message);
        }
        return;
      }

      setCartSuccessProductName(product.name);
    },
    [user?.id],
  );

  const handleCartSuccessDialogOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setCartSuccessProductName(null);
    }
  }, []);

  const scrollContentBottomPadding = TAB_BAR_HEIGHT + insets.bottom + 16;
  const visiblePastProducts = useMemo(() => pastProducts, [pastProducts]);

  return (
    <YStack flex={1} backgroundColor="$background">
      <ScrollView
        testID="orders-scroll-view"
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: scrollContentBottomPadding,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}>
        <YStack gap="$4">
          <OrdersHeroCard />
          <OrderStatusTabs counts={displayCounts} onTabChange={handleTabChange} />
          <BuyAgainCarousel
            products={visiblePastProducts}
            isLoading={isLoadingPastProducts}
            onProductPress={handleProductPress}
            onAddToCart={handleAddToCart}
          />
        </YStack>
      </ScrollView>

      <AppAlertDialog
        open={cartSuccessProductName !== null}
        onOpenChange={handleCartSuccessDialogOpenChange}
        title="Produk berhasil ditambahkan"
        description={`${cartSuccessProductName ?? 'Produk'} berhasil ditambahkan ke keranjang`}
        confirmText="OK"
        confirmColor="$primary"
        confirmTextColor="$white"
        hideTitle
        icon={<CheckCircleIcon size={48} color="$primary" />}
      />
    </YStack>
  );
}
