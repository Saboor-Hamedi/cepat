/**
 * NotificationsScreen (Dedicated Full-Page Notifications Center)
 *
 * ARCHITECTURE & PURPOSE:
 * - Location: `src/app/notifications.tsx` (Expo Router Route / Screen: `/notifications`)
 * - Behavior: Dedicated full-screen Notification Inbox (like Facebook's Notifications Tab),
 *   allowing users to view all incoming task updates, booking requests, and chat alerts,
 *   with category filter tabs (All, Recent, Old), live unread badges, pull-to-refresh,
 *   and mark-all-read capabilities.
 *
 * WHY IS THIS IN `src/app/`?
 * - In Expo Router, every file directly inside `src/app/` defines a navigation route.
 * - This file represents the `/notifications` screen URL.
 *
 * RELATIONSHIP TO `src/components/InAppNotificationBanner.tsx`:
 * - `src/app/notifications.tsx`: The full historical page with filters and persistent records.
 * - `src/components/InAppNotificationBanner.tsx`: The transient toast pop-up that slides down
 *   on top of whatever screen the user is currently looking at.
 */

import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { font } from '../theme/typography';
import {
  Animated,
  PanResponder,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Bell,
  Calendar,
  CheckCircle2,
  Handshake,
  MessageSquare,
  Trash2,
  Wrench,
} from 'lucide-react-native';
import { ICON_SIZE, ICON_STROKE } from '../theme/icons';
import { useAuth } from '../auth/AuthProvider';
import { AppNavigationBar, EmptyState, LoadingState } from '../components/marketplace-ui';
import { BackHeader } from "../components/BackHeader";
import { StatusFilterPills } from '../bookings';
import { useAppearance, type ThemePalette } from '../context/AppearanceContext';
import {
  deleteNotification,
  loadNotifications,
  markAllNotificationsRead,
  markBookingNotificationsRead,
  markNotificationRead,
  subscribeToNotificationChanges,
  subscribeToNotifications,
  type CepatNotification,
} from '../data/notifications';
import { useLanguage } from '../i18n/locale';
import { spacing } from '../theme/tokens';

export type NotificationTabKey = 'all' | 'unread' | 'bookings' | 'messages';
export type NotificationFilterTab = NotificationTabKey;

function isMessageNotification(item: CepatNotification): boolean {
  const event = item.data.event;
  return item.type === 'message' || event === 'chat_message';
}

function isBookingNotification(item: CepatNotification): boolean {
  const event = item.data.event;
  return typeof event === 'string' && event.startsWith('booking_');
}

function isMutedTheme(palette: ThemePalette): boolean {
  return palette.background === '#000000';
}

