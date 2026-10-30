import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { DirectionFilterControl, type DirectionCounts } from '@/features/transactions/components/direction-filter';
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
  directionCounts: DirectionCounts;
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
  directionCounts,
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
  const categoryLabel = categoryFilterLabel(category);
  const categoryActive = category.type !== 'all';
  const sortActive = sort !== 'source';

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
          accessibilityLabel={categoryActive ? `Filters on, ${categoryLabel}` : `Filters, ${categoryLabel}`}
          accessibilityState={{ selected: categoryActive }}
          onPress={() => setCategoryOpen(true)}
          style={[styles.action, { backgroundColor: categoryActive ? theme.backgroundActive : theme.backgroundElement }]}>
          {categoryActive ? <View style={[styles.mark, { backgroundColor: theme.text }]} /> : null}
          <ThemedText numberOfLines={1} style={styles.actionLabel} type={categoryActive ? 'smallBold' : 'small'}>
            {categoryLabel}
          </ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={sortActive ? `Sort on, ${sortLabel}` : 'Sort transactions'}
          accessibilityState={{ selected: sortActive }}
          onPress={() => setSortOpen(true)}
          style={[styles.action, { backgroundColor: sortActive ? theme.backgroundActive : theme.backgroundElement }]}>
          {sortActive ? <View style={[styles.mark, { backgroundColor: theme.text }]} /> : null}
          <ThemedText numberOfLines={1} style={styles.actionLabel} type={sortActive ? 'smallBold' : 'small'}>
            {sortLabel}
          </ThemedText>
        </Pressable>
      </View>
      <DirectionFilterControl counts={directionCounts} direction={direction} onChange={onDirectionChange} />
      <OptionSheet
        closeLabel="Close filters"
        onClose={() => setCategoryOpen(false)}
        open={categoryOpen}
        selection={`Selected: ${categoryLabel}`}
        title="Filters">
        {choices.map((choice) => {
          const selected = categoryFilterKey(choice.filter) === categoryFilterKey(category);

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={categoryFilterKey(choice.filter)}
              onPress={() => {
                onCategoryChange(choice.filter);
                setCategoryOpen(false);
              }}
              style={[styles.option, { backgroundColor: selected ? theme.backgroundActive : theme.backgroundElement }]}>
              <ThemedText type={selected ? 'smallBold' : 'small'}>{choice.label}</ThemedText>
              {selected ? <ThemedText type="smallBold">✓</ThemedText> : null}
            </Pressable>
          );
        })}
      </OptionSheet>
      <OptionSheet
        closeLabel="Close sort"
        note={AMOUNT_SORT_NOTE}
        onClose={() => setSortOpen(false)}
        open={sortOpen}
        selection={`Selected: ${sortLabel}`}
        title="Sort">
        {TRACK_SORT_OPTIONS.map((option) => {
          const selected = option.sort === sort;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={option.sort}
              onPress={() => {
                onSortChange(option.sort);
                setSortOpen(false);
              }}
              style={[styles.option, { backgroundColor: selected ? theme.backgroundActive : theme.backgroundElement }]}>
              <ThemedText type={selected ? 'smallBold' : 'small'}>{option.label}</ThemedText>
              {selected ? <ThemedText type="smallBold">✓</ThemedText> : null}
            </Pressable>
          );
        })}
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
    flexDirection: 'row',
    gap: Spacing.one,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
  },
  actionLabel: {
    flexShrink: 1,
  },
  mark: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  option: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
