import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useLanguage } from '../../i18n/locale';
import { colors, radii, spacing } from '../../theme/tokens';
import type { UserPreferences } from '../../types/marketplace';
import { SettingItem } from '../components/SettingItem';
import { SettingSection } from '../components/SettingSection';

export interface SettingAppearanceProps {
  preferences: UserPreferences;
  onUpdateAppearance: (mode: UserPreferences['appearance']) => void;
  onUpdateAccessibility: (next: UserPreferences['accessibility']) => void;
  feedback?: string | null;
}

export function SettingAppearance({
  preferences,
  onUpdateAppearance,
  onUpdateAccessibility,
  feedback,
}: SettingAppearanceProps) {
  const { language, t } = useLanguage();

  const modes: { key: UserPreferences['appearance']; label: string }[] = [
    { key: 'light', label: language === 'en' ? 'Light' : 'Terang' },
    { key: 'dark', label: language === 'en' ? 'Dark' : 'Gelap' },
    { key: 'system', label: language === 'en' ? 'System' : 'Sistem' },
  ];

  return (
    <SettingSection
      eyebrow={language === 'en' ? 'APPEARANCE & ACCESSIBILITY' : 'TAMPILAN & AKSESIBILITAS'}
      title={t('settings.AppearanceTitle')}
      description={
        language === 'en'
          ? 'Customize surface contrast, text sizing, and motion preferences.'
          : 'Sesuaikan kontras tampilan, ukuran teks, dan preferensi animasi.'
      }
      testID="setting-section-appearance"
    >
      <Text style={styles.subLabel}>
        {language === 'en' ? 'Color theme' : 'Tema warna aplikasi'}
      </Text>
      <View style={styles.chipRow}>
        {modes.map((item) => {
          const selected = preferences.appearance === item.key;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onUpdateAppearance(item.key)}
              style={[styles.chip, selected && styles.chipSelected]}
              testID={`pref-appearance-${item.key}`}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <SettingItem
        accessibilityRole="switch"
        active={preferences.accessibility.largeText}
        description={
          language === 'en'
            ? 'Increase text legibility across service descriptions and cards.'
            : 'Perbesar keterbacaan teks pada deskripsi layanan dan kartu.'
        }
        label={language === 'en' ? 'Larger readable text' : 'Teks lebih besar & mudah dibaca'}
        onPress={() =>
          onUpdateAccessibility({
            ...preferences.accessibility,
            largeText: !preferences.accessibility.largeText,
          })
        }
        testID="pref-a11y-large-text"
      />

      <SettingItem
        accessibilityRole="switch"
        active={preferences.accessibility.reduceMotion}
        description={
          language === 'en'
            ? 'Minimize screen transitions and decorative animations.'
            : 'Kurangi transisi layar dan animasi dekoratif.'
        }
        label={language === 'en' ? 'Reduce screen motion' : 'Kurangi animasi layar'}
        onPress={() =>
          onUpdateAccessibility({
            ...preferences.accessibility,
            reduceMotion: !preferences.accessibility.reduceMotion,
          })
        }
        testID="pref-a11y-reduce-motion"
      />

      {feedback ? (
        <Text style={styles.feedbackText} testID="pref-feedback">
          {feedback}
        </Text>
      ) : null}
    </SettingSection>
  );
}

const styles = StyleSheet.create({
  subLabel: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chip: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipSelected: {
    backgroundColor: colors.greenDark,
    borderColor: colors.greenDark,
  },
  chipText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '700',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  feedbackText: {
    color: colors.greenDark,
    fontSize: 12,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
});
