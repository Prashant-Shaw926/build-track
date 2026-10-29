import type { NormalizedTransaction } from '@/features/transactions/types/normalized-transaction.types';
import type { NormalizationResult } from '@/features/transactions/types/normalized-transaction.types';
import { buildTrackMonth, formatTransactionTimestamp } from '@/features/transactions/utils/track-month';

function transaction(id: string, occurredAt: string, amountMinor = 100): NormalizedTransaction {
  return {
    id,
    source: 'canonical',
    accountId: 'acc_4821',
    accountLast4: null,
    accountMatch: 'not_requested',
    occurredAt,
    occurredAtMs: Date.parse(occurredAt),
    direction: 'debit',
    amountMinor,
    currency: 'INR',
    inrAmountMinor: amountMinor,
    merchant: id,
    category: 'FOOD',
    status: 'POSTED',
    updatedAt: occurredAt,
    counterparty: null,
    linkedAccountLast4: null,
  };
}

describe('track month view', () => {
  const results: NormalizationResult[] = [
    { ok: true, transaction: transaction('newest', '2026-10-10T17:03:00Z', 34900) },
    { ok: true, transaction: transaction('middle', '2026-10-09T13:42:00Z', 1000) },
    { ok: false, id: 'broken', index: 2, reason: 'invalid_amount' },
    { ok: true, transaction: transaction('older', '2026-09-12T04:30:00Z') },
    { ok: true, transaction: { ...transaction('legacy', '2026-10-01T00:00:00Z', 51649), source: 'legacy', currency: null, inrAmountMinor: null, category: null } },
    {
      ok: true,
      transaction: {
        ...transaction('transfer', '2026-10-02T00:00:00Z', 2500000),
        direction: 'credit',
        category: 'TRANSFER',
        counterparty: { type: 'OWN_ACCOUNT', accountId: 'acc_9075' },
      },
    },
  ];

  it('calculates the month from its transactions and leaves an own-account transfer out of the totals', () => {
    const view = buildTrackMonth({
      results,
      accounts: undefined,
      selectedMonth: null,
    });

    expect(view.selectedMonth).toBe('2026-10');
    expect(view.income).toBe('0.00');
    expect(view.spend).toBe('875.49');
    expect(view.income).not.toContain('₹');
    expect(view.transactions.map((item) => item.id)).toEqual(['newest', 'middle', 'legacy', 'transfer']);
    expect(view.transactions[0]?.amountPrimary).toBe('₹349.00');
    expect(view.transactions[2]?.amountPrimary).toBe('₹516.49');
    expect(view.transactions[2]?.categoryLabel).toBe('No category');
    expect(view.monthTransactions.map((item) => item.id)).toContain('transfer');
    expect(view.failures).toEqual([{ id: 'broken', index: 2, reason: 'invalid_amount' }]);
  });

  it('uses India calendar months from the transactions', () => {
    const view = buildTrackMonth({
      results,
      accounts: undefined,
      selectedMonth: '2026-09',
    });

    expect(view.months).toEqual(['2026-09', '2026-10']);
    expect(view.selectedMonth).toBe('2026-09');
    expect(view.income).toBe('0.00');
    expect(view.spend).toBe('1.00');
    expect(view.transactions.map((item) => item.id)).toEqual(['older']);
    expect(view.failures).toHaveLength(1);
  });

  it('places a late UTC timestamp on the India calendar date', () => {
    const late = transaction('late', '2026-08-31T21:00:00Z', 5000);
    const view = buildTrackMonth({
      results: [{ ok: true, transaction: late }],
      accounts: undefined,
      selectedMonth: null,
    });

    expect(view.selectedMonth).toBe('2026-09');
    expect(view.transactions[0]?.dateLabel).toBe('1 Sep 2026');
    expect(view.spend).toBe('50.00');
    expect(formatTransactionTimestamp('2026-08-31T21:00:00Z')).toBe('1 Sep 2026, 02:30');
  });
});
