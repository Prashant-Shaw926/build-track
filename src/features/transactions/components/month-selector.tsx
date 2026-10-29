import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { formatMonthLabel } from '@/features/transactions/utils/track-month';
import { Spacing } from '@/constants/theme';

interface MonthSelectorProps {
  months: readonly string[];
  selectedMonth: string | null;
  monthLabel: string | null;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSelect: (month: string) => void;
  onPrevious: () => void;
  onNext: () => void;
}

export function MonthSelector({
  months,
  selectedMonth,
  monthLabel,
  open,
  onOpen,
  onClose,
  onSelect,
  onPrevious,
  onNext,
}: MonthSelectorProps) {
  const insets = useSafeAreaInsets();
  const selectedIndex = selectedMonth === null ? -1 : months.indexOf(selectedMonth);

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Previous month"
        disabled={selectedIndex <= 0}
        onPress={onPrevious}
        style={styles.step}>
        <ThemedText type="default">‹</ThemedText>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Choose month" onPress={onOpen} style={styles.label}>
        <ThemedText type="default">{monthLabel ?? 'No month'}</ThemedText>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Next month"
        disabled={selectedIndex < 0 || selectedIndex >= months.length - 1}
        onPress={onNext}
        style={styles.step}>
        <ThemedText type="default">›</ThemedText>
      </Pressable>
      <Modal animationType="slide" transparent visible={open} onRequestClose={onClose}>
        <View style={styles.modal}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close months" onPress={onClose} style={styles.backdrop} />
          <ThemedView style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.three }]}>
            <ThemedText type="smallBold">Months</ThemedText>
            <ScrollView style={styles.monthList}>
              {months.map((month) => (
                <Pressable
                  key={month}
                  accessibilityRole="button"
                  onPress={() => {
                    onSelect(month);
                    onClose();
                  }}
                  style={styles.month}>
                  <ThemedText type={month === selectedMonth ? 'smallBold' : 'small'}>{formatMonthLabel(month)}</ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </ThemedView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
  },
  step: {
    minWidth: Spacing.six,
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  label: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
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
    maxHeight: '60%',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    borderTopLeftRadius: Spacing.three,
    borderTopRightRadius: Spacing.three,
  },
  month: {
    paddingVertical: Spacing.two,
  },
  monthList: {
    maxHeight: 360,
  },
});
