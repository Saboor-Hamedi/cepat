import { Eye, EyeOff } from "lucide-react-native";
import { font } from "../../theme/typography";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

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
    <SettingSection
      eyebrow={language === "en" ? "SECURITY" : "KEAMANAN"}
      title={t("settings.passwordTitle")}
      description={
        language === "en"
          ? "Update your password to keep your account safe."
          : "Perbarui kata sandi Anda untuk menjaga keamanan akun."
      }
      testID="setting-section-password"
    >
      <View
        style={styles.card}
        testID="password-update-form"
      >
        {/* 1. Current Password */}
        <Text style={[styles.fieldLabel, { color: palette.text }]}>
          {language === "en" ? "Current Password" : "Kata Sandi Saat Ini"}
        </Text>
        <View
          style={[
            styles.inputRow,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
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

        {/* 2. New Password */}
        <Text style={[styles.fieldLabel, { color: palette.text }]}>
          {t("auth.newPassword")}
        </Text>
        <View
          style={[
            styles.inputRow,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
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

        {/* 3. Confirm Password */}
        <Text style={[styles.fieldLabel, { color: palette.text }]}>
          {t("auth.confirmPassword")}
        </Text>
        <View
          style={[
            styles.inputRow,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
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

        {/* Small "Save" Action Button Aligned on the LEFT */}
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
              styles.smallSaveBtn,
              (busy ||
                !currentPassword.trim() ||
                !newPassword.trim() ||
                !confirmPassword.trim()) &&
                styles.btnDisabled,
            ]}
            testID="save-password-button"
          >
            <Text style={styles.smallSaveBtnText}>
              {busy
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
    fontSize: font.body,
    fontWeight: "700",
    marginBottom: 4,
    marginTop: spacing.xs,
  },
  inputRow: {
    alignItems: "center",
    borderRadius: radii.sm,
    borderWidth: 1,
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
  smallSaveBtn: {
    alignItems: "center",
    backgroundColor: colors.greenDark,
    borderRadius: radii.sm,
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: spacing.lg,
  },
  smallSaveBtnText: {
    color: "#FFFFFF",
    fontSize: font.body,
    fontWeight: "800",
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
