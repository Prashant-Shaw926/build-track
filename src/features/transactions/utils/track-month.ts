import type { Account } from '@/features/transactions/types/account.types';
import type { NormalizedTransaction } from '@/features/transactions/types/normalized-transaction.types';
import type { NormalizationResult } from '@/features/transactions/types/normalized-transaction.types';
import { formatTransactionAmount } from '@/features/transactions/utils/format-amount';
import { displayMerchantName } from '@/features/transactions/utils/display-merchant-name';
import { formatMonthTotals, indiaDateParts, indiaMonthKey } from '@/features/transactions/utils/month-totals';

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
  monthTransactions: NormalizedTransaction[];
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
  const parts = indiaDateParts(Date.parse(occurredAt));

  if (parts === null) {
    return occurredAt;
  }

  const monthKey = `${parts.year}-${String(parts.month).padStart(2, '0')}`;

  return `${parts.day} ${formatMonthLabel(monthKey)}`;
}

export function formatTransactionTimestamp(occurredAt: string): string {
  const parts = indiaDateParts(Date.parse(occurredAt));

  if (parts === null) {
    return occurredAt;
  }

  const hours = String(parts.hours).padStart(2, '0');
  const minutes = String(parts.minutes).padStart(2, '0');

  return `${formatTransactionDate(occurredAt)}, ${hours}:${minutes}`;
}

function transactionMonths(results: readonly NormalizationResult[]): string[] {
  const months = new Set<string>();

  for (const result of results) {
    if (!result.ok) {
      continue;
    }

    const month = indiaMonthKey(result.transaction.occurredAtMs);

    if (month !== null && isMonthKey(month)) {
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

export function resolveAccountLabel(transaction: NormalizedTransaction, accounts: readonly Account[] | undefined): string | null {
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

export function toTrackTransactionRows(
  transactions: readonly NormalizedTransaction[],
  accounts: readonly Account[] | undefined,
): TrackTransactionRow[] {
  return transactions.map((transaction) => toRow(transaction, accounts));
}

function toRow(transaction: NormalizedTransaction, accounts: readonly Account[] | undefined): TrackTransactionRow {
  const amount = formatTransactionAmount(transaction);

  return {
    id: transaction.id,
    merchant: displayMerchantName(transaction.merchant),
    categoryLabel: transaction.category ?? 'No category',
    dateLabel: formatTransactionDate(transaction.occurredAt),
    directionLabel: transaction.direction === 'debit' ? 'Debit' : 'Credit',
    statusLabel: transaction.status === 'PENDING' ? 'Pending' : null,
    amountPrimary: amount.primary,
    amountSecondary: amount.secondary,
    accountLabel: resolveAccountLabel(transaction, accounts),
  };
}

export function buildTrackMonth(input: {
  results: readonly NormalizationResult[];
  accounts: readonly Account[] | undefined;
  selectedMonth: string | null;
}): TrackMonthView {
  const months = transactionMonths(input.results);
  const selectedMonth = resolveSelectedMonth(months, input.selectedMonth);
  const monthTransactions: NormalizedTransaction[] = [];
  const failures: TrackFailure[] = [];

  for (const result of input.results) {
    if (!result.ok) {
      failures.push({ id: result.id, index: result.index, reason: result.reason });
      continue;
    }

    const month = indiaMonthKey(result.transaction.occurredAtMs);

    if (selectedMonth !== null && month === selectedMonth) {
      monthTransactions.push(result.transaction);
    }
  }

  const totals = selectedMonth === null ? null : formatMonthTotals(monthTransactions);

  return {
    months,
    selectedMonth,
    monthLabel: selectedMonth === null ? null : formatMonthLabel(selectedMonth),
    income: totals === null ? null : totals.income,
    spend: totals === null ? null : totals.spend,
    transactions: toTrackTransactionRows(monthTransactions, input.accounts),
    monthTransactions,
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
