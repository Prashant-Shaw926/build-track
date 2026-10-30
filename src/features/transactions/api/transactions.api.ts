import { ApiError, apiErrorMessage, apiGet, toApiError } from '@/lib/api/client';
import { applyTransactionChanges } from '@/features/transactions/utils/apply-transaction-changes';
import { computeReadyMonths } from '@/features/transactions/utils/api-transaction-month';
import type {
  ApiTransaction,
  TransactionChange,
  TransactionChangesPage,
  TransactionPage,
  TransactionPageParams,
} from '@/features/transactions/types/transaction.types';

import { requireApiUrl } from './require-api-url';

export const TRANSACTION_PAGE_LIMIT = 50;

const REPEATED_CURSOR_MESSAGE = 'Transaction pagination returned a cursor that was already used.';

export interface TransactionSnapshot {
  items: ApiTransaction[];
  syncToken: string | null;
  changesSynced: boolean;
  changesErrorMessage: string | null;
  historyComplete: boolean;
  resumeCursor: string | null;
  readyMonths: string[];
}

export interface LoadTransactionSnapshotOptions {
  onProgress?: (snapshot: TransactionSnapshot) => void;
}

function hasCursor(cursor: string | null | undefined): cursor is string {
  return typeof cursor === 'string' && cursor.length > 0;
}

function buildSnapshot(input: {
  items: ApiTransaction[];
  syncToken: string | null;
  changesSynced: boolean;
  changesErrorMessage: string | null;
  historyComplete: boolean;
  resumeCursor: string | null;
}): TransactionSnapshot {
  return {
    ...input,
    readyMonths: computeReadyMonths(input.items, input.historyComplete),
  };
}

export function fetchTransactionsPage(params: TransactionPageParams): Promise<TransactionPage> {
  requireApiUrl();

  const query: { limit: number; cursor?: string } = { limit: params.limit };

  if (hasCursor(params.cursor)) {
    query.cursor = params.cursor;
  }

  return apiGet<TransactionPage>('/v1/transactions', { params: query });
}

export async function fetchAllTransactions(): Promise<ApiTransaction[]> {
  const snapshot = await fetchAllTransactionsWithToken();

  return snapshot.items;
}

export async function fetchAllTransactionsWithToken(): Promise<Pick<TransactionSnapshot, 'items' | 'syncToken'>> {
  requireApiUrl();

  const paged = await pageAllTransactions({ items: [], cursor: null });

  return { items: paged.items, syncToken: paged.listSyncToken };
}

interface PageAllState {
  items: ApiTransaction[];
  cursor: string | null;
}

interface PageAllResult {
  items: ApiTransaction[];
  listSyncToken: string | null;
}

async function pageAllTransactions(
  start: PageAllState,
  onPage?: (state: {
    items: ApiTransaction[];
    listSyncToken: string | null;
    nextCursor: string | null;
    historyComplete: boolean;
  }) => void,
): Promise<PageAllResult> {
  const seenCursors = new Set<string>();
  const seenIds = new Set<string>();
  const items: ApiTransaction[] = [];
  let cursor = start.cursor;
  let listSyncToken: string | null = null;

  for (const item of start.items) {
    if (seenIds.has(item.id)) {
      continue;
    }

    seenIds.add(item.id);
    items.push(item);
  }

  for (;;) {
    if (hasCursor(cursor)) {
      if (seenCursors.has(cursor)) {
        throw new ApiError(REPEATED_CURSOR_MESSAGE, null, false);
      }

      seenCursors.add(cursor);
    }

    const page = await fetchTransactionsPage({
      limit: TRANSACTION_PAGE_LIMIT,
      cursor,
    });
    listSyncToken = page.sync_token.length > 0 ? page.sync_token : listSyncToken;

    for (const item of page.items) {
      if (seenIds.has(item.id)) {
        continue;
      }

      seenIds.add(item.id);
      items.push(item);
    }

    const nextCursor = hasCursor(page.next_cursor) ? page.next_cursor : null;

    if (nextCursor !== null && seenCursors.has(nextCursor)) {
      throw new ApiError(REPEATED_CURSOR_MESSAGE, null, false);
    }

    const historyComplete = nextCursor === null;

    onPage?.({
      items: [...items],
      listSyncToken,
      nextCursor,
      historyComplete,
    });

    if (historyComplete) {
      return { items, listSyncToken };
    }

    cursor = nextCursor;
  }
}

