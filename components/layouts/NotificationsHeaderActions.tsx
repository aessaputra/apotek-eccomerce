import { useCallback, useState } from 'react';
import { Button, XStack } from 'tamagui';
import AppAlertDialog from '@/components/elements/AppAlertDialog';
import { SendIcon } from '@/components/icons';
import HeaderCartIcon from '@/components/layouts/HeaderCartIcon';
import { useNotificationsContext } from '@/providers';

type TestNotificationDialogState = {
  open: boolean;
  title: string;
  description: string;
};

const TEST_NOTIFICATION_DIALOG_CLOSED: TestNotificationDialogState = {
  open: false,
  title: '',
  description: '',
};

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
  const [dialog, setDialog] = useState<TestNotificationDialogState>(
    TEST_NOTIFICATION_DIALOG_CLOSED,
  );

  const handleSendTestNotification = useCallback(async () => {
    if (isSendingTestNotification) return;

    const didSend = await sendTestNotification();

    setDialog({
      open: true,
      title: didSend ? 'Tes Notifikasi Dikirim' : 'Tes Notifikasi Gagal',
      description: didSend
        ? 'Permintaan push notifikasi tes sudah dikirim ke perangkat ini.'
        : 'Tes push notifikasi gagal dikirim. Periksa izin notifikasi perangkat, lalu coba lagi.',
    });
  }, [isSendingTestNotification, sendTestNotification]);

  const handleDialogOpenChange = useCallback((open: boolean) => {
    setDialog(prev => ({ ...prev, open }));
  }, []);

  return (
    <>
      <Button
        chromeless
        size="$2"
        disabled={isSendingTestNotification}
        accessibilityLabel="Kirim tes notifikasi"
        accessibilityHint="Mengirim notifikasi tes ke perangkat ini"
        accessibilityState={{
          disabled: isSendingTestNotification,
          busy: isSendingTestNotification,
        }}
        icon={<SendIcon testID="test-notification-button-icon" size={14} color="$primary" />}
        onPress={handleSendTestNotification}>
        Tes
      </Button>
      <AppAlertDialog
        open={dialog.open}
        onOpenChange={handleDialogOpenChange}
        title={dialog.title}
        description={dialog.description}
        confirmText="OK"
      />
    </>
  );
}
