import { useTheme, YStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '@/components/elements/Button';
import { MIN_TOUCH_TARGET, BOTTOM_BAR_SHADOW, PRIMARY_BUTTON_TITLE_STYLE } from '@/constants/ui';
import { getThemeColor } from '@/utils/theme';

/**
 * Standard vertical padding for the action bar (8px).
 */
const VERTICAL_PADDING = 8;

/**
 * Border radius for the primary action button.
 */
const BUTTON_BORDER_RADIUS = 12;

export interface BottomActionBarProps {
  /** Text displayed on the primary action button */
  buttonTitle: string;
  /** Callback function executed when button is pressed */
  onPress: () => void | Promise<void>;
  /** Whether the button is in a loading state */
  isLoading?: boolean;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Accessibility label for screen readers */
  accessibilityLabel: string;
  /** Accessibility hint providing additional context for screen readers */
  accessibilityHint: string;
}

/**
 * BottomActionBar Component
 *
 * A bottom action bar that works with KeyboardAvoidingView.
 *
 * **Keyboard strategy:**
 * This component should be placed as a child of KeyboardAvoidingView, alongside
 * a ScrollView. When the keyboard appears, KeyboardAvoidingView will automatically
 * push this button up above the keyboard.
 *
 * This pattern works consistently on both iOS and Android when using
 * softwareKeyboardLayoutMode: 'resize' in app.config.ts.
 */
export default function BottomActionBar({
  buttonTitle,
  onPress,
  isLoading = false,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
}: BottomActionBarProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  const bottomInset = insets.bottom;
  const innerPaddingBottom = VERTICAL_PADDING + Math.max(0, bottomInset);
  const backgroundColor = getThemeColor(theme, 'background');

  return (
    <YStack
      borderTopWidth={1}
      borderColor="$borderColor"
      px="$4"
      pt="$2"
      pb={innerPaddingBottom}
      elevation={8}
      {...BOTTOM_BAR_SHADOW}
      accessibilityRole="toolbar"
      accessibilityLabel="Bottom action bar"
      accessibilityHint="Action bar with primary action button"
      style={{
        backgroundColor,
      }}>
      <Button
        title={buttonTitle}
        width="100%"
        backgroundColor="$primary"
        titleStyle={PRIMARY_BUTTON_TITLE_STYLE}
        style={{
          borderRadius: BUTTON_BORDER_RADIUS,
          minHeight: MIN_TOUCH_TARGET,
        }}
        onPress={onPress}
        isLoading={isLoading}
        disabled={disabled}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{
          disabled: disabled || isLoading,
          busy: isLoading,
        }}
      />
    </YStack>
  );
}
