import { ChevronRight } from "lucide-react-native";
import type { ComponentType } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAppearance } from "../../context/AppearanceContext";
import { ICON_STROKE } from "../../theme/icons";
import { radii } from "../../theme/tokens";
import { font } from "../../theme/typography";

export interface SettingNavLinkProps {
  title: string;
  subtitle?: string;
  icon: ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  iconColor?: string;
  iconBgColor?: string;
  valueText?: string;
  isDanger?: boolean;
  showChevron?: boolean;
  onPress: () => void;
  testID?: string;
}

export function SettingNavLink({
  title,
  subtitle,
  icon: Icon,
  iconColor,
  iconBgColor,
  valueText,
  isDanger = false,
  showChevron = true,
  onPress,
  testID,
}: SettingNavLinkProps) {
  const { palette, scaleFont } = useAppearance();

  // Subtle, cohesive neutral styling - not heavy/rainbow
  const effectiveIconColor = isDanger
    ? palette.danger
    : iconColor || palette.text;

  const effectiveBgColor = isDanger
    ? `${palette.danger}12`
    : iconBgColor || `${palette.text}08`;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: palette.surfaceElevated,
          borderColor: isDanger ? `${palette.danger}25` : palette.border,
          opacity: pressed ? 0.72 : 1,
        },
      ]}
      testID={testID}
    >
      <View
        style={[
          styles.iconTile,
          { backgroundColor: effectiveBgColor },
        ]}
      >
        <Icon
          size={18}
          strokeWidth={ICON_STROKE}
          color={effectiveIconColor}
        />
      </View>

      <View style={styles.contentWrap}>
        <Text
          numberOfLines={1}
          style={[
            styles.titleText,
            {
              color: isDanger ? palette.danger : palette.text,
              fontSize: scaleFont(font.label),
            },
          ]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={1}
            style={[
              styles.subtitleText,
              {
                color: palette.textMuted,
                fontSize: scaleFont(font.caption),
              },
            ]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.accessoryWrap}>
        {/* Unboxed, subtle plain text for values like "English", without highlight badge */}
        {valueText ? (
          <Text
            style={[
              styles.valuePlainText,
              {
                color: palette.textMuted,
                fontSize: scaleFont(font.body),
              },
            ]}
          >
            {valueText}
          </Text>
        ) : null}

        {showChevron && (
          <ChevronRight
            size={16}
            strokeWidth={ICON_STROKE}
            color={isDanger ? palette.danger : palette.textMuted}
          />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 54,
    paddingHorizontal: 14,
    paddingVertical: 10,
    width: "100%",
  },
  iconTile: {
    alignItems: "center",
    borderRadius: 8,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  contentWrap: {
    flex: 1,
    justifyContent: "center",
  },
  titleText: {
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  subtitleText: {
    marginTop: 2,
  },
  accessoryWrap: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  valuePlainText: {
    fontWeight: "500",
    marginRight: 2,
  },
});
