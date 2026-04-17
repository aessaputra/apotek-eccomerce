import React, { useCallback } from 'react';
import {
  Button as TamaguiButton,
  Card,
  ScrollView,
  Sheet,
  Spinner,
  Text,
  XStack,
  YStack,
} from 'tamagui';
import AddressCard from '@/components/elements/AddressCard';
import { MapPinIcon } from '@/components/icons';
import type { Address } from '@/types/address';
import type { ShippingOption } from '@/types/shipping';
import { resolveBadgeText } from '@/utils/address';
import { formatRupiah, SHEET_ANIMATION_CONFIG } from '@/scenes/cart/cart.constants';

const COURIER_CARD_PRESS_STYLE = {
  scale: 0.98,
  opacity: 0.9,
} as const;

const COURIER_CARD_ANIMATE_ONLY = ['transform', 'opacity'];
const SHEET_SNAP_POINTS: number[] = [60];

interface CourierOptionCardProps {
  option: ShippingOption;
  optionKey: string;
  isSelected: boolean;
  onSelect: (shippingKey: string) => void;
}

const CourierOptionCard = React.memo(function CourierOptionCard({
  option,
  optionKey,
  isSelected,
  onSelect,
}: CourierOptionCardProps) {
  const handlePress = useCallback(() => {
    onSelect(optionKey);
  }, [onSelect, optionKey]);

  return (
    <Card
      onPress={handlePress}
      role="button"
      aria-label={`${option.courier_name} ${option.service_name} ${formatRupiah(option.price)}`}
      animation="quick"
      animateOnly={COURIER_CARD_ANIMATE_ONLY}
      pressStyle={COURIER_CARD_PRESS_STYLE}
      borderRadius="$4"
      borderWidth={2}
      borderColor={isSelected ? '$primary' : '$surfaceBorder'}
      padding="$3"
      backgroundColor="$surface">
      <XStack justifyContent="space-between" alignItems="flex-start" gap="$2">
        <YStack flex={1} gap="$0.5">
          <Text fontSize="$4" fontWeight="700" color="$color" numberOfLines={2}>
            {option.courier_name} - {option.service_name}
          </Text>
          <Text fontSize="$3" color="$colorSubtle">
            Estimasi: {option.estimated_delivery}
          </Text>
        </YStack>
        <Text fontSize="$4" fontWeight="700" color="$primary" flexShrink={0}>
          {formatRupiah(option.price)}
        </Text>
      </XStack>
    </Card>
  );
});

interface AddressCardSheetProps {
  address: Address;
  isSelected: boolean;
  onSelect: (addressId: string) => void;
  onEdit: (addressId: string) => void;
}

const AddressCardSheet = React.memo(function AddressCardSheet({
  address,
  isSelected,
  onSelect,
  onEdit,
}: AddressCardSheetProps) {
  const handlePress = useCallback(() => {
    onSelect(address.id);
  }, [address.id, onSelect]);

  const handleEdit = useCallback(() => {
    onEdit(address.id);
  }, [address.id, onEdit]);

  return (
    <AddressCard
      address={address}
      selected={isSelected}
      badgeText={resolveBadgeText(address)}
      onPress={handlePress}
      onEdit={handleEdit}
    />
  );
});

interface ShippingOptionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shippingOptions: ShippingOption[];
  selectedShippingKey: string | null;
  onSelectShippingKey: (shippingKey: string) => void;
  onConfirm: () => void;
  isOffline: boolean;
}

