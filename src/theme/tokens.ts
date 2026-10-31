import type { ProfileThemePreset } from '../types/marketplace';

export const colors = {
  ink: '#20312D',
  muted: '#73817C',
  paper: '#F8F7F2',
  surface: '#FFFFFF',
  line: '#E8E9E1',
  green: '#34715E',
  greenDark: '#285848',
  greenSoft: '#EAF2ED',
  orange: '#D9764C',
  orangeSoft: '#F8E8DF',
  yellow: '#F3C969',
  danger: '#A8433B',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 36,
} as const;

export const radii = {
  xs: 4,
  sm: 5,
  md: 5,
  lg: 5,
  pill: 5,
} as const;

export interface ProfileTheme {
  background: string;
  accent: string;
  surface: string;
  label: string;
}

const PROFILE_THEMES: Record<ProfileThemePreset, ProfileTheme> = {
  sand: {
    background: '#F7F0E5',
    accent: '#A4663E',
    surface: '#FFFCF7',
    label: 'Pasir hangat',
  },
  sage: {
    background: '#EAF2ED',
    accent: '#34715E',
    surface: '#F8FCF9',
    label: 'Sage',
  },
  clay: {
    background: '#F5E9E2',
    accent: '#A8543C',
    surface: '#FFF9F5',
    label: 'Tanah liat',
  },
};

export function normalizeProfileTheme(value: unknown): ProfileThemePreset {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return 'sand';
  }

  const preset = (value as { preset?: unknown }).preset;
  return preset === 'sand' || preset === 'sage' || preset === 'clay'
    ? preset
    : 'sand';
}

export function getProfileTheme(preset: ProfileThemePreset): ProfileTheme {
  return PROFILE_THEMES[preset];
}
