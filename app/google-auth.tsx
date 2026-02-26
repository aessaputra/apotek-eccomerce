import { useState, useEffect } from 'react';
import { Redirect } from 'expo-router';
import { YStack, Spinner, Text } from 'tamagui';
import { useAppSlice } from '@/slices';

/**
 * Google OAuth deep-link callback handler (landing pad).
 *
 * When native Google OAuth completes, the browser redirects to
 * `apotek-eccomerce://google-auth?code=...` (PKCE flow).
 * Expo Router resolves this to `/google-auth` — this route.
 *
 * Token extraction is handled by WebBrowser.openAuthSessionAsync
 * + createSessionFromUrl in auth.service.ts (runs in parallel).
 *
 * Navigation is handled by the centralized auth guard in _layout.tsx.
 * This component just shows a spinner while the token exchange happens.
 * A safety timeout redirects to index if auth doesn't complete.
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
