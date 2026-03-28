import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Platform, RefreshControl, useWindowDimensions } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, Spinner, Text, XStack, YStack, styled, useMedia, useTheme } from 'tamagui';
import { ChevronLeftIcon } from '@/components/icons';
import ProductCard from '@/components/elements/ProductCard';
import { TAB_BAR_HEIGHT } from '@/constants/ui';
import { useProductsPaginated } from '@/hooks';
import { addProductToCart, PRODUCTS_CACHE_TTL_MS, type ProductListItem } from '@/services';
import { useAppSlice } from '@/slices';
import type { RouteParams } from '@/types/routes.types';
import { getThemeColor } from '@/utils/theme';

const ScreenRoot = styled(YStack, {
  flex: 1,
  backgroundColor: '$background',
});

const ContentStack = styled(YStack, {
  width: '100%',
  maxWidth: 560,
  alignSelf: 'center',
  gap: '$3.5',

  $gtSm: {
    maxWidth: 720,
    gap: '$4',
  },

  $gtMd: {
    maxWidth: 920,
    gap: '$4.5',
  },

  $gtLg: {
    maxWidth: 1080,
  },
});

const HeaderButton = styled(Card, {
  width: 40,
  height: 40,
  borderRadius: '$10',
  backgroundColor: '$surface',
  borderWidth: 1,
  borderColor: '$surfaceBorder',
  alignItems: 'center',
  justifyContent: 'center',
  elevation: 2,
  pressStyle: { opacity: 0.9, scale: 0.98 },
});

const EmptyState = styled(YStack, {
  minHeight: 220,
  borderRadius: '$5',
  borderWidth: 1,
  borderColor: '$surfaceBorder',
  backgroundColor: '$surface',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '$4',
  gap: '$2',
});

interface ProductGridItemProps {
  item: ProductListItem;
  width: number;
  iconColor: string;
  onPress: (productId: string) => void;
  onAddToCart: (productId: string) => void;
}

const ProductGridItem = React.memo(function ProductGridItem({
  item,
  width,
  iconColor,
  onPress,
  onAddToCart,
}: ProductGridItemProps) {
  return (
    <YStack pb="$2.5" mb="$2.5" width={width}>
      <ProductCard
        item={item}
        width={width}
        iconColor={iconColor}
        onPress={() => onPress(item.id)}
        onAddToCart={() => onAddToCart(item.id)}
      />
    </YStack>
  );
});

function LoadingState() {
  return (
    <YStack flex={1} alignItems="center" justifyContent="center" gap="$3">
      <Spinner size="large" color="$primary" />
      <Text fontSize="$4" color="$colorSubtle">
        Loading products...
      </Text>
    </YStack>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <ContentStack px="$4">
      <EmptyState>
        <Text fontSize={16} fontWeight="700" color="$color" textAlign="center">
          Failed to load products
        </Text>
        <Text fontSize={13} color="$colorSubtle" textAlign="center">
          {message}
        </Text>
      </EmptyState>
    </ContentStack>
  );
}

function ListFooter({
  isFetchingMore,
  isRevalidating,
}: {
  isFetchingMore: boolean;
  isRevalidating: boolean;
}) {
  if (!isFetchingMore && !isRevalidating) {
    return <YStack height={12} />;
  }

  return (
    <YStack alignItems="center" justifyContent="center" py="$3" gap="$2">
      <Spinner color="$primary" size="small" />
      <Text fontSize="$2" color="$colorSubtle">
        {isFetchingMore ? 'Loading more products...' : 'Refreshing product cache...'}
      </Text>
    </YStack>
  );
}

function CacheErrorBanner({ message }: { message: string }) {
  return (
    <Card bordered size="$3" backgroundColor="$dangerSoft" borderColor="$danger" marginBottom="$3">
      <YStack padding="$3" gap="$1">
        <Text fontSize="$3" fontWeight="700" color="$danger">
          Cached products are shown, but the latest refresh failed
        </Text>
        <Text fontSize="$2" color="$danger">
          {message}
        </Text>
      </YStack>
    </Card>
  );
}

