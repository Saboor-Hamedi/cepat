import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAppearance } from "../../context/AppearanceContext";
import { radii, spacing } from "../../theme/tokens";

export interface SettingItemProps {
  label: string;
  description?: string;
  active?: boolean;
  onPress?: () => void;
  rightElement?: ReactNode;
  testID?: string;
  accessibilityRole?: "button" | "switch" | "radio";
}

export function SettingItem({
  label,
  description,
  active,
  onPress,
  rightElement,
  testID,
  accessibilityRole = "button",
}: SettingItemProps) {
  const { palette } = useAppearance();
  return (
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
      style={[
        styles.row,
        { backgroundColor: palette.surface, borderColor: palette.border },
        active && {
          backgroundColor: palette.primarySoft,
          borderColor: palette.primary,
        },
      ]}
      testID={testID}
    >
      <View style={styles.copy}>
        <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
        {description ? (
          <Text style={[styles.description, { color: palette.textMuted }]}>
            {description}
          </Text>
        ) : null}
      </View>
      {rightElement ?? (
        <View
          style={[
            styles.togglePill,
            { backgroundColor: active ? palette.primary : palette.border },
          ]}
        >
          <View
            style={[styles.toggleKnob, active && styles.toggleKnobActive]}
          />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    minHeight: 54,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  copy: {
    flex: 1,
    marginRight: spacing.md,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
  },
  description: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  togglePill: {
    borderRadius: radii.pill,
    height: 24,
    justifyContent: "center",
    paddingHorizontal: 3,
    width: 44,
  },
  toggleKnob: {
    backgroundColor: "#FFFFFF",
    borderRadius: 9,
    height: 18,
    width: 18,
  },
  toggleKnobActive: {
    alignSelf: "flex-end",
  },
});
