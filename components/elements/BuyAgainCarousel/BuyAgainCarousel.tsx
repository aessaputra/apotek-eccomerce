import React from 'react';
import { ScrollView, useWindowDimensions } from 'react-native';
import { Text, XStack, YStack, styled, useMedia } from 'tamagui';
import { RotateCcw } from '@tamagui/lucide-icons';
import { BuyAgainCard } from '@/components/elements/BuyAgainCard';
import type { PastPurchaseProduct } from '@/services/order.service';

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

interface BuyAgainCarouselProps {
  products: PastPurchaseProduct[];
  isLoading?: boolean;
  onProductPress: (product: PastPurchaseProduct) => void;
  onAddToCart: (product: PastPurchaseProduct) => void;
}

export const BuyAgainCarousel = React.memo<BuyAgainCarouselProps>(
  ({ products, isLoading = false, onProductPress, onAddToCart }) => {
    const media = useMedia();
    const { width: screenWidth } = useWindowDimensions();

    const HORIZONTAL_PADDING = 32;
    const CARD_GAP = 10;
    const PEEK_OFFSET = 6;
    const DESKTOP_CARD_WIDTH = 156;

    const cardWidth = media.gtSm
      ? DESKTOP_CARD_WIDTH
      : Math.max(140, Math.floor((screenWidth - HORIZONTAL_PADDING - CARD_GAP - PEEK_OFFSET) / 2));

    if (!isLoading && products.length === 0) {
      return null;
    }

    const loadingCards = Array.from({ length: 2 }, (_, index) => (
      <YStack
        key={`buy-again-loading-${index}`}
        width={cardWidth}
        padding="$3"
        backgroundColor="$surface"
        borderWidth={1}
        borderColor="$surfaceBorder"
        borderRadius="$5"
        gap="$2">
        <YStack
          width="100%"
          height={120}
          backgroundColor="$surfaceBorder"
          borderRadius="$3"
          opacity={0.5}
        />
        <YStack gap="$2">
          <YStack height={16} width="80%" backgroundColor="$surfaceBorder" borderRadius="$2" />
          <YStack height={16} width="55%" backgroundColor="$surfaceBorder" borderRadius="$2" />
        </YStack>
        <XStack alignItems="center" justifyContent="space-between" gap="$2">
          <YStack height={14} width="35%" backgroundColor="$surfaceBorder" borderRadius="$2" />
          <YStack width={36} height={36} backgroundColor="$surfaceBorder" borderRadius="$8" />
        </XStack>
      </YStack>
    ));

    return (
      <YStack paddingTop="$4">
        <SectionHeader>
          <RotateCcw size={18} color="$primary" />
          <SectionTitle>Beli Lagi</SectionTitle>
        </SectionHeader>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            gap: CARD_GAP,
          }}>
          {isLoading
            ? loadingCards
            : products.map(product => (
                <BuyAgainCard
                  key={product.id}
                  product={product}
                  width={cardWidth}
                  onPress={onProductPress}
                  onAddToCart={onAddToCart}
                />
              ))}
        </ScrollView>
      </YStack>
    );
  },
);

BuyAgainCarousel.displayName = 'BuyAgainCarousel';