async function fetchTransactionsProgressive(
  previous: TransactionSnapshot | null,
  onProgress?: (snapshot: TransactionSnapshot) => void,
): Promise<TransactionSnapshot> {
  requireApiUrl();

  let publishedReadyMonth = previous !== null && previous.readyMonths.length > 0;

  const paged = await pageAllTransactions(
    {
      items: previous !== null && !previous.historyComplete ? previous.items : [],
      cursor: previous !== null && !previous.historyComplete ? previous.resumeCursor : null,
    },
    ({ items, nextCursor, historyComplete, listSyncToken }) => {
      if (historyComplete) {
        // Unlock every month as soon as paging finishes, even if changes are cancelled later.
        onProgress?.(
          buildSnapshot({
            items,
            syncToken: listSyncToken,
            changesSynced: false,
            changesErrorMessage: null,
            historyComplete: true,
            resumeCursor: null,
          }),
        );
        return;
      }

      const partial = buildSnapshot({
        items,
        syncToken: null,
        changesSynced: false,
        changesErrorMessage: null,
        historyComplete: false,
        resumeCursor: nextCursor,
      });

      if (partial.readyMonths.length > 0) {
        publishedReadyMonth = true;
        onProgress?.(partial);
      } else if (publishedReadyMonth) {
        onProgress?.(partial);
      }
    },
  );

  return finalizeFullList(paged.items, paged.listSyncToken, onProgress);
}

async function finalizeFullList(
  items: ApiTransaction[],
  listSyncToken: string | null,
  onProgress?: (snapshot: TransactionSnapshot) => void,
): Promise<TransactionSnapshot> {
  const completeWithoutChanges = buildSnapshot({
    items,
    syncToken: listSyncToken,
    changesSynced: false,
    changesErrorMessage: null,
    historyComplete: true,
    resumeCursor: null,
  });

  onProgress?.(completeWithoutChanges);

  if (listSyncToken === null || listSyncToken.length === 0) {
    return completeWithoutChanges;
  }

  try {
    const changes = await fetchTransactionChanges(listSyncToken);
    const merged = buildSnapshot({
      items: applyTransactionChanges(items, changes.items),
      syncToken: changes.syncToken,
      changesSynced: true,
      changesErrorMessage: null,
      historyComplete: true,
      resumeCursor: null,
    });
    onProgress?.(merged);

    return merged;
  } catch (error) {
    const failedChanges = buildSnapshot({
      items,
      syncToken: listSyncToken,
      changesSynced: false,
      changesErrorMessage: apiErrorMessage(error),
      historyComplete: true,
      resumeCursor: null,
    });
    onProgress?.(failedChanges);

    return failedChanges;
  }
}

async function fetchChangesPage(since: string, cursor: string | null): Promise<TransactionChangesPage> {
  const params: { since: string; limit: number; cursor?: string } = {
    since,
    limit: TRANSACTION_PAGE_LIMIT,
  };

  if (hasCursor(cursor)) {
    params.cursor = cursor;
  }

  return apiGet<TransactionChangesPage>('/v1/transactions/changes', { params });
}

