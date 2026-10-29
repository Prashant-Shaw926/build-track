import type { LegacyTransaction, Transaction, TransactionChange } from '@/features/transactions/types/transaction.types';
import { applyTransactionChanges } from '@/features/transactions/utils/apply-transaction-changes';

function canonical(id: string, occurredAt: string, updatedAt: string, amountMinor = 100): Transaction {
  return {
    id,
    account_id: 'acc_4821',
    occurred_at: occurredAt,
    direction: 'debit',
    amount_minor: amountMinor,
    currency: 'INR',
    merchant: id,
    category: 'FOOD',
    status: 'POSTED',
    updated_at: updatedAt,
  };
}

describe('apply transaction changes', () => {
  it('replaces a row in place when the change is newer and ignores an older copy later in the feed', () => {
    const original = canonical('txn_chai', '2026-10-10T10:08:00Z', '2026-10-10T10:08:00Z', 3900);
    const posted = canonical('txn_chai', '2026-10-10T10:08:00Z', '2026-10-10T19:53:33Z', 8900);
    posted.status = 'POSTED';
    const stalePending = canonical('txn_chai', '2026-10-10T10:08:00Z', '2026-10-10T19:23:33Z', 3900);
    stalePending.status = 'PENDING';
    const kept = canonical('txn_keep', '2026-10-09T00:00:00Z', '2026-10-09T00:00:00Z', 100);
    const items = [original, kept];

    const merged = applyTransactionChanges(items, [posted, stalePending]);

    expect(items.map((item) => item.id)).toEqual(['txn_chai', 'txn_keep']);
    expect(merged.map((item) => item.id)).toEqual(['txn_chai', 'txn_keep']);
    expect(merged[0]).toMatchObject({ amount_minor: 8900, status: 'POSTED' });
    expect(merged.filter((item) => item.id === 'txn_chai')).toHaveLength(1);
  });

  it('removes a row for a newer delete and keeps it when the delete is older', () => {
    const current = canonical('txn_water', '2026-10-10T08:00:00Z', '2026-10-10T21:00:00Z', 3400);
    const neighbor = canonical('txn_next', '2026-10-09T08:00:00Z', '2026-10-09T08:00:00Z', 200);
    const newerDelete: TransactionChange = {
      id: 'txn_water',
      deleted: true,
      updated_at: '2026-10-10T22:00:00Z',
    };
    const olderDelete: TransactionChange = {
      id: 'txn_next',
      deleted: true,
      updated_at: '2026-10-09T07:00:00Z',
    };

    const merged = applyTransactionChanges([current, neighbor], [newerDelete, olderDelete]);

    expect(merged.map((item) => item.id)).toEqual(['txn_next']);
  });

  it('inserts a new id once, newest first, and replaces a legacy row that has no updated time', () => {
    const legacy: LegacyTransaction = {
      id: '104535',
      account: '4821',
      txn_time: 1760000000,
      amount: '10.00',
      type: 'DR',
      merchant_name: 'OLD COFFEE',
      category: 'DINING_OUT',
      status: 'POSTED',
    };
    const older = canonical('txn_older', '2026-10-01T00:00:00Z', '2026-10-01T00:00:00Z', 100);
    const replacement = canonical('104535', '2025-11-24T06:48:00Z', '2026-10-10T21:19:49Z', 47039);
    const created = canonical('txn_new', '2026-10-11T00:00:00Z', '2026-10-11T01:00:00Z', 5000);
    const repeat = canonical('txn_new', '2026-10-11T00:00:00Z', '2026-10-11T00:30:00Z', 1000);

    const merged = applyTransactionChanges([older, legacy], [created, replacement, repeat, created]);

    expect(merged.map((item) => item.id)).toEqual(['txn_new', 'txn_older', '104535']);
    expect(merged[0]).toMatchObject({ amount_minor: 5000 });
    expect(merged[2]).toMatchObject({ amount_minor: 47039, merchant: '104535' });
  });
});
