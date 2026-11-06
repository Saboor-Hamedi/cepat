import type { PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useAppearance } from '../context/AppearanceContext';
import { layoutTokens } from '../theme/designSystem';
import { spacing } from '../theme/tokens';
import { font } from '../theme/typography';

export interface ScreenWrapperProps extends PropsWithChildren {
  padded?: boolean;
  centered?: boolean;
  maxWidth?: number;
  gap?: number;
  edges?: readonly Edge[];
  backgroundColor?: string;
  style?: ViewStyle;
  testID?: string;
}

export function ScreenWrapper({
  padded = true,
  centered = false,
  maxWidth = layoutTokens.maxFeedWidth,
  gap,
  edges = ['top', 'bottom'],
  backgroundColor,
  style,
  testID,
  children,
}: ScreenWrapperProps) {
  const { palette } = useAppearance();

  return (
    <SafeAreaView
      edges={edges}
      style={[
        styles.screen,
        { backgroundColor: backgroundColor ?? palette.background },
      ]}
      testID={testID}
    >
      <View
        style={[
          styles.content,
          padded && styles.padded,
          centered && { alignSelf: 'center', maxWidth },
          typeof gap === 'number' ? { gap } : null,
          style,
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

type TextVariant = 'title' | 'subtitle' | 'body' | 'caption';
type TextColor = 'primary' | 'secondary' | 'muted' | 'accent' | 'danger';

export interface AppTextProps {
  variant?: TextVariant;
  color?: TextColor;
  align?: 'left' | 'center' | 'right';
  numberOfLines?: number;
  testID?: string;
  children?: ReactNode;
}

export function AppText({
  variant = 'body',
  color = 'primary',
  align = 'left',
  numberOfLines,
  testID,
  children,
}: AppTextProps) {
  const { palette, scaleFont } = useAppearance();

  const variantStyle =
    variant === 'title'
      ? {
          fontSize: scaleFont(font.section),
          fontWeight: '800' as const,
          letterSpacing: -0.4,
          lineHeight: scaleFont(26),
        }
      : variant === 'subtitle'
        ? {
            fontSize: scaleFont(font.title),
            fontWeight: '700' as const,
            letterSpacing: -0.2,
            lineHeight: scaleFont(21),
          }
        : variant === 'caption'
          ? {
              fontSize: scaleFont(font.body),
              fontWeight: '500' as const,
              lineHeight: scaleFont(16),
            }
          : {
              fontSize: scaleFont(font.subtitle),
              fontWeight: '500' as const,
              lineHeight: scaleFont(20),
            };

  const resolvedColor =
    color === 'secondary'
      ? (palette.textSecondary ?? palette.textMuted)
      : color === 'muted'
        ? palette.textMuted
        : color === 'accent'
          ? palette.primary
          : color === 'danger'
            ? palette.danger
            : palette.text;

  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        styles.appText,
        variantStyle,
        { color: resolvedColor, textAlign: align },
      ]}
      testID={testID}
    >
      {children}
    </Text>
  );
}

export type AppButtonVariant = 'primary' | 'outline' | 'secondary';

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
  variant = 'primary',
  disabled = false,
  loading = false,
  onPress,
  fullWidth = true,
  testID,
  accessibilityLabel,
  children,
}: AppButtonProps) {
  const { palette, scaleFont } = useAppearance();
  const inactive = disabled || loading;

  const variantStyles =
    variant === 'primary'
      ? { backgroundColor: palette.primary }
      : variant === 'outline'
        ? {
            backgroundColor: 'transparent',
            borderColor: palette.border,
            borderWidth: StyleSheet.hairlineWidth,
          }
        : { backgroundColor: palette.surfaceElevated };

  const labelColor = variant === 'primary' ? '#0B0E14' : palette.text;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
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
        <ActivityIndicator color={labelColor} size="small" />
      ) : (
        <Text
          style={[
            styles.label,
            { color: labelColor, fontSize: scaleFont(font.title) },
          ]}
        >
          {children}
        </Text>
      )}
    </Pressable>
  );
}

export function AppDivider({ testID }: { testID?: string }) {
  const { palette } = useAppearance();
  return (
    <View
      style={[styles.divider, { backgroundColor: palette.border }]}
      testID={testID}
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flex: 1,
    width: '100%',
  },
  padded: {
    paddingHorizontal: layoutTokens.screenPaddingX,
  },
  appText: {
    includeFontPadding: false,
  },
  button: {
    alignItems: 'center',
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.xl,
  },
  buttonFullWidth: {
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  label: {
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
});
