import { ArrowUp, Check, RotateCcw } from 'lucide-react-native';
import { useMemo } from 'react';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';

import { useAppearance } from '../../context/AppearanceContext';
import { useLanguage } from '../../i18n/locale';
import { MediaPickerButton } from '../MediaPickerButton';
import { createChatComposerStyles } from './css/chatStyles';

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
  const styles = useMemo(() => createChatComposerStyles(palette), [palette]);

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
            <Check color="#FFFFFF" size={12} strokeWidth={3.2} />
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
            <RotateCcw color="#FFFFFF" size={17} strokeWidth={2.4} />
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
    <>
      <View
        style={[
          styles.inputBar,
          { backgroundColor: palette.surface, borderTopColor: palette.border },
        ]}
      >
        <View
          style={[
            styles.inputPill,
            {
              backgroundColor: palette.surfaceElevated,
              borderColor: palette.border,
            },
          ]}
        >
          <MediaPickerButton
            accessibilityLabel="Attach photo"
            disabled={sendingChat}
            icon="plus"
            onImageSelected={() => onAttachPhoto()}
            sheetTestIDPrefix="chat-photo"
            testID="booking-chat-attach"
          />

          <TextInput
            editable={!sendingChat}
            multiline
            onChangeText={onChangeChatInput}
            onKeyPress={(e) => {
              if (Platform.OS === 'web' && 'key' in e.nativeEvent) {
                const webEvent = e.nativeEvent as unknown as {
                  key: string;
                  shiftKey: boolean;
                  preventDefault?: () => void;
                };
                if (webEvent.key === 'Enter' && !webEvent.shiftKey) {
                  if (typeof webEvent.preventDefault === 'function') {
                    webEvent.preventDefault();
                  }
                  if (!sendingChat && chatInput.trim()) {
                    onSend();
                  }
                }
              }
            }}
            placeholder={
              language === 'en'
                ? `Message ${partnerName}…`
                : `Kirim pesan ke ${partnerName}…`
            }
            placeholderTextColor={palette.textMuted}
            style={[styles.inputField, { color: palette.text }]}
            testID="booking-chat-input"
            value={chatInput}
          />

          <Pressable
            accessibilityRole="button"
            disabled={sendingChat || !chatInput.trim()}
            hitSlop={4}
            onPress={onSend}
            style={[
              styles.sendBtn,
              { backgroundColor: palette.primary },
              (sendingChat || !chatInput.trim()) && { opacity: 0.4 },
            ]}
            testID="booking-chat-send"
          >
            <ArrowUp color="#FFFFFF" size={19} strokeWidth={2.8} />
          </Pressable>
        </View>
      </View>
    </>
  );
}
