import React, { useCallback, useState } from 'react';
import { FlatList, Linking, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Card, Spinner, Text, XStack, YStack, styled, useTheme } from 'tamagui';
import { MIN_TOUCH_TARGET } from '@/constants/ui';
import ErrorMessage from '@/components/elements/ErrorMessage';
import { AlertCircleIcon, BellIcon, CheckCircleIcon, ChevronRightIcon } from '@/components/icons';
import { useNotificationsContext } from '@/providers';
import { useAppSlice } from '@/slices';
import {
  buildNotificationTypedHref,
  parseNotificationRoute,
  type NotificationRow,
} from '@/types/notification';
import { formatOrderDateTime } from '@/utils/orderDate';
import { getThemeColor } from '@/utils/theme';

const StateContainer = styled(YStack, {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  gap: '$4',
  padding: '$6',
  backgroundColor: '$background',
});

const IconCircle = styled(YStack, {
  width: 96,
  height: 96,
  borderRadius: '$10',
  alignItems: 'center',
  justifyContent: 'center',
});

const NotificationCard = styled(Card, {
  bordered: true,
  size: '$4',
  marginHorizontal: '$4',
  marginBottom: '$3',
  backgroundColor: '$surface',
  borderColor: '$surfaceBorder',
  animation: 'quick',
  variants: {
    unread: {
      true: {
        backgroundColor: '$infoSoft',
        borderColor: '$info',
      },
      false: {
        backgroundColor: '$surface',
        borderColor: '$surfaceBorder',
      },
    },
  } as const,
});

const StatusBadge = styled(YStack, {
  paddingHorizontal: '$3',
  paddingVertical: '$1.5',
  borderRadius: '$4',
  alignItems: 'center',
  justifyContent: 'center',
  variants: {
    unread: {
      true: {
        backgroundColor: '$primary',
      },
      false: {
        backgroundColor: '$surfaceSubtle',
      },
    },
  } as const,
});

function getPermissionCopy(permissionStatus: { status: string; canRequest: boolean }): {
  title: string;
  description: string;
  buttonLabel: string;
} {
  if (permissionStatus.status === 'denied') {
    return {
      title: 'Notifikasi belum aktif',
      description: 'Buka pengaturan untuk menyalakan izin notifikasi.',
      buttonLabel: 'Buka Pengaturan',
    };
  }

  return {
    title: 'Aktifkan notifikasi',
    description: 'Dapatkan update pesanan dan pembayaran tepat waktu.',
    buttonLabel: 'Aktifkan Sekarang',
  };
}

const LoadingState = React.memo(function LoadingState() {
  return (
    <StateContainer>
      <Spinner size="large" color="$primary" />
      <Text fontSize="$4" color="$colorSubtle" textAlign="center">
        Memuat notifikasi...
      </Text>
    </StateContainer>
  );
});

const EmptyState = React.memo(function EmptyState() {
  return (
    <StateContainer>
      <IconCircle backgroundColor="$surfaceSubtle">
        <BellIcon size={40} color="$colorSubtle" />
      </IconCircle>
      <YStack gap="$2" alignItems="center">
        <Text fontSize="$6" fontWeight="700" color="$color" textAlign="center">
          Belum ada notifikasi
        </Text>
        <Text fontSize="$4" color="$colorSubtle" textAlign="center" maxWidth={320}>
          Update pembayaran, pengiriman, dan pesanan akan muncul di sini saat tersedia.
        </Text>
      </YStack>
    </StateContainer>
  );
});

const ErrorState = React.memo(function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <StateContainer>
      <IconCircle backgroundColor="$dangerSoft">
        <AlertCircleIcon size={40} color="$danger" />
      </IconCircle>
      <YStack gap="$2" alignItems="center">
        <Text fontSize="$6" fontWeight="700" color="$color" textAlign="center">
          Gagal memuat notifikasi
        </Text>
        <Text fontSize="$4" color="$colorSubtle" textAlign="center" maxWidth={320}>
          {message}
        </Text>
      </YStack>
      <Button
        size="$4"
        backgroundColor="$primary"
        color="$onPrimary"
        fontWeight="600"
        onPress={onRetry}>
        Coba Lagi
      </Button>
    </StateContainer>
  );
});

