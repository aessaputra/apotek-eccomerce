import { Platform } from 'react-native';

type ExpoClipboardModule = typeof import('expo-clipboard');

let expoClipboardModulePromise: Promise<ExpoClipboardModule | null> | null = null;

async function getExpoClipboardModuleAsync(): Promise<ExpoClipboardModule | null> {
  expoClipboardModulePromise ??= import('expo-clipboard').catch(() => null);

  return expoClipboardModulePromise;
}

async function copyTextToWebClipboard(text: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    return false;
  }

  await navigator.clipboard.writeText(text);
  return true;
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    return copyTextToWebClipboard(text);
  }

  const Clipboard = await getExpoClipboardModuleAsync();

  if (!Clipboard?.setStringAsync) {
    return false;
  }

  await Clipboard.setStringAsync(text);
  return true;
}
