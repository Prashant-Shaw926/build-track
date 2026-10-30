import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BottomSheet } from '@/features/transactions/components/bottom-sheet';
import { formatMonthLabel, parseMonthKey } from '@/features/transactions/utils/track-month';
import { useTheme } from '@/hooks/use-theme';
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
  const theme = useTheme();
  const selectedIndex = selectedMonth === null ? -1 : months.indexOf(selectedMonth);
  const previousDisabled = selectedIndex <= 0;
  const nextDisabled = selectedIndex < 0 || selectedIndex >= months.length - 1;

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Previous month"
        disabled={previousDisabled}
        onPress={onPrevious}
        style={[styles.step, { backgroundColor: theme.backgroundElement, opacity: previousDisabled ? 0.35 : 1 }]}>
        <ThemedText style={styles.arrow}>‹</ThemedText>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Choose month" onPress={onOpen} style={styles.label}>
        <ThemedText numberOfLines={1} type="default">
          {monthLabel ?? 'No month'}
        </ThemedText>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Next month"
        disabled={nextDisabled}
        onPress={onNext}
        style={[styles.step, { backgroundColor: theme.backgroundElement, opacity: nextDisabled ? 0.35 : 1 }]}>
        <ThemedText style={styles.arrow}>›</ThemedText>
      </Pressable>
      <BottomSheet
        closeLabel="Close months"
        maxHeight="60%"
        onClose={onClose}
        selection={monthLabel === null ? undefined : `Selected: ${monthLabel}`}
        title="Months"
        visible={open}>
        {months.map((month) => {
          const selected = month === selectedMonth;
          const parsed = parseMonthKey(month);
          const label = formatMonthLabel(month);
          const textType = selected ? 'smallBold' : 'small';

          return (
            <Pressable
              key={month}
              accessibilityLabel={label}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => {
                onSelect(month);
                onClose();
              }}
              style={[styles.month, { backgroundColor: selected ? theme.backgroundActive : theme.backgroundElement }]}>
              <View style={styles.monthLabel}>
                {parsed === null ? (
                  <ThemedText type={textType}>{label}</ThemedText>
                ) : (
                  <>
                    <ThemedText type={textType}>{parsed.name}</ThemedText>
                    <ThemedText style={styles.monthYear} type={textType}>
                      {parsed.year}
                    </ThemedText>
                  </>
                )}
              </View>
              {selected ? <ThemedText type="smallBold">✓</ThemedText> : null}
            </Pressable>
          );
        })}
      </BottomSheet>
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
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  arrow: {
    fontSize: 28,
    lineHeight: 32,
  },
  label: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  month: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  monthLabel: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    flexShrink: 1,
    flexWrap: 'nowrap',
    gap: Spacing.one,
    minWidth: 0,
  },
  monthYear: {
    flexShrink: 0,
  },
});
