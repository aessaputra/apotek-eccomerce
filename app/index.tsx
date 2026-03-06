import { YStack, Spinner } from 'tamagui';
import { Redirect } from 'expo-router';
import { useAppSlice } from '@/slices';

export default function Index() {
  const { checked, loggedIn } = useAppSlice();

  if (!checked) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <Spinner size="large" color="$primary" />
      </YStack>
    );
  }

  if (!loggedIn) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href="/(main)/(tabs)" />;
}
