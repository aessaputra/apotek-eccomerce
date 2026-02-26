import { useEffect, useState } from 'react';
import { Redirect, useRouter } from 'expo-router';
import { YStack, Spinner, Text } from 'tamagui';
import { useAppSlice } from '@/slices';

/**
 * Google OAuth deep-link callback handler.
 *
 * When native Google OAuth completes, the browser redirects to
 * `apotek-eccomerce://google-auth?code=...` (PKCE flow).
 * Expo Router resolves this to `/google-auth` — this route.
 *
 * Token extraction is handled by WebBrowser.openAuthSessionAsync
 * + createSessionFromUrl in auth.service.ts (runs in parallel).
 *
 * IMPORTANT: We do NOT redirect immediately to `/` because that triggers
 * index.tsx to check `loggedIn` while exchangeCodeForSession() is still
 * in flight — causing a premature redirect back to the login screen.
 *
 * Instead, we show a spinner and wait for AuthProvider to set loggedIn=true
 * (via onAuthStateChange → getCurrentUser), then redirect. A timeout
 * ensures we don't wait forever if auth fails.
 */
const AUTH_TIMEOUT_MS = 15_000;

export default function GoogleAuthCallback() {
  const router = useRouter();
  const { loggedIn, checked } = useAppSlice();
  const [timedOut, setTimedOut] = useState(false);

  // Redirect to home when AuthProvider confirms login
  useEffect(() => {
    if (checked && loggedIn) {
      router.replace('/(main)/(tabs)');
    }
  }, [checked, loggedIn, router]);

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

  return (
    <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
      <Spinner size="large" color="$primary" />
      <Text marginTop="$3" color="$colorPress" fontSize={14}>
        Memproses login...
      </Text>
    </YStack>
  );
}
