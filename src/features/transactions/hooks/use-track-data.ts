import { useEffect, useMemo, useRef, useState } from 'react';

import { readTransactionSnapshot } from '@/features/transactions/api/transactions.api';
import { useAccounts } from '@/features/transactions/hooks/use-accounts';
import { useTransactions } from '@/features/transactions/hooks/use-transactions';
import { apiErrorMessage } from '@/lib/api/client';
import type { NormalizedTransaction } from '@/features/transactions/types/normalized-transaction.types';
import { isMonthReady } from '@/features/transactions/utils/api-transaction-month';
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

function monthPanelStatus(input: {
  snapshotReady: boolean;
  monthReady: boolean;
  isPending: boolean;
  isFetching: boolean;
  isError: boolean;
}): TrackQueryStatus {
  if (input.monthReady) {
    return 'ready';
  }

  if (input.isError && input.snapshotReady) {
    return 'error';
  }

  if (input.isPending || input.isFetching || input.snapshotReady) {
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
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const appliedKey = useRef<string | null>(null);
  const appliedNonQueryKey = useRef<string | null>(null);
  const appliedQuery = useRef<string>('');
  const appliedTransactions = useRef<readonly NormalizedTransaction[] | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const selectedMonthReady =
    snapshot !== null &&
    (snapshot.historyComplete || isMonthReady(snapshot.readyMonths, monthView.selectedMonth));

  const panelMonthView: TrackMonthView = useMemo(() => {
    if (selectedMonthReady) {
      return monthView;
    }

    return {
      ...monthView,
      income: null,
      spend: null,
      transactions: [],
      monthTransactions: [],
      failures: [],
    };
  }, [monthView, selectedMonthReady]);

  const nonQueryKey = `${panelMonthView.selectedMonth ?? ''}|${categoryFilterKey(category)}|${sort}|${direction}|${selectedMonthReady ? 'ready' : 'pending'}`;
  const criteriaKey = `${nonQueryKey}|${query}`;

  useEffect(() => {
    const clearDebounce = () => {
      if (debounceTimer.current !== null) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
    };

    if (transactionItems === undefined) {
      return clearDebounce;
    }

    if (!selectedMonthReady) {
      clearDebounce();
      appliedKey.current = criteriaKey;
      appliedNonQueryKey.current = nonQueryKey;
      appliedQuery.current = query;
      appliedTransactions.current = panelMonthView.monthTransactions;
      setDisplayed([]);
      setListBusy(false);
      return clearDebounce;
    }

    const computeRows = () =>
      toTrackTransactionRows(
        applyTrackList(panelMonthView.monthTransactions, { query, category, sort, direction }),
        accountsQuery.data?.items,
      );

    const isInitial = appliedKey.current === null;
    const transactionsChanged = appliedTransactions.current !== panelMonthView.monthTransactions;
    const nonQueryChanged = appliedNonQueryKey.current !== nonQueryKey;
    const queryChanged = appliedQuery.current !== query;

    if (!isInitial && !transactionsChanged && !nonQueryChanged && !queryChanged) {
      return clearDebounce;
    }

    appliedTransactions.current = panelMonthView.monthTransactions;

    if (isInitial || transactionsChanged || nonQueryChanged) {
      clearDebounce();
      appliedKey.current = criteriaKey;
      appliedNonQueryKey.current = nonQueryKey;
      appliedQuery.current = query;
      setDisplayed(computeRows());
      setListBusy(false);
      return clearDebounce;
    }

    clearDebounce();
    setListBusy(true);
    debounceTimer.current = setTimeout(() => {
      appliedKey.current = criteriaKey;
      appliedNonQueryKey.current = nonQueryKey;
      appliedQuery.current = query;
      setDisplayed(computeRows());
      setListBusy(false);
      debounceTimer.current = null;
    }, LIST_UPDATE_DELAY_MS);

    return clearDebounce;
  }, [
    accountsQuery.data?.items,
    category,
    criteriaKey,
    direction,
    nonQueryKey,
    panelMonthView.monthTransactions,
    query,
    selectedMonthReady,
    sort,
    transactionItems,
  ]);

  const baseStatus = queryStatus(snapshot !== null, transactionsQuery.isPending, transactionsQuery.isError);
  const panelStatus = monthPanelStatus({
    snapshotReady: snapshot !== null,
    monthReady: selectedMonthReady,
    isPending: transactionsQuery.isPending,
    isFetching: transactionsQuery.isFetching,
    isError: transactionsQuery.isError,
  });
  const transactionsStatus = snapshot === null ? baseStatus : panelStatus;
  const lastUpdatedLabel =
    snapshot !== null && transactionsQuery.dataUpdatedAt > 0
      ? `Last updated on: ${formatTransactionTimestamp(new Date(transactionsQuery.dataUpdatedAt).toISOString())}`
      : null;
  const changesNotice =
    snapshot !== null &&
    snapshot.historyComplete &&
    !snapshot.changesSynced &&
    !transactionsQuery.isFetching &&
    !transactionsQuery.isError
      ? (snapshot.changesErrorMessage ?? CHANGES_UNAVAILABLE_NOTICE)
      : null;
  const view: TrackMonthView = { ...panelMonthView, transactions: displayed ?? [] };
  const choices = useMemo(
    () => categoryChoices(panelMonthView.monthTransactions),
    [panelMonthView.monthTransactions],
  );

  const showMonth = (offset: -1 | 1) => {
    const next = adjacentMonth(monthView.months, monthView.selectedMonth, offset);

    if (next !== null) {
      setSelectedMonth(next);
    }
  };

  return {
    view,
    accounts: accountsQuery.data?.items,
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
    // Background progressive paging keeps isRefetching true after the first month is shown.
    // Only treat that as a list refresh spinner once history is complete, or when the user pulled.
    refreshing:
      pullRefreshing ||
      accountsQuery.isRefetching ||
      (transactionsQuery.isRefetching && snapshot?.historyComplete === true),
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
      setPullRefreshing(true);
      void Promise.all([accountsQuery.refetch(), transactionsQuery.refetch()])
        .then((refetched) => {
          const failed = refetched.find((result) => result.isError);

          if (failed === undefined) {
            setNotice(null);
            return;
          }

          setNotice(apiErrorMessage(failed.error, 'refresh'));
        })
        .finally(() => {
          setPullRefreshing(false);
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

