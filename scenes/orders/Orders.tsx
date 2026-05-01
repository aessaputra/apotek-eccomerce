import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView } from 'react-native';
import { YStack } from 'tamagui';
import { useRouter } from 'expo-router';
import { OrderStatusTabs } from '@/components/elements/OrderStatusTabs';
import type { OrderTab } from '@/components/elements/OrderStatusTabs';
import { OrdersHeroCard } from '@/components/elements/OrdersHeroCard';
import { BuyAgainCarousel } from '@/components/elements/BuyAgainCarousel';
import AppAlertDialog from '@/components/elements/AppAlertDialog';
import { CheckCircleIcon } from '@/components/icons';
import { useOrdersLandingData } from '@/hooks/useOrdersLandingData';
import { useAppSlice } from '@/slices';
import { addProductToCart, type PastPurchaseProduct } from '@/services';

const ORDERS_CONTENT_CONTAINER_STYLE = {
  paddingTop: 16,
  paddingBottom: 24,
  flexGrow: 1,
} as const;

export default function Orders() {
  const router = useRouter();
  const { user } = useAppSlice();
  const [cartSuccessProductName, setCartSuccessProductName] = useState<string | null>(null);
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
