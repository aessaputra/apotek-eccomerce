import { afterEach, describe, expect, it, jest } from '@jest/globals';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import {
  hasExpoPushTokenRuntimeSupport,
  hasNativeNotificationSupport,
} from '@/utils/notifications';

describe('notification runtime guards', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('treats Android Expo Go as unsupported for remote push token registration', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    jest.replaceProperty(Constants, 'executionEnvironment', ExecutionEnvironment.StoreClient);

    expect(hasNativeNotificationSupport()).toBe(true);
    expect(hasExpoPushTokenRuntimeSupport()).toBe(false);
  });

  it('keeps standalone Android builds eligible for remote push token registration', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    jest.replaceProperty(Constants, 'executionEnvironment', ExecutionEnvironment.Standalone);

    expect(hasNativeNotificationSupport()).toBe(true);
    expect(hasExpoPushTokenRuntimeSupport()).toBe(true);
  });

  it('treats web as unsupported for native notification modules', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    jest.replaceProperty(Constants, 'executionEnvironment', ExecutionEnvironment.Bare);

    expect(hasNativeNotificationSupport()).toBe(false);
    expect(hasExpoPushTokenRuntimeSupport()).toBe(false);
  });
});
