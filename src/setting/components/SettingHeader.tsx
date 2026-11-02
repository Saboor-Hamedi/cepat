import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAppearance } from "../../context/AppearanceContext";
import { useLanguage } from "../../i18n/locale";
import { radii, spacing } from "../../theme/tokens";

export type SettingSectionKey =
  | "account"
  | "address"
  | "password"
  | "notifications"
  | "language"
  | "appearance"
  | "security"
  | "policy"
  | "delete-account";

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
}: SettingHeaderProps) {
  const { language } = useLanguage();
  const { palette, scaleFont } = useAppearance();

  const allTabs: {
    key: SettingSectionKey;
    label: string;
    authOnly?: boolean;
    isDanger?: boolean;
  }[] = [
    { key: "account", label: language === "en" ? "Account" : "Akun" },
    {
      key: "address",
      label: language === "en" ? "Address" : "Alamat",
      authOnly: true,
    },
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
      key: "policy",
      label: language === "en" ? "Policy" : "Kebijakan",
    },
    {
      key: "delete-account",
      label: language === "en" ? "Delete Account" : "Hapus Akun",
      authOnly: true,
      isDanger: true,
    },
  ];

  const visibleTabs = allTabs.filter((tab) => !tab.authOnly || isAuthenticated);

  return (
    <View style={styles.headerContainer}>
      {/* Categories like Account, Language, etc. on top */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabRow}
        testID="settings-category-tabs"
      >
        {visibleTabs.map((tab) => {
          const selected = activeSection === tab.key;
          const isDanger = Boolean(tab.isDanger);
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => onSelectSection(tab.key)}
              style={[
                styles.tabPill,
                { backgroundColor: isDanger ? `${palette.danger}15` : palette.pillBg },
                selected && { backgroundColor: isDanger ? palette.danger : palette.primary },
              ]}
              testID={`setting-tab-${tab.key}`}
            >
              <Text
                style={[
                  styles.tabPillText,
                  {
                    color: isDanger ? palette.danger : palette.pillText,
                    fontSize: scaleFont(13),
                  },
                  selected && { color: "#FFFFFF", fontWeight: "700" },
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
    marginBottom: spacing.sm,
  },
  tabRow: {
    flexDirection: "row",
    gap: spacing.xs,
    paddingBottom: spacing.xs,
    paddingHorizontal: 12,
  },
  tabPill: {
    borderRadius: radii.pill,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tabPillText: {
    fontWeight: "600",
  },
});
