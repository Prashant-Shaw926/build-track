import { type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

interface OptionSheetProps {
  title: string;
  open: boolean;
  closeLabel: string;
  onClose: () => void;
  note?: string;
  children: ReactNode;
}

export function OptionSheet({ title, open, closeLabel, onClose, note, children }: OptionSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal animationType="slide" transparent visible={open} onRequestClose={onClose}>
      <View style={styles.modal}>
        <Pressable accessibilityRole="button" accessibilityLabel={closeLabel} onPress={onClose} style={styles.backdrop} />
        <ThemedView style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.three }]}>
          <ThemedText type="smallBold">{title}</ThemedText>
          <ScrollView style={styles.list}>{children}</ScrollView>
          {note === undefined ? null : (
            <ThemedText type="small" themeColor="textSecondary">
              {note}
            </ThemedText>
          )}
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
    maxHeight: '60%',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    borderTopLeftRadius: Spacing.three,
    borderTopRightRadius: Spacing.three,
  },
  list: {
    maxHeight: 360,
  },
});
