import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Toggle } from "../../components/toggle";
import { useAppearance } from "../../context/AppearanceContext";
import { spacing } from "../../theme/tokens";
import { font } from "../../theme/typography";

export interface SettingItemProps {
  label: string;
  description?: string;
  active?: boolean;
  onPress?: () => void;
  rightElement?: ReactNode;
  testID?: string;
  accessibilityRole?: "button" | "switch" | "radio";
  showDivider?: boolean;
}

export function SettingItem({
  label,
  description,
  active,
  onPress,
  rightElement,
  testID,
  accessibilityRole = "button",
  showDivider = true,
}: SettingItemProps) {
  const { palette, scaleFont } = useAppearance();
  return (
    <View style={styles.wrapper}>
      <Pressable
        accessibilityRole={accessibilityRole}
        accessibilityState={
          accessibilityRole === "switch"
            ? { checked: Boolean(active) }
            : accessibilityRole === "radio"
              ? { selected: Boolean(active) }
              : undefined
        }
        disabled={!onPress}
        onPress={onPress}
        style={({ pressed }) => [
          styles.row,
          { opacity: pressed ? 0.75 : 1 },
        ]}
        testID={testID}
      >
        <View style={styles.copy}>
          <Text
            style={[
              styles.label,
              { color: palette.text, fontSize: scaleFont(font.label) },
            ]}
          >
            {label}
          </Text>
          {description ? (
            <Text
              style={[
                styles.description,
                {
                  color: palette.textMuted,
                  fontSize: scaleFont(font.caption),
                  lineHeight: scaleFont(16),
                },
              ]}
            >
              {description}
            </Text>
          ) : null}
        </View>
        {rightElement ?? (
          <Toggle
            checked={Boolean(active)}
            onChange={onPress}
            testID={testID ? `${testID}-toggle` : undefined}
          />
        )}
      </Pressable>
      {showDivider ? (
        <View style={[styles.hairline, { backgroundColor: palette.border }]} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
  },
  row: {
    alignItems: "center",
    backgroundColor: "transparent",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  copy: {
    flex: 1,
    marginRight: spacing.md,
  },
  label: {
    fontWeight: "600",
  },
  description: {
    marginTop: 3,
  },
  hairline: {
    height: 1,
    width: "100%",
  },
});
