import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useAuth } from "../../auth/AuthProvider";
import { useAppearance } from "../../context/AppearanceContext";
import { useLanguage } from "../../i18n/locale";
import { colors, radii, spacing } from "../../theme/tokens";
import { SettingSection } from "../components/SettingSection";

export interface SettingSecurityProps {
  deletionRequest: { requestedAt: string; reason: string } | null;
  onSubmitDeletionRequest: (reason: string) => Promise<void>;
  email?: string;
  phoneNumber?: string;
  onChangePhoneNumber?: (value: string) => void;
  onSavePrivateContact?: () => Promise<void>;
}

export function SettingSecurity({
  deletionRequest,
  onSubmitDeletionRequest,
  email,
  phoneNumber,
  onChangePhoneNumber,
  onSavePrivateContact,
}: SettingSecurityProps) {
  const { language, t } = useLanguage();
  const { palette } = useAppearance();
  const { user } = useAuth();
  const [showTermsDetails, setShowTermsDetails] = useState(false);
  const [deletionReason, setDeletionReason] = useState("");
  const [contactSavedNote, setContactSavedNote] = useState<string | null>(null);
  const [isSavingContact, setIsSavingContact] = useState(false);

  const displayEmail = email || user?.email || "";

  const handleSaveContact = async () => {
    if (!onSavePrivateContact) return;
    setIsSavingContact(true);
    setContactSavedNote(null);
    try {
      await onSavePrivateContact();
      setContactSavedNote(
        language === "en"
          ? "Contact details saved securely."
          : "Detail kontak berhasil disimpan aman.",
      );
    } finally {
      setIsSavingContact(false);
    }
  };

  return (
    <SettingSection
      eyebrow={language === "en" ? "SECURITY & PRIVACY" : "KEAMANAN & PRIVASI"}
      title={t("settings.securityPrivacyTitle")}
      description={
        language === "en"
          ? "Manage your private contact credentials, data protection rules, and account deletion."
          : "Kelola kontak pribadi terlindungi, aturan perlindungan data, dan penghapusan akun."
      }
      testID="setting-section-security"
    >
      {/* 1. Moved Contact Credentials (quick.md Section 3) */}
      <View
        style={[
          styles.credentialsCard,
          {
            backgroundColor: palette.surfaceElevated,
            borderColor: palette.border,
          },
        ]}
        testID="security-contact-card"
      >
        <Text style={[styles.cardSectionTitle, { color: palette.text }]}>
          {language === "en"
            ? "Contact Credentials"
            : "Kredensial Kontak Pribadi"}
        </Text>
        <Text style={[styles.cardSectionSub, { color: palette.textMuted }]}>
          {language === "en"
            ? "Your email and phone number are strictly private and never displayed on public profile cards."
            : "Email dan nomor telepon Anda sepenuhnya privat dan tidak pernah ditampilkan di profil publik."}
        </Text>

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
          value={displayEmail}
        />

        <Text style={[styles.fieldLabel, { color: palette.text }]}>
          {language === "en" ? "Phone Number" : "Nomor Telepon"}
        </Text>
        <TextInput
          keyboardType="phone-pad"
          onChangeText={onChangePhoneNumber}
          placeholder={
            language === "en" ? "e.g. 08123456789" : "mis. 08123456789"
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
          <Pressable
            accessibilityRole="button"
            disabled={isSavingContact}
            onPress={() => {
              void handleSaveContact();
            }}
            style={[
              styles.saveContactBtn,
              isSavingContact && styles.btnDisabled,
            ]}
            testID="save-private-contact"
          >
            <Text style={styles.saveContactBtnText}>
              {isSavingContact
                ? language === "en"
                  ? "Saving..."
                  : "Menyimpan..."
                : language === "en"
                  ? "Save Contact Details"
                  : "Simpan Detail Kontak"}
            </Text>
          </Pressable>
        )}

        {contactSavedNote ? (
          <Text style={styles.feedbackText}>{contactSavedNote}</Text>
        ) : null}
      </View>

      <View
        style={[
          styles.privacyHighlight,
          { backgroundColor: palette.primarySoft },
        ]}
      >
        <Text
          style={[styles.privacyHighlightTitle, { color: palette.primary }]}
        >
          {language === "en"
            ? "Strict separation of public & private data"
            : "Pemisahan ketat data publik & pribadi"}
        </Text>
        <Text style={[styles.privacyHighlightBody, { color: palette.text }]}>
          {language === "en"
            ? "Your email address, phone number, and saved home addresses are never displayed on public profiles. Public profiles show only professional or display information."
            : "Alamat email, nomor telepon, dan alamat rumah tersimpan tidak pernah ditampilkan di profil publik. Profil publik hanya menampilkan informasi profesional atau nama tampilan."}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => setShowTermsDetails((prev) => !prev)}
        style={[
          styles.termsToggle,
          {
            backgroundColor: palette.surfaceElevated,
            borderColor: palette.border,
          },
        ]}
        testID="toggle-terms-privacy"
      >
        <Text style={[styles.termsToggleTitle, { color: palette.text }]}>
          {language === "en"
            ? "Terms of Service & Privacy Policy Summary"
            : "Ringkasan Syarat Layanan & Kebijakan Privasi"}
        </Text>
        <Text style={[styles.termsToggleChevron, { color: palette.textMuted }]}>
          {showTermsDetails ? "▴" : "▾"}
        </Text>
      </Pressable>

      {showTermsDetails && (
        <View
          style={[
            styles.termsBox,
            {
              backgroundColor: palette.surfaceElevated,
              borderColor: palette.border,
            },
          ]}
          testID="terms-privacy-details"
        >
          <Text style={[styles.termsParagraph, { color: palette.text }]}>
            {language === "en"
              ? "• Cepat connects customers and independent technicians across Indonesia. Service execution and direct payment are agreed between participants."
              : "• Cepat menghubungkan pelanggan dan teknisi independen di seluruh Indonesia. Pelaksanaan pekerjaan dan pembayaran langsung disepakati antar pihak."}
          </Text>
          <Text style={[styles.termsParagraph, { color: palette.text }]}>
            {language === "en"
              ? "• Private contact details and exact coordinates are protected by Row Level Security (RLS). Booking chat unlocks only after a booking is accepted, and external links/URLs are blocked."
              : "• Kontak pribadi dan titik koordinat dilindungi oleh Row Level Security (RLS). Chat pesanan hanya terbuka setelah pesanan diterima, serta tautan/URL eksternal diblokir."}
          </Text>
        </View>
      )}

      <View style={styles.divider} />
      <Text style={[styles.subSectionTitle, { color: palette.text }]}>
        {t("settings.deleteAccountAction")}
      </Text>
      {deletionRequest ? (
        <View style={styles.deletionNotice} testID="deletion-request-status">
          <Text style={styles.deletionNoticeText}>
            {language === "en"
              ? `Account deletion requested (${deletionRequest.reason}). An administrator will review and process your request.`
              : `Permintaan penghapusan akun tercatat (${deletionRequest.reason}). Administrator akan meninjau dan memproses permintaanmu.`}
          </Text>
        </View>
      ) : (
        <>
          <TextInput
            onChangeText={setDeletionReason}
            placeholder={
              language === "en"
                ? "Reason for account deletion request…"
                : "Alasan pengajuan penghapusan akun…"
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
            testID="account-deletion-reason"
            value={deletionReason}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void onSubmitDeletionRequest(deletionReason || "User request");
              setDeletionReason("");
            }}
            style={styles.deleteButton}
            testID="submit-account-deletion"
          >
            <Text style={styles.deleteButtonText}>
              {t("settings.deleteAccountAction")}
            </Text>
          </Pressable>
        </>
      )}
    </SettingSection>
  );
}

