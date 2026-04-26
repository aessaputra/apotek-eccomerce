import { Button as TamaguiButton, Card, Separator, Spinner, Text, XStack, YStack } from 'tamagui';
import { ChevronRightIcon, MapPinIcon } from '@/components/icons';
import type { Address } from '@/types/address';
import type { ShippingOption } from '@/types/shipping';
import { formatRupiah } from '@/scenes/cart/cart.constants';

interface ErrorDetailsCardProps {
  message: string;
  suggestion?: string | null;
}

function ErrorDetailsCard({ message, suggestion }: ErrorDetailsCardProps) {
  return (
    <Card
      borderRadius="$4"
      borderWidth={1}
      borderColor="$danger"
      padding="$3"
      backgroundColor="$surface">
      <YStack gap="$1.5">
        <Text color="$danger">{message}</Text>
        {suggestion ? (
          <Text color="$colorSubtle" fontSize="$2">
            {suggestion}
          </Text>
        ) : null}
      </YStack>
    </Card>
  );
}

interface CartCheckoutDetailsProps {
  loadingSelectedAddress: boolean;
  selectedAddress: Address | null;
  selectedAddressFullText: string;
  onOpenAddressSheet: () => void;
  addressErrorMessage: string | null;
  loadingRates: boolean;
  selectedShippingOption: ShippingOption | null;
  isOffline: boolean;
  onOpenShippingSheet: () => void;
  activeOrderId: string | null;
  paymentError: string | null;
  startingCheckout: boolean;
  onCancelPendingCheckout: () => void;
  onContinuePendingCheckout: () => void;
  shippingOptionsCount: number;
  shippingErrorMessage: string | null;
  shippingRecoverySuggestion: string | null;
  onRetryShipping: () => void;
}

