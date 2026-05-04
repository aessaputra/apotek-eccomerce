import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Linking, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Card, Spinner, Text, XStack, YStack, styled, useTheme } from 'tamagui';
import AppAlertDialog from '@/components/elements/AppAlertDialog';
import ErrorMessage from '@/components/elements/ErrorMessage';
import { AlertCircleIcon, BellIcon, CheckCircleIcon, ChevronRightIcon } from '@/components/icons';
import { useNotifications, type NotificationsPermissionState } from '@/hooks/useNotifications';
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

function getPermissionCopy(permissionStatus: NotificationsPermissionState): {
  title: string;
  description: string;
  buttonLabel: string;
} {
  if (permissionStatus.status === 'denied') {
    return {
      title: 'Aktifkan notifikasi',
      description:
        'Izin notifikasi belum aktif. Nyalakan agar update pembayaran dan pesanan masuk lebih cepat.',
      buttonLabel: 'Buka Pengaturan',
    };
  }

  return {
    title: 'Aktifkan notifikasi',
    description:
      'Izinkan notifikasi agar update pembayaran, pengiriman, dan pesanan terbaru bisa langsung masuk ke perangkat Anda.',
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

  return (
    <NotificationCard
      unread={isUnread}
      opacity={isBusy ? 0.7 : 1}
      onPress={isBusy ? undefined : handlePress}
      pressStyle={{ opacity: 0.92, scale: 0.98 }}
      role="button"
      testID={`notification-item-${item.id}`}>
      <XStack padding="$4" gap="$3" alignItems="flex-start">
        <YStack
          width={6}
          alignSelf="stretch"
          borderRadius="$10"
          backgroundColor={isUnread ? '$primary' : '$surfaceBorder'}
        />

        <YStack flex={1} gap="$2">
          <XStack alignItems="flex-start" justifyContent="space-between" gap="$3">
            <YStack flex={1} gap="$1">
              <Text fontSize="$5" fontWeight={isUnread ? '700' : '600'} color="$color">
                {item.title}
              </Text>
              <Text fontSize="$3" color="$colorMuted">
                {formatOrderDateTime(item.created_at)}
              </Text>
            </YStack>

            <StatusBadge unread={isUnread}>
              <Text fontSize="$2" fontWeight="700" color={isUnread ? '$onPrimary' : '$colorSubtle'}>
                {isUnread ? 'Belum dibaca' : 'Sudah dibaca'}
              </Text>
            </StatusBadge>
          </XStack>

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
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const hasAutoOpenedPermissionDialogRef = useRef(false);
  const {
    items,
    status,
    error,
    isLoading,
    isRefreshing,
    permissionStatus,
    refresh,
    markAsRead,
    requestPermission,
  } = useNotifications({ userId: user?.id });

  const refreshTintColor = getThemeColor(theme, 'primary');
  const showPermissionPrompt = permissionStatus.canRequest;
  const hasItems = items.length > 0;
  const permissionCopy = getPermissionCopy(permissionStatus);

  useEffect(() => {
    if (!permissionStatus.canRequest) {
      setPermissionDialogOpen(false);
      return;
    }

    if (
      (!permissionStatus.didPrompt || permissionStatus.status === 'denied') &&
      !hasAutoOpenedPermissionDialogRef.current
    ) {
      hasAutoOpenedPermissionDialogRef.current = true;
      setPermissionDialogOpen(true);
    }
  }, [permissionStatus.canRequest, permissionStatus.didPrompt, permissionStatus.status]);

  const handleRefresh = useCallback(() => {
    void refresh();
  }, [refresh]);

  const handleRequestPermission = useCallback(() => {
    setPermissionDialogOpen(false);

    if (permissionStatus.status === 'denied') {
      void Linking.openSettings();
      return;
    }

    void requestPermission();
  }, [permissionStatus.status, requestPermission]);

  const handlePermissionDialogOpenChange = useCallback((open: boolean) => {
    setPermissionDialogOpen(open);
  }, []);

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
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={refreshTintColor}
          />
        }
        ListHeaderComponent={
          <YStack>
            {error && hasItems ? (
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
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
      />

      <AppAlertDialog
        open={showPermissionPrompt && permissionDialogOpen}
        onOpenChange={handlePermissionDialogOpenChange}
        title={permissionCopy.title}
        description={permissionCopy.description}
        cancelText="Nanti"
        confirmText={permissionCopy.buttonLabel}
        onConfirm={handleRequestPermission}
      />
    </YStack>
  );
}
