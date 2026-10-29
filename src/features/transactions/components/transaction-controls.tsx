import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { DirectionFilterControl } from '@/features/transactions/components/direction-filter';
import { OptionSheet } from '@/features/transactions/components/option-sheet';
import { useTheme } from '@/hooks/use-theme';
import {
  AMOUNT_SORT_NOTE,
  categoryFilterKey,
  categoryFilterLabel,
  TRACK_SORT_OPTIONS,
  type CategoryChoice,
  type CategoryFilter,
  type DirectionFilter,
  type TrackSort,
} from '@/features/transactions/utils/track-list';
import { Spacing } from '@/constants/theme';

interface TransactionControlsProps {
  query: string;
  category: CategoryFilter;
  sort: TrackSort;
  direction: DirectionFilter;
  choices: readonly CategoryChoice[];
  onQueryChange: (query: string) => void;
  onCategoryChange: (category: CategoryFilter) => void;
  onSortChange: (sort: TrackSort) => void;
  onDirectionChange: (direction: DirectionFilter) => void;
}

export function TransactionControls({
  query,
  category,
  sort,
  direction,
  choices,
  onQueryChange,
  onCategoryChange,
  onSortChange,
  onDirectionChange,
}: TransactionControlsProps) {
  const theme = useTheme();
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const sortLabel = TRACK_SORT_OPTIONS.find((option) => option.sort === sort)?.label ?? 'Source order';

  return (
    <View style={styles.wrap}>
      <TextInput
        accessibilityLabel="Search merchants"
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        onChangeText={onQueryChange}
        placeholder="Search merchants"
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
        value={query}
      />
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Filter by category"
          onPress={() => setCategoryOpen(true)}
          style={[styles.action, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="small">{categoryFilterLabel(category)}</ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sort transactions"
          onPress={() => setSortOpen(true)}
          style={[styles.action, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="small">{sortLabel}</ThemedText>
        </Pressable>
      </View>
      <DirectionFilterControl direction={direction} onChange={onDirectionChange} />
      <OptionSheet closeLabel="Close categories" onClose={() => setCategoryOpen(false)} open={categoryOpen} title="Category">
        {choices.map((choice) => {
          const selected = categoryFilterKey(choice.filter) === categoryFilterKey(category);

          return (
            <Pressable
              accessibilityRole="button"
              key={categoryFilterKey(choice.filter)}
              onPress={() => {
                onCategoryChange(choice.filter);
                setCategoryOpen(false);
              }}
              style={styles.option}>
              <ThemedText type={selected ? 'smallBold' : 'small'}>{choice.label}</ThemedText>
            </Pressable>
          );
        })}
      </OptionSheet>
      <OptionSheet
        closeLabel="Close sort"
        note={AMOUNT_SORT_NOTE}
        onClose={() => setSortOpen(false)}
        open={sortOpen}
        title="Sort">
        {TRACK_SORT_OPTIONS.map((option) => (
          <Pressable
            accessibilityRole="button"
            key={option.sort}
            onPress={() => {
              onSortChange(option.sort);
              setSortOpen(false);
            }}
            style={styles.option}>
            <ThemedText type={option.sort === sort ? 'smallBold' : 'small'}>{option.label}</ThemedText>
          </Pressable>
        ))}
      </OptionSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  input: {
    borderRadius: Spacing.two,
    fontSize: 16,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  action: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
  },
  option: {
    paddingVertical: Spacing.two,
  },
});
