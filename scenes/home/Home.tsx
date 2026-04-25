import { useCallback, useState } from 'react';
import { RefreshControl, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Button as TamaguiButton,
  Card,
  Image,
  ScrollView,
  Text,
  XStack,
  YStack,
  useMedia,
  useTheme,
} from 'tamagui';
import { CartIcon, CheckCircleIcon, SearchIcon } from '@/components/icons';
import AppAlertDialog from '@/components/elements/AppAlertDialog';
import HomeBanner, { HomeBannerSkeleton } from '@/components/elements/HomeBanner';
import { HOME_BANNER_CTA_ROUTE_MAP } from '@/constants/homeBanner.constants';
import { TAB_BAR_HEIGHT } from '@/constants/ui';
import { useAppSlice } from '@/slices';
import { useHomeData, useCartPaginated } from '@/hooks';
import { addProductToCart } from '@/services';
import type { HomeBannerCTA } from '@/types/homeBanner';
import { getThemeColor } from '@/utils/theme';
import { HOME_COPY } from './Home.constants';
import { HomeCategorySection, HomeProductSection } from './Home.sections';
import {
  ContentStack,
  ErrorCallout,
  ScreenRoot,
  SearchShell,
  SurfaceIconButton,
} from './Home.styles';

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
    bannerError,
    error,
  } = useHomeData();

  const { snapshot: cartSnapshot } = useCartPaginated({ userId: user?.id });
  const [cartSuccessProductName, setCartSuccessProductName] = useState<string | null>(null);

  const iconColor = getThemeColor(theme, 'colorPress');
  const heroColor = getThemeColor(theme, 'color');
  const successDialogColor = '$primary';
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

  // Compute viewport-aligned skeleton counts
  const categorySkeletonCount = isLargeScreen
    ? categoryLayout === 'grid4'
      ? 8
      : categoryLayout === 'grid3'
        ? 6
        : 4
    : 2;
  const productSkeletonCount = 2;

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
        pathname: '/product-details',
        params: { id: productId, name: productName },
      });
    },
    [router],
  );

  const handleAddToCart = useCallback(
    async (productId: string, productName: string) => {
      if (!user?.id) return;
      const { error } = await addProductToCart(user.id, productId, 1);

      if (!error) {
        setCartSuccessProductName(productName);
      }
    },
    [user?.id],
  );

  const handleCartSuccessDialogOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setCartSuccessProductName(null);
    }
  }, []);

  const handleRetryCoreContent = useCallback(() => {
    void refresh();
  }, [refresh]);

  const userName =
    user?.full_name || user?.name || user?.email?.split('@')[0] || HOME_COPY.defaultUserName;
  const userAvatarUrl = user?.avatar_url;
  const userInitial = userName.charAt(0).toUpperCase();

  const handleBannerCTAPress = useCallback(
    (cta: HomeBannerCTA) => {
      router.push(HOME_BANNER_CTA_ROUTE_MAP[cta.route]);
    },
    [router],
  );

  const hasCoreContent = categories.length > 0 || products.length > 0;
  const showCoreErrorState = Boolean(error) && !hasCoreContent;

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
                  {HOME_COPY.userRole}
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
              {HOME_COPY.heroTitle}
            </Text>

            <SearchShell
              onPress={handleOpenSearch}
              role="button"
              aria-label="Search products"
              aria-describedby="Open product discovery details">
              <Text flex={1} color="$searchPlaceholderColor" fontSize={14} fontWeight="500" pl="$1">
                {HOME_COPY.searchPlaceholder}
              </Text>
              <SearchIcon size={16} color={iconColor} />
            </SearchShell>
          </YStack>

          {isLoadingBanners && !banners.home_banner_top ? (
            <HomeBannerSkeleton />
          ) : (
            <HomeBanner banner={banners.home_banner_top} onCTAPress={handleBannerCTAPress} />
          )}

          {showCoreErrorState && (
            <ErrorCallout>
              <YStack gap="$1.5">
                <Text color="$color" fontSize={15} fontWeight="700">
                  {HOME_COPY.coreErrorTitle}
                </Text>
                <Text color="$colorSubtle" fontSize={13}>
                  {error}
                </Text>
              </YStack>

              <XStack>
                <TamaguiButton size="$3" theme="brand" onPress={handleRetryCoreContent}>
                  {HOME_COPY.retryLabel}
                </TamaguiButton>
              </XStack>
            </ErrorCallout>
          )}

          {bannerError && !isLoadingBanners && (
            <Text fontSize={12} color="$colorSubtle">
              {HOME_COPY.bannerWarning}
            </Text>
          )}

          <HomeCategorySection
            categories={categories}
            error={error}
            isLoadingCategories={isLoadingCategories}
            isLargeScreen={isLargeScreen}
            categorySkeletonCount={categorySkeletonCount}
            categoryGap={categoryGap}
            categorySize={categorySize}
            categoryLayout={categoryLayout}
            categoryPeekOffset={categoryPeekOffset}
            mobileCategoryWidth={mobileCategoryWidth}
            onCategoryPress={handleCategoryPress}
          />

          <HomeProductSection
            products={products}
            error={error}
            isLoadingProducts={isLoadingProducts}
            productSkeletonCount={productSkeletonCount}
            productWidth={productWidth}
            productPeekOffset={productPeekOffset}
            iconColor={iconColor}
            onProductPress={handleProductPress}
            onAddToCart={handleAddToCart}
          />

          {isLoadingBanners && !banners.home_banner_bottom ? (
            <HomeBannerSkeleton />
          ) : (
            <HomeBanner banner={banners.home_banner_bottom} onCTAPress={handleBannerCTAPress} />
          )}
        </ContentStack>
      </ScrollView>

      <AppAlertDialog
        open={cartSuccessProductName !== null}
        onOpenChange={handleCartSuccessDialogOpenChange}
        title={HOME_COPY.addToCartSuccessTitle}
        description={`${cartSuccessProductName ?? HOME_COPY.addToCartSuccessFallbackProduct} ${
          HOME_COPY.addToCartSuccessDescriptionSuffix
        }`}
        confirmText="OK"
        confirmColor={successDialogColor}
        confirmTextColor="$white"
        hideTitle
        icon={<CheckCircleIcon size={48} color={successDialogColor} />}
      />
    </ScreenRoot>
  );
}
