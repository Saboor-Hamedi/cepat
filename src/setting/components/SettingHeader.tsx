import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAppearance } from '../../context/AppearanceContext';
import { useLanguage } from '../../i18n/locale';
import { colors, radii, spacing } from '../../theme/tokens';

export type SettingSectionKey =
  | 'account'
  | 'profile'
  | 'password'
  | 'notifications'
  | 'language'
  | 'appearance'
  | 'security';

export interface SettingHeaderProps {
  activeSection: SettingSectionKey;
  onSelectSection: (section: SettingSectionKey) => void;
  isAuthenticated: boolean;
}

export function SettingHeader({
  activeSection,
  onSelectSection,
  isAuthenticated,
}: SettingHeaderProps) {
  const { language } = useLanguage();
  const { palette } = useAppearance();

  const allTabs: { key: SettingSectionKey; label: string; authOnly?: boolean }[] = [
    { key: 'account', label: language === 'en' ? 'Account' : 'Akun' },
    { key: 'language', label: language === 'en' ? 'Language' : 'Bahasa' },
    { key: 'appearance', label: language === 'en' ? 'Appearance' : 'Tampilan' },
    { key: 'security', label: language === 'en' ? 'Security' : 'Keamanan', authOnly: true },
    { key: 'password', label: language === 'en' ? 'Password' : 'Kata Sandi', authOnly: true },
    {
      key: 'notifications',
      label: language === 'en' ? 'Notifications' : 'Notifikasi',
      authOnly: true,
    },
  ];

  const visibleTabs = allTabs.filter((tab) => !tab.authOnly || isAuthenticated);

  return (
    <View style={styles.headerContainer}>
      <Text style={styles.srOnly}>
        {language === 'en' ? '' : 'Pengaturan'}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabRow}
      >
        {visibleTabs.map((tab) => {
          const selected = activeSection === tab.key;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => onSelectSection(tab.key)}
              style={[
                styles.tabPill,
                { backgroundColor: palette.pillBg },
                selected && styles.tabPillSelected,
              ]}
              testID={`setting-tab-${tab.key}`}
            >
              <Text
                style={[
                  styles.tabPillText,
                  { color: palette.pillText },
                  selected && styles.tabPillTextSelected,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  srOnly: {
    height: 0,
    opacity: 0,
    position: 'absolute',
    width: 0,
  },
  tabRow: {
    gap: 8,
    paddingVertical: 4,
  },
  tabPill: {
    backgroundColor: '#E4E6EB',
    borderRadius: radii.pill,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  tabPillSelected: {
    backgroundColor: colors.greenDark,
  },
  tabPillText: {
    color: '#050505',
    fontSize: 13,
    fontWeight: '700',
  },
  tabPillTextSelected: {
    color: '#FFFFFF',
  },
});