export function CartCheckoutDetails({
  loadingSelectedAddress,
  selectedAddress,
  selectedAddressFullText,
  onOpenAddressSheet,
  addressErrorMessage,
  loadingRates,
  selectedShippingOption,
  isOffline,
  onOpenShippingSheet,
  activeOrderId,
  paymentError,
  startingCheckout,
  onCancelPendingCheckout,
  onContinuePendingCheckout,
  shippingOptionsCount,
  shippingErrorMessage,
  shippingRecoverySuggestion,
  onRetryShipping,
}: CartCheckoutDetailsProps) {
  return (
    <YStack gap="$4" paddingTop="$1">
      {loadingSelectedAddress ? (
        <YStack alignItems="center" justifyContent="center" paddingVertical="$5">
          <Spinner size="large" color="$primary" />
        </YStack>
      ) : selectedAddress ? (
        <Card
          bordered
          size="$4"
          backgroundColor="$surface"
          borderColor="$surfaceBorder"
          onPress={onOpenAddressSheet}
          aria-label="Ganti alamat pengiriman">
          <XStack padding="$4" gap="$3" alignItems="center">
            <XStack alignSelf="flex-start" marginTop="$1">
              <MapPinIcon size={20} color="$primary" />
            </XStack>

            <YStack gap="$1" flex={1}>
              <XStack alignItems="center" gap="$1" flex={1}>
                <Text color="$color" fontWeight="700" numberOfLines={1}>
                  {selectedAddress.receiver_name}
                </Text>
                <Text color="$colorSubtle" fontSize="$3">
                  {' | '}
                </Text>
                <Text color="$colorSubtle" fontSize="$3" numberOfLines={1} flex={1}>
                  {selectedAddress.phone_number}
                </Text>
              </XStack>
              <Text color="$colorSubtle" numberOfLines={2}>
                {selectedAddressFullText}
              </Text>
            </YStack>

            <XStack alignItems="center" justifyContent="center">
              <ChevronRightIcon size={16} color="$colorSubtle" />
            </XStack>
          </XStack>
        </Card>
      ) : (
        <Card
          borderRadius="$4"
          borderWidth={1}
          borderStyle="dashed"
          borderColor="$surfaceBorder"
          backgroundColor="$surface"
          padding="$4">
          <YStack gap="$3">
            <XStack alignItems="center" gap="$2">
              <MapPinIcon size={18} color="$primary" />
              <Text color="$color" fontWeight="600">
                Belum ada alamat
              </Text>
            </XStack>
            <TamaguiButton
              backgroundColor="$primary"
              color="$onPrimary"
              borderRadius="$3"
              minHeight={44}
              onPress={onOpenAddressSheet}
              aria-label="Tambah alamat pengiriman">
              Tambah Alamat
            </TamaguiButton>
          </YStack>
        </Card>
      )}

      {addressErrorMessage ? <ErrorDetailsCard message={addressErrorMessage} /> : null}

      <Card
        bordered
        size="$4"
        backgroundColor="$surface"
        borderColor="$surfaceBorder"
        opacity={isOffline ? 0.7 : 1}
        onPress={onOpenShippingSheet}>
        <Card.Header padded>
          <XStack alignItems="center" justifyContent="space-between" gap="$3">
            <Text fontSize="$4" fontWeight="600" color="$color" numberOfLines={1} flex={1}>
              Opsi Pengiriman
            </Text>
            {loadingRates ? (
              <Spinner size="small" color="$primary" />
            ) : (
              <ChevronRightIcon size={16} color="$colorSubtle" />
            )}
          </XStack>
        </Card.Header>

        <Separator />

        <XStack padding="$3" gap="$3" alignItems="center">
          {selectedShippingOption ? (
            <>
              <YStack flex={1} gap="$0.5" minWidth={0}>
                <Text color="$color" fontWeight="700" numberOfLines={1}>
                  {selectedShippingOption.courier_name} - {selectedShippingOption.service_name}
                </Text>
                <Text color="$colorSubtle" fontSize="$3" numberOfLines={1}>
                  Estimasi: {selectedShippingOption.estimated_delivery}
                </Text>
              </YStack>
              <Text color="$primary" fontWeight="700" flexShrink={0}>
                {formatRupiah(selectedShippingOption.price)}
              </Text>
            </>
          ) : (
            <Text flex={1} color="$colorSubtle" fontWeight="500" textAlign="center">
              Pilih Kurir
            </Text>
          )}
        </XStack>

        {isOffline ? (
          <XStack px="$3" pb="$3">
            <Text fontSize="$2" color="$warning" fontWeight="600">
              Tidak tersedia offline
            </Text>
          </XStack>
        ) : null}
      </Card>

      {activeOrderId ? (
        <Card
          borderRadius="$4"
          borderWidth={1}
          borderColor="$warning"
          padding="$3"
          backgroundColor="$warningSoft">
          <YStack gap="$2.5">
            <Text color="$warning" fontWeight="700">
              Pembayaran Tertunda
            </Text>
            <Text color="$colorSubtle" fontSize="$2">
              {paymentError ??
                'Order sudah dibuat. Lanjutkan pembayaran untuk menggunakan order yang sama tanpa membuat order baru. Pilihan kurir tidak wajib dipilih ulang saat melanjutkan pembayaran.'}
            </Text>
            <XStack justifyContent="flex-end" gap="$2">
              <TamaguiButton
                size="$2"
                borderRadius="$3"
                backgroundColor="transparent"
                borderWidth={1}
                borderColor="$surfaceBorder"
                color="$color"
                onPress={onCancelPendingCheckout}
                aria-label="Batalkan checkout tertunda">
                Batalkan
              </TamaguiButton>
              <TamaguiButton
                size="$2"
                borderRadius="$3"
                backgroundColor="$primary"
                color="$onPrimary"
                disabled={isOffline || startingCheckout}
                opacity={isOffline || startingCheckout ? 0.7 : 1}
                onPress={onContinuePendingCheckout}
                aria-label="Lanjutkan pembayaran">
                {startingCheckout ? 'Memproses...' : 'Lanjutkan Pembayaran'}
              </TamaguiButton>
            </XStack>
          </YStack>
        </Card>
      ) : null}

      {shippingErrorMessage && shippingOptionsCount === 0 && !loadingRates ? (
        <XStack justifyContent="flex-end" marginTop="$-2">
          <TamaguiButton
            size="$2"
            circular
            backgroundColor="transparent"
            borderWidth={1}
            borderColor="$surfaceBorder"
            color="$primary"
            onPress={onRetryShipping}
            aria-label="Muat ulang ongkir">
            Muat Ulang
          </TamaguiButton>
        </XStack>
      ) : null}

      {shippingErrorMessage ? (
        <ErrorDetailsCard message={shippingErrorMessage} suggestion={shippingRecoverySuggestion} />
      ) : null}
    </YStack>
  );
}
