import { Check, Eye, EyeOff } from "lucide-react-native";
import { font } from "../../theme/typography";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useAppearance } from "../../context/AppearanceContext";
import { useAuth } from "../../auth/AuthProvider";
import { supabase } from "../../data/marketplaceRepository";
import { useLanguage } from "../../i18n/locale";
import { colors, radii, spacing } from "../../theme/tokens";
import { SettingSection } from "../components/SettingSection";
import { ICON_SIZE, ICON_STROKE } from "../../theme/icons";

export function SettingPassword() {
  const { language, t } = useLanguage();
  const { palette } = useAppearance();
  const { user } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleUpdatePassword = async () => {
    setStatusMessage(null);
    setErrorMessage(null);

    if (!currentPassword.trim()) {
      setErrorMessage(
        language === "en"
          ? "Please enter your current password."
          : "Masukkan kata sandi Anda saat ini.",
      );
      return;
    }

    if (
      newPassword.length < 8 ||
      !/[A-Za-z]/.test(newPassword) ||
      !/\d/.test(newPassword)
    ) {
      setErrorMessage(t("auth.passwordRule"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage(t("auth.passwordMismatch"));
      return;
    }

    setBusy(true);
    try {
      if (supabase && user) {
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (error) {
          setErrorMessage(t("auth.resetFailed"));
          return;
        }
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSavedNotice(language === "en" ? "Updated" : "Diperbarui");
      setTimeout(() => {
        setSavedNotice(null);
      }, 3000);
    } catch {
      setErrorMessage(t("auth.serviceUnavailable"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SettingSection testID="setting-section-password">
      <View
        style={styles.card}
        testID="password-update-form"
      >
        <Text style={[styles.fieldLabel, { color: palette.text }]}>
          {language === "en" ? "Current Password" : "Kata Sandi Saat Ini"}
        </Text>
        <View
          style={[
            styles.inputRow,
            {
              backgroundColor: palette.inputBg,
              borderWidth: 0,
            },
          ]}
        >
          <TextInput
            onChangeText={setCurrentPassword}
            placeholder={
              language === "en"
                ? "Enter current password"
                : "Masukkan kata sandi saat ini"
            }
            secureTextEntry={!showCurrent}
            placeholderTextColor={palette.textMuted}
            style={[styles.inputInner, { color: palette.text }]}
            testID="settings-current-password"
            value={currentPassword}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={showCurrent ? "Hide password" : "Show password"}
            onPress={() => setShowCurrent((prev) => !prev)}
            style={styles.eyeBtn}
            testID="toggle-show-current-password"
          >
            {showCurrent ? (
              <EyeOff size={ICON_SIZE} strokeWidth={ICON_STROKE} color={palette.textMuted} />
            ) : (
              <Eye size={ICON_SIZE} strokeWidth={ICON_STROKE} color={palette.textMuted} />
            )}
          </Pressable>
        </View>

        <Text style={[styles.fieldLabel, { color: palette.text }]}>
          {t("auth.newPassword")}
        </Text>
        <View
          style={[
            styles.inputRow,
            {
              backgroundColor: palette.inputBg,
              borderWidth: 0,
            },
          ]}
        >
          <TextInput
            onChangeText={setNewPassword}
            placeholder={
              language === "en"
                ? "Enter new password"
                : "Masukkan kata sandi baru"
            }
            secureTextEntry={!showNew}
            placeholderTextColor={palette.textMuted}
            style={[styles.inputInner, { color: palette.text }]}
            testID="settings-new-password"
            value={newPassword}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={showNew ? "Hide password" : "Show password"}
            onPress={() => setShowNew((prev) => !prev)}
            style={styles.eyeBtn}
            testID="toggle-show-new-password"
          >
            {showNew ? (
              <EyeOff size={ICON_SIZE} strokeWidth={ICON_STROKE} color={palette.textMuted} />
            ) : (
              <Eye size={ICON_SIZE} strokeWidth={ICON_STROKE} color={palette.textMuted} />
            )}
          </Pressable>
        </View>

        <Text style={[styles.fieldLabel, { color: palette.text }]}>
          {t("auth.confirmPassword")}
        </Text>
        <View
          style={[
            styles.inputRow,
            {
              backgroundColor: palette.inputBg,
              borderWidth: 0,
            },
          ]}
        >
          <TextInput
            onChangeText={setConfirmPassword}
            placeholder={t("auth.confirmPassword")}
            secureTextEntry={!showConfirm}
            placeholderTextColor={palette.textMuted}
            style={[styles.inputInner, { color: palette.text }]}
            testID="settings-confirm-password"
            value={confirmPassword}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={showConfirm ? "Hide password" : "Show password"}
            onPress={() => setShowConfirm((prev) => !prev)}
            style={styles.eyeBtn}
            testID="toggle-show-confirm-password"
          >
            {showConfirm ? (
              <EyeOff size={ICON_SIZE} strokeWidth={ICON_STROKE} color={palette.textMuted} />
            ) : (
              <Eye size={ICON_SIZE} strokeWidth={ICON_STROKE} color={palette.textMuted} />
            )}
          </Pressable>
        </View>

        {errorMessage ? (
          <Text style={styles.errorText} testID="password-error-message">
            {errorMessage}
          </Text>
        ) : null}

        {statusMessage ? (
          <Text style={styles.successText} testID="password-status-message">
            {statusMessage}
          </Text>
        ) : null}

        <View style={styles.actionRowWithNotice}>
          <Pressable
            accessibilityRole="button"
            disabled={
              busy ||
              !currentPassword.trim() ||
              !newPassword.trim() ||
              !confirmPassword.trim()
            }
            onPress={() => {
              void handleUpdatePassword();
            }}
            style={[
              styles.saveBtn,
              { backgroundColor: palette.primary },
              (busy ||
                !currentPassword.trim() ||
                !newPassword.trim() ||
                !confirmPassword.trim()) &&
                styles.btnDisabled,
            ]}
            testID="save-password-button"
          >
            {busy ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveBtnText}>
                {language === "en" ? "Save" : "Simpan"}
              </Text>
            )}
          </Pressable>

          {savedNotice ? (
            <View style={styles.savedNoticeRow} testID="password-saved-notice">
              <Check size={16} strokeWidth={2.5} color={colors.greenDark} />
              <Text style={styles.savedNoticeText}>{savedNotice}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </SettingSection>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "transparent",
    paddingVertical: spacing.xs,
  },
  fieldLabel: {
    fontSize: font.caption,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: spacing.xs,
    textTransform: "uppercase",
  },
  inputRow: {
    alignItems: "center",
    borderRadius: radii.sm,
    borderWidth: 0,
    flexDirection: "row",
    marginBottom: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
  },
  inputInner: {
    flex: 1,
    fontSize: font.label,
    paddingVertical: 8,
  },
  eyeBtn: {
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
  },
  actionRowWithNotice: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginTop: spacing.md,
  },
  inlineSavedNotice: {
    fontSize: font.label,
    fontWeight: "700",
  },
  saveBtn: {
    alignItems: "center",
    borderRadius: radii.sm,
    height: 38,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
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
  successText: {
    color: colors.greenDark,
    fontSize: font.body,
    fontWeight: "700",
    marginTop: spacing.xs,
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
