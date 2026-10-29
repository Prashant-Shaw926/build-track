import type { Account } from '@/features/transactions/types/account.types';
import type {
  AccountMatch,
  NormalizationFailure,
  NormalizationFailureReason,
  NormalizationResult,
  NormalizedCounterparty,
  NormalizedTransaction,
} from '@/features/transactions/types/normalized-transaction.types';
import type { TransactionDirection, TransactionStatus } from '@/features/transactions/types/transaction.types';

const UTC_TIMESTAMP =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?Z$/;

const MAJOR_AMOUNT = /^(\d+)\.(\d{2})$/;

interface ParsedInstant {
  iso: string;
  ms: number;
}

interface AccountEnrichment {
  accountId: string | null;
  accountLast4: string | null;
  accountMatch: AccountMatch;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function failure(
  id: string | null,
  index: number,
  reason: NormalizationFailureReason,
): NormalizationFailure {
  return { ok: false, id, index, reason };
}

function readId(record: Record<string, unknown>): string | null {
  const id = record.id;

  if (typeof id !== 'string' || id.length === 0) {
    return null;
  }

  return id;
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function daysInMonth(year: number, month: number): number {
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  return days[month - 1] ?? 0;
}

function parseUtcTimestamp(value: unknown): ParsedInstant | null {
  if (typeof value !== 'string') {
    return null;
  }

  const match = UTC_TIMESTAMP.exec(value);

  if (match === null) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const fraction = match[7];
  const milliseconds = fraction === undefined ? 0 : Number(fraction.padEnd(3, '0'));

  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    return null;
  }

  if (hour > 23 || minute > 59 || second > 59) {
    return null;
  }

  const ms = Date.UTC(year, month - 1, day, hour, minute, second, milliseconds);

  if (!Number.isFinite(ms)) {
    return null;
  }

  const parsed = new Date(ms);

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day ||
    parsed.getUTCHours() !== hour ||
    parsed.getUTCMinutes() !== minute ||
    parsed.getUTCSeconds() !== second ||
    parsed.getUTCMilliseconds() !== milliseconds
  ) {
    return null;
  }

  return { iso: value, ms };
}

function parseUnixSeconds(value: unknown): ParsedInstant | null {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    return null;
  }

  const ms = value * 1000;

  if (!Number.isFinite(ms)) {
    return null;
  }

  const parsed = new Date(ms);

  if (!Number.isFinite(parsed.getTime())) {
    return null;
  }

  return { iso: parsed.toISOString(), ms: parsed.getTime() };
}

function parseMajorAmount(value: unknown): number | null {
  if (typeof value !== 'string') {
    return null;
  }

  const match = MAJOR_AMOUNT.exec(value);

  if (match === null) {
    return null;
  }

  const minor = Number(match[1]) * 100 + Number(match[2]);

  if (!Number.isSafeInteger(minor)) {
    return null;
  }

  return minor;
}

function readFxInrMinor(record: Record<string, unknown>): number | null | undefined {
  if (!('fx' in record)) {
    return null;
  }

  const fx = record.fx;

  if (!isRecord(fx) || !('inr_minor' in fx) || !isNonNegativeSafeInteger(fx.inr_minor)) {
    return undefined;
  }

  return fx.inr_minor;
}

function readCanonicalDirection(value: unknown): TransactionDirection | null {
  if (value === 'debit' || value === 'credit') {
    return value;
  }

  return null;
}

function readLegacyDirection(value: unknown): TransactionDirection | null {
  if (value === 'DR') {
    return 'debit';
  }

  if (value === 'CR') {
    return 'credit';
  }

  return null;
}

function readStatus(value: unknown): TransactionStatus | null {
  if (value === 'POSTED' || value === 'PENDING') {
    return value;
  }

  return null;
}

function readCategory(record: Record<string, unknown>): string | null | undefined {
  if (!('category' in record)) {
    return undefined;
  }

  const category = record.category;

  if (category === null || typeof category === 'string') {
    return category;
  }

  return undefined;
}

function readMerchant(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  return value;
}

function readCounterparty(record: Record<string, unknown>): NormalizedCounterparty | null | undefined {
  if (!('counterparty' in record)) {
    return null;
  }

  const counterparty = record.counterparty;

  if (
    !isRecord(counterparty) ||
    typeof counterparty.type !== 'string' ||
    counterparty.type.length === 0 ||
    typeof counterparty.account_id !== 'string' ||
    counterparty.account_id.length === 0
  ) {
    return undefined;
  }

  return {
    type: counterparty.type,
    accountId: counterparty.account_id,
  };
}

function readLinkedAccount(record: Record<string, unknown>): string | null | undefined {
  if (!('linked_account' in record)) {
    return null;
  }

  const linkedAccount = record.linked_account;

  if (typeof linkedAccount !== 'string') {
    return undefined;
  }

  return linkedAccount;
}

function classifyMatches(matches: readonly Account[]): AccountMatch {
  if (matches.length === 1) {
    return 'unique';
  }

  if (matches.length === 0) {
    return 'unresolved';
  }

  return 'ambiguous';
}

function enrichCanonicalAccount(
  accountId: string,
  accounts: readonly Account[] | undefined,
): AccountEnrichment {
  if (accounts === undefined) {
    return { accountId, accountLast4: null, accountMatch: 'not_requested' };
  }

  const match = classifyMatches(accounts.filter((account) => account.id === accountId));
  const account = match === 'unique' ? accounts.find((item) => item.id === accountId) : undefined;

  return {
    accountId,
    accountLast4: account?.last4 ?? null,
    accountMatch: match,
  };
}

