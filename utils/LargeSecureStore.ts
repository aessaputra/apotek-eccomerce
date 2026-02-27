import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as aesjs from 'aes-js';
import 'react-native-get-random-values';

/**
 * Secure storage adapter for Supabase auth that handles values larger than
 * expo-secure-store's 2048-byte limit.
 *
 * Strategy: AES-256 key in SecureStore, encrypted data in AsyncStorage.
 * PKCE code_verifier bypasses AES — stored directly in SecureStore.
 *
 * All methods are wrapped in try/catch because GoTrueClient calls getItem
 * outside its own try/catch — thrown errors cause unhandled rejections.
 *
 * @see https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native
 */
export default class LargeSecureStore {
  /** Keys small enough for direct SecureStore storage (< 2048 bytes). */
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
      if (this._isSmallKey(key)) {
        return await SecureStore.getItemAsync(key);
      }

      const encrypted = await AsyncStorage.getItem(key);
      if (!encrypted) {
        return encrypted;
      }

      return await this._decrypt(key, encrypted);
    } catch (error) {
      if (__DEV__) console.warn('[LargeSecureStore] getItem error:', key, error);
      return null;
    }
  }

  async setItem(key: string, value: string) {
    try {
      if (this._isSmallKey(key)) {
        await SecureStore.setItemAsync(key, value);
        return;
      }

      const encrypted = await this._encrypt(key, value);
      await AsyncStorage.setItem(key, encrypted);
    } catch (error) {
      if (__DEV__) console.warn('[LargeSecureStore] setItem error:', key, error);
    }
  }

  async removeItem(key: string) {
    try {
      if (this._isSmallKey(key)) {
        await SecureStore.deleteItemAsync(key);
        return;
      }

      await AsyncStorage.removeItem(key);
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      if (__DEV__) console.warn('[LargeSecureStore] removeItem error:', key, error);
    }
  }
}
