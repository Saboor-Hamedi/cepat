import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAppearance } from '../../context/AppearanceContext';
import { useLanguage } from '../../i18n/locale';
import { radii, spacing } from '../../theme/tokens';

export interface ChatComposerProps {
  chatInput: string;
  onChangeChatInput: (text: string) => void;
  onSend: () => void;
  onAttachPhoto: () => void;
  sendingChat: boolean;
  disabled?: boolean;
  partnerName: string;
  isCompleted?: boolean;
  onBookAgain?: () => void;
}

export function ChatComposer({
  chatInput,
  onChangeChatInput,
  onSend,
  onAttachPhoto,
  sendingChat,
  disabled = false,
  partnerName,
  isCompleted = false,
  onBookAgain,
}: ChatComposerProps) {
  const { language } = useLanguage();
  const { palette } = useAppearance();
  const styles = useMemo(() => createStyles(palette), [palette]);

  // When task is completed, replace the composer with "Task has completed" and "Book Again" action
  if (isCompleted) {
    return (
      <View
        style={[
          styles.completedFooter,
          {
            backgroundColor: palette.surface,
            borderTopColor: palette.border,
          },
        ]}
      >
        <View style={styles.completedInfoRow}>
          <Text style={[styles.completedBadgeText, { color: palette.primary }]}>
            ✓ {language === 'en' ? 'Task has completed' : 'Tugas telah selesai'}
          </Text>
        </View>

        {onBookAgain && (
          <Pressable
            accessibilityRole="button"
            onPress={onBookAgain}
            style={({ pressed }) => [
              styles.bookAgainBtn,
              { backgroundColor: palette.primary },
              pressed && { opacity: 0.85 },
            ]}
            testID="chat-book-again-btn"
          >
            <Text style={styles.bookAgainBtnText}>
              {language === 'en' ? 'Book Again' : 'Pesan Lagi'}
            </Text>
          </Pressable>
        )}
      </View>
    );
  }

  if (disabled) {
    return null;
  }

  return (
    <View
      style={[
        styles.inputBar,
        { backgroundColor: palette.surface, borderTopColor: palette.border },
      ]}
    >
      <Pressable
        accessibilityLabel="Attach photo"
        accessibilityRole="button"
        disabled={sendingChat}
        onPress={onAttachPhoto}
        style={({ pressed }) => [
          styles.attachBtn,
          {
            backgroundColor: pressed ? palette.pillBg : palette.surfaceElevated,
          },
        ]}
        testID="booking-chat-attach"
      >
        <Text style={{ fontSize: 18 }}>📷</Text>
      </Pressable>

      <TextInput
        editable={!sendingChat}
        onChangeText={onChangeChatInput}
        placeholder={
          language === 'en'
            ? `Message ${partnerName}...`
            : `Kirim pesan ke ${partnerName}...`
        }
        placeholderTextColor={palette.textMuted}
        style={[
          styles.inputField,
          {
            backgroundColor: palette.surfaceElevated,
            borderColor: palette.border,
            color: palette.text,
          },
        ]}
        testID="booking-chat-input"
        value={chatInput}
      />

      <Pressable
        accessibilityRole="button"
        disabled={sendingChat || !chatInput.trim()}
        onPress={onSend}
        style={[
          styles.sendBtn,
          { backgroundColor: palette.primary },
          (sendingChat || !chatInput.trim()) && { opacity: 0.4 },
        ]}
        testID="booking-chat-send"
      >
        <Text style={styles.sendBtnIcon}>➤</Text>
      </Pressable>
    </View>
  );
}

function createStyles(palette: {
  border: string;
  primary: string;
  surface: string;
  surfaceElevated: string;
  text: string;
  textMuted: string;
}) {
  return StyleSheet.create({
    attachBtn: {
      alignItems: 'center',
      borderRadius: radii.pill,
      borderWidth: 0,
      height: 40,
      justifyContent: 'center',
      width: 40,
    },
    bookAgainBtn: {
      alignItems: 'center',
      borderRadius: radii.pill,
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: 12,
      width: '100%',
    },
    bookAgainBtnText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '800',
    },
    completedBadgeText: {
      fontSize: 13,
      fontWeight: '700',
    },
    completedFooter: {
      alignItems: 'center',
      borderTopWidth: 1,
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    completedInfoRow: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
    },
    inputBar: {
      alignItems: 'center',
      borderTopWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      gap: spacing.sm,
      padding: spacing.md,
    },
    inputField: {
      borderRadius: 22,
      borderWidth: 1,
      flex: 1,
      fontSize: 14,
      minHeight: 40,
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
    },
    sendBtn: {
      alignItems: 'center',
      borderRadius: radii.pill,
      height: 40,
      justifyContent: 'center',
      width: 40,
    },
    sendBtnIcon: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '800',
      marginLeft: 2,
    },
  });
}
