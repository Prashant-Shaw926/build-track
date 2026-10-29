export type AccountType = 'SAVINGS' | 'CREDIT_CARD';

export interface Account {
  id: string;
  bank: string;
  type: AccountType;
  last4: string;
  nickname: string;
}

export interface AccountsResponse {
  items: Account[];
}
