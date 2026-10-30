import type { ApiTransaction, Transaction } from '@/features/transactions/types/transaction.types';
import {
  apiTransactionIndiaMonthKey,
  computeReadyMonths,
  isMonthReady,
} from '@/features/transactions/utils/api-transaction-month';

function txn(id: string, occurredAt: string): Transaction {
  return {
    id,
    account_id: 'acc_1',
    occurred_at: occurredAt,
    direction: 'debit',
    amount_minor: 100,
    currency: 'INR',
    merchant: 'M',
    category: 'FOOD',
    status: 'POSTED',
    updated_at: occurredAt,
  };
}

describe('api transaction month helpers', () => {
  it('reads the India month from canonical and legacy rows', () => {
    expect(apiTransactionIndiaMonthKey(txn('a', '2026-08-31T21:00:00Z'))).toBe('2026-09');

    const legacy: ApiTransaction = {
      id: 'legacy',
      account: 'acc_1',
      txn_time: Math.floor(Date.parse('2026-08-31T21:00:00Z') / 1000),
      amount: '1.00',
      type: 'DR',
      merchant_name: 'M',
      category: 'FOOD',
      status: 'POSTED',
    };

    expect(apiTransactionIndiaMonthKey(legacy)).toBe('2026-09');
  });

  it('marks the newest month ready only after an older month appears', () => {
    const items = [
      txn('o1', '2026-10-10T10:00:00Z'),
      txn('o2', '2026-10-01T10:00:00Z'),
      txn('s1', '2026-09-20T10:00:00Z'),
    ];

    expect(computeReadyMonths(items, false)).toEqual(['2026-10']);
    expect(computeReadyMonths(items, true)).toEqual(['2026-09', '2026-10']);
  });

  it('does not mark a sole in-progress month ready until history completes', () => {
    const items = [txn('o1', '2026-10-10T10:00:00Z'), txn('o2', '2026-10-01T10:00:00Z')];

    expect(computeReadyMonths(items, false)).toEqual([]);
    expect(computeReadyMonths(items, true)).toEqual(['2026-10']);
  });

  it('checks month readiness against the ready list', () => {
    expect(isMonthReady(['2026-10'], '2026-10')).toBe(true);
    expect(isMonthReady(['2026-10'], '2026-09')).toBe(false);
    expect(isMonthReady(['2026-10'], null)).toBe(false);
  });
});
