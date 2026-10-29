import type { Account } from '@/features/transactions/types/account.types';
import type { NormalizedTransaction } from '@/features/transactions/types/normalized-transaction.types';
import type { NormalizationResult } from '@/features/transactions/types/normalized-transaction.types';
import type { MonthlySummaryResponse } from '@/features/transactions/types/summary.types';
import { formatSummaryAmount, formatTransactionAmount } from '@/features/transactions/utils/format-amount';

const MONTH_KEY = /^(\d{4})-(\d{2})$/;

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export interface TrackFailure {
  id: string | null;
  index: number;
  reason: string;
}

export interface TrackTransactionRow {
  id: string;
  merchant: string;
  categoryLabel: string;
  dateLabel: string;
  directionLabel: 'Debit' | 'Credit';
  statusLabel: 'Pending' | null;
  amountPrimary: string;
  amountSecondary: string | null;
  accountLabel: string | null;
}

export interface TrackMonthView {
  months: string[];
  selectedMonth: string | null;
  monthLabel: string | null;
  income: string | null;
  spend: string | null;
  transactions: TrackTransactionRow[];
  failures: TrackFailure[];
}

function isMonthKey(value: string): boolean {
  const match = MONTH_KEY.exec(value);

  if (match === null) {
    return false;
  }

  const month = Number(match[2]);

  return month >= 1 && month <= 12;
}

export function formatMonthLabel(month: string): string {
  const match = MONTH_KEY.exec(month);

  if (match === null) {
    return month;
  }

  const name = MONTH_NAMES[Number(match[2]) - 1];

  return name === undefined ? month : `${name} ${match[1]}`;
}

export function formatTransactionDate(occurredAt: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(occurredAt);

  if (match === null) {
    return occurredAt;
  }

  return `${Number(match[3])} ${formatMonthLabel(`${match[1]}-${match[2]}`)}`;
}

function summaryMonths(summary: MonthlySummaryResponse | undefined): string[] {
  if (summary === undefined) {
    return [];
  }

  return Object.keys(summary.months).filter(isMonthKey).sort();
}

function transactionMonths(results: readonly NormalizationResult[]): string[] {
  const months = new Set<string>();

  for (const result of results) {
    if (!result.ok) {
      continue;
    }

    const month = result.transaction.occurredAt.slice(0, 7);

    if (isMonthKey(month)) {
      months.add(month);
    }
  }

  return [...months].sort();
}

export function resolveSelectedMonth(months: readonly string[], selectedMonth: string | null): string | null {
  if (months.length === 0) {
    return null;
  }

  if (selectedMonth !== null && months.includes(selectedMonth)) {
    return selectedMonth;
  }

  return months[months.length - 1] ?? null;
}

function accountLabel(transaction: NormalizedTransaction, accounts: readonly Account[] | undefined): string | null {
  if (transaction.accountId !== null && accounts !== undefined) {
    const account = accounts.find((item) => item.id === transaction.accountId);

    if (account !== undefined) {
      return account.nickname;
    }
  }

  if (transaction.accountLast4 !== null && transaction.accountLast4.length > 0) {
    return `•••• ${transaction.accountLast4}`;
  }

  return null;
}

function toRow(transaction: NormalizedTransaction, accounts: readonly Account[] | undefined): TrackTransactionRow {
  const amount = formatTransactionAmount(transaction);

  return {
    id: transaction.id,
    merchant: transaction.merchant,
    categoryLabel: transaction.category ?? 'No category',
    dateLabel: formatTransactionDate(transaction.occurredAt),
    directionLabel: transaction.direction === 'debit' ? 'Debit' : 'Credit',
    statusLabel: transaction.status === 'PENDING' ? 'Pending' : null,
    amountPrimary: amount.primary,
    amountSecondary: amount.secondary,
    accountLabel: accountLabel(transaction, accounts),
  };
}

export function buildTrackMonth(input: {
  summary: MonthlySummaryResponse | undefined;
  results: readonly NormalizationResult[];
  accounts: readonly Account[] | undefined;
  selectedMonth: string | null;
}): TrackMonthView {
  const fromSummary = summaryMonths(input.summary);
  const months = fromSummary.length > 0 ? fromSummary : transactionMonths(input.results);
  const selectedMonth = resolveSelectedMonth(months, input.selectedMonth);
  const monthSummary = selectedMonth === null ? undefined : input.summary?.months[selectedMonth];
  const transactions: TrackTransactionRow[] = [];
  const failures: TrackFailure[] = [];

  for (const result of input.results) {
    if (!result.ok) {
      failures.push({ id: result.id, index: result.index, reason: result.reason });
      continue;
    }

    if (selectedMonth !== null && result.transaction.occurredAt.slice(0, 7) === selectedMonth) {
      transactions.push(toRow(result.transaction, input.accounts));
    }
  }

  return {
    months,
    selectedMonth,
    monthLabel: selectedMonth === null ? null : formatMonthLabel(selectedMonth),
    income: monthSummary === undefined ? null : formatSummaryAmount(monthSummary.income),
    spend: monthSummary === undefined ? null : formatSummaryAmount(monthSummary.spend),
    transactions,
    failures,
  };
}

export function adjacentMonth(months: readonly string[], selectedMonth: string | null, offset: -1 | 1): string | null {
  if (selectedMonth === null) {
    return null;
  }

  const next = months[months.indexOf(selectedMonth) + offset];

  return next ?? null;
}
