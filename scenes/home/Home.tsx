import { useCallback } from 'react';
import { RefreshControl, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, Image, ScrollView, Text, XStack, YStack, styled, useMedia, useTheme } from 'tamagui';
import { CartIcon, PillIcon, SearchIcon, StarIcon } from '@/components/icons';
import CategoryItem, { CategorySkeleton } from '@/components/elements/CategoryItem';
import ProductCard, { ProductCardSkeleton } from '@/components/elements/ProductCard';
import { TAB_BAR_HEIGHT } from '@/constants/ui';
import { useAppSlice } from '@/slices';
import { useHomeData } from '@/hooks';
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
  borderRadius: '$10',
  backgroundColor: '$surface',
  borderWidth: 1,
  borderColor: '$surfaceBorder',
  alignItems: 'center',
  justifyContent: 'center',
  elevation: 1,
  pressStyle: { opacity: 0.9 },
});

const PillAction = styled(XStack, {
  alignSelf: 'flex-start',
  backgroundColor: '$surface',
  borderRadius: '$10',
  paddingVertical: '$1',
  paddingHorizontal: '$3',
  borderWidth: 1,
  borderColor: '$surfaceBorder',
  pressStyle: { opacity: 0.92 },
});

const BannerCard = styled(Card, {
  backgroundColor: '$infoSoft',
  borderWidth: 1,
  borderColor: '$surfaceBorder',
  borderRadius: '$4',
  padding: '$3.5',
  elevation: 2,
});

const IllustrationPanel = styled(YStack, {
  borderRadius: '$4',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '$surface',
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
  elevation: 1,
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
  const { categories, products, isLoadingCategories, isLoadingProducts, isRefreshing, refresh } =
    useHomeData();

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

  const handleOpenOrders = () => {
    router.push('/cart');
  };

  const handleOpenDetails = () => {
    router.push('/home/details');
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

  const userName = user?.full_name || user?.name || user?.email?.split('@')[0] || 'Customer';
  const userAvatarUrl = user?.avatar_url;
  const userInitial = userName.charAt(0).toUpperCase();

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
                onPress={handleOpenOrders}
                role="button"
                aria-label="Cart"
                aria-describedby="Open cart page">
                <CartIcon size={16} color={iconColor} />
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
              onPress={handleOpenDetails}
              role="button"
              aria-label="Search products"
              aria-describedby="Open product discovery details">
              <Text flex={1} color="$searchPlaceholderColor" fontSize={14} fontWeight="500" pl="$1">
                Search by product name
              </Text>
              <SearchIcon size={16} color={iconColor} />
            </SearchShell>
          </YStack>

          <BannerCard>
            <XStack alignItems="center" gap="$3" justifyContent="space-between">
              <YStack flex={1} minWidth={0} gap="$2">
                <Text color="$color" fontSize={14} lineHeight={18} fontWeight="700">
                  Your last order has{`\n`}been proceed
                </Text>
                <PillAction
                  onPress={handleOpenOrders}
                  role="button"
                  aria-label="Track last order"
                  aria-describedby="Open order tracking details">
                  <Text color="$primary" fontSize={11} fontWeight="700">
                    Track now
                  </Text>
                </PillAction>
              </YStack>

              <IllustrationPanel width={74} height={66}>
                <PillIcon size={30} color={iconColor} />
                <XStack width={24} height={4} borderRadius="$10" backgroundColor="$infoSoft" />
              </IllustrationPanel>
            </XStack>
          </BannerCard>

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
                    />
                  ))}
                </XStack>
              </ScrollView>
            )}
          </YStack>

          <BannerCard>
            <XStack alignItems="center" justifyContent="space-between" gap="$2.5">
              <YStack flex={1} minWidth={0} gap="$2.5">
                <Text color="$color" fontSize={15} lineHeight={20} fontWeight="700">
                  Explore great doctors{`\n`}for your better life
                </Text>
                <PillAction
                  onPress={handleOpenDetails}
                  role="button"
                  aria-label="Explore doctors"
                  aria-describedby="Open doctor discovery">
                  <Text color="$primary" fontSize={12} fontWeight="700">
                    Explore life
                  </Text>
                </PillAction>
              </YStack>

              <IllustrationPanel width={88} height={78} gap="$1">
                <StarIcon size={18} color={iconColor} />
                <PillIcon size={24} color={iconColor} />
              </IllustrationPanel>
            </XStack>
          </BannerCard>
        </ContentStack>
      </ScrollView>
    </ScreenRoot>
  );
}
