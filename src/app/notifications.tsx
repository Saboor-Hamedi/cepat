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
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../auth/AuthProvider';
import { AppNavigationBar, EmptyState, LoadingState } from '../components/marketplace-ui';
import { SegmentedTabs } from '../components/SegmentedTabs';
import { useAppearance } from '../context/AppearanceContext';
import {
  loadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
  type CepatNotification,
} from '../data/notifications';
import { useLanguage } from '../i18n/locale';
import { radii, spacing } from '../theme/tokens';

export type NotificationTabKey = 'all' | 'recent' | 'old';
export type NotificationFilterTab = NotificationTabKey;

export default function NotificationsScreen() {
  const { user } = useAuth();
  const userId = user?.id;
  const { language } = useLanguage();
  const { palette } = useAppearance();
  const styles = useMemo(() => createStyles(palette), [palette]);
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
    return () => {
      active = false;
      unsubscribe();
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

  const [now] = useState(() => Date.now());

  const visibleNotifications = useMemo(
    () => (loadedForUserId === userId ? notifications : []),
    [loadedForUserId, notifications, userId],
  );
  const unreadCount = visibleNotifications.filter((item) => !item.readAt).length;

  const recentCount = useMemo(() => {
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    return visibleNotifications.filter((item) => {
      const isRecent = new Date(item.createdAt).getTime() >= oneDayAgo;
      return !item.readAt || isRecent;
    }).length;
  }, [now, visibleNotifications]);

  const oldCount = useMemo(() => {
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    return visibleNotifications.filter((item) => {
      const isOld = new Date(item.createdAt).getTime() < oneDayAgo;
      return Boolean(item.readAt) && isOld;
    }).length;
  }, [now, visibleNotifications]);

  const filteredNotifications = useMemo(() => {
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    if (filterTab === 'recent') {
      return visibleNotifications.filter((item) => {
        const isRecent = new Date(item.createdAt).getTime() >= oneDayAgo;
        return !item.readAt || isRecent;
      });
    }
    if (filterTab === 'old') {
      return visibleNotifications.filter((item) => {
        const isOld = new Date(item.createdAt).getTime() < oneDayAgo;
        return Boolean(item.readAt) && isOld;
      });
    }
    return visibleNotifications;
  }, [filterTab, now, visibleNotifications]);

  const tabs: { key: NotificationFilterTab; label: string; count?: number; testID?: string }[] = [
    {
      key: 'all',
      label: language === 'en' ? 'All' : 'Semua',
      count: visibleNotifications.length,
      testID: 'notification-tab-all',
    },
    {
      key: 'recent',
      label: language === 'en' ? 'Recent' : 'Terbaru',
      count: recentCount,
      testID: 'notification-tab-recent',
    },
    {
      key: 'old',
      label: language === 'en' ? 'Old' : 'Lama',
      count: oldCount,
      testID: 'notification-tab-old',
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
        <View style={styles.headingRow}>
          <View style={styles.headingCopy}>
            <Text style={styles.eyebrow}>
              {language === 'en' ? 'YOUR ACTIVITY' : 'AKTIVITAS ANDA'}
            </Text>
            <Text style={styles.heading}>
              {language === 'en' ? 'Notifications' : 'Notifikasi'}
            </Text>
            <Text style={styles.subheading}>
              {language === 'en'
                ? `${unreadCount} unread`
                : `${unreadCount} belum dibaca`}
            </Text>
          </View>
          {unreadCount > 0 && (
            <Pressable
              accessibilityRole="button"
              onPress={() => void handleMarkAllRead()}
              style={styles.markAllButton}
              testID="notifications-mark-all-read"
            >
              <Text style={styles.markAllText}>
                {language === 'en' ? 'Mark all read' : 'Tandai dibaca'}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Facebook-style Category Filter Tabs */}
        {visibleNotifications.length > 0 && (
          <View style={styles.tabsWrap}>
            <SegmentedTabs
              activeTab={filterTab}
              onSelectTab={(tab) => setFilterTab(tab as NotificationFilterTab)}
              tabs={tabs}
              testIDPrefix="notifications-tab"
            />
          </View>
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
              filterTab === 'recent'
                ? (language === 'en' ? 'No recent notifications' : 'Tidak ada notifikasi baru')
                : (language === 'en' ? 'No older notifications' : 'Tidak ada notifikasi lama')
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
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityState={{ selected: !item.readAt }}
                onPress={() => void handleOpenNotification(item)}
                style={[
                  styles.notificationCard,
                  !item.readAt && styles.unreadCard,
                ]}
                testID={`notification-${item.id}`}
              >
                {/* Facebook-style Left Circular Avatar/Icon */}
                <View
                  style={[
                    styles.notificationAvatar,
                    !item.readAt && styles.unreadAvatar,
                  ]}
                >
                  <Text style={styles.avatarEmoji}>{getNotificationIcon(item)}</Text>
                </View>

                {/* Content body */}
                <View style={styles.notificationContent}>
                  <View style={styles.notificationTopRow}>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.notificationTitle,
                        !item.readAt && styles.unreadTitle,
                      ]}
                    >
                      {localizedTitle(item, language)}
                    </Text>
                  </View>
                  <Text
                    numberOfLines={3}
                    style={[
                      styles.notificationBody,
                      !item.readAt && styles.unreadNotificationBody,
                    ]}
                  >
                    {localizedBody(item, language)}
                  </Text>
                  <Text style={styles.notificationTime}>
                    {formatNotificationRelativeTime(item.createdAt, language)}
                  </Text>
                </View>

                {/* Unread dot indicator on right */}
                {!item.readAt && <View style={styles.unreadDot} />}
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
      <AppNavigationBar activeTab="notifications" />
    </SafeAreaView>
  );
}

function getNotificationIcon(item: CepatNotification): string {
  const event = item.data.event;
  if (event === 'chat_message') return '💬';
  if (event === 'booking_requested') return '🛠️';
  if (event === 'booking_accepted') return '🤝';
  if (event === 'booking_schedule_confirmed') return '📅';
  if (event === 'booking_completed') return '✅';
  return '🔔';
}

function localizedTitle(item: CepatNotification, language: 'id' | 'en') {
  const event = item.data.event;
  if (language === 'en') {
    if (event === 'chat_message') return item.title || 'New message';
    if (event === 'booking_requested') return 'New booking request';
    if (event === 'booking_accepted') return 'Booking accepted';
    if (event === 'booking_schedule_confirmed') return 'Schedule confirmed';
    if (event === 'booking_completed') return 'Job completed';
    return item.title;
  }
  if (event === 'chat_message') return item.title || 'Pesan baru';
  if (event === 'booking_requested') return 'Permintaan pesanan baru';
  if (event === 'booking_accepted') return 'Pesanan diterima';
  if (event === 'booking_schedule_confirmed') return 'Jadwal dikonfirmasi';
  if (event === 'booking_completed') return 'Pekerjaan selesai';
  return item.title;
}

function localizedBody(item: CepatNotification, language: 'id' | 'en') {
  const serviceName =
    typeof item.data.service_name === 'string'
      ? item.data.service_name
      : typeof item.data.serviceName === 'string'
        ? item.data.serviceName
        : '';
  if (language === 'en') {
    if (item.data.event === 'chat_message') {
      return item.body || 'You received a new message.';
    }
    if (item.data.event === 'booking_requested') {
      return `A customer requested ${serviceName || 'your service'}.`;
    }
    if (item.data.event === 'booking_accepted') {
      return `The technician accepted ${serviceName || 'your booking'}.`;
    }
    if (item.data.event === 'booking_schedule_confirmed') {
      return `The customer confirmed the proposed schedule for ${serviceName || 'your service'}.`;
    }
  } else {
    if (item.data.event === 'chat_message') {
      return item.body || 'Anda menerima pesan baru.';
    }
    if (item.data.event === 'booking_requested') {
      return `Pelanggan memesan ${serviceName || 'layanan Anda'}.`;
    }
    if (item.data.event === 'booking_accepted') {
      return `Teknisi menerima pesanan ${serviceName || 'Anda'}.`;
    }
    if (item.data.event === 'booking_schedule_confirmed') {
      return `Pelanggan menyetujui jadwal ${serviceName || 'layanan Anda'}.`;
    }
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

function createStyles(palette: {
  background: string;
  surface: string;
  surfaceElevated: string;
  text: string;
  textMuted: string;
  primary: string;
  primarySoft: string;
  border: string;
  danger: string;
}) {
  return StyleSheet.create({
    safeArea: { flex: 1 },
    content: {
      alignSelf: 'center',
      gap: spacing.md,
      maxWidth: 820,
      padding: spacing.md,
      paddingBottom: spacing.xl,
      width: '100%',
    },
    headingRow: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      minHeight: 76,
    },
    headingCopy: { flex: 1 },
    eyebrow: {
      color: palette.primary,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1,
    },
    heading: {
      color: palette.text,
      fontSize: 26,
      fontWeight: '800',
      marginTop: 3,
    },
    subheading: {
      color: palette.textMuted,
      fontSize: 12,
      marginTop: 2,
    },
    markAllButton: {
      backgroundColor: palette.primarySoft,
      borderRadius: radii.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    markAllText: { color: palette.primary, fontSize: 12, fontWeight: '800' },
    tabsWrap: {
      marginBottom: spacing.xs,
    },
    errorCard: {
      backgroundColor: palette.surface,
      borderColor: palette.danger,
      borderRadius: radii.md,
      borderWidth: 1,
      gap: spacing.xs,
      padding: spacing.md,
    },
    errorText: { color: palette.danger, fontSize: 12 },
    retryText: { color: palette.primary, fontSize: 13, fontWeight: '800' },
    notificationList: { gap: spacing.sm },
    notificationCard: {
      alignItems: 'center',
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radii.lg,
      borderWidth: 1,
      flexDirection: 'row',
      gap: spacing.md,
      padding: spacing.md,
    },
    unreadCard: {
      backgroundColor: palette.surfaceElevated,
      borderColor: palette.primary,
    },
    notificationAvatar: {
      alignItems: 'center',
      backgroundColor: palette.surfaceElevated,
      borderRadius: 24,
      height: 48,
      justifyContent: 'center',
      width: 48,
    },
    unreadAvatar: {
      backgroundColor: palette.primarySoft,
    },
    avatarEmoji: {
      fontSize: 22,
    },
    notificationContent: {
      flex: 1,
      gap: 3,
    },
    notificationTopRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
      justifyContent: 'space-between',
    },
    notificationTitle: {
      color: palette.text,
      fontSize: 15,
      fontWeight: '700',
    },
    unreadTitle: {
      fontWeight: '800',
    },
    unreadDot: {
      backgroundColor: palette.primary,
      borderRadius: 5,
      height: 10,
      width: 10,
    },
    notificationBody: {
      color: palette.textMuted,
      fontSize: 13,
      lineHeight: 18,
    },
    unreadNotificationBody: {
      color: palette.text,
    },
    notificationTime: {
      color: palette.textMuted,
      fontSize: 11,
      marginTop: 2,
    },
  });
}
