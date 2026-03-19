import { useCallback } from 'react';
import { YStack, Text, useTheme } from 'tamagui';
import GradientButton from '@/components/elements/GradientButton';
import { useRouter } from 'expo-router';
import { getThemeColor } from '@/utils/theme';
import { PRIMARY_BUTTON_TITLE_STYLE } from '@/constants/ui';

export default function Details() {
  const router = useRouter();
  const theme = useTheme();
  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <YStack
      flex={1}
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      backgroundColor="$background">
      <Text fontSize="$7" marginBottom="$5" color="$color" fontWeight="700">
        Detail
      </Text>
      <GradientButton
        title="Kembali ke Beranda"
        titleStyle={{ ...PRIMARY_BUTTON_TITLE_STYLE, color: '$background', textAlign: 'center' }}
        paddingVertical={8}
        paddingHorizontal={16}
        borderRadius={22}
        height={44}
        width="50%"
        gradientBackgroundProps={{
          colors: [getThemeColor(theme, 'brandPrimary'), getThemeColor(theme, 'accent5')],
          start: { x: 0, y: 1 },
          end: { x: 0.8, y: 0 },
        }}
        onPress={handleBack}
      />
    </YStack>
  );
}
