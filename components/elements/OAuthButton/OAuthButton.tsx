import { memo, useCallback } from 'react';
import { Pressable } from 'react-native';
import { XStack, Text, GetProps, Spinner, useMedia, useTheme, useThemeName } from 'tamagui';
import { FontAwesome5 } from '@expo/vector-icons';
import { getThemeColor } from '@/utils/theme';

export interface OAuthButtonProps extends Omit<GetProps<typeof XStack>, 'onPress'> {
  provider: 'google' | 'apple';
  onPress?: () => void;
  isLoading?: boolean;
}

// Brand colors untuk OAuth providers (hardcoded karena identitas brand)
const GOOGLE_BLUE = '#4285F4';

/**
 * Tombol OAuth (Google/Apple) dengan ikon dan styling modern Tamagui.
 * Menggunakan token theme untuk konsistensi dengan design system apotek.
 * Fully responsive dengan mobile-first approach menggunakan Tamagui media queries.
 * Optimized dengan React.memo untuk mengurangi re-render yang tidak perlu.
 */
function OAuthButton({ provider, onPress, isLoading, ...others }: OAuthButtonProps) {
  const media = useMedia();
  const theme = useTheme();
  const themeName = useThemeName();
  const isDark = themeName === 'dark';
  const isApple = provider === 'apple';
  const label = isApple ? 'Apple' : 'Google';

  /**
   * Apple Sign In Guidelines:
   * https://developer.apple.com/design/human-interface-guidelines/sign-in-with-apple
   * - Button styles: Black, White, atau White with outline
   * - Harus menggunakan logo Apple resmi
   * - Untuk custom button, gunakan logo Apple dengan styling sesuai HIG
   * - Menggunakan theme tokens untuk konsistensi dengan design system
   */
  // Menggunakan theme tokens daripada hardcoded colors
  const appleIconColor = getThemeColor(theme, isDark ? 'white' : 'color', '#000000');

  // Responsive sizing berdasarkan breakpoint dengan proporsionalitas yang lebih baik
  // Icon size proporsional dengan button height (sekitar 38-42% dari height)
  const iconSize = media.gtMd ? 24 : media.gtSm ? 22 : 20;
  const fontSize = media.gtMd ? 18 : media.gtSm ? 17 : 16;

  // Error handling wrapper untuk onPress dengan graceful error handling
  const handlePress = useCallback(() => {
    if (isLoading || !onPress) return;
    try {
      onPress();
    } catch (error) {
      // Log error untuk debugging, tetapi tidak crash aplikasi
      if (__DEV__) {
        console.error(`OAuthButton (${provider}) onPress error:`, error);
      }
    }
  }, [onPress, isLoading, provider]);

  return (
    <Pressable
      onPress={handlePress}
      disabled={isLoading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isLoading }}
      style={({ pressed }) => ({
        opacity: pressed || isLoading ? 0.7 : 1,
        flex: 1,
      })}>
      <XStack
        width="100%"
        alignItems="center"
        justifyContent="center"
        backgroundColor="$surface"
        borderWidth={1.5}
        borderColor="$surfaceBorder"
        borderRadius={12}
        height={52}
        paddingHorizontal={16}
        gap="$2"
        $gtSm={{
          height: 56,
          borderRadius: 14,
          paddingHorizontal: 20,
          gap: '$3',
        }}
        $gtMd={{
          height: 60,
          borderRadius: 16,
          paddingHorizontal: 24,
          gap: '$4',
        }}
        opacity={isLoading ? 0.6 : 1}
        animation="quick"
        hoverStyle={{
          backgroundColor: '$surface',
          scale: 1.01,
          borderColor: '$surfaceBorder',
        }}
        pressStyle={{
          scale: 0.98,
          backgroundColor: '$surfaceSubtle',
        }}
        {...others}>
        {isLoading ? (
          <Spinner size="small" color="$color" />
        ) : (
          <>
            <XStack
              alignItems="center"
              justifyContent="center"
              width={iconSize + 4}
              height={iconSize + 4}
              minWidth={iconSize + 4}
              maxWidth={iconSize + 4}>
              {isApple ? (
                // Apple logo sesuai Apple HIG
                // Menggunakan theme tokens untuk konsistensi dengan design system
                <FontAwesome5 name="apple" size={iconSize} color={appleIconColor} solid />
              ) : (
                // Google logo menggunakan FontAwesome dengan brand color Google
                // Brand color hardcoded karena identitas brand (sesuai Google Brand Guidelines)
                <FontAwesome5 name="google" size={iconSize} color={GOOGLE_BLUE} />
              )}
            </XStack>
            <Text fontSize={fontSize} fontWeight="600" color="$color">
              {label}
            </Text>
          </>
        )}
      </XStack>
    </Pressable>
  );
}

// Memoize component untuk mengurangi re-render yang tidak perlu
// Hanya re-render jika props yang relevan berubah (provider, isLoading, onPress)
export default memo(OAuthButton, (prevProps, nextProps) => {
  return (
    prevProps.provider === nextProps.provider &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.onPress === nextProps.onPress
  );
});
