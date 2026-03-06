import { YStack, Text, useTheme } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { getThemeColor } from '@/utils/theme';

export default function Orders() {
  const theme = useTheme();
  const subtleColor = getThemeColor(theme, 'colorPress');

  return (
    <YStack
      flex={1}
      alignItems="center"
      justifyContent="center"
      backgroundColor="$background"
      padding="$5"
      gap="$4">
      <Ionicons name="receipt-outline" size={64} color={subtleColor} />
      <Text fontSize="$6" fontWeight="700" color="$color" textAlign="center" fontFamily="$heading">
        Belum Ada Pesanan
      </Text>
      <Text fontSize="$4" color="$colorPress" textAlign="center" maxWidth={300} lineHeight="$4">
        Pesanan Anda akan muncul di sini setelah melakukan pembelian.
      </Text>
    </YStack>
  );
}
