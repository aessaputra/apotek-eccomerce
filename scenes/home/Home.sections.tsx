import { memo, useCallback, useMemo, type ComponentProps } from 'react';
import { ScrollView, Text, XStack, YStack } from 'tamagui';
import CategoryItem, { CategorySkeleton } from '@/components/elements/CategoryItem';
import ProductCard, { ProductCardSkeleton } from '@/components/elements/ProductCard';
import type { UseHomeDataReturn } from '@/hooks';
import { HOME_COPY } from './Home.constants';
import { SectionTitle } from './Home.styles';

type CategoryItemProps = ComponentProps<typeof CategoryItem>;
type ProductCardProps = ComponentProps<typeof ProductCard>;
type XStackGap = ComponentProps<typeof XStack>['gap'];
type HomeCategory = UseHomeDataReturn['categories'][number];
type HomeProduct = UseHomeDataReturn['products'][number];

type HomeCategorySectionProps = {
  categories: UseHomeDataReturn['categories'];
  error: UseHomeDataReturn['error'];
  isLoadingCategories: boolean;
  isLargeScreen: boolean;
  categorySkeletonCount: number;
  categoryGap: XStackGap;
  categorySize: CategoryItemProps['size'];
  categoryLayout: CategoryItemProps['layout'];
  categoryPeekOffset: number;
  mobileCategoryWidth: number;
  onCategoryPress: (categoryId: string, categoryName: string) => void;
};

type HomeProductSectionProps = {
  products: UseHomeDataReturn['products'];
  error: UseHomeDataReturn['error'];
  isLoadingProducts: boolean;
  productSkeletonCount: number;
  productWidth: ProductCardProps['width'];
  productPeekOffset: number;
  iconColor: ProductCardProps['iconColor'];
  onProductPress: (productId: string, productName: string) => void;
  onAddToCart: (productId: string, productName: string) => void | Promise<void>;
};

type HomeCategoryItemProps = {
  category: HomeCategory;
  size: CategoryItemProps['size'];
  layout: CategoryItemProps['layout'];
  width?: CategoryItemProps['width'];
  onCategoryPress: HomeCategorySectionProps['onCategoryPress'];
};

type HomeProductItemProps = {
  item: HomeProduct;
  width: ProductCardProps['width'];
  iconColor: ProductCardProps['iconColor'];
  onProductPress: HomeProductSectionProps['onProductPress'];
  onAddToCart: HomeProductSectionProps['onAddToCart'];
};

const HomeCategoryItem = memo(function HomeCategoryItem({
  category,
  size,
  layout,
  width,
  onCategoryPress,
}: HomeCategoryItemProps) {
  const handlePress = useCallback(() => {
    onCategoryPress(category.id, category.name);
  }, [category.id, category.name, onCategoryPress]);

  return (
    <CategoryItem
      category={category}
      onPress={handlePress}
      size={size}
      layout={layout}
      width={width}
    />
  );
});

const HomeProductItem = memo(function HomeProductItem({
  item,
  width,
  iconColor,
  onProductPress,
  onAddToCart,
}: HomeProductItemProps) {
  const handlePress = useCallback(() => {
    onProductPress(item.id, item.name);
  }, [item.id, item.name, onProductPress]);

  const handleAddToCart = useCallback(() => {
    void onAddToCart(item.id, item.name);
  }, [item.id, item.name, onAddToCart]);

  return (
    <ProductCard
      item={item}
      width={width}
      iconColor={iconColor}
      onPress={handlePress}
      onAddToCart={handleAddToCart}
    />
  );
});

export function HomeCategorySection({
  categories,
  error,
  isLoadingCategories,
  isLargeScreen,
  categorySkeletonCount,
  categoryGap,
  categorySize,
  categoryLayout,
  categoryPeekOffset,
  mobileCategoryWidth,
  onCategoryPress,
}: HomeCategorySectionProps) {
  const categoryScrollContentStyle = useMemo(
    () => ({ paddingRight: categoryPeekOffset }),
    [categoryPeekOffset],
  );

  return (
    <YStack gap="$2.5">
      <SectionTitle>{HOME_COPY.categorySectionTitle}</SectionTitle>
      {isLoadingCategories && categories.length === 0 ? (
        <CategorySkeleton isLargeScreen={isLargeScreen} count={categorySkeletonCount} />
      ) : error && categories.length === 0 ? (
        <Text fontSize={13} color="$colorSubtle">
          {HOME_COPY.categoryError}
        </Text>
      ) : categories.length === 0 ? (
        <Text fontSize={13} color="$colorSubtle">
          {HOME_COPY.categoryEmpty}
        </Text>
      ) : isLargeScreen ? (
        <XStack flexWrap="wrap" gap={categoryGap} justifyContent="flex-start" width="100%">
          {categories.map(category => (
            <HomeCategoryItem
              key={category.id}
              category={category}
              size={categorySize}
              layout={categoryLayout}
              onCategoryPress={onCategoryPress}
            />
          ))}
        </XStack>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={categoryScrollContentStyle}>
          <XStack gap={categoryGap}>
            {categories.map(category => (
              <HomeCategoryItem
                key={category.id}
                category={category}
                size={categorySize}
                layout={categoryLayout}
                width={mobileCategoryWidth}
                onCategoryPress={onCategoryPress}
              />
            ))}
          </XStack>
        </ScrollView>
      )}
    </YStack>
  );
}

export function HomeProductSection({
  products,
  error,
  isLoadingProducts,
  productSkeletonCount,
  productWidth,
  productPeekOffset,
  iconColor,
  onProductPress,
  onAddToCart,
}: HomeProductSectionProps) {
  const productScrollContentStyle = useMemo(
    () => ({ paddingRight: productPeekOffset }),
    [productPeekOffset],
  );

  return (
    <YStack gap="$2.5">
      <SectionTitle>{HOME_COPY.productSectionTitle}</SectionTitle>
      {isLoadingProducts && products.length === 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <ProductCardSkeleton width={productWidth} count={productSkeletonCount} />
        </ScrollView>
      ) : error && products.length === 0 ? (
        <Text fontSize={13} color="$colorSubtle">
          {HOME_COPY.productError}
        </Text>
      ) : products.length === 0 ? (
        <Text fontSize={13} color="$colorSubtle">
          {HOME_COPY.productEmpty}
        </Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={productScrollContentStyle}>
          <XStack gap="$2.5">
            {products.map(item => (
              <HomeProductItem
                key={item.id}
                item={item}
                width={productWidth}
                iconColor={iconColor}
                onProductPress={onProductPress}
                onAddToCart={onAddToCart}
              />
            ))}
          </XStack>
        </ScrollView>
      )}
    </YStack>
  );
}
