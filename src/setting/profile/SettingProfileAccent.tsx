import { Check, Minus } from "lucide-react-native";
import { useCallback, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Avatar } from "../../components/Avatar";
import { useAppearance } from "../../context/AppearanceContext";
import { useLanguage } from "../../i18n/locale";
import { font } from "../../theme/typography";
import { radii, spacing } from "../../theme/tokens";
import {
  DEFAULT_PROFILE_ACCENT_ID,
  PROFILE_ACCENTS,
  resolveProfileAccent,
} from "../../theme/profileAccent";

export interface SettingProfileAccentProps {
  // Avatar uri mirrored from the account profile so the preview matches reality.
  avatarUri?: string;
  // Name shown under the preview image.
  displayName: string;
  // Optional second line (e.g. email or handle) for the preview card.
  subtitle?: string;
}

// Settings panel that lets the user pick a 3px accent ring color for their
// profile image. Applies instantly (no save button) and persists through the
// appearance store, same as the theme and accessibility toggles.
export function SettingProfileAccent({
  avatarUri,
  displayName,
  subtitle,
}: SettingProfileAccentProps) {
  const { language } = useLanguage();
  const { palette, scaleFont, profileAccentId, setProfileAccent } =
    useAppearance();

  // Resolve the accent once per id change instead of on every render.
  const selected = useMemo(
    () => resolveProfileAccent(profileAccentId),
    [profileAccentId],
  );
  const selectedId = selected?.id ?? DEFAULT_PROFILE_ACCENT_ID;
  // Apply an accent by id; stable identity so swatches don't re-create handlers.
  const selectAccent = useCallback(
    (id: string) => {
      void setProfileAccent(id);
    },
    [setProfileAccent],
  );

  return (
    <View testID="setting-section-profile-accent">
      {/* Live preview of the profile image with the current ring applied */}
      <View
        style={[
          styles.previewCard,
          {
            backgroundColor: palette.surfaceElevated,
            borderColor: palette.border,
          },
        ]}
        testID="profile-accent-preview"
      >
        <Avatar uri={avatarUri} name={displayName} size={96} />
        <Text
          numberOfLines={1}
          style={[
            styles.previewName,
            { color: palette.text, fontSize: scaleFont(font.title) },
          ]}
        >
          {displayName || (language === "en" ? "Your profile" : "Profil Anda")}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={1}
            style={[
              styles.previewSubtitle,
              { color: palette.textMuted, fontSize: scaleFont(font.body) },
            ]}
          >
            {subtitle}
          </Text>
        ) : null}
        <Text
          style={[
            styles.previewAccentLabel,
            { color: palette.primary, fontSize: scaleFont(font.caption) },
          ]}
          testID="profile-accent-current-label"
        >
          {selected
            ? language === "en"
              ? selected.labelEn
              : selected.labelId
            : language === "en"
              ? "No ring"
              : "Tanpa aksen"}
        </Text>
      </View>

      {/* Section label, following the same pattern as the appearance panel */}
      <Text
        style={[
          styles.subLabel,
          { color: palette.textMuted, fontSize: scaleFont(font.caption) },
        ]}
      >
        {(language === "en" ? "RING COLOR" : "WARNA AKSEN")}
      </Text>

      {/* 10 accent swatches + an explicit "no ring" option */}
      <View style={styles.swatchWrap} testID="profile-accent-options">
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: selectedId === DEFAULT_PROFILE_ACCENT_ID }}
          accessibilityLabel={language === "en" ? "No ring" : "Tanpa aksen"}
          onPress={() => {
            selectAccent(DEFAULT_PROFILE_ACCENT_ID);
          }}
          style={[
            styles.swatch,
            styles.swatchNone,
            {
              borderColor: palette.border,
              backgroundColor: palette.inputBg,
            },
            selectedId === DEFAULT_PROFILE_ACCENT_ID && {
              borderColor: palette.primary,
              borderWidth: 2,
            },
          ]}
          testID="profile-accent-option-none"
        >
          <Minus
            size={20}
            color={palette.textMuted}
            strokeWidth={2}
          />
        </Pressable>
        {PROFILE_ACCENTS.map((accent) => {
          const isSelected = selectedId === accent.id;
          return (
            <Pressable
              key={accent.id}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={
                language === "en" ? accent.labelEn : accent.labelId
              }
              onPress={() => {
                selectAccent(accent.id);
              }}
              style={[
                styles.swatch,
                { backgroundColor: accent.color, borderColor: "transparent" },
                isSelected && {
                  borderColor: palette.text,
                  borderWidth: 2,
                },
              ]}
              testID={`profile-accent-option-${accent.id}`}
            >
              {isSelected ? (
                <Check
                  size={20}
                  color="#FFFFFF"
                  strokeWidth={3}
                />
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {/* Short explainer under the swatches */}
      <Text
        style={[
          styles.hint,
          { color: palette.textMuted, fontSize: scaleFont(font.caption) },
        ]}
      >
        {language === "en"
          ? "A 3px round ring around your profile image. Shown everywhere your profile picture appears on this device."
          : "Aksen melingkar 3px di sekitar foto profil Anda. Tampil di mana pun foto profil Anda muncul di perangkat ini."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  previewCard: {
    alignItems: "center",
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 2,
    marginBottom: spacing.md,
    paddingVertical: spacing.lg,
    width: "100%",
  },
  previewName: {
    fontWeight: "800",
    marginTop: spacing.sm,
    maxWidth: "90%",
  },
  previewSubtitle: {
    maxWidth: "90%",
  },
  previewAccentLabel: {
    fontWeight: "700",
    marginTop: 2,
  },
  subLabel: {
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  swatchWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  swatch: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  swatchNone: {
    borderWidth: 1,
  },
  hint: {
    lineHeight: 16,
    marginTop: spacing.sm,
  },
});
