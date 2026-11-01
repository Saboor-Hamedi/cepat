import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Avatar } from "../../components/marketplace-ui";
import { useAppearance } from "../../context/AppearanceContext";
import { useLanguage } from "../../i18n/locale";
import { radii, spacing } from "../../theme/tokens";

export type SettingSectionKey =
  | "account"
  | "password"
  | "notifications"
  | "language"
  | "appearance"
  | "security";

export interface SettingHeaderProps {
  activeSection: SettingSectionKey;
  onSelectSection: (section: SettingSectionKey) => void;
  isAuthenticated: boolean;
  userName?: string;
  avatarUri?: string;
  userRole?: string;
}

export function SettingHeader({
  activeSection,
  onSelectSection,
  isAuthenticated,
  userName,
  avatarUri,
  userRole,
}: SettingHeaderProps) {
  const { language } = useLanguage();
  const { palette, scaleFont } = useAppearance();

  const allTabs: {
    key: SettingSectionKey;
    label: string;
    authOnly?: boolean;
  }[] = [
    { key: "account", label: language === "en" ? "Account" : "Akun" },
    { key: "language", label: language === "en" ? "Language" : "Bahasa" },
    { key: "appearance", label: language === "en" ? "Appearance" : "Tampilan" },
    {
      key: "security",
      label: language === "en" ? "Security" : "Keamanan",
      authOnly: true,
    },
    {
      key: "password",
      label: language === "en" ? "Password" : "Kata Sandi",
      authOnly: true,
    },
    {
      key: "notifications",
      label: language === "en" ? "Notifications" : "Notifikasi",
      authOnly: true,
    },
  ];

  const visibleTabs = allTabs.filter((tab) => !tab.authOnly || isAuthenticated);

  return (
    <View style={styles.headerContainer}>
      {isAuthenticated && userName ? (
        <View
          style={[
            styles.identityCard,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
          testID="settings-user-identity"
        >
          <Avatar uri={avatarUri} name={userName} size={44} />
          <View style={styles.identityCopy}>
            <Text style={[styles.identityName, { color: palette.text, fontSize: scaleFont(15) }]} numberOfLines={1}>
              {userName}
            </Text>
            <Text style={[styles.identityRole, { color: palette.textMuted, fontSize: scaleFont(12) }]} numberOfLines={1}>
              {userRole || (language === "en" ? "Cepat account" : "Akun Cepat")}
            </Text>
          </View>
        </View>
      ) : null}
      <Text style={styles.srOnly}>{language === "en" ? "" : "Pengaturan"}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabRow}
      >
        {visibleTabs.map((tab) => {
          const selected = activeSection === tab.key;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => onSelectSection(tab.key)}
              style={[
                styles.tabPill,
                { backgroundColor: palette.pillBg },
                selected && { backgroundColor: palette.primary },
              ]}
              testID={`setting-tab-${tab.key}`}
            >
              <Text
                style={[
                  styles.tabPillText,
                  { color: palette.pillText, fontSize: scaleFont(13) },
                  selected && { color: "#FFFFFF" },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  identityCard: {
    alignItems: "center",
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  identityCopy: {
    flex: 1,
    minWidth: 0,
  },
  identityName: {
    fontWeight: "800",
  },
  identityRole: {
    marginTop: 3,
    textTransform: "capitalize",
  },
  srOnly: {
    height: 0,
    opacity: 0,
    position: "absolute",
    width: 0,
  },
  tabRow: {
    gap: 8,
    paddingVertical: 4,
  },
  tabPill: {
    backgroundColor: "#E4E6EB",
    borderRadius: radii.pill,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  tabPillText: {
    color: "#050505",
    fontWeight: "700",
  },
});
