import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import type { DirectionFilter } from '@/features/transactions/utils/track-list';
import { Spacing } from '@/constants/theme';

const OPTIONS: readonly { direction: DirectionFilter; label: string }[] = [
  { direction: 'all', label: 'All' },
  { direction: 'debit', label: 'Debits' },
  { direction: 'credit', label: 'Credits' },
];

export interface DirectionCounts {
  all: number;
  debit: number;
  credit: number;
}

interface DirectionFilterProps {
  counts: DirectionCounts;
  direction: DirectionFilter;
  onChange: (direction: DirectionFilter) => void;
}

export function DirectionFilterControl({ counts, direction, onChange }: DirectionFilterProps) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      {OPTIONS.map((option) => {
        const selected = option.direction === direction;
        const count = counts[option.direction];

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={
              option.direction === 'all'
                ? `Show all transactions, ${count}`
                : `Show ${option.label.toLowerCase()}, ${count}`
            }
            key={option.direction}
            onPress={() => onChange(option.direction)}
            style={[styles.option, { backgroundColor: selected ? theme.backgroundActive : theme.backgroundElement }]}>
            <ThemedText numberOfLines={1} style={styles.label} type={selected ? 'smallBold' : 'small'}>
              {option.label}
            </ThemedText>
            <View
              style={[
                styles.count,
                { backgroundColor: selected ? theme.text : theme.background },
              ]}>
              <ThemedText
                style={[styles.countText, { color: selected ? theme.background : theme.text }]}
                type="small">
                {count}
              </ThemedText>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  label: {
    flexShrink: 1,
  },
  option: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.one,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  count: {
    alignItems: 'center',
    borderRadius: 11,
    height: 22,
    justifyContent: 'center',
    minWidth: 22,
    paddingHorizontal: Spacing.one,
  },
  countText: {
    fontSize: 12,
    lineHeight: 14,
  },
});