function enrichLegacyAccount(
  accountLast4: string,
  accounts: readonly Account[] | undefined,
): AccountEnrichment {
  if (accounts === undefined) {
    return { accountId: null, accountLast4, accountMatch: 'not_requested' };
  }

  const matches = accounts.filter((account) => account.last4 === accountLast4);
  const match = classifyMatches(matches);

  return {
    accountId: match === 'unique' ? matches[0]?.id ?? null : null,
    accountLast4,
    accountMatch: match,
  };
}

function isLegacyShape(record: Record<string, unknown>): boolean {
  return 'txn_time' in record && 'amount' in record && !('occurred_at' in record) && !('amount_minor' in record);
}

function isCanonicalShape(record: Record<string, unknown>): boolean {
  return 'occurred_at' in record && 'amount_minor' in record && !('txn_time' in record);
}

function normalizeCanonical(
  record: Record<string, unknown>,
  id: string,
  index: number,
  accounts: readonly Account[] | undefined,
): NormalizationResult {
  if (typeof record.account_id !== 'string' || record.account_id.length === 0) {
    return failure(id, index, 'unrecognized_shape');
  }

  const occurredAt = parseUtcTimestamp(record.occurred_at);
  const updatedAt = parseUtcTimestamp(record.updated_at);

  if (occurredAt === null || updatedAt === null) {
    return failure(id, index, 'invalid_timestamp');
  }

  const direction = readCanonicalDirection(record.direction);

  if (direction === null) {
    return failure(id, index, 'invalid_direction');
  }

  if (!isNonNegativeSafeInteger(record.amount_minor)) {
    return failure(id, index, 'invalid_amount');
  }

  if (typeof record.currency !== 'string' || record.currency.length === 0) {
    return failure(id, index, 'invalid_currency');
  }

  const fxInrMinor = readFxInrMinor(record);

  if (fxInrMinor === undefined) {
    return failure(id, index, 'invalid_fx');
  }

  const merchant = readMerchant(record.merchant);

  if (merchant === null) {
    return failure(id, index, 'invalid_merchant');
  }

  const category = readCategory(record);

  if (category === undefined) {
    return failure(id, index, 'invalid_category');
  }

  const status = readStatus(record.status);

  if (status === null) {
    return failure(id, index, 'invalid_status');
  }

  const counterparty = readCounterparty(record);

  if (counterparty === undefined) {
    return failure(id, index, 'invalid_counterparty');
  }

  const account = enrichCanonicalAccount(record.account_id, accounts);
  const inrAmountMinor = fxInrMinor ?? (record.currency === 'INR' ? record.amount_minor : null);

  const transaction: NormalizedTransaction = {
    id,
    source: 'canonical',
    accountId: account.accountId,
    accountLast4: account.accountLast4,
    accountMatch: account.accountMatch,
    occurredAt: occurredAt.iso,
    occurredAtMs: occurredAt.ms,
    direction,
    amountMinor: record.amount_minor,
    currency: record.currency,
    inrAmountMinor,
    merchant,
    category,
    status,
    updatedAt: updatedAt.iso,
    counterparty,
    linkedAccountLast4: null,
  };

  return { ok: true, transaction };
}

function normalizeLegacy(
  record: Record<string, unknown>,
  id: string,
  index: number,
  accounts: readonly Account[] | undefined,
): NormalizationResult {
  if (typeof record.account !== 'string') {
    return failure(id, index, 'unrecognized_shape');
  }

  const occurredAt = parseUnixSeconds(record.txn_time);

  if (occurredAt === null) {
    return failure(id, index, 'invalid_timestamp');
  }

  const direction = readLegacyDirection(record.type);

  if (direction === null) {
    return failure(id, index, 'invalid_direction');
  }

  const amountMinor = parseMajorAmount(record.amount);

  if (amountMinor === null) {
    return failure(id, index, 'invalid_amount');
  }

  const merchant = readMerchant(record.merchant_name);

  if (merchant === null) {
    return failure(id, index, 'invalid_merchant');
  }

  const category = readCategory(record);

  if (category === undefined) {
    return failure(id, index, 'invalid_category');
  }

  const status = readStatus(record.status);

  if (status === null) {
    return failure(id, index, 'invalid_status');
  }

  const linkedAccountLast4 = readLinkedAccount(record);

  if (linkedAccountLast4 === undefined) {
    return failure(id, index, 'invalid_linked_account');
  }

  const account = enrichLegacyAccount(record.account, accounts);

  const transaction: NormalizedTransaction = {
    id,
    source: 'legacy',
    accountId: account.accountId,
    accountLast4: account.accountLast4,
    accountMatch: account.accountMatch,
    occurredAt: occurredAt.iso,
    occurredAtMs: occurredAt.ms,
    direction,
    amountMinor,
    currency: null,
    inrAmountMinor: null,
    merchant,
    category,
    status,
    updatedAt: null,
    counterparty: null,
    linkedAccountLast4,
  };

  return { ok: true, transaction };
}

export function normalizeTransaction(
  record: unknown,
  accounts?: readonly Account[],
  index = 0,
): NormalizationResult {
  if (!isRecord(record)) {
    return failure(null, index, 'unrecognized_shape');
  }

  const id = readId(record);

  if (isLegacyShape(record)) {
    if (id === null) {
      return failure(null, index, 'missing_id');
    }

    return normalizeLegacy(record, id, index, accounts);
  }

  if (isCanonicalShape(record)) {
    if (id === null) {
      return failure(null, index, 'missing_id');
    }

    return normalizeCanonical(record, id, index, accounts);
  }

  return failure(id, index, 'unrecognized_shape');
}

export function normalizeTransactions(
  records: readonly unknown[],
  accounts?: readonly Account[],
): NormalizationResult[] {
  return records.map((record, index) => normalizeTransaction(record, accounts, index));
}
