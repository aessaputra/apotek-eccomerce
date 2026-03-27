import { AlertDialog, Button, YStack } from 'tamagui';

export interface AppAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  confirmColor?: string;
  confirmTextColor?: string;
  confirmBorderColor?: string;
  onCancel?: () => void;
  cancelColor?: string;
  cancelTextColor?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export default function AppAlertDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  cancelText,
  onConfirm,
  confirmColor = '$primary',
  confirmTextColor = '$white',
  confirmBorderColor = 'transparent',
  onCancel,
  cancelColor = '$background',
  cancelTextColor = '$colorSubtle',
  confirmLabel,
  cancelLabel,
}: AppAlertDialogProps) {
  const resolvedConfirmText = confirmLabel ?? confirmText ?? 'OK';
  const resolvedCancelText = cancelLabel ?? cancelText;

  const handleConfirm = () => {
    onConfirm?.();
  };

  const handleCancel = () => {
    onCancel?.();
  };

  return (
    <AlertDialog modal native={false} open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay
          key="overlay"
          animation="quick"
          opacity={0.5}
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
        />
        <AlertDialog.Content
          key="content"
          bordered
          elevate
          width="90%"
          maxWidth="$20"
          animation={['quick', { opacity: { overshootClamping: true } }]}
          animateOnly={['transform', 'opacity']}
          enterStyle={{ y: -20, opacity: 0, scale: 0.96 }}
          exitStyle={{ y: 10, opacity: 0, scale: 0.98 }}
          padding="$4">
          <AlertDialog.Title fontSize="$6" fontWeight="700">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description fontSize="$3" color="$colorSubtle" marginTop="$2">
            {description}
          </AlertDialog.Description>

          <YStack gap="$2" width="100%" marginTop="$3">
            {resolvedCancelText ? (
              <AlertDialog.Cancel asChild>
                <Button
                  width="100%"
                  backgroundColor={cancelColor}
                  borderWidth={1}
                  borderColor="$borderColor"
                  color={cancelTextColor}
                  onPress={handleCancel}>
                  {resolvedCancelText}
                </Button>
              </AlertDialog.Cancel>
            ) : null}
            <AlertDialog.Action asChild>
              <Button
                width="100%"
                backgroundColor={confirmColor}
                borderWidth={1}
                borderColor={confirmBorderColor}
                color={confirmTextColor}
                onPress={handleConfirm}>
                {resolvedConfirmText}
              </Button>
            </AlertDialog.Action>
          </YStack>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog>
  );
}
