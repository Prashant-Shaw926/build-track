import { createStorage } from './create-storage';
import { type KeyValueStorage, StorageUnavailableError } from './key-value-storage';

export { StorageUnavailableError, type KeyValueStorage };

let instance: KeyValueStorage | null = null;

function getStorage(): KeyValueStorage {
  if (instance === null) {
    instance = createStorage();
  }

  return instance;
}

export const storage: KeyValueStorage = {
  getItem: (key) => getStorage().getItem(key),
  setItem: (key, value) => {
    getStorage().setItem(key, value);
  },
  removeItem: (key) => {
    getStorage().removeItem(key);
  },
};
