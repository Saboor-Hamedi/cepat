import type { PropsWithChildren, ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useAppearance } from "../../context/AppearanceContext";
import { spacing } from "../../theme/tokens";
import { font } from "../../theme/typography";

export interface SettingSectionProps extends PropsWithChildren {
  eyebrow?: string;
  title?: string;
  description?: string;
  badge?: ReactNode;
  testID?: string;
}

export function SettingSection({
  title,
  description,
  badge,
  testID,
  children,
}: SettingSectionProps) {
  const { palette, scaleFont } = useAppearance();
  return (
    <View style={styles.container} testID={testID}>
      {title || description || badge ? (
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            {title ? (
              <Text
                style={[
                  styles.title,
                  { color: palette.text, fontSize: scaleFont(font.heading) },
                ]}
              >
                {title}
              </Text>
            ) : null}
            {description ? (
              <Text
                style={[
                  styles.description,
                  {
                    color: palette.textMuted,
                    fontSize: scaleFont(font.body),
                    lineHeight: scaleFont(19),
                  },
                ]}
              >
                {description}
              </Text>
            ) : null}
          </View>
          {badge}
        </View>
      ) : null}
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "transparent",
    marginBottom: spacing.md,
    paddingTop: 5,
    width: "100%",
  },
  headerRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  description: {
    marginTop: 4,
  },
  body: {
    width: "100%",
  },
});
