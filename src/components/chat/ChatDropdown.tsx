import { router } from 'expo-router';
import { ClipboardList, EllipsisVertical, Trash } from 'lucide-react-native';
import { ICON_SIZE, ICON_STROKE } from '../../theme/icons';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useAppearance } from '../../context/AppearanceContext';
import { useLanguage } from '../../i18n/locale';
import { createChatDropdownStyles } from './css/chatStyles';

export interface ChatDropdownProps {
  bookingId: string;
  onClearHistory: () => void;
}

export function ChatDropdown({ bookingId, onClearHistory }: ChatDropdownProps) {
  const { language } = useLanguage();
  const { palette } = useAppearance();
  const styles = useMemo(() => createChatDropdownStyles(palette), [palette]);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityLabel="Chat options"
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => setIsOpen((prev) => !prev)}
        style={({ pressed }) => [
          styles.menuDotsBtn,
          {
            backgroundColor: 'transparent',
            opacity: pressed ? 0.6 : 1,
          },
        ]}
        testID="chat-menu-toggle-btn"
      >
        <EllipsisVertical color={palette.text} size={ICON_SIZE} strokeWidth={ICON_STROKE} />
      </Pressable>

      {isOpen && (
        <>
          <Pressable
            accessibilityLabel="Close menu"
            onPress={() => setIsOpen(false)}
            style={styles.backdrop}
          />
          <View
            style={[
              styles.dropdownMenu,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
              },
            ]}
          >
            {/* Little knob pointing up to the ellipsis trigger */}
            <View
              style={[
                styles.knob,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                },
              ]}
            />
            <View style={styles.dropdownInner}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setIsOpen(false);
                  router.push(`/booking/${bookingId}`);
                }}
                style={({ pressed }) => [
                  styles.dropdownMenuItem,
                  pressed && { backgroundColor: palette.pillBg },
                ]}
                testID="view-task-details"
              >
                <View
                  style={[
                    styles.itemIconWrap,
                    { backgroundColor: palette.primarySoft },
                  ]}
                >
                  <ClipboardList
                    color={palette.primary}
                    size={ICON_SIZE}
                    strokeWidth={ICON_STROKE}
                  />
                </View>
                <Text
                  style={[styles.dropdownMenuText, { color: palette.text }]}
                >
                  {language === 'en' ? 'View task details' : 'Lihat detail tugas'}
                </Text>
              </Pressable>

              <View
                style={[styles.divider, { backgroundColor: palette.border }]}
              />

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setIsOpen(false);
                  onClearHistory();
                }}
                style={({ pressed }) => [
                  styles.dropdownMenuItem,
                  pressed && { backgroundColor: palette.pillBg },
                ]}
                testID="delete-chat-history"
              >
                <View style={[styles.itemIconWrap, styles.dangerIconWrap]}>
                  <Trash
                    color={palette.danger}
                    size={ICON_SIZE}
                    strokeWidth={ICON_STROKE}
                  />
                </View>
                <Text
                  style={[styles.dropdownMenuText, { color: palette.danger }]}
                >
                  {language === 'en'
                    ? 'Clear chat history'
                    : 'Hapus riwayat chat'}
                </Text>
              </Pressable>
            </View>
          </View>
        </>
      )}
    </View>
  );
}
