import React from 'react';
import { YStack, XStack, Text, Spinner } from 'tamagui';

export interface CartSummaryProps {
  subtotal: number;
  shippingCost?: number | null;
  shippingName?: string | null;
  itemCount: number;
  isLoadingShipping?: boolean;
}

const formatRupiah = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const CartSummary: React.FC<CartSummaryProps> = ({
  subtotal,
  shippingCost,
  shippingName,
  itemCount,
  isLoadingShipping = false,
}) => {
  const grandTotal = subtotal + (shippingCost || 0);

  return (
    <YStack gap="$3" padding="$4">
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize="$3" color="$color10">
          Subtotal ({itemCount} item{itemCount !== 1 ? 's' : ''})
        </Text>
        <Text fontSize="$3" color="$color">
          {formatRupiah(subtotal)}
        </Text>
      </XStack>

      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize="$3" color="$color10">
          Ongkir
        </Text>
        {isLoadingShipping ? (
          <Spinner size="small" color="$primary" />
        ) : shippingCost !== null && shippingCost !== undefined ? (
          <YStack alignItems="flex-end">
            <Text fontSize="$3" color="$color">
              {formatRupiah(shippingCost)}
            </Text>
            {shippingName && (
              <Text fontSize="$1" color="$color10">
                {shippingName}
              </Text>
            )}
          </YStack>
        ) : (
          <Text fontSize="$3" color="$color10">
            Pilih kurir
          </Text>
        )}
      </XStack>

      <YStack height={1} backgroundColor="$surfaceBorder" marginVertical="$2" />

      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize="$4" fontWeight="700" color="$color">
          Total
        </Text>
        <Text fontSize="$5" fontWeight="800" color="$primary">
          {formatRupiah(grandTotal)}
        </Text>
      </XStack>
    </YStack>
  );
};

export default CartSummary;
