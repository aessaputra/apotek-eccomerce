import { useCallback, useEffect, useRef, useState } from 'react';
import { Redirect } from 'expo-router';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { YStack, Spinner, Text } from 'tamagui';
import { createSessionFromUrl } from '@/services/auth.service';
import { useAppSlice } from '@/slices';

const AUTH_TIMEOUT_MS = 15_000;
const OAUTH_CALLBACK_PARAM_PATTERN = /[?&](code|error|error_code)=/;
const OAUTH_TIMEOUT_MESSAGE = 'Login Google membutuhkan waktu terlalu lama. Silakan coba lagi.';

export default function GoogleAuthCallback() {
  const { authPhase } = useAppSlice();
  const [timedOut, setTimedOut] = useState(false);
  const [exchangeError, setExchangeError] = useState<string | null>(null);
  const [exchangeSucceeded, setExchangeSucceeded] = useState(false);
  const [processing, setProcessing] = useState(false);
  const callbackUrl = Linking.useLinkingURL();
  const lastProcessedUrlRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasOAuthCallbackParams = Boolean(
    callbackUrl && OAUTH_CALLBACK_PARAM_PATTERN.test(callbackUrl),
  );

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
      setExchangeSucceeded(false);
      startTimeout();

      if (__DEV__) {
        console.log('[google-auth] Processing callback URL:', url);
      }

      const { error } = await createSessionFromUrl(url);

      if (__DEV__) {
        console.log('[google-auth] Exchange result, error:', error ?? null);
      }

      setProcessing(false);

      if (error) {
        setExchangeError(error.message);
      } else {
        setExchangeSucceeded(true);
      }
    },
    [startTimeout],
  );

  useEffect(() => {
    if (Platform.OS !== 'android' || !callbackUrl) return;
    if (lastProcessedUrlRef.current === callbackUrl) return;
    if (!OAUTH_CALLBACK_PARAM_PATTERN.test(callbackUrl)) return;

    lastProcessedUrlRef.current = callbackUrl;
    void processCallbackUrl(callbackUrl);
  }, [callbackUrl, processCallbackUrl]);

  if (authPhase === 'authenticated') {
    return <Redirect href="/home" />;
  }

  if (authPhase === 'requires-mfa') {
    return <Redirect href="/(auth)/verify-mfa" />;
  }

  const displayedError = exchangeError ?? (timedOut ? OAUTH_TIMEOUT_MESSAGE : null);

  if (displayedError) {
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
          {displayedError}
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

  if (authPhase === 'signed-out' && !processing && !hasOAuthCallbackParams && !exchangeSucceeded) {
    return <Redirect href="/(auth)/login" />;
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
