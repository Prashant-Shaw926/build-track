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

interface DirectionFilterProps {
  direction: DirectionFilter;
  onChange: (direction: DirectionFilter) => void;
}

export function DirectionFilterControl({ direction, onChange }: DirectionFilterProps) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      {OPTIONS.map((option) => {
        const selected = option.direction === direction;

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={option.direction === 'all' ? 'Show all transactions' : `Show ${option.label.toLowerCase()}`}
            key={option.direction}
            onPress={() => onChange(option.direction)}
            style={[styles.option, { backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement }]}>
            <ThemedText type={selected ? 'smallBold' : 'small'}>{option.label}</ThemedText>
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
  option: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
  },
});
