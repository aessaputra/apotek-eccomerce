import { useTheme, YStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '@/components/elements/Button';
import { useKeyboard } from '@/hooks/useKeyboard';
import { MIN_TOUCH_TARGET, BOTTOM_BAR_SHADOW, PRIMARY_BUTTON_TITLE_STYLE } from '@/constants/ui';
import { getThemeColor } from '@/utils/theme';

/**
 * Standard vertical padding for the action bar (8px).
 */
const VERTICAL_PADDING = 8;

/**
 * Z-index for bottom action bar to ensure it appears above content.
 */
const BOTTOM_BAR_Z_INDEX = 1000;

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
 * A fixed-position action bar at the bottom of the screen.
 *
 * **Keyboard strategy:**
 * Relies on `softwareKeyboardLayoutMode: 'pan'` in app.config.ts (Android).
 * With 'pan' mode, Android never resizes the window for the keyboard,
 * so `keyboardHeight` is always the exact offset needed — no measurement,
 * no adjustResize detection, and no theme-switch timing issues.
 *
 * On iOS, the same `keyboardHeight` offset works out of the box.
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
  const { keyboardHeight, keyboardVisible } = useKeyboard();
  const theme = useTheme();

  const bottomInset = insets.bottom;
  const safeKeyboardHeight = Math.max(0, keyboardHeight || 0);

  // With 'pan' mode on Android and default iOS behaviour,
  // keyboardHeight is always the correct offset. No detection needed.
  const bottomPosition = keyboardVisible ? safeKeyboardHeight : 0;

  // Skip safe area bottom inset when keyboard is visible (keyboard covers it)
  const innerPaddingBottom = keyboardVisible
    ? VERTICAL_PADDING
    : VERTICAL_PADDING + Math.max(0, bottomInset);

  const backgroundColor = getThemeColor(theme, 'background');

  return (
    <YStack
      position="absolute"
      bottom={bottomPosition}
      left={0}
      right={0}
      zIndex={BOTTOM_BAR_Z_INDEX}>
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
    </YStack>
  );
}
