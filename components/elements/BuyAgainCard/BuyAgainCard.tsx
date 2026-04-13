import React, { useCallback } from 'react';
import { Card, Text, YStack, XStack } from 'tamagui';
import Image from '@/components/elements/Image';
import { CartIcon } from '@/components/icons';
import type { PastPurchaseProduct } from '@/services/order.service';
import { formatPrice } from '@/services/home.service';

const IMAGE_SIZE = 120;

interface BuyAgainCardProps {
  product: PastPurchaseProduct;
  width: number;
  onPress: (product: PastPurchaseProduct) => void;
  onAddToCart: (product: PastPurchaseProduct) => void;
}

export const BuyAgainCard = React.memo<BuyAgainCardProps>(
  ({ product, width, onPress, onAddToCart }) => {
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
      <Card
        width={width}
        padding="$3"
        backgroundColor="$surface"
        borderWidth={1}
        borderColor="$surfaceBorder"
        borderRadius="$5"
        gap="$2"
        pressStyle={{ opacity: 0.95, scale: 0.98 }}
        onPress={handlePress}
        role="button"
        aria-label={`Beli lagi ${product.name}`}>
        <YStack width="100%" height={IMAGE_SIZE} alignItems="center" justifyContent="center">
          {product.imageUrl ? (
            <Image
              source={{ uri: product.imageUrl }}
              style={{ width: '100%', height: '100%' }}
              contentFit="contain"
              recyclingKey={product.imageUrl}
            />
          ) : (
            <YStack
              height="100%"
              maxWidth="100%"
              aspectRatio={1}
              borderRadius="$3"
              backgroundColor="$surfaceSubtle"
              alignItems="center"
              justifyContent="center">
              <Text color="$colorMuted" fontSize="$2">
                No img
              </Text>
            </YStack>
          )}
        </YStack>

        <YStack height={36} flexShrink={0} justifyContent="flex-start">
          <Text color="$color" fontSize={14} lineHeight={18} fontWeight="600" numberOfLines={2}>
            {product.name}
          </Text>
        </YStack>

        <XStack alignItems="center" justifyContent="space-between" gap="$2">
          <Text color="$colorSubtle" fontSize={12} fontWeight="500" flex={1} numberOfLines={1}>
            {formatPrice(product.price)}
          </Text>
          <XStack
            width={36}
            height={36}
            borderRadius="$8"
            backgroundColor="$primary"
            alignItems="center"
            justifyContent="center"
            pressStyle={{ opacity: 0.9, scale: 0.95 }}
            onPress={handleAddToCart}
            role="button"
            aria-label={`Tambah ${product.name} ke keranjang`}>
            <CartIcon size={18} color="$onPrimary" />
          </XStack>
        </XStack>
      </Card>
    );
  },
);

BuyAgainCard.displayName = 'BuyAgainCard';
