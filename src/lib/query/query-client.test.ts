import {
  persistQueryClientRestore,
  persistQueryClientSave,
} from '@tanstack/react-query-persist-client';

import {
  QUERY_PERSIST_MAX_AGE_MS,
  createQueryClient,
  createQueryPersister,
} from '@/lib/query/query-client';
import type { KeyValueStorage } from '@/lib/storage/storage';

jest.mock('react-native-mmkv', () => ({
  createMMKV: () => {
    throw new Error('MMKV should not be created for the in-memory restore test');
  },
}));

jest.mock('react-native-nitro-modules', () => ({}));

function createMemoryStorage(): KeyValueStorage {
  const values = new Map<string, string>();

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
}

describe('query cache persistence', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('restores a saved query into a new client', async () => {
    const memory = createMemoryStorage();
    const persister = createQueryPersister(memory);
    const original = createQueryClient();
    original.setQueryData(['sample'], { value: 1 });

    await persistQueryClientSave({
      queryClient: original,
      persister,
    });
    await jest.runOnlyPendingTimersAsync();

    const restored = createQueryClient();
    await persistQueryClientRestore({
      queryClient: restored,
      persister,
      maxAge: QUERY_PERSIST_MAX_AGE_MS,
    });

    expect(restored.getQueryData(['sample'])).toEqual({ value: 1 });
  });
});
