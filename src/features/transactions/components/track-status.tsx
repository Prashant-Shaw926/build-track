import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

interface TrackStatusProps {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function TrackStatus({ title, message, actionLabel, onAction }: TrackStatusProps) {
  return (
    <ThemedView type="backgroundElement" style={styles.container}>
      <ThemedText type="smallBold">{title}</ThemedText>
      {message === undefined ? null : (
        <ThemedText type="small" themeColor="textSecondary">
          {message}
        </ThemedText>
      )}
      {actionLabel === undefined || onAction === undefined ? null : (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.action}>
          <ThemedText type="smallBold">{actionLabel}</ThemedText>
        </Pressable>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
    marginHorizontal: Spacing.three,
    marginTop: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  action: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
  },
});
