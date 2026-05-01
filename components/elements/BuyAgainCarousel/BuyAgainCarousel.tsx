import React from 'react';
import { ScrollView, useWindowDimensions } from 'react-native';
import { Text, XStack, YStack, styled, useMedia } from 'tamagui';
import { RotateCcw } from '@tamagui/lucide-icons';
import { BuyAgainCard } from '@/components/elements/BuyAgainCard';
import type { PastPurchaseProduct } from '@/services/order.service';

const HORIZONTAL_PADDING = 32;
const CARD_GAP = 10;
const PEEK_OFFSET = 6;
const DESKTOP_CARD_WIDTH = 156;
const CAROUSEL_CONTENT_CONTAINER_STYLE = {
  paddingHorizontal: 16,
  gap: CARD_GAP,
} as const;

const SectionHeader = styled(XStack, {
  alignItems: 'center',
  gap: '$2',
  paddingHorizontal: '$4',
  marginBottom: '$3',
});

const SectionTitle = styled(Text, {
  color: '$color',
  fontSize: '$5',
  fontWeight: '700',
  letterSpacing: -0.3,
});

const SkeletonCard = styled(YStack, {
  width: 140,
  padding: '$3',
  gap: '$2',
  backgroundColor: '$surface',
  borderWidth: 1,
  borderColor: '$surfaceBorder',
  borderRadius: '$5',
});

const SkeletonImage = styled(YStack, {
  height: 112,
  borderRadius: '$3',
  backgroundColor: '$surfaceBorder',
});

const SkeletonLine = styled(YStack, {
  height: 14,
  borderRadius: '$2',
  backgroundColor: '$surfaceBorder',
});

interface BuyAgainCarouselProps {
  products: PastPurchaseProduct[];
  isLoading?: boolean;
  onProductPress: (product: PastPurchaseProduct) => void;
  onAddToCart: (product: PastPurchaseProduct) => void;
}

function BuyAgainSkeletonCards({ width }: { width: number }) {
  return (
    <>
      {[1, 2].map(index => (
        <SkeletonCard key={index} width={width} testID="buy-again-skeleton-item">
          <SkeletonImage />
          <SkeletonLine width="80%" />
          <SkeletonLine width="50%" />
        </SkeletonCard>
      ))}
    </>
  );
}

export const BuyAgainCarousel = React.memo<BuyAgainCarouselProps>(
  ({ products, isLoading = false, onProductPress, onAddToCart }) => {
    const media = useMedia();
    const { width: screenWidth } = useWindowDimensions();

    const cardWidth = media.gtSm
      ? DESKTOP_CARD_WIDTH
      : Math.max(140, Math.floor((screenWidth - HORIZONTAL_PADDING - CARD_GAP - PEEK_OFFSET) / 2));

    if (products.length === 0 && !isLoading) {
      return null;
    }

    return (
      <YStack paddingTop="$4">
        <SectionHeader>
          <RotateCcw size={18} color="$primary" />
          <SectionTitle>Beli Lagi</SectionTitle>
        </SectionHeader>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={CAROUSEL_CONTENT_CONTAINER_STYLE}>
          {products.length > 0 ? (
            products.map(product => (
              <BuyAgainCard
                key={product.id}
                product={product}
                width={cardWidth}
                onPress={onProductPress}
                onAddToCart={onAddToCart}
              />
            ))
          ) : (
            <BuyAgainSkeletonCards width={cardWidth} />
          )}
        </ScrollView>
      </YStack>
    );
  },
);

BuyAgainCarousel.displayName = 'BuyAgainCarousel';
