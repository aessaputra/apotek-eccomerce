import { YStack, Text, useTheme } from 'tamagui';
import { getThemeColor } from '@/utils/theme';
import { PillIcon } from '@/components/icons';

export default function Home() {
  const theme = useTheme();
  const subtleColor = getThemeColor(theme, 'colorPress');

  return (
    <YStack flex={1} backgroundColor="$background">
      <YStack flex={1} alignItems="center" justifyContent="center" padding="$5" gap="$4">
        <PillIcon size={64} color={subtleColor} />
        <Text
          fontSize="$6"
          fontWeight="700"
          color="$color"
          textAlign="center"
          fontFamily="$heading">
          Selamat Datang
        </Text>
        <Text fontSize="$4" color="$colorPress" textAlign="center" maxWidth={300} lineHeight="$4">
          Produk dan layanan kesehatan akan segera hadir di sini.
        </Text>
      </YStack>
    </YStack>
  );
}
