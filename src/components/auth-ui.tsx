import { router } from 'expo-router';
import { useState } from 'react';
import type { PropsWithChildren } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLanguage } from '../i18n/locale';
import { colors, radii, spacing } from '../theme/tokens';

export function AuthShell({ title, subtitle, children }: PropsWithChildren<{ title: string; subtitle: string }>) {
  const { t } = useLanguage();
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          <Pressable accessibilityRole="button" onPress={() => router.replace('/')} style={styles.back}>
            <Text style={styles.backText}>‹  {t('auth.back')}</Text>
          </Pressable>
          <View style={styles.brandRow}>
            <View style={styles.brandIcon}><Text style={styles.brandIconText}>c</Text></View>
            <Text style={styles.brand}>cepat</Text>
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          <View style={styles.card}>{children}</View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function AuthField({
  label, value, onChangeText, error, testID, email, password, autoComplete,
}: {
  label: string; value: string; onChangeText: (text: string) => void; error?: string;
  testID: string; email?: boolean; password?: boolean;
  autoComplete?: 'email' | 'name' | 'password' | 'new-password';
}) {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          accessibilityLabel={label}
          autoCapitalize={email ? 'none' : password ? 'none' : 'words'}
          autoComplete={autoComplete}
          autoCorrect={false}
          keyboardType={email ? 'email-address' : 'default'}
          onChangeText={onChangeText}
          secureTextEntry={Boolean(password && !visible)}
          style={styles.input}
          testID={testID}
          textContentType={email ? 'emailAddress' : password ? 'password' : 'name'}
          value={value}
        />
        {password && (
          <Pressable accessibilityRole="button" accessibilityLabel={visible ? t('auth.hide') : t('auth.show')} onPress={() => setVisible((current) => !current)} hitSlop={8}>
            <Text style={styles.toggle}>{visible ? t('auth.hide') : t('auth.show')}</Text>
          </Pressable>
        )}
      </View>
      {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function AuthSubmit({ label, loading, onPress, testID }: { label: string; loading: boolean; onPress: () => void; testID: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: loading, busy: loading }} disabled={loading} onPress={onPress} style={[styles.submit, loading && styles.submitDisabled]} testID={testID}>
      {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>{label}</Text>}
    </Pressable>
  );
}

export function AuthLink({ label, onPress, testID }: { label: string; onPress: () => void; testID: string }) {
  return <Pressable accessibilityRole="link" onPress={onPress} style={styles.link} testID={testID}><Text style={styles.linkText}>{label}</Text></Pressable>;
}

export function AuthNotice({ children, tone = 'info' }: PropsWithChildren<{ tone?: 'info' | 'error' | 'success' }>) {
  return <View accessibilityLiveRegion="polite" style={[styles.notice, tone === 'error' && styles.noticeError, tone === 'success' && styles.noticeSuccess]}><Text style={styles.noticeText}>{children}</Text></View>;
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.paper, flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  container: { alignSelf: 'center', maxWidth: 460, width: '100%' },
  back: { alignSelf: 'flex-start', marginBottom: spacing.xl, minHeight: 40, justifyContent: 'center' },
  backText: { color: colors.greenDark, fontSize: 14, fontWeight: '700' },
  brandRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  brandIcon: { alignItems: 'center', backgroundColor: colors.green, borderRadius: 12, height: 34, justifyContent: 'center', width: 34 },
  brandIconText: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  brand: { color: colors.ink, fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  title: { color: colors.ink, fontSize: 29, fontWeight: '800', letterSpacing: -0.7 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: spacing.sm, marginBottom: spacing.xl },
  card: { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radii.lg, borderWidth: 1, padding: spacing.xl },
  field: { marginBottom: spacing.lg },
  label: { color: colors.ink, fontSize: 13, fontWeight: '700', marginBottom: spacing.sm },
  inputWrap: { alignItems: 'center', borderColor: colors.line, borderRadius: radii.md, borderWidth: 1, flexDirection: 'row', minHeight: 52, paddingHorizontal: spacing.md },
  input: { color: colors.ink, flex: 1, fontSize: 15, minHeight: 50, paddingVertical: spacing.sm },
  toggle: { color: colors.greenDark, fontSize: 12, fontWeight: '700', padding: spacing.sm },
  error: { color: colors.danger, fontSize: 12, lineHeight: 17, marginTop: spacing.xs },
  submit: { alignItems: 'center', backgroundColor: colors.green, borderRadius: radii.md, justifyContent: 'center', marginTop: spacing.sm, minHeight: 54 },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  link: { alignSelf: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  linkText: { color: colors.greenDark, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  notice: { backgroundColor: colors.greenSoft, borderRadius: radii.md, marginBottom: spacing.lg, padding: spacing.md },
  noticeError: { backgroundColor: '#FBEDEA' },
  noticeSuccess: { backgroundColor: colors.greenSoft },
  noticeText: { color: colors.ink, fontSize: 13, lineHeight: 19 },
});
