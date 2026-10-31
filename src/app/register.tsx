import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useAuth } from '../auth/AuthProvider';
import { getEmailVerificationRedirectUrl } from '../auth/deepLinking';
import { isAuthServiceUnavailable } from '../auth/errors';
import { ensureTechnicianApplicationRow } from '../auth/technicianApplication';
import { AuthField, AuthLink, AuthNotice, AuthShell, AuthSubmit } from '../components/auth-ui';
import { supabase } from '../data/marketplaceRepository';
import { useLanguage } from '../i18n/locale';
import { colors, spacing } from '../theme/tokens';

type AccountType = 'customer' | 'technician';

export default function RegisterScreen() {
  const { t } = useLanguage();
  const params = useLocalSearchParams<{ redirect?: string; technicianId?: string }>();
  const { configurationReady } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('customer');
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const submitting = useRef(false);

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!displayName.trim()) errors.displayName = t('auth.required');
    else if (displayName.trim().length > 80) errors.displayName = t('auth.nameTooLong');
    if (!email.trim()) errors.email = t('auth.required');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = t('auth.emailInvalid');
    if (!password) errors.password = t('auth.required');
    else if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password))
      errors.password = t('auth.passwordRule');
    if (!confirmation) errors.confirmation = t('auth.required');
    else if (password !== confirmation) errors.confirmation = t('auth.passwordMismatch');
    if (!accepted) errors.accepted = t('auth.acceptTerms');
    return errors;
  };

  const submit = async () => {
    setError('');
    setNotice('');
    const validation = validate();
    setFieldErrors(validation);
    if (Object.keys(validation).length) return;
    if (!supabase) {
      const cleanEmail = email.trim().toLowerCase();
      router.replace({
        pathname: '/login',
        params: {
          email: cleanEmail,
          registered: '1',
          role: accountType,
          ...(params.redirect ? { redirect: params.redirect } : {}),
          ...(params.technicianId ? { technicianId: params.technicianId } : {}),
        },
      });
      return;
    }
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const { data, error: signupError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: getEmailVerificationRedirectUrl(),
          data: { display_name: displayName.trim(), requested_account_type: accountType },
        },
      });
      if (signupError) {
        setError(
          t(isAuthServiceUnavailable(signupError) ? 'auth.serviceUnavailable' : 'auth.registerFailed'),
        );
        return;
      }
      if (!data.user) {
        setError(t('auth.registerFailed'));
        return;
      }
      if (data.session && accountType === 'technician') {
        await ensureTechnicianApplicationRow(supabase, data.user);
      }
      setNotice(
        !data.session
          ? t('auth.emailConfirmation')
          : accountType === 'technician'
            ? t('auth.applicationPending')
            : t('auth.registered'),
      );
      router.replace({
        pathname: '/login',
        params: {
          email: cleanEmail,
          registered: '1',
          role: accountType,
          ...(params.redirect ? { redirect: params.redirect } : {}),
          ...(params.technicianId ? { technicianId: params.technicianId } : {}),
        },
      });
    } catch {
      setError(t('auth.serviceUnavailable'));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  const roleLabels: Record<AccountType, string> = {
    customer: t('auth.customer'),
    technician: t('auth.technician'),
  };

  return (
    <AuthShell title={t('auth.registerTitle')} subtitle={t('auth.registerSubtitle')}>
      {!configurationReady && <AuthNotice tone="error">{t('auth.configuration')}</AuthNotice>}
      {error ? <AuthNotice tone="error">{error}</AuthNotice> : null}
      {notice ? <AuthNotice tone="success">{notice}</AuthNotice> : null}
      <AuthField
        label={t('auth.name')}
        value={displayName}
        onChangeText={setDisplayName}
        error={fieldErrors.displayName}
        testID="register-name"
        autoComplete="name"
      />
      <AuthField
        label={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        error={fieldErrors.email}
        testID="register-email"
        email
        autoComplete="email"
      />
      <AuthField
        label={t('auth.password')}
        value={password}
        onChangeText={setPassword}
        error={fieldErrors.password}
        testID="register-password"
        password
        autoComplete="new-password"
      />
      <AuthField
        label={t('auth.confirmPassword')}
        value={confirmation}
        onChangeText={setConfirmation}
        error={fieldErrors.confirmation}
        testID="register-confirm-password"
        password
        autoComplete="new-password"
      />
      <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18, marginBottom: spacing.lg }}>
        {t('auth.passwordRule')}
      </Text>
      <Text style={{ color: colors.ink, fontSize: 13, fontWeight: '700', marginBottom: spacing.sm }}>
        {t('auth.chooseRole')}
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
        {(['customer', 'technician'] as const).map((role) => {
          const selected = accountType === role;
          const roleSubtitle =
            role === 'customer'
              ? t('auth.customer') === 'Pelanggan'
                ? 'Cari & pesan teknisi perbaikan'
                : 'Find & book trusted repairmen'
              : t('auth.technician') === 'Teknisi'
                ? 'Tawarkan jasa servis perbaikan'
                : 'Offer your repair services';
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              key={role}
              onPress={() => setAccountType(role)}
              style={{
                alignItems: 'center',
                backgroundColor: selected ? colors.greenSoft : '#FFFFFF',
                borderColor: selected ? colors.green : colors.line,
                borderRadius: 14,
                borderWidth: 1,
                flex: 1,
                justifyContent: 'center',
                minHeight: 56,
                paddingHorizontal: 8,
                paddingVertical: 8,
              }}
              testID={`role-${role}`}
            >
              <Text style={{ color: colors.ink, fontSize: 13, fontWeight: '800' }}>
                {roleLabels[role]}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 10, marginTop: 2, textAlign: 'center' }}>
                {roleSubtitle}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18, marginBottom: spacing.md }}>
        {t('auth.roleHint')}
      </Text>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: accepted }}
        onPress={() => setAccepted((value) => !value)}
        style={{
          alignItems: 'flex-start',
          flexDirection: 'row',
          gap: spacing.sm,
          marginBottom: spacing.md,
          minHeight: 44,
          paddingVertical: spacing.xs,
        }}
        testID="accept-terms"
      >
        <View
          style={{
            alignItems: 'center',
            borderColor: accepted ? colors.green : colors.line,
            borderRadius: 5,
            borderWidth: 1.5,
            height: 20,
            justifyContent: 'center',
            marginTop: 1,
            width: 20,
          }}
        >
          {accepted ? (
            <Text style={{ color: colors.greenDark, fontSize: 13, fontWeight: '800' }}>✓</Text>
          ) : null}
        </View>
        <Text style={{ color: colors.ink, flex: 1, fontSize: 12, lineHeight: 18 }}>
          {t('auth.terms')}
        </Text>
      </Pressable>
      {fieldErrors.accepted ? (
        <Text
          accessibilityLiveRegion="polite"
          style={{ color: colors.danger, fontSize: 12, lineHeight: 17, marginBottom: spacing.md }}
        >
          {fieldErrors.accepted}
        </Text>
      ) : null}
      <AuthSubmit
        label={t('auth.submitRegister')}
        loading={busy}
        onPress={() => {
          void submit();
        }}
        testID="register-submit"
      />
      <AuthLink
        label={t('auth.haveAccount')}
        onPress={() =>
          router.push({
            pathname: '/login',
            params: {
              ...(params.redirect ? { redirect: params.redirect } : {}),
              ...(params.technicianId ? { technicianId: params.technicianId } : {}),
            },
          })
        }
        testID="login-link"
      />
    </AuthShell>
  );
}
