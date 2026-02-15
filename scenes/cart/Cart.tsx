import { YStack, Text, useTheme } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { getThemeColor } from '@/utils/theme';

export default function Cart() {
  const theme = useTheme();
  const subtleColor = getThemeColor(theme, 'colorPress', '#6B7280');

  return (
    <YStack
      flex={1}
      alignItems="center"
      justifyContent="center"
      backgroundColor="$background"
      padding="$5"
      space="$4">
      <Ionicons name="cart-outline" size={64} color={subtleColor} />
      <Text fontSize="$6" fontWeight="700" color="$color" textAlign="center" fontFamily="$heading">
        Keranjang Kosong
      </Text>
      <Text fontSize="$4" color="$colorPress" textAlign="center" maxWidth={300} lineHeight="$4">
        Produk yang Anda tambahkan akan muncul di sini.
      </Text>
    </YStack>
  );
}
