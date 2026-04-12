import { useCallback } from 'react';
import { RefreshControl, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, Image, ScrollView, Text, XStack, YStack, styled, useMedia, useTheme } from 'tamagui';
import { CartIcon, SearchIcon } from '@/components/icons';
import CategoryItem, { CategorySkeleton } from '@/components/elements/CategoryItem';
import ProductCard, { ProductCardSkeleton } from '@/components/elements/ProductCard';
import HomeBanner, { HomeBannerSkeleton } from '@/components/elements/HomeBanner';
import { HOME_BANNER_CTA_ROUTE_MAP } from '@/constants/homeBanner.constants';
import { TAB_BAR_HEIGHT } from '@/constants/ui';
import { useAppSlice } from '@/slices';
import { useHomeData, useCartPaginated } from '@/hooks';
import { addProductToCart } from '@/services';
import type { HomeBannerCTA } from '@/types/homeBanner';
import { getThemeColor } from '@/utils/theme';

const ScreenRoot = styled(YStack, {
  flex: 1,
  backgroundColor: '$background',
});

const ContentStack = styled(YStack, {
  width: '100%',
  maxWidth: 560,
  alignSelf: 'center',
  gap: '$4',

  $gtSm: {
    maxWidth: 720,
    gap: '$4.5',
  },

  $gtMd: {
    maxWidth: 920,
    gap: '$5',
  },

  $gtLg: {
    maxWidth: 1080,
  },
});

const SectionTitle = styled(Text, {
  color: '$color',
  fontSize: 14,
  fontWeight: '700',
});

const SurfaceIconButton = styled(Card, {
  width: 44,
  height: 44,
  borderRadius: '$4',
  backgroundColor: '$surface',
  borderWidth: 1,
  borderColor: '$surfaceBorder',
  alignItems: 'center',
  justifyContent: 'center',
  pressStyle: { opacity: 0.9 },
});

const SearchShell = styled(Card, {
  alignItems: 'center',
  flexDirection: 'row',
  borderRadius: '$10',
  borderWidth: 1,
  borderColor: '$surfaceBorder',
  backgroundColor: '$surface',
  height: 46,
  paddingLeft: '$2',
  paddingRight: '$3',
  gap: '$2',
  pressStyle: { opacity: 0.92 },
});

const SPACE_TOKEN_TO_PX = {
  '$2.5': 10,
  $3: 12,
  '$3.5': 14,
  $4: 16,
  $5: 20,
  '$5.5': 22,
  $6: 24,
} as const;

type SpaceToken = keyof typeof SPACE_TOKEN_TO_PX;

