import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAppearance } from "../../context/AppearanceContext";
import { useLanguage } from "../../i18n/locale";
import { colors, radii, spacing } from "../../theme/tokens";
import type { UserPreferences } from "../../types/marketplace";
import { SettingItem } from "../components/SettingItem";
import { SettingSection } from "../components/SettingSection";

export interface SettingAppearanceProps {
  preferences: UserPreferences;
  onUpdateAppearance: (mode: UserPreferences["appearance"]) => void;
  onUpdateAccessibility: (next: UserPreferences["accessibility"]) => void;
  feedback?: string | null;
}

export function SettingAppearance({
  preferences,
  onUpdateAppearance,
  onUpdateAccessibility,
  feedback,
}: SettingAppearanceProps) {
  const { language, t } = useLanguage();
  const {
    themeMode,
    largeText,
    reduceMotion,
    palette,
    setThemeMode,
    setLargeText,
    setReduceMotion,
  } = useAppearance();

  const currentTheme =
    preferences.appearance === "warm" ||
    preferences.appearance === "highContrast"
      ? preferences.appearance
      : themeMode;
  const currentLargeText =
    typeof preferences.accessibility?.largeText === "boolean"
      ? preferences.accessibility.largeText
      : largeText;
  const currentReduceMotion =
    typeof preferences.accessibility?.reduceMotion === "boolean"
      ? preferences.accessibility.reduceMotion
      : reduceMotion;

  const modes: { key: UserPreferences["appearance"]; label: string }[] = [
    { key: "light", label: language === "en" ? "Light" : "Terang" },
    { key: "dark", label: language === "en" ? "Dark" : "Gelap" },
    { key: "system", label: language === "en" ? "System" : "Sistem" },
  ];

  return (
    <SettingSection
      eyebrow={
        language === "en"
          ? "APPEARANCE & ACCESSIBILITY"
          : "TAMPILAN & AKSESIBILITAS"
      }
      title={t("settings.AppearanceTitle")}
      description={
        language === "en"
          ? "Customize surface contrast, text sizing, and motion preferences."
          : "Sesuaikan kontras tampilan, ukuran teks, dan preferensi animasi."
      }
      testID="setting-section-appearance"
    >
      <Text style={[styles.subLabel, { color: palette.text }]}>
        {language === "en" ? "Color theme" : "Tema warna aplikasi"}
      </Text>
      <View style={styles.chipRow}>
        {modes.map((item) => {
          const selected = currentTheme === item.key;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => {
                if (
                  item.key === "light" ||
                  item.key === "dark" ||
                  item.key === "system"
                ) {
                  void setThemeMode(item.key);
                }
                onUpdateAppearance(item.key);
              }}
              style={[
                styles.chip,
                {
                  backgroundColor: palette.surfaceElevated,
                  borderColor: palette.border,
                },
                selected && {
                  backgroundColor: palette.primary,
                  borderColor: palette.primary,
                },
              ]}
              testID={`pref-appearance-${item.key}`}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: palette.text },
                  selected && styles.chipTextSelected,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <SettingItem
        accessibilityRole="switch"
        active={currentLargeText}
        description={
          language === "en"
            ? "Increase text legibility across service descriptions and cards."
            : "Perbesar keterbacaan teks pada deskripsi layanan dan kartu."
        }
        label={
          language === "en"
            ? "Larger readable text"
            : "Teks lebih besar & mudah dibaca"
        }
        onPress={() => {
          const next = !currentLargeText;
          void setLargeText(next);
          onUpdateAccessibility({
            ...preferences.accessibility,
            largeText: next,
          });
        }}
        testID="pref-a11y-large-text"
      />

      <SettingItem
        accessibilityRole="switch"
        active={currentReduceMotion}
        description={
          language === "en"
            ? "Minimize screen transitions and decorative animations."
            : "Kurangi transisi layar dan animasi dekoratif."
        }
        label={
          language === "en" ? "Reduce screen motion" : "Kurangi animasi layar"
        }
        onPress={() => {
          const next = !currentReduceMotion;
          void setReduceMotion(next);
          onUpdateAccessibility({
            ...preferences.accessibility,
            reduceMotion: next,
          });
        }}
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
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
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
    fontWeight: "700",
  },
  chipTextSelected: {
    color: "#FFFFFF",
  },
  feedbackText: {
    color: colors.greenDark,
    fontSize: 12,
    fontWeight: "700",
    marginTop: spacing.sm,
  },
});