export async function fetchTransactionChanges(since: string): Promise<{ items: TransactionChange[]; syncToken: string }> {
  requireApiUrl();

  const seenCursors = new Set<string>();
  const items: TransactionChange[] = [];
  let cursor: string | null = null;
  let syncToken = since;

  for (;;) {
    const page = await fetchChangesPage(since, cursor);

    items.push(...page.items);

    if (page.sync_token.length > 0) {
      syncToken = page.sync_token;
    }

    if (!hasCursor(page.next_cursor)) {
      return { items, syncToken };
    }

    if (seenCursors.has(page.next_cursor)) {
      throw new ApiError(REPEATED_CURSOR_MESSAGE, null, false);
    }

    seenCursors.add(page.next_cursor);
    cursor = page.next_cursor;
  }
}

function hasReadyMonths(value: unknown): value is { readyMonths: string[] } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'readyMonths' in value &&
    Array.isArray(value.readyMonths) &&
    value.readyMonths.every((month) => typeof month === 'string')
  );
}

function isTransactionSnapshot(data: unknown): data is TransactionSnapshot {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  if (!('items' in data) || !Array.isArray(data.items)) {
    return false;
  }

  if (!('syncToken' in data) || (data.syncToken !== null && typeof data.syncToken !== 'string')) {
    return false;
  }

  if (!('changesSynced' in data) || typeof data.changesSynced !== 'boolean') {
    return false;
  }

  if (!('changesErrorMessage' in data) || (data.changesErrorMessage !== null && typeof data.changesErrorMessage !== 'string')) {
    return false;
  }

  return true;
}

function migrateSnapshot(data: TransactionSnapshot | Omit<TransactionSnapshot, 'historyComplete' | 'resumeCursor' | 'readyMonths'>): TransactionSnapshot {
  const historyComplete =
    'historyComplete' in data && typeof data.historyComplete === 'boolean'
      ? data.historyComplete
      : true;
  const resumeCursor =
    'resumeCursor' in data && (data.resumeCursor === null || typeof data.resumeCursor === 'string')
      ? data.resumeCursor
      : null;
  // Always recompute when history is complete so a stale partial readyMonths list cannot stick.
  const readyMonths = historyComplete
    ? computeReadyMonths(data.items, true)
    : hasReadyMonths(data)
      ? data.readyMonths
      : computeReadyMonths(data.items, false);

  return {
    items: data.items,
    syncToken: data.syncToken,
    changesSynced: data.changesSynced,
    changesErrorMessage: data.changesErrorMessage,
    historyComplete,
    resumeCursor,
    readyMonths,
  };
}

export function readTransactionSnapshot(data: unknown): TransactionSnapshot | null {
  if (data === undefined || data === null) {
    return null;
  }

  if (Array.isArray(data)) {
    return buildSnapshot({
      items: data as ApiTransaction[],
      syncToken: null,
      changesSynced: false,
      changesErrorMessage: null,
      historyComplete: true,
      resumeCursor: null,
    });
  }

  if (!isTransactionSnapshot(data)) {
    return null;
  }

  return migrateSnapshot(data);
}

async function applyRemoteChanges(previous: TransactionSnapshot): Promise<TransactionSnapshot> {
  if (previous.syncToken === null || previous.syncToken.length === 0) {
    throw new ApiError('Sync token expired', 410, false);
  }

  const changes = await fetchTransactionChanges(previous.syncToken);

  return buildSnapshot({
    items: applyTransactionChanges(previous.items, changes.items),
    syncToken: changes.syncToken,
    changesSynced: true,
    changesErrorMessage: null,
    historyComplete: true,
    resumeCursor: null,
  });
}

export async function loadTransactionSnapshot(
  previous: TransactionSnapshot | null,
  options: LoadTransactionSnapshotOptions = {},
): Promise<TransactionSnapshot> {
  const onProgress = options.onProgress;

  if (previous?.historyComplete && previous.syncToken) {
    try {
      return await applyRemoteChanges(previous);
    } catch (error) {
      const apiError = toApiError(error);

      if (apiError.status !== 410) {
        throw apiError;
      }
    }
  }

  if (previous !== null && !previous.historyComplete) {
    return fetchTransactionsProgressive(previous, onProgress);
  }

  return fetchTransactionsProgressive(null, onProgress);
}
