import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, type LayoutChangeEvent, type ViewToken } from 'react-native';
import { Image, View, YStack, styled, useTheme } from 'tamagui';
import { HeartIcon } from '@/components/icons';
import { getThemeColor } from '@/utils/theme';
import DotIndicators from '../DotIndicators';

export interface ProductImageGalleryProps {
  images: { url: string; sort_order: number }[];
  placeholderIcon?: React.ReactNode;
  showDecorativeShapes?: boolean;
  aspectRatio?: number;
}

const ImageContainer = styled(YStack, {
  width: '100%',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  position: 'relative',
  borderRadius: '$6',
});

const OrganicShape = styled(View, {
  position: 'absolute',
  width: '85%',
  height: '85%',
  borderRadius: '$8',
  backgroundColor: '$infoSoft',
  transform: [{ rotate: '-3deg' }],
});

const AccentBubble = styled(View, {
  position: 'absolute',
  borderRadius: '$10',
  opacity: 0.95,
});

const SkeletonBlock = styled(YStack, {
  backgroundColor: '$surfaceBorder',
  borderRadius: '$2',
});

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

function DecorativeShapes() {
  return (
    <>
      <OrganicShape />
      <AccentBubble width={76} height={76} top={18} right={14} backgroundColor="$warningSoft" />
      <AccentBubble width={58} height={58} bottom={22} left={16} backgroundColor="$successSoft" />
    </>
  );
}

function ProductImageGallery({
  images,
  placeholderIcon,
  showDecorativeShapes = true,
  aspectRatio = 1,
}: ProductImageGalleryProps) {
  const theme = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const flatListRef = useRef<FlatList<string>>(null);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const allImages = useMemo(
    () =>
      [...images]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(img => img.url)
        .filter(url => url.length > 0),
    [images],
  );

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0) setContainerWidth(width);
  }, []);

  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0]?.index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
    [],
  );

  const getItemLayout = useCallback(
    (_data: ArrayLike<string> | null | undefined, index: number) => ({
      length: containerWidth,
      offset: containerWidth * index,
      index,
    }),
    [containerWidth],
  );

  const handleDotPress = useCallback((index: number) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
    setCurrentIndex(index);
  }, []);

  const renderImage = useCallback(
    ({ item }: { item: string }) => (
      <View
        width={containerWidth}
        aspectRatio={aspectRatio}
        alignItems="center"
        justifyContent="center">
        <Image
          source={{ uri: item }}
          width="100%"
          height="100%"
          resizeMode="contain"
          accessibilityRole="image"
        />
      </View>
    ),
    [containerWidth, aspectRatio],
  );

  if (allImages.length === 0) {
    return (
      <ImageContainer aspectRatio={aspectRatio}>
        {showDecorativeShapes && <DecorativeShapes />}
        <YStack
          width={120}
          height={120}
          borderRadius="$12"
          backgroundColor="$warningSoft"
          alignItems="center"
          justifyContent="center"
          zIndex={1}>
          {placeholderIcon || <HeartIcon size={48} color={getThemeColor(theme, 'primary')} />}
        </YStack>
      </ImageContainer>
    );
  }

  if (allImages.length === 1) {
    return (
      <ImageContainer aspectRatio={aspectRatio}>
        {showDecorativeShapes && <DecorativeShapes />}
        <View width="80%" height="80%" alignItems="center" justifyContent="center" zIndex={1}>
          <Image
            source={{ uri: allImages[0] }}
            width="100%"
            height="100%"
            resizeMode="contain"
            accessibilityRole="image"
            accessibilityLabel="Product image"
          />
        </View>
      </ImageContainer>
    );
  }

  return (
    <YStack position="relative" onLayout={handleLayout}>
      <ImageContainer aspectRatio={aspectRatio}>
        {showDecorativeShapes && <DecorativeShapes />}

        {containerWidth > 0 && (
          <FlatList
            ref={flatListRef}
            horizontal
            pagingEnabled
            data={allImages}
            renderItem={renderImage}
            keyExtractor={(_, index) => `image-${index}`}
            showsHorizontalScrollIndicator={false}
            onViewableItemsChanged={handleViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            getItemLayout={getItemLayout}
            initialNumToRender={1}
            maxToRenderPerBatch={2}
            windowSize={3}
            removeClippedSubviews={false}
            accessibilityRole="adjustable"
            accessibilityLabel="Product image gallery"
          />
        )}
      </ImageContainer>

      <YStack position="absolute" bottom="$4" left={0} right={0} zIndex={10}>
        <DotIndicators
          total={allImages.length}
          currentIndex={currentIndex}
          onDotPress={handleDotPress}
        />
      </YStack>
    </YStack>
  );
}

export default memo(ProductImageGallery);
