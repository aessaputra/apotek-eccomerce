import { useEffect } from 'react';
import { YStack, Spinner } from 'tamagui';
import { Redirect, useRouter } from 'expo-router';
import { useAppSlice } from '@/slices';

export default function Index() {
  const { checked, loggedIn } = useAppSlice();
  const router = useRouter();

  useEffect(() => {
    if (!checked || !loggedIn) return;

    router.navigate('/home');
  }, [checked, loggedIn, router]);

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

  return null;
}
