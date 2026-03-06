import { useState, useEffect } from 'react';
import { Redirect } from 'expo-router';
import { YStack, Spinner, Text } from 'tamagui';
import { useAppSlice } from '@/slices';

/**
 * Google OAuth deep-link callback handler.
 * Shows a spinner while token exchange happens; auth guard in _layout.tsx handles navigation.
 * Safety timeout redirects to index if auth doesn't complete within AUTH_TIMEOUT_MS.
 */
const AUTH_TIMEOUT_MS = 15_000;

export default function GoogleAuthCallback() {
  const { loggedIn } = useAppSlice();
  const [timedOut, setTimedOut] = useState(false);

  // Safety timeout: redirect to index if auth doesn't complete
  useEffect(() => {
    const timer = setTimeout(() => {
      setTimedOut(true);
    }, AUTH_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  // If timed out without login, fall back to index (which will show login)
  if (timedOut && !loggedIn) {
    return <Redirect href="/" />;
  }

  // Centralized auth guard in _layout.tsx will handle redirect when loggedIn=true
  return (
    <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
      <Spinner size="large" color="$primary" />
      <Text marginTop="$3" color="$colorPress" fontSize={14}>
        Memproses login...
      </Text>
    </YStack>
  );
}
