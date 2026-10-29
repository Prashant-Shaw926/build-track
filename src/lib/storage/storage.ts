import { createStorage } from './create-storage';

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class StorageUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'StorageUnavailableError';
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

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
