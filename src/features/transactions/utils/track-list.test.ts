import type { NormalizedTransaction } from '@/features/transactions/types/normalized-transaction.types';
import { applyTrackList, categoryChoices, type TrackListQuery } from '@/features/transactions/utils/track-list';

const sourceQuery: TrackListQuery = {
  query: '',
  category: { type: 'all' },
  sort: 'source',
  direction: 'all',
};

function transaction(overrides: Partial<NormalizedTransaction> & Pick<NormalizedTransaction, 'id'>): NormalizedTransaction {
  return {
    source: 'canonical',
    accountId: 'acc_4821',
    accountLast4: '4821',
    accountMatch: 'unique',
    occurredAt: '2026-10-10T00:00:00.000Z',
    occurredAtMs: 0,
    direction: 'debit',
    amountMinor: 100,
    currency: 'INR',
    inrAmountMinor: 100,
    merchant: overrides.id,
    category: 'FOOD',
    status: 'POSTED',
    updatedAt: '2026-10-10T00:00:00.000Z',
    counterparty: null,
    linkedAccountLast4: null,
    ...overrides,
  };
}

function ids(transactions: readonly NormalizedTransaction[]): string[] {
  return transactions.map((item) => item.id);
}

describe('track list', () => {
  const month = [
    transaction({ id: 'chai', merchant: 'UPI/CHAI POINT', category: 'FOOD', occurredAtMs: 300, amountMinor: 4800, inrAmountMinor: 4800 }),
    transaction({ id: 'uber', merchant: 'UBER INDIA', category: 'TRAVEL', occurredAtMs: 200, amountMinor: 500000, currency: 'USD', inrAmountMinor: 2000 }),
    transaction({ id: 'blank', merchant: 'POS 4532 UNKNOWN', category: null, occurredAtMs: 200, amountMinor: 999999, currency: null, inrAmountMinor: null, source: 'legacy' }),
    transaction({ id: 'label', merchant: 'NO CATEGORY STORE', category: 'No category', occurredAtMs: 100, amountMinor: 50, inrAmountMinor: 50 }),
    transaction({ id: 'legacy', merchant: 'BLINKIT', category: null, occurredAtMs: Number.NaN, amountMinor: 10, currency: null, inrAmountMinor: null, source: 'legacy' }),
  ];

  it('matches a trimmed merchant query without regard to case', () => {
    const result = applyTrackList(month, { ...sourceQuery, query: '  chai  ' });

    expect(ids(result)).toEqual(['chai']);
    expect(ids(applyTrackList(month, { ...sourceQuery, query: '   ' }))).toEqual(ids(month));
  });

  it('applies search and category together and keeps an uncategorized row distinct from a category named No category', () => {
    expect(ids(applyTrackList(month, { ...sourceQuery, query: 'i', category: { type: 'category', value: 'TRAVEL' } }))).toEqual(['uber']);
    expect(ids(applyTrackList(month, { ...sourceQuery, category: { type: 'uncategorized' } }))).toEqual(['blank', 'legacy']);
    expect(ids(applyTrackList(month, { ...sourceQuery, category: { type: 'category', value: 'No category' } }))).toEqual(['label']);
    expect(applyTrackList(month, { ...sourceQuery, query: 'missing' })).toEqual([]);
  });

  it('offers No category only as an uncategorized choice', () => {
    expect(categoryChoices(month).map((choice) => choice.filter)).toEqual([
      { type: 'all' },
      { type: 'category', value: 'FOOD' },
      { type: 'category', value: 'No category' },
      { type: 'category', value: 'TRAVEL' },
      { type: 'uncategorized' },
    ]);
  });

  it('keeps source order, ids, and the original array when filters return to source order', () => {
    const before = ids(month);
    const sorted = applyTrackList(month, { ...sourceQuery, sort: 'newest' });
    const restored = applyTrackList(month, sourceQuery);

    expect(ids(sorted)).toEqual(['chai', 'uber', 'blank', 'label', 'legacy']);
    expect(ids(restored)).toEqual(before);
    expect(ids(month)).toEqual(before);
    expect(restored).not.toBe(month);
    expect(sorted.map((item) => item.id)).toEqual(['chai', 'uber', 'blank', 'label', 'legacy']);
  });

  it('orders finite dates by occurredAtMs and original index, with non-finite timestamps after them', () => {
    expect(ids(applyTrackList(month, { ...sourceQuery, sort: 'newest' }))).toEqual(['chai', 'uber', 'blank', 'label', 'legacy']);
    expect(ids(applyTrackList(month, { ...sourceQuery, sort: 'oldest' }))).toEqual(['label', 'uber', 'blank', 'chai', 'legacy']);
  });

  it('ranks supplied rupee amounts and leaves unknown currencies in source order', () => {
    expect(ids(applyTrackList(month, { ...sourceQuery, sort: 'amount-desc' }))).toEqual(['chai', 'uber', 'label', 'blank', 'legacy']);
    expect(ids(applyTrackList(month, { ...sourceQuery, sort: 'amount-asc' }))).toEqual(['label', 'uber', 'chai', 'blank', 'legacy']);
  });

  it('keeps only debits or only credits from the original month order', () => {
    const rows = [
      transaction({ id: 'd1', direction: 'debit' }),
      transaction({ id: 'c1', direction: 'credit' }),
      transaction({ id: 'd2', direction: 'debit' }),
    ];

    expect(ids(applyTrackList(rows, { ...sourceQuery, direction: 'debit' }))).toEqual(['d1', 'd2']);
    expect(ids(applyTrackList(rows, { ...sourceQuery, direction: 'credit' }))).toEqual(['c1']);
    expect(ids(applyTrackList(rows, sourceQuery))).toEqual(['d1', 'c1', 'd2']);
    expect(ids(rows)).toEqual(['d1', 'c1', 'd2']);
  });
});
