import React from 'react';
import { ScrollView } from 'react-native';
import { Text, XStack, YStack, styled } from 'tamagui';
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
  onProductPress: (product: PastPurchaseProduct) => void;
  onAddToCart: (product: PastPurchaseProduct) => void;
}

export const BuyAgainCarousel = React.memo<BuyAgainCarouselProps>(
  ({ products, onProductPress, onAddToCart }) => {
    if (products.length === 0) {
      return null;
    }

    return (
      <YStack paddingTop="$4" animation="lazy" enterStyle={{ opacity: 0, y: 8 }}>
        <SectionHeader>
          <RotateCcw size={18} color="$primary" />
          <SectionTitle>Beli Lagi</SectionTitle>
        </SectionHeader>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            gap: 12,
          }}>
          {products.map(product => (
            <BuyAgainCard
              key={product.id}
              product={product}
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
