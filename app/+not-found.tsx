import { Link, Stack } from 'expo-router';
import { YStack, Text, useTheme } from 'tamagui';
import { getThemeColor } from '@/utils/theme';
import { AlertCircleIcon } from '@/components/icons';

export default function NotFoundScreen() {
  const theme = useTheme();

  return (
    <YStack
      flex={1}
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      backgroundColor="$background"
      padding="$4"
      gap="$4">
      <Stack.Screen options={{ title: 'Oops!' }} />

      <AlertCircleIcon size={64} color={getThemeColor(theme, 'colorPress')} />

      <Text fontSize="$6" fontWeight="700" color="$color" ta="center">
        Halaman Tidak Ditemukan
      </Text>

      <Text fontSize="$4" color="$colorPress" ta="center" maxWidth={280} lineHeight="$4">
        Halaman yang kamu cari tidak tersedia atau telah dipindahkan.
      </Text>

      <Link href="/" asChild>
        <YStack
          paddingVertical="$2"
          paddingHorizontal="$4"
          borderRadius="$10"
          backgroundColor="$primary"
          height={48}
          width="60%"
          alignItems="center"
          justifyContent="center"
          cursor="pointer"
          marginTop="$2">
          <Text fontSize="$4" color="$white" fontWeight="600">
            Ke Beranda
          </Text>
        </YStack>
      </Link>
    </YStack>
  );
}
