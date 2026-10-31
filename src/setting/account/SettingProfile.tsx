import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ProfileAvatar } from '../../profile';
import { useLanguage } from '../../i18n/locale';
import { colors, radii, spacing } from '../../theme/tokens';
import type { Technician } from '../../types/marketplace';
import { SettingSection } from '../components/SettingSection';

export interface SettingProfileProps {
  displayName: string;
  avatarUri: string;
  onChangeDisplayName: (value: string) => void;
  onChangeAvatarUri: (value: string) => void;
  onSavePublicProfile: () => Promise<void>;
  profileFeedback?: string | null;
  isTechnicianRole: boolean;
  techProfile: Technician | null;
  onSaveTechProfile: (next: Technician) => Promise<void>;
  techFeedback?: string | null;
}

export function SettingProfile({
  displayName,
  avatarUri,
  onChangeDisplayName,
  onChangeAvatarUri,
  onSavePublicProfile,
  profileFeedback,
}: SettingProfileProps) {
  const { language, t } = useLanguage();

  return (
    <SettingSection
      eyebrow={language === 'en' ? 'PUBLIC PROFILE' : 'PROFIL PUBLIK'}
      title={language === 'en' ? 'Public Profile & Photo' : 'Profil Publik & Foto'}
      description={
        language === 'en'
          ? 'Manage your public display name and verified profile photo. Private email and phone number are never shown on your profile.'
          : 'Kelola nama tampilan dan foto profil terverifikasi. Email dan nomor telepon pribadi tidak pernah ditampilkan di profil publik.'
      }
      testID="setting-section-profile"
    >
      <View style={styles.avatarCenteredWrap}>
        <ProfileAvatar
          uri={avatarUri}
          name={displayName}
          size={88}
          editable={true}
          onImageSelected={onChangeAvatarUri}
          testID="profile-avatar"
        />
        <Text style={styles.avatarTapHint}>
          {language === 'en' ? 'Tap photo to change' : 'Ketuk foto untuk mengubah'}
        </Text>
      </View>

      <Text style={styles.fieldLabel}>{t('auth.name')}</Text>
      <TextInput
        onChangeText={onChangeDisplayName}
        placeholder={t('auth.name')}
        style={styles.input}
        testID="settings-display-name"
        value={displayName}
      />

      <Pressable
        accessibilityRole="button"
        onPress={() => {
          void onSavePublicProfile();
        }}
        style={styles.primaryActionBtn}
        testID="save-personal-info"
      >
        <Text style={styles.primaryActionBtnText}>{t('settings.saveProfile')}</Text>
      </Pressable>

      {profileFeedback ? (
        <Text style={styles.feedbackText} testID="profile-saved-feedback">
          {profileFeedback}
        </Text>
      ) : null}

      <View style={styles.privacyGuaranteePill} testID="profile-privacy-guarantee">
        <Text style={styles.privacyGuaranteeText}>
          {language === 'en'
            ? 'Privacy Protected: Your email address and phone number are strictly hidden from all public profiles.'
            : 'Privasi Terlindungi: Alamat email dan nomor telepon Anda disembunyikan sepenuhnya dari profil publik.'}
        </Text>
      </View>
    </SettingSection>
  );
}

const styles = StyleSheet.create({
  avatarCenteredWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarTapHint: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
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
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 13,
    marginBottom: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  primaryActionBtn: {
    alignItems: 'center',
    backgroundColor: colors.greenDark,
    borderRadius: radii.pill,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.xl,
  },
  primaryActionBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  secondaryActionBtn: {
    alignItems: 'center',
    backgroundColor: colors.greenSoft,
    borderColor: colors.green,
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
    marginBottom: spacing.sm,
    minHeight: 40,
    paddingHorizontal: spacing.lg,
  },
  secondaryActionBtnText: { color: colors.greenDark, fontSize: 12, fontWeight: '800' },
  feedbackText: { color: colors.greenDark, fontSize: 12, fontWeight: '700', marginTop: spacing.sm },
  privacyGuaranteePill: {
    backgroundColor: colors.greenSoft,
    borderRadius: radii.md,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  privacyGuaranteeText: { color: colors.greenDark, fontSize: 11, fontWeight: '700', lineHeight: 16 },
  techBlock: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
  },
  subHeading: { color: colors.ink, fontSize: 15, fontWeight: '800', marginBottom: spacing.xs },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  chip: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipActive: { backgroundColor: colors.greenSoft, borderColor: colors.green },
  chipText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: colors.greenDark, fontWeight: '800' },
  inlineAddRow: { flexDirection: 'row', gap: spacing.xs },
  flexInput: { flex: 1 },
  priceInput: { width: 120 },
});
