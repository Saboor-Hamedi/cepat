import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../auth/AuthProvider';
import { getPasswordResetRedirectUrl } from '../auth/deepLinking';
import { isAuthServiceUnavailable } from '../auth/errors';
import {
  AuthField,
  AuthLink,
  AuthNotice,
  AuthShell,
  AuthSubmit,
} from '../components/auth-ui';
import { supabase } from '../data/marketplaceRepository';
import { useLanguage } from '../i18n/locale';
import { colors, radii, spacing } from '../theme/tokens';
import { font } from '../theme/typography';

export default function ResetPasswordScreen() {
  const { language, t } = useLanguage();
  const { recoveryMode, finishRecovery } = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const submitting = useRef(false);

  const canChangePassword = recoveryMode || codeVerified;

  useEffect(() => {
    if (!codeSent || codeVerified || secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [codeSent, codeVerified, secondsLeft]);

  const sendCode = async () => {
    setError('');
    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError(t('auth.emailInvalid'));
      return;
    }
    if (!supabase) {
      setError(t('auth.configuration'));
      return;
    }
    setBusy(true);
    try {
      const { error: reqErr } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: getPasswordResetRedirectUrl(),
      });
      if (reqErr) {
        setError(t('auth.recoveryError'));
        return;
      }
      setCodeSent(true);
      setSecondsLeft(60);
    } catch {
      setError(t('auth.serviceUnavailable'));
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    setError('');
    if (secondsLeft <= 0) {
      setError(
        language === 'en'
          ? 'Code expired (1-minute window). Please resend code.'
          : 'Kode kedaluwarsa (batas 1 menit). Silakan kirim ulang kode.',
      );
      return;
    }
    if (!/^\d{6,8}$/.test(code.trim())) {
      setError(
        language === 'en'
          ? 'Enter your 6-digit verification code.'
          : 'Masukkan kode verifikasi 6 digit.',
      );
      return;
    }
    if (!supabase) {
      setError(t('auth.configuration'));
      return;
    }
    setBusy(true);
    try {
      if (typeof supabase.auth.verifyOtp === 'function') {
        const { error: otpError } = await supabase.auth.verifyOtp({
          email: email.trim().toLowerCase(),
          token: code.trim(),
          type: 'recovery',
        });
        if (otpError) {
          setError(
            language === 'en'
              ? 'Invalid or expired verification code.'
              : 'Kode verifikasi tidak valid atau kedaluwarsa.',
          );
          return;
        }
      }
      setCodeVerified(true);
    } catch {
      setError(t('auth.serviceUnavailable'));
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    setError('');
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError(t('auth.passwordRule'));
      return;
    }
    if (password !== confirmation) {
      setError(t('auth.passwordMismatch'));
      return;
    }
    if (!supabase || !canChangePassword) {
      setError(t('auth.resetUnavailable'));
      return;
    }
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(
          t(isAuthServiceUnavailable(updateError) ? 'auth.serviceUnavailable' : 'auth.resetFailed'),
        );
        return;
      }
      setDone(true);
      finishRecovery();
    } catch {
      setError(t('auth.serviceUnavailable'));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  return (
    <AuthShell title={t('auth.resetTitle')} subtitle={t('auth.resetTitle')}>
      {!canChangePassword && !done ? (
        <AuthNotice tone="error">{t('auth.resetUnavailable')}</AuthNotice>
      ) : null}
      {error ? <AuthNotice tone="error">{error}</AuthNotice> : null}
      {done ? <AuthNotice tone="success">{t('auth.resetSuccess')}</AuthNotice> : null}

      {!done && !canChangePassword && (
        <View style={styles.otpSection}>
          <AuthField
            label={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            testID="reset-email-input"
            email
            autoComplete="email"
          />
          {!codeSent ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void sendCode();
              }}
              style={styles.otpActionBtn}
              testID="reset-send-code"
            >
              <Text style={styles.otpActionBtnText}>
                {language === 'en' ? 'Send 1-Minute Verification Code' : 'Kirim Kode Verifikasi (1 Menit)'}
              </Text>
            </Pressable>
          ) : (
            <>
              <Text style={styles.countdownText} testID="reset-countdown-timer">
                {language === 'en' ? 'Time left:' : 'Sisa waktu:'} 00:
                {String(secondsLeft).padStart(2, '0')}
              </Text>
              <AuthField
                label={language === 'en' ? '6-Digit Code' : 'Kode 6 Digit'}
                value={code}
                onChangeText={setCode}
                testID="reset-code-input"
              />
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void verifyCode();
                }}
                style={styles.otpActionBtn}
                testID="reset-verify-code"
              >
                <Text style={styles.otpActionBtnText}>
                  {language === 'en' ? 'Verify Code' : 'Verifikasi Kode'}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      )}

      {!done ? (
        <>
          <AuthField
            label={t('auth.password')}
            value={password}
            onChangeText={setPassword}
            testID="reset-password"
            password
            autoComplete="new-password"
          />
          <AuthField
            label={t('auth.confirmPassword')}
            value={confirmation}
            onChangeText={setConfirmation}
            testID="reset-confirm-password"
            password
            autoComplete="new-password"
          />
          <AuthSubmit
            label={t('auth.resetSubmit')}
            loading={busy || !canChangePassword}
            onPress={() => {
              void submit();
            }}
            testID="reset-submit"
          />
        </>
      ) : (
        <AuthLink
          label={t('auth.submitLogin')}
          onPress={() => router.replace('/login')}
          testID="reset-login-link"
        />
      )}
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  otpSection: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  countdownText: {
    color: colors.orange,
    fontSize: font.label,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  otpActionBtn: {
    alignItems: 'center',
    backgroundColor: colors.greenSoft,
    borderColor: colors.green,
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: spacing.md,
  },
  otpActionBtnText: {
    color: colors.greenDark,
    fontSize: font.body,
    fontWeight: '800',
  },
});
