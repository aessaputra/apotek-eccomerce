import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

type ExpoDeviceModule = typeof import('expo-device');
type ExpoNotificationsModule = typeof import('expo-notifications');
type ExpoNotificationMethodName =
  | 'addNotificationResponseReceivedListener'
  | 'addPushTokenListener'
  | 'getExpoPushTokenAsync'
  | 'getLastNotificationResponseAsync'
  | 'getPermissionsAsync'
  | 'requestPermissionsAsync'
  | 'setNotificationChannelAsync'
  | 'setNotificationHandler';

type NotificationExpoExtra = {
  eas?: {
    projectId?: string;
  };
};

export const DEFAULT_ANDROID_NOTIFICATION_CHANNEL_ID = 'default';

let hasConfiguredForegroundNotificationHandler = false;
let hasBootstrappedNotifications = false;
let bootstrapNotificationsPromise: Promise<void> | null = null;
let expoDeviceModulePromise: Promise<ExpoDeviceModule | null> | null = null;
let expoNotificationsModulePromise: Promise<ExpoNotificationsModule> | null = null;

function isExpoGoAndroidRuntime(): boolean {
  return (
    Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  );
}

function hasNotificationMethods(
  Notifications: ExpoNotificationsModule,
  methodNames: ExpoNotificationMethodName[],
): boolean {
  return methodNames.every(methodName => typeof Notifications[methodName] === 'function');
}

async function getExpoDeviceModuleAsync(): Promise<ExpoDeviceModule | null> {
  if (!hasNativeNotificationSupport()) {
    return null;
  }

  expoDeviceModulePromise ??= import('expo-device').catch(() => null);

  return expoDeviceModulePromise;
}

export function resolveNotificationProjectId(): string | null {
  const expoConfigProjectId =
    (Constants.expoConfig?.extra as NotificationExpoExtra | undefined)?.eas?.projectId ?? null;

  return expoConfigProjectId ?? Constants.easConfig?.projectId ?? null;
}

export function hasNativeNotificationSupport(): boolean {
  return Platform.OS === 'android' || Platform.OS === 'ios';
}

export function hasExpoPushTokenRuntimeSupport(): boolean {
  return hasNativeNotificationSupport() && !isExpoGoAndroidRuntime();
}

export async function getExpoNotificationsModuleAsync(): Promise<ExpoNotificationsModule> {
  if (!hasNativeNotificationSupport()) {
    throw new Error('Expo notifications are only available on native platforms.');
  }

  expoNotificationsModulePromise ??= import('expo-notifications').catch(error => {
    expoNotificationsModulePromise = null;
    throw error instanceof Error
      ? new Error(`Expo notifications module is unavailable: ${error.message}`)
      : new Error('Expo notifications module is unavailable.');
  });

  return expoNotificationsModulePromise;
}

export async function hasExpoNotificationMethodsAsync(
  methodNames: ExpoNotificationMethodName[],
): Promise<boolean> {
  if (!hasNativeNotificationSupport()) {
    return false;
  }

  try {
    const Notifications = await getExpoNotificationsModuleAsync();
    return hasNotificationMethods(Notifications, methodNames);
  } catch {
    return false;
  }
}

export async function isPhysicalNotificationDeviceAsync(): Promise<boolean> {
  const Device = await getExpoDeviceModuleAsync();

  return Boolean(Device?.isDevice);
}

export async function bootstrapAndroidNotificationChannelAsync(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  const Notifications = await getExpoNotificationsModuleAsync();

  if (!hasNotificationMethods(Notifications, ['setNotificationChannelAsync'])) {
    throw new Error('Expo notification channel API is unavailable in this runtime.');
  }

  await Notifications.setNotificationChannelAsync(DEFAULT_ANDROID_NOTIFICATION_CHANNEL_ID, {
    name: 'Default',
    importance: Notifications.AndroidImportance.MAX,
    showBadge: true,
  });
}

export async function configureForegroundNotificationHandler(): Promise<void> {
  if (!hasNativeNotificationSupport() || hasConfiguredForegroundNotificationHandler) {
    return;
  }

  const Notifications = await getExpoNotificationsModuleAsync();

  if (!hasNotificationMethods(Notifications, ['setNotificationHandler'])) {
    throw new Error('Expo foreground notification handler API is unavailable in this runtime.');
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  hasConfiguredForegroundNotificationHandler = true;
}

export async function bootstrapNotificationsAsync(): Promise<void> {
  if (!hasNativeNotificationSupport() || hasBootstrappedNotifications) {
    return;
  }

  if (bootstrapNotificationsPromise) {
    await bootstrapNotificationsPromise;
    return;
  }

  bootstrapNotificationsPromise = (async () => {
    await configureForegroundNotificationHandler();
    await bootstrapAndroidNotificationChannelAsync();
    hasBootstrappedNotifications = true;
  })();

  try {
    await bootstrapNotificationsPromise;
  } finally {
    bootstrapNotificationsPromise = null;
  }
}
