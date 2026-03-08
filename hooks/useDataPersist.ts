import { useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export enum DataPersistKeys {
  USER = 'USER',
  // add more keys here
}

export function useDataPersist() {
  /**
   * set persistent data
   * @param key
   * @param data
   * @returns
   */
  const setPersistData = useCallback(async <T>(key: DataPersistKeys, data: T): Promise<boolean> => {
    const jsonData = JSON.stringify(data);
    await AsyncStorage.setItem(key, jsonData);
    return true;
  }, []);

  /**
   * get persistent data
   * @param key
   * @returns
   */
  const getPersistData = useCallback(async <T>(key: DataPersistKeys): Promise<T | undefined> => {
    const res = await AsyncStorage.getItem(key);
    return res ? JSON.parse(res) : undefined;
  }, []);

  /**
   * remove persistent data by key
   * @param key
   * @returns
   */
  const removePersistData = useCallback(async (key: DataPersistKeys): Promise<boolean> => {
    await AsyncStorage.removeItem(key);
    return true;
  }, []);

  /**
   * remove all persistent data
   * @returns
   */
  const removeAllPersistData = useCallback(async () => {
    return Promise.all(Object.values(DataPersistKeys).map(value => AsyncStorage.removeItem(value)));
  }, []);

  return useMemo(
    () => ({ setPersistData, getPersistData, removePersistData, removeAllPersistData }),
    [setPersistData, getPersistData, removePersistData, removeAllPersistData],
  );
}
