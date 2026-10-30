import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TrackStatus } from '@/features/transactions/components/track-status';
import type { TrackQueryStatus } from '@/features/transactions/hooks/use-track-data';
import { Spacing } from '@/constants/theme';

interface SummaryOverviewProps {
  status: TrackQueryStatus;
  income: string | null;
  spend: string | null;
  errorMessage: string;
  onRetry: () => void;
}

export function SummaryOverview({ status, income, spend, errorMessage, onRetry }: SummaryOverviewProps) {
  if (status === 'loading') {
    return <TrackStatus title="Loading summary" />;
  }

  if (status === 'error') {
    return <TrackStatus title="Summary unavailable" message={errorMessage} actionLabel="Retry" onAction={onRetry} />;
  }

  if (income === null || spend === null) {
    return <TrackStatus title="No summary for this month" />;
  }

  return (
    <View style={styles.row}>
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="small" themeColor="textSecondary">
          Income
        </ThemedText>
        <ThemedText style={styles.amount} themeColor="income">{`₹${income}`}</ThemedText>
      </ThemedView>
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="small" themeColor="textSecondary">
          Expense
        </ThemedText>
        <ThemedText style={styles.amount} themeColor="spend">{`₹${spend}`}</ThemedText>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  card: {
    flex: 1,
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  amount: {
    fontSize: 22,
    fontWeight: 600,
    lineHeight: 28,
  },
});
