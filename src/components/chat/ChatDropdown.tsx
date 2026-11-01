import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppearance } from '../../context/AppearanceContext';
import { useLanguage } from '../../i18n/locale';
import { radii, spacing } from '../../theme/tokens';

export interface ChatDropdownProps {
  bookingId: string;
  onClearHistory: () => void;
}

export function ChatDropdown({ bookingId, onClearHistory }: ChatDropdownProps) {
  const { language } = useLanguage();
  const { palette } = useAppearance();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityLabel="Chat options"
        accessibilityRole="button"
        onPress={() => setIsOpen((prev) => !prev)}
        style={({ pressed }) => [
          styles.menuDotsBtn,
          {
            backgroundColor: pressed
              ? palette.pillBg
              : palette.surfaceElevated,
          },
        ]}
        testID="chat-menu-toggle-btn"
      >
        <Text style={[styles.menuDotsText, { color: palette.text }]}>•••</Text>
      </Pressable>

      {isOpen && (
        <View
          style={[
            styles.dropdownMenu,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}
        >
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
            <Text style={styles.itemIcon}>🗑️</Text>
            <Text style={[styles.dropdownMenuText, { color: palette.danger }]}>
              {language === 'en' ? 'Clear chat history' : 'Hapus riwayat chat'}
            </Text>
          </Pressable>

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
            <Text style={styles.itemIcon}>📋</Text>
            <Text style={[styles.dropdownMenuText, { color: palette.text }]}>
              {language === 'en' ? 'View task details' : 'Lihat detail tugas'}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 100,
  },
  dropdownMenu: {
    borderRadius: radii.md,
    borderWidth: 1,
    elevation: 8,
    minWidth: 190,
    overflow: 'hidden',
    paddingVertical: spacing.xs,
    position: 'absolute',
    right: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    top: 44,
    zIndex: 200,
  },
  dropdownMenuItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  dropdownMenuText: {
    fontSize: 13,
    fontWeight: '600',
  },
  itemIcon: {
    fontSize: 14,
  },
  menuDotsBtn: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  menuDotsText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
});
