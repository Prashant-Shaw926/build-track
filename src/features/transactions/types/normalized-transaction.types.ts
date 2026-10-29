import type { TransactionDirection, TransactionStatus } from '@/features/transactions/types/transaction.types';

export type NormalizedDirection = TransactionDirection;

export type NormalizedStatus = TransactionStatus;

export type TransactionSource = 'canonical' | 'legacy';

export type AccountMatch = 'not_requested' | 'unique' | 'unresolved' | 'ambiguous';

export interface NormalizedCounterparty {
  type: string;
  accountId: string;
}

export interface NormalizedTransaction {
  id: string;
  source: TransactionSource;
  accountId: string | null;
  accountLast4: string | null;
  accountMatch: AccountMatch;
  occurredAt: string;
  occurredAtMs: number;
  direction: NormalizedDirection;
  amountMinor: number;
  currency: string | null;
  inrAmountMinor: number | null;
  merchant: string;
  category: string | null;
  status: NormalizedStatus;
  updatedAt: string | null;
  counterparty: NormalizedCounterparty | null;
  linkedAccountLast4: string | null;
}

export type NormalizationFailureReason =
  | 'unrecognized_shape'
  | 'missing_id'
  | 'invalid_direction'
  | 'invalid_amount'
  | 'invalid_currency'
  | 'invalid_timestamp'
  | 'invalid_merchant'
  | 'invalid_category'
  | 'invalid_status'
  | 'invalid_fx'
  | 'invalid_counterparty'
  | 'invalid_linked_account';

export interface NormalizationFailure {
  ok: false;
  id: string | null;
  index: number;
  reason: NormalizationFailureReason;
}

export interface NormalizationSuccess {
  ok: true;
  transaction: NormalizedTransaction;
}

export type NormalizationResult = NormalizationSuccess | NormalizationFailure;
