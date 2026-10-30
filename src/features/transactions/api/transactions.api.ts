import { ApiError, apiErrorMessage, apiGet, toApiError } from '@/lib/api/client';
import { applyTransactionChanges } from '@/features/transactions/utils/apply-transaction-changes';
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
}

function hasCursor(cursor: string | null | undefined): cursor is string {
  return typeof cursor === 'string' && cursor.length > 0;
}

export async function fetchTransactionsPage(
  params: TransactionPageParams,
): Promise<TransactionPage> {
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

  const seenCursors = new Set<string>();
  const seenIds = new Set<string>();
  const items: ApiTransaction[] = [];
  let cursor: string | null = null;
  let syncToken: string | null = null;

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
    syncToken = page.sync_token.length > 0 ? page.sync_token : syncToken;

    for (const item of page.items) {
      if (seenIds.has(item.id)) {
        continue;
      }

      seenIds.add(item.id);
      items.push(item);
    }

    if (!hasCursor(page.next_cursor)) {
      return { items, syncToken };
    }

    if (seenCursors.has(page.next_cursor)) {
      throw new ApiError(REPEATED_CURSOR_MESSAGE, null, false);
    }

    cursor = page.next_cursor;
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

export function readTransactionSnapshot(data: unknown): TransactionSnapshot | null {
  if (data === undefined || data === null) {
    return null;
  }

  if (Array.isArray(data)) {
    return {
      items: data as ApiTransaction[],
      syncToken: null,
      changesSynced: false,
      changesErrorMessage: null,
    };
  }

  return isTransactionSnapshot(data) ? data : null;
}

async function applyRemoteChanges(previous: TransactionSnapshot): Promise<TransactionSnapshot> {
  if (previous.syncToken === null || previous.syncToken.length === 0) {
    throw new ApiError('Sync token expired', 410, false);
  }

  const changes = await fetchTransactionChanges(previous.syncToken);

  return {
    items: applyTransactionChanges(previous.items, changes.items),
    syncToken: changes.syncToken,
    changesSynced: true,
    changesErrorMessage: null,
  };
}

export async function loadTransactionSnapshot(previous: TransactionSnapshot | null): Promise<TransactionSnapshot> {
  if (previous?.syncToken) {
    try {
      return await applyRemoteChanges(previous);
    } catch (error) {
      const apiError = toApiError(error);

      if (apiError.status !== 410) {
        throw apiError;
      }
    }
  }

  const full = await fetchAllTransactionsWithToken();

  if (full.syncToken === null || full.syncToken.length === 0) {
    return {
      items: full.items,
      syncToken: full.syncToken,
      changesSynced: false,
      changesErrorMessage: null,
    };
  }

  try {
    const changes = await fetchTransactionChanges(full.syncToken);

    return {
      items: applyTransactionChanges(full.items, changes.items),
      syncToken: changes.syncToken,
      changesSynced: true,
      changesErrorMessage: null,
    };
  } catch (error) {
    return {
      items: full.items,
      syncToken: full.syncToken,
      changesSynced: false,
      changesErrorMessage: apiErrorMessage(error),
    };
  }
}
