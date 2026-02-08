import { YStack, Text } from 'tamagui';

export default function Orders() {
  return (
    <YStack
      flex={1}
      alignItems="center"
      justifyContent="center"
      backgroundColor="$background"
      paddingHorizontal={24}>
      <Text fontSize={18} fontWeight="600" color="$color" textAlign="center">
        Pesanan Anda akan muncul di sini.
      </Text>
    </YStack>
  );
}
