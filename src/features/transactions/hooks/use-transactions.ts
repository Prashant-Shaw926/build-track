import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';

import { loadTransactionSnapshot, readTransactionSnapshot } from '@/features/transactions/api/transactions.api';
import { transactionQueryKeys } from '@/features/transactions/query-keys';

export function useTransactions() {
  const resumeAttempts = useRef(0);
  const query = useQuery({
    queryKey: transactionQueryKeys.transactions,
    queryFn: ({ client }) => {
      const cached: unknown = client.getQueryData(transactionQueryKeys.transactions);
      const previous = readTransactionSnapshot(cached);

      return loadTransactionSnapshot(previous, {
        onProgress: (snapshot) => {
          client.setQueryData(transactionQueryKeys.transactions, snapshot);
        },
      });
    },
  });

  // Pull-to-refresh / remount can cancel an in-flight progressive queryFn and leave
  // historyComplete: false with no further requests. Resume until the list finishes.
  useEffect(() => {
    const snapshot = readTransactionSnapshot(query.data);

    if (snapshot === null || snapshot.historyComplete) {
      resumeAttempts.current = 0;
      return;
    }

    if (query.isFetching || query.isPending) {
      return;
    }

    if (resumeAttempts.current >= 3) {
      return;
    }

    resumeAttempts.current += 1;
    void query.refetch();
  }, [query.data, query.isFetching, query.isPending, query.refetch]);

  return query;
}
