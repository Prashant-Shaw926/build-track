import { QueryClient } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

import { toApiError } from '@/lib/api/client';
import { storage, type KeyValueStorage } from '@/lib/storage/storage';

export const QUERY_STALE_TIME_MS = 60_000;
export const QUERY_GC_TIME_MS = 24 * 60 * 60 * 1000;
export const QUERY_PERSIST_MAX_AGE_MS = QUERY_GC_TIME_MS;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: QUERY_STALE_TIME_MS,
        gcTime: QUERY_GC_TIME_MS,
        networkMode: 'always',
        retry: (failureCount, error) => !toApiError(error).isNetworkError && failureCount < 2,
        refetchOnReconnect: true,
        refetchOnWindowFocus: false,
      },
    },
  });
}

export function createQueryPersister(keyValueStorage: KeyValueStorage = storage) {
  return createSyncStoragePersister({
    storage: keyValueStorage,
    throttleTime: 0,
  });
}

export const queryClient = createQueryClient();
export const queryPersister = createQueryPersister();
