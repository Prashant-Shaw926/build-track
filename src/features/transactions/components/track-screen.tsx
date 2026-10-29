import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MonthSelector } from '@/features/transactions/components/month-selector';
import { SummaryOverview } from '@/features/transactions/components/summary-overview';
import { TrackFailures } from '@/features/transactions/components/track-failures';
import { TransactionList } from '@/features/transactions/components/transaction-list';
import { useTrackData } from '@/features/transactions/hooks/use-track-data';
import { Spacing } from '@/constants/theme';

export function TrackScreen() {
  const insets = useSafeAreaInsets();
  const [monthsOpen, setMonthsOpen] = useState(false);
  const track = useTrackData();

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.screen}>
        <ThemedText type="subtitle" style={styles.title}>
          Track
        </ThemedText>
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
        <SummaryOverview
          status={track.summaryStatus}
          income={track.view.income}
          spend={track.view.spend}
          errorMessage={track.summaryError}
          onRetry={track.retrySummary}
        />
        {track.transactionsStatus === 'ready' ? <TrackFailures failures={track.view.failures} /> : null}
        <TransactionList
          status={track.transactionsStatus}
          transactions={track.view.transactions}
          errorMessage={track.transactionsError}
          bottomInset={insets.bottom}
          onRetry={track.retryTransactions}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  title: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
});
