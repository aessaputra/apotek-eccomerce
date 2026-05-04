import { YStack, Text, styled } from 'tamagui';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';

const SafeAreaView = styled(RNSafeAreaView, {
  flex: 1,
  backgroundColor: '$background',
});

export default function SupportScreen() {
  return (
    <SafeAreaView edges={['bottom']}>
      <YStack flex={1} padding="$5" gap="$4">
        <Text fontSize="$5" fontWeight="600" color="$color">
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
