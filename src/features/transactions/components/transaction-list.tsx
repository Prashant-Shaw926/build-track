import { FlatList, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { TrackStatus } from '@/features/transactions/components/track-status';
import type { TrackQueryStatus } from '@/features/transactions/hooks/use-track-data';
import type { TrackTransactionRow } from '@/features/transactions/utils/track-month';
import { Spacing } from '@/constants/theme';

interface TransactionListProps {
  status: TrackQueryStatus;
  transactions: readonly TrackTransactionRow[];
  errorMessage: string;
  bottomInset: number;
  onRetry: () => void;
}

export function TransactionList({ status, transactions, errorMessage, bottomInset, onRetry }: TransactionListProps) {
  if (status === 'loading') {
    return <TrackStatus title="Loading transactions" />;
  }

  if (status === 'error') {
    return (
      <TrackStatus title="Transactions unavailable" message={errorMessage} actionLabel="Retry" onAction={onRetry} />
    );
  }

  return (
    <FlatList
      style={styles.listView}
      data={transactions}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[styles.list, { paddingBottom: bottomInset + Spacing.four }, transactions.length === 0 ? styles.emptyList : null]}
      ListEmptyComponent={<TrackStatus title="No transactions in this month" />}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View style={styles.copy}>
            <ThemedText type="smallBold">{item.merchant}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {item.categoryLabel}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {item.dateLabel}
              {item.accountLabel === null ? '' : ` · ${item.accountLabel}`}
              {item.statusLabel === null ? '' : ` · ${item.statusLabel}`}
            </ThemedText>
          </View>
          <View style={styles.amount}>
            <ThemedText type="smallBold">{item.directionLabel}</ThemedText>
            <ThemedText type="small">{item.amountPrimary}</ThemedText>
            {item.amountSecondary === null ? null : (
              <ThemedText type="small" themeColor="textSecondary">
                {item.amountSecondary}
              </ThemedText>
            )}
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  listView: {
    flex: 1,
  },
  list: {
    paddingTop: Spacing.two,
  },
  emptyList: {
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  copy: {
    flex: 1,
    gap: Spacing.half,
  },
  amount: {
    alignItems: 'flex-end',
    gap: Spacing.half,
    maxWidth: '46%',
  },
});
