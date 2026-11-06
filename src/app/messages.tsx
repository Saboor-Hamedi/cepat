import { router } from 'expo-router';
import { MessageCircle } from 'lucide-react-native';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../auth/AuthProvider';
import { BackHeader } from '../components/BackHeader';
import { Avatar } from '../components/marketplace-ui';
import { useAppearance } from '../context/AppearanceContext';
import { loadTechnicians } from '../data/marketplaceRepository';
import {
  isChatEnabledForStatus,
  loadBookingMessages,
  loadBookings,
} from '../data/marketplaceStore';
import { useLanguage } from '../i18n/locale';
import { ICON_STROKE } from '../theme/icons';
import { colors, radii, spacing } from '../theme/tokens';
import { font } from '../theme/typography';
import type { BookingMessage, BookingRecord } from '../types/marketplace';

interface ConversationListItem {
  booking: BookingRecord;
  partnerName: string;
  partnerAvatarUri?: string;
  lastMessage: BookingMessage | null;
  lastTimestamp: string;
  previewText: string;
  isArchived: boolean;
}

const MAX_PREVIEW_CHARS = 180;

function sanitizePreviewText(raw: string): string {
  const normalized = raw.replace(/\s+/g, ' ').trim();
  if (normalized.length <= MAX_PREVIEW_CHARS) {
    return normalized;
  }
  return `${normalized.slice(0, MAX_PREVIEW_CHARS)}…`;
}

function formatConversationTime(isoDate: string, language: 'id' | 'en'): string {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return language === 'en' ? 'Now' : 'Baru';
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString(language === 'en' ? 'en-US' : 'id-ID', {
    day: 'numeric',
    month: 'short',
  });
}

interface ConversationRowProps {
  item: ConversationListItem;
  language: 'id' | 'en';
  onPress: (bookingId: string) => void;
}

