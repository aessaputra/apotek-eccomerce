import React from 'react';
import { Text, XStack, YStack, Separator } from 'tamagui';
import { PackageIcon } from '@/components/icons';
import Image from '@/components/elements/Image';
import OrderSectionCard from '@/components/elements/OrderSectionCard';
import { formatRupiah } from '@/scenes/cart/cart.constants';
import type { OrderWithItems } from '@/services';

type OrderDetailItem = OrderWithItems['order_items'][number];

interface OrderDetailItemsSectionProps {
  orderItems: OrderDetailItem[];
}

const PRODUCT_IMAGE_STYLE = { width: '100%', height: '100%' } as const;

function getProductImageUrl(
  productImages?: { url: string; sort_order: number }[] | null,
): string | null {
  if (!productImages?.length) return null;
  const sorted = [...productImages].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  return sorted[0]?.url ?? null;
}

function OrderDetailItemRow({ item }: { item: OrderDetailItem }) {
  const product = item.products;
  const imageUrl = getProductImageUrl(product?.product_images);
  const lineTotal = item.price_at_purchase * item.quantity;

  return (
    <XStack key={item.id} gap="$3" alignItems="flex-start">
      {imageUrl ? (
        <YStack
          width={64}
          height={64}
          borderRadius="$3"
          overflow="hidden"
          backgroundColor="$surfaceSubtle">
          <Image source={{ uri: imageUrl }} style={PRODUCT_IMAGE_STYLE} contentFit="cover" />
        </YStack>
      ) : (
        <YStack
          width={64}
          height={64}
          borderRadius="$3"
          backgroundColor="$surfaceSubtle"
          alignItems="center"
          justifyContent="center">
          <PackageIcon size={24} color="$colorMuted" />
        </YStack>
      )}

      <YStack flex={1} gap="$1">
        <Text fontSize="$3" color="$color" fontWeight="500" numberOfLines={2}>
          {product?.name ?? 'Produk'}
        </Text>
        <Text fontSize="$2" color="$colorSubtle">
          {formatRupiah(item.price_at_purchase)} × {item.quantity}
        </Text>
        <Text fontSize="$4" color="$color" fontWeight="600">
          {formatRupiah(lineTotal)}
        </Text>
      </YStack>
    </XStack>
  );
}

export default function OrderDetailItemsSection({ orderItems }: OrderDetailItemsSectionProps) {
  return (
    <OrderSectionCard>
      <YStack padding="$4" gap="$3">
        <XStack alignItems="center" gap="$2">
          <PackageIcon size={20} color="$primary" />
          <Text fontSize="$4" fontWeight="600" color="$color">
            Produk
          </Text>
        </XStack>

        <Separator />

        <YStack gap="$4">
          {orderItems?.map(item => (
            <OrderDetailItemRow key={item.id} item={item} />
          ))}
        </YStack>
      </YStack>
    </OrderSectionCard>
  );
}
