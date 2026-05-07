import { useRef } from 'react';
import type { AccessibilityActionEvent, AccessibilityActionInfo } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { XStack, Button, styled } from 'tamagui';
import * as Haptics from 'expo-haptics';

import AddressCard from './AddressCard';
import type { Address } from '@/types/address';
import { StarIcon, EditIcon, DeleteIcon } from '@/components/icons';
import { SWIPE_ACTION_WIDTH, SWIPE_BUTTON_WIDTH } from '@/constants/address';
import { MIN_TOUCH_TARGET } from '@/constants/ui';

const SWIPEABLE_CONTAINER_STYLE = { overflow: 'visible' } as const;

export interface SwipeableAddressRowProps {
  address: Address;
  isDefault: boolean;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault?: () => void;
}

const SwipeButton = styled(Button, {
  width: SWIPE_BUTTON_WIDTH,
  minHeight: MIN_TOUCH_TARGET,
  height: '100%',
  br: 0,
  p: 0,
});

const SwipeContainer = styled(XStack, {
  height: '100%',
  alignItems: 'center',
  pb: '$3',
});

export default function SwipeableAddressRow({
  address,
  isDefault,
  onPress,
  onEdit,
  onDelete,
  onSetDefault,
}: SwipeableAddressRowProps) {
  const swipeableRef = useRef<Swipeable>(null);

  function handleSetDefault() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    swipeableRef.current?.close();
    onSetDefault?.();
  }

  function handleEdit() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    swipeableRef.current?.close();
    onEdit();
  }

  function handleDelete() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    swipeableRef.current?.close();
    onDelete();
  }

  function renderRightActions() {
    return (
      <SwipeContainer>
        {!isDefault && onSetDefault && (
          <SwipeButton
            onPress={handleSetDefault}
            backgroundColor="$primary"
            role="button"
            aria-label="Jadikan alamat utama"
            accessibilityHint="Mengatur alamat ini sebagai alamat pengiriman utama">
            <StarIcon size={24} color="$onPrimary" />
          </SwipeButton>
        )}

        <SwipeButton
          onPress={handleEdit}
          backgroundColor="$info"
          role="button"
          aria-label="Edit alamat"
          accessibilityHint="Mengedit alamat pengiriman">
          <EditIcon size={24} color="$onPrimary" />
        </SwipeButton>

        <SwipeButton
          onPress={handleDelete}
          backgroundColor="$danger"
          role="button"
          aria-label="Hapus alamat"
          accessibilityHint="Menghapus alamat pengiriman ini">
          <DeleteIcon size={24} color="$onPrimary" />
        </SwipeButton>
      </SwipeContainer>
    );
  }

  const accessibilityActions: AccessibilityActionInfo[] = [
    { name: 'edit', label: 'Ubah alamat' },
    { name: 'delete', label: 'Hapus alamat' },
  ];

  if (!isDefault && onSetDefault) {
    accessibilityActions.unshift({ name: 'setDefault', label: 'Jadikan alamat utama' });
  }

  function handleAccessibilityAction(event: AccessibilityActionEvent) {
    switch (event.nativeEvent.actionName) {
      case 'setDefault':
        handleSetDefault();
        break;
      case 'edit':
        handleEdit();
        break;
      case 'delete':
        handleDelete();
        break;
      default:
        break;
    }
  }

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={SWIPE_ACTION_WIDTH / 3}
      containerStyle={SWIPEABLE_CONTAINER_STYLE}>
      <AddressCard
        address={address}
        isDefault={isDefault}
        onPress={onPress}
        accessibilityActions={accessibilityActions}
        onAccessibilityAction={handleAccessibilityAction}
      />
    </Swipeable>
  );
}
