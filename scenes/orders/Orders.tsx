import React, { useCallback, useMemo } from 'react';
import { useToastController } from '@tamagui/toast';
import { ScrollView } from 'react-native';
import { YStack } from 'tamagui';
import { useRouter } from 'expo-router';
import { OrderStatusTabs } from '@/components/elements/OrderStatusTabs';
import type { OrderTab } from '@/components/elements/OrderStatusTabs';
import { OrdersHeroCard } from '@/components/elements/OrdersHeroCard';
import { BuyAgainCarousel } from '@/components/elements/BuyAgainCarousel';
import { useOrdersLandingData } from '@/hooks/useOrdersLandingData';
import { useAppSlice } from '@/slices';
import { addProductToCart, type PastPurchaseProduct } from '@/services';
import {
  showAddToCartFailureToast,
  showAddToCartLoginToast,
  showAddToCartSuccessToast,
} from '@/utils/cartToastFeedback';

const ORDERS_CONTENT_CONTAINER_STYLE = {
  paddingTop: 16,
  paddingBottom: 24,
  flexGrow: 1,
} as const;

export default function Orders() {
  const router = useRouter();
  const toast = useToastController();
  const { user } = useAppSlice();
  const { counts, pastProducts, isLoadingPastProducts } = useOrdersLandingData(user?.id);

  const handleTabChange = useCallback(
    (tab: OrderTab) => {
      router.push(`/orders/${tab}`);
    },
    [router],
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
        showAddToCartLoginToast(toast);
        return;
      }

      try {
        const { error } = await addProductToCart(user.id, product.id, 1);

        if (error) {
          showAddToCartFailureToast(toast, error);
          return;
        }

        showAddToCartSuccessToast(toast, product.name);
      } catch {
        showAddToCartFailureToast(toast);
      }
    },
    [toast, user?.id],
  );

  const displayProducts = useMemo(() => pastProducts.slice(0, 2), [pastProducts]);

  return (
    <YStack flex={1} backgroundColor="$background">
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={ORDERS_CONTENT_CONTAINER_STYLE}
        showsVerticalScrollIndicator={false}>
        <OrdersHeroCard />
        <OrderStatusTabs counts={counts} onTabChange={handleTabChange} />
        <BuyAgainCarousel
          products={displayProducts}
          isLoading={isLoadingPastProducts}
          onProductPress={handleProductPress}
          onAddToCart={handleAddToCart}
        />
      </ScrollView>
    </YStack>
  );
}
