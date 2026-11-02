import { router, useLocalSearchParams } from 'expo-router';
import { Check, Lock, Mail, User, Wrench } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { signInPreviewAccount, useAuth } from '../auth/AuthProvider';
import { getEmailVerificationRedirectUrl } from '../auth/deepLinking';
import { isAuthServiceUnavailable } from '../auth/errors';
import { ensureTechnicianApplicationRow } from '../auth/technicianApplication';
import { AuthField, AuthLink, AuthNotice, AuthShell, AuthSubmit } from '../components/auth-ui';
import { useAppearance } from '../context/AppearanceContext';
import { supabase } from '../data/marketplaceRepository';
import { useLanguage } from '../i18n/locale';

type AccountType = 'customer' | 'technician';

export default function RegisterScreen() {
  const { language, t } = useLanguage();
  const { palette } = useAppearance();
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

    const cleanEmail = email.trim().toLowerCase();

    if (!supabase) {
      signInPreviewAccount(cleanEmail, accountType);
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
      const { data, error: signupError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: getEmailVerificationRedirectUrl(),
          data: {
            display_name: displayName.trim(),
            requested_account_type: accountType,
            role: accountType,
          },
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

      // Automatically set the technician role in database tables
      if (accountType === 'technician') {
        await ensureTechnicianApplicationRow(supabase, data.user);
        if (data.session) {
          try {
            await supabase.from('user_roles').insert({
              user_id: data.user.id,
              role: 'technician',
            });
          } catch {}
          try {
            await supabase.from('technician_profiles').insert({
              user_id: data.user.id,
              business_name: displayName.trim(),
              is_verified: false,
              is_available: true,
            });
          } catch {}
        }
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

      {/* Role Selector */}
      <View style={styles.roleSelectorSection}>
        <Text style={[styles.roleSectionLabel, { color: palette.textSecondary }]}>
          {t('auth.chooseRole').toUpperCase()}
        </Text>

        <View style={styles.roleCardsRow}>
          {(['customer', 'technician'] as const).map((role) => {
            const selected = accountType === role;
            const isCust = role === 'customer';
            const roleSubtitle = isCust
              ? language === 'en'
                ? 'Find & book trusted repairmen'
                : 'Cari & pesan teknisi perbaikan'
              : language === 'en'
                ? 'Offer your repair services'
                : 'Tawarkan jasa servis perbaikan';

            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                key={role}
                onPress={() => setAccountType(role)}
                style={[
                  styles.roleCard,
                  {
                    backgroundColor: selected ? 'rgba(16, 185, 129, 0.05)' : palette.surface,
                    borderColor: selected ? palette.primary : palette.border,
                  },
                ]}
                testID={`role-${role}`}
              >
                {isCust ? (
                  <User size={24} color={selected ? palette.primary : palette.textSecondary} />
                ) : (
                  <Wrench size={24} color={selected ? palette.primary : palette.textSecondary} />
                )}
                <Text style={[styles.roleCardTitle, { color: palette.text }]}>
                  {roleLabels[role]}
                </Text>
                <Text style={[styles.roleCardSubtitle, { color: palette.textSecondary }]}>
                  {roleSubtitle}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {accountType === 'technician' && (
          <Text style={[styles.roleHintText, { color: palette.textSecondary }]}>
            {t('auth.roleHint')}
          </Text>
        )}
      </View>

      {/* Form fields (same style as sign in) */}
      <AuthField
        label={t('auth.name')}
        value={displayName}
        onChangeText={setDisplayName}
        error={fieldErrors.displayName}
        testID="register-name"
        autoComplete="name"
        placeholder={language === 'en' ? 'e.g. Budi Santoso' : 'cth. Budi Santoso'}
        icon={<User size={20} color={palette.textSecondary} />}
      />

      <AuthField
        label={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        error={fieldErrors.email}
        testID="register-email"
        email
        autoComplete="email"
        placeholder={language === 'en' ? 'name@example.com' : 'nama@contoh.com'}
        icon={<Mail size={20} color={palette.textSecondary} />}
      />

      <AuthField
        label={t('auth.password')}
        value={password}
        onChangeText={setPassword}
        error={fieldErrors.password}
        testID="register-password"
        password
        autoComplete="new-password"
        placeholder={language === 'en' ? 'Minimum 8 characters' : 'Minimal 8 karakter'}
        icon={<Lock size={20} color={palette.textSecondary} />}
      />

      <AuthField
        label={t('auth.confirmPassword')}
        value={confirmation}
        onChangeText={setConfirmation}
        error={fieldErrors.confirmation}
        testID="register-confirm-password"
        password
        autoComplete="new-password"
        placeholder={language === 'en' ? 'Re-enter your password' : 'Ketik ulang kata sandi'}
        icon={<Lock size={20} color={palette.textSecondary} />}
      />

      {/* Password requirements text */}
      <Text style={[styles.passwordRequirementsText, { color: palette.textSecondary }]}>
        {t('auth.passwordRule')}
      </Text>

      {/* Terms checkbox */}
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: accepted }}
        onPress={() => setAccepted((value) => !value)}
        style={styles.termsContainer}
        testID="accept-terms"
      >
        <View
          style={[
            styles.customCheckbox,
            {
              backgroundColor: accepted ? palette.primary : 'transparent',
              borderColor: accepted ? palette.primary : palette.border,
            },
          ]}
        >
          {accepted ? <Check size={16} color="#FFFFFF" strokeWidth={3} /> : null}
        </View>
        <Text style={[styles.termsLabel, { color: palette.text }]}>
          {language === 'en' ? (
            <>
              I agree to Cepat’s{' '}
              <Text style={{ color: palette.primary, fontWeight: '600' }}>terms of service</Text> and{' '}
              <Text style={{ color: palette.primary, fontWeight: '600' }}>privacy policy</Text>.
            </>
          ) : (
            <>
              Saya menyetujui{' '}
              <Text style={{ color: palette.primary, fontWeight: '600' }}>syarat layanan</Text> dan{' '}
              <Text style={{ color: palette.primary, fontWeight: '600' }}>kebijakan privasi</Text> Cepat.
            </>
          )}
        </Text>
      </Pressable>

      {fieldErrors.accepted ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.termsError, { color: palette.danger }]}
        >
          {fieldErrors.accepted}
        </Text>
      ) : null}

      {/* Create account button */}
      <AuthSubmit
        label={t('auth.submitRegister')}
        loading={busy}
        onPress={() => {
          void submit();
        }}
        testID="register-submit"
      />

      {/* Already have an account? Sign in link */}
      <AuthLink
        label={t('auth.haveAccount')}
        onPress={() =>
          router.push({
            pathname: '/login',
            params: {
              role: accountType,
              ...(params.redirect ? { redirect: params.redirect } : {}),
              ...(params.technicianId ? { technicianId: params.technicianId } : {}),
            },
          })
        }
        testID="login-link"
        variant="center"
      />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  roleSelectorSection: {
    marginBottom: 20,
  },
  roleSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  roleCardsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  roleCard: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 2,
    flex: 1,
    padding: 16,
  },
  roleCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
  },
  roleCardSubtitle: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 16,
  },
  roleHintText: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 10,
  },
  passwordRequirementsText: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  termsContainer: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    marginBottom: 24,
  },
  customCheckbox: {
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 2,
    height: 24,
    justifyContent: 'center',
    marginTop: 1,
    width: 24,
  },
  termsLabel: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    marginLeft: 12,
  },
  termsError: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: -16,
    marginBottom: 16,
  },
});