export default function ProductList() {
  const router = useRouter();
  const media = useMedia();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const params = useLocalSearchParams<RouteParams<'home/product-list'>>();
  const { user } = useAppSlice();
  const [cartFeedback, setCartFeedback] = useState<string | null>(null);

  const categoryId = useMemo(() => {
    const value = params.categoryId;
    if (Array.isArray(value)) return value[0] ?? '';
    return typeof value === 'string' ? value : '';
  }, [params.categoryId]);

  const categoryName = useMemo(() => {
    const value = params.categoryName;
    if (Array.isArray(value)) return value[0] ?? 'Category';
    return typeof value === 'string' ? value : 'Category';
  }, [params.categoryName]);

  const {
    products,
    error,
    hasMore,
    isInitialLoading,
    isRefreshing,
    isFetchingMore,
    isRevalidating,
    refresh,
    refreshIfNeeded,
    loadMore,
    metrics,
  } = useProductsPaginated(categoryId);

  const topPadding = (media.gtSm ? 16 : 12) + insets.top;
  const horizontalPadding = media.gtLg ? '$6' : media.gtMd ? '$5.5' : media.gtSm ? '$5' : '$4';
  const columns = media.gtMd ? 3 : 2;
  const maxWidth = media.gtLg ? 1080 : media.gtMd ? 920 : 720;
  const contentPaddingHorizontal = media.gtLg ? 24 : media.gtMd ? 22 : media.gtSm ? 20 : 16;
  const itemGap = media.gtSm ? 12 : 10;
  const iconColor = getThemeColor(theme, 'colorPress');
  const listWidth = Math.min(screenWidth, maxWidth);
  const cardWidth = Math.max(
    140,
    Math.floor(
      (listWidth - contentPaddingHorizontal * 2 - itemGap * Math.max(columns - 1, 0)) / columns,
    ),
  );

  useFocusEffect(
    useCallback(() => {
      void refreshIfNeeded();
    }, [refreshIfNeeded]),
  );

  const handleRefresh = useCallback(() => {
    void refresh();
  }, [refresh]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleOpenProductDetails = useCallback(
    (productId: string) => {
      router.push({
        pathname: '/home/product-details',
        params: { id: productId },
      });
    },
    [router],
  );

  const handleAddToCart = useCallback(
    async (productId: string) => {
      if (!user?.id) {
        setCartFeedback('Silakan login untuk menambahkan produk ke keranjang.');
        setTimeout(() => setCartFeedback(null), 3000);
        return;
      }

      const { error: cartError } = await addProductToCart(user.id, productId, 1);

      if (cartError) {
        setCartFeedback(cartError.message || 'Gagal menambahkan produk ke keranjang.');
      } else {
        setCartFeedback('Produk berhasil ditambahkan ke keranjang.');
      }

      setTimeout(() => setCartFeedback(null), 3000);
    },
    [user?.id],
  );

  const renderItem = useCallback(
    ({ item }: { item: ProductListItem }) => (
      <ProductGridItem
        item={item}
        width={cardWidth}
        iconColor={iconColor}
        onPress={handleOpenProductDetails}
        onAddToCart={handleAddToCart}
      />
    ),
    [cardWidth, handleAddToCart, handleOpenProductDetails, iconColor],
  );

  const handleLoadMore = useCallback(() => {
    if (!hasMore) {
      return;
    }

    void loadMore();
  }, [hasMore, loadMore]);

  const cacheSummary = useMemo(() => {
    if (metrics.cacheAgeMs === null) {
      return null;
    }

    return `Cache ${Math.round(metrics.cacheAgeMs / 1000)}s • TTL ${Math.round(PRODUCTS_CACHE_TTL_MS / 1000)}s • ${metrics.lastPayloadBytes} bytes • ${metrics.lastFetchDurationMs} ms`;
  }, [metrics.cacheAgeMs, metrics.lastFetchDurationMs, metrics.lastPayloadBytes]);

  if (!categoryId.trim()) {
    return (
      <ScreenRoot>
        <ErrorState message="Missing category id." />
      </ScreenRoot>
    );
  }

  if (isInitialLoading && products.length === 0) {
    return (
      <ScreenRoot>
        <ContentStack pt={topPadding} px={horizontalPadding} pb="$3">
          <XStack alignItems="center" justifyContent="space-between" gap="$3">
            <HeaderButton onPress={handleBack} role="button" aria-label="Back">
              <ChevronLeftIcon size={20} color={getThemeColor(theme, 'color')} />
            </HeaderButton>
            <Text
              flex={1}
              textAlign="center"
              px="$2"
              fontSize={16}
              fontWeight="700"
              color="$color"
              numberOfLines={1}>
              {categoryName}
            </Text>
            <YStack width={40} />
          </XStack>
        </ContentStack>
        <LoadingState />
      </ScreenRoot>
    );
  }

  return (
    <ScreenRoot>
      <FlatList
        data={products}
        key={columns}
        numColumns={columns}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        style={{ width: listWidth, alignSelf: 'center' }}
        showsVerticalScrollIndicator={false}
        bounces={false}
        initialNumToRender={columns * 4}
        maxToRenderPerBatch={columns * 4}
        updateCellsBatchingPeriod={50}
        windowSize={7}
        removeClippedSubviews={Platform.OS === 'android'}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        contentContainerStyle={{
          paddingHorizontal: contentPaddingHorizontal,
          paddingBottom: TAB_BAR_HEIGHT + insets.bottom,
          flexGrow: products.length === 0 ? 1 : 0,
        }}
        columnWrapperStyle={columns > 1 ? { gap: itemGap } : undefined}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={getThemeColor(theme, 'primary')}
          />
        }
        ListHeaderComponent={
          <ContentStack pt={topPadding} px={horizontalPadding} pb="$3">
            <XStack alignItems="center" justifyContent="space-between" gap="$3">
              <HeaderButton onPress={handleBack} role="button" aria-label="Back">
                <ChevronLeftIcon size={20} color={getThemeColor(theme, 'color')} />
              </HeaderButton>
              <Text
                flex={1}
                textAlign="center"
                px="$2"
                fontSize={16}
                fontWeight="700"
                color="$color"
                numberOfLines={1}>
                {categoryName}
              </Text>
              <YStack width={40} />
            </XStack>
            {cacheSummary ? (
              <Text fontSize="$2" color="$colorMuted" pt="$2">
                {cacheSummary}
              </Text>
            ) : null}
            {error && products.length > 0 ? <CacheErrorBanner message={error} /> : null}
            {cartFeedback ? (
              <Text fontSize={13} color="$primary" pt="$2">
                {cartFeedback}
              </Text>
            ) : null}
          </ContentStack>
        }
        ListEmptyComponent={
          error ? (
            <ErrorState message={error} />
          ) : (
            <ContentStack px={horizontalPadding}>
              <EmptyState>
                <Text fontSize={16} fontWeight="700" color="$color" textAlign="center">
                  No products found
                </Text>
                <Text fontSize={13} color="$colorSubtle" textAlign="center">
                  This category has no active products with stock.
                </Text>
              </EmptyState>
            </ContentStack>
          )
        }
        ListFooterComponent={
          <ListFooter isFetchingMore={isFetchingMore} isRevalidating={isRevalidating} />
        }
      />
    </ScreenRoot>
  );
}
