import type { NormalizedTransaction } from '@/features/transactions/types/normalized-transaction.types';

export type CategoryFilter =
  | { type: 'all' }
  | { type: 'category'; value: string }
  | { type: 'uncategorized' };

export type TrackSort = 'source' | 'newest' | 'oldest' | 'amount-desc' | 'amount-asc';

export type DirectionFilter = 'all' | 'debit' | 'credit';

export interface TrackListQuery {
  query: string;
  category: CategoryFilter;
  sort: TrackSort;
  direction: DirectionFilter;
}

export interface CategoryChoice {
  filter: CategoryFilter;
  label: string;
}

export const TRACK_SORT_OPTIONS: readonly { sort: TrackSort; label: string }[] = [
  { sort: 'source', label: 'Source order' },
  { sort: 'newest', label: 'Newest first' },
  { sort: 'oldest', label: 'Oldest first' },
  { sort: 'amount-desc', label: 'Highest amount' },
  { sort: 'amount-asc', label: 'Lowest amount' },
];

export const AMOUNT_SORT_NOTE =
  'Amount order uses the supplied rupee value. Transactions without one stay in their original order.';

interface IndexedTransaction {
  transaction: NormalizedTransaction;
  index: number;
}

function compareOrder(left: number, right: number): -1 | 0 | 1 {
  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
}

function compareIndex(left: IndexedTransaction, right: IndexedTransaction): -1 | 0 | 1 {
  return compareOrder(left.index, right.index);
}

function rupeeMinor(transaction: NormalizedTransaction): number | null {
  const value = transaction.inrAmountMinor;

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  return null;
}

function compareDate(left: IndexedTransaction, right: IndexedTransaction, newestFirst: boolean): -1 | 0 | 1 {
  const leftMs = left.transaction.occurredAtMs;
  const rightMs = right.transaction.occurredAtMs;
  const leftFinite = Number.isFinite(leftMs);
  const rightFinite = Number.isFinite(rightMs);

  if (leftFinite && rightFinite) {
    const compared = newestFirst ? compareOrder(rightMs, leftMs) : compareOrder(leftMs, rightMs);

    return compared === 0 ? compareIndex(left, right) : compared;
  }

  if (leftFinite !== rightFinite) {
    return leftFinite ? -1 : 1;
  }

  return compareIndex(left, right);
}

function compareAmount(left: IndexedTransaction, right: IndexedTransaction, highestFirst: boolean): -1 | 0 | 1 {
  const leftMinor = rupeeMinor(left.transaction);
  const rightMinor = rupeeMinor(right.transaction);

  if (leftMinor !== null && rightMinor !== null) {
    const compared = highestFirst ? compareOrder(rightMinor, leftMinor) : compareOrder(leftMinor, rightMinor);

    return compared === 0 ? compareIndex(left, right) : compared;
  }

  if ((leftMinor !== null) !== (rightMinor !== null)) {
    return leftMinor !== null ? -1 : 1;
  }

  return compareIndex(left, right);
}

function matchesMerchant(merchant: string, query: string): boolean {
  const trimmed = query.trim();

  if (trimmed.length === 0) {
    return true;
  }

  return merchant.toLowerCase().includes(trimmed.toLowerCase());
}

function matchesCategory(category: string | null, filter: CategoryFilter): boolean {
  if (filter.type === 'all') {
    return true;
  }

  if (filter.type === 'uncategorized') {
    return category === null;
  }

  return category === filter.value;
}

function matchesDirection(direction: NormalizedTransaction['direction'], filter: DirectionFilter): boolean {
  if (filter === 'all') {
    return true;
  }

  return direction === filter;
}

export function categoryFilterKey(filter: CategoryFilter): string {
  if (filter.type === 'all') {
    return 'all';
  }

  if (filter.type === 'uncategorized') {
    return 'uncategorized';
  }

  return `category:${filter.value}`;
}

export function categoryFilterLabel(filter: CategoryFilter): string {
  if (filter.type === 'all') {
    return 'All categories';
  }

  if (filter.type === 'uncategorized') {
    return 'No category';
  }

  return filter.value;
}

export function categoryChoices(transactions: readonly NormalizedTransaction[]): CategoryChoice[] {
  const names = new Set<string>();
  let uncategorized = false;

  for (const transaction of transactions) {
    if (transaction.category === null) {
      uncategorized = true;
    } else {
      names.add(transaction.category);
    }
  }

  const choices: CategoryChoice[] = [{ filter: { type: 'all' }, label: 'All categories' }];

  const orderedNames = [...names].sort((left, right) => {
    if (left < right) {
      return -1;
    }

    if (left > right) {
      return 1;
    }

    return 0;
  });

  for (const name of orderedNames) {
    choices.push({ filter: { type: 'category', value: name }, label: name });
  }

  if (uncategorized) {
    choices.push({ filter: { type: 'uncategorized' }, label: 'No category' });
  }

  return choices;
}

export function applyTrackList(
  transactions: readonly NormalizedTransaction[],
  query: TrackListQuery,
): NormalizedTransaction[] {
  const matched: IndexedTransaction[] = [];

  for (let index = 0; index < transactions.length; index += 1) {
    const transaction = transactions[index];

    if (transaction === undefined) {
      continue;
    }

    if (
      !matchesMerchant(transaction.merchant, query.query) ||
      !matchesCategory(transaction.category, query.category) ||
      !matchesDirection(transaction.direction, query.direction)
    ) {
      continue;
    }

    matched.push({ transaction, index });
  }

  if (query.sort !== 'source') {
    const sorted = matched.slice();

    sorted.sort((left, right) => {
      if (query.sort === 'newest' || query.sort === 'oldest') {
        return compareDate(left, right, query.sort === 'newest');
      }

      return compareAmount(left, right, query.sort === 'amount-desc');
    });

    return sorted.map((item) => item.transaction);
  }

  return matched.map((item) => item.transaction);
}
