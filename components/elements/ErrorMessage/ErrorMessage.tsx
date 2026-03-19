import { AnimatePresence, YStack, XStack, Text, GetProps, useTheme } from 'tamagui';
import Button from '../Button';
import { getThemeColor } from '@/utils/theme';
import { AlertCircleIcon, CloseIcon } from '@/components/icons';

export interface ErrorMessageProps extends Omit<GetProps<typeof YStack>, 'children'> {
  message: string | null;
  onDismiss?: () => void;
  dismissible?: boolean;
}

/**
 * Reusable error message component dengan Tamagui styling dan height collapse animation.
 *
 * Best Practices:
 * - Menggunakan height collapse animation untuk menghindari layout shift
 * - Menggunakan Tamagui tokens ($danger, $dangerSoft) untuk konsistensi theme
 * - Menggunakan AnimatePresence untuk smooth enter/exit animations
 * - Menggunakan overflow="hidden" pada wrapper untuk smooth height collapse
 * - Mengikuti project guidelines: Tamagui only, no StyleSheet
 *
 * @example
 * ```tsx
 * <ErrorMessage
 *   message={error}
 *   onDismiss={() => setError(null)}
 *   dismissible={true}
 * />
 * ```
 */
function ErrorMessage({
  message,
  onDismiss,
  dismissible = true,
  ...stackProps
}: ErrorMessageProps) {
  const theme = useTheme();
  const dangerColor = getThemeColor(theme, 'danger');

  return (
    <AnimatePresence>
      {message && (
        <YStack
          key="error-message"
          overflow="hidden"
          animation="quick"
          enterStyle={{ opacity: 0, maxHeight: 0, scale: 0.95 }}
          exitStyle={{ opacity: 0, maxHeight: 0, scale: 0.95 }}
          opacity={1}
          maxHeight={200}
          scale={1}
          {...stackProps}>
          <XStack
            alignItems="center"
            gap="$2"
            paddingVertical="$3"
            paddingHorizontal="$4"
            backgroundColor="$dangerSoft"
            borderRadius="$3"
            borderWidth={1}
            borderColor="$danger">
            <AlertCircleIcon size={16} color={dangerColor} />
            <Text flex={1} fontSize={14} fontWeight="600" color="$danger" lineHeight={20}>
              {message}
            </Text>
            {dismissible && onDismiss && (
              <Button
                onPress={onDismiss}
                backgroundColor="transparent"
                padding={4}
                aria-label="Dismiss error"
                role="button">
                <CloseIcon size={14} color={dangerColor} />
              </Button>
            )}
          </XStack>
        </YStack>
      )}
    </AnimatePresence>
  );
}

export default ErrorMessage;
