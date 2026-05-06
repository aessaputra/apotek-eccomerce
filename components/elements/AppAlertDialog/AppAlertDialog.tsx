import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { Alert, type AlertButton } from 'react-native';
import { AlertDialog, Button, XStack, YStack } from 'tamagui';

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
  /** Force native platform alert (true) or Tamagui-rendered dialog (false).
   *  Defaults to Tamagui-rendered so app dialogs keep branded styling. */
  native?: boolean;
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
  native: nativeProp,
}: AppAlertDialogProps) {
  const resolvedConfirmText = confirmLabel ?? confirmText ?? 'OK';
  const resolvedCancelText = cancelLabel ?? cancelText;
  const resolvedNative = nativeProp ?? false;
  const hasShownRef = useRef(false);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen !== open) {
        onOpenChange(nextOpen);
      }
    },
    [onOpenChange, open],
  );

  const handleConfirm = useCallback(() => {
    onConfirm?.();
    handleOpenChange(false);
  }, [onConfirm, handleOpenChange]);

  const handleCancel = useCallback(() => {
    onCancel?.();
    handleOpenChange(false);
  }, [onCancel, handleOpenChange]);

  useEffect(() => {
    if (!resolvedNative) return;

    if (open && !hasShownRef.current) {
      hasShownRef.current = true;

      const buttons: AlertButton[] = [
        {
          text: resolvedConfirmText,
          onPress: handleConfirm,
          style: 'default',
        },
      ];

      if (resolvedCancelText) {
        buttons.unshift({
          text: resolvedCancelText,
          onPress: handleCancel,
          style: 'cancel',
        });
      }

      Alert.alert(title, description, buttons, { cancelable: false });
    }

    if (!open) {
      hasShownRef.current = false;
    }
  }, [
    resolvedNative,
    open,
    title,
    description,
    resolvedConfirmText,
    resolvedCancelText,
    handleConfirm,
    handleCancel,
  ]);

  if (!open || resolvedNative) {
    return null;
  }

  return (
    <AlertDialog modal open={open} onOpenChange={handleOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay
          key="overlay"
          testID="app-alert-dialog-overlay"
          animation="quick"
          backgroundColor="$sheetOverlay"
          opacity={0.74}
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
        />
        <AlertDialog.Content
          key="content"
          testID="app-alert-dialog-content"
          bordered
          elevate
          backgroundColor="$surface"
          borderColor="$surfaceBorder"
          borderRadius="$6"
          width="90%"
          maxWidth="$20"
          animation={['quick', { opacity: { overshootClamping: true } }]}
          animateOnly={['transform', 'opacity']}
          enterStyle={{ y: -20, opacity: 0, scale: 0.96 }}
          exitStyle={{ y: 10, opacity: 0, scale: 0.98 }}
          padding="$5"
          gap="$4">
          {icon ? (
            <XStack
              alignSelf="center"
              width={64}
              height={64}
              borderRadius="$10"
              backgroundColor="$surfaceSubtle"
              borderWidth={1}
              borderColor="$surfaceBorder"
              alignItems="center"
              justifyContent="center">
              {icon}
            </XStack>
          ) : null}
          <AlertDialog.Title
            fontSize="$6"
            fontWeight="700"
            color="$color"
            lineHeight={26}
            textAlign={icon ? 'center' : 'left'}
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
            lineHeight={20}
            textAlign={icon ? 'center' : 'left'}>
            {description}
          </AlertDialog.Description>

          <YStack gap="$2.5" width="100%">
            {resolvedCancelText ? (
              <AlertDialog.Cancel asChild>
                <Button
                  testID="app-alert-dialog-cancel-button"
                  width="100%"
                  minHeight={48}
                  borderRadius="$4"
                  backgroundColor={cancelColor}
                  borderWidth={1}
                  borderColor="$surfaceBorder"
                  color={cancelTextColor}
                  fontWeight="600"
                  pressStyle={{ opacity: 0.9, scale: 0.98 }}
                  focusStyle={{ borderColor: '$primary' }}
                  onPress={handleCancel}>
                  {resolvedCancelText}
                </Button>
              </AlertDialog.Cancel>
            ) : null}
            <AlertDialog.Action asChild>
              <Button
                testID="app-alert-dialog-confirm-button"
                width="100%"
                minHeight={48}
                borderRadius="$4"
                backgroundColor={confirmColor}
                borderWidth={1}
                borderColor={confirmBorderColor}
                color={confirmTextColor}
                fontWeight="700"
                pressStyle={{ opacity: 0.9, scale: 0.98 }}
                focusStyle={{ borderColor: '$primary' }}
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
