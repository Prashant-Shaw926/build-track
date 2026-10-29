import { useEffect, useMemo, useRef, useState } from 'react';

import { readTransactionSnapshot } from '@/features/transactions/api/transactions.api';
import { useAccounts } from '@/features/transactions/hooks/use-accounts';
import { useTransactions } from '@/features/transactions/hooks/use-transactions';
import { apiErrorMessage } from '@/lib/api/client';
import { normalizeTransactions } from '@/features/transactions/utils/normalize-transaction';
import {
  applyTrackList,
  categoryChoices,
  categoryFilterKey,
  type CategoryFilter,
  type DirectionFilter,
  type TrackSort,
} from '@/features/transactions/utils/track-list';
import {
  adjacentMonth,
  buildTrackMonth,
  formatTransactionTimestamp,
  toTrackTransactionRows,
  type TrackMonthView,
  type TrackTransactionRow,
} from '@/features/transactions/utils/track-month';

export type TrackQueryStatus = 'loading' | 'error' | 'ready';

const ALL_CATEGORIES: CategoryFilter = { type: 'all' };
const LIST_UPDATE_DELAY_MS = 200;
const CHANGES_UNAVAILABLE_NOTICE = "Couldn't load the latest changes.";

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
  return apiErrorMessage(error);
}

export function useTrackData() {
  const accountsQuery = useAccounts();
  const transactionsQuery = useTransactions();
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>(ALL_CATEGORIES);
  const [sort, setSort] = useState<TrackSort>('source');
  const [direction, setDirection] = useState<DirectionFilter>('all');
  const [displayed, setDisplayed] = useState<TrackTransactionRow[] | null>(null);
  const [listBusy, setListBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const appliedKey = useRef<string | null>(null);

  const snapshot = useMemo(() => readTransactionSnapshot(transactionsQuery.data), [transactionsQuery.data]);
  const transactionItems = snapshot?.items;
  const results = useMemo(
    () => normalizeTransactions(transactionItems ?? [], accountsQuery.data?.items),
    [accountsQuery.data?.items, transactionItems],
  );

  const monthView: TrackMonthView = useMemo(
    () =>
      buildTrackMonth({
        results: transactionItems === undefined ? [] : results,
        accounts: accountsQuery.data?.items,
        selectedMonth,
      }),
    [accountsQuery.data?.items, results, selectedMonth, transactionItems],
  );

  const criteriaKey = `${monthView.selectedMonth ?? ''}|${query}|${categoryFilterKey(category)}|${sort}|${direction}`;

  useEffect(() => {
    if (transactionItems === undefined) {
      return;
    }

    const rows = toTrackTransactionRows(
      applyTrackList(monthView.monthTransactions, { query, category, sort, direction }),
      accountsQuery.data?.items,
    );
    const criteriaChanged = appliedKey.current !== null && appliedKey.current !== criteriaKey;

    if (!criteriaChanged) {
      appliedKey.current = criteriaKey;
      setDisplayed(rows);
      setListBusy(false);
      return;
    }

    setListBusy(true);
    const timer = setTimeout(() => {
      appliedKey.current = criteriaKey;
      setDisplayed(rows);
      setListBusy(false);
    }, LIST_UPDATE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [
    accountsQuery.data?.items,
    category,
    criteriaKey,
    direction,
    monthView.monthTransactions,
    query,
    sort,
    transactionItems,
  ]);

  const transactionsStatus = queryStatus(snapshot !== null, transactionsQuery.isPending, transactionsQuery.isError);
  const lastUpdatedLabel =
    snapshot !== null && transactionsQuery.dataUpdatedAt > 0
      ? `Last updated on: ${formatTransactionTimestamp(new Date(transactionsQuery.dataUpdatedAt).toISOString())}`
      : null;
  const changesNotice =
    snapshot !== null && !snapshot.changesSynced && !transactionsQuery.isFetching && !transactionsQuery.isError
      ? (snapshot.changesErrorMessage ?? CHANGES_UNAVAILABLE_NOTICE)
      : null;
  const view: TrackMonthView = { ...monthView, transactions: displayed ?? [] };
  const choices = useMemo(() => categoryChoices(monthView.monthTransactions), [monthView.monthTransactions]);

  const showMonth = (offset: -1 | 1) => {
    const next = adjacentMonth(view.months, view.selectedMonth, offset);

    if (next !== null) {
      setSelectedMonth(next);
    }
  };

  return {
    view,
    categoryChoices: choices,
    query,
    category,
    sort,
    direction,
    setQuery,
    setCategory,
    setSort,
    setDirection,
    listBusy,
    lastUpdatedLabel,
    notice: notice ?? changesNotice,
    refreshing: accountsQuery.isRefetching || transactionsQuery.isRefetching,
    summaryStatus: transactionsStatus,
    transactionsStatus,
    summaryError: errorMessage(transactionsQuery.error),
    transactionsError: errorMessage(transactionsQuery.error),
    retrySummary: () => {
      void transactionsQuery.refetch().then((result) => {
        if (!result.isError) {
          setNotice(null);
          return;
        }

        if (result.data !== undefined) {
          setNotice(apiErrorMessage(result.error));
        }
      });
    },
    retryTransactions: () => {
      void transactionsQuery.refetch().then((result) => {
        if (!result.isError) {
          setNotice(null);
          return;
        }

        if (result.data !== undefined) {
          setNotice(apiErrorMessage(result.error));
        }
      });
    },
    refresh: () => {
      void Promise.all([accountsQuery.refetch(), transactionsQuery.refetch()]).then((refetched) => {
        const failed = refetched.find((result) => result.isError);

        if (failed === undefined) {
          setNotice(null);
          return;
        }

        setNotice(apiErrorMessage(failed.error, 'refresh'));
      });
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

