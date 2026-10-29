import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

const CLOSE_DISTANCE = 80;
const CLOSE_VELOCITY = 800;

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
  const translateY = useSharedValue(0);
  const layoutHeight = useRef(0);
  const contentHeight = useRef(0);
  const [hintVisible, setHintVisible] = useState(false);

  useEffect(() => {
    translateY.value = 0;
    setHintVisible(false);
  }, [translateY, visible]);

  const finishClose = () => {
    translateY.value = 0;
    onClose();
  };

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      translateY.value = Math.max(0, event.translationY);
    })
    .onEnd((event) => {
      if (event.translationY > CLOSE_DISTANCE || event.velocityY > CLOSE_VELOCITY) {
        translateY.value = withTiming(480, { duration: 180 }, (finished) => {
          if (finished) {
            runOnJS(finishClose)();
          }
        });
        return;
      }

      translateY.value = withSpring(0);
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const refreshHint = (offsetY: number) => {
    const overflow = contentHeight.current > layoutHeight.current + 8;
    const atEnd = offsetY + layoutHeight.current >= contentHeight.current - 12;
    const next = overflow && !atEnd;

    setHintVisible((current) => (current === next ? current : next));
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <GestureHandlerRootView style={styles.modal}>
        <Pressable accessibilityLabel={closeLabel} accessibilityRole="button" onPress={onClose} style={styles.backdrop} />
        <Animated.View
          style={[
            styles.sheet,
            sheetStyle,
            {
              backgroundColor: theme.background,
              maxHeight,
              paddingBottom: insets.bottom + Spacing.three,
            },
          ]}>
          <GestureDetector gesture={gesture}>
            <View accessibilityLabel="Drag down to close" accessibilityRole="adjustable" style={styles.handleHit}>
              <View style={[styles.pill, { backgroundColor: theme.backgroundSelected }]} />
            </View>
          </GestureDetector>
          {title === undefined && selection === undefined && header === undefined ? null : (
            <View style={[styles.heading, { borderBottomColor: theme.backgroundSelected }]}>
              {title === undefined ? null : <ThemedText style={styles.headingTitle}>{title}</ThemedText>}
              {selection === undefined ? null : (
                <ThemedText themeColor="textSecondary" type="small">
                  {selection}
                </ThemedText>
              )}
              {header}
            </View>
          )}
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
        </Animated.View>
      </GestureHandlerRootView>
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
  },
  heading: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.half,
    marginHorizontal: -Spacing.four,
    paddingBottom: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  headingTitle: {
    fontSize: 20,
    fontWeight: 700,
    lineHeight: 26,
  },
  handleHit: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  pill: {
    borderRadius: 2,
    height: 4,
    width: 36,
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
