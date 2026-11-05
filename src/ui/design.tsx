import type { PropsWithChildren, ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const colors = {
  background: "#000000",
  surface: "#0B0F17",
  surfaceElevated: "#131B26",
  divider: "#1E293B",
  text: "#F8FAFC",
  secondary: "#94A3B8",
  muted: "#64748B",
  accent: "#10B981",
} as const;

export interface ScreenWrapperProps extends PropsWithChildren {
  padded?: boolean;
  testID?: string;
}

export function ScreenWrapper({
  padded = true,
  testID,
  children,
}: ScreenWrapperProps) {
  return (
    <SafeAreaView
      style={styles.screen}
      edges={["top", "bottom"]}
      testID={testID}
    >
      <View style={[styles.content, padded && styles.padded]}>{children}</View>
    </SafeAreaView>
  );
}

type TextVariant = "title" | "body" | "caption";
type TextColor = "primary" | "secondary" | "muted" | "accent";

export interface AppTextProps {
  variant?: TextVariant;
  color?: TextColor;
  align?: "left" | "center" | "right";
  numberOfLines?: number;
  testID?: string;
  children?: ReactNode;
}

const VARIANT_STYLE: Record<TextVariant, object> = {
  title: { fontSize: 20, fontWeight: "800", letterSpacing: -0.4 },
  body: { fontSize: 14, fontWeight: "500" },
  caption: { fontSize: 12, fontWeight: "500" },
};

const COLOR_STYLE: Record<TextColor, object> = {
  primary: { color: colors.text },
  secondary: { color: colors.secondary },
  muted: { color: colors.muted },
  accent: { color: colors.accent },
};

export function AppText({
  variant = "body",
  color = "primary",
  align = "left",
  numberOfLines,
  testID,
  children,
}: AppTextProps) {
  return (
    <Text
      numberOfLines={numberOfLines}
      testID={testID}
      style={[
        styles.appText,
        VARIANT_STYLE[variant],
        COLOR_STYLE[color],
        { textAlign: align },
      ]}
    >
      {children}
    </Text>
  );
}

export type AppButtonVariant = "primary" | "outline" | "secondary";

export interface AppButtonProps {
  variant?: AppButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
  fullWidth?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  children?: ReactNode;
}

export function AppButton({
  variant = "primary",
  disabled = false,
  loading = false,
  onPress,
  fullWidth = true,
  testID,
  accessibilityLabel,
  children,
}: AppButtonProps) {
  const inactive = disabled || loading;

  const variantStyles =
    variant === "primary"
      ? styles.buttonPrimary
      : variant === "outline"
        ? styles.buttonOutline
        : styles.buttonSecondary;

  const labelStyles =
    variant === "primary" ? styles.labelPrimary : styles.labelDefault;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: inactive }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variantStyles,
        fullWidth && styles.buttonFullWidth,
        inactive && styles.buttonDisabled,
        pressed && styles.buttonPressed,
      ]}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "primary" ? "#000000" : colors.text}
          size="small"
        />
      ) : (
        <Text style={[styles.label, labelStyles]}>{children}</Text>
      )}
    </Pressable>
  );
}

export function AppDivider({ testID }: { testID?: string }) {
  return <View style={styles.divider} testID={testID} />;
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    flex: 1,
    width: "100%",
  },
  padded: {
    paddingHorizontal: 16,
  },
  appText: {
    includeFontPadding: false,
  },
  button: {
    alignItems: "center",
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 20,
  },
  buttonFullWidth: {
    width: "100%",
  },
  buttonPrimary: {
    backgroundColor: colors.accent,
  },
  buttonOutline: {
    backgroundColor: "transparent",
    borderColor: colors.divider,
    borderWidth: StyleSheet.hairlineWidth,
  },
  buttonSecondary: {
    backgroundColor: colors.surfaceElevated,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  label: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  labelPrimary: {
    color: "#000000",
  },
  labelDefault: {
    color: colors.text,
  },
  divider: {
    backgroundColor: colors.divider,
    height: StyleSheet.hairlineWidth,
    width: "100%",
  },
});
