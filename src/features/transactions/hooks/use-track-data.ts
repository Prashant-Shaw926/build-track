import { useMemo, useState } from 'react';

import { useAccounts } from '@/features/transactions/hooks/use-accounts';
import { useMonthlySummary } from '@/features/transactions/hooks/use-monthly-summary';
import { useTransactions } from '@/features/transactions/hooks/use-transactions';
import { normalizeTransactions } from '@/features/transactions/utils/normalize-transaction';
import { adjacentMonth, buildTrackMonth, type TrackMonthView } from '@/features/transactions/utils/track-month';

export type TrackQueryStatus = 'loading' | 'error' | 'ready';

function queryStatus(hasData: boolean, isPending: boolean, isError: boolean): TrackQueryStatus {
  if (hasData) {
    return 'ready';
  }

  if (isError) {
    return 'error';
  }

  if (isPending) {
    return 'loading';
  }

  return 'loading';
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return 'Something went wrong';
}

export function useTrackData() {
  const accountsQuery = useAccounts();
  const transactionsQuery = useTransactions();
  const summaryQuery = useMonthlySummary();
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const results = useMemo(
    () => normalizeTransactions(transactionsQuery.data ?? [], accountsQuery.data?.items),
    [accountsQuery.data?.items, transactionsQuery.data],
  );

  const view: TrackMonthView = useMemo(
    () =>
      buildTrackMonth({
        summary: summaryQuery.data,
        results: transactionsQuery.data === undefined ? [] : results,
        accounts: accountsQuery.data?.items,
        selectedMonth,
      }),
    [accountsQuery.data?.items, results, selectedMonth, summaryQuery.data, transactionsQuery.data],
  );

  const showMonth = (offset: -1 | 1) => {
    const next = adjacentMonth(view.months, view.selectedMonth, offset);

    if (next !== null) {
      setSelectedMonth(next);
    }
  };

  return {
    view,
    summaryStatus: queryStatus(summaryQuery.data !== undefined, summaryQuery.isPending, summaryQuery.isError),
    transactionsStatus: queryStatus(
      transactionsQuery.data !== undefined,
      transactionsQuery.isPending,
      transactionsQuery.isError,
    ),
    summaryError: errorMessage(summaryQuery.error),
    transactionsError: errorMessage(transactionsQuery.error),
    retrySummary: () => {
      void summaryQuery.refetch();
    },
    retryTransactions: () => {
      void transactionsQuery.refetch();
    },
    selectMonth: setSelectedMonth,
    showPreviousMonth: () => {
      showMonth(-1);
    },
    showNextMonth: () => {
      showMonth(1);
    },
  };
}
