import { memo, useCallback } from 'react';
import { XStack, Text, GetProps, Spinner } from 'tamagui';
import { FontAwesome5 } from '@expo/vector-icons';

export interface OAuthButtonProps extends Omit<GetProps<typeof XStack>, 'onPress'> {
  provider: 'google';
  onPress?: () => void;
  isLoading?: boolean;
}

// Brand color hardcoded karena identitas brand (sesuai Google Brand Guidelines)
const GOOGLE_BLUE = '#4285F4';

/**
 * Tombol OAuth Google dengan ikon dan styling modern Tamagui.
 * Menggunakan token theme untuk konsistensi dengan design system apotek.
 * Optimized dengan React.memo untuk mengurangi re-render yang tidak perlu.
 */
function OAuthButton({ provider, onPress, isLoading, ...others }: OAuthButtonProps) {
  const label = 'Masuk dengan Google';

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
      onPress={handlePress}
      disabled={isLoading}
      cursor={isLoading ? 'not-allowed' : 'pointer'}
      role="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isLoading }}
      {...others}>
      {isLoading ? (
        <Spinner size="small" color="$color" />
      ) : (
        <>
          <XStack
            alignItems="center"
            justifyContent="center"
            width={24}
            height={24}
            minWidth={24}
            maxWidth={24}>
            <FontAwesome5 name="google" size={20} color={GOOGLE_BLUE} />
          </XStack>
          <Text fontSize={16} fontWeight="600" color="$color">
            {label}
          </Text>
        </>
      )}
    </XStack>
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
