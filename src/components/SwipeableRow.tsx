import { CheckCheck, Mail, Trash2 } from 'lucide-react-native';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAppearance } from '../context/AppearanceContext';
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
  const { palette } = useAppearance();
  const [pan] = useState(() => new Animated.Value(0));
  const [swipedOpen, setSwipedOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const hasMultiActions = Boolean(onToggleRead && onDelete);
  const actionWidth = hasMultiActions ? 148 : 76;
  const snapTarget = -actionWidth;

  const closeRow = useCallback(() => {
    setSwipedOpen(false);
    setIsDragging(false);
    Animated.spring(pan, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
    }).start();
  }, [pan]);

  const openRow = useCallback(() => {
    setSwipedOpen(true);
    setIsDragging(false);
    Animated.spring(pan, {
      toValue: snapTarget,
      useNativeDriver: true,
      bounciness: 0,
    }).start();
  }, [pan, snapTarget]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 10 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.3,
        onPanResponderGrant: () => {
          setIsDragging(true);
        },
        onPanResponderMove: (_, gestureState) => {
          if (!swipedOpen) {
            if (gestureState.dx < 0) {
              pan.setValue(Math.max(snapTarget - 16, gestureState.dx));
            } else {
              pan.setValue(0);
            }
          } else {
            const nextX = snapTarget + gestureState.dx;
            pan.setValue(Math.min(0, Math.max(snapTarget - 16, nextX)));
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (!swipedOpen) {
            if (gestureState.dx < -28 || gestureState.vx < -0.35) {
              openRow();
            } else {
              closeRow();
            }
          } else {
            if (gestureState.dx > 24 || gestureState.vx > 0.3) {
              closeRow();
            } else {
              openRow();
            }
          }
        },
        onPanResponderTerminate: () => {
          if (swipedOpen) {
            openRow();
          } else {
            closeRow();
          }
        },
      }),
    [closeRow, openRow, pan, snapTarget, swipedOpen],
  );

  const deleteLabel =
    deleteAccessibilityLabel ?? (language === 'en' ? 'Delete' : 'Hapus');

  const readLabel = isRead
    ? language === 'en'
      ? 'Unread'
      : 'Belum'
    : language === 'en'
      ? 'Read'
      : 'Dibaca';

  // Slide actions in from the right edge in lockstep with the row so they NEVER overlap the row content
  const actionsTranslateX = useMemo(
    () =>
      pan.interpolate({
        inputRange: [snapTarget, 0],
        outputRange: [0, actionWidth],
        extrapolate: 'clamp',
      }),
    [actionWidth, pan, snapTarget],
  );

  const actionsOpacity = useMemo(
    () =>
      pan.interpolate({
        inputRange: [snapTarget, -12, 0],
        outputRange: [1, 0.9, 0],
        extrapolate: 'clamp',
      }),
    [pan, snapTarget],
  );

  const showActionsLayer = isDragging || swipedOpen;

  return (
    <View style={[styles.rowWrap, { backgroundColor: palette.background }]}>
      {/* Background / Side Action Drawer — pushed off-screen right (+actionWidth) when closed so it never overlaps the row or flashes on load */}
      <Animated.View
        pointerEvents={swipedOpen ? 'auto' : 'none'}
        style={[
          styles.actionsDrawer,
          {
            width: actionWidth,
            opacity: showActionsLayer ? actionsOpacity : 0,
            transform: [{ translateX: actionsTranslateX }],
          },
        ]}
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
              <CheckCheck
                color="#FFFFFF"
                size={ICON_SIZE}
                strokeWidth={ICON_STROKE}
              />
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
            <Trash2
              color="#FFFFFF"
              size={ICON_SIZE}
              strokeWidth={ICON_STROKE}
            />
            <Text style={styles.actionButtonText}>{deleteLabel}</Text>
          </Pressable>
        )}
      </Animated.View>

      {/* Foreground Content Row */}
      <Animated.View
        style={[
          styles.row,
          {
            backgroundColor: palette.background,
            transform: [{ translateX: pan }],
          },
        ]}
        {...panResponder.panHandlers}
        testID={testID}
      >
        {children}
        {swipedOpen && (
          <Pressable
            accessibilityLabel="Close row"
            onPress={closeRow}
            style={StyleSheet.absoluteFill}
          />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  rowWrap: {
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  row: {
    width: '100%',
    zIndex: 2,
  },
  actionsDrawer: {
    alignItems: 'stretch',
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 1,
  },
  deleteButton: {
    alignItems: 'center',
    backgroundColor: '#EF4444',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  readButton: {
    alignItems: 'center',
    backgroundColor: '#0284C7',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: font.caption,
    fontWeight: '700',
    marginTop: 2,
  },
});
