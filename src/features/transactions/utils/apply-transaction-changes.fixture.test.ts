import type { ApiTransaction, TransactionChange } from '@/features/transactions/types/transaction.types';
import { applyTransactionChanges } from '@/features/transactions/utils/apply-transaction-changes';
import { formatMinorDecimal, indiaMonthKey, sumMonthMinor } from '@/features/transactions/utils/month-totals';
import { normalizeTransactions } from '@/features/transactions/utils/normalize-transaction';

interface CheckpointMonth {
  spend: string;
  income: string;
}

interface CheckpointFile {
  transaction_count: number;
  months: Record<string, CheckpointMonth>;
}

declare const require: (moduleName: string) => unknown;

function readJson<T>(path: string): T {
  return require(path) as T;
}

describe('synced fixture totals', () => {
  it('keeps one row per id and matches every checkpoint month after own-account transfers are excluded', () => {
    const transactions = readJson<ApiTransaction[]>('../../../../mock-api/fixtures/transactions.json');
    const changes = readJson<TransactionChange[]>('../../../../mock-api/fixtures/changes.json');
    const checkpoint = readJson<CheckpointFile>('../../../../mock-api/fixtures/checkpoint.json');
    const merged = applyTransactionChanges(transactions, changes);
    const ids = merged.map((item) => item.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(checkpoint.transaction_count);

    const normalized = normalizeTransactions(merged);
    const failures = normalized.filter((result) => !result.ok);

    expect(failures).toEqual([]);

    const byMonth = new Map<string, ReturnType<typeof normalizeTransactions>[number][]>();

    for (const result of normalized) {
      if (!result.ok) {
        continue;
      }

      const month = indiaMonthKey(result.transaction.occurredAtMs);

      if (month === null) {
        continue;
      }

      const group = byMonth.get(month) ?? [];
      group.push(result);
      byMonth.set(month, group);
    }

    for (const [month, expected] of Object.entries(checkpoint.months)) {
      const group = byMonth.get(month) ?? [];
      const transactionsForMonth = group.flatMap((result) => (result.ok ? [result.transaction] : []));
      const totals = sumMonthMinor(transactionsForMonth);

      expect(formatMinorDecimal(totals.spendMinor)).toBe(expected.spend);
      expect(formatMinorDecimal(totals.incomeMinor)).toBe(expected.income);
    }
  });
});
