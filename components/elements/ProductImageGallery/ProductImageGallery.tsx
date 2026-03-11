import { memo } from 'react';
import { Card, Image, ScrollView, XStack, YStack, styled, useTheme } from 'tamagui';
import { CartIcon } from '@/components/icons';
import { getThemeColor } from '@/utils/theme';
import { getPrimaryImageUrl, type ProductWithImages } from '@/services/home.service';

const ImageContainer = styled(Card, {
  width: '100%',
  aspectRatio: 1,
  backgroundColor: '$surface',
  borderWidth: 1,
  borderColor: '$surfaceBorder',
  borderRadius: '$5',
  overflow: 'hidden',
  elevation: 2,
});

const ThumbnailButton = styled(Card, {
  width: 64,
  height: 64,
  borderRadius: '$3',
  overflow: 'hidden',
  borderWidth: 2,
  pressStyle: { opacity: 0.9, scale: 0.97 },
});

const SkeletonBlock = styled(YStack, {
  backgroundColor: '$surfaceBorder',
  borderRadius: '$2',
});

export interface ProductImageGalleryProps {
  product: ProductWithImages;
  selectedImageIndex: number;
  onSelectImage: (index: number) => void;
}

export const ProductDetailsSkeleton = memo(function ProductDetailsSkeleton() {
  return (
    <YStack gap="$4">
      <SkeletonBlock width="100%" aspectRatio={1} borderRadius="$5" />
      <YStack gap="$2">
        <SkeletonBlock width="70%" height={28} />
        <SkeletonBlock width="40%" height={24} />
      </YStack>
      <SkeletonBlock width="100%" height={100} />
      <SkeletonBlock width="100%" height={52} borderRadius="$4" />
    </YStack>
  );
});

function ProductImageGallery({
  product,
  selectedImageIndex,
  onSelectImage,
}: ProductImageGalleryProps) {
  const theme = useTheme();
  const primaryImageUrl = getPrimaryImageUrl(product);

  const allImages: string[] =
    product.images.length > 0
      ? product.images.map(img => img.url)
      : [primaryImageUrl].filter((url): url is string => url !== null);

  if (allImages.length === 0) {
    return (
      <ImageContainer alignItems="center" justifyContent="center">
        <YStack
          width={80}
          height={80}
          borderRadius="$10"
          backgroundColor="$infoSoft"
          alignItems="center"
          justifyContent="center">
          <CartIcon size={36} color={getThemeColor(theme, 'primary')} />
        </YStack>
      </ImageContainer>
    );
  }

  return (
    <YStack gap="$3">
      <ImageContainer>
        <Image
          source={{ uri: allImages[selectedImageIndex] || allImages[0] }}
          width="100%"
          height="100%"
          resizeMode="cover"
        />
      </ImageContainer>

      {allImages.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <XStack gap="$2">
            {allImages.map((imageUrl, index) => (
              <ThumbnailButton
                key={index}
                onPress={() => onSelectImage(index)}
                borderColor={selectedImageIndex === index ? '$primary' : '$surfaceBorder'}>
                <Image source={{ uri: imageUrl }} width="100%" height="100%" resizeMode="cover" />
              </ThumbnailButton>
            ))}
          </XStack>
        </ScrollView>
      )}
    </YStack>
  );
}

export default memo(ProductImageGallery);
