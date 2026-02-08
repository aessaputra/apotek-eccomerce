import { Link, Stack } from 'expo-router';
import { YStack, XStack, Text } from 'tamagui';

export default function NotFoundScreen() {
  return (
    <YStack
      flex={1}
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      backgroundColor="$background">
      <Stack.Screen options={{ title: 'Oops!' }} />
      <Link href="/" asChild>
        <XStack
          paddingVertical={8}
          paddingHorizontal={16}
          borderRadius={22}
          backgroundColor="$primary"
          height={44}
          width="50%"
          alignItems="center"
          justifyContent="center"
          cursor="pointer">
          <Text fontSize={24} color="$white">
            Go to home screen!
          </Text>
        </XStack>
      </Link>
    </YStack>
  );
}
