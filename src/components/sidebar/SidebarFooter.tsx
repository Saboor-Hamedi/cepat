import { LogOut } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useAppearance } from '../../context/AppearanceContext';
import type { Language } from '../../i18n/locale';
import { ICON_STROKE } from '../../theme/icons';
import { createSidebarFooterStyles } from './css/sidebarStyles';

export interface SidebarFooterProps {
  language: Language;
  isAuthenticated: boolean;
  onLogout: () => void;
  onLogin: () => void;
  onRegister: () => void;
}

export function SidebarFooter({
  language,
  isAuthenticated,
  onLogout,
  onLogin,
  onRegister,
}: SidebarFooterProps) {
  const { palette } = useAppearance();
  const styles = useMemo(() => createSidebarFooterStyles(palette), [palette]);

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.guestAuthActions}>
          <Pressable
            accessibilityRole="button"
            onPress={onLogin}
            style={styles.loginBtn}
            testID="sidebar-login"
          >
            <Text style={styles.loginBtnText}>
              {language === 'en' ? 'Sign in' : 'Masuk'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onRegister}
            style={styles.registerBtn}
            testID="sidebar-register"
          >
            <Text style={styles.registerBtnText}>
              {language === 'en' ? 'Create account' : 'Buat akun'}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        onPress={onLogout}
        style={({ pressed }) => [
          styles.logoutBtn,
          { opacity: pressed ? 0.85 : 1 },
        ]}
        testID="sidebar-logout"
      >
        <LogOut
          color="#F87171"
          size={20}
          strokeWidth={ICON_STROKE}
        />
        <Text style={styles.logoutBtnText}>
          {language === 'en' ? 'Log out' : 'Keluar'}
        </Text>
      </Pressable>
    </View>
  );
}
