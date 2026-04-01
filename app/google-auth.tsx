import { useCallback, useEffect, useRef, useState } from 'react';
import { Redirect } from 'expo-router';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { YStack, Spinner, Text } from 'tamagui';
import { createSessionFromUrl } from '@/services/auth.service';
import { useAppSlice } from '@/slices';

const AUTH_TIMEOUT_MS = 15_000;

export default function GoogleAuthCallback() {
  const { loggedIn } = useAppSlice();
  const [timedOut, setTimedOut] = useState(false);
  const [exchangeError, setExchangeError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const callbackUrl = Linking.useLinkingURL();
  const lastProcessedUrlRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startTimeout = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setTimedOut(false);
    timerRef.current = setTimeout(() => setTimedOut(true), AUTH_TIMEOUT_MS);
  }, []);

  useEffect(() => {
    startTimeout();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [startTimeout]);

  const processCallbackUrl = useCallback(
    async (url: string) => {
      setProcessing(true);
      setExchangeError(null);
      startTimeout();

      if (__DEV__) {
        console.log('[google-auth] Processing callback URL:', url);
      }

      const { error } = await createSessionFromUrl(url);

      if (__DEV__) {
        console.log('[google-auth] Exchange result, error:', error ?? null);
      }

      if (error) {
        setExchangeError(error.message);
        setProcessing(false);
      }
      // On success: keep processing=true — AuthProvider.onAuthStateChange
      // will set loggedIn=true, and the auth guard handles navigation.
    },
    [startTimeout],
  );

  useEffect(() => {
    if (Platform.OS !== 'android' || !callbackUrl) return;
    if (lastProcessedUrlRef.current === callbackUrl) return;
    if (!/[?&](code|error|error_code)=/.test(callbackUrl)) return;

    lastProcessedUrlRef.current = callbackUrl;
    void processCallbackUrl(callbackUrl);
  }, [callbackUrl, processCallbackUrl]);

  if (timedOut && !loggedIn && !exchangeError && !processing) {
    return <Redirect href="/" />;
  }

  if (exchangeError && !loggedIn && !processing) {
    return (
      <YStack
        flex={1}
        justifyContent="center"
        alignItems="center"
        backgroundColor="$background"
        padding="$4">
        <Text fontSize={16} fontWeight="600" color="$color" textAlign="center">
          Login gagal
        </Text>
        <Text marginTop="$2" color="$colorPress" fontSize={14} textAlign="center">
          {exchangeError}
        </Text>
        <Text
          marginTop="$4"
          fontSize={14}
          fontWeight="600"
          color="$primary"
          onPress={() => {
            if (callbackUrl) {
              lastProcessedUrlRef.current = null;
              void processCallbackUrl(callbackUrl);
            }
          }}>
          Coba lagi
        </Text>
      </YStack>
    );
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
