import { router } from 'expo-router';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react-native';
import { useState } from 'react';
import type { PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppearance } from '../context/AppearanceContext';
import { useLanguage } from '../i18n/locale';

export function AuthShell({
  title,
  subtitle,
  children,
  onBack,
}: PropsWithChildren<{ title: string; subtitle: string; onBack?: () => void }>) {
  const { t } = useLanguage();
  const { palette } = useAppearance();
  const handleBack = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')));

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
      {/* 1. Header: 16px horizontal, 12px vertical, centered logo */}
      <View style={[styles.header, { backgroundColor: palette.background }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('auth.back')}
          onPress={handleBack}
          style={[styles.backBtn, { backgroundColor: palette.surface }]}
          testID="auth-back-button"
        >
          <ArrowLeft size={20} color={palette.text} />
        </Pressable>

        <View style={styles.centerLogo}>
          <View style={[styles.logoIcon, { backgroundColor: palette.primary }]}>
            <Text style={styles.logoIconText}>C</Text>
          </View>
          <Text style={[styles.logoText, { color: palette.text }]}>cepat</Text>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            {/* Title & Subtitle directly on screen background */}
            <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
            <Text style={[styles.subtitle, { color: palette.textSecondary }]}>{subtitle}</Text>

            {/* Direct Form on Background (No gray card background) */}
            <View style={styles.formContainer}>
              {children}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function AuthField({
  label,
  value,
  onChangeText,
  error,
  testID,
  email,
  password,
  autoComplete,
  icon,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  testID: string;
  email?: boolean;
  password?: boolean;
  autoComplete?: 'email' | 'name' | 'password' | 'new-password';
  icon?: ReactNode;
  placeholder?: string;
}) {
  const { t } = useLanguage();
  const { palette } = useAppearance();
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: palette.surface,
            borderColor: error ? palette.danger : focused ? palette.primary : palette.border,
          },
        ]}
      >
        {icon ? <View style={styles.inputLeftIcon}>{icon}</View> : null}
        <TextInput
          accessibilityLabel={label}
          autoCapitalize={email ? 'none' : password ? 'none' : 'words'}
          autoComplete={autoComplete}
          autoCorrect={false}
          keyboardType={email ? 'email-address' : 'default'}
          onBlur={() => setFocused(false)}
          onFocus={() => setFocused(true)}
          onChangeText={onChangeText}
          secureTextEntry={Boolean(password && !visible)}
          placeholder={placeholder}
          placeholderTextColor={palette.textSecondary}
          style={[styles.textInput, { color: palette.text }]}
          testID={testID}
          textContentType={email ? 'emailAddress' : password ? 'password' : 'name'}
          value={value}
        />
        {password && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? t('auth.hide') : t('auth.show')}
            onPress={() => setVisible((current) => !current)}
            style={styles.eyeBtn}
            hitSlop={8}
          >
            {visible ? (
              <EyeOff size={20} color={palette.textSecondary} />
            ) : (
              <Eye size={20} color={palette.textSecondary} />
            )}
          </Pressable>
        )}
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={[styles.error, { color: palette.danger }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function AuthSubmit({
  label,
  loading,
  onPress,
  testID,
}: {
  label: string;
  loading: boolean;
  onPress: () => void;
  testID: string;
}) {
  const { palette } = useAppearance();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: loading, busy: loading }}
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.submitBtn,
        { backgroundColor: palette.primary, opacity: pressed ? 0.9 : 1 },
        loading && styles.submitDisabled,
      ]}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text style={styles.submitBtnText}>{label}</Text>
      )}
    </Pressable>
  );
}

export function AuthLink({
  label,
  onPress,
  testID,
  variant = 'center',
}: {
  label: string;
  onPress: () => void;
  testID: string;
  variant?: 'center' | 'forgot';
}) {
  const { palette } = useAppearance();
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      style={variant === 'forgot' ? styles.forgotLinkPressable : styles.centerLinkPressable}
      testID={testID}
    >
      <Text
        style={[
          styles.linkText,
          { color: palette.primary },
          variant === 'forgot' ? styles.forgotLinkText : styles.centerLinkText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function AuthNotice({
  children,
  tone = 'info',
}: PropsWithChildren<{ tone?: 'info' | 'error' | 'success' }>) {
  const { palette } = useAppearance();
  const backgroundColor =
    tone === 'error' ? `${palette.danger}18` : tone === 'success' ? palette.primarySoft : palette.surface;
  const borderColor = tone === 'error' ? palette.danger : tone === 'success' ? palette.primary : palette.border;
  const color = tone === 'error' ? palette.danger : palette.text;

  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.notice, { backgroundColor, borderColor }]}
    >
      <Text style={[styles.noticeText, { color }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '100%',
  },
  backBtn: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    padding: 8,
    width: 40,
  },
  centerLogo: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  logoIcon: {
    alignItems: 'center',
    borderRadius: 8,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  logoIconText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  logoText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerSpacer: {
    width: 40,
  },
  keyboardView: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  container: {
    alignSelf: 'center',
    maxWidth: 480,
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 24,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  formContainer: {
    width: '100%',
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 12,
    minHeight: 48,
  },
  inputLeftIcon: {
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    backgroundColor: 'transparent',
    flex: 1,
    fontSize: 15,
    minHeight: 46,
    paddingVertical: 10,
  },
  eyeBtn: {
    padding: 8,
  },
  error: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 6,
  },
  submitBtn: {
    alignItems: 'center',
    borderRadius: 12,
    justifyContent: 'center',
    paddingVertical: 16,
    width: '100%',
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  forgotLinkPressable: {
    alignSelf: 'flex-end',
    marginTop: 12,
    marginBottom: 24,
  },
  forgotLinkText: {
    textAlign: 'right',
  },
  centerLinkPressable: {
    alignSelf: 'center',
    marginTop: 16,
    paddingVertical: 6,
  },
  centerLinkText: {
    textAlign: 'center',
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
  },
  notice: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    padding: 12,
  },
  noticeText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
