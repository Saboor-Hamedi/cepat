import { ArrowRight, Trash2 } from "lucide-react-native";
import { font } from '../../theme/typography';
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAppearance } from "../../context/AppearanceContext";
import { useLanguage } from "../../i18n/locale";
import { radii, spacing } from "../../theme/tokens";
import { SettingSection } from "../components/SettingSection";
import { PrivateContactEditor } from "./components/PrivateContactEditor";
import { ProfileNameEditor } from "./components/ProfileNameEditor";
import { ICON_SIZE, ICON_STROKE } from '../../theme/icons';

export interface SettingSecurityProps {
  email?: string;
  phoneNumber?: string;
  onChangePhoneNumber?: (value: string) => void;
  onSavePrivateContact?: () => Promise<void>;
  displayName?: string;
  username?: string;
  onSaveDisplayName?: (newName: string) => Promise<void>;
  onSaveProfileIdentity?: (newDisplayName: string, newUsername: string) => Promise<void>;
  onNavigateToDeleteAccount?: () => void;
}

export function SettingSecurity({
  email,
  phoneNumber,
  onChangePhoneNumber,
  onSavePrivateContact,
  displayName,
  username,
  onSaveDisplayName,
  onSaveProfileIdentity,
  onNavigateToDeleteAccount,
}: SettingSecurityProps) {
  const { language } = useLanguage();
  const { palette, scaleFont } = useAppearance();

  return (
    <SettingSection testID="setting-section-security">
      <View style={{ gap: 12 }}>
        <ProfileNameEditor
          initialDisplayName={displayName}
          initialUsername={username}
          onSaveDisplayName={onSaveDisplayName}
          onSaveProfileIdentity={onSaveProfileIdentity}
        />

        <PrivateContactEditor
          email={email}
          phoneNumber={phoneNumber}
          onChangePhoneNumber={onChangePhoneNumber}
          onSavePrivateContact={onSavePrivateContact}
        />

        {onNavigateToDeleteAccount && (
          <Pressable
            accessibilityRole="button"
            onPress={onNavigateToDeleteAccount}
            style={[
              styles.deleteShortcutCard,
              {
                backgroundColor: `${palette.danger}10`,
                borderWidth: 0,
              },
            ]}
            testID="security-to-delete-account-btn"
          >
            <View style={styles.shortcutLeft}>
              <Trash2 size={ICON_SIZE} strokeWidth={ICON_STROKE} color={palette.danger} />
              <View>
                <Text style={[styles.shortcutTitle, { color: palette.danger, fontSize: scaleFont(font.label) }]}>
                  {language === "en" ? "Delete Account" : "Hapus Akun"}
                </Text>
                <Text style={[styles.shortcutSub, { color: palette.textSecondary, fontSize: scaleFont(font.caption) }]}>
                  {language === "en"
                    ? "Permanently erase account, posts, photos & data"
                    : "Hapus permanen akun, postingan, foto & data Anda"}
                </Text>
              </View>
            </View>
            <ArrowRight size={ICON_SIZE} strokeWidth={ICON_STROKE} color={palette.danger} />
          </Pressable>
        )}
      </View>
    </SettingSection>
  );
}

const styles = StyleSheet.create({
  deleteShortcutCard: {
    alignItems: "center",
    borderRadius: radii.sm,
    borderWidth: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.xs,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  shortcutLeft: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  shortcutTitle: {
    fontWeight: "700",
  },
  shortcutSub: {
    marginTop: 2,
  },
});