const ConversationRow = memo(function ConversationRow({
  item,
  language,
  onPress,
}: ConversationRowProps) {
  const { palette } = useAppearance();
  const timeLabel = formatConversationTime(item.lastTimestamp, language);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.partnerName} - ${item.booking.serviceNameSnapshot}`}
      onPress={() => onPress(item.booking.id)}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? palette.surfaceElevated : palette.background,
          borderBottomColor: palette.border,
        },
      ]}
      testID={`message-thread-${item.booking.id}`}
    >
      <Avatar name={item.partnerName} size={46} uri={item.partnerAvatarUri} />
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text
            ellipsizeMode="tail"
            numberOfLines={1}
            style={[styles.partnerName, { color: palette.text }]}
          >
            {item.partnerName}
          </Text>
          {timeLabel ? (
            <Text style={[styles.timeText, { color: palette.textMuted }]}>
              {timeLabel}
            </Text>
          ) : null}
        </View>
        <View style={styles.metaRow}>
          <Text
            ellipsizeMode="tail"
            numberOfLines={1}
            style={[styles.serviceTag, { color: palette.primary }]}
          >
            {item.booking.serviceNameSnapshot}
          </Text>
          {item.isArchived ? (
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: palette.surfaceElevated },
              ]}
            >
              <Text style={[styles.statusBadgeText, { color: palette.textMuted }]}>
                {language === 'en' ? 'Completed' : 'Selesai'}
              </Text>
            </View>
          ) : null}
        </View>
        <Text
          ellipsizeMode="tail"
          numberOfLines={2}
          style={[styles.previewText, { color: palette.textMuted }]}
          testID={`message-preview-${item.booking.id}`}
        >
          {item.previewText}
        </Text>
      </View>
    </Pressable>
  );
});

export default function MessagesScreen() {
  const { language } = useLanguage();
  const { user, effectiveRole } = useAuth();
  const { palette } = useAppearance();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConversations = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      }
      try {
        const [allBookings, techResult] = await Promise.all([
          loadBookings(),
          loadTechnicians(),
        ]);

        const techAvatarMap = new Map<string, string | undefined>();
        for (const tech of techResult.items) {
          techAvatarMap.set(tech.id, tech.avatarUri);
        }

        const eligibleBookings = allBookings.filter((booking) => {
          if (!isChatEnabledForStatus(booking.status)) {
            return false;
          }
          if (!user?.id) {
            return true;
          }
          return (
            booking.customerUserId === user.id ||
            booking.technicianUserId === user.id
          );
        });

        const items = await Promise.all(
          eligibleBookings.map(async (booking): Promise<ConversationListItem> => {
            let messages: BookingMessage[] = [];
            try {
              messages = await loadBookingMessages(booking.id);
            } catch {
              messages = [];
            }
            const lastMessage =
              messages.length > 0 ? messages[messages.length - 1] : null;
            const isTechnicianViewer =
              (user?.id && booking.technicianUserId === user.id) ||
              (!user?.id && effectiveRole === 'technician');

            const partnerName = isTechnicianViewer
              ? booking.customerName
              : booking.technicianName;
            const partnerAvatarUri = isTechnicianViewer
              ? undefined
              : techAvatarMap.get(booking.technicianUserId);

            const rawPreview = lastMessage
              ? lastMessage.body
              : booking.customerNotes ||
                (language === 'en'
                  ? 'Tap to open conversation'
                  : 'Ketuk untuk membuka percakapan');

            return {
              booking,
              partnerName,
              partnerAvatarUri,
              lastMessage,
              lastTimestamp: lastMessage?.createdAt || booking.createdAt,
              previewText: sanitizePreviewText(rawPreview),
              isArchived: booking.status === 'completed',
            };
          }),
        );

        items.sort(
          (a, b) =>
            new Date(b.lastTimestamp).getTime() -
            new Date(a.lastTimestamp).getTime(),
        );
        setConversations(items);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [effectiveRole, language, user?.id],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchConversations(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchConversations]);

  const handleOpenChat = useCallback((bookingId: string) => {
    router.push(`/chat/${encodeURIComponent(bookingId)}` as never);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: ConversationListItem }) => (
      <ConversationRow
        item={item}
        language={language}
        onPress={handleOpenChat}
      />
    ),
    [handleOpenChat, language],
  );

  const keyExtractor = useCallback(
    (item: ConversationListItem) => item.booking.id,
    [],
  );

  const emptyComponent = useMemo(() => {
    if (loading) {
      return (
        <View style={styles.emptyWrap}>
          <Text style={[styles.emptySubtitle, { color: palette.textMuted }]}>
            {language === 'en' ? 'Loading messages...' : 'Memuat pesan...'}
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyWrap} testID="messages-empty-state">
        <View
          style={[
            styles.emptyIconCircle,
            { backgroundColor: palette.surfaceElevated },
          ]}
        >
          <MessageCircle
            color={palette.textMuted}
            size={24}
            strokeWidth={ICON_STROKE}
          />
        </View>
        <Text style={[styles.emptyTitle, { color: palette.text }]}>
          {language === 'en' ? 'No messages yet' : 'Belum ada pesan'}
        </Text>
        <Text style={[styles.emptySubtitle, { color: palette.textMuted }]}>
          {language === 'en'
            ? 'Messages with technicians appear here once a booking is accepted.'
            : 'Pesan dengan teknisi akan muncul di sini setelah pesanan diterima.'}
        </Text>
      </View>
    );
  }, [language, loading, palette]);

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.safeArea, { backgroundColor: palette.background }]}
      testID="messages-screen"
    >
      <BackHeader
        backBtnTestID="messages-back-button"
        fallbackRoute="/"
        title={language === 'en' ? 'Messages' : 'Pesan'}
        titleTestID="messages-header-title"
      />
      <FlatList
        contentContainerStyle={
          conversations.length === 0 ? styles.emptyContainer : styles.listContent
        }
        data={conversations}
        initialNumToRender={12}
        keyExtractor={keyExtractor}
        ListEmptyComponent={emptyComponent}
        maxToRenderPerBatch={10}
        refreshControl={
          <RefreshControl
            colors={[palette.primary]}
            onRefresh={() => {
              void fetchConversations(true);
            }}
            refreshing={refreshing}
            tintColor={palette.primary}
          />
        }
        removeClippedSubviews={false}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        testID="messages-list"
        windowSize={5}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.paper,
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  row: {
    alignItems: 'flex-start',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  partnerName: {
    flex: 1,
    fontSize: font.subtitle,
    fontWeight: '700',
  },
  timeText: {
    fontSize: font.caption,
    fontVariant: ['tabular-nums'],
    fontWeight: '500',
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: 2,
  },
  serviceTag: {
    flexShrink: 1,
    fontSize: font.caption,
    fontWeight: '600',
  },
  statusBadge: {
    borderRadius: radii.pill,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  previewText: {
    fontSize: font.body,
    lineHeight: 19,
    marginTop: 4,
  },
  emptyWrap: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  emptyIconCircle: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: 48,
    justifyContent: 'center',
    marginBottom: spacing.xs,
    width: 48,
  },
  emptyTitle: {
    fontSize: font.title,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: font.body,
    lineHeight: 20,
    maxWidth: 280,
    textAlign: 'center',
  },
});
