import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Button, Text, YStack, XStack } from 'tamagui';

export interface AppAlertDialogProps {
  /** Controlled open state */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Dialog title */
  title: string;
  /** Dialog description/message */
  description: string;
  /** Confirm button text (default: 'OK') */
  confirmText?: string;
  /** Cancel button text — when provided, shows a cancel button */
  cancelText?: string;
  /** Callback fired when confirm button is pressed (before closing) */
  onConfirm?: () => void;
  /** Confirm button color token (default: '$primary') */
  confirmColor?: string;
}

/**
 * Reusable alert dialog menggunakan React Native Modal + Tamagui styled content.
 * Menggunakan RN Modal untuk kompatibilitas penuh di native (iOS/Android/Web),
 * dengan konten yang di-style menggunakan Tamagui design tokens.
 *
 * Uses a SIBLING layout pattern (backdrop + dialog as siblings) instead of
 * nested Pressables to avoid click event propagation issues on web.
 *
 * @example
 * // Single button (info)
 * <AppAlertDialog
 *   open={alertOpen}
 *   onOpenChange={setAlertOpen}
 *   title="Akses Ditolak"
 *   description="Hanya customer yang boleh login."
 * />
 *
 * @example
 * // Two buttons (destructive confirm)
 * <AppAlertDialog
 *   open={logoutOpen}
 *   onOpenChange={setLogoutOpen}
 *   title="Keluar"
 *   description="Anda yakin ingin keluar?"
 *   cancelText="Batal"
 *   confirmText="Keluar"
 *   confirmColor="$danger"
 *   onConfirm={handleLogout}
 * />
 */
const DIALOG_WIDTH = 320;

export default function AppAlertDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'OK',
  cancelText,
  onConfirm,
  confirmColor = '$primary',
}: AppAlertDialogProps) {
  const handleClose = () => onOpenChange(false);

  const handleConfirm = () => {
    onConfirm?.();
    onOpenChange(false);
  };

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent>
      <View style={styles.overlay}>
        {/* Backdrop — click to dismiss (sibling, not parent of dialog) */}
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        {/* Dialog content — sits above backdrop, no event bubbling issues */}
        <YStack
          backgroundColor="$surface"
          borderRadius="$4"
          padding="$5"
          width={DIALOG_WIDTH}
          maxWidth="90%"
          elevation={8}
          gap="$3"
          zIndex={1}>
          <Text fontSize={18} fontWeight="700" color="$color">
            {title}
          </Text>
          <Text fontSize={14} color="$colorSubtle" lineHeight={20}>
            {description}
          </Text>
          <XStack justifyContent="flex-end" paddingTop="$2" gap="$2">
            {cancelText && (
              <Button
                backgroundColor="transparent"
                borderRadius="$3"
                paddingHorizontal="$4"
                paddingVertical="$2"
                pressStyle={{ opacity: 0.7 }}
                onPress={handleClose}>
                <Text color="$colorSubtle" fontWeight="600">
                  {cancelText}
                </Text>
              </Button>
            )}
            <Button
              backgroundColor={confirmColor}
              borderRadius="$3"
              paddingHorizontal="$4"
              paddingVertical="$2"
              pressStyle={{ opacity: 0.8 }}
              onPress={handleConfirm}>
              <Text color="white" fontWeight="600">
                {confirmText}
              </Text>
            </Button>
          </XStack>
        </YStack>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
});
