import { ChevronRight } from "lucide-react-native";
import type { ComponentType } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAppearance } from "../../context/AppearanceContext";
import { ICON_STROKE } from "../../theme/icons";

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
  showDivider?: boolean;
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
  showDivider = false,
  onPress,
  testID,
}: SettingNavLinkProps) {
  const { palette, scaleFont } = useAppearance();

  const tint = isDanger ? palette.danger : palette.primary;
  const effectiveIconColor = iconColor || tint;
  const effectiveBgColor = iconBgColor || `${tint}14`;

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.row,
          {
            backgroundColor: pressed ? `${palette.text}08` : "transparent",
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
            size={20}
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
                fontSize: scaleFont(font.label) + 2,
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
                  fontSize: scaleFont(font.caption) + 2,
                },
              ]}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View style={styles.accessoryWrap}>
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

      {showDivider ? (
        <View style={[styles.divider, { backgroundColor: palette.border }]} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    borderWidth: 0,
    flexDirection: "row",
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: "100%",
  },
  iconTile: {
    alignItems: "center",
    borderRadius: 12,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  contentWrap: {
    flex: 1,
    justifyContent: "center",
    minWidth: 0,
  },
  titleText: {
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  subtitleText: {
    lineHeight: 16,
    marginTop: 2,
  },
  accessoryWrap: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  valuePlainText: {
    fontWeight: "500",
    marginRight: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 64,
    width: "100%",
  },
});
