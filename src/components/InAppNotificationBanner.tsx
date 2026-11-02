/**
 * InAppNotificationBanner (Global Floating Toast / Push Banner)
 *
 * ARCHITECTURE & PURPOSE:
 * - Location: `src/components/` (Reusable Component)
 * - Behavior: A floating push notification toast that slides down smoothly from the top
 *   of the screen whenever a real-time event occurs (e.g., incoming chat message, booking update,
 *   technician status change), inspired by Facebook's real-time in-app banners.
 * - Auto-dismisses after 4.5 seconds or immediately when tapped or swiped.
 * - Respects the user's push notification preference in Settings (can be toggled on/off).
 *
 * WHY NOT IN `src/app/`?
 * - Under Expo Router's architecture, files in `src/app/` are automatically treated as app routes/screens.
 * - Reusable UI widgets, modals, and global components belong in `src/components/`.
 *
 * RELATIONSHIP TO `src/app/notifications.tsx`:
 * - `src/components/InAppNotificationBanner.tsx`: Real-time transient pop-up across any screen.
 * - `src/app/notifications.tsx`: Full-page Notification Center where users view past history,
 *   filter by All/Recent/Old, and manage alerts.
 */

import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
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
import { useLanguage } from '../i18n/locale';
import { radii, spacing } from '../theme/tokens';
import { ICON_SIZE, ICON_STROKE } from '../theme/icons';
import { font } from '../theme/typography';

export function InAppNotificationBanner() {
  const { user } = useAuth();
  const { palette, reduceMotion } = useAppearance();
  const { language } = useLanguage();

  const [activeNotification, setActiveNotification] = useState<CepatNotification | null>(null);
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToInAppBanner(async (notif) => {
      // If user has push disabled in settings, do not show
      const pushEnabled = await getInAppPushEnabled();
      if (!pushEnabled) return;

      // Do not notify self
      if (user && notif.userId !== user.id) return;

      // Display banner
      setActiveNotification(notif);

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
  }, [user, reduceMotion, slideAnim]);

  const dismissBanner = () => {
    if (reduceMotion) {
      slideAnim.setValue(-120);
      setActiveNotification(null);
    } else {
      Animated.timing(slideAnim, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setActiveNotification(null);
      });
    }
  };

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
      router.push(String(notif.data.url) as any);
    } else {
      router.push('/notifications');
    }
  };

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
          transform: [{ translateY: slideAnim }],
        },
      ]}
      testID="in-app-push-banner"
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
  closeBtnText: {
    fontSize: font.subtitle,
    fontWeight: '700',
  },
  contentWrap: {
    flex: 1,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
  },
  iconText: {
    fontSize: font.section,
  },
  titleText: {
    fontSize: font.subtitle,
    fontWeight: '800',
  },
});
