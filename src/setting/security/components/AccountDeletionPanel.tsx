import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useAppearance } from "../../../context/AppearanceContext";
import { useLanguage } from "../../../i18n/locale";
import { colors, radii, spacing } from "../../../theme/tokens";

export interface AccountDeletionPanelProps {
  deletionRequest: { requestedAt: string; reason: string } | null;
  onSubmitDeletionRequest: (reason: string) => Promise<void>;
}

export function AccountDeletionPanel({
  deletionRequest,
  onSubmitDeletionRequest,
}: AccountDeletionPanelProps) {
  const { language } = useLanguage();
  const { palette } = useAppearance();
  const [deletionReason, setDeletionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!deletionReason.trim()) {
      setError(
        language === "en"
          ? "Please provide a reason."
          : "Mohon tuliskan alasan penghapusan."
      );
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmitDeletionRequest(deletionReason.trim());
      setDeletionReason("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : language === "en"
            ? "Failed to submit request."
            : "Gagal mengirim permintaan."
      );
    } finally {
      setIsSubmitting(false);
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
      testID="deletion-request-panel"
    >
      <Text style={[styles.cardTitle, { color: colors.danger }]}>
        {language === "en" ? "Account Deletion" : "Penghapusan Akun"}
      </Text>
      <Text style={[styles.cardSub, { color: palette.textMuted }]}>
        {language === "en"
          ? "Submit a request to permanently delete your account, credentials, and data."
          : "Ajukan permohonan untuk menghapus akun, kredensial, dan data Anda secara permanen."}
      </Text>

      {deletionRequest ? (
        <View
          style={[
            styles.statusCard,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
          testID="deletion-request-status"
        >
          <Text style={[styles.statusTitle, { color: palette.text }]}>
            {language === "en"
              ? "Deletion request pending review"
              : "Permintaan penghapusan sedang ditinjau"}
          </Text>
          <Text style={[styles.statusDate, { color: palette.textMuted }]}>
            {deletionRequest.requestedAt.slice(0, 16).replace("T", " ")}
          </Text>
          <Text style={[styles.statusReason, { color: palette.textMuted }]}>
            {deletionRequest.reason}
          </Text>
        </View>
      ) : (
        <View style={styles.formWrap}>
          <TextInput
            multiline
            numberOfLines={3}
            onChangeText={setDeletionReason}
            placeholder={
              language === "en"
                ? "Reason for deleting account..."
                : "Alasan penghapusan akun..."
            }
            placeholderTextColor={palette.textMuted}
            style={[
              styles.textarea,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
                color: palette.text,
              },
            ]}
            testID="deletion-reason-input"
            value={deletionReason}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Pressable
            accessibilityRole="button"
            disabled={isSubmitting}
            onPress={() => {
              void handleSubmit();
            }}
            style={[
              styles.deleteBtn,
              isSubmitting && styles.btnDisabled,
            ]}
            testID="submit-deletion-btn"
          >
            <Text style={styles.deleteBtnText}>
              {isSubmitting
                ? language === "en"
                  ? "Submitting..."
                  : "Mengirim..."
                : language === "en"
                  ? "Request Deletion"
                  : "Ajukan Penghapusan"}
            </Text>
          </Pressable>
        </View>
      )}
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
  formWrap: {
    marginTop: spacing.xs,
  },
  textarea: {
    borderRadius: 5,
    borderWidth: 1,
    fontSize: 13,
    marginBottom: spacing.sm,
    minHeight: 70,
    padding: spacing.md,
    textAlignVertical: "top",
  },
  deleteBtn: {
    alignItems: "center",
    backgroundColor: colors.danger,
    borderRadius: 5,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: spacing.lg,
  },
  deleteBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  btnDisabled: {
    opacity: 0.5,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  statusCard: {
    borderRadius: 5,
    borderWidth: 1,
    padding: spacing.md,
  },
  statusTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  statusDate: {
    fontSize: 11,
    marginTop: 2,
  },
  statusReason: {
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 6,
  },
});
