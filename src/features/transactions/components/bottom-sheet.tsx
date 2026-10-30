import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  closeLabel: string;
  title?: string;
  selection?: string;
  header?: ReactNode;
  note?: string;
  maxHeight?: number | `${number}%`;
  children: ReactNode;
}

export function BottomSheet({
  visible,
  onClose,
  closeLabel,
  title,
  selection,
  header,
  note,
  maxHeight = '70%',
  children,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const layoutHeight = useRef(0);
  const contentHeight = useRef(0);
  const [hintVisible, setHintVisible] = useState(false);

  useEffect(() => {
    setHintVisible(false);
  }, [visible]);

  const refreshHint = (offsetY: number) => {
    const overflow = contentHeight.current > layoutHeight.current + 8;
    const atEnd = offsetY + layoutHeight.current >= contentHeight.current - 12;
    const next = overflow && !atEnd;

    setHintVisible((current) => (current === next ? current : next));
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.modal}>
        <Pressable accessibilityLabel={`${closeLabel} overlay`} accessibilityRole="button" onPress={onClose} style={styles.backdrop} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.background,
              maxHeight,
              paddingBottom: insets.bottom + Spacing.three,
            },
          ]}>
          <View style={[styles.chrome, { borderBottomColor: theme.backgroundSelected }]}>
            <View style={styles.chromeCopy}>
              {title === undefined ? null : <ThemedText style={styles.headingTitle}>{title}</ThemedText>}
              {selection === undefined ? null : (
                <ThemedText themeColor="textSecondary" type="small">
                  {selection}
                </ThemedText>
              )}
              {header}
            </View>
            <Pressable
              accessibilityLabel={closeLabel}
              accessibilityRole="button"
              hitSlop={8}
              onPress={onClose}
              style={[styles.closeButton, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText style={styles.closeIcon}>×</ThemedText>
            </Pressable>
          </View>
          <ScrollView
            onContentSizeChange={(_width, height) => {
              contentHeight.current = height;
              refreshHint(0);
            }}
            onLayout={(event) => {
              layoutHeight.current = event.nativeEvent.layout.height;
              refreshHint(0);
            }}
            onScroll={(event) => {
              refreshHint(event.nativeEvent.contentOffset.y);
            }}
            scrollEventThrottle={16}
            contentContainerStyle={styles.listContent}
            style={styles.list}>
            {children}
          </ScrollView>
          {hintVisible ? (
            <ThemedText accessibilityLabel="More content below" style={styles.hint} themeColor="textSecondary" type="small">
              Scroll down
            </ThemedText>
          ) : null}
          {note === undefined ? null : (
            <ThemedText themeColor="textSecondary" type="small">
              {note}
            </ThemedText>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    flex: 1,
  },
  modal: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: Spacing.three,
    borderTopRightRadius: Spacing.three,
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  chrome: {
    alignItems: 'flex-start',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: Spacing.two,
    marginHorizontal: -Spacing.four,
    paddingBottom: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  chromeCopy: {
    flex: 1,
    gap: Spacing.half,
    minWidth: 0,
  },
  headingTitle: {
    fontSize: 20,
    fontWeight: 700,
    lineHeight: 26,
  },
  closeButton: {
    alignItems: 'center',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  closeIcon: {
    fontSize: 22,
    fontWeight: 500,
    lineHeight: 26,
    textAlign: 'center',
  },
  list: {
    maxHeight: 360,
  },
  listContent: {
    gap: Spacing.one,
    paddingTop: Spacing.two,
  },
  hint: {
    textAlign: 'center',
  },
});
