import { useCallback, useMemo } from 'react';
import { FlatList, useWindowDimensions } from 'react-native';
import { useMedia, YStack } from 'tamagui';
import ProductCard from './ProductCard/ProductCard';
import type { ProductWithImages } from '@/services/home.service';

export interface SearchProductGridProps {
  products: ProductWithImages[];
  iconColor: string;
  onProductPress: (productId: string) => void;
  onAddToCart?: (productId: string) => void;
}

export default function SearchProductGrid({
  products,
  iconColor,
  onProductPress,
  onAddToCart,
}: SearchProductGridProps) {
  const { width: screenWidth } = useWindowDimensions();
  const media = useMedia();

  const isTablet = media.gtMd;
  const isDesktop = media.gtLg;
  const isSm = media.gtSm;

  const maxWidth = useMemo(() => {
    if (isDesktop) return 1080;
    if (isTablet) return 920;
    return 720;
  }, [isDesktop, isTablet]);

  const contentPaddingHorizontal = useMemo(() => {
    if (isDesktop) return 24;
    if (isTablet) return 22;
    if (isSm) return 20;
    return 16;
  }, [isDesktop, isTablet, isSm]);

  const itemGap = useMemo(() => {
    if (isSm) return 12;
    return 10;
  }, [isSm]);

  const columns = 2;

  const listWidth = useMemo(() => {
    return Math.min(screenWidth, maxWidth);
  }, [screenWidth, maxWidth]);

  const cardWidth = useMemo(() => {
    return Math.max(140, Math.floor((listWidth - contentPaddingHorizontal * 2 - itemGap) / 2));
  }, [listWidth, contentPaddingHorizontal, itemGap]);

  const keyExtractor = useCallback((item: ProductWithImages) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: ProductWithImages }) => (
      <ProductCard
        item={item}
        width={cardWidth}
        iconColor={iconColor}
        onPress={() => onProductPress(item.id)}
        onAddToCart={onAddToCart ? () => onAddToCart(item.id) : undefined}
      />
    ),
    [cardWidth, iconColor, onProductPress, onAddToCart],
  );

  if (products.length === 0) {
    return null;
  }

  return (
    <YStack flex={1}>
      <FlatList
        data={products}
        key={columns}
        numColumns={columns}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        style={{ width: listWidth, alignSelf: 'center' }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: contentPaddingHorizontal,
          paddingVertical: 12,
        }}
        columnWrapperStyle={{ gap: itemGap }}
      />
    </YStack>
  );
}
