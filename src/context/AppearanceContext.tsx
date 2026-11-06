import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { useColorScheme } from 'react-native';

import { colors } from '../theme/tokens';
import { DEFAULT_PROFILE_ACCENT_ID } from '../theme/profileAccent';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemePalette {
  background: string;
  surface: string;
  surfaceSecondary?: string;
  surfaceElevated: string;
  text: string;
  textSecondary?: string;
  textMuted: string;
  border: string;
  pillBg: string;
  pillText: string;
  primary: string;
  primaryLight?: string;
  primarySoft: string;
  danger: string;
  inputBg: string;
  chipBg?: string;
}

const LIGHT_PALETTE: ThemePalette = {
  background: '#FFFFFF',
  surface: '#F5F7F5',
  surfaceSecondary: '#EEF2EE',
  surfaceElevated: '#EEF2EE',
  text: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  pillBg: '#F0F4F0',
  pillText: '#111827',
  primary: '#10B981',
  primaryLight: 'rgba(16, 185, 129, 0.1)',
  primarySoft: 'rgba(16, 185, 129, 0.1)',
  danger: colors.danger,
  inputBg: '#F3F4F6',
  chipBg: '#F0F4F0',
};

const DARK_PALETTE: ThemePalette = {
  background: '#000000',
  surface: '#0B0F17',
  surfaceSecondary: '#131B26',
  surfaceElevated: '#131B26',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  border: '#1E293B',
  pillBg: '#131B26',
  pillText: '#F8FAFC',
  primary: '#10B981',
  primaryLight: 'rgba(16, 185, 129, 0.15)',
  primarySoft: 'rgba(16, 185, 129, 0.15)',
  danger: '#EF4444',
  inputBg: '#131B26',
  chipBg: '#131B26',
};

const APPEARANCE_STORAGE_KEY = '@cepat/appearance-context-v1';

interface StoredAppearanceState {
  themeMode: ThemeMode;
  largeText: boolean;
  reduceMotion: boolean;
  // Persisted accent id for the profile avatar ring. Optional so older
  // stored payloads remain valid; missing values fall back to "none".
  profileAccentId?: string;
}

export interface AppearanceContextValue {
  isHydrated: boolean;
  themeMode: ThemeMode;
  effectiveTheme: 'light' | 'dark';
  isDark: boolean;
  largeText: boolean;
  reduceMotion: boolean;
  fontScale: number;
  palette: ThemePalette;
  scaleFont: (baseSize: number) => number;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  setLargeText: (enabled: boolean) => Promise<void>;
  setReduceMotion: (enabled: boolean) => Promise<void>;
  // Profile avatar ring accent. "none" disables the ring entirely.
  profileAccentId: string;
  setProfileAccent: (id: string) => Promise<void>;
}

const AppearanceContext = createContext<AppearanceContextValue>({
  isHydrated: false,
  themeMode: 'light',
  effectiveTheme: 'light',
  isDark: false,
  largeText: false,
  reduceMotion: false,
  fontScale: 1,
  palette: LIGHT_PALETTE,
  scaleFont: (size) => size,
  setThemeMode: async () => {},
  setLargeText: async () => {},
  setReduceMotion: async () => {},
  profileAccentId: DEFAULT_PROFILE_ACCENT_ID,
  setProfileAccent: async () => {},
});

export function AppearanceProvider({ children }: PropsWithChildren) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');
  const [largeText, setLargeTextState] = useState<boolean>(false);
  const [reduceMotion, setReduceMotionState] = useState<boolean>(false);
  const [profileAccentId, setProfileAccentId] = useState<string>(
    DEFAULT_PROFILE_ACCENT_ID,
  );
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(APPEARANCE_STORAGE_KEY)
      .then((raw) => {
        if (!active || !raw) return;
        const parsed = JSON.parse(raw) as Partial<StoredAppearanceState>;
        if (
          parsed.themeMode === 'light' ||
          parsed.themeMode === 'dark' ||
          parsed.themeMode === 'system'
        ) {
          setThemeModeState(parsed.themeMode);
        }
        if (typeof parsed.largeText === 'boolean') {
          setLargeTextState(parsed.largeText);
        }
        if (typeof parsed.reduceMotion === 'boolean') {
          setReduceMotionState(parsed.reduceMotion);
        }
        if (typeof parsed.profileAccentId === 'string' && parsed.profileAccentId) {
          setProfileAccentId(parsed.profileAccentId);
        }
      })
      .catch((error: unknown) => {
        console.warn('Could not load saved appearance preferences:', error);
      })
      .finally(() => {
        if (active) setIsHydrated(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const persist = useCallback(async (next: StoredAppearanceState) => {
    try {
      await AsyncStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage write errors
    }
  }, []);

  const setThemeMode = useCallback(
    async (mode: ThemeMode) => {
      const normalized: ThemeMode =
        mode === 'dark' || mode === 'system' ? mode : 'light';
      setThemeModeState(normalized);
      await persist({
        themeMode: normalized,
        largeText,
        reduceMotion,
        profileAccentId,
      });
    },
    [largeText, persist, profileAccentId, reduceMotion],
  );

  const setLargeText = useCallback(
    async (enabled: boolean) => {
      setLargeTextState(enabled);
      await persist({
        themeMode,
        largeText: enabled,
        reduceMotion,
        profileAccentId,
      });
    },
    [persist, profileAccentId, reduceMotion, themeMode],
  );

  const setReduceMotion = useCallback(
    async (enabled: boolean) => {
      setReduceMotionState(enabled);
      await persist({
        themeMode,
        largeText,
        reduceMotion: enabled,
        profileAccentId,
      });
    },
    [largeText, persist, profileAccentId, themeMode],
  );

  const setProfileAccent = useCallback(
    async (id: string) => {
      // Persist the picker selection immediately, same as theme/accessibility.
      setProfileAccentId(id);
      await persist({
        themeMode,
        largeText,
        reduceMotion,
        profileAccentId: id,
      });
    },
    [largeText, persist, reduceMotion, themeMode],
  );

  const effectiveTheme: 'light' | 'dark' = useMemo(() => {
    if (themeMode === 'system') {
      return systemColorScheme === 'dark' ? 'dark' : 'light';
    }
    return themeMode;
  }, [systemColorScheme, themeMode]);

  const isDark = effectiveTheme === 'dark';
  const fontScale = largeText ? 1.15 : 1;
  const palette = isDark ? DARK_PALETTE : LIGHT_PALETTE;

  const scaleFont = useCallback(
    (baseSize: number) => Math.round(baseSize * fontScale * 10) / 10,
    [fontScale],
  );

  const value = useMemo<AppearanceContextValue>(
    () => ({
      isHydrated,
      themeMode,
      effectiveTheme,
      isDark,
      largeText,
      reduceMotion,
      fontScale,
      palette,
      scaleFont,
      setThemeMode,
      setLargeText,
      setReduceMotion,
      profileAccentId,
      setProfileAccent,
    }),
    [
      effectiveTheme,
      fontScale,
      isHydrated,
      isDark,
      largeText,
      palette,
      profileAccentId,
      reduceMotion,
      scaleFont,
      setLargeText,
      setProfileAccent,
      setReduceMotion,
      setThemeMode,
      themeMode,
    ],
  );

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance(): AppearanceContextValue {
  return useContext(AppearanceContext);
}
