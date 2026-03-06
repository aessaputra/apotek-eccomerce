/**
 * WebCrypto API polyfill for React Native (native platforms only).
 *
 * Supabase PKCE requires `crypto.subtle.digest('SHA-256', data)` to generate
 * S256 code challenges. React Native doesn't provide `crypto.subtle`, causing
 * Supabase to fall back to "plain" method — which fails on code exchange.
 *
 * This module:
 * 1. Imports `react-native-get-random-values` → polyfills `crypto.getRandomValues`
 * 2. Polyfills `crypto.subtle.digest` → bridges to `expo-crypto.digest()` (native SHA-256)
 *
 * Must be imported BEFORE `@supabase/supabase-js` createClient.
 *
 * @see https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native
 */
import 'react-native-get-random-values';
import * as ExpoCrypto from 'expo-crypto';
import { Platform } from 'react-native';

// Only polyfill on native — web already has native WebCrypto
if (Platform.OS !== 'web') {
  const ALGORITHM_MAP: Record<string, ExpoCrypto.CryptoDigestAlgorithm> = {
    'SHA-1': ExpoCrypto.CryptoDigestAlgorithm.SHA1,
    'SHA-256': ExpoCrypto.CryptoDigestAlgorithm.SHA256,
    'SHA-384': ExpoCrypto.CryptoDigestAlgorithm.SHA384,
    'SHA-512': ExpoCrypto.CryptoDigestAlgorithm.SHA512,
  };

  /**
   * Polyfill for SubtleCrypto.digest() using expo-crypto native implementation.
   * Matches the W3C WebCrypto API signature that Supabase expects:
   * `crypto.subtle.digest(algorithm, data) → Promise<ArrayBuffer>`
   */
  async function subtleDigest(
    algorithm: string | { name: string },
    data: ArrayBuffer | ArrayBufferView,
  ): Promise<ArrayBuffer> {
    const algoName = typeof algorithm === 'string' ? algorithm : algorithm.name;
    const expoAlgo = ALGORITHM_MAP[algoName] ?? ExpoCrypto.CryptoDigestAlgorithm.SHA256;

    if (data instanceof ArrayBuffer) {
      return ExpoCrypto.digest(expoAlgo, data);
    }

    const view = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    const normalizedBuffer = view.slice().buffer;
    return ExpoCrypto.digest(expoAlgo, normalizedBuffer);
  }

  // react-native-get-random-values (imported above) ensures globalThis.crypto
  // exists with getRandomValues. We add crypto.subtle.digest on top of it.
  if (!globalThis.crypto) {
    Object.defineProperty(globalThis, 'crypto', {
      value: { subtle: { digest: subtleDigest } },
      writable: true,
      configurable: true,
    });
  } else if (!globalThis.crypto.subtle) {
    Object.defineProperty(globalThis.crypto, 'subtle', {
      value: { digest: subtleDigest },
      writable: true,
      configurable: true,
    });
  }

  // Diagnostic: Supabase also requires TextEncoder alongside crypto.subtle.
  // React Native 0.74+ (Hermes) includes TextEncoder natively.
  // If missing, PKCE silently falls back to 'plain' even with crypto.subtle polyfilled.
  if (__DEV__ && typeof globalThis.TextEncoder === 'undefined') {
    console.warn(
      '[cryptoPolyfill] TextEncoder is not available. ' +
        'Supabase PKCE will fall back to plain code challenge. ' +
        'Install text-encoding-polyfill if on RN < 0.74.',
    );
  }
}