export default function Home() {
  const router = useRouter();
  const media = useMedia();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { user } = useAppSlice();
  const {
    banners,
    categories,
    products,
    isLoadingBanners,
    isLoadingCategories,
    isLoadingProducts,
    isRefreshing,
    refresh,
  } = useHomeData();

  const { snapshot: cartSnapshot } = useCartPaginated({ userId: user?.id });

  const iconColor = getThemeColor(theme, 'colorPress');
  const heroColor = getThemeColor(theme, 'color');
  const horizontalPadding = media.gtLg ? '$6' : media.gtMd ? '$5.5' : media.gtSm ? '$5' : '$4';
  const contentMaxWidth = media.gtLg ? 1080 : media.gtMd ? 920 : media.gtSm ? 720 : 560;
  const contentWidth = Math.min(screenWidth, contentMaxWidth);
  const horizontalPaddingPx = SPACE_TOKEN_TO_PX[horizontalPadding as SpaceToken];
  const categoryGap = media.gtLg ? '$3.5' : media.gtMd ? '$3' : media.gtSm ? '$2.5' : '$3';
  const categoryGapPx = SPACE_TOKEN_TO_PX[categoryGap as SpaceToken];
  const productGapPx = SPACE_TOKEN_TO_PX['$2.5'];
  const mobileInnerWidth = contentWidth - horizontalPaddingPx * 2;
  const productPeekOffset = Math.floor(productGapPx * 0.6);
  const categoryPeekOffset = Math.floor(categoryGapPx * 0.6);
  const productWidth = media.gtSm
    ? 156
    : Math.max(44, Math.floor((mobileInnerWidth - productGapPx - productPeekOffset) / 2));
  const mobileCategoryWidth = Math.max(
    44,
    Math.floor((mobileInnerWidth - categoryGapPx - categoryPeekOffset) / 2),
  );
  const topPadding = (media.gtSm ? 16 : 12) + insets.top;

  const categorySize = media.gtLg ? 'large' : media.gtSm ? 'medium' : 'small';
  const categoryLayout = media.gtLg
    ? 'grid4'
    : media.gtMd
      ? 'grid3'
      : media.gtSm
        ? 'grid2'
        : 'scroll';
  const isLargeScreen = media.gtSm;

  const handleOpenCart = () => {
    router.push('/cart');
  };

  const handleOpenSearch = () => {
    router.push('/home/search');
  };

  const handleCategoryPress = useCallback(
    (categoryId: string, categoryName: string) => {
      router.push({
        pathname: '/home/category-product-list',
        params: { categoryId, categoryName },
      });
    },
    [router],
  );

  const handleProductPress = useCallback(
    (productId: string, productName: string) => {
      router.push({
        pathname: '/home/product-details',
        params: { id: productId, name: productName },
      });
    },
    [router],
  );

  const handleAddToCart = useCallback(
    async (productId: string) => {
      if (!user?.id) return;
      await addProductToCart(user.id, productId, 1);
    },
    [user?.id],
  );

  const userName = user?.full_name || user?.name || user?.email?.split('@')[0] || 'Customer';
  const userAvatarUrl = user?.avatar_url;
  const userInitial = userName.charAt(0).toUpperCase();

  const handleBannerCTAPress = useCallback(
    (cta: HomeBannerCTA) => {
      router.push(HOME_BANNER_CTA_ROUTE_MAP[cta.route]);
    },
    [router],
  );

  return (
    <ScreenRoot>
      <ScrollView
        flex={1}
        showsVerticalScrollIndicator={false}
        bounces={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} />}>
        <ContentStack pt={topPadding} px={horizontalPadding} pb={TAB_BAR_HEIGHT + insets.bottom}>
          <XStack alignItems="center" justifyContent="space-between" gap="$3">
            <XStack alignItems="center" gap="$2.5" flex={1} minWidth={0}>
              {userAvatarUrl ? (
                <Card width={42} height={42} borderRadius="$10" overflow="hidden">
                  <YStack width="100%" height="100%">
                    <Image source={{ uri: userAvatarUrl }} width="100%" height="100%" />
                  </YStack>
                </Card>
              ) : (
                <YStack
                  width={42}
                  height={42}
                  borderRadius="$10"
                  alignItems="center"
                  justifyContent="center"
                  backgroundColor="$infoSoft">
                  <Text color="$primary" fontSize={16} fontWeight="700">
                    {userInitial}
                  </Text>
                </YStack>
              )}
              <YStack flex={1} minWidth={0}>
                <Text fontSize={14} fontWeight="600" color="$primary" numberOfLines={1}>
                  {userName}
                </Text>
                <Text fontSize={12} color="$colorSubtle" numberOfLines={1}>
                  Customer
                </Text>
              </YStack>
            </XStack>

            <XStack gap="$2" alignItems="center">
              <SurfaceIconButton
                onPress={handleOpenCart}
                role="button"
                aria-label="Cart"
                aria-describedby="Open cart page">
                <CartIcon size={20} color={iconColor} />
                {cartSnapshot.itemCount > 0 && (
                  <YStack
                    position="absolute"
                    top={4}
                    right={4}
                    backgroundColor="$primary"
                    borderRadius={100}
                    borderWidth={1.5}
                    borderColor="$surface"
                    minWidth={18}
                    height={18}
                    justifyContent="center"
                    alignItems="center"
                    px={cartSnapshot.itemCount > 9 ? '$1.5' : 0}
                    zIndex={10}
                    pointerEvents="none">
                    <Text color="$onPrimary" fontSize={9} fontWeight="900" lineHeight={11}>
                      {cartSnapshot.itemCount > 99 ? '99+' : cartSnapshot.itemCount}
                    </Text>
                  </YStack>
                )}
              </SurfaceIconButton>
            </XStack>
          </XStack>

          <YStack gap="$3">
            <Text
              color={heroColor}
              fontSize={media.gtSm ? 42 : 36}
              lineHeight={media.gtSm ? 48 : 42}
              fontWeight="800"
              letterSpacing={-0.8}
              maxWidth={media.gtSm ? 320 : '100%'}>
              Sehat jadi mudah
            </Text>

            <SearchShell
              onPress={handleOpenSearch}
              role="button"
              aria-label="Search products"
              aria-describedby="Open product discovery details">
              <Text flex={1} color="$searchPlaceholderColor" fontSize={14} fontWeight="500" pl="$1">
                Search by product name
              </Text>
              <SearchIcon size={16} color={iconColor} />
            </SearchShell>
          </YStack>

          {isLoadingBanners && !banners.home_banner_top ? (
            <HomeBannerSkeleton />
          ) : (
            <HomeBanner banner={banners.home_banner_top} onCTAPress={handleBannerCTAPress} />
          )}

          <YStack gap="$2.5">
            <SectionTitle>Categories</SectionTitle>
            {isLoadingCategories && categories.length === 0 ? (
              <CategorySkeleton isLargeScreen={isLargeScreen} />
            ) : categories.length === 0 ? (
              <Text fontSize={13} color="$colorSubtle">
                No categories available
              </Text>
            ) : isLargeScreen ? (
              <XStack flexWrap="wrap" gap={categoryGap} justifyContent="flex-start" width="100%">
                {categories.map(category => (
                  <CategoryItem
                    key={category.id}
                    category={category}
                    onPress={() => handleCategoryPress(category.id, category.name)}
                    size={categorySize}
                    layout={categoryLayout}
                  />
                ))}
              </XStack>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: categoryPeekOffset }}>
                <XStack gap={categoryGap}>
                  {categories.map(category => (
                    <CategoryItem
                      key={category.id}
                      category={category}
                      onPress={() => handleCategoryPress(category.id, category.name)}
                      size={categorySize}
                      layout={categoryLayout}
                      width={mobileCategoryWidth}
                    />
                  ))}
                </XStack>
              </ScrollView>
            )}
          </YStack>

          <YStack gap="$2.5">
            <SectionTitle>Latest Products</SectionTitle>
            {isLoadingProducts && products.length === 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <ProductCardSkeleton width={productWidth} />
              </ScrollView>
            ) : products.length === 0 ? (
              <Text fontSize={13} color="$colorSubtle">
                No products available
              </Text>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: productPeekOffset }}>
                <XStack gap="$2.5">
                  {products.map(item => (
                    <ProductCard
                      key={item.id}
                      item={item}
                      width={productWidth}
                      iconColor={iconColor}
                      onPress={() => handleProductPress(item.id, item.name)}
                      onAddToCart={() => handleAddToCart(item.id)}
                    />
                  ))}
                </XStack>
              </ScrollView>
            )}
          </YStack>

          {isLoadingBanners && !banners.home_banner_bottom ? (
            <HomeBannerSkeleton />
          ) : (
            <HomeBanner banner={banners.home_banner_bottom} onCTAPress={handleBannerCTAPress} />
          )}
        </ContentStack>
      </ScrollView>
    </ScreenRoot>
  );
}
