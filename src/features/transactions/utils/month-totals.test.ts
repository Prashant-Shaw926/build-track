import type { NormalizedTransaction } from '@/features/transactions/types/normalized-transaction.types';
import { formatMonthTotals, indiaMonthKey, isOwnAccountTransfer } from '@/features/transactions/utils/month-totals';

function transaction(overrides: Partial<NormalizedTransaction> = {}): NormalizedTransaction {
  return {
    id: 'txn_1',
    source: 'canonical',
    accountId: 'acc_4821',
    accountLast4: null,
    accountMatch: 'not_requested',
    occurredAt: '2026-10-10T10:00:00Z',
    occurredAtMs: Date.parse('2026-10-10T10:00:00Z'),
    direction: 'debit',
    amountMinor: 5000,
    currency: 'INR',
    inrAmountMinor: 5000,
    merchant: 'UPI/CHAI POINT',
    category: 'FOOD',
    status: 'POSTED',
    updatedAt: '2026-10-10T10:00:00Z',
    counterparty: null,
    linkedAccountLast4: null,
    ...overrides,
  };
}

describe('month totals', () => {
  it('uses the India month for a timestamp that is still the previous UTC day', () => {
    expect(indiaMonthKey(Date.parse('2026-08-31T21:00:00Z'))).toBe('2026-09');
  });

  it('leaves own-account transfers out and still counts an external transfer', () => {
    const own = transaction({
      id: 'own',
      direction: 'credit',
      amountMinor: 2500000,
      inrAmountMinor: 2500000,
      category: 'TRANSFER',
      counterparty: { type: 'OWN_ACCOUNT', accountId: 'acc_9075' },
    });
    const linked = transaction({
      id: 'linked',
      source: 'legacy',
      direction: 'debit',
      amountMinor: 2157963,
      currency: null,
      inrAmountMinor: null,
      category: 'TRANSFER',
      linkedAccountLast4: '3310',
    });
    const external = transaction({
      id: 'external',
      direction: 'credit',
      amountMinor: 10000,
      inrAmountMinor: 10000,
      category: 'TRANSFER',
    });
    const usd = transaction({
      id: 'usd',
      amountMinor: 1000,
      currency: 'USD',
      inrAmountMinor: 86661,
    });

    expect(isOwnAccountTransfer(own)).toBe(true);
    expect(isOwnAccountTransfer(linked)).toBe(true);
    expect(isOwnAccountTransfer(external)).toBe(false);

    expect(formatMonthTotals([own, linked, external, usd])).toEqual({
      income: '100.00',
      spend: '866.61',
    });
  });
});
