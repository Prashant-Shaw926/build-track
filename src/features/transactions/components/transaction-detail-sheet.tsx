import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { NormalizedTransaction } from '@/features/transactions/types/normalized-transaction.types';
import { displayMerchantName } from '@/features/transactions/utils/display-merchant-name';
import { formatTransactionAmount } from '@/features/transactions/utils/format-amount';
import { formatTransactionTimestamp } from '@/features/transactions/utils/track-month';
import { Spacing } from '@/constants/theme';

interface TransactionDetailSheetProps {
  transaction: NormalizedTransaction | null;
  accountLabel: string | null;
  onClose: () => void;
}

interface DetailLine {
  label: string;
  value: string;
}

function formatTimestamp(value: string): string {
  return formatTransactionTimestamp(value);
}

function detailLines(transaction: NormalizedTransaction, accountLabel: string | null): DetailLine[] {
  const amount = formatTransactionAmount(transaction);
  const lines: DetailLine[] = [
    { label: 'Amount', value: amount.secondary === null ? amount.primary : `${amount.primary} · ${amount.secondary}` },
    { label: 'Direction', value: transaction.direction === 'debit' ? 'Debit' : 'Credit' },
    { label: 'Category', value: transaction.category ?? 'No category' },
    { label: 'Date', value: formatTimestamp(transaction.occurredAt) },
    { label: 'Status', value: transaction.status === 'PENDING' ? 'Pending' : 'Posted' },
    { label: 'Currency', value: transaction.currency ?? 'INR' },
  ];

  if (accountLabel !== null) {
    lines.push({ label: 'Account', value: accountLabel });
  }

  if (transaction.accountId !== null) {
    lines.push({ label: 'Account ID', value: transaction.accountId });
  }

  if (transaction.accountLast4 !== null && transaction.accountLast4.length > 0) {
    lines.push({ label: 'Account last four', value: transaction.accountLast4 });
  }

  if (transaction.updatedAt !== null) {
    lines.push({ label: 'Updated', value: formatTimestamp(transaction.updatedAt) });
  }

  if (transaction.counterparty !== null) {
    lines.push({
      label: 'Counterparty',
      value: `${transaction.counterparty.type} · ${transaction.counterparty.accountId}`,
    });
  }

  if (transaction.linkedAccountLast4 !== null) {
    lines.push({ label: 'Linked account', value: transaction.linkedAccountLast4 });
  }

  lines.push({ label: 'Transaction ID', value: transaction.id });

  return lines;
}

export function TransactionDetailSheet({ transaction, accountLabel, onClose }: TransactionDetailSheetProps) {
  const insets = useSafeAreaInsets();
  const lines = transaction === null ? [] : detailLines(transaction, accountLabel);

  return (
    <Modal animationType="slide" transparent visible={transaction !== null} onRequestClose={onClose}>
      <View style={styles.modal}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close transaction details" onPress={onClose} style={styles.backdrop} />
        <ThemedView style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.three }]}>
          <View style={styles.header}>
            <ThemedText type="default" style={styles.title}>
              {transaction === null ? '' : displayMerchantName(transaction.merchant)}
            </ThemedText>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.close}>
              <ThemedText type="smallBold">Close</ThemedText>
            </Pressable>
          </View>
          <ScrollView style={styles.list}>
            {lines.map((line) => (
              <View key={line.label} style={styles.line}>
                <ThemedText type="small" themeColor="textSecondary">
                  {line.label}
                </ThemedText>
                <ThemedText type="small">{line.value}</ThemedText>
              </View>
            ))}
          </ScrollView>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modal: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    gap: Spacing.two,
    maxHeight: '75%',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    borderTopLeftRadius: Spacing.three,
    borderTopRightRadius: Spacing.three,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
  },
  close: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  list: {
    maxHeight: 420,
  },
  line: {
    gap: Spacing.half,
    paddingVertical: Spacing.two,
  },
});
