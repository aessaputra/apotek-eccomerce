import { memo } from 'react';
import { Card, Image, Text, XStack, YStack } from 'tamagui';
import { CartIcon, PillIcon } from '@/components/icons';
import { formatPrice, getPrimaryImageUrl, type ProductWithImages } from '@/services/home.service';

export interface ProductCardProps {
  item: ProductWithImages;
  width: number;
  iconColor: string;
  onPress?: () => void;
  onAddToCart?: () => void;
}

export interface ProductCardSkeletonProps {
  width: number;
}

const SkeletonCard = memo(function SkeletonCard({ width }: { width: number }) {
  return (
    <Card
      width={width}
      padding="$3"
      gap="$2"
      backgroundColor="$surface"
      borderWidth={1}
      borderColor="$surfaceBorder"
      borderRadius="$4">
      <YStack width="100%" height={96} borderRadius="$3" backgroundColor="$surfaceBorder" />
      <YStack width="80%" height={16} borderRadius="$2" backgroundColor="$surfaceBorder" />
      <YStack width="50%" height={12} borderRadius="$2" backgroundColor="$surfaceBorder" />
    </Card>
  );
});

export const ProductCardSkeleton = memo(function ProductCardSkeleton({
  width,
}: ProductCardSkeletonProps) {
  return (
    <XStack gap="$2.5" pr="$2">
      {[1, 2, 3].map(i => (
        <SkeletonCard key={i} width={width} />
      ))}
    </XStack>
  );
});

function ProductCard({ item, width, iconColor, onPress, onAddToCart }: ProductCardProps) {
  const imageUrl = getPrimaryImageUrl(item);
  const accentColor = item.category_id ? '$warningSoft' : '$infoSoft';

  const handleAddToCart = (event: { stopPropagation: () => void }) => {
    event.stopPropagation();
    onAddToCart?.();
  };

  return (
    <Card
      width={width}
      padding="$3"
      backgroundColor="$surface"
      borderWidth={1}
      borderColor="$surfaceBorder"
      borderRadius="$5"
      elevation={2}
      gap="$2"
      pressStyle={{ opacity: 0.95, scale: 0.98 }}
      onPress={onPress}
      role="button"
      aria-label={`${item.name} product`}
      aria-describedby={`View details for ${item.name}`}>
      <YStack
        width="100%"
        height={96}
        borderRadius="$3"
        alignItems="center"
        justifyContent="center"
        backgroundColor={accentColor}
        overflow="hidden">
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} width="100%" height="100%" resizeMode="cover" />
        ) : (
          <>
            <PillIcon size={34} color={iconColor} />
            <XStack width={28} height={4} borderRadius="$10" backgroundColor="$surface" />
          </>
        )}
      </YStack>
      <Text fontSize={14} lineHeight={18} color="$color" fontWeight="600" numberOfLines={2}>
        {item.name}
      </Text>
      <XStack alignItems="center" justifyContent="space-between" gap="$2">
        <Text fontSize={12} color="$colorSubtle" fontWeight="500" flex={1} numberOfLines={1}>
          {formatPrice(item.price)}
        </Text>
        <XStack
          width={32}
          height={32}
          borderRadius="$8"
          backgroundColor="$primary"
          alignItems="center"
          justifyContent="center"
          pressStyle={{ opacity: 0.9, scale: 0.95 }}
          onPress={handleAddToCart}
          role="button"
          aria-label={`Add ${item.name} to cart`}
          aria-describedby="Adds product to shopping cart">
          <CartIcon size={16} color="$onPrimary" />
        </XStack>
      </XStack>
    </Card>
  );
}

export default memo(ProductCard);
