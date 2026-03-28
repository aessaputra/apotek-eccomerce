import { memo, useCallback } from 'react';
import { XStack, Text, GetProps, Spinner, useMedia } from 'tamagui';
import { GoogleIcon } from '@/components/icons';
import { GOOGLE_BRAND_BLUE } from '@/constants/ui';

export interface OAuthButtonProps extends Omit<GetProps<typeof XStack>, 'onPress'> {
  provider: 'google';
  onPress?: () => void;
  isLoading?: boolean;
}

/**
 * Tombol OAuth Google dengan ikon dan styling modern Tamagui.
 * Menggunakan token theme untuk konsistensi dengan design system apotek.
 * Optimized dengan React.memo untuk mengurangi re-render yang tidak perlu.
 */
function OAuthButton({ provider, onPress, isLoading, ...others }: OAuthButtonProps) {
  const media = useMedia();
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
      borderRadius={media.gtMd ? 16 : media.gtSm ? 14 : 12}
      height={media.gtMd ? 60 : media.gtSm ? 56 : 52}
      paddingHorizontal={media.gtMd ? 24 : media.gtSm ? 20 : 16}
      gap={media.gtMd ? '$4' : media.gtSm ? '$3' : '$2'}
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
      aria-label={label}
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
            <GoogleIcon size={20} color={GOOGLE_BRAND_BLUE} />
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
