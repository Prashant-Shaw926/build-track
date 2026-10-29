import type {
  ApiTransaction,
  TransactionChange,
} from '@/features/transactions/types/transaction.types';

function isDeletedChange(change: TransactionChange): change is TransactionChange & { deleted: true } {
  return 'deleted' in change && change.deleted === true;
}

function timestampMs(value: string | undefined): number | null {
  if (value === undefined || value.length === 0) {
    return null;
  }

  const parsed = Date.parse(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function storedUpdatedAt(item: ApiTransaction | undefined): string | undefined {
  if (item === undefined || !('updated_at' in item) || typeof item.updated_at !== 'string') {
    return undefined;
  }

  return item.updated_at;
}

function isStrictlyNewer(incomingUpdatedAt: string, stored: ApiTransaction | undefined): boolean {
  const incomingMs = timestampMs(incomingUpdatedAt);

  if (incomingMs === null) {
    return false;
  }

  const storedMs = timestampMs(storedUpdatedAt(stored));

  if (storedMs === null) {
    return true;
  }

  return incomingMs > storedMs;
}

function occurredAtMs(item: ApiTransaction): number {
  if ('occurred_at' in item && typeof item.occurred_at === 'string') {
    const parsed = Date.parse(item.occurred_at);

    return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
  }

  if ('txn_time' in item && typeof item.txn_time === 'number' && Number.isFinite(item.txn_time)) {
    return item.txn_time * 1000;
  }

  return Number.NEGATIVE_INFINITY;
}

function findNewestFirstIndex(items: readonly ApiTransaction[], occurredMs: number): number {
  const index = items.findIndex((item) => occurredAtMs(item) < occurredMs);

  return index === -1 ? items.length : index;
}

export function applyTransactionChanges(
  items: readonly ApiTransaction[],
  changes: readonly TransactionChange[],
): ApiTransaction[] {
  const next = items.slice();
  const indexById = new Map<string, number>();

  next.forEach((item, index) => {
    indexById.set(item.id, index);
  });

  const reindexFrom = (start: number) => {
    for (let index = start; index < next.length; index += 1) {
      const item = next[index];

      if (item !== undefined) {
        indexById.set(item.id, index);
      }
    }
  };

  for (const change of changes) {
    const currentIndex = indexById.get(change.id);
    const current = currentIndex === undefined ? undefined : next[currentIndex];

    if (!isStrictlyNewer(change.updated_at, current)) {
      continue;
    }

    if (isDeletedChange(change)) {
      if (currentIndex === undefined) {
        continue;
      }

      next.splice(currentIndex, 1);
      indexById.delete(change.id);
      reindexFrom(currentIndex);
      continue;
    }

    if (currentIndex !== undefined) {
      next[currentIndex] = change;
      continue;
    }

    const insertAt = findNewestFirstIndex(next, occurredAtMs(change));
    next.splice(insertAt, 0, change);
    reindexFrom(insertAt);
  }

  return next;
}
