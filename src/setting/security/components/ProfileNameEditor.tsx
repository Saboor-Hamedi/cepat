import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useAppearance } from "../../../context/AppearanceContext";
import { useLanguage } from "../../../i18n/locale";
import { colors, spacing } from "../../../theme/tokens";

export interface ProfileNameEditorProps {
  initialDisplayName?: string;
  initialUsername?: string;
  onSaveDisplayName?: (nextName: string) => Promise<void>;
  onSaveProfileIdentity?: (nextDisplayName: string, nextUsername: string) => Promise<void>;
}

export function ProfileNameEditor({
  initialDisplayName = "",
  initialUsername = "",
  onSaveDisplayName,
  onSaveProfileIdentity,
}: ProfileNameEditorProps) {
  const { language } = useLanguage();
  const { palette } = useAppearance();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [username, setUsername] = useState(initialUsername);
  const [isSaving, setIsSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDisplayName(initialDisplayName);
  }, [initialDisplayName]);

  useEffect(() => {
    setUsername(initialUsername);
  }, [initialUsername]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleSave = async () => {
    const trimmedDisplay = displayName.trim();
    const cleanUsername = username.trim().replace(/^@/, "").toLowerCase();

    if (!trimmedDisplay) {
      setErrorFeedback(
        language === "en"
          ? "Please enter a valid display name."
          : "Mohon masukkan nama tampilan yang valid."
      );
      return;
    }

    setIsSaving(true);
    setErrorFeedback(null);
    setSavedNotice(null);
    if (timerRef.current) clearTimeout(timerRef.current);

    try {
      if (onSaveProfileIdentity) {
        await onSaveProfileIdentity(trimmedDisplay, cleanUsername);
      } else if (onSaveDisplayName) {
        await onSaveDisplayName(trimmedDisplay);
      }
      setSavedNotice(language === "en" ? "Updated" : "Diperbarui");
      timerRef.current = setTimeout(() => {
        setSavedNotice(null);
      }, 3000);
    } catch (err) {
      setErrorFeedback(
        err instanceof Error
          ? err.message
          : language === "en"
            ? "Failed to update profile identity."
            : "Gagal memperbarui identitas profil."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: palette.surfaceElevated,
          borderColor: palette.border,
        },
      ]}
      testID="security-profile-name-card"
    >
      <Text style={[styles.cardTitle, { color: palette.text }]}>
        {language === "en" ? "Public Profile Identity" : "Identitas Profil Publik"}
      </Text>
      <Text style={[styles.cardSub, { color: palette.textMuted }]}>
        {language === "en"
          ? "Your display name and username appear on your public profile, posts, and booking requests."
          : "Nama tampilan dan username Anda ditampilkan di profil publik, postingan, dan pesanan Anda."}
      </Text>

      {/* 1. Public Display Name */}
      <Text style={[styles.fieldLabel, { color: palette.text }]}>
        {language === "en" ? "Display Name" : "Nama Tampilan"}
      </Text>
      <TextInput
        onChangeText={setDisplayName}
        placeholder={language === "en" ? "Your full or business name" : "Nama lengkap atau bisnis Anda"}
        placeholderTextColor={palette.textMuted}
        style={[
          styles.input,
          {
            backgroundColor: palette.surface,
            borderColor: palette.border,
            color: palette.text,
          },
        ]}
        testID="settings-profile-display-name-input"
        value={displayName}
      />

      {/* 2. Public Username (@handle) */}
      <Text style={[styles.fieldLabel, { color: palette.text }]}>
        {language === "en" ? "Username" : "Username"}
      </Text>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={(text) => setUsername(text.replace(/[^a-zA-Z0-9._-]/g, ""))}
        placeholder={language === "en" ? "username (e.g. rizky_ac)" : "username (cth. rizky_ac)"}
        placeholderTextColor={palette.textMuted}
        style={[
          styles.input,
          {
            backgroundColor: palette.surface,
            borderColor: palette.border,
            color: palette.text,
          },
        ]}
        testID="settings-profile-username-input"
        value={username}
      />

      {/* Action Row: Small Save Button on LEFT + Inline Label without background/border that hides after 3s */}
      <View style={styles.actionRowWithNotice}>
        <Pressable
          accessibilityRole="button"
          disabled={isSaving || !displayName.trim()}
          onPress={() => {
            void handleSave();
          }}
          style={[styles.smallSaveBtn, (isSaving || !displayName.trim()) && styles.btnDisabled]}
          testID="save-profile-name-btn"
        >
          <Text style={styles.smallSaveBtnText}>
            {isSaving
              ? language === "en"
                ? "Saving..."
                : "Menyimpan..."
              : language === "en"
                ? "Save"
                : "Simpan"}
          </Text>
        </Pressable>

        {savedNotice ? (
          <Text style={[styles.inlineSavedNotice, { color: palette.primary }]}>
            {savedNotice}
          </Text>
        ) : null}
      </View>

      {errorFeedback ? (
        <Text style={styles.errorText}>
          {errorFeedback}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 5,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  cardSub: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: spacing.sm,
    marginTop: 2,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },
  input: {
    borderRadius: 5,
    borderWidth: 1,
    fontSize: 13,
    marginBottom: spacing.sm,
    minHeight: 42,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  actionRowWithNotice: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginTop: 2,
  },
  smallSaveBtn: {
    alignItems: "center",
    backgroundColor: colors.greenDark,
    borderRadius: 5,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: spacing.lg,
  },
  smallSaveBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  inlineSavedNotice: {
    fontSize: 13,
    fontWeight: "700",
  },
  btnDisabled: {
    opacity: 0.5,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "600",
    marginTop: spacing.xs,
  },
});
