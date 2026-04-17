import { RefreshCw } from '@tamagui/lucide-icons';
import { Button as TamaguiButton, Card, Spinner, Text, XStack, YStack } from 'tamagui';

type ErrorBannerType = 'warning' | 'danger';

interface ErrorBannerProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  type?: ErrorBannerType;
}

export function ErrorBanner({ title, message, onRetry, type = 'danger' }: ErrorBannerProps) {
  const isWarning = type === 'warning';
  const resolvedTitle =
    title ?? (isWarning ? 'Menampilkan data keranjang tersimpan.' : 'Gagal memuat keranjang.');

  return (
    <Card
      borderRadius="$4"
      borderWidth={1}
      borderColor={isWarning ? '$primary' : '$danger'}
      padding="$3"
      backgroundColor={isWarning ? '$surfaceSubtle' : '$surface'}>
      <YStack gap="$2">
        <Text color={isWarning ? '$primary' : '$danger'} fontWeight="700">
          {resolvedTitle}
        </Text>
        <Text color={isWarning ? '$colorSubtle' : '$danger'}>{message}</Text>
        {onRetry ? (
          <XStack justifyContent="flex-end">
            <TamaguiButton
              size="$2"
              circular
              backgroundColor="transparent"
              borderWidth={1}
              borderColor={isWarning ? '$primary' : '$danger'}
              color={isWarning ? '$primary' : '$danger'}
              onPress={onRetry}
              icon={<RefreshCw size={14} color={isWarning ? '$primary' : '$danger'} />}
              aria-label="Muat ulang keranjang"
            />
          </XStack>
        ) : null}
      </YStack>
    </Card>
  );
}

interface OfflineBannerProps {
  hasCachedData: boolean;
}

export function OfflineBanner({ hasCachedData }: OfflineBannerProps) {
  return (
    <Card
      borderRadius="$4"
      borderWidth={1}
      borderColor="$warning"
      padding="$3"
      backgroundColor="$warningSoft">
      <YStack gap="$1">
        <Text color="$warning" fontWeight="700">
          Koneksi internet terputus
        </Text>
        <Text color="$colorSubtle">
          {hasCachedData
            ? 'Data keranjang tersimpan tetap ditampilkan.'
            : 'Koneksi internet terputus. Data keranjang tidak tersedia.'}
        </Text>
      </YStack>
    </Card>
  );
}

export function CartInitialLoadingOverlay() {
  return (
    <YStack
      key="cart-initial-loading-overlay"
      flex={1}
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      zIndex={1000}
      backgroundColor="$background"
      alignItems="center"
      justifyContent="center"
      animation="quick"
      enterStyle={{ opacity: 0 }}
      exitStyle={{ opacity: 0 }}
      opacity={1}
      aria-label="Memuat keranjang">
      <YStack alignItems="center" justifyContent="center" padding="$4">
        <Spinner size="large" color="$primary" />
      </YStack>
    </YStack>
  );
}

interface CartStatusBannersProps {
  isOffline: boolean;
  hasCachedData: boolean;
  offlineActionMessage: string | null;
  fetchError: string | null;
  onRetryFetch: () => void;
  cartActionError: string | null;
  onDismissCartActionError: () => void;
}

export function CartStatusBanners({
  isOffline,
  hasCachedData,
  offlineActionMessage,
  fetchError,
  onRetryFetch,
  cartActionError,
  onDismissCartActionError,
}: CartStatusBannersProps) {
  return (
    <YStack gap="$3">
      {isOffline ? <OfflineBanner hasCachedData={hasCachedData} /> : null}

      {offlineActionMessage ? (
        <Card
          borderRadius="$4"
          borderWidth={1}
          borderColor="$warning"
          padding="$3"
          backgroundColor="$surfaceSubtle">
          <Text color="$warning" fontWeight="600">
            {offlineActionMessage}
          </Text>
        </Card>
      ) : null}

      {fetchError ? <ErrorBanner message={fetchError} onRetry={onRetryFetch} /> : null}

      {cartActionError ? (
        <ErrorBanner
          title="Gagal memperbarui keranjang."
          message={cartActionError}
          onRetry={onDismissCartActionError}
          type="warning"
        />
      ) : null}
    </YStack>
  );
}
