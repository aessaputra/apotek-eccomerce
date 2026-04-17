import { Platform } from 'react-native';
import { YStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '@/components/elements/Button';
import { MIN_TOUCH_TARGET, PRIMARY_BUTTON_TITLE_STYLE } from '@/constants/ui';

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
  extraBottomOffset?: number;
  keyboardAnchored?: boolean;
  /**
   * Whether to include the bottom safe area inset in the bar's padding.
   * Set to `false` when a parent `SafeAreaView` already applies the bottom inset
   * to avoid double-spacing. Defaults to `true` for backward compatibility.
   */
  includeBottomInset?: boolean;
  /** Accessibility label for screen readers */
  'aria-label': string;
  /** Accessibility hint providing additional context for screen readers */
  'aria-describedby': string;
}
export default function BottomActionBar({
  buttonTitle,
  onPress,
  isLoading = false,
  disabled = false,
  extraBottomOffset = 0,
  keyboardAnchored = false,
  includeBottomInset = true,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
}: BottomActionBarProps) {
  const insets = useSafeAreaInsets();

  const bottomInset = includeBottomInset ? insets.bottom : 0;
  const innerPaddingBottom = VERTICAL_PADDING + Math.max(0, bottomInset);
  const anchoredOnAndroid = Platform.OS === 'android' && keyboardAnchored;
  const bottomOffset = anchoredOnAndroid ? extraBottomOffset : 0;

  return (
    <YStack
      position={anchoredOnAndroid ? 'absolute' : 'relative'}
      bottom={anchoredOnAndroid ? bottomOffset : undefined}
      left={anchoredOnAndroid ? 0 : undefined}
      right={anchoredOnAndroid ? 0 : undefined}
      borderTopWidth={1}
      borderTopColor="$borderColor"
      backgroundColor="$background"
      px="$4"
      pt="$2"
      pb={innerPaddingBottom}
      elevation={8}
      role="toolbar"
      aria-label="Bottom action bar"
      aria-describedby="Action bar with primary action button">
      <Button
        title={buttonTitle}
        width="100%"
        backgroundColor="$primary"
        titleStyle={PRIMARY_BUTTON_TITLE_STYLE}
        borderRadius={BUTTON_BORDER_RADIUS}
        minHeight={MIN_TOUCH_TARGET}
        onPress={onPress}
        isLoading={isLoading}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        accessibilityState={{
          disabled: disabled || isLoading,
          busy: isLoading,
        }}
      />
    </YStack>
  );
}
