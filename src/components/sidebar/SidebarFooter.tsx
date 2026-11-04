import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useAppearance } from '../../context/AppearanceContext';
import type { Language } from '../../i18n/locale';
import { colors } from '../../theme/tokens';
import { createSidebarFooterStyles } from './css/sidebarStyles';

type SidebarFooterStyles = ReturnType<typeof createSidebarFooterStyles>;

export interface SidebarFooterProps {
  language: Language;
  isAuthenticated: boolean;
  onLogout: () => void;
  onLogin: () => void;
  onRegister: () => void;
}

function LogoutIcon({ styles }: { styles: SidebarFooterStyles }) {
  return (
    <View style={styles.logoutCanvas}>
      <View style={[styles.logoutFrame, { borderColor: colors.danger }]} />
      <View style={[styles.logoutShaft, { backgroundColor: colors.danger }]} />
      <View style={[styles.logoutHead, { borderColor: colors.danger }]} />
    </View>
  );
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

  return (
    <View style={styles.container}>
      {isAuthenticated ? (
        <Pressable
          accessibilityRole="button"
          onPress={onLogout}
          style={styles.logoutBtn}
          testID="sidebar-logout"
        >
          <LogoutIcon styles={styles} />
          <Text style={styles.logoutBtnText}>Log out</Text>
        </Pressable>
      ) : (
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
      )}
    </View>
  );
}
