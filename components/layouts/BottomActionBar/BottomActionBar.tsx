import { YStack, useTheme } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '@/components/elements/Button';
import { useKeyboard } from '@/hooks/useKeyboard';
import { MIN_TOUCH_TARGET, BOTTOM_BAR_SHADOW, PRIMARY_BUTTON_TITLE_STYLE } from '@/constants/ui';
import { getThemeColor } from '@/utils/theme';

/**
 * Standard vertical padding for the action bar (8px).
 * Uses Tamagui token `$2` for consistency with design system.
 *
 * Follows Material Design and iOS HIG best practices:
 * - Material Design: 8-16px vertical padding (using minimal 8px for compact design)
 * - iOS HIG: Minimal padding for toolbars to maximize content density
 * - Consistent with button padding patterns in the project
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
 * A fixed-position action bar that appears at the bottom of the screen.
 * Automatically adjusts position when keyboard is visible to remain accessible.
 * Uses Tamagui tokens for consistent theming and follows mobile design guidelines.
 *
 * @example
 * ```tsx
 * <BottomActionBar
 *   buttonTitle="Save"
 *   onPress={handleSave}
 *   isLoading={isSaving}
 *   accessibilityLabel="Save changes"
 *   accessibilityHint="Saves your profile changes"
 * />
 * ```
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

  // Calculate bottom inset for safe area handling
  // Use actual safe area inset (no minimum) to match tab bar behavior
  const bottomInset = insets.bottom;

  // Position bar flush with bottom edge (like tab bar) when keyboard is hidden
  // When keyboard is visible, position bar directly above keyboard
  // When keyboard is hidden, position at bottom: 0 (flush with edge, safe area handled via padding)
  // Validate keyboardHeight to prevent negative or invalid values
  const safeKeyboardHeight = Math.max(0, keyboardHeight || 0);
  const bottomPosition = keyboardVisible ? safeKeyboardHeight : 0;

  // Calculate balanced padding based on keyboard state
  // When keyboard is visible: use balanced padding (same top and bottom)
  // When keyboard is hidden: use balanced top padding, add safe area inset only to bottom padding
  // This ensures consistent spacing while respecting safe area
  const innerPaddingBottom = keyboardVisible
    ? VERTICAL_PADDING
    : VERTICAL_PADDING + Math.max(0, bottomInset);

  // Get theme color for style prop (Tamagui tokens don't work in style objects)
  const backgroundColor = getThemeColor(theme, 'background', '#FFFFFF');

  return (
    <YStack
      position="absolute"
      style={{
        bottom: bottomPosition,
        left: 0,
        right: 0,
        zIndex: BOTTOM_BAR_Z_INDEX,
      }}>
      <YStack
        borderTopWidth={1}
        borderColor="$borderColor"
        px="$4"
        pt="$2"
        pb={innerPaddingBottom}
        elevation={8}
        shadowColor={BOTTOM_BAR_SHADOW.shadowColor}
        shadowOffset={BOTTOM_BAR_SHADOW.shadowOffset}
        shadowOpacity={BOTTOM_BAR_SHADOW.shadowOpacity}
        shadowRadius={BOTTOM_BAR_SHADOW.shadowRadius}
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
