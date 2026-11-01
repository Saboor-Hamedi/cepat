import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAppearance } from '../../context/AppearanceContext';
import { useLanguage } from '../../i18n/locale';

const SUCCESS = '#22C55E';

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
          <View style={styles.completedCheckCircle}>
            <Text style={styles.completedCheck}>✓</Text>
          </View>
          <Text style={[styles.completedBadgeText, { color: SUCCESS }]}>
            {language === 'en' ? 'Task has completed' : 'Tugas telah selesai'}
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
            <Text style={styles.bookAgainIcon}>↻</Text>
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
        hitSlop={6}
        onPress={onAttachPhoto}
        style={({ pressed }) => [
          styles.attachBtn,
          {
            backgroundColor: pressed ? palette.pillBg : palette.surfaceElevated,
          },
        ]}
        testID="booking-chat-attach"
      >
        <Text style={styles.attachIcon}>📷</Text>
      </Pressable>

      <TextInput
        editable={!sendingChat}
        multiline
        onChangeText={onChangeChatInput}
        placeholder={
          language === 'en'
            ? `Message ${partnerName}…`
            : `Kirim pesan ke ${partnerName}…`
        }
        placeholderTextColor={palette.textMuted}
        style={[
          styles.inputField,
          {
            backgroundColor: palette.surfaceElevated,
            color: palette.text,
          },
        ]}
        testID="booking-chat-input"
        value={chatInput}
      />

      <Pressable
        accessibilityRole="button"
        disabled={sendingChat || !chatInput.trim()}
        hitSlop={6}
        onPress={onSend}
        style={[
          styles.sendBtn,
          { backgroundColor: palette.primary },
          (sendingChat || !chatInput.trim()) && { opacity: 0.4 },
        ]}
        testID="booking-chat-send"
      >
        <Text style={styles.sendBtnIcon}>↑</Text>
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
      borderRadius: 22,
      height: 44,
      justifyContent: 'center',
      width: 44,
    },
    attachIcon: {
      fontSize: 18,
    },
    bookAgainBtn: {
      alignItems: 'center',
      borderRadius: 14,
      flexDirection: 'row',
      gap: 8,
      justifyContent: 'center',
      marginHorizontal: 20,
      paddingHorizontal: 20,
      paddingVertical: 14,
    },
    bookAgainBtnText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '800',
      letterSpacing: 0.1,
    },
    bookAgainIcon: {
      color: '#FFFFFF',
      fontSize: 17,
      fontWeight: '800',
      marginTop: -1,
    },
    completedBadgeText: {
      fontSize: 12.5,
      fontWeight: '700',
      letterSpacing: 0.1,
    },
    completedCheck: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '900',
    },
    completedCheckCircle: {
      alignItems: 'center',
      backgroundColor: SUCCESS,
      borderRadius: 9,
      height: 18,
      justifyContent: 'center',
      width: 18,
    },
    completedFooter: {
      alignItems: 'center',
      borderTopWidth: StyleSheet.hairlineWidth,
      gap: 12,
      paddingBottom: 14,
      paddingTop: 14,
    },
    completedInfoRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 7,
      justifyContent: 'center',
    },
    inputBar: {
      alignItems: 'flex-end',
      borderTopWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    inputField: {
      borderRadius: 22,
      flex: 1,
      fontSize: 14.5,
      maxHeight: 108,
      minHeight: 44,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 12,
    },
    sendBtn: {
      alignItems: 'center',
      borderRadius: 22,
      height: 44,
      justifyContent: 'center',
      width: 44,
    },
    sendBtnIcon: {
      color: '#FFFFFF',
      fontSize: 20,
      fontWeight: '800',
      marginTop: -1,
    },
  });
}
