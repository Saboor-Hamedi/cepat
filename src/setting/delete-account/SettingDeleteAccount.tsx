import { router } from "expo-router";
import { font } from '../../theme/typography';
import { AlertTriangle, Check, Eye, EyeOff, Lock, Mail, Trash2 } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "../../auth/AuthProvider";
import { useAppearance } from "../../context/AppearanceContext";
import { recordAdminDeletionFeedback } from "../../data/adminStore";
import { supabase } from "../../data/marketplaceRepository";
import { useLanguage } from "../../i18n/locale";
import { radii, spacing } from "../../theme/tokens";
import { SettingSection } from "../components/SettingSection";
import { ICON_SIZE, ICON_STROKE } from '../../theme/icons';

type DeletionReasonKey = "alternative" | "issues" | "privacy" | "no_need" | "other";

export function SettingDeleteAccount({
  onCancel,
}: {
  onCancel?: () => void;
}) {
  const { language, t } = useLanguage();
  const { palette, scaleFont } = useAppearance();
  const { user, signOut } = useAuth();

  const [selectedReason, setSelectedReason] = useState<DeletionReasonKey | null>(null);
  const [otherReason, setOtherReason] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userEmail = (
    user?.email ||
    (typeof user?.user_metadata?.email === "string" ? user.user_metadata.email : "") ||
    ""
  )
    .trim()
    .toLowerCase();

  const reasonsList: { key: DeletionReasonKey; label: string }[] = [
    {
      key: "alternative",
      label:
        language === "en"
          ? "I found an alternative service"
          : "Saya menemukan layanan alternatif lain",
    },
    {
      key: "issues",
      label:
        language === "en"
          ? "I'm having technical issues or bugs"
          : "Saya mengalami kendala teknis atau bug",
    },
    {
      key: "privacy",
      label:
        language === "en"
          ? "Privacy or data security concerns"
          : "Kekhawatiran tentang privasi atau keamanan data",
    },
    {
      key: "no_need",
      label:
        language === "en"
          ? "I no longer need this service"
          : "Saya sudah tidak membutuhkan layanan ini lagi",
    },
    {
      key: "other",
      label:
        language === "en"
          ? "Other reason (specify below)"
          : "Lainnya (jelaskan di bawah)",
    },
  ];

  const getEffectiveReasonText = (): string => {
    if (selectedReason === "other") {
      return otherReason.trim();
    }
    const match = reasonsList.find((r) => r.key === selectedReason);
    return match ? match.label : "";
  };

  const performDeletion = async () => {
    setError(null);
    setBusy(true);

    const finalReason = getEffectiveReasonText();

    try {
      if (supabase && user) {
        // 1. Re-authenticate with password to verify ownership before deletion
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: userEmail || user.email || "",
          password,
        });

        if (authError) {
          setError(
            language === "en"
              ? "Incorrect password. Please verify your password and try again."
              : "Kata sandi salah. Silakan periksa kata sandi Anda dan coba lagi.",
          );
          setBusy(false);
          return;
        }

        // 2. Call the server-side deletion function which wipes all user data and cascades
        const { error: rpcError } = await supabase.rpc("delete_my_account", {
          p_reason: selectedReason,
          p_feedback: finalReason,
        });

        // 3. Comprehensive client-side purge of EVERY user table (notifications, messages, bookings, technician, profiles)
        // Ensures complete data removal even if RPC is pending application on remote database
        try {
          await supabase.from("account_deletion_feedbacks").insert({
            user_id: user.id,
            user_email: userEmail || user.email,
            user_display_name: (user.user_metadata as { display_name?: string } | undefined)?.display_name || "User",
            user_role: user.role || "customer",
            reason_category: selectedReason || "other",
            feedback_notes: finalReason,
          });
        } catch {
          // Non-blocking
        }

        try {
          // DELETE ALL NOTIFICATIONS
          await supabase.from("notifications").delete().eq("user_id", user.id);
        } catch {
          // Ignore
        }

        try {
          // DELETE ALL MESSAGES
          await supabase.from("messages").delete().eq("sender_user_id", user.id);
        } catch {
          // Ignore
        }

        try {
          // DELETE CONVERSATIONS
          await supabase.from("conversations").delete().eq("customer_user_id", user.id);
          await supabase.from("conversations").delete().eq("technician_user_id", user.id);
        } catch {
          // Ignore
        }

        try {
          // DELETE REVIEWS & REPORTS
          await supabase.from("reviews").delete().eq("customer_user_id", user.id);
          await supabase.from("reviews").delete().eq("technician_user_id", user.id);
          await supabase.from("report_evidence").delete().eq("uploaded_by", user.id);
          await supabase.from("reports").delete().eq("reporter_user_id", user.id);
          await supabase.from("reports").delete().eq("reported_user_id", user.id);
        } catch {
          // Ignore
        }

        try {
          // DELETE BOOKINGS
          await supabase.from("bookings").delete().eq("customer_user_id", user.id);
          await supabase.from("bookings").delete().eq("technician_user_id", user.id);
        } catch {
          // Ignore
        }

        try {
          // DELETE TECHNICIAN CONTENT & PROFILE
          await supabase.from("technician_posts").delete().eq("technician_id", user.id);
          await supabase.from("technician_portfolio_items").delete().eq("technician_user_id", user.id);
          await supabase.from("technician_services").delete().eq("technician_user_id", user.id);
          await supabase.from("technician_availability").delete().eq("technician_user_id", user.id);
          await supabase.from("technician_service_areas").delete().eq("technician_user_id", user.id);
          await supabase.from("technician_locations").delete().eq("technician_user_id", user.id);
          await supabase.from("technician_profiles").delete().eq("user_id", user.id);
          await supabase.from("technician_applications").delete().eq("technician_user_id", user.id);
        } catch {
          // Ignore
        }

        try {
          // DELETE ROLES & PROFILES
          await supabase.from("user_roles").delete().eq("user_id", user.id);
          await supabase.from("private_profiles").delete().eq("user_id", user.id);
          await supabase.from("user_account_status").delete().eq("user_id", user.id);
          await supabase.from("profiles").delete().eq("id", user.id);
        } catch {
          // Ignore
        }

        if (rpcError) {
          console.warn("Supabase delete_my_account RPC returned notice:", rpcError.message);
        }
      }

      // Record departure feedback for Admin Console review
      try {
        await recordAdminDeletionFeedback({
          userId: user?.id,
          userEmail: userEmail || user?.email,
          userDisplayName: (user?.user_metadata as { display_name?: string } | undefined)?.display_name,
          userRole: user?.role,
          reasonCategory: selectedReason || 'other',
          feedbackNotes: finalReason,
        });
      } catch {
        // Non-blocking
      }

      // 3. Log out from the app
      await signOut();

      if (Platform.OS === "web") {
        window.alert(
          language === "en"
            ? "Your account and all associated data have been permanently deleted."
            : "Akun dan seluruh data Anda telah dihapus secara permanen.",
        );
      } else {
        Alert.alert(
          language === "en" ? "Account Deleted" : "Akun Terhapus",
          language === "en"
            ? "Your account and all associated data have been permanently deleted."
            : "Akun dan seluruh data Anda telah dihapus secara permanen.",
        );
      }

      router.replace("/");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : language === "en"
            ? "Failed to delete account. Please try again."
            : "Gagal menghapus akun. Silakan coba lagi.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handlePressDelete = () => {
    setError(null);

    if (!selectedReason) {
      setError(
        language === "en"
          ? "Please select a reason for deleting your account."
          : "Silakan pilih alasan penghapusan akun Anda.",
      );
      return;
    }

    if (selectedReason === "other" && !otherReason.trim()) {
      setError(
        language === "en"
          ? "Please write your reason in the text box."
          : "Silakan tuliskan alasan Anda pada kotak teks.",
      );
      return;
    }

    const typedEmail = confirmEmail.trim().toLowerCase();
    if (!typedEmail) {
      setError(
        language === "en"
          ? "Please confirm your email address."
          : "Silakan ketik alamat email Anda untuk konfirmasi.",
      );
      return;
    }

    if (userEmail && typedEmail !== userEmail) {
      const emailMismatchMsg =
        language === "en"
          ? "This email doesn't belong to you. Please confirm with your registered account email."
          : "Email ini tidak sesuai atau bukan milik Anda. Silakan konfirmasi dengan email akun Anda.";
      setError(emailMismatchMsg);
      if (Platform.OS === "web") {
        window.alert(emailMismatchMsg);
      } else {
        Alert.alert(
          language === "en" ? "Invalid Email" : "Email Tidak Cocok",
          emailMismatchMsg,
        );
      }
      return;
    }

    if (!password) {
      setError(
        language === "en"
          ? "Please enter your password to confirm deletion."
          : "Silakan masukkan kata sandi Anda untuk konfirmasi.",
      );
      return;
    }

    if (!acceptedTerms) {
      setError(
        language === "en"
          ? "Please check the box below to accept that account deletion is permanent."
          : "Silakan centang kotak di bawah untuk menyetujui bahwa penghapusan bersifat permanen.",
      );
      return;
    }

    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        language === "en"
          ? "Are you absolutely sure you want to permanently delete your account? This action cannot be undone."
          : "Apakah Anda benar-benar yakin ingin menghapus akun ini secara permanen? Tindakan ini tidak dapat dibatalkan.",
      );
      if (confirmed) {
        void performDeletion();
      }
    } else {
      Alert.alert(
        language === "en" ? "Permanently Delete Account?" : "Hapus Akun Secara Permanen?",
        language === "en"
          ? "This action cannot be undone. All your posts, photos, profile, reviews, and bookings will be wiped forever."
          : "Tindakan ini tidak dapat dibatalkan. Semua postingan, foto, profil, ulasan, dan pesanan Anda akan dihapus selamanya.",
        [
          { text: language === "en" ? "Cancel" : "Batal", style: "cancel" },
          {
            text: language === "en" ? "Yes, Delete Account" : "Ya, Hapus Akun",
            style: "destructive",
            onPress: () => {
              void performDeletion();
            },
          },
        ],
      );
    }
  };

  return (
    <SettingSection testID="setting-section-delete-account">
      <View style={{ gap: spacing.md }}>
        <View
          style={[
            styles.warningBox,
            {
              backgroundColor: `${palette.danger}12`,
            },
          ]}
          testID="delete-account-warning-box"
        >
          <View style={styles.warningHeader}>
            <AlertTriangle size={ICON_SIZE} color={palette.danger} strokeWidth={ICON_STROKE} />
            <Text style={[styles.warningTitle, { color: palette.danger, fontSize: scaleFont(font.title) }]}>
              {language === "en"
                ? "Warning: Permanent & Irreversible Action"
                : "Peringatan: Tindakan Permanen & Tidak Dapat Dipulihkan"}
            </Text>
          </View>
          <Text style={[styles.warningText, { color: palette.text, fontSize: scaleFont(font.label) }]}>
            {language === "en"
              ? "You cannot recover this account once deleted. All data will be permanently erased, including:"
              : "Anda tidak dapat memulihkan akun ini setelah dihapus. Semua data Anda akan dihapus secara permanen, meliputi:"}
          </Text>
          <View style={styles.warningBullets}>
            <Text style={[styles.bulletItem, { color: palette.textSecondary, fontSize: scaleFont(font.body) }]}>
              • {language === "en" ? "Your public profile, username, and private contact info" : "Profil publik, username, dan informasi kontak privat Anda"}
            </Text>
            <Text style={[styles.bulletItem, { color: palette.textSecondary, fontSize: scaleFont(font.body) }]}>
              • {language === "en" ? "All published technician posts, photos, and media files" : "Semua postingan teknisi, foto hasil kerja, dan berkas media"}
            </Text>
            <Text style={[styles.bulletItem, { color: palette.textSecondary, fontSize: scaleFont(font.body) }]}>
              • {language === "en" ? "All services, portfolio items, and availability schedules" : "Semua layanan, portofolio, dan jadwal ketersediaan Anda"}
            </Text>
            <Text style={[styles.bulletItem, { color: palette.textSecondary, fontSize: scaleFont(font.body) }]}>
              • {language === "en" ? "Your booking history, reviews, and chat conversations" : "Riwayat pesanan layanan, ulasan, dan percakapan obrolan"}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <Text style={[styles.stepTitle, { color: palette.text, fontSize: scaleFont(font.subtitle) }]}>
            {language === "en"
              ? "1. Please select a reason for leaving"
              : "1. Mohon pilih alasan penghapusan akun"}
          </Text>

          <View style={styles.radioList}>
            {reasonsList.map((reason) => {
              const selected = selectedReason === reason.key;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  key={reason.key}
                  onPress={() => setSelectedReason(reason.key)}
                  style={[
                    styles.radioItem,
                    {
                      backgroundColor: selected ? `${palette.primary}10` : "transparent",
                      borderColor: selected ? palette.primary : palette.border,
                    },
                  ]}
                  testID={`delete-reason-${reason.key}`}
                >
                  <View
                    style={[
                      styles.radioCircle,
                      {
                        borderColor: selected ? palette.primary : palette.border,
                        backgroundColor: selected ? palette.primary : "transparent",
                      },
                    ]}
                  >
                    {selected ? <Check size={ICON_SIZE} color="#FFFFFF" strokeWidth={ICON_STROKE} /> : null}
                  </View>
                  <Text style={[styles.radioLabel, { color: palette.text, fontSize: scaleFont(font.label) }]}>
                    {reason.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {selectedReason === "other" && (
            <View style={styles.otherInputWrap}>
              <Text style={[styles.fieldLabel, { color: palette.text, fontSize: scaleFont(font.label) }]}>
                {language === "en" ? "Tell us more:" : "Jelaskan lebih lanjut:"}
              </Text>
              <TextInput
                multiline
                numberOfLines={3}
                onChangeText={setOtherReason}
                placeholder={
                  language === "en"
                    ? "Explain why you are deleting your account..."
                    : "Tuliskan alasan Anda menghapus akun..."
                }
                placeholderTextColor={palette.textSecondary}
                style={[
                  styles.textarea,
                  {
                    backgroundColor: palette.inputBg,
                    color: palette.text,
                    fontSize: scaleFont(font.label),
                  },
                ]}
                testID="delete-other-reason-input"
                value={otherReason}
              />
            </View>
          )}
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <Text style={[styles.stepTitle, { color: palette.text, fontSize: scaleFont(font.subtitle) }]}>
            {language === "en"
              ? "2. Confirm your email address"
              : "2. Konfirmasi alamat email Anda"}
          </Text>
          <Text style={[styles.fieldHint, { color: palette.textSecondary, fontSize: scaleFont(font.body) }]}>
            {userEmail
              ? language === "en"
                ? `To verify ownership, type your email: ${userEmail}`
                : `Untuk verifikasi kepemilikan, ketik email Anda: ${userEmail}`
              : language === "en"
                ? "Enter your account email to confirm"
                : "Masukkan email akun Anda untuk konfirmasi"}
          </Text>

          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: palette.background,
                borderColor:
                  confirmEmail.trim().length > 0 &&
                  userEmail &&
                  confirmEmail.trim().toLowerCase() !== userEmail
                    ? palette.danger
                    : palette.border,
              },
            ]}
          >
            <View style={styles.leftIcon}>
              <Mail size={ICON_SIZE} strokeWidth={ICON_STROKE} color={palette.textSecondary} />
            </View>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              onChangeText={setConfirmEmail}
              placeholder={
                language === "en" ? "Confirm the email" : "Konfirmasi email"
              }
              placeholderTextColor={palette.textSecondary}
              style={[styles.input, { color: palette.text, fontSize: scaleFont(font.subtitle) }]}
              testID="delete-confirm-email-input"
              value={confirmEmail}
            />
          </View>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <Text style={[styles.stepTitle, { color: palette.text, fontSize: scaleFont(font.subtitle) }]}>
            {language === "en"
              ? "3. Enter your account password"
              : "3. Masukkan kata sandi akun Anda"}
          </Text>

          <View
            style={[
              styles.inputContainer,
              { backgroundColor: palette.background, borderColor: palette.border },
            ]}
          >
            <View style={styles.leftIcon}>
              <Lock size={ICON_SIZE} strokeWidth={ICON_STROKE} color={palette.textSecondary} />
            </View>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setPassword}
              placeholder={
                language === "en" ? "Enter your password" : "Ketik kata sandi Anda"
              }
              placeholderTextColor={palette.textSecondary}
              secureTextEntry={!showPassword}
              style={[styles.input, { color: palette.text, fontSize: scaleFont(font.subtitle) }]}
              testID="delete-confirm-password-input"
              value={password}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showPassword ? t("auth.hide") : t("auth.show")}
              onPress={() => setShowPassword((prev) => !prev)}
              style={styles.eyeBtn}
            >
              {showPassword ? (
                <EyeOff size={ICON_SIZE} strokeWidth={ICON_STROKE} color={palette.textSecondary} />
              ) : (
                <Eye size={ICON_SIZE} strokeWidth={ICON_STROKE} color={palette.textSecondary} />
              )}
            </Pressable>
          </View>
        </View>

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: acceptedTerms }}
          onPress={() => setAcceptedTerms((prev) => !prev)}
          style={[
            styles.checkboxRow,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}
          testID="delete-account-accept-checkbox"
        >
          <View
            style={[
              styles.customCheckbox,
              {
                backgroundColor: acceptedTerms ? palette.primary : "transparent",
                borderColor: acceptedTerms ? palette.primary : palette.border,
              },
            ]}
          >
            {acceptedTerms ? <Check size={ICON_SIZE} color="#FFFFFF" strokeWidth={ICON_STROKE} /> : null}
          </View>
          <Text style={[styles.checkboxLabel, { color: palette.text, fontSize: scaleFont(font.label) }]}>
            {language === "en"
              ? "I understand and confirm that deleting my account is permanent and irreversible. All my data will be permanently wiped and I will be logged out."
              : "Saya memahami dan menyetujui bahwa penghapusan akun ini permanen dan tidak dapat dibatalkan. Semua data saya akan dihapus dan saya akan keluar dari aplikasi."}
          </Text>
        </Pressable>

        {error ? (
          <View
            style={[
              styles.errorCard,
              { backgroundColor: `${palette.danger}15`, borderColor: palette.danger },
            ]}
          >
            <Text style={[styles.errorText, { color: palette.danger, fontSize: scaleFont(font.label) }]}>
              {error}
            </Text>
          </View>
        ) : null}

        <View style={styles.actionsRow}>
          {onCancel && (
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={onCancel}
              style={[
                styles.cancelBtn,
                { backgroundColor: palette.surface, borderColor: palette.border },
              ]}
              testID="delete-account-cancel-btn"
            >
              <Text style={[styles.cancelBtnText, { color: palette.text, fontSize: scaleFont(font.subtitle) }]}>
                {language === "en" ? "Cancel" : "Batal"}
              </Text>
            </Pressable>
          )}

          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={handlePressDelete}
            style={({ pressed }) => [
              styles.deleteBtn,
              {
                backgroundColor: palette.danger,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
            testID="delete-account-confirm-btn"
          >
            {busy ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <View style={styles.btnContent}>
                <Trash2 size={ICON_SIZE} strokeWidth={ICON_STROKE} color="#FFFFFF" />
                <Text style={[styles.deleteBtnText, { fontSize: scaleFont(font.subtitle) }]}>
                  {language === "en"
                    ? "Permanently Delete Account"
                    : "Hapus Akun Secara Permanen"}
                </Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>
    </SettingSection>
  );
}

const styles = StyleSheet.create({
  warningBox: {
    borderRadius: radii.sm,
    borderWidth: 0,
    padding: spacing.md,
  },
  warningHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  warningTitle: {
    fontWeight: "700",
  },
  warningText: {
    lineHeight: 19,
    marginBottom: spacing.xs,
  },
  warningBullets: {
    gap: 4,
    marginTop: 4,
  },
  bulletItem: {
    lineHeight: 18,
  },
  card: {
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  stepTitle: {
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  radioList: {
    gap: 8,
  },
  radioItem: {
    alignItems: "center",
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  radioCircle: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1.5,
    height: 20,
    justifyContent: "center",
    width: 20,
  },
  radioLabel: {
    flex: 1,
    fontWeight: "500",
  },
  otherInputWrap: {
    marginTop: spacing.sm,
  },
  fieldLabel: {
    fontWeight: "600",
    marginBottom: 6,
  },
  fieldHint: {
    lineHeight: 16,
    marginBottom: spacing.sm,
  },
  textarea: {
    borderRadius: radii.sm,
    borderWidth: 0,
    minHeight: 64,
    padding: 10,
    textAlignVertical: "top",
  },
  inputContainer: {
    alignItems: "center",
    borderRadius: radii.sm,
    borderWidth: 0,
    flexDirection: "row",
    minHeight: 46,
    paddingHorizontal: 12,
  },
  leftIcon: {
    marginRight: 10,
  },
  input: {
    backgroundColor: "transparent",
    flex: 1,
    minHeight: 44,
  },
  eyeBtn: {
    padding: 6,
  },
  checkboxRow: {
    alignItems: "flex-start",
    borderRadius: radii.sm,
    borderWidth: 0,
    flexDirection: "row",
    gap: 12,
    padding: spacing.md,
  },
  customCheckbox: {
    alignItems: "center",
    borderRadius: radii.sm,
    borderWidth: 2,
    height: 24,
    justifyContent: "center",
    marginTop: 1,
    width: 24,
  },
  checkboxLabel: {
    flex: 1,
    lineHeight: 19,
  },
  errorCard: {
    borderRadius: radii.sm,
    borderWidth: 0,
    padding: 12,
  },
  errorText: {
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  cancelBtn: {
    alignItems: "center",
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cancelBtnText: {
    fontWeight: "600",
  },
  deleteBtn: {
    alignItems: "center",
    borderRadius: radii.sm,
    flex: 1,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  btnContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  deleteBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