export default function NotificationsScreen() {
  const { user } = useAuth();
  const userId = user?.id;
  const { language } = useLanguage();
  const { palette } = useAppearance();
  const isDark = isMutedTheme(palette);
  const styles = useMemo(() => createStyles(palette, isDark), [isDark, palette]);
  const [notifications, setNotifications] = useState<CepatNotification[]>([]);
  const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(userId));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<NotificationTabKey>('all');

  const refresh = useCallback(async (isRefresh = false) => {
    if (!userId) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const next = await loadNotifications(userId);
      setNotifications(next);
      setLoadedForUserId(userId);
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'notifications_load_failed',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    void loadNotifications(userId)
      .then((next) => {
        if (!active) return;
        setNotifications(next);
        setLoadedForUserId(userId);
        setError(null);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'notifications_load_failed',
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    const unsubscribe = subscribeToNotifications(userId, () => {
      void refresh(true);
    });
    const unsubscribeChanges = subscribeToNotificationChanges(() => {
      void refresh(true);
    });
    return () => {
      active = false;
      unsubscribe();
      unsubscribeChanges();
    };
  }, [refresh, userId]);

  const handleMarkAllRead = async () => {
    if (!userId) return;
    try {
      await markAllNotificationsRead(userId);
      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((item) => item.readAt ? item : { ...item, readAt }),
      );
      setError(null);
    } catch (markError) {
      setError(
        markError instanceof Error
          ? markError.message
          : 'notifications_mark_all_read_failed',
      );
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    if (!userId) return;
    // Optimistic delete
    setNotifications((current) => current.filter((item) => item.id !== notificationId));
    try {
      await deleteNotification(userId, notificationId);
    } catch {
      void refresh(true);
    }
  };

  const handleOpenNotification = async (item: CepatNotification) => {
    if (!userId) return;
    try {
      if (!item.readAt) await markNotificationRead(userId, item.id);
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === item.id && !notification.readAt
            ? { ...notification, readAt: new Date().toISOString() }
            : notification,
        ),
      );
      const bookingId = item.data.booking_id ?? item.data.bookingId;
      if (typeof bookingId === 'string' && bookingId.length > 0) {
        await markBookingNotificationsRead(userId, bookingId);
        router.push(`/booking/${encodeURIComponent(bookingId)}`);
      }
    } catch (markError) {
      setError(
        markError instanceof Error
          ? markError.message
          : 'notification_mark_read_failed',
      );
    }
  };

  const visibleNotifications = useMemo(
    () => (loadedForUserId === userId ? notifications : []),
    [loadedForUserId, notifications, userId],
  );
  const unreadCount = visibleNotifications.filter((item) => !item.readAt).length;

  const filteredNotifications = useMemo(() => {
    if (filterTab === 'unread') {
      return visibleNotifications.filter((item) => !item.readAt);
    }
    if (filterTab === 'bookings') {
      return visibleNotifications.filter(isBookingNotification);
    }
    if (filterTab === 'messages') {
      return visibleNotifications.filter(isMessageNotification);
    }
    return visibleNotifications;
  }, [filterTab, visibleNotifications]);

  const tabs: { key: NotificationFilterTab; label: string; count?: number; testID?: string }[] = [
    {
      key: 'all',
      label: language === 'en' ? 'All' : 'Semua',
      count: visibleNotifications.length,
      testID: 'notification-tab-all',
    },
    {
      key: 'unread',
      label: language === 'en' ? 'Unread' : 'Belum Dibaca',
      count: unreadCount,
      testID: 'notification-tab-unread',
    },
    {
      key: 'bookings',
      label: language === 'en' ? 'Bookings' : 'Pesanan',
      testID: 'notification-tab-bookings',
    },
    {
      key: 'messages',
      label: language === 'en' ? 'Messages' : 'Pesan',
      testID: 'notification-tab-messages',
    },
  ];

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            onRefresh={() => void refresh(true)}
            refreshing={refreshing}
            tintColor={palette.primary}
          />
        }
      >
        {/* Sleek Header Bar matching Booking and Task */}
        <BackHeader
          title={language === "en" ? "Notifications" : "Notifikasi"}
          backBtnTestID="notifications-header-back-btn"
          testID="notifications-screen-header"
          rightElement={
            unreadCount > 0 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => void handleMarkAllRead()}
                style={[styles.markAllButton, { paddingVertical: 6, paddingHorizontal: 10 }]}
                testID="notifications-mark-all-read"
              >
                <Text style={styles.markAllText}>
                  {language === 'en' ? 'Mark read' : 'Tandai dibaca'}
                </Text>
              </Pressable>
            ) : null
          }
        />

        {/* Facebook-style Category Filter Tabs */}
        {visibleNotifications.length > 0 && (
          <StatusFilterPills
            activeTab={filterTab}
            onSelectTab={(tab) => setFilterTab(tab as NotificationFilterTab)}
            tabs={tabs}
            testIDPrefix="notifications-tab"
          />
        )}

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void refresh()}
              testID="notifications-retry"
            >
              <Text style={styles.retryText}>
                {language === 'en' ? 'Try again' : 'Coba lagi'}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {loading ? (
          <LoadingState
            label={language === 'en' ? 'Loading notifications...' : 'Memuat notifikasi...'}
          />
        ) : visibleNotifications.length === 0 ? (
          <EmptyState
            title={language === 'en' ? 'You are all caught up' : 'Belum ada notifikasi'}
            description={
              language === 'en'
                ? 'Booking requests, messages, and updates will appear here.'
                : 'Permintaan pesanan, pesan, dan pembaruannya akan muncul di sini.'
            }
            actionLabel={language === 'en' ? 'Explore services' : 'Jelajahi layanan'}
            onAction={() => router.push('/')}
          />
        ) : filteredNotifications.length === 0 ? (
          <EmptyState
            title={
              filterTab === 'unread'
                ? (language === 'en' ? 'All caught up' : 'Semua sudah dibaca')
                : filterTab === 'bookings'
                  ? (language === 'en' ? 'No booking notifications' : 'Belum ada notifikasi pesanan')
                  : (language === 'en' ? 'No messages yet' : 'Belum ada pesan')
            }
            description={
              language === 'en'
                ? 'Check the "All" tab to view your complete activity history.'
                : 'Lihat tab "Semua" untuk melihat riwayat aktivitas lengkap.'
            }
            actionLabel={language === 'en' ? 'Show all' : 'Tampilkan semua'}
            onAction={() => setFilterTab('all')}
          />
        ) : (
          <View style={styles.notificationList}>
            {filteredNotifications.map((item) => (
              <SwipeableNotificationCard
                key={item.id}
                item={item}
                language={language}
                onDelete={() => void handleDeleteNotification(item.id)}
                onPress={() => void handleOpenNotification(item)}
                palette={palette}
                styles={styles}
              />
            ))}
          </View>
        )}
      </ScrollView>
      <AppNavigationBar activeTab="notifications" />
    </SafeAreaView>
  );
}

