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
  async function setPersistData<T>(key: DataPersistKeys, data: T): Promise<boolean> {
    const jsonData = JSON.stringify(data);
    await AsyncStorage.setItem(key, jsonData);
    return true;
  }

  /**
   * get persistent data
   * @param key
   * @returns
   */
  async function getPersistData<T>(key: DataPersistKeys): Promise<T | undefined> {
    const res = await AsyncStorage.getItem(key);
    return res ? JSON.parse(res) : undefined;
  }

  /**
   * remove persistent data by key
   * @param key
   * @returns
   */
  async function removePersistData(key: DataPersistKeys): Promise<boolean> {
    await AsyncStorage.removeItem(key);
    return true;
  }

  /**
   * remove all persistent data
   * @returns
   */
  async function removeAllPersistData() {
    return Promise.all(Object.values(DataPersistKeys).map(value => AsyncStorage.removeItem(value)));
  }

  return { setPersistData, getPersistData, removePersistData, removeAllPersistData };
}
