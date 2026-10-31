import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '../../auth/AuthProvider';
import { supabase } from '../../data/marketplaceRepository';
import { useLanguage } from '../../i18n/locale';
import { colors, radii, spacing } from '../../theme/tokens';
import { SettingSection } from '../components/SettingSection';

export function SettingPassword() {
  const { language, t } = useLanguage();
  const { user } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleUpdatePassword = async () => {
    setStatusMessage(null);
    setErrorMessage(null);

    if (!currentPassword.trim()) {
      setErrorMessage(
        language === 'en'
          ? 'Please enter your current password.'
          : 'Masukkan kata sandi Anda saat ini.',
      );
      return;
    }

    if (
      newPassword.length < 8 ||
      !/[A-Za-z]/.test(newPassword) ||
      !/\d/.test(newPassword)
    ) {
      setErrorMessage(t('auth.passwordRule'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage(t('auth.passwordMismatch'));
      return;
    }

    setBusy(true);
    try {
      if (supabase && user) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) {
          setErrorMessage(t('auth.resetFailed'));
          return;
        }
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setStatusMessage(
        language === 'en'
          ? 'Password updated successfully.'
          : 'Kata sandi berhasil diperbarui.',
      );
    } catch {
      setErrorMessage(t('auth.serviceUnavailable'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SettingSection
      eyebrow={language === 'en' ? 'SECURITY' : 'KEAMANAN'}
      title={t('settings.passwordTitle')}
      description={
        language === 'en'
          ? 'Update your password to keep your account safe.'
          : 'Perbarui kata sandi Anda untuk menjaga keamanan akun.'
      }
      testID="setting-section-password"
    >
      <View style={styles.card} testID="password-update-form">
        {/* 1. Current Password */}
        <Text style={styles.fieldLabel}>
          {language === 'en' ? 'Current Password' : 'Kata Sandi Saat Ini'}
        </Text>
        <TextInput
          onChangeText={setCurrentPassword}
          placeholder={
            language === 'en' ? 'Enter current password' : 'Masukkan kata sandi saat ini'
          }
          placeholderTextColor={colors.muted}
          secureTextEntry={!showPassword}
          style={styles.input}
          testID="settings-current-password"
          value={currentPassword}
        />

        {/* 2. New Password */}
        <Text style={styles.fieldLabel}>{t('auth.newPassword')}</Text>
        <TextInput
          onChangeText={setNewPassword}
          placeholder={t('auth.newPassword')}
          placeholderTextColor={colors.muted}
          secureTextEntry={!showPassword}
          style={styles.input}
          testID="settings-new-password"
          value={newPassword}
        />

        {/* 3. Confirm Password */}
        <Text style={styles.fieldLabel}>{t('auth.confirmPassword')}</Text>
        <TextInput
          onChangeText={setConfirmPassword}
          placeholder={t('auth.confirmPassword')}
          placeholderTextColor={colors.muted}
          secureTextEntry={!showPassword}
          style={styles.input}
          testID="settings-confirm-password"
          value={confirmPassword}
        />

        {/* Toggle Show/Hide Password */}
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: showPassword }}
          onPress={() => setShowPassword((prev) => !prev)}
          style={styles.toggleRow}
          testID="toggle-show-password"
        >
          <View style={[styles.checkbox, showPassword && styles.checkboxActive]}>
            {showPassword && <Text style={styles.checkboxCheck}>✓</Text>}
          </View>
          <Text style={styles.toggleText}>
            {showPassword
              ? language === 'en'
                ? 'Hide Passwords'
                : 'Sembunyikan Kata Sandi'
              : language === 'en'
                ? 'Show Passwords'
                : 'Tampilkan Kata Sandi'}
          </Text>
        </Pressable>

        {errorMessage ? (
          <Text style={styles.errorText} testID="password-error-message">
            {errorMessage}
          </Text>
        ) : null}

        {statusMessage ? (
          <Text style={styles.successText} testID="password-status-message">
            {statusMessage}
          </Text>
        ) : null}

        {/* Update Password Action Button */}
        <Pressable
          accessibilityRole="button"
          disabled={busy || !currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()}
          onPress={() => {
            void handleUpdatePassword();
          }}
          style={[
            styles.primaryBtn,
            (busy || !currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) &&
              styles.btnDisabled,
          ]}
          testID="save-password-button"
        >
          <Text style={styles.primaryBtnText}>
            {busy
              ? language === 'en'
                ? 'Updating Password...'
                : 'Memperbarui Kata Sandi...'
              : language === 'en'
                ? 'Save Password'
                : 'Simpan Kata Sandi'}
          </Text>
        </Pressable>
      </View>
    </SettingSection>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.lg,
  },
  fieldLabel: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    marginTop: spacing.xs,
  },
  input: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 13,
    marginBottom: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  toggleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    marginVertical: spacing.sm,
  },
  checkbox: {
    alignItems: 'center',
    borderColor: colors.line,
    borderRadius: 4,
    borderWidth: 1.5,
    height: 18,
    justifyContent: 'center',
    width: 18,
  },
  checkboxActive: {
    backgroundColor: colors.greenDark,
    borderColor: colors.greenDark,
  },
  checkboxCheck: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  toggleText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '600',
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  successText: {
    color: colors.greenDark,
    fontSize: 12,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  primaryBtn: {
    alignItems: 'center',
    backgroundColor: colors.greenDark,
    borderRadius: radii.sm,
    justifyContent: 'center',
    marginTop: spacing.md,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