type NotificationTone = 'booking' | 'message' | 'generic';

function notificationTone(item: CepatNotification): NotificationTone {
  if (isMessageNotification(item)) return 'message';
  if (isBookingNotification(item)) return 'booking';
  return 'generic';
}

const TONE_STYLES: Record<'booking' | 'message', { backgroundColor: string; color: string }> = {
  booking: { backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10B981' },
  message: { backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8' },
};

function SwipeableNotificationCard({
  item,
  language,
  palette,
  styles,
  onPress,
  onDelete,
}: {
  item: CepatNotification;
  language: 'id' | 'en';
  palette: ThemePalette;
  styles: ReturnType<typeof createStyles>;
  onPress: () => void;
  onDelete: () => void;
}) {
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

  const tone = notificationTone(item);
  const toneStyle = tone === 'generic' ? null : TONE_STYLES[tone];

  return (
    <View style={styles.rowWrap}>
      <View style={styles.deleteBackground}>
        <Pressable
          accessibilityLabel="Delete notification"
          accessibilityRole="button"
          onPress={onDelete}
          style={styles.deleteButton}
          testID={`delete-notification-${item.id}`}
        >
          <Trash2 color="#FFFFFF" size={ICON_SIZE} strokeWidth={ICON_STROKE} />
          <Text style={styles.deleteButtonText}>
            {language === 'en' ? 'Delete' : 'Hapus'}
          </Text>
        </Pressable>
      </View>
      <Animated.View
        style={[
          styles.row,
          { transform: [{ translateX: pan }] },
        ]}
        {...panResponder.panHandlers}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: !item.readAt }}
          onPress={() => {
            if (swipedOpen) {
              Animated.spring(pan, { toValue: 0, useNativeDriver: true }).start();
              setSwipedOpen(false);
            } else {
              onPress();
            }
          }}
          style={styles.cardPressArea}
          testID={`notification-${item.id}`}
        >
          <View
            style={[
              styles.iconWrap,
              toneStyle && { backgroundColor: toneStyle.backgroundColor },
            ]}
          >
            <NotificationIcon
              color={toneStyle ? toneStyle.color : palette.textMuted}
              item={item}
            />
          </View>

          <View style={styles.notificationContent}>
            <Text
              numberOfLines={1}
              style={[
                styles.notificationTitle,
                !item.readAt && styles.unreadTitle,
              ]}
            >
              {localizedTitle(item, language)}
            </Text>
            <Text
              numberOfLines={2}
              style={styles.notificationBody}
            >
              {localizedBody(item, language)}
            </Text>
            <Text style={styles.notificationTime}>
              {formatNotificationRelativeTime(item.createdAt, language)}
            </Text>
          </View>
        </Pressable>

        {!item.readAt && <View style={styles.unreadDot} />}
      </Animated.View>
    </View>
  );
}