const styles = StyleSheet.create({
  credentialsCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  cardSectionTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
  },
  cardSectionSub: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: spacing.sm,
    marginTop: 2,
  },
  fieldLabel: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
    marginTop: spacing.xs,
  },
  input: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 13,
    marginBottom: spacing.xs,
    minHeight: 42,
    paddingHorizontal: spacing.md,
  },
  inputDisabled: {
    backgroundColor: "#F1F5F9",
    color: colors.muted,
  },
  saveContactBtn: {
    alignItems: "center",
    backgroundColor: colors.greenDark,
    borderRadius: radii.sm,
    justifyContent: "center",
    marginTop: spacing.xs,
    minHeight: 40,
    paddingHorizontal: spacing.md,
  },
  saveContactBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  btnDisabled: {
    opacity: 0.6,
  },
  feedbackText: {
    color: colors.greenDark,
    fontSize: 12,
    fontWeight: "700",
    marginTop: spacing.xs,
  },
  privacyHighlight: {
    backgroundColor: colors.greenSoft,
    borderRadius: radii.sm,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  privacyHighlightTitle: {
    color: colors.greenDark,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 2,
  },
  privacyHighlightBody: {
    color: colors.greenDark,
    fontSize: 12,
    lineHeight: 17,
  },
  termsToggle: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  termsToggleTitle: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "700",
  },
  termsToggleChevron: {
    color: colors.muted,
    fontSize: 14,
  },
  termsBox: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  termsParagraph: {
    color: colors.ink,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  divider: {
    backgroundColor: colors.line,
    height: 1,
    marginVertical: spacing.md,
  },
  subSectionTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: spacing.xs,
  },
  deletionNotice: {
    backgroundColor: colors.greenSoft,
    borderRadius: radii.sm,
    padding: spacing.md,
  },
  deletionNoticeText: {
    color: colors.greenDark,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
  deleteButton: {
    alignItems: "center",
    backgroundColor: "#FCE9E7",
    borderColor: "#F5C4BE",
    borderRadius: radii.sm,
    borderWidth: 1,
    justifyContent: "center",
    marginTop: spacing.xs,
    minHeight: 40,
    paddingHorizontal: spacing.md,
  },
  deleteButtonText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "800",
  },
});
