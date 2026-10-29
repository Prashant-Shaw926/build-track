export type TransactionDirection = 'debit' | 'credit';

export type TransactionStatus = 'POSTED' | 'PENDING';

export interface TransactionFx {
  inr_minor: number;
}

export interface Transaction {
  id: string;
  account_id: string;
  occurred_at: string;
  direction: TransactionDirection;
  amount_minor: number;
  currency: string;
  merchant: string;
  category: string | null;
  status: TransactionStatus;
  updated_at: string;
  fx?: TransactionFx;
}

export interface TransactionPage {
  items: Transaction[];
  next_cursor: string | null;
  sync_token: string;
}

export interface TransactionPageParams {
  limit: number;
  cursor?: string | null;
}

export interface DeletedTransactionChange {
  id: string;
  deleted: true;
  updated_at: string;
}

export type TransactionChange = Transaction | DeletedTransactionChange;

export interface TransactionChangesPage {
  items: TransactionChange[];
  next_cursor: string | null;
  sync_token: string;
}
