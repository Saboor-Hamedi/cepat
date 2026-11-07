/**
 * InAppNotificationBanner (Global Floating Toast / Push Banner)
 *
 * ARCHITECTURE & PURPOSE:
 * - Location: `src/components/` (Reusable Component)
 * - Behavior: A floating push notification toast that slides down smoothly from the top
 *   of the screen whenever a real-time event occurs (e.g., incoming chat message, booking update,
 *   technician status change), inspired by Facebook's real-time in-app banners.
 * - Auto-dismisses after 4.5 seconds or immediately when swiped (left, right, or up).
 * - Respects the user's push notification preference in Settings (can be toggled on/off).
 */

import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Bell, ClipboardList, MessageSquare, X } from 'lucide-react-native';
import { useAuth } from '../auth/AuthProvider';
import { useAppearance } from '../context/AppearanceContext';
import {
  getInAppPushEnabled,
  markNotificationRead,
  subscribeToInAppBanner,
  type CepatNotification,
} from '../data/notifications';
import { radii, spacing } from '../theme/tokens';
import { ICON_SIZE, ICON_STROKE } from '../theme/icons';
import { font } from '../theme/typography';

export function InAppNotificationBanner() {
  const { user } = useAuth();
  const { palette, reduceMotion } = useAppearance();

  const [activeNotification, setActiveNotification] = useState<CepatNotification | null>(null);
  const [slideAnim] = useState(() => new Animated.Value(-120));
  const [panX] = useState(() => new Animated.Value(0));
  const [opacityAnim] = useState(() => new Animated.Value(1));
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetAnimations = useCallback(() => {
    slideAnim.setValue(-120);
    panX.setValue(0);
    opacityAnim.setValue(1);
    setActiveNotification(null);
  }, [opacityAnim, panX, slideAnim]);

  const dismissBanner = useCallback(() => {
    if (reduceMotion) {
      resetAnimations();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -120,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        resetAnimations();
      });
    }
  }, [opacityAnim, reduceMotion, resetAnimations, slideAnim]);

  const dismissHorizontal = useCallback((direction: 'left' | 'right') => {
    const toValue = direction === 'left' ? -380 : 380;
    if (reduceMotion) {
      resetAnimations();
    } else {
      Animated.parallel([
        Animated.timing(panX, {
          toValue,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(() => {
        resetAnimations();
      });
    }
  }, [opacityAnim, panX, reduceMotion, resetAnimations]);

  const handlePressBanner = async () => {
    if (!activeNotification) return;
    const notif = activeNotification;
    dismissBanner();

    // Mark as read in storage
    if (notif.userId) {
      await markNotificationRead(notif.userId, notif.id);
    }

    // Deep link directly to the target screen
    if (notif.data?.bookingId || notif.data?.booking_id) {
      const bId = String(notif.data.bookingId ?? notif.data.booking_id);
      router.push(`/booking/${bId}`);
    } else if (notif.data?.url) {
      router.push(String(notif.data.url) as never);
    } else {
      router.push('/notifications');
    }
  };

  // PanResponder for smooth swiping left, right, or up like Facebook / iOS banner
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return Math.abs(gestureState.dx) > 10 || gestureState.dy < -10;
        },
        onPanResponderMove: (_, gestureState) => {
          panX.setValue(gestureState.dx);
          if (gestureState.dy < 0) {
            slideAnim.setValue(gestureState.dy);
          }
          const dragDistance = Math.max(Math.abs(gestureState.dx), Math.abs(gestureState.dy));
          opacityAnim.setValue(Math.max(0.3, 1 - dragDistance / 240));
        },
        onPanResponderRelease: (_, gestureState) => {
          // Swiped left
          if (gestureState.dx < -45 || gestureState.vx < -0.4) {
            dismissHorizontal('left');
          }
          // Swiped right
          else if (gestureState.dx > 45 || gestureState.vx > 0.4) {
            dismissHorizontal('right');
          }
          // Swiped up
          else if (gestureState.dy < -25 || gestureState.vy < -0.4) {
            dismissBanner();
          }
          // Snapped back
          else {
            Animated.parallel([
              Animated.spring(panX, { toValue: 0, useNativeDriver: true }),
              Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }),
              Animated.timing(opacityAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
            ]).start();
          }
        },
      }),
    [dismissBanner, dismissHorizontal, opacityAnim, panX, slideAnim],
  );

  useEffect(() => {
    const unsubscribe = subscribeToInAppBanner(async (notif) => {
      // If user has push disabled in settings, do not show
      const pushEnabled = await getInAppPushEnabled();
      if (!pushEnabled) return;

      // Do not notify self
      if (user && notif.userId !== user.id) return;

      // Display banner
      setActiveNotification(notif);
      panX.setValue(0);
      opacityAnim.setValue(1);

      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);

      if (reduceMotion) {
        slideAnim.setValue(0);
      } else {
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 70,
          friction: 9,
        }).start();
      }

      // Auto dismiss after 4.5 seconds
      hideTimeoutRef.current = setTimeout(() => {
        dismissBanner();
      }, 4500);
    });

    return () => {
      unsubscribe();
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [user, reduceMotion, slideAnim, panX, opacityAnim, dismissBanner]);

  if (!activeNotification) {
    return null;
  }

  const title = activeNotification.title;
  const body = activeNotification.body;

  return (
    <Animated.View
      style={[
        styles.bannerWrapper,
        {
          opacity: opacityAnim,
          transform: [
            { translateY: slideAnim },
            { translateX: panX },
          ],
        },
      ]}
      testID="in-app-push-banner"
      {...panResponder.panHandlers}
    >
      <Pressable
        accessibilityRole="button"
        onPress={() => void handlePressBanner()}
        style={[
          styles.bannerCard,
          {
            backgroundColor: palette.surface,
            borderColor: palette.border,
            shadowColor: '#000000',
          },
        ]}
      >
        <View style={styles.iconContainer}>
          {activeNotification.type === 'message' ? (
            <MessageSquare color={palette.primary} size={ICON_SIZE} strokeWidth={ICON_STROKE} />
          ) : activeNotification.type === 'booking' ? (
            <ClipboardList color={palette.primary} size={ICON_SIZE} strokeWidth={ICON_STROKE} />
          ) : (
            <Bell color={palette.primary} size={ICON_SIZE} strokeWidth={ICON_STROKE} />
          )}
        </View>

        <View style={styles.contentWrap}>
          <Text numberOfLines={1} style={[styles.titleText, { color: palette.text }]}>
            {title}
          </Text>
          <Text numberOfLines={2} style={[styles.bodyText, { color: palette.textMuted }]}>
            {body}
          </Text>
        </View>

        <Pressable
          accessibilityLabel="Dismiss"
          accessibilityRole="button"
          hitSlop={12}
          onPress={dismissBanner}
          style={styles.closeBtn}
        >
          <X color={palette.textMuted} size={ICON_SIZE} strokeWidth={ICON_STROKE} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bannerCard: {
    alignItems: 'center',
    borderRadius: radii.lg,
    borderWidth: 1,
    elevation: 12,
    flexDirection: 'row',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
  bannerWrapper: {
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 9999,
  },
  bodyText: {
    fontSize: font.body,
    lineHeight: 16,
    marginTop: 2,
  },
  closeBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
  },
  contentWrap: {
    flex: 1,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
  },
  titleText: {
    fontSize: font.subtitle,
    fontWeight: '800',
  },
});