const LoadingMoreFooter = React.memo(function LoadingMoreFooter({
  isLoadingMore,
}: {
  isLoadingMore: boolean;
}) {
  if (!isLoadingMore) {
    return <YStack height="$6" />;
  }

  return (
    <YStack paddingVertical="$4" alignItems="center" gap="$2">
      <Spinner size="small" color="$primary" />
      <Text fontSize="$3" color="$colorSubtle">
        Memuat notifikasi lainnya...
      </Text>
    </YStack>
  );
});

const NotificationPermissionBanner = React.memo(function NotificationPermissionBanner({
  permissionStatus,
  onRequest,
}: {
  permissionStatus: { status: string; canRequest: boolean; isRequesting: boolean };
  onRequest: () => void;
}) {
  const handlePress = useCallback(() => {
    if (permissionStatus.status === 'denied') {
      void Linking.openSettings();
      return;
    }
    onRequest();
  }, [permissionStatus.status, onRequest]);

  if (!permissionStatus.canRequest) {
    return null;
  }

  const copy = getPermissionCopy(permissionStatus);

  return (
    <Card
      testID="notifications-permission-banner"
      bordered
      size="$4"
      marginHorizontal="$4"
      marginTop="$4"
      backgroundColor="$infoSoft"
      borderColor="$info">
      <YStack padding="$4" gap="$3">
        <XStack gap="$3" alignItems="flex-start">
          <YStack
            width={MIN_TOUCH_TARGET}
            height={MIN_TOUCH_TARGET}
            borderRadius="$6"
            backgroundColor="$surface"
            borderWidth={1}
            borderColor="$info"
            alignItems="center"
            justifyContent="center"
            flexShrink={0}>
            <BellIcon size={24} color="$info" />
          </YStack>
          <YStack flex={1} minWidth={0} flexShrink={1} gap="$1">
            <Text fontSize="$4" fontWeight="700" color="$color">
              {copy.title}
            </Text>
            <Text fontSize="$3" color="$colorSubtle">
              {copy.description}
            </Text>
          </YStack>
        </XStack>
        <Button
          size="$4"
          width="100%"
          minHeight={MIN_TOUCH_TARGET}
          backgroundColor="$primary"
          color="$onPrimary"
          fontWeight="600"
          disabled={permissionStatus.isRequesting}
          aria-label={copy.buttonLabel}
          aria-disabled={permissionStatus.isRequesting}
          aria-busy={permissionStatus.isRequesting}
          onPress={handlePress}>
          {copy.buttonLabel}
        </Button>
      </YStack>
    </Card>
  );
});

const NotificationListItem = React.memo(function NotificationListItem({
  item,
  isBusy,
  onPress,
}: {
  item: NotificationRow;
  isBusy: boolean;
  onPress: (item: NotificationRow) => void;
}) {
  const isUnread = item.read_at == null;

  const handlePress = useCallback(() => {
    onPress(item);
  }, [item, onPress]);

  const accessibilityLabel = `${item.title}. ${isUnread ? 'Belum dibaca' : 'Sudah dibaca'}. ${item.body}. ${isUnread ? 'Ketuk untuk menandai dibaca dan membuka detail terkait.' : 'Ketuk untuk membuka detail terkait.'}`;
  return (
    <NotificationCard
      unread={isUnread}
      opacity={isBusy ? 0.7 : 1}
      onPress={isBusy ? undefined : handlePress}
      pressStyle={{ opacity: 0.92, scale: 0.98 }}
      role="button"
      aria-label={accessibilityLabel}
      aria-disabled={isBusy}
      aria-busy={isBusy}
      testID={`notification-item-${item.id}`}>
      <XStack padding="$4" gap="$3" alignItems="flex-start">
        <YStack flex={1} gap="$2">
          <XStack alignItems="center" justifyContent="space-between" gap="$3">
            <XStack flex={1} alignItems="center" gap="$2">
              <YStack
                width={10}
                height={10}
                borderRadius={100}
                backgroundColor="$primary"
                opacity={isUnread ? 1 : 0}
              />
              <Text fontSize="$5" fontWeight={isUnread ? '700' : '600'} color="$color">
                {item.title}
              </Text>
            </XStack>

            <StatusBadge unread={isUnread}>
              <Text fontSize="$2" fontWeight="700" color={isUnread ? '$onPrimary' : '$colorSubtle'}>
                {isUnread ? 'Belum dibaca' : 'Sudah dibaca'}
              </Text>
            </StatusBadge>
          </XStack>

          <Text fontSize="$3" color="$colorMuted">
            {formatOrderDateTime(item.created_at)}
          </Text>

          <Text fontSize="$4" color="$colorSubtle" lineHeight="$4">
            {item.body}
          </Text>
        </YStack>

        <YStack paddingTop="$1" alignItems="center" justifyContent="center">
          {isBusy ? (
            <Spinner size="small" color="$primary" />
          ) : isUnread ? (
            <CheckCircleIcon size={18} color="$primary" />
          ) : (
            <ChevronRightIcon size={18} color="$colorMuted" />
          )}
        </YStack>
      </XStack>
    </NotificationCard>
  );
});

