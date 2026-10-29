import { createMMKV } from 'react-native-mmkv';

import { StorageUnavailableError, type KeyValueStorage } from '@/lib/storage/storage';

const STORAGE_ID = 'build-track';

export function createStorage(): KeyValueStorage {
  let mmkv;

  try {
    mmkv = createMMKV({ id: STORAGE_ID });
  } catch (error) {
    throw new StorageUnavailableError('MMKV is unavailable. Use an Expo development build.', {
      cause: error,
    });
  }

  return {
    getItem: (key) => mmkv.getString(key) ?? null,
    setItem: (key, value) => {
      mmkv.set(key, value);
    },
    removeItem: (key) => {
      mmkv.remove(key);
    },
  };
}
