import React, { memo, useCallback, useState } from 'react';
import { Text, XStack, YStack } from 'tamagui';
import { CartItemWithProduct } from '@/types/cart';
import Image from '@/components/elements/Image/Image';
import QuantitySelector from '../QuantitySelector/QuantitySelector';
import AppAlertDialog from '../AppAlertDialog/AppAlertDialog';
import { formatPrice } from '@/services/home.service';

export interface CartItemCardProps {
  item: CartItemWithProduct;
  onQuantityChange: (cartItemId: string, newQuantity: number) => void;
  onRemove: (cartItemId: string) => void;
  disabled?: boolean;
}

function CartItemCardComponent({
  item,
  onQuantityChange,
  onRemove,
  disabled = false,
}: CartItemCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const imageUrl = item.images?.[0]?.url;
  const unitPrice = item.product.price;
  const isOutOfStock = item.product.stock <= 0;
  const isLowStock = item.product.stock > 0 && item.product.stock <= 5;

  const handleQuantityChange = useCallback(
    (newQuantity: number) => {
      if (newQuantity < item.quantity && item.quantity === 1) {
        setShowDeleteDialog(true);
      } else {
        onQuantityChange(item.id, newQuantity);
      }
    },
    [item.id, item.quantity, onQuantityChange],
  );

  const handleConfirmDelete = useCallback(() => {
    onRemove(item.id);
    setShowDeleteDialog(false);
  }, [item.id, onRemove]);

  return (
    <>
      <YStack
        backgroundColor="$surface"
        borderRadius="$3"
        borderWidth={1}
        borderColor="$surfaceBorder"
        position="relative">
        <XStack padding="$3" gap="$3" alignItems="center">
          <YStack
            width={80}
            height={80}
            borderRadius="$2"
            overflow="hidden"
            backgroundColor="$surfaceSubtle">
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
            ) : null}
          </YStack>

          <YStack flex={1} minWidth={0} gap="$1" justifyContent="center">
            <Text
              fontSize="$3"
              fontWeight="600"
              color="$color"
              numberOfLines={2}
              ellipsizeMode="tail"
              flexShrink={1}>
              {item.product.name}
            </Text>
            <Text fontSize="$2" color="$colorSubtle" numberOfLines={1} ellipsizeMode="tail">
              {formatPrice(unitPrice)}
            </Text>

            {isOutOfStock && (
              <Text fontSize="$2" color="$danger">
                Stok habis
              </Text>
            )}
            {!isOutOfStock && isLowStock && (
              <Text fontSize="$2" color="$warning">
                Sisa {item.product.stock} pcs
              </Text>
            )}
          </YStack>

          <YStack
            alignItems="flex-end"
            gap="$2"
            justifyContent="flex-end"
            flexShrink={0}
            marginLeft="auto"
            alignSelf="stretch">
            <QuantitySelector
              value={item.quantity}
              min={0}
              max={item.product.stock || 99}
              onChange={handleQuantityChange}
              disabled={disabled || isOutOfStock}
              size="sm"
              disableAnimation
            />
          </YStack>
        </XStack>
      </YStack>

      <AppAlertDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Hapus Produk"
        description={`Yakin ingin menghapus ${item.product.name} dari keranjang?`}
        cancelText="Batal"
        confirmText="Hapus"
        confirmColor="$danger"
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}

// Export memoized version for performance optimization
export const CartItemCard = memo(CartItemCardComponent);

export default CartItemCard;
