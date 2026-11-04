import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAppearance } from "../../context/AppearanceContext";
import { useLanguage, type Language } from "../../i18n/locale";
import { radii, spacing } from "../../theme/tokens";
import { font } from "../../theme/typography";
import { SettingSection } from "../components/SettingSection";

export function SettingLanguage() {
  const { language, setLanguage, syncNote, accountLinked, t } = useLanguage();
  const { palette, scaleFont } = useAppearance();

  const options: {
    code: Language;
    label: string;
    nativeLabel: string;
    region: string;
    flag: string;
    testID: string;
  }[] = [
    {
      code: "id",
      label: t("settings.indonesian"),
      nativeLabel: "Bahasa Indonesia",
      region: "Indonesia (ID)",
      flag: "🇮🇩",
      testID: "language-id",
    },
    {
      code: "en",
      label: t("settings.english"),
      nativeLabel: "English",
      region: "International (US/UK)",
      flag: "🌐",
      testID: "language-en",
    },
  ];

  return (
    <SettingSection
      eyebrow={language === "en" ? "LANGUAGE & REGION" : "BAHASA & WILAYAH"}
      title={t("settings.languageTitle")}
      description={
        language === "en"
          ? "Choose your interface language. Currencies and dates adapt automatically."
          : "Pilih bahasa tampilan antarmuka. Format mata uang dan tanggal menyesuaikan otomatis."
      }
      testID="setting-section-language"
    >
      <View style={styles.optionsWrap} testID="account-language-section">
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
              style={({ pressed }) => [
                styles.languageOption,
                {
                  backgroundColor: palette.surfaceElevated,
                  borderColor: selected ? palette.primary : palette.border,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
              testID={opt.testID}
            >
              <Text style={styles.flagIcon}>{opt.flag}</Text>
              <View style={styles.textWrap}>
                <Text
                  style={[
                    styles.languageName,
                    {
                      color: selected ? palette.primary : palette.text,
                      fontSize: scaleFont(font.label),
                    },
                    selected && styles.languageNameSelected,
                  ]}
                >
                  {opt.label}
                </Text>
                <Text
                  style={[
                    styles.languageSub,
                    { color: palette.textMuted, fontSize: scaleFont(font.caption) },
                  ]}
                >
                  {opt.nativeLabel} · {opt.region}
                </Text>
              </View>
              <View
                style={[
                  styles.radio,
                  {
                    borderColor: selected ? palette.primary : palette.border,
                  },
                ]}
              >
                {selected && (
                  <View
                    style={[
                      styles.radioDot,
                      { backgroundColor: palette.primary },
                    ]}
                  />
                )}
              </View>
            </Pressable>
          );
        })}
      </View>

      {syncNote && (
        <Text style={[styles.saveNote, { color: palette.primary }]}>
          {t(`settings.${syncNote}`)}
        </Text>
      )}
      {!accountLinked && (
        <Text style={[styles.deviceNote, { color: palette.textMuted }]}>
          {t("settings.deviceOnly")}
        </Text>
      )}
    </SettingSection>
  );
}

const styles = StyleSheet.create({
  optionsWrap: {
    gap: 6,
    width: "100%",
  },
  languageOption: {
    alignItems: "center",
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 10,
    width: "100%",
  },
  flagIcon: {
    fontSize: 22,
  },
  textWrap: {
    flex: 1,
  },
  languageName: {
    fontWeight: "600",
  },
  languageNameSelected: {
    fontWeight: "700",
  },
  languageSub: {
    marginTop: 2,
  },
  radio: {
    alignItems: "center",
    borderRadius: radii.pill,
    borderWidth: 2,
    height: 20,
    justifyContent: "center",
    width: 20,
  },
  radioDot: {
    borderRadius: radii.pill,
    height: 10,
    width: 10,
  },
  saveNote: {
    fontSize: font.body,
    fontWeight: "600",
    marginTop: spacing.sm,
  },
  deviceNote: {
    fontSize: font.caption,
    marginTop: 4,
  },
});
