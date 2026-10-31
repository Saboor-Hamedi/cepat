import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useLanguage, type Language } from '../../i18n/locale';
import { colors, radii, spacing } from '../../theme/tokens';
import { SettingSection } from '../components/SettingSection';

export function SettingLanguage() {
  const { language, setLanguage, syncNote, accountLinked, t } = useLanguage();

  const options: {
    code: Language;
    label: string;
    nativeLabel: string;
    region: string;
    flag: string;
    testID: string;
  }[] = [
    {
      code: 'id',
      label: t('settings.indonesian'),
      nativeLabel: 'Bahasa Indonesia',
      region: 'Indonesia (ID)',
      flag: '🇮🇩',
      testID: 'language-id',
    },
    {
      code: 'en',
      label: t('settings.english'),
      nativeLabel: 'English',
      region: 'International (US/UK)',
      flag: '🌐',
      testID: 'language-en',
    },
  ];

  return (
    <SettingSection
      eyebrow={language === 'en' ? 'LANGUAGE & REGION' : 'BAHASA & WILAYAH'}
      title={t('settings.languageTitle')}
      description={
        language === 'en'
          ? 'Choose your interface language. Currencies and dates adapt automatically.'
          : 'Pilih bahasa tampilan antarmuka. Format mata uang dan tanggal menyesuaikan otomatis.'
      }
      testID="setting-section-language"
    >
      <View style={styles.optionsWrap}>
        {options.map((opt) => {
          const selected = language === opt.code;
          return (
            <Pressable
              key={opt.code}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => {
                void setLanguage(opt.code);
              }}
              style={[styles.languageOption, selected && styles.languageOptionSelected]}
              testID={opt.testID}
            >
              <Text style={styles.flagIcon}>{opt.flag}</Text>
              <View style={styles.textWrap}>
                <Text style={[styles.languageName, selected && styles.languageNameSelected]}>
                  {opt.label}
                </Text>
                <Text style={styles.languageSub}>
                  {opt.nativeLabel} · {opt.region}
                </Text>
              </View>
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected && <View style={styles.radioDot} />}
              </View>
            </Pressable>
          );
        })}
      </View>

      {syncNote && <Text style={styles.saveNote}>{t(`settings.${syncNote}`)}</Text>}
      {!accountLinked && <Text style={styles.deviceNote}>{t('settings.deviceOnly')}</Text>}
    </SettingSection>
  );
}

const styles = StyleSheet.create({
  optionsWrap: {
    gap: spacing.xs,
  },
  languageOption: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 60,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  languageOptionSelected: {
    backgroundColor: '#F0FDF4',
    borderColor: colors.greenDark,
    borderWidth: 1.5,
  },
  flagIcon: {
    fontSize: 24,
  },
  textWrap: {
    flex: 1,
  },
  languageName: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  languageNameSelected: {
    color: colors.greenDark,
    fontWeight: '800',
  },
  languageSub: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  radio: {
    alignItems: 'center',
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 2,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  radioSelected: {
    borderColor: colors.greenDark,
  },
  radioDot: {
    backgroundColor: colors.greenDark,
    borderRadius: radii.pill,
    height: 10,
    width: 10,
  },
  saveNote: {
    color: colors.greenDark,
    fontSize: 12,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  deviceNote: {
    color: colors.muted,
    fontSize: 11,
    marginTop: spacing.xs,
  },
});
