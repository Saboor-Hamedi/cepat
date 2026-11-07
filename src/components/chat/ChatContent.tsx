import { Archive, Lock, MessageCircle } from 'lucide-react-native';
import { ICON_SIZE, ICON_STROKE } from '../../theme/icons';
import { useMemo, useRef } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
  type ScrollViewInstance,
} from 'react-native';

import { useAuth } from '../../auth/AuthProvider';
import { useAppearance } from '../../context/AppearanceContext';
import { useLanguage } from '../../i18n/locale';
import type { BookingMessage } from '../../types/marketplace';
import { Avatar } from '../marketplace-ui';
import { SwipeableRow } from '../SwipeableRow';
import { createChatContentStyles } from './css/chatStyles';

export interface ChatContentProps {
  messages: BookingMessage[];
  partnerName: string;
  chatSenderRole: 'customer' | 'technician';
  isChatClosed: boolean;
  historyCleared: boolean;
  onUndoClear: () => void;
  onDeleteMessage?: (messageId: string) => void;
  chatError: string | null;
  partnerAvatarUri?: string;
  senderAvatarUri?: string;
}

export function ChatContent({
  messages,
  partnerName,
  chatSenderRole,
  isChatClosed,
  historyCleared,
  onUndoClear,
  onDeleteMessage,
  chatError,
  partnerAvatarUri,
  senderAvatarUri,
}: ChatContentProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { palette } = useAppearance();
  const styles = useMemo(() => createChatContentStyles(palette), [palette]);
  const scrollRef = useRef<ScrollViewInstance | null>(null);
  const selfName =
    (typeof user?.user_metadata?.display_name === 'string' &&
      user.user_metadata.display_name) ||
    (typeof user?.user_metadata?.full_name === 'string' &&
      user.user_metadata.full_name) ||
    user?.email?.split('@')[0] ||
    (language === 'en' ? 'You' : 'Anda');

  return (
    <View style={styles.container}>
      {/* Subtle security notice */}
      <View
        style={[styles.securityBanner, { borderColor: palette.border }]}
        testID="chat-security-banner"
      >
        <Lock color={palette.textMuted} size={ICON_SIZE} strokeWidth={ICON_STROKE} />
        <Text style={[styles.securityText, { color: palette.textMuted }]}>
          {language === 'en'
            ? 'Protected chat — sharing phone numbers, WhatsApp, or links is disabled.'
            : 'Chat terlindungi — berbagi nomor telepon, WhatsApp, atau tautan dinonaktifkan.'}
        </Text>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.messagesList}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() =>
          scrollRef.current?.scrollToEnd({ animated: false })
        }
        showsVerticalScrollIndicator={false}
      >
        {isChatClosed && (
          <View
            style={[styles.closedBanner, { borderColor: palette.border }]}
            testID="chat-closed-banner"
          >
            <Archive color={palette.textMuted} size={ICON_SIZE} strokeWidth={ICON_STROKE} />
            <Text
              style={[styles.closedBannerText, { color: palette.textMuted }]}
            >
              {language === 'en'
                ? 'Task completed — this conversation is archived.'
                : 'Tugas selesai — percakapan ini telah diarsipkan.'}
            </Text>
          </View>
        )}

        {historyCleared ? (
          <View
            style={[
              styles.clearedBox,
              {
                backgroundColor: palette.surfaceElevated,
                borderColor: palette.border,
              },
            ]}
          >
            <Text style={[styles.clearedText, { color: palette.textMuted }]}>
              {language === 'en'
                ? 'Chat history has been cleared from your view.'
                : 'Riwayat chat telah dihapus dari tampilan Anda.'}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={onUndoClear}
              style={styles.undoBtn}
            >
              <Text style={[styles.undoText, { color: palette.primary }]}>
                {language === 'en' ? 'Undo' : 'Batalkan'}
              </Text>
            </Pressable>
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyBox}>
            <View
              style={[
                styles.emptyIconWrap,
                { backgroundColor: palette.primarySoft },
              ]}
            >
              <MessageCircle color={palette.primary} size={ICON_SIZE} strokeWidth={ICON_STROKE} />
            </View>
            <Text style={[styles.emptyTitle, { color: palette.text }]}>
              {language === 'en' ? 'No messages yet' : 'Belum ada pesan'}
            </Text>
            <Text
              style={[styles.emptySubtitle, { color: palette.textMuted }]}
            >
              {language === 'en'
                ? `Send a message to coordinate directly with ${partnerName}.`
                : `Kirim pesan untuk berkoordinasi langsung dengan ${partnerName}.`}
            </Text>
          </View>
        ) : (
          messages.map((msg, index) => {
            const isMyMsg = user
              ? msg.senderUserId === user.id
              : msg.senderRole === chatSenderRole;
            const previous = index > 0 ? messages[index - 1] : undefined;
            const startsGroup =
              !previous || previous.senderUserId !== msg.senderUserId;
            const timeStr = formatWhatsAppTime(msg.createdAt, language);
            const bubbleTextColor = isMyMsg ? '#FFFFFF' : palette.text;

            return (
              <SwipeableRow
                key={msg.id}
                deleteAccessibilityLabel={
                  language === 'en' ? 'Delete message' : 'Hapus pesan'
                }
                deleteTestID={`delete-chat-message-${msg.id}`}
                onDelete={
                  onDeleteMessage ? () => onDeleteMessage(msg.id) : undefined
                }
              >
                <View
                  style={[
                    styles.messageRow,
                    isMyMsg ? styles.myRow : styles.theirRow,
                    startsGroup && index > 0 && styles.groupSpacing,
                  ]}
                >
                  {!isMyMsg && (
                    <View style={[styles.messageAvatarWrap, styles.avatarLeft]}>
                      {startsGroup ? (
                        <Avatar
                          name={msg.senderName}
                          size={30}
                          uri={partnerAvatarUri}
                        />
                      ) : (
                        <View style={styles.avatarSpacer} />
                      )}
                    </View>
                  )}

                  <View style={isMyMsg ? styles.myBubbleWrap : styles.theirBubbleWrap}>
                    <View
                      style={[
                        styles.bubble,
                        isMyMsg
                          ? [styles.myBubble, { backgroundColor: palette.primary }]
                          : [
                              styles.theirBubble,
                              { backgroundColor: palette.surfaceElevated },
                            ],
                      ]}
                    >
                      {!isMyMsg && startsGroup && (
                        <Text
                          style={[
                            styles.bubbleSender,
                            { color: palette.primary },
                          ]}
                        >
                          {msg.senderName}
                        </Text>
                      )}
                      <Text style={[styles.bubbleBody, { color: bubbleTextColor }]}>
                        {msg.body}
                      </Text>
                    </View>
                    {timeStr ? (
                      <Text
                        style={[
                          styles.bubbleTimeUnder,
                          isMyMsg ? styles.timeUnderMy : styles.timeUnderTheir,
                          { color: palette.textMuted },
                        ]}
                      >
                        {timeStr}
                      </Text>
                    ) : null}
                  </View>

                  {isMyMsg && (
                    <View style={[styles.messageAvatarWrap, styles.avatarRight]}>
                      {startsGroup ? (
                        <Avatar name={selfName} size={30} uri={senderAvatarUri} />
                      ) : (
                        <View style={styles.avatarSpacer} />
                      )}
                    </View>
                  )}
                </View>
              </SwipeableRow>
            );
          })
        )}

        {chatError && (
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.errorText, { color: palette.danger }]}
            testID="booking-chat-error"
          >
            {chatError}
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

function formatWhatsAppTime(createdAt: string, language: string): string {
  if (!createdAt) return '';
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minuteStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
  const timeStr = `${hours}:${minuteStr} ${ampm}`;

  if (isToday) {
    return timeStr;
  }
  if (isYesterday) {
    return language === 'en' ? `Yesterday, ${timeStr}` : `Kemarin, ${timeStr}`;
  }
  const isSameYear = date.getFullYear() === now.getFullYear();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthStr = monthNames[date.getMonth()];
  if (isSameYear) {
    return `${date.getDate()} ${monthStr}, ${timeStr}`;
  }
  return `${date.getDate()} ${monthStr} ${date.getFullYear()}, ${timeStr}`;
}
