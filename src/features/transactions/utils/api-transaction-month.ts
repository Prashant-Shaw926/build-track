import type { ApiTransaction } from '@/features/transactions/types/transaction.types';
import { indiaMonthKey } from '@/features/transactions/utils/month-totals';

export function apiTransactionOccurredAtMs(item: ApiTransaction): number | null {
  if ('occurred_at' in item && typeof item.occurred_at === 'string') {
    const parsed = Date.parse(item.occurred_at);

    return Number.isFinite(parsed) ? parsed : null;
  }

  if ('txn_time' in item && typeof item.txn_time === 'number' && Number.isFinite(item.txn_time)) {
    return item.txn_time * 1000;
  }

  return null;
}

export function apiTransactionIndiaMonthKey(item: ApiTransaction): string | null {
  const occurredAtMs = apiTransactionOccurredAtMs(item);

  if (occurredAtMs === null) {
    return null;
  }

  return indiaMonthKey(occurredAtMs);
}

/** Newest-first items: a month is ready once a strictly older month appears, or the history is complete. */
export function computeReadyMonths(
  items: readonly ApiTransaction[],
  historyComplete: boolean,
): string[] {
  const ready: string[] = [];
  let current: string | null = null;

  for (const item of items) {
    const month = apiTransactionIndiaMonthKey(item);

    if (month === null) {
      continue;
    }

    if (current === null) {
      current = month;
      continue;
    }

    if (month < current) {
      if (!ready.includes(current)) {
        ready.push(current);
      }

      current = month;
    }
  }

  if (historyComplete && current !== null && !ready.includes(current)) {
    ready.push(current);
  }

  return ready.sort();
}

export function isMonthReady(readyMonths: readonly string[], month: string | null): boolean {
  if (month === null) {
    return false;
  }

  return readyMonths.includes(month);
}
