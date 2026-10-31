import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { signInPreviewAccount, useAuth } from '../auth/AuthProvider';
import { isAuthServiceUnavailable } from '../auth/errors';
import { deriveMetadataRoles } from '../auth/technicianApplication';
import { AuthField, AuthLink, AuthNotice, AuthShell, AuthSubmit } from '../components/auth-ui';
import { supabase } from '../data/marketplaceRepository';
import { useLanguage } from '../i18n/locale';

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
  const params = useLocalSearchParams<{
    email?: string;
    registered?: string;
    role?: string;
    redirect?: string;
    technicianId?: string;
  }>();
  const { configurationReady, loading: sessionLoading, user, effectiveRole } = useAuth();
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
      if (effectiveRole === 'admin') router.replace('/admin');
      else if (effectiveRole === 'technician') router.replace('/technician-dashboard');
      else router.replace('/account');
    }
  }, [effectiveRole, params.registered, safeRedirect, sessionLoading, user]);

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
        const signedIn = signInPreviewAccount(cleanEmail, previewRole);
        if (safeRedirect) {
          router.replace(safeRedirect as never);
          return;
        }
        const metaRoles = deriveMetadataRoles(signedIn);
        if (metaRoles.includes('technician')) {
          router.replace('/technician-dashboard');
          return;
        }
        router.replace('/account');
        return;
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({
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
      const signedInUser = data?.user;
      if (signedInUser) {
        const metaRoles = deriveMetadataRoles(signedInUser);
        if (metaRoles.includes('technician')) {
          router.replace('/technician-dashboard');
          return;
        }
      }
      router.replace('/account');
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
      <AuthField
        label={t('auth.email')}
        value={email}
        onChangeText={setEmailInput}
        testID="login-email"
        email
        autoComplete="email"
      />
      <AuthField
        label={t('auth.password')}
        value={password}
        onChangeText={setPassword}
        testID="login-password"
        password
        autoComplete="password"
      />
      <View>
        <AuthLink
          label={t('auth.forgot')}
          onPress={() => router.push('/forgot-password')}
          testID="forgot-password-link"
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
        />
      </View>
    </AuthShell>
  );
}
