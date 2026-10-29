import type { NormalizedTransaction } from '@/features/transactions/types/normalized-transaction.types';
import type { NormalizationResult } from '@/features/transactions/types/normalized-transaction.types';
import type { MonthlySummaryResponse } from '@/features/transactions/types/summary.types';
import { buildTrackMonth } from '@/features/transactions/utils/track-month';

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

const summary: MonthlySummaryResponse = {
  computed_at: '2026-10-10T18:00:00Z',
  months: {
    '2026-09': { spend: '289134.67', income: '295410.10', count: 2 },
    '2026-10': { spend: '104824.31', income: '27333.00', count: 2 },
  },
};

describe('track month view', () => {
  const results: NormalizationResult[] = [
    { ok: true, transaction: transaction('newest', '2026-10-10T17:03:00Z', 34900) },
    { ok: true, transaction: transaction('middle', '2026-10-09T13:42:00Z', 1000) },
    { ok: false, id: 'broken', index: 2, reason: 'invalid_amount' },
    { ok: true, transaction: transaction('older', '2026-09-12T04:30:00Z') },
    { ok: true, transaction: { ...transaction('legacy', '2026-10-01T00:00:00Z', 51649), source: 'legacy', currency: null, inrAmountMinor: null, category: null } },
  ];

  it('keeps summary strings, order, and failures without calculating totals', () => {
    const view = buildTrackMonth({
      summary,
      results,
      accounts: undefined,
      selectedMonth: null,
    });

    expect(view.selectedMonth).toBe('2026-10');
    expect(view.income).toBe('27,333.00');
    expect(view.spend).toBe('104,824.31');
    expect(summary.months['2026-10']?.income).toBe('27333.00');
    expect(summary.months['2026-10']?.spend).toBe('104824.31');
    expect(view.income).not.toContain('₹');
    expect(view.transactions.map((item) => item.id)).toEqual(['newest', 'middle', 'legacy']);
    expect(view.transactions[0]?.amountPrimary).toBe('₹349.00');
    expect(view.transactions[2]?.amountPrimary).toBe('516.49 · Currency unavailable');
    expect(view.transactions[2]?.categoryLabel).toBe('No category');
    expect(view.failures).toEqual([{ id: 'broken', index: 2, reason: 'invalid_amount' }]);
  });

  it('uses transaction months when the summary is unavailable and still omits calculated totals', () => {
    const view = buildTrackMonth({
      summary: undefined,
      results,
      accounts: undefined,
      selectedMonth: '2026-09',
    });

    expect(view.months).toEqual(['2026-09', '2026-10']);
    expect(view.selectedMonth).toBe('2026-09');
    expect(view.income).toBeNull();
    expect(view.spend).toBeNull();
    expect(view.transactions.map((item) => item.id)).toEqual(['older']);
    expect(view.failures).toHaveLength(1);
  });
});
