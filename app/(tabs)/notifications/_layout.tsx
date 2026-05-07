import { useCallback, useState } from 'react';
import { useTheme, Button, XStack } from 'tamagui';
import { Stack } from 'expo-router';
import HeaderCartIcon from '@/components/layouts/HeaderCartIcon';
import { getStackHeaderOptions } from '@/utils/theme';
import { withAuthGuard } from '@/hooks/withAuthGuard';
import { useNotificationsContext } from '@/providers';

function NotificationsHeaderRight() {
  const { unreadCount, markAllAsRead } = useNotificationsContext();
  const [isMarking, setIsMarking] = useState(false);

  const handleMarkAll = useCallback(async () => {
    if (isMarking || unreadCount === 0) return;
    setIsMarking(true);
    try {
      await markAllAsRead();
    } finally {
      setIsMarking(false);
    }
  }, [isMarking, markAllAsRead, unreadCount]);

  if (unreadCount === 0) {
    return <HeaderCartIcon forHeaderRight />;
  }

  return (
    <XStack alignItems="center" gap="$1">
      <Button
        chromeless
        size="$2"
        disabled={isMarking}
        accessibilityLabel="Tandai semua notifikasi sebagai dibaca"
        accessibilityHint="Menandai semua notifikasi yang belum dibaca"
        accessibilityState={{ disabled: isMarking, busy: isMarking }}
        onPress={handleMarkAll}>
        Tandai dibaca
      </Button>
      <HeaderCartIcon forHeaderRight />
    </XStack>
  );
}

function NotificationsStackLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        ...getStackHeaderOptions(theme),
      }}>
      <Stack.Screen
        name="index"
        options={{
          title: 'Notifikasi',
          headerTitleAlign: 'center',
          headerRight: () => <NotificationsHeaderRight />,
        }}
      />
    </Stack>
  );
}

export default withAuthGuard(NotificationsStackLayout);
