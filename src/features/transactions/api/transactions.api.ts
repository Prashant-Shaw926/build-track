import { ApiError, apiClient } from '@/lib/api/client';
import type {
  Transaction,
  TransactionPage,
  TransactionPageParams,
} from '@/features/transactions/types/transaction.types';

import { requireApiUrl } from './require-api-url';

export const TRANSACTION_PAGE_LIMIT = 50;

const REPEATED_CURSOR_MESSAGE = 'Transaction pagination returned a cursor that was already used.';

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

  const response = await apiClient.get<TransactionPage>('/v1/transactions', {
    params: query,
  });

  return response.data;
}

export async function fetchAllTransactions(): Promise<Transaction[]> {
  requireApiUrl();

  const seenCursors = new Set<string>();
  const seenIds = new Set<string>();
  const items: Transaction[] = [];
  let cursor: string | null = null;

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

    for (const item of page.items) {
      if (seenIds.has(item.id)) {
        continue;
      }

      seenIds.add(item.id);
      items.push(item);
    }

    if (!hasCursor(page.next_cursor)) {
      return items;
    }

    if (seenCursors.has(page.next_cursor)) {
      throw new ApiError(REPEATED_CURSOR_MESSAGE, null, false);
    }

    cursor = page.next_cursor;
  }
}
