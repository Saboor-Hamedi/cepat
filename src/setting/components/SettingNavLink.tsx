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

  const effectiveIconColor = isDanger
    ? palette.danger
    : iconColor || palette.primary;

  const effectiveBgColor = isDanger
    ? `${palette.danger}15`
    : iconBgColor || `${palette.primary}12`;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: palette.surfaceElevated,
          borderColor: isDanger ? `${palette.danger}35` : palette.border,
          opacity: pressed ? 0.7 : 1,
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
          size={19}
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
        {valueText ? (
          <View
            style={[
              styles.valueBadge,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
              },
            ]}
          >
            <Text
              style={[
                styles.valueBadgeText,
                {
                  color: palette.textSecondary,
                  fontSize: scaleFont(font.caption),
                },
              ]}
            >
              {valueText}
            </Text>
          </View>
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
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 10,
    width: "100%",
  },
  iconTile: {
    alignItems: "center",
    borderRadius: 8,
    height: 38,
    justifyContent: "center",
    width: 38,
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
    gap: 8,
  },
  valueBadge: {
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  valueBadgeText: {
    fontWeight: "600",
  },
});
