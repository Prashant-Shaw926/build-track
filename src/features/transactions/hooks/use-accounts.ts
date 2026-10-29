import { useQuery } from '@tanstack/react-query';

import { fetchAccounts } from '@/features/transactions/api/accounts.api';
import { transactionQueryKeys } from '@/features/transactions/query-keys';

export function useAccounts() {
  return useQuery({
    queryKey: transactionQueryKeys.accounts,
    queryFn: fetchAccounts,
  });
}
