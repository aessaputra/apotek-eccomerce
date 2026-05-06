import { memo } from 'react';
import { Card, Spinner, Text, XStack, YStack } from 'tamagui';
import Image from '@/components/elements/Image';
import { CartIcon, PillIcon } from '@/components/icons';
import { MIN_TOUCH_TARGET } from '@/constants/ui';
import { formatPrice } from '@/services/home.service';

export interface ProductCardItem {
  id: string;
  name: string;
  price: number;
  category_id: string | null;
  images: { url: string; sort_order: number }[];
}

export interface ProductCardProps {
  item: ProductCardItem;
  width: number;
  iconColor: string;
  onPress?: () => void;
  onAddToCart?: () => void;
  isAddingToCart?: boolean;
}

export interface ProductCardSkeletonProps {
  width: number;
  count?: number;
}

const SkeletonCard = memo(function SkeletonCard({ width }: { width: number }) {
  return (
    <Card
      testID="product-skeleton-item"
      width={width}
      padding="$3"
      gap="$2"
      backgroundColor="$surface"
      borderWidth={1}
      borderColor="$surfaceBorder"
      borderRadius="$5"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden={true}
      pointerEvents="none">
      <YStack width="100%" height={120} alignItems="center" justifyContent="center">
        <YStack
          height="100%"
          maxWidth="100%"
          aspectRatio={1}
          borderRadius="$3"
          backgroundColor="$surfaceBorder"
        />
      </YStack>
      <YStack height={36} flexShrink={0} justifyContent="flex-start" gap="$1.5">
        <YStack width="88%" height={14} borderRadius="$2" backgroundColor="$surfaceBorder" />
        <YStack width="64%" height={14} borderRadius="$2" backgroundColor="$surfaceBorder" />
      </YStack>
      <XStack alignItems="center" justifyContent="space-between" gap="$2">
        <YStack flex={1} height={12} borderRadius="$2" backgroundColor="$surfaceBorder" />
        <YStack
          testID="product-skeleton-button"
          width={MIN_TOUCH_TARGET}
          height={MIN_TOUCH_TARGET}
          borderRadius="$8"
          backgroundColor="$surfaceBorder"
        />
      </XStack>
    </Card>
  );
});

export const ProductCardSkeleton = memo(function ProductCardSkeleton({
  width,
  count = 3,
}: ProductCardSkeletonProps) {
  return (
    <XStack gap="$2.5">
      {Array.from({ length: count }, (_, i) => i + 1).map(i => (
        <SkeletonCard key={i} width={width} />
      ))}
    </XStack>
  );
});

function ProductCard({
  item,
  width,
  iconColor,
  onPress,
  onAddToCart,
  isAddingToCart = false,
}: ProductCardProps) {
  const imageUrl =
    [...item.images].sort((left, right) => left.sort_order - right.sort_order)[0]?.url ?? null;
  const accentColor = item.category_id ? '$warningSoft' : '$infoSoft';

  const handleAddToCart = (event: { stopPropagation: () => void }) => {
    event.stopPropagation();
    if (isAddingToCart) return;
    onAddToCart?.();
  };

  const addToCartLabel = isAddingToCart
    ? `Menambahkan ${item.name} ke keranjang`
    : `Tambah ${item.name} ke keranjang`;

  return (
    <Card
      width={width}
      padding="$3"
      backgroundColor="$surface"
      borderWidth={1}
      borderColor="$surfaceBorder"
      borderRadius="$5"
      gap="$2"
      pressStyle={{ opacity: 0.95, scale: 0.98 }}
      onPress={onPress}
      role="button"
      accessibilityRole="button"
      accessibilityLabel={`Lihat detail ${item.name}`}
      accessibilityHint="Buka halaman detail produk"
      aria-label={`Lihat detail ${item.name}`}>
      <YStack width="100%" height={120} alignItems="center" justifyContent="center">
        <YStack
          height="100%"
          maxWidth="100%"
          aspectRatio={1}
          borderRadius="$3"
          alignItems="center"
          justifyContent="center"
          backgroundColor={accentColor}
          overflow="hidden">
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={{ width: '100%', height: '100%' }}
              contentFit="contain"
              recyclingKey={imageUrl}
            />
          ) : (
            <>
              <PillIcon size={34} color={iconColor} />
              <XStack width={28} height={4} borderRadius="$10" backgroundColor="$surface" />
            </>
          )}
        </YStack>
      </YStack>
      <YStack height={36} flexShrink={0} justifyContent="flex-start">
        <Text fontSize={14} lineHeight={18} color="$color" fontWeight="600" numberOfLines={2}>
          {item.name}
        </Text>
      </YStack>
      <XStack alignItems="center" justifyContent="space-between" gap="$2">
        <Text fontSize={12} color="$colorSubtle" fontWeight="500" flex={1} numberOfLines={1}>
          {formatPrice(item.price)}
        </Text>
        <XStack
          width={MIN_TOUCH_TARGET}
          height={MIN_TOUCH_TARGET}
          borderRadius="$8"
          backgroundColor={isAddingToCart ? '$colorDisabled' : '$primary'}
          alignItems="center"
          justifyContent="center"
          opacity={isAddingToCart ? 0.7 : 1}
          pressStyle={{ opacity: 0.9, scale: 0.95 }}
          onPress={handleAddToCart}
          role="button"
          accessibilityRole="button"
          accessibilityLabel={addToCartLabel}
          accessibilityHint="Menambahkan satu produk ke keranjang belanja"
          accessibilityState={{ disabled: isAddingToCart, busy: isAddingToCart }}
          aria-label={addToCartLabel}
          aria-busy={isAddingToCart}
          aria-disabled={isAddingToCart}
          disabled={isAddingToCart}>
          {isAddingToCart ? (
            <Spinner size="small" color="$onPrimary" />
          ) : (
            <CartIcon size={18} color="$onPrimary" />
          )}
        </XStack>
      </XStack>
    </Card>
  );
}

export default memo(ProductCard);
