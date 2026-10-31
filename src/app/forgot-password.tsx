import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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

const OTP_WINDOW_SECONDS = 60; // 1 minute strict window

export default function ForgotPasswordScreen() {
  const { language, t } = useLanguage();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');

  const [step, setStep] = useState<'email' | 'verify_code' | 'change_password' | 'done'>('email');
  const [secondsLeft, setSecondsLeft] = useState<number>(OTP_WINDOW_SECONDS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const submitting = useRef(false);

  useEffect(() => {
    if (step !== 'verify_code') return;
    if (secondsLeft <= 0) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [step, secondsLeft]);

  const formatCountdown = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const requestVerificationCode = async () => {
    setError('');
    setNotice('');
    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError(t('auth.emailInvalid'));
      return;
    }
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    try {
      if (supabase) {
        const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: getPasswordResetRedirectUrl(),
        });
        if (recoveryError) {
          setError(
            t(isAuthServiceUnavailable(recoveryError) ? 'auth.serviceUnavailable' : 'auth.recoveryError'),
          );
          return;
        }
      }
      setCode('');
      setSecondsLeft(OTP_WINDOW_SECONDS);
      setStep('verify_code');
      setNotice(
        language === 'en'
          ? `A verification code has been sent to ${cleanEmail}. Enter the code within 1 minute.`
          : `Kode verifikasi telah dikirim ke ${cleanEmail}. Masukkan kode dalam waktu 1 menit.`,
      );
    } catch {
      setError(t('auth.serviceUnavailable'));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    setError('');
    if (secondsLeft <= 0) {
      setError(
        language === 'en'
          ? 'Verification code expired (1-minute limit). Please resend a new code.'
          : 'Kode verifikasi kedaluwarsa (batas waktu 1 menit). Silakan kirim ulang kode baru.',
      );
      return;
    }
    const cleanCode = code.trim();
    if (!/^\d{6,8}$/.test(cleanCode)) {
      setError(
        language === 'en'
          ? 'Enter the 6-digit verification code sent to your email.'
          : 'Masukkan kode verifikasi 6 digit yang dikirim ke email Anda.',
      );
      return;
    }
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      if (supabase && typeof supabase.auth.verifyOtp === 'function') {
        const { error: otpError } = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: cleanCode,
          type: 'recovery',
        });
        if (otpError) {
          setError(
            language === 'en'
              ? 'Invalid or expired verification code. Please check your email and try again.'
              : 'Kode verifikasi salah atau kedaluwarsa. Periksa kembali email Anda.',
          );
          return;
        }
      }
      setStep('change_password');
      setNotice(
        language === 'en'
          ? 'Email code verified! You can now set your new password.'
          : 'Kode email terverifikasi! Sekarang silakan buat kata sandi baru Anda.',
      );
    } catch {
      setError(t('auth.serviceUnavailable'));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  const submitNewPassword = async () => {
    setError('');
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError(t('auth.passwordRule'));
      return;
    }
    if (password !== confirmation) {
      setError(t('auth.passwordMismatch'));
      return;
    }
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    try {
      if (supabase) {
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) {
          setError(
            t(isAuthServiceUnavailable(updateError) ? 'auth.serviceUnavailable' : 'auth.resetFailed'),
          );
          return;
        }
      }
      setStep('done');
      setNotice(t('auth.resetSuccess'));
    } catch {
      setError(t('auth.serviceUnavailable'));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title={t('auth.forgotTitle')}
      subtitle={
        language === 'en'
          ? 'Receive a verification code by email, verify within 1 minute, and set your new password.'
          : 'Terima kode verifikasi lewat email, verifikasi dalam 1 menit, lalu ubah kata sandi Anda.'
      }
    >
      {error ? <AuthNotice tone="error">{error}</AuthNotice> : null}
      {notice ? <AuthNotice tone="success">{notice}</AuthNotice> : null}

      {step === 'email' && (
        <>
          <AuthField
            label={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            testID="recovery-email"
            email
            autoComplete="email"
          />
          <AuthSubmit
            label={language === 'en' ? 'Send Verification Code' : 'Kirim Kode Verifikasi'}
            loading={busy}
            onPress={() => {
              void requestVerificationCode();
            }}
            testID="recovery-submit"
          />
        </>
      )}

      {step === 'verify_code' && (
        <View style={styles.verifyBox} testID="recovery-verify-step">
          <View
            style={[
              styles.timerBadge,
              secondsLeft <= 15 && styles.timerBadgeUrgent,
              secondsLeft === 0 && styles.timerBadgeExpired,
            ]}
          >
            <Text style={styles.timerLabel}>
              {language === 'en' ? 'TIME REMAINING' : 'SISA WAKTU VERIFIKASI'}
            </Text>
            <Text style={styles.timerValue} testID="otp-countdown-timer">
              {formatCountdown(secondsLeft)}
            </Text>
          </View>

          {secondsLeft === 0 ? (
            <View style={styles.expiredBox} testID="otp-expired-notice">
              <Text style={styles.expiredText}>
                {language === 'en'
                  ? 'The 1-minute verification window has expired. Request a new code to continue.'
                  : 'Waktu verifikasi 1 menit telah habis. Minta kode baru untuk melanjutkan.'}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void requestVerificationCode();
                }}
                style={styles.resendBtn}
                testID="resend-code-button"
              >
                <Text style={styles.resendBtnText}>
                  {language === 'en' ? 'Resend Verification Code (1:00)' : 'Kirim Ulang Kode (1:00)'}
                </Text>
              </Pressable>
            </View>
          ) : (
            <>
              <AuthField
                label={
                  language === 'en'
                    ? '6-Digit Email Verification Code'
                    : 'Kode Verifikasi Email (6 Digit)'
                }
                value={code}
                onChangeText={setCode}
                testID="recovery-code-input"
              />
              <AuthSubmit
                label={language === 'en' ? 'Verify Code' : 'Verifikasi Kode'}
                loading={busy}
                onPress={() => {
                  void verifyCode();
                }}
                testID="verify-code-submit"
              />
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void requestVerificationCode();
                }}
                style={styles.resendLink}
                testID="resend-code-button"
              >
                <Text style={styles.resendLinkText}>
                  {language === 'en' ? 'Resend new code (reset 1:00 timer)' : 'Kirim ulang kode baru (reset waktu 1:00)'}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      )}

      {step === 'change_password' && (
        <View testID="recovery-password-step">
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
            loading={busy}
            onPress={() => {
              void submitNewPassword();
            }}
            testID="reset-submit"
          />
        </View>
      )}

      {step === 'done' && (
        <AuthLink
          label={t('auth.submitLogin')}
          onPress={() =>
            router.replace({
              pathname: '/login',
              params: { email: email.trim().toLowerCase() },
            })
          }
          testID="reset-login-link"
        />
      )}
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  verifyBox: { marginTop: spacing.xs },
  timerBadge: {
    alignItems: 'center',
    backgroundColor: colors.greenSoft,
    borderColor: colors.green,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  timerBadgeUrgent: {
    backgroundColor: colors.orangeSoft,
    borderColor: colors.orange,
  },
  timerBadgeExpired: {
    backgroundColor: '#FCE9E7',
    borderColor: colors.danger,
  },
  timerLabel: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  timerValue: {
    color: colors.greenDark,
    fontSize: 18,
    fontWeight: '800',
  },
  expiredBox: {
    backgroundColor: '#FCE9E7',
    borderColor: colors.danger,
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  expiredText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    marginBottom: spacing.sm,
  },
  resendBtn: {
    alignItems: 'center',
    backgroundColor: colors.greenDark,
    borderRadius: radii.pill,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: spacing.lg,
  },
  resendBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  resendLink: {
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
  },
  resendLinkText: {
    color: colors.greenDark,
    fontSize: 12,
    fontWeight: '700',
  },
});
