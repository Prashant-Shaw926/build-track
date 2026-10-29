import { useQuery } from '@tanstack/react-query';

import { loadTransactionSnapshot, readTransactionSnapshot } from '@/features/transactions/api/transactions.api';
import { transactionQueryKeys } from '@/features/transactions/query-keys';

export function useTransactions() {
  return useQuery({
    queryKey: transactionQueryKeys.transactions,
    queryFn: ({ client }) => {
      const cached: unknown = client.getQueryData(transactionQueryKeys.transactions);

      return loadTransactionSnapshot(readTransactionSnapshot(cached));
    },
  });
}
