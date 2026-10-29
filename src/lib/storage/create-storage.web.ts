import { StorageUnavailableError, type KeyValueStorage } from './key-value-storage';

export function createStorage(): KeyValueStorage {
  if (typeof localStorage === 'undefined') {
    throw new StorageUnavailableError('localStorage is unavailable.');
  }

  const webStorage = localStorage;

  return {
    getItem: (key) => webStorage.getItem(key),
    setItem: (key, value) => {
      webStorage.setItem(key, value);
    },
    removeItem: (key) => {
      webStorage.removeItem(key);
    },
  };
}
