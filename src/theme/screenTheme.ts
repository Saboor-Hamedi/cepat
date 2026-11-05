import { useAppearance } from '../context/AppearanceContext';

export interface ScreenTheme {
  background: string;
  surface: string;
  card: string;
  segmentedBg: string;
  muted: string;
  border: string;
  primary: string;
  onPrimary: string;
  text: string;
  primarySoft: string;
  primarySoftStrong: string;
  isDark: boolean;
}

export function useScreenTheme(): ScreenTheme {
  const { palette, isDark } = useAppearance();
  return {
    background: palette.background,
    surface: palette.surface,
    card: isDark ? '#111827' : palette.surface,
    segmentedBg: isDark ? '#161F2E' : palette.surfaceElevated,
    muted: isDark ? '#94A3B8' : palette.textMuted,
    border: palette.border,
    primary: palette.primary,
    onPrimary: '#000000',
    text: palette.text,
    primarySoft: palette.primarySoft,
    primarySoftStrong: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.12)',
    isDark,
  };
}