function NotificationIcon({ item, color }: { item: CepatNotification; color: string }) {
  const event = item.data.event;
  if (event === 'chat_message') return <MessageSquare color={color} size={ICON_SIZE} strokeWidth={ICON_STROKE} />;
  if (event === 'booking_requested') return <Wrench color={color} size={ICON_SIZE} strokeWidth={ICON_STROKE} />;
  if (event === 'booking_accepted') return <Handshake color={color} size={ICON_SIZE} strokeWidth={ICON_STROKE} />;
  if (event === 'booking_schedule_confirmed') return <Calendar color={color} size={ICON_SIZE} strokeWidth={ICON_STROKE} />;
  if (event === 'booking_completed' || event === 'booking_work_completed') {
    return <CheckCircle2 color={color} size={ICON_SIZE} strokeWidth={ICON_STROKE} />;
  }
  return <Bell color={color} size={ICON_SIZE} strokeWidth={ICON_STROKE} />;
}

function localizedTitle(item: CepatNotification, language: 'id' | 'en') {
  const event = item.data.event;
  const actorName = (item.data.actorName || item.data.senderName) as string | undefined;
  const actorRole = (item.data.actorRole || item.data.senderRole) as string | undefined;
  const roleLabel =
    actorRole === 'technician'
      ? (language === 'en' ? 'Technician' : 'Teknisi')
      : actorRole === 'customer'
        ? (language === 'en' ? 'Customer' : 'Pelanggan')
        : '';
  const suffix = roleLabel ? ` (${roleLabel})` : '';

  if (item.type === 'message' || event === 'chat_message') {
    return actorName ? `${actorName}${suffix}` : (language === 'en' ? 'New message' : 'Pesan baru');
  }
  if (event === 'booking_requested') {
    return language === 'en' ? 'New booking request' : 'Permintaan pesanan baru';
  }
  if (event === 'booking_accepted') {
    return language === 'en' ? 'Booking accepted' : 'Pesanan diterima';
  }
  if (event === 'booking_schedule_confirmed') {
    return language === 'en' ? 'Schedule confirmed' : 'Jadwal dikonfirmasi';
  }
  if (event === 'booking_completed' || event === 'booking_work_completed') {
    return language === 'en' ? 'Job completed' : 'Pekerjaan selesai';
  }
  return item.title;
}

function localizedBody(item: CepatNotification, language: 'id' | 'en') {
  const event = item.data.event;
  const actorName = (item.data.actorName || item.data.senderName || item.title || (language === 'en' ? 'User' : 'Pengguna')) as string;
  const actorRole = (item.data.actorRole || item.data.senderRole) as string | undefined;
  const roleLabel =
    actorRole === 'technician'
      ? (language === 'en' ? 'Technician' : 'Teknisi')
      : actorRole === 'customer'
        ? (language === 'en' ? 'Customer' : 'Pelanggan')
        : '';
  const nameWithRole = roleLabel ? `${actorName} (${roleLabel})` : actorName;

  const serviceName =
    typeof item.data.service_name === 'string'
      ? item.data.service_name
      : typeof item.data.serviceName === 'string'
        ? item.data.serviceName
        : '';

  if (item.type === 'message' || event === 'chat_message') {
    const rawSnippet = item.body || '';
    const snippet = rawSnippet ? `"${rawSnippet.slice(0, 60)}${rawSnippet.length > 60 ? '...' : ''}"` : '';
    if (language === 'en') {
      return snippet
        ? `${nameWithRole} sent you a message: ${snippet}`
        : `You have a new message from ${nameWithRole}.`;
    } else {
      return snippet
        ? `${nameWithRole} mengirim pesan: ${snippet}`
        : `Anda menerima pesan baru dari ${nameWithRole}.`;
    }
  }

  if (event === 'booking_requested') {
    return language === 'en'
      ? `${nameWithRole} sent you a new booking request for ${serviceName || 'your service'}.`
      : `${nameWithRole} mengirimkan permintaan pesanan baru untuk ${serviceName || 'layanan Anda'}.`;
  }
  if (event === 'booking_accepted') {
    return language === 'en'
      ? `${nameWithRole} accepted your booking for ${serviceName || 'service'}.`
      : `${nameWithRole} telah menerima pesanan Anda untuk ${serviceName || 'layanan'}.`;
  }
  if (event === 'booking_schedule_confirmed') {
    return language === 'en'
      ? `${nameWithRole} confirmed the proposed schedule for ${serviceName || 'service'}.`
      : `${nameWithRole} telah menyetujui jadwal yang diajukan untuk ${serviceName || 'layanan'}.`;
  }
  if (event === 'booking_completed' || event === 'booking_work_completed') {
    return language === 'en'
      ? `${nameWithRole} marked the service as complete. Please review and confirm.`
      : `${nameWithRole} telah menyelesaikan pekerjaan. Silakan tinjau dan konfirmasi.`;
  }
  return item.body ?? '';
}

