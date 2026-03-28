import React, { memo, useCallback, useState } from 'react';
import { Spinner, Text, XStack, YStack, useTheme } from 'tamagui';
import { Trash2 } from '@tamagui/lucide-icons';
import { CartItemWithProduct } from '@/types/cart';
import Image from '@/components/elements/Image/Image';
import QuantitySelector from '../QuantitySelector/QuantitySelector';
import AppAlertDialog from '../AppAlertDialog/AppAlertDialog';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  SharedValue,
  interpolate,
  useAnimatedStyle,
  Extrapolation,
} from 'react-native-reanimated';
import { RectButton } from 'react-native-gesture-handler';
import { getThemeColor } from '@/utils/theme';

export interface CartItemRowProps {
  item: CartItemWithProduct;
  onQuantityChange: (cartItemId: string, newQuantity: number) => void;
  onRemove: (cartItemId: string) => void;
  isUpdating?: boolean;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

function DeleteAction({
  progress,
  onDelete,
  backgroundColor,
  iconColor,
}: {
  progress: SharedValue<number>;
  onDelete: () => void;
  backgroundColor: string;
  iconColor: string;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(progress.value, [0, 1], [80, 0], Extrapolation.CLAMP),
      },
    ],
    opacity: interpolate(progress.value, [0, 0.5, 1], [0, 0.8, 1], Extrapolation.CLAMP),
  }));

  return (
    <Animated.View style={[{ width: 80, height: '100%' }, animatedStyle]}>
      <RectButton
        style={{
          flex: 1,
          backgroundColor: backgroundColor,
          justifyContent: 'center',
          alignItems: 'center',
        }}
        onPress={onDelete}>
        <Trash2 size={24} color={iconColor} />
      </RectButton>
    </Animated.View>
  );
}

export const CartItemRow = memo(function CartItemRow({
  item,
  onQuantityChange,
  onRemove,
  isUpdating = false,
}: CartItemRowProps) {
  const imageUrl = item.images?.[0]?.url;
  const unitPrice = item.product.price;
  const theme = useTheme();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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

  const handleSwipeDelete = useCallback(() => {
    setShowDeleteDialog(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    onRemove(item.id);
    setShowDeleteDialog(false);
  }, [item.id, onRemove]);

  const dangerColor = getThemeColor(theme, 'danger');
  const onDangerColor = getThemeColor(theme, 'onDanger');

  return (
    <>
      <Swipeable
        friction={2}
        overshootFriction={8}
        rightThreshold={40}
        overshootRight={false}
        renderRightActions={progress => (
          <DeleteAction
            progress={progress}
            onDelete={handleSwipeDelete}
            backgroundColor={dangerColor}
            iconColor={onDangerColor}
          />
        )}
        containerStyle={{
          backgroundColor: dangerColor,
          borderRadius: 12, // matches $3
        }}>
        <XStack
          padding="$3"
          gap="$3"
          alignItems="center"
          backgroundColor="$surface"
          borderRadius="$3"
          borderWidth={1}
          borderColor="$surfaceBorder"
          opacity={isUpdating ? 0.6 : 1}
          pointerEvents={isUpdating ? 'none' : 'auto'}
          position="relative">
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
              disabled={isUpdating}
              size="sm"
              disableAnimation
            />
          </YStack>

          {isUpdating && (
            <YStack
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              alignItems="center"
              justifyContent="center"
              backgroundColor="$surface"
              opacity={0.5}
              borderRadius="$3"
              zIndex={10}>
              <Spinner size="small" color="$primary" />
            </YStack>
          )}
        </XStack>
      </Swipeable>

      <AppAlertDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Hapus Produk"
        description="Hapus produk dari keranjang?"
        cancelText="Batal"
        confirmText="Hapus"
        confirmColor="$danger"
        onConfirm={handleConfirmDelete}
      />
    </>
  );
});

export default CartItemRow;
