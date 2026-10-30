import { apiGet } from '@/lib/api/client';
import type { AccountsResponse } from '@/features/transactions/types/account.types';

import { requireApiUrl } from './require-api-url';

export async function fetchAccounts(): Promise<AccountsResponse> {
  requireApiUrl();

  return apiGet<AccountsResponse>('/v1/accounts');
}