export function ShippingOptionsSheet({
  open,
  onOpenChange,
  shippingOptions,
  selectedShippingKey,
  onSelectShippingKey,
  onConfirm,
  isOffline,
}: ShippingOptionsSheetProps) {
  return (
    <Sheet
      modal
      dismissOnOverlayPress
      dismissOnSnapToBottom
      moveOnKeyboardChange
      snapPoints={SHEET_SNAP_POINTS}
      open={open}
      onOpenChange={onOpenChange}
      animation="medium"
      animationConfig={SHEET_ANIMATION_CONFIG}>
      <Sheet.Overlay
        animation="lazy"
        enterStyle={{ opacity: 0 }}
        exitStyle={{ opacity: 0 }}
        backgroundColor="$sheetOverlay"
      />
      <Sheet.Handle />
      <Sheet.Frame
        backgroundColor="$surfaceSubtle"
        borderTopLeftRadius="$6"
        borderTopRightRadius="$6">
        <YStack flex={1}>
          <YStack px="$4" pt="$2" pb="$3">
            <Text fontSize="$6" fontWeight="700" color="$color">
              Opsi Pengiriman
            </Text>
          </YStack>

          <ScrollView showsVerticalScrollIndicator={false}>
            <YStack gap="$2" px="$4" pb="$4">
              {shippingOptions.map(option => {
                const optionKey = `${option.courier_code}-${option.service_code}`;

                return (
                  <CourierOptionCard
                    key={optionKey}
                    option={option}
                    optionKey={optionKey}
                    isSelected={selectedShippingKey === optionKey}
                    onSelect={onSelectShippingKey}
                  />
                );
              })}
            </YStack>
          </ScrollView>

          <YStack px="$4" pt="$2" pb="$4">
            <TamaguiButton
              borderRadius="$3"
              minHeight={44}
              backgroundColor="$primary"
              color="$surface"
              disabled={isOffline}
              opacity={isOffline ? 0.6 : 1}
              onPress={onConfirm}>
              Konfirmasi
            </TamaguiButton>
            {isOffline ? (
              <Text fontSize="$2" color="$warning" textAlign="center" marginTop="$2">
                Tidak tersedia offline
              </Text>
            ) : null}
          </YStack>
        </YStack>
      </Sheet.Frame>
    </Sheet>
  );
}

interface AddressSelectionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loadingAddresses: boolean;
  availableAddresses: Address[];
  selectedAddressId: string | null;
  onSelectAddress: (addressId: string) => void;
  onEditAddress: (addressId: string) => void;
}

export function AddressSelectionSheet({
  open,
  onOpenChange,
  loadingAddresses,
  availableAddresses,
  selectedAddressId,
  onSelectAddress,
  onEditAddress,
}: AddressSelectionSheetProps) {
  return (
    <Sheet
      modal
      dismissOnOverlayPress
      dismissOnSnapToBottom
      moveOnKeyboardChange
      snapPoints={SHEET_SNAP_POINTS}
      open={open}
      onOpenChange={onOpenChange}
      animation="medium"
      animationConfig={SHEET_ANIMATION_CONFIG}>
      <Sheet.Overlay
        animation="lazy"
        enterStyle={{ opacity: 0 }}
        exitStyle={{ opacity: 0 }}
        backgroundColor="$sheetOverlay"
      />
      <Sheet.Handle />
      <Sheet.Frame
        backgroundColor="$surfaceSubtle"
        borderTopLeftRadius="$6"
        borderTopRightRadius="$6">
        <YStack flex={1}>
          <YStack px="$4" pt="$2" pb="$3">
            <Text fontSize="$6" fontWeight="700" color="$color">
              Pilih Alamat
            </Text>
          </YStack>

          {loadingAddresses ? (
            <YStack flex={1} alignItems="center" justifyContent="center">
              <Spinner size="large" color="$primary" />
            </YStack>
          ) : availableAddresses.length === 0 ? (
            <YStack flex={1} alignItems="center" justifyContent="center" px="$4">
              <Card
                borderRadius="$4"
                borderWidth={1}
                borderStyle="dashed"
                borderColor="$surfaceBorder"
                backgroundColor="$surface"
                padding="$4"
                width="100%">
                <YStack gap="$3" alignItems="center">
                  <MapPinIcon size={28} color="$primary" />
                  <Text color="$color" fontWeight="600" textAlign="center">
                    Belum ada alamat
                  </Text>
                </YStack>
              </Card>
            </YStack>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              <YStack gap="$2" px="$4" pb="$4">
                {availableAddresses.map(address => (
                  <AddressCardSheet
                    key={address.id}
                    address={address}
                    isSelected={address.id === selectedAddressId}
                    onSelect={onSelectAddress}
                    onEdit={onEditAddress}
                  />
                ))}
              </YStack>
            </ScrollView>
          )}
        </YStack>
      </Sheet.Frame>
    </Sheet>
  );
}
