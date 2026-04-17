import { useCallback, type ReactNode } from 'react';
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
  /** Optional icon to display centered above the content */
  icon?: ReactNode;
  /** When true, visually hides the title but keeps it for accessibility */
  hideTitle?: boolean;
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
  confirmTextColor = '$onPrimary',
  confirmBorderColor = '$colorTransparent',
  onCancel,
  cancelColor = '$background',
  cancelTextColor = '$colorSubtle',
  confirmLabel,
  cancelLabel,
  icon,
  hideTitle = false,
}: AppAlertDialogProps) {
  const resolvedConfirmText = confirmLabel ?? confirmText ?? 'OK';
  const resolvedCancelText = cancelLabel ?? cancelText;

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen !== open) {
        onOpenChange(nextOpen);
      }
    },
    [onOpenChange, open],
  );

  const handleConfirm = () => {
    onConfirm?.();
  };

  const handleCancel = () => {
    onCancel?.();
  };

  if (!open) {
    return null;
  }

  return (
    <AlertDialog modal native={false} open={open} onOpenChange={handleOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay
          key="overlay"
          animation="quick"
          opacity={0.5}
          backgroundColor="$sheetOverlay"
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
        />
        <AlertDialog.Content
          key="content"
          bordered
          elevate
          backgroundColor="$surfaceSubtle"
          width="90%"
          maxWidth="$20"
          animation={['quick', { opacity: { overshootClamping: true } }]}
          animateOnly={['transform', 'opacity']}
          enterStyle={{ y: -20, opacity: 0, scale: 0.96 }}
          exitStyle={{ y: 10, opacity: 0, scale: 0.98 }}
          padding="$4">
          {icon ? (
            <YStack alignItems="center" marginBottom="$3">
              {icon}
            </YStack>
          ) : null}
          <AlertDialog.Title
            fontSize="$6"
            fontWeight="700"
            {...(hideTitle
              ? {
                  position: 'absolute',
                  width: 1,
                  height: 1,
                  overflow: 'hidden',
                  opacity: 0,
                }
              : {})}>
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description
            fontSize="$3"
            color="$colorSubtle"
            marginTop={hideTitle || icon ? '$0' : '$2'}
            textAlign={icon ? 'center' : 'left'}>
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
