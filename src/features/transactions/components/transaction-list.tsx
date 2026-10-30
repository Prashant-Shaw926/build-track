import { memo, useCallback } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { TrackStatus } from '@/features/transactions/components/track-status';
import { useTheme } from '@/hooks/use-theme';
import type { TrackQueryStatus } from '@/features/transactions/hooks/use-track-data';
import type { TrackTransactionRow } from '@/features/transactions/utils/track-month';
import { Spacing } from '@/constants/theme';

interface TransactionListProps {
  status: TrackQueryStatus;
  transactions: readonly TrackTransactionRow[];
  errorMessage: string;
  bottomInset: number;
  emptyTitle: string;
  onRetry: () => void;
  onSelect: (id: string) => void;
  updating: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}

interface TransactionRowProps {
  item: TrackTransactionRow;
  borderBottomColor: string;
  onSelect: (id: string) => void;
}

const keyExtractor = (item: TrackTransactionRow) => item.id;

const TransactionRow = memo(function TransactionRow({
  item,
  borderBottomColor,
  onSelect,
}: TransactionRowProps) {
  const handlePress = useCallback(() => {
    onSelect(item.id);
  }, [item.id, onSelect]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.merchant}
      onPress={handlePress}
      style={[styles.row, { borderBottomColor }]}>
      <View style={styles.copy}>
        <View style={styles.merchantSlot}>
          <ThemedText type="smallBold" numberOfLines={1} ellipsizeMode="tail">
            {item.merchant}
          </ThemedText>
        </View>
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
        <ThemedText type="small" themeColor="textSecondary">
          {item.directionLabel}
        </ThemedText>
        <ThemedText
          style={styles.amountValue}
          themeColor={item.directionLabel === 'Credit' ? 'income' : 'spend'}
          type="smallBold">
          {item.amountPrimary}
        </ThemedText>
        {item.amountSecondary === null ? null : (
          <ThemedText type="small" themeColor="textSecondary">
            {item.amountSecondary}
          </ThemedText>
        )}
      </View>
    </Pressable>
  );
});

export function TransactionList({
  status,
  transactions,
  errorMessage,
  bottomInset,
  emptyTitle,
  onRetry,
  onSelect,
  updating,
  refreshing,
  onRefresh,
}: TransactionListProps) {
  const theme = useTheme();

  const renderItem = useCallback(
    ({ item }: { item: TrackTransactionRow }) => (
      <TransactionRow
        item={item}
        borderBottomColor={theme.backgroundSelected}
        onSelect={onSelect}
      />
    ),
    [onSelect, theme.backgroundSelected],
  );

  if (status === 'loading') {
    return <TrackStatus title="Loading transactions" />;
  }

  if (status === 'error') {
    return (
      <TrackStatus title="Transactions unavailable" message={errorMessage} actionLabel="Retry" onAction={onRetry} />
    );
  }

  const updatingHeader = updating ? (
    <View style={styles.updating}>
      <ActivityIndicator color={theme.text} />
    </View>
  ) : undefined;

  return (
    <FlatList
      style={styles.listView}
      data={transactions}
      keyExtractor={keyExtractor}
      initialNumToRender={15}
      maxToRenderPerBatch={10}
      windowSize={11}
      removeClippedSubviews={Platform.OS !== 'web'}
      refreshControl={
        <RefreshControl colors={[theme.text]} onRefresh={onRefresh} refreshing={refreshing} tintColor={theme.text} />
      }
      contentContainerStyle={[styles.list, { paddingBottom: bottomInset + Spacing.four }, transactions.length === 0 ? styles.emptyList : null]}
      ListHeaderComponent={updatingHeader}
      ListEmptyComponent={<TrackStatus title={emptyTitle} />}
      renderItem={renderItem}
    />
  );
}

const styles = StyleSheet.create({
  listView: {
    flex: 1,
  },
  updating: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  list: {
    paddingTop: Spacing.two,
  },
  emptyList: {
    flexGrow: 1,
  },
  row: {
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  copy: {
    flex: 1,
    gap: Spacing.half,
    minWidth: 0,
  },
  merchantSlot: {
    alignSelf: 'stretch',
    maxWidth: '85%',
  },
  amount: {
    alignItems: 'flex-end',
    flexShrink: 0,
    gap: Spacing.half,
  },
  amountValue: {
    fontSize: 16,
    lineHeight: 22,
  },
});
