import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppearance } from '../../context/AppearanceContext';
import { useLanguage } from '../../i18n/locale';

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
        hitSlop={8}
        onPress={() => setIsOpen((prev) => !prev)}
        style={({ pressed }) => [
          styles.menuDotsBtn,
          {
            backgroundColor: pressed ? palette.pillBg : palette.surfaceElevated,
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
              <Text style={styles.itemIcon}>📋</Text>
            </View>
            <Text style={[styles.dropdownMenuText, { color: palette.text }]}>
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
              <Text style={styles.itemIcon}>🗑️</Text>
            </View>
            <Text style={[styles.dropdownMenuText, { color: palette.danger }]}>
              {language === 'en' ? 'Clear chat history' : 'Hapus riwayat chat'}
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
  dangerIconWrap: {
    backgroundColor: 'rgba(240, 40, 73, 0.12)',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
    opacity: 0.8,
  },
  dropdownMenu: {
    borderRadius: 16,
    borderWidth: 1,
    elevation: 10,
    minWidth: 214,
    overflow: 'hidden',
    paddingVertical: 6,
    position: 'absolute',
    right: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    top: 50,
    zIndex: 200,
  },
  dropdownMenuItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownMenuText: {
    fontSize: 13,
    fontWeight: '600',
  },
  itemIcon: {
    fontSize: 13,
  },
  itemIconWrap: {
    alignItems: 'center',
    borderRadius: 9,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  menuDotsBtn: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  menuDotsText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginTop: -3,
  },
});
