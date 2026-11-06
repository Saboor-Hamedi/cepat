import { Trash2 } from 'lucide-react-native';
import { useMemo, useState, type ReactNode } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

import { useLanguage } from '../i18n/locale';
import { ICON_SIZE, ICON_STROKE } from '../theme/icons';
import { font } from '../theme/typography';

export interface SwipeableRowProps {
  children: ReactNode;
  onDelete: () => void;
  testID?: string;
  deleteAccessibilityLabel?: string;
  deleteTestID?: string;
}

export function SwipeableRow({
  children,
  onDelete,
  testID,
  deleteAccessibilityLabel,
  deleteTestID,
}: SwipeableRowProps) {
  const { language } = useLanguage();
  const [pan] = useState(() => new Animated.Value(0));
  const [swipedOpen, setSwipedOpen] = useState(false);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 10,
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dx < 0) {
            pan.setValue(Math.max(-90, gestureState.dx));
          } else if (swipedOpen && gestureState.dx > 0) {
            pan.setValue(Math.min(0, -90 + gestureState.dx));
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx < -35) {
            Animated.spring(pan, { toValue: -90, useNativeDriver: true }).start();
            setSwipedOpen(true);
          } else {
            Animated.spring(pan, { toValue: 0, useNativeDriver: true }).start();
            setSwipedOpen(false);
          }
        },
      }),
    [pan, swipedOpen],
  );

  const label =
    deleteAccessibilityLabel ?? (language === 'en' ? 'Delete' : 'Hapus');

  const deleteOpacity = useMemo(
    () =>
      pan.interpolate({
        inputRange: [-90, -16, -2, 0],
        outputRange: [1, 0.85, 0, 0],
        extrapolate: 'clamp',
      }),
    [pan],
  );

  return (
    <View style={styles.rowWrap}>
      <Animated.View
        pointerEvents={swipedOpen ? 'auto' : 'none'}
        style={[styles.deleteBackground, { opacity: deleteOpacity }]}
      >
        <Pressable
          accessibilityLabel={label}
          accessibilityRole="button"
          onPress={onDelete}
          style={styles.deleteButton}
          testID={deleteTestID}
        >
          <Trash2 color="#FFFFFF" size={ICON_SIZE} strokeWidth={ICON_STROKE} />
          <Text style={styles.deleteButtonText}>{label}</Text>
        </Pressable>
      </Animated.View>
      <Animated.View
        style={[styles.row, { transform: [{ translateX: pan }] }]}
        {...panResponder.panHandlers}
        testID={testID}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  rowWrap: {
    overflow: 'hidden',
    position: 'relative',
  },
  row: {
    width: '100%',
  },
  deleteBackground: {
    alignItems: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 14,
    bottom: 12,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'absolute',
    right: 2,
    top: 2,
    width: 88,
  },
  deleteButton: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
    justifyContent: 'center',
    width: '100%',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: font.caption,
    fontWeight: '800',
  },
});
