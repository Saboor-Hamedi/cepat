import { requireOptionalNativeModule } from 'expo-modules-core';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { Platform } from 'react-native';

import { AuthProvider } from '../auth/AuthProvider';
import { AppearanceProvider, useAppearance } from '../context/AppearanceContext';
import { LanguageProvider } from '../i18n/locale';
import { PostDropdownProvider } from '../components/posts/PostDropdown';
import { InAppNotificationBanner } from '../components/InAppNotificationBanner';

if (Platform.OS !== 'web') {
  void SplashScreen.preventAutoHideAsync().catch((error: unknown) => {
    console.warn('Could not hold the native splash screen:', error);
  });
}

function disableFloatingDevGearButton() {
  try {
    const devMenuPrefs = requireOptionalNativeModule<{
      setPreferencesAsync?: (prefs: Record<string, unknown>) => Promise<void>;
    }>('DevMenuPreferences');
    void devMenuPrefs?.setPreferencesAsync?.({
      showFloatingActionButton: false,
      showsAtLaunch: false,
      isOnboardingFinished: true,
    });
  } catch {
    // Ignore when module is not present
  }

  try {
    const expoDevMenu = requireOptionalNativeModule<{
      setPreferencesAsync?: (prefs: Record<string, unknown>) => Promise<void>;
      hideDevMenuButton?: () => Promise<void>;
    }>('ExpoDevMenu');
    void expoDevMenu?.setPreferencesAsync?.({
      showFloatingActionButton: false,
      showsAtLaunch: false,
      isOnboardingFinished: true,
    });
    void expoDevMenu?.hideDevMenuButton?.();
  } catch {
    // Ignore when module is not present
  }
}

function ThemedStack() {
  const { isDark, palette, reduceMotion, isHydrated } = useAppearance();
  const stackAnim = reduceMotion ? 'none' : 'fade';

  useEffect(() => {
    disableFloatingDevGearButton();
  }, []);

  useEffect(() => {
    if (isHydrated && Platform.OS !== 'web') {
      void SplashScreen.hideAsync().catch((error: unknown) => {
        console.warn('Could not hide the native splash screen:', error);
      });
    }
  }, [isHydrated]);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.background },
          animation: 'none',
        }}
      >
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        <Stack.Screen name="category/[slug]" options={{ animation: stackAnim }} />
        <Stack.Screen name="technician/[id]" options={{ animation: stackAnim }} />
        <Stack.Screen name="booking/[id]" options={{ animation: stackAnim }} />
        <Stack.Screen name="bookings" options={{ animation: 'none' }} />
        <Stack.Screen name="notifications" options={{ animation: stackAnim }} />
        <Stack.Screen name="technician-dashboard" options={{ animation: 'none' }} />
        <Stack.Screen name="admin" options={{ animation: 'none' }} />
        <Stack.Screen name="account" options={{ animation: 'none' }} />
        <Stack.Screen name="login" options={{ animation: stackAnim }} />
        <Stack.Screen name="register" options={{ animation: stackAnim }} />
        <Stack.Screen name="forgot-password" options={{ animation: stackAnim }} />
        <Stack.Screen name="reset-password" options={{ animation: stackAnim }} />
      </Stack>
      <InAppNotificationBanner />
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppearanceProvider>
        <LanguageProvider>
          <PostDropdownProvider>
            <ThemedStack />
          </PostDropdownProvider>
        </LanguageProvider>
      </AppearanceProvider>
    </AuthProvider>
  );
}
