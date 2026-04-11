import React, { useCallback } from 'react';
import { Card, Text, YStack, XStack, styled, Stack } from 'tamagui';
import { PlusCircle } from '@tamagui/lucide-icons';
import Image from '@/components/elements/Image';
import type { PastPurchaseProduct } from '@/services/order.service';
import { formatPrice } from '@/services/home.service';

const CARD_WIDTH = 140;
const IMAGE_SIZE = 100;

const StyledCard = styled(Card, {
  width: CARD_WIDTH,
  backgroundColor: '$surface',
  borderRadius: '$4',
  borderWidth: 1,
  borderColor: '$surfaceBorder',
  overflow: 'hidden',
  pressStyle: {
    scale: 0.97,
    opacity: 0.85,
  },
  animation: 'quick',
});

const ImagePlaceholder = styled(Stack, {
  width: IMAGE_SIZE,
  height: IMAGE_SIZE,
  backgroundColor: '$surfaceSubtle',
  alignItems: 'center',
  justifyContent: 'center',
  alignSelf: 'center',
  borderRadius: '$3',
  marginTop: '$2.5',
});

const AddButton = styled(Stack, {
  position: 'absolute',
  right: 6,
  bottom: 6,
  width: 30,
  height: 30,
  borderRadius: 15,
  backgroundColor: '$primary',
  alignItems: 'center',
  justifyContent: 'center',
  pressStyle: {
    scale: 0.9,
    opacity: 0.7,
  },
  animation: 'quick',
});

interface BuyAgainCardProps {
  product: PastPurchaseProduct;
  onPress: (product: PastPurchaseProduct) => void;
  onAddToCart: (product: PastPurchaseProduct) => void;
}

export const BuyAgainCard = React.memo<BuyAgainCardProps>(({ product, onPress, onAddToCart }) => {
  const handlePress = useCallback(() => {
    onPress(product);
  }, [onPress, product]);

  const handleAddToCart = useCallback(
    (event: { stopPropagation: () => void }) => {
      event.stopPropagation();
      onAddToCart(product);
    },
    [onAddToCart, product],
  );

  return (
    <StyledCard onPress={handlePress} role="button" aria-label={`Beli lagi ${product.name}`}>
      <YStack position="relative">
        {product.imageUrl ? (
          <Image
            source={{ uri: product.imageUrl }}
            style={{
              width: IMAGE_SIZE,
              height: IMAGE_SIZE,
              borderRadius: 10,
              alignSelf: 'center',
              marginTop: 10,
            }}
            contentFit="cover"
            recyclingKey={product.imageUrl}
          />
        ) : (
          <ImagePlaceholder>
            <Text color="$colorMuted" fontSize="$2">
              No img
            </Text>
          </ImagePlaceholder>
        )}

        <YStack padding="$2.5" gap="$1">
          <Text color="$color" fontSize="$2" fontWeight="600" numberOfLines={2} lineHeight={18}>
            {product.name}
          </Text>

          <XStack alignItems="center">
            <Text color="$primary" fontSize="$2" fontWeight="700">
              {formatPrice(product.price)}
            </Text>
          </XStack>
        </YStack>

        <AddButton
          onPress={handleAddToCart}
          role="button"
          aria-label={`Tambah ${product.name} ke keranjang`}>
          <PlusCircle size={18} color="white" />
        </AddButton>
      </YStack>
    </StyledCard>
  );
});

BuyAgainCard.displayName = 'BuyAgainCard';
