import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../../auth/AuthProvider';
import { useAppearance } from '../../context/AppearanceContext';
import { useLanguage } from '../../i18n/locale';
import { radii, spacing } from '../../theme/tokens';
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
}

export function ChatContent({
  messages,
  partnerName,
  chatSenderRole,
  isChatClosed,
  historyCleared,
  onUndoClear,
  chatError,
}: ChatContentProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { palette } = useAppearance();
  const styles = useMemo(() => createStyles(palette), [palette]);

  return (
    <View style={styles.container}>
      {/* Security Notice Banner */}
      <View
        style={[
          styles.securityBanner,
          { backgroundColor: palette.surfaceElevated, borderColor: palette.border },
        ]}
        testID="chat-security-banner"
      >
        <Text style={[styles.securityText, { color: palette.textMuted }]}>
          {language === 'en'
            ? '🔒 Protected In-App Chat: Sharing external phone numbers, WhatsApp, or links is prohibited.'
            : '🔒 Chat Terlindungi: Komunikasi langsung dalam aplikasi. Dilarang membagikan kontak luar atau tautan.'}
        </Text>
      </View>

      {/* Messages Stream */}
      <ScrollView
        contentContainerStyle={styles.messagesList}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        {isChatClosed && (
          <View
            style={[
              styles.closedBanner,
              { backgroundColor: palette.surfaceElevated, borderColor: palette.border },
            ]}
            testID="chat-closed-banner"
          >
            <Text style={[styles.closedBannerText, { color: palette.textMuted }]}>
              {language === 'en'
                ? '✓ Task completed — this conversation is archived.'
                : '✓ Tugas selesai — percakapan ini telah diarsipkan.'}
            </Text>
          </View>
        )}

        {historyCleared ? (
          <View style={styles.clearedBox}>
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
            <Text style={{ fontSize: 36, marginBottom: 8 }}>💬</Text>
            <Text style={[styles.emptyTitle, { color: palette.text }]}>
              {language === 'en' ? 'No messages yet' : 'Belum ada pesan'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: palette.textMuted }]}>
              {language === 'en'
                ? `Send a message to coordinate directly with ${partnerName}.`
                : `Kirim pesan untuk berkoordinasi langsung dengan ${partnerName}.`}
            </Text>
          </View>
        ) : (
          messages.map((msg) => {
            const isMyMsg = user
              ? msg.senderUserId === user.id
              : msg.senderRole === chatSenderRole;
            const timeStr = formatMessageTime(msg.createdAt);

            return (
              <View
                key={msg.id}
                style={[styles.messageRow, isMyMsg ? styles.myRow : styles.theirRow]}
              >
                {/* Circular Avatar on Left of Incoming Message */}
                {!isMyMsg && (
                  <View style={styles.messageAvatarWrap}>
                    <Avatar name={msg.senderName} size={32} />
                  </View>
                )}

                <View
                  style={[
                    styles.bubble,
                    isMyMsg
                      ? [styles.myBubble, { backgroundColor: palette.primary }]
                      : [
                          styles.theirBubble,
                          {
                            backgroundColor: palette.surfaceElevated,
                            borderColor: palette.border,
                          },
                        ],
                  ]}
                >
                  {!isMyMsg && (
                    <Text style={[styles.bubbleSender, { color: palette.primary }]}>
                      {msg.senderName}
                    </Text>
                  )}
                  <Text
                    style={[
                      styles.bubbleBody,
                      isMyMsg ? { color: '#FFFFFF' } : { color: palette.text },
                    ]}
                  >
                    {msg.body}
                  </Text>
                  {timeStr ? (
                    <Text
                      style={[
                        styles.bubbleTime,
                        isMyMsg
                          ? { color: 'rgba(255, 255, 255, 0.75)' }
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
            style={styles.errorText}
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
    container: {
      flex: 1,
    },
    securityBanner: {
      borderRadius: radii.sm,
      borderWidth: 1,
      marginHorizontal: spacing.md,
      marginTop: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
    },
    securityText: {
      fontSize: 11,
      fontWeight: '600',
      lineHeight: 15,
    },
    messagesList: {
      gap: spacing.xs,
      padding: spacing.md,
      paddingBottom: spacing.xxl,
    },
    closedBanner: {
      borderRadius: radii.sm,
      borderWidth: 1,
      marginBottom: spacing.sm,
      padding: spacing.sm,
    },
    closedBannerText: {
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'center',
    },
    clearedBox: {
      alignItems: 'center',
      paddingVertical: spacing.lg,
    },
    clearedText: {
      fontSize: 13,
    },
    undoBtn: {
      marginTop: spacing.xs,
      padding: spacing.xs,
    },
    undoText: {
      fontSize: 13,
      fontWeight: '800',
    },
    emptyBox: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xxxl,
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: '800',
    },
    emptySubtitle: {
      fontSize: 12,
      marginTop: 4,
      textAlign: 'center',
    },
    messageRow: {
      alignItems: 'flex-end',
      flexDirection: 'row',
      marginVertical: 2,
      width: '100%',
    },
    myRow: {
      justifyContent: 'flex-end',
    },
    theirRow: {
      justifyContent: 'flex-start',
    },
    messageAvatarWrap: {
      marginRight: spacing.xs,
      alignSelf: 'flex-end',
    },
    bubble: {
      maxWidth: '78%',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    myBubble: {
      borderBottomLeftRadius: radii.md,
      borderBottomRightRadius: radii.md,
      borderTopLeftRadius: radii.md,
      borderTopRightRadius: 2,
    },
    theirBubble: {
      borderBottomLeftRadius: radii.md,
      borderBottomRightRadius: radii.md,
      borderTopLeftRadius: 2,
      borderTopRightRadius: radii.md,
      borderWidth: 1,
    },
    bubbleSender: {
      fontSize: 11,
      fontWeight: '800',
      marginBottom: 2,
    },
    bubbleBody: {
      fontSize: 14,
      lineHeight: 20,
    },
    bubbleTime: {
      fontSize: 10,
      marginTop: 3,
      textAlign: 'right',
    },
    errorText: {
      color: palette.danger,
      fontSize: 12,
      fontWeight: '600',
      marginVertical: 4,
      textAlign: 'center',
    },
  });
}
