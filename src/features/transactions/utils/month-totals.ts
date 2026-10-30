import type { NormalizedTransaction } from '@/features/transactions/types/normalized-transaction.types';
import { formatSummaryAmount } from '@/features/transactions/utils/format-amount';

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export interface IndiaDateParts {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
}

export function indiaDateParts(timestampMs: number): IndiaDateParts | null {
  if (!Number.isFinite(timestampMs)) {
    return null;
  }

  const shifted = new Date(timestampMs + IST_OFFSET_MS);

  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
  };
}

export function indiaMonthKey(timestampMs: number): string | null {
  const parts = indiaDateParts(timestampMs);

  if (parts === null || parts.month < 1 || parts.month > 12) {
    return null;
  }

  return `${parts.year}-${String(parts.month).padStart(2, '0')}`;
}

export function isOwnAccountTransfer(transaction: NormalizedTransaction): boolean {
  if (transaction.counterparty?.type === 'OWN_ACCOUNT') {
    return true;
  }

  return transaction.linkedAccountLast4 !== null;
}

function inrMinorForTotal(transaction: NormalizedTransaction): number | null {
  if (transaction.currency === null || transaction.currency === 'INR') {
    return Number.isSafeInteger(transaction.amountMinor) ? transaction.amountMinor : null;
  }

  if (transaction.inrAmountMinor === null || !Number.isSafeInteger(transaction.inrAmountMinor)) {
    return null;
  }

  return transaction.inrAmountMinor;
}

export function formatMinorDecimal(minor: number): string {
  const negative = minor < 0;
  const absolute = Math.trunc(Math.abs(minor));
  const whole = Math.trunc(absolute / 100);
  const fraction = String(absolute % 100).padStart(2, '0');
  const text = `${whole}.${fraction}`;

  return negative ? `-${text}` : text;
}

export function sumMonthMinor(transactions: readonly NormalizedTransaction[]): { incomeMinor: number; spendMinor: number } {
  let incomeMinor = 0;
  let spendMinor = 0;

  for (const transaction of transactions) {
    if (isOwnAccountTransfer(transaction)) {
      continue;
    }

    const minor = inrMinorForTotal(transaction);

    if (minor === null) {
      continue;
    }

    if (transaction.direction === 'credit') {
      incomeMinor += minor;
    } else {
      spendMinor += minor;
    }
  }

  return { incomeMinor, spendMinor };
}

export function formatMonthTotals(transactions: readonly NormalizedTransaction[]): { income: string; spend: string } {
  const totals = sumMonthMinor(transactions);

  return {
    income: formatSummaryAmount(formatMinorDecimal(totals.incomeMinor)),
    spend: formatSummaryAmount(formatMinorDecimal(totals.spendMinor)),
  };
}
