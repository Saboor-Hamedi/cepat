import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { LanguageProvider } from '../i18n/locale';
import { colors } from '../theme/tokens';
import { AuthProvider } from '../auth/AuthProvider';

export default function RootLayout() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.paper },
            animation: 'none',
          }}
        >
          <Stack.Screen name="index" options={{ animation: 'none' }} />
          <Stack.Screen name="category/[slug]" options={{ animation: 'fade' }} />
          <Stack.Screen name="technician/[id]" options={{ animation: 'fade' }} />
          <Stack.Screen name="booking/[id]" options={{ animation: 'fade' }} />
          <Stack.Screen name="bookings" options={{ animation: 'none' }} />
          <Stack.Screen name="technician-dashboard" options={{ animation: 'none' }} />
          <Stack.Screen name="admin" options={{ animation: 'none' }} />
          <Stack.Screen name="account" options={{ animation: 'none' }} />
          <Stack.Screen name="login" options={{ animation: 'fade' }} />
          <Stack.Screen name="register" options={{ animation: 'fade' }} />
          <Stack.Screen name="forgot-password" options={{ animation: 'fade' }} />
          <Stack.Screen name="reset-password" options={{ animation: 'fade' }} />
        </Stack>
      </LanguageProvider>
    </AuthProvider>
  );
}
