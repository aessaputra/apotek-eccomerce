import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, Text, XStack, YStack, styled, useMedia, useTheme } from 'tamagui';
import { ChevronLeftIcon } from '@/components/icons';
import type { RouteParams } from '@/types/routes.types';
import ProductCard from '@/components/elements/ProductCard';
import { TAB_BAR_HEIGHT } from '@/constants/ui';
import {
  addProductToCart,
  getProductImages,
  type ProductWithImages,
} from '@/services/home.service';
import { supabase } from '@/services';
import { useAppSlice } from '@/slices';
import { getThemeColor } from '@/utils/theme';

const ScreenRoot = styled(YStack, {
  flex: 1,
  backgroundColor: '$surfaceSubtle',
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

interface ProductListItemProps {
  item: ProductWithImages;
  width: number;
  iconColor: string;
  onPress: (productId: string) => void;
  onAddToCart: (productId: string) => void;
}

function ProductListItem({ item, width, iconColor, onPress, onAddToCart }: ProductListItemProps) {
  return (
    <ProductCard
      item={item}
      width={width}
      iconColor={iconColor}
      onPress={() => onPress(item.id)}
      onAddToCart={() => onAddToCart(item.id)}
    />
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
  const [products, setProducts] = useState<ProductWithImages[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
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

  const fetchProducts = useCallback(async () => {
    if (!categoryId.trim()) {
      setProducts([]);
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('category_id', categoryId)
        .eq('is_active', true)
        .gt('stock', 0);

      if (error || !data) {
        setProducts([]);
        return;
      }

      if (data.length === 0) {
        setProducts([]);
        return;
      }

      const productIds = data.map(product => product.id);
      const images = await getProductImages(productIds);

      const imagesByProduct = images.reduce(
        (acc, image) => {
          if (!acc[image.product_id]) acc[image.product_id] = [];
          acc[image.product_id].push({ url: image.url, sort_order: image.sort_order });
          return acc;
        },
        {} as Record<string, { url: string; sort_order: number }[]>,
      );

      const normalizedProducts: ProductWithImages[] = data.map(product => ({
        ...product,
        images: imagesByProduct[product.id] || [],
      }));

      setProducts(normalizedProducts);
    } catch (error) {
      if (__DEV__) console.warn('[ProductList] fetchProducts error:', error);
      setProducts([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [categoryId]);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    void fetchProducts();
  }, [fetchProducts]);

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

      const { error } = await addProductToCart(user.id, productId, 1);

      if (error) {
        setCartFeedback(error.message || 'Gagal menambahkan produk ke keranjang.');
      } else {
        setCartFeedback('Produk berhasil ditambahkan ke keranjang.');
      }

      setTimeout(() => setCartFeedback(null), 3000);
    },
    [user?.id],
  );

  return (
    <ScreenRoot>
      <FlatList
        data={products}
        key={columns}
        numColumns={columns}
        keyExtractor={item => item.id}
        style={{ width: listWidth, alignSelf: 'center' }}
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={{
          paddingHorizontal: contentPaddingHorizontal,
          paddingBottom: TAB_BAR_HEIGHT + insets.bottom,
        }}
        columnWrapperStyle={{ gap: itemGap }}
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
            {isLoading ? (
              <Text fontSize={14} color="$colorSubtle" pt="$2">
                Loading products...
              </Text>
            ) : null}
            {cartFeedback ? (
              <Text fontSize={13} color="$primary" pt="$2">
                {cartFeedback}
              </Text>
            ) : null}
          </ContentStack>
        }
        renderItem={({ item }) => (
          <YStack pb="$2.5" mb="$2.5" width={cardWidth}>
            <ProductListItem
              item={item}
              width={cardWidth}
              iconColor={iconColor}
              onPress={handleOpenProductDetails}
              onAddToCart={handleAddToCart}
            />
          </YStack>
        )}
        ListEmptyComponent={
          isLoading ? null : (
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
      />
    </ScreenRoot>
  );
}
