import { useMemo, useRef } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollViewInstance,
} from 'react-native';

import { useAuth } from '../../auth/AuthProvider';
import { useAppearance } from '../../context/AppearanceContext';
import { useLanguage } from '../../i18n/locale';
import type { BookingMessage } from '../../types/marketplace';
import { Avatar } from '../marketplace-ui';

export interface ChatContentProps {
  messages: BookingMessage[];
  partnerName: string;
  chatSenderRole: 'customer' | 'technician';
  isChatClosed: boolean;
  historyCleared: boolean;
  onUndoClear: () => void;
  chatError: string | null;
  partnerAvatarUri?: string;
}

export function ChatContent({
  messages,
  partnerName,
  chatSenderRole,
  isChatClosed,
  historyCleared,
  onUndoClear,
  chatError,
  partnerAvatarUri,
}: ChatContentProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { palette } = useAppearance();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const scrollRef = useRef<ScrollViewInstance | null>(null);

  return (
    <View style={styles.container}>
      {/* Subtle security notice */}
      <View
        style={[styles.securityBanner, { borderColor: palette.border }]}
        testID="chat-security-banner"
      >
        <Text style={[styles.securityText, { color: palette.textMuted }]}>
          🔒{' '}
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
            <Text
              style={[styles.closedBannerText, { color: palette.textMuted }]}
            >
              📦{' '}
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
              <Text style={styles.emptyIcon}>💬</Text>
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
            const timeStr = formatMessageTime(msg.createdAt);
            const bubbleTextColor = isMyMsg ? '#FFFFFF' : palette.text;

            return (
              <View
                key={msg.id}
                style={[
                  styles.messageRow,
                  isMyMsg ? styles.myRow : styles.theirRow,
                  startsGroup && index > 0 && styles.groupSpacing,
                ]}
              >
                {!isMyMsg && (
                  <View style={styles.messageAvatarWrap}>
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
                  {timeStr ? (
                    <Text
                      style={[
                        styles.bubbleTime,
                        isMyMsg
                          ? { color: 'rgba(255, 255, 255, 0.72)' }
                          : { color: palette.textMuted },
                      ]}
                    >
                      {timeStr}
                    </Text>
                  ) : null}
                </View>
              </View>
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

function formatMessageTime(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
    avatarSpacer: {
      width: 30,
    },
    bubble: {
      maxWidth: '75%',
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    bubbleBody: {
      fontSize: 14.5,
      lineHeight: 20,
    },
    bubbleSender: {
      fontSize: 11,
      fontWeight: '800',
      marginBottom: 2,
    },
    bubbleTime: {
      alignSelf: 'flex-end',
      fontSize: 10,
      fontWeight: '500',
      marginTop: 3,
    },
    clearedBox: {
      alignItems: 'center',
      borderRadius: 14,
      borderWidth: 1,
      marginTop: 12,
      paddingHorizontal: 20,
      paddingVertical: 18,
    },
    clearedText: {
      fontSize: 12,
      textAlign: 'center',
    },
    closedBanner: {
      alignSelf: 'center',
      borderRadius: 999,
      borderStyle: 'dashed',
      borderWidth: 1,
      marginBottom: 12,
      marginHorizontal: 20,
      paddingHorizontal: 14,
      paddingVertical: 7,
    },
    closedBannerText: {
      fontSize: 11,
      fontWeight: '600',
      textAlign: 'center',
    },
    container: {
      flex: 1,
    },
    emptyBox: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      paddingVertical: 48,
    },
    emptyIcon: {
      fontSize: 30,
    },
    emptyIconWrap: {
      alignItems: 'center',
      borderRadius: 32,
      height: 64,
      justifyContent: 'center',
      marginBottom: 14,
      width: 64,
    },
    emptySubtitle: {
      fontSize: 12.5,
      lineHeight: 18,
      marginTop: 5,
      maxWidth: 280,
      textAlign: 'center',
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: '800',
      letterSpacing: -0.2,
    },
    errorText: {
      fontSize: 12,
      fontWeight: '600',
      marginVertical: 8,
      textAlign: 'center',
    },
    groupSpacing: {
      marginTop: 10,
    },
    messageAvatarWrap: {
      alignSelf: 'flex-end',
      marginRight: 8,
    },
    messageRow: {
      alignItems: 'flex-end',
      flexDirection: 'row',
      marginVertical: 2,
      width: '100%',
    },
    messagesList: {
      gap: 4,
      paddingBottom: 20,
      paddingHorizontal: 14,
      paddingTop: 12,
    },
    myBubble: {
      borderBottomRightRadius: 4,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      borderBottomLeftRadius: 18,
    },
    myRow: {
      justifyContent: 'flex-end',
    },
    securityBanner: {
      alignSelf: 'center',
      borderRadius: 999,
      borderStyle: 'dashed',
      borderWidth: 1,
      marginHorizontal: 20,
      marginTop: 10,
      opacity: 0.9,
      paddingHorizontal: 14,
      paddingVertical: 6,
    },
    securityText: {
      fontSize: 10.5,
      fontWeight: '500',
      lineHeight: 14,
      textAlign: 'center',
    },
    theirBubble: {
      borderBottomLeftRadius: 4,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      borderBottomRightRadius: 18,
    },
    theirRow: {
      justifyContent: 'flex-start',
    },
    undoBtn: {
      marginTop: 6,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    undoText: {
      fontSize: 13,
      fontWeight: '800',
    },
  });
}
