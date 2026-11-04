import { Check } from "lucide-react-native";
import { font } from '../../../theme/typography';
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAppearance } from "../../../context/AppearanceContext";
import { useLanguage } from "../../../i18n/locale";
import { colors, radii, spacing } from "../../../theme/tokens";

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
          backgroundColor: "transparent",
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

      <Text style={[styles.fieldLabel, { color: palette.textMuted }]}>
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

      <Text style={[styles.fieldLabel, { color: palette.textMuted }]}>
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
            borderWidth: 0,
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
            style={[
              styles.saveBtn,
              { backgroundColor: palette.primary },
              isSaving && styles.saveBtnDisabled,
            ]}
            testID="save-private-contact"
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveBtnText}>
                {language === "en" ? "Save" : "Simpan"}
              </Text>
            )}
          </Pressable>

          {savedNotice ? (
            <View style={styles.savedNoticeRow} testID="private-contact-saved">
              <Check size={16} strokeWidth={2.5} color={colors.greenDark} />
              <Text style={styles.savedNoticeText}>{savedNotice}</Text>
            </View>
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
    paddingVertical: spacing.xs,
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
    fontSize: font.caption,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: spacing.xs,
    textTransform: "uppercase",
  },
  input: {
    borderRadius: radii.sm,
    borderWidth: 0,
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
    marginTop: spacing.md,
  },
  saveBtn: {
    alignItems: "center",
    borderRadius: radii.sm,
    height: 38,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: font.body,
    fontWeight: "800",
  },
  savedNoticeRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  savedNoticeText: {
    color: colors.greenDark,
    fontSize: font.body,
    fontWeight: "700",
  },
  errorText: {
    color: colors.danger,
    fontSize: font.body,
    fontWeight: "600",
    marginTop: spacing.xs,
  },
});
