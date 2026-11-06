import { StyleSheet, View } from "react-native";

import { spacing } from "../../theme/tokens";
import { SettingTabs } from "./SettingTabs";

export type SettingSectionKey =
  | "account"
  | "address"
  | "security"
  | "password"
  | "notifications"
  | "language"
  | "appearance"
  | "profile-accent"
  | "policy"
  | "version"
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
  return (
    <View style={styles.headerContainer}>
      <SettingTabs
        activeSection={activeSection}
        isAuthenticated={isAuthenticated}
        onSelectSection={onSelectSection}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    marginBottom: spacing.sm,
  },
});
