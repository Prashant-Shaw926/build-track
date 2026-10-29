import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { TrackFailure } from '@/features/transactions/utils/track-month';
import { Spacing } from '@/constants/theme';

interface TrackFailuresProps {
  failures: readonly TrackFailure[];
}

export function TrackFailures({ failures }: TrackFailuresProps) {
  const [expanded, setExpanded] = useState(false);

  if (failures.length === 0) {
    return null;
  }

  const label = failures.length === 1 ? '1 transaction could not be read' : `${failures.length} transactions could not be read`;

  return (
    <ThemedView type="backgroundElement" style={styles.container}>
      <Pressable accessibilityRole="button" onPress={() => setExpanded((open) => !open)}>
        <ThemedText type="smallBold">{label}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {expanded ? 'Hide details' : 'Show details'}
        </ThemedText>
      </Pressable>
      {expanded
        ? failures.map((failure) => (
            <ThemedText key={`${failure.index}-${failure.id ?? 'missing'}`} type="small" themeColor="textSecondary">
              {failure.id ?? 'Missing id'} · {failure.reason}
            </ThemedText>
          ))
        : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
    marginHorizontal: Spacing.three,
    marginTop: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
});
