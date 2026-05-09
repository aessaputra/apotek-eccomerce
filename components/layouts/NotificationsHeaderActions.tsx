import { useCallback, useState } from 'react';
import { Button, XStack } from 'tamagui';
import { SendIcon } from '@/components/icons';
import HeaderCartIcon from '@/components/layouts/HeaderCartIcon';
import { useNotificationsContext } from '@/providers';

export function NotificationsHeaderRight() {
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

export function NotificationsHeaderLeft() {
  const { sendTestNotification, isSendingTestNotification } = useNotificationsContext();

  const handleSendTestNotification = useCallback(() => {
    if (isSendingTestNotification) return;
    void sendTestNotification();
  }, [isSendingTestNotification, sendTestNotification]);

  return (
    <Button
      chromeless
      size="$2"
      disabled={isSendingTestNotification}
      accessibilityLabel="Kirim tes notifikasi"
      accessibilityHint="Mengirim notifikasi tes ke perangkat ini"
      accessibilityState={{ disabled: isSendingTestNotification, busy: isSendingTestNotification }}
      icon={<SendIcon testID="test-notification-button-icon" size={14} color="$primary" />}
      onPress={handleSendTestNotification}>
      Tes
    </Button>
  );
}