function formatNotificationRelativeTime(dateString: string, language: 'id' | 'en'): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (Number.isNaN(diffMs)) return dateString;

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (language === 'en') {
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay === 1) return 'Yesterday';
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } else {
    if (diffMin < 1) return 'Baru saja';
    if (diffMin < 60) return `${diffMin}m lalu`;
    if (diffHour < 24) return `${diffHour}j lalu`;
    if (diffDay === 1) return 'Kemarin';
    if (diffDay < 7) return `${diffDay}h lalu`;
    return date.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
  }
}

function createStyles(palette: ThemePalette, isDark: boolean) {
  const muted = isDark ? '#94A3B8' : palette.textMuted;

  return StyleSheet.create({
    safeArea: { flex: 1 },
    content: {
      alignSelf: 'center',
      gap: spacing.sm,
      maxWidth: 820,
      paddingHorizontal: 16,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xl,
      width: '100%',
    },
    markAllButton: {
      backgroundColor: palette.primarySoft,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    markAllText: { color: palette.primary, fontSize: font.body, fontWeight: '800' },
    errorCard: {
      backgroundColor: palette.surface,
      borderColor: palette.danger,
      borderRadius: 12,
      borderWidth: 1,
      gap: spacing.xs,
      padding: spacing.md,
    },
    errorText: { color: palette.danger, fontSize: font.body },
    retryText: { color: palette.primary, fontSize: font.label, fontWeight: '800' },
    notificationList: { width: '100%' },
    rowWrap: {},
    row: {
      alignItems: 'center',
      backgroundColor: palette.background,
      borderBottomColor: palette.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      gap: 12,
      paddingVertical: 12,
    },
    iconWrap: {
      alignItems: 'center',
      backgroundColor: palette.surfaceElevated,
      borderRadius: 20,
      height: 40,
      justifyContent: 'center',
      width: 40,
    },
    cardPressArea: {
      alignItems: 'center',
      flex: 1,
      flexDirection: 'row',
      gap: 12,
    },
    notificationContent: { flex: 1, gap: 2, minWidth: 0 },
    notificationTitle: {
      color: palette.text,
      fontSize: 15,
      fontWeight: '700',
      letterSpacing: -0.1,
    },
    unreadTitle: { fontWeight: '800' },
    notificationBody: { color: muted, fontSize: 13, lineHeight: 17 },
    notificationTime: { color: muted, fontSize: font.caption, marginTop: 2 },
    unreadDot: {
      backgroundColor: '#10B981',
      borderRadius: 5,
      height: 10,
      marginLeft: 4,
      width: 10,
    },
    deleteBackground: {
      alignItems: 'center',
      backgroundColor: '#EF4444',
      bottom: 0,
      justifyContent: 'center',
      position: 'absolute',
      right: 0,
      top: 0,
      width: 90,
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
}
