import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as aesjs from 'aes-js';
import 'react-native-get-random-values';

/**
 * Secure storage adapter for Supabase auth that handles values larger than
 * expo-secure-store's 2048-byte limit.
 *
 * Strategy: AES-256 encryption key (64 hex chars) stored in SecureStore,
 * encrypted data stored in AsyncStorage (no size limit).
 *
 * PKCE code_verifier (~60-100 bytes) bypasses AES and goes directly to
 * SecureStore — avoids decrypt failures that silently break exchangeCodeForSession().
 *
 * All methods are wrapped in try/catch because GoTrueClient's _exchangeCodeForSession
 * calls getItem OUTSIDE its own try/catch — any thrown error causes an unhandled
 * promise rejection that React Native silently swallows.
 *
 * Recommended by Supabase official docs:
 * @see https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native
 */
export default class LargeSecureStore {
  /**
   * Keys that are small enough to fit directly in SecureStore (< 2048 bytes).
   * These bypass AES encryption to avoid decrypt failures on app resume.
   */
  private _isSmallKey(key: string): boolean {
    return key.endsWith('-code-verifier');
  }

  private async _encrypt(key: string, value: string) {
    const encryptionKey = crypto.getRandomValues(new Uint8Array(256 / 8));

    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
    const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value));

    await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(encryptionKey));

    return aesjs.utils.hex.fromBytes(encryptedBytes);
  }

  private async _decrypt(key: string, value: string) {
    const encryptionKeyHex = await SecureStore.getItemAsync(key);
    if (!encryptionKeyHex) {
      return encryptionKeyHex;
    }

    const cipher = new aesjs.ModeOfOperation.ctr(
      aesjs.utils.hex.toBytes(encryptionKeyHex),
      new aesjs.Counter(1),
    );
    const decryptedBytes = cipher.decrypt(aesjs.utils.hex.toBytes(value));

    return aesjs.utils.utf8.fromBytes(decryptedBytes);
  }

  async getItem(key: string) {
    try {
      // PKCE code_verifier: read directly from SecureStore (no AES needed)
      if (this._isSmallKey(key)) {
        return await SecureStore.getItemAsync(key);
      }

      const encrypted = await AsyncStorage.getItem(key);
      if (!encrypted) {
        return encrypted;
      }

      return await this._decrypt(key, encrypted);
    } catch (error) {
      console.warn('[LargeSecureStore] getItem error:', key, error);
      return null;
    }
  }

  async setItem(key: string, value: string) {
    try {
      // PKCE code_verifier: write directly to SecureStore (no AES needed)
      if (this._isSmallKey(key)) {
        await SecureStore.setItemAsync(key, value);
        return;
      }

      const encrypted = await this._encrypt(key, value);
      await AsyncStorage.setItem(key, encrypted);
    } catch (error) {
      console.warn('[LargeSecureStore] setItem error:', key, error);
    }
  }

  async removeItem(key: string) {
    try {
      // PKCE code_verifier: only in SecureStore
      if (this._isSmallKey(key)) {
        await SecureStore.deleteItemAsync(key);
        return;
      }

      await AsyncStorage.removeItem(key);
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.warn('[LargeSecureStore] removeItem error:', key, error);
    }
  }
}
