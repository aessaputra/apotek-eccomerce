import { YStack, Spinner } from 'tamagui';
import { Redirect } from 'expo-router';
import { useAppSlice } from '@/slices';

export default function Index() {
  const { authPhase } = useAppSlice();

  if (authPhase === 'initializing' || authPhase === 'checking-mfa') {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <Spinner size="large" color="$primary" />
      </YStack>
    );
  }

  if (authPhase === 'signed-out') {
    return <Redirect href="/(auth)/login" />;
  }

  if (authPhase === 'requires-mfa') {
    return <Redirect href="/(auth)/verify-mfa" />;
  }

  return <Redirect href="/home" />;
}
