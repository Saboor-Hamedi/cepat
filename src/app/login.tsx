import { router, useLocalSearchParams } from 'expo-router';
import { Lock, Mail } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { signInPreviewAccount, useAuth } from '../auth/AuthProvider';
import { isAuthServiceUnavailable } from '../auth/errors';
import { AuthField, AuthLink, AuthNotice, AuthShell, AuthSubmit } from '../components/auth-ui';
import { useAppearance } from '../context/AppearanceContext';
import { supabase } from '../data/marketplaceRepository';
import { useLanguage } from '../i18n/locale';
import { ICON_SIZE, ICON_STROKE } from '../theme/icons';

function resolveSafeRedirect(redirectParam?: string, technicianIdParam?: string): string | null {
  if (typeof redirectParam === 'string' && redirectParam.startsWith('/') && !redirectParam.startsWith('//')) {
    return redirectParam;
  }
  if (typeof technicianIdParam === 'string' && technicianIdParam.trim()) {
    return `/booking/${technicianIdParam.trim()}`;
  }
  return null;
}

export default function LoginScreen() {
  const { language, t } = useLanguage();
  const { palette } = useAppearance();
  const params = useLocalSearchParams<{
    email?: string;
    registered?: string;
    role?: string;
    redirect?: string;
    technicianId?: string;
  }>();
  const { configurationReady, loading: sessionLoading, user } = useAuth();
  const initialEmail = typeof params.email === 'string' ? params.email.trim() : '';
  const [emailInput, setEmailInput] = useState<string | null>(null);
  const email = emailInput ?? initialEmail;
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);

  const safeRedirect = resolveSafeRedirect(params.redirect, params.technicianId);

  useEffect(() => {
    if (!sessionLoading && user && params.registered !== '1') {
      if (safeRedirect) {
        router.replace(safeRedirect as never);
        return;
      }
      router.replace('/');
    }
  }, [params.registered, safeRedirect, sessionLoading, user]);

  const submit = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError(t('auth.required'));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(t('auth.emailInvalid'));
      return;
    }
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      if (!supabase) {
        const previewRole = params.role === 'technician' ? 'technician' : 'customer';
        signInPreviewAccount(cleanEmail, previewRole);
        if (safeRedirect) {
          router.replace(safeRedirect as never);
          return;
        }
        router.replace('/');
        return;
      }

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (authError) {
        setError(
          t(isAuthServiceUnavailable(authError) ? 'auth.serviceUnavailable' : 'auth.loginFailed'),
        );
        return;
      }

      if (safeRedirect) {
        router.replace(safeRedirect as never);
        return;
      }
      router.replace('/');
    } catch {
      setError(t('auth.serviceUnavailable'));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  return (
    <AuthShell title={t('auth.loginTitle')} subtitle={t('auth.loginSubtitle')}>
      {!configurationReady && <AuthNotice tone="error">{t('auth.configuration')}</AuthNotice>}

      {safeRedirect ? (
        <View testID="login-booking-redirect-notice">
          <AuthNotice tone="success">
            {language === 'en'
              ? 'Please sign in to continue booking your selected technician.'
              : 'Silakan masuk ke akun Anda untuk melanjutkan pemesanan teknisi pilihan Anda.'}
          </AuthNotice>
        </View>
      ) : null}

      {params.registered === '1' && (
        <AuthNotice tone="success">
          {language === 'en'
            ? `Account registered for ${email || 'your email'}. Please sign in below (check your email inbox if verification is enabled).`
            : `Akun berhasil didaftarkan untuk ${email || 'email Anda'}. Silakan masuk di bawah ini (periksa kotak masuk email jika konfirmasi diaktifkan).`}
        </AuthNotice>
      )}

      {error ? <AuthNotice tone="error">{error}</AuthNotice> : null}

      {/* Input Fields */}
      <AuthField
        label={t('auth.email')}
        value={email}
        onChangeText={setEmailInput}
        testID="login-email"
        email
        autoComplete="email"
        placeholder={language === 'en' ? 'name@example.com' : 'nama@contoh.com'}
        icon={<Mail size={ICON_SIZE} strokeWidth={ICON_STROKE} color={palette.textSecondary} />}
      />

      <AuthField
        label={t('auth.password')}
        value={password}
        onChangeText={setPassword}
        testID="login-password"
        password
        autoComplete="password"
        placeholder={language === 'en' ? 'Enter your password' : 'Masukkan kata sandi'}
        icon={<Lock size={ICON_SIZE} strokeWidth={ICON_STROKE} color={palette.textSecondary} />}
      />

      <AuthLink
        label={t('auth.forgot')}
        onPress={() => router.push('/forgot-password')}
        testID="forgot-password-link"
        variant="forgot"
      />

      <AuthSubmit
        label={t('auth.submitLogin')}
        loading={busy}
        onPress={() => {
          void submit();
        }}
        testID="login-submit"
      />

      <AuthLink
        label={t('auth.noAccount')}
        onPress={() =>
          router.push({
            pathname: '/register',
            params: {
              ...(params.redirect ? { redirect: params.redirect } : {}),
              ...(params.technicianId ? { technicianId: params.technicianId } : {}),
            },
          })
        }
        testID="register-link"
        variant="center"
      />
    </AuthShell>
  );
}
