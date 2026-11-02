import { font } from '../../../theme/typography';
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useAppearance } from "../../../context/AppearanceContext";
import { useLanguage } from "../../../i18n/locale";
import { colors, spacing } from "../../../theme/tokens";

export interface PrivateContactEditorProps {
  email?: string;
  phoneNumber?: string;
  onChangePhoneNumber?: (value: string) => void;
  onSavePrivateContact?: () => Promise<void>;
}

export function PrivateContactEditor({
  email = "",
  phoneNumber = "",
  onChangePhoneNumber,
  onSavePrivateContact,
}: PrivateContactEditorProps) {
  const { language } = useLanguage();
  const { palette } = useAppearance();
  const [isSaving, setIsSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleSave = async () => {
    if (!onSavePrivateContact) return;
    setIsSaving(true);
    setErrorFeedback(null);
    setSavedNotice(null);
    if (timerRef.current) clearTimeout(timerRef.current);

    try {
      await onSavePrivateContact();
      setSavedNotice(language === "en" ? "Saved" : "Tersimpan");
      timerRef.current = setTimeout(() => {
        setSavedNotice(null);
      }, 3000);
    } catch (err) {
      setErrorFeedback(
        err instanceof Error
          ? err.message
          : language === "en"
            ? "Failed to save contact details."
            : "Gagal menyimpan detail kontak."
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
      testID="security-contact-card"
    >
      <Text style={[styles.cardTitle, { color: palette.text }]}>
        {language === "en"
          ? "Private Contact Credentials"
          : "Kredensial Kontak Pribadi"}
      </Text>
      <Text style={[styles.cardSub, { color: palette.textMuted }]}>
        {language === "en"
          ? "Your email and phone number are private and never displayed on public profile cards."
          : "Email dan nomor telepon Anda bersifat privat dan tidak pernah ditampilkan di profil publik."}
      </Text>

      {/* 1. Disabled Email */}
      <Text style={[styles.fieldLabel, { color: palette.text }]}>
        {language === "en" ? "Email Address" : "Alamat Email"}
      </Text>
      <TextInput
        editable={false}
        style={[
          styles.input,
          styles.inputDisabled,
          {
            backgroundColor: palette.surface,
            borderColor: palette.border,
            color: palette.textMuted,
          },
        ]}
        testID="settings-private-email"
        value={email}
      />

      {/* 2. Editable Phone Number */}
      <Text style={[styles.fieldLabel, { color: palette.text }]}>
        {language === "en" ? "Phone Number" : "Nomor Telepon"}
      </Text>
      <TextInput
        keyboardType="phone-pad"
        onChangeText={onChangePhoneNumber}
        placeholder={
          language === "en" ? "+62 812-xxxx-xxxx" : "+62 812-xxxx-xxxx"
        }
        placeholderTextColor={palette.textMuted}
        style={[
          styles.input,
          {
            backgroundColor: palette.surface,
            borderColor: palette.border,
            color: palette.text,
          },
        ]}
        testID="settings-phone-number"
        value={phoneNumber}
      />

      {onSavePrivateContact && (
        <View style={styles.actionRowWithNotice}>
          <Pressable
            accessibilityRole="button"
            disabled={isSaving}
            onPress={() => {
              void handleSave();
            }}
            style={[styles.smallSaveBtn, isSaving && styles.btnDisabled]}
            testID="save-private-contact"
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
      )}

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
    fontSize: font.subtitle,
    fontWeight: "800",
  },
  cardSub: {
    fontSize: font.body,
    lineHeight: 17,
    marginBottom: spacing.sm,
    marginTop: 2,
  },
  fieldLabel: {
    fontSize: font.body,
    fontWeight: "700",
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },
  input: {
    borderRadius: 5,
    borderWidth: 1,
    fontSize: font.label,
    marginBottom: spacing.sm,
    minHeight: 42,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  inputDisabled: {
    opacity: 0.7,
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
    fontSize: font.body,
    fontWeight: "800",
  },
  inlineSavedNotice: {
    fontSize: font.label,
    fontWeight: "700",
  },
  btnDisabled: {
    opacity: 0.5,
  },
  errorText: {
    color: colors.danger,
    fontSize: font.body,
    fontWeight: "600",
    marginTop: spacing.xs,
  },
});
