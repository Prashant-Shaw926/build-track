import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BottomSheet } from '@/features/transactions/components/bottom-sheet';
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

const WIDE_LABELS = new Set(['Transaction ID', 'Counterparty', 'Account ID']);

function formatTimestamp(value: string): string {
  return formatTransactionTimestamp(value);
}

function amountText(transaction: NormalizedTransaction): string {
  const amount = formatTransactionAmount(transaction);

  return amount.secondary === null ? amount.primary : `${amount.primary} · ${amount.secondary}`;
}

function detailLines(transaction: NormalizedTransaction, accountLabel: string | null): DetailLine[] {
  const lines: DetailLine[] = [
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

function isWide(line: DetailLine): boolean {
  return WIDE_LABELS.has(line.label) || line.value.length > 24;
}

function groupLines(lines: readonly DetailLine[]): DetailLine[][] {
  const groups: DetailLine[][] = [];
  let index = 0;

  while (index < lines.length) {
    const current = lines[index];
    const next = lines[index + 1];

    if (current === undefined) {
      break;
    }

    if (next !== undefined && !isWide(current) && !isWide(next)) {
      groups.push([current, next]);
      index += 2;
      continue;
    }

    groups.push([current]);
    index += 1;
  }

  return groups;
}

export function TransactionDetailSheet({ transaction, accountLabel, onClose }: TransactionDetailSheetProps) {
  const lines = transaction === null ? [] : detailLines(transaction, accountLabel);
  const groups = groupLines(lines);

  return (
    <BottomSheet
      closeLabel="Close transaction details"
      header={
        transaction === null ? null : (
          <View style={styles.headerBlock}>
            <View style={styles.header}>
              <ThemedText style={styles.title} type="default">
                {displayMerchantName(transaction.merchant)}
              </ThemedText>
              {/* <Pressable accessibilityLabel="Close" accessibilityRole="button" onPress={onClose} style={styles.close}>
                <ThemedText type="smallBold">Close</ThemedText>
              </Pressable> */}
            </View>
            <ThemedText themeColor={transaction.direction === 'credit' ? 'income' : 'spend'} type="subtitle">
              {amountText(transaction)}
            </ThemedText>
          </View>
        )
      }
      maxHeight="75%"
      onClose={onClose}
      visible={transaction !== null}>
      {groups.map((group) => (
        <View key={group.map((line) => line.label).join('-')} style={group.length === 2 ? styles.pair : undefined}>
          {group.map((line) => (
            <View key={line.label} style={styles.line}>
              <ThemedText themeColor="textSecondary" type="small">
                {line.label}
              </ThemedText>
              <ThemedText type="small">{line.value}</ThemedText>
            </View>
          ))}
        </View>
      ))}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  headerBlock: {
    gap: Spacing.two,
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
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: Spacing.two,
  },
  pair: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  line: {
    flex: 1,
    gap: Spacing.half,
    paddingVertical: Spacing.two,
  },
});
