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

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemePalette {
  background: string;
  surface: string;
  surfaceElevated: string;
  text: string;
  textMuted: string;
  border: string;
  pillBg: string;
  pillText: string;
  primary: string;
  primarySoft: string;
  danger: string;
  inputBg: string;
}

const LIGHT_PALETTE: ThemePalette = {
  background: '#F0F2F5',
  surface: '#FFFFFF',
  surfaceElevated: '#F7F8FA',
  text: '#050505',
  textMuted: '#65676B',
  border: '#CED0D4',
  pillBg: '#E4E6EB',
  pillText: '#050505',
  primary: colors.greenDark,
  primarySoft: colors.greenSoft,
  danger: colors.danger,
  inputBg: '#F0F2F5',
};

const DARK_PALETTE: ThemePalette = {
  background: '#18191A',
  surface: '#242526',
  surfaceElevated: '#3A3B3C',
  text: '#E4E6EB',
  textMuted: '#B0B3B8',
  border: '#3E4042',
  pillBg: '#3A3B3C',
  pillText: '#E4E6EB',
  primary: '#2D88FF',
  primarySoft: '#263951',
  danger: '#F02849',
  inputBg: '#3A3B3C',
};

const APPEARANCE_STORAGE_KEY = '@cepat/appearance-context-v1';

interface StoredAppearanceState {
  themeMode: ThemeMode;
  largeText: boolean;
  reduceMotion: boolean;
}

export interface AppearanceContextValue {
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
}

const AppearanceContext = createContext<AppearanceContextValue>({
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
});

export function AppearanceProvider({ children }: PropsWithChildren) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');
  const [largeText, setLargeTextState] = useState<boolean>(false);
  const [reduceMotion, setReduceMotionState] = useState<boolean>(false);

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
      })
      .catch(() => {});
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
      });
    },
    [largeText, persist, reduceMotion],
  );

  const setLargeText = useCallback(
    async (enabled: boolean) => {
      setLargeTextState(enabled);
      await persist({
        themeMode,
        largeText: enabled,
        reduceMotion,
      });
    },
    [persist, reduceMotion, themeMode],
  );

  const setReduceMotion = useCallback(
    async (enabled: boolean) => {
      setReduceMotionState(enabled);
      await persist({
        themeMode,
        largeText,
        reduceMotion: enabled,
      });
    },
    [largeText, persist, themeMode],
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
    }),
    [
      effectiveTheme,
      fontScale,
      isDark,
      largeText,
      palette,
      reduceMotion,
      scaleFont,
      setLargeText,
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
