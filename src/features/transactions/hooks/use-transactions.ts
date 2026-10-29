import { useQuery } from '@tanstack/react-query';

import { fetchAllTransactions } from '@/features/transactions/api/transactions.api';
import { transactionQueryKeys } from '@/features/transactions/query-keys';

export function useTransactions() {
  return useQuery({
    queryKey: transactionQueryKeys.transactions,
    queryFn: fetchAllTransactions,
  });
}
