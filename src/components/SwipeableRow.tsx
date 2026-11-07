import { CheckCheck, Mail, Trash2 } from 'lucide-react-native';
import { useMemo, useState, type ReactNode } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

import { useLanguage } from '../i18n/locale';
import { ICON_SIZE, ICON_STROKE } from '../theme/icons';
import { font } from '../theme/typography';

export interface SwipeableRowProps {
  children: ReactNode;
  onDelete?: () => void;
  onToggleRead?: () => void;
  isRead?: boolean;
  testID?: string;
  deleteAccessibilityLabel?: string;
  deleteTestID?: string;
  readTestID?: string;
}

export function SwipeableRow({
  children,
  onDelete,
  onToggleRead,
  isRead = false,
  testID,
  deleteAccessibilityLabel,
  deleteTestID,
  readTestID = 'swipe-toggle-read',
}: SwipeableRowProps) {
  const { language } = useLanguage();
  const [pan] = useState(() => new Animated.Value(0));
  const [swipedOpen, setSwipedOpen] = useState(false);

  const hasMultiActions = Boolean(onToggleRead && onDelete);
  const snapTarget = hasMultiActions ? -150 : -85;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 10,
        onPanResponderMove: (_, gestureState) => {
          if (!swipedOpen) {
            if (gestureState.dx < 0) {
              pan.setValue(Math.max(snapTarget - 20, gestureState.dx));
            }
          } else {
            if (gestureState.dx > 0) {
              pan.setValue(Math.min(0, snapTarget + gestureState.dx));
            } else if (gestureState.dx < 0) {
              pan.setValue(Math.max(snapTarget - 20, snapTarget + gestureState.dx));
            }
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (!swipedOpen) {
            if (gestureState.dx < -30) {
              Animated.spring(pan, { toValue: snapTarget, useNativeDriver: true }).start();
              setSwipedOpen(true);
            } else {
              Animated.spring(pan, { toValue: 0, useNativeDriver: true }).start();
              setSwipedOpen(false);
            }
          } else {
            if (gestureState.dx > 30) {
              Animated.spring(pan, { toValue: 0, useNativeDriver: true }).start();
              setSwipedOpen(false);
            } else {
              Animated.spring(pan, { toValue: snapTarget, useNativeDriver: true }).start();
              setSwipedOpen(true);
            }
          }
        },
      }),
    [pan, snapTarget, swipedOpen],
  );

  const closeRow = () => {
    Animated.spring(pan, { toValue: 0, useNativeDriver: true }).start();
    setSwipedOpen(false);
  };

  const deleteLabel =
    deleteAccessibilityLabel ?? (language === 'en' ? 'Delete' : 'Hapus');

  const readLabel = isRead
    ? (language === 'en' ? 'Unread' : 'Belum')
    : (language === 'en' ? 'Read' : 'Dibaca');

  const actionsOpacity = useMemo(
    () =>
      pan.interpolate({
        inputRange: [snapTarget, -16, -2, 0],
        outputRange: [1, 0.85, 0, 0],
        extrapolate: 'clamp',
      }),
    [pan, snapTarget],
  );

  return (
    <View style={styles.rowWrap}>
      <Animated.View
        style={[styles.row, { transform: [{ translateX: pan }] }]}
        {...panResponder.panHandlers}
        testID={testID}
      >
        {children}
        {swipedOpen && (
          <Pressable
            accessibilityLabel="Close row"
            onPress={closeRow}
            style={[StyleSheet.absoluteFill, { right: hasMultiActions ? 150 : 85 }]}
          />
        )}
      </Animated.View>

      <Animated.View
        pointerEvents={swipedOpen ? 'auto' : 'none'}
        style={[styles.actionsBackground, { opacity: actionsOpacity }]}
      >
        {onToggleRead && (
          <Pressable
            accessibilityLabel={readLabel}
            accessibilityRole="button"
            onPress={() => {
              closeRow();
              onToggleRead();
            }}
            style={styles.readButton}
            testID={readTestID}
          >
            {isRead ? (
              <Mail color="#FFFFFF" size={ICON_SIZE} strokeWidth={ICON_STROKE} />
            ) : (
              <CheckCheck color="#FFFFFF" size={ICON_SIZE} strokeWidth={ICON_STROKE} />
            )}
            <Text style={styles.actionButtonText}>{readLabel}</Text>
          </Pressable>
        )}

        {onDelete && (
          <Pressable
            accessibilityLabel={deleteLabel}
            accessibilityRole="button"
            onPress={() => {
              closeRow();
              onDelete();
            }}
            style={styles.deleteButton}
            testID={deleteTestID}
          >
            <Trash2 color="#FFFFFF" size={ICON_SIZE} strokeWidth={ICON_STROKE} />
            <Text style={styles.actionButtonText}>{deleteLabel}</Text>
          </Pressable>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: font.caption,
    fontWeight: '700',
    marginTop: 2,
  },
  actionsBackground: {
    alignItems: 'center',
    bottom: 0,
    elevation: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 10,
  },
  deleteButton: {
    alignItems: 'center',
    backgroundColor: '#EF4444',
    height: '100%',
    justifyContent: 'center',
    minWidth: 72,
    paddingHorizontal: 12,
  },
  readButton: {
    alignItems: 'center',
    backgroundColor: '#0284C7',
    height: '100%',
    justifyContent: 'center',
    minWidth: 72,
    paddingHorizontal: 12,
  },
  row: {
    width: '100%',
  },
  rowWrap: {
    overflow: 'hidden',
    position: 'relative',
  },
});
