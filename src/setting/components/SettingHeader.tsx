import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

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
  ];

  const visibleTabs = allTabs.filter((tab) => !tab.authOnly || isAuthenticated);

  return (
    <View style={styles.headerContainer}>
      <Text style={styles.srOnly}>{language === "en" ? "Settings" : "Pengaturan"}</Text>

      {/* Categories like Account, Language, etc. are on the VERY TOP */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabRow}
        testID="settings-category-tabs"
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
    marginBottom: spacing.md,
    marginTop: spacing.xs,
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
