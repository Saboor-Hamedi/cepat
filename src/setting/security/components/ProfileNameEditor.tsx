import { Check, Edit3, User } from "lucide-react-native";
import { font } from "../../../theme/typography";
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
import { ICON_SIZE, ICON_STROKE } from '../../../theme/icons';

export interface ProfileNameEditorProps {
  initialDisplayName?: string;
  initialUsername?: string;
  onSaveDisplayName?: (newName: string) => Promise<void>;
  onSaveProfileIdentity?: (newDisplayName: string, newUsername: string) => Promise<void>;
}

export function ProfileNameEditor({
  initialDisplayName = "",
  initialUsername = "",
  onSaveProfileIdentity,
}: ProfileNameEditorProps) {
  const { language } = useLanguage();
  const { palette } = useAppearance();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [username, setUsername] = useState(initialUsername);
  const [prevInitialDisplay, setPrevInitialDisplay] = useState(initialDisplayName);
  const [prevInitialUser, setPrevInitialUser] = useState(initialUsername);
  const [isSaving, setIsSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (initialDisplayName !== prevInitialDisplay) {
    setPrevInitialDisplay(initialDisplayName);
    setDisplayName(initialDisplayName);
  }
  if (initialUsername !== prevInitialUser) {
    setPrevInitialUser(initialUsername);
    setUsername(initialUsername);
  }

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
          ? "Display name cannot be empty."
          : "Nama tampilan tidak boleh kosong.",
      );
      return;
    }

    if (!cleanUsername) {
      setErrorFeedback(
        language === "en"
          ? "Username handle cannot be empty."
          : "Username handle tidak boleh kosong.",
      );
      return;
    }

    if (cleanUsername.length < 3) {
      setErrorFeedback(
        language === "en"
          ? "Username must be at least 3 characters."
          : "Username minimal 3 karakter.",
      );
      return;
    }

    if (!/^[a-z0-9._]+$/.test(cleanUsername)) {
      setErrorFeedback(
        language === "en"
          ? "Username may only contain letters, numbers, dots, and underscores."
          : "Username hanya boleh memuat huruf kecil, angka, titik, dan garis bawah.",
      );
      return;
    }

    setIsSaving(true);
    setErrorFeedback(null);
    try {
      if (onSaveProfileIdentity) {
        await onSaveProfileIdentity(trimmedDisplay, cleanUsername);
      }
      setSavedNotice(
        language === "en"
          ? "Profile identity updated!"
          : "Identitas profil diperbarui!",
      );
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setSavedNotice(null);
      }, 3000);
    } catch {
      setErrorFeedback(
        language === "en"
          ? "Could not update identity. Try again."
          : "Gagal memperbarui identitas. Coba lagi.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanged =
    displayName.trim() !== initialDisplayName.trim() ||
    username.trim().replace(/^@/, "").toLowerCase() !==
      initialUsername.trim().replace(/^@/, "").toLowerCase();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: palette.surfaceElevated,
          borderColor: palette.border,
        },
      ]}
      testID="profile-identity-editor-card"
    >
      <View style={styles.headerRow}>
        <User size={ICON_SIZE} strokeWidth={ICON_STROKE} color={palette.primary} />
        <Text style={[styles.cardTitle, { color: palette.text }]}>
          {language === "en" ? "Public Profile Identity" : "Identitas Profil Publik"}
        </Text>
      </View>

      <Text style={[styles.fieldNotice, { color: palette.textMuted }]}>
        {language === "en"
          ? "This is your public persona shown on job postings, chats, and technician profile cards."
          : "Ini adalah nama publik yang terlihat di kartu teknisi, pesanan, dan chat."}
      </Text>

      {/* 1. Public Display Name */}
      <Text style={[styles.inputLabel, { color: palette.text }]}>
        {language === "en" ? "Full / Display Name" : "Nama Lengkap / Tampilan"}
      </Text>
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: palette.surface,
            borderColor: palette.border,
          },
        ]}
      >
        <TextInput
          onChangeText={(val) => {
            setDisplayName(val);
            if (errorFeedback) setErrorFeedback(null);
          }}
          placeholder={
            language === "en"
              ? "e.g. Rizky Pratama"
              : "contoh: Rizky Pratama"
          }
          placeholderTextColor={palette.textMuted}
          style={[styles.textInput, { color: palette.text }]}
          testID="profile-display-name-input"
          value={displayName}
        />
      </View>

      {/* 2. Username Handle */}
      <Text style={[styles.inputLabel, { color: palette.text, marginTop: spacing.sm }]}>
        {language === "en" ? "Public Handle (@username)" : "Handle Publik (@username)"}
      </Text>
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: palette.surface,
            borderColor: palette.border,
          },
        ]}
      >
        <Text style={[styles.prefixAt, { color: palette.primary }]}>@</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={(val) => {
            setUsername(val.replace(/^@/, ""));
            if (errorFeedback) setErrorFeedback(null);
          }}
          placeholder="username"
          placeholderTextColor={palette.textMuted}
          style={[styles.textInput, { color: palette.text }]}
          testID="profile-username-input"
          value={username}
        />
      </View>

      {/* Feedback Messages */}
      {errorFeedback ? (
        <Text style={styles.errorText} testID="profile-name-error">
          {errorFeedback}
        </Text>
      ) : null}

      {savedNotice ? (
        <View style={styles.savedNoticeRow} testID="profile-name-saved">
          <Check size={16} strokeWidth={2.5} color={colors.greenDark} />
          <Text style={styles.savedNoticeText}>{savedNotice}</Text>
        </View>
      ) : null}

      {/* Save Action Button */}
      <View style={styles.actionRow}>
        <Pressable
          accessibilityRole="button"
          disabled={!hasChanged || isSaving}
          onPress={() => {
            void handleSave();
          }}
          style={[
            styles.saveBtn,
            { backgroundColor: palette.primary },
            (!hasChanged || isSaving) && styles.saveBtnDisabled,
          ]}
          testID="profile-identity-save-btn"
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <View style={styles.btnContent}>
              <Edit3 size={16} strokeWidth={2} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>
                {language === "en" ? "Save Changes" : "Simpan Perubahan"}
              </Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.sm,
    borderWidth: 1,
    padding: spacing.md,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  cardTitle: {
    fontSize: font.subtitle,
    fontWeight: "700",
  },
  fieldNotice: {
    fontSize: font.body,
    lineHeight: 18,
    marginBottom: spacing.sm,
    marginTop: 4,
  },
  inputLabel: {
    fontSize: font.body,
    fontWeight: "700",
    marginBottom: 4,
  },
  inputContainer: {
    alignItems: "center",
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 42,
    paddingHorizontal: spacing.sm,
  },
  prefixAt: {
    fontSize: font.body,
    fontWeight: "800",
    marginRight: 2,
  },
  textInput: {
    flex: 1,
    fontSize: font.label,
    paddingVertical: 8,
  },
  errorText: {
    color: colors.danger,
    fontSize: font.body,
    fontWeight: "600",
    marginTop: spacing.xs,
  },
  savedNoticeRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: spacing.xs,
  },
  savedNoticeText: {
    color: colors.greenDark,
    fontSize: font.body,
    fontWeight: "700",
  },
  actionRow: {
    alignItems: "flex-end",
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
  btnContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: font.body,
    fontWeight: "800",
  },
});
