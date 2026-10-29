import { useQuery } from '@tanstack/react-query';

import { fetchMonthlySummary } from '@/features/transactions/api/summary.api';
import { transactionQueryKeys } from '@/features/transactions/query-keys';

export function useMonthlySummary() {
  return useQuery({
    queryKey: transactionQueryKeys.monthlySummary,
    queryFn: fetchMonthlySummary,
  });
}
