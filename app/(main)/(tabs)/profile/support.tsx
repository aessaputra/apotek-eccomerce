import { YStack, Text, useTheme } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getThemeColor } from '@/utils/theme';

export default function SupportScreen() {
  const theme = useTheme();
  // Use theme-aware background with light mode default fallback (#FFFFFF)
  const bgColor = getThemeColor(theme, 'background');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bgColor }} edges={['bottom']}>
      <YStack flex={1} padding="$5" gap="$4">
        <Text fontSize="$5" fontWeight="600" color="$color" fontFamily="$heading">
          Dukungan
        </Text>
        <Text fontSize="$4" color="$colorPress" lineHeight="$4">
          Untuk pertanyaan atau bantuan, hubungi kami:
        </Text>
        <Text fontSize="$4" color="$color">
          Email: support@apotek.com
        </Text>
        <Text fontSize="$4" color="$color">
          Telepon: (021) 1234-5678
        </Text>
      </YStack>
    </SafeAreaView>
  );
}