export default function Notifications() {
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAppSlice();
  const [activeNotificationId, setActiveNotificationId] = useState<string | null>(null);
  const {
    items,
    status,
    error,
    isLoading,
    isRefreshing,
    isLoadingMore,
    hasMore,
    permissionStatus,
    refresh,
    loadMore,
    markAsRead,
    requestPermission,
  } = useNotificationsContext();

  const refreshTintColor = getThemeColor(theme, 'primary');
  const hasItems = items.length > 0;

  const handleRefresh = useCallback(() => {
    void refresh();
  }, [refresh]);

  const handleRequestPermission = useCallback(() => {
    if (permissionStatus.status === 'denied') {
      void Linking.openSettings();
      return;
    }
    void requestPermission();
  }, [permissionStatus.status, requestPermission]);

  const handleEndReached = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      void loadMore();
    }
  }, [hasMore, isLoadingMore, loadMore]);

  const handleNotificationPress = useCallback(
    async (item: NotificationRow) => {
      setActiveNotificationId(item.id);

      try {
        if (item.read_at == null) {
          await markAsRead(item.id);
        }

        const parsedRoute = parseNotificationRoute(item);

        if (parsedRoute.kind === 'route') {
          router.push(buildNotificationTypedHref(parsedRoute.route));
        }
      } finally {
        setActiveNotificationId(currentId => (currentId === item.id ? null : currentId));
      }
    },
    [markAsRead, router],
  );

  const renderItem = useCallback(
    ({ item }: { item: NotificationRow }) => (
      <NotificationListItem
        item={item}
        isBusy={activeNotificationId === item.id}
        onPress={handleNotificationPress}
      />
    ),
    [activeNotificationId, handleNotificationPress],
  );

  const keyExtractor = useCallback((item: NotificationRow) => item.id, []);

  if (!user?.id || (isLoading && !hasItems)) {
    return <LoadingState />;
  }

  if (status === 'error' && !hasItems) {
    return <ErrorState message={error ?? 'Gagal memuat notifikasi.'} onRetry={handleRefresh} />;
  }

  return (
    <YStack flex={1} backgroundColor="$background">
      <FlatList
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        windowSize={11}
        maxToRenderPerBatch={10}
        removeClippedSubviews={true}
        extraData={activeNotificationId}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={refreshTintColor}
          />
        }
        ListHeaderComponent={
          <YStack paddingBottom="$3">
            <NotificationPermissionBanner
              permissionStatus={permissionStatus}
              onRequest={handleRequestPermission}
            />

            {error ? (
              <ErrorMessage
                message={error}
                dismissible={false}
                marginHorizontal="$4"
                marginTop="$4"
              />
            ) : null}

            {permissionStatus.error && hasItems ? (
              <ErrorMessage
                message={permissionStatus.error}
                dismissible={false}
                marginHorizontal="$4"
                marginTop="$4"
              />
            ) : null}
          </YStack>
        }
        ListEmptyComponent={<EmptyState />}
        ListFooterComponent={<LoadingMoreFooter isLoadingMore={isLoadingMore} />}
        contentContainerStyle={{ flexGrow: 1 }}
      />
    </YStack>
  );
}
