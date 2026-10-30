import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MonthSelector } from '@/features/transactions/components/month-selector';
import { SummaryOverview } from '@/features/transactions/components/summary-overview';
import { TrackFailures } from '@/features/transactions/components/track-failures';
import { TransactionControls } from '@/features/transactions/components/transaction-controls';
import { TransactionDetailSheet } from '@/features/transactions/components/transaction-detail-sheet';
import { TransactionList } from '@/features/transactions/components/transaction-list';
import { useTrackData } from '@/features/transactions/hooks/use-track-data';
import { applyTrackList } from '@/features/transactions/utils/track-list';
import { resolveAccountLabel } from '@/features/transactions/utils/track-month';
import { Spacing } from '@/constants/theme';

export function TrackScreen() {
  const insets = useSafeAreaInsets();
  const [monthsOpen, setMonthsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const track = useTrackData();
  const directionCounts = useMemo(() => {
    const matched = applyTrackList(track.view.monthTransactions, {
      query: track.query,
      category: track.category,
      sort: 'source',
      direction: 'all',
    });
    let debit = 0;
    let credit = 0;

    for (const transaction of matched) {
      if (transaction.direction === 'debit') {
        debit += 1;
      } else {
        credit += 1;
      }
    }

    return { all: matched.length, debit, credit };
  }, [track.category, track.query, track.view.monthTransactions]);
  const selectedTransaction =
    selectedId === null ? null : (track.view.monthTransactions.find((item) => item.id === selectedId) ?? null);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  useEffect(() => {
    if (selectedId !== null && selectedTransaction === null) {
      setSelectedId(null);
    }
  }, [selectedId, selectedTransaction]);

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.screen}>
        <ThemedText type="subtitle" style={styles.eyebrow}>
          Track
        </ThemedText>
        <View style={styles.overview}>
          <MonthSelector
            months={track.view.months}
            selectedMonth={track.view.selectedMonth}
            monthLabel={track.view.monthLabel}
            open={monthsOpen}
            onOpen={() => setMonthsOpen(true)}
            onClose={() => setMonthsOpen(false)}
            onSelect={track.selectMonth}
            onPrevious={track.showPreviousMonth}
            onNext={track.showNextMonth}
          />
          {track.lastUpdatedLabel === null ? null : (
            <ThemedText type="small" themeColor="textSecondary" style={styles.updated}>
              {track.lastUpdatedLabel}
            </ThemedText>
          )}
          <SummaryOverview
            status={track.summaryStatus}
            income={track.view.income}
            spend={track.view.spend}
            errorMessage={track.summaryError}
            onRetry={track.retrySummary}
          />
        </View>
        {track.transactionsStatus === 'ready' ? <TrackFailures failures={track.view.failures} /> : null}
        {track.transactionsStatus === 'ready' ? (
          <TransactionControls
            category={track.category}
            choices={track.categoryChoices}
            onCategoryChange={track.setCategory}
            onDirectionChange={track.setDirection}
            onQueryChange={track.setQuery}
            onSortChange={track.setSort}
            query={track.query}
            sort={track.sort}
            direction={track.direction}
            directionCounts={directionCounts}
          />
        ) : null}
        {track.notice === null ? null : (
          <ThemedView type="backgroundElement" style={styles.notice}>
            <ThemedText type="small">{track.notice}</ThemedText>
          </ThemedView>
        )}
        <TransactionList
          status={track.transactionsStatus}
          transactions={track.view.transactions}
          errorMessage={track.transactionsError}
          bottomInset={insets.bottom}
          emptyTitle={
            track.view.monthTransactions.length > 0 ? 'No matching transactions' : 'No transactions in this month'
          }
          onRetry={track.retryTransactions}
          onSelect={handleSelect}
          onRefresh={track.refresh}
          refreshing={track.refreshing}
          updating={track.listBusy}
        />
        <TransactionDetailSheet
          accountLabel={selectedTransaction === null ? null : resolveAccountLabel(selectedTransaction, track.accounts)}
          onClose={() => setSelectedId(null)}
          transaction={selectedTransaction}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    gap: Spacing.two,
  },
  eyebrow: {
    paddingHorizontal: Spacing.three,
  },
  overview: {
    gap: Spacing.three,
  },
  updated: {
    paddingHorizontal: Spacing.three,
  },
  notice: {
    marginHorizontal: Spacing.three,
    marginTop: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
});
