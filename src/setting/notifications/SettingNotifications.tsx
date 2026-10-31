import { StyleSheet, Text } from 'react-native';

import { useLanguage } from '../../i18n/locale';
import { colors, spacing } from '../../theme/tokens';
import type { UserPreferences } from '../../types/marketplace';
import { SettingItem } from '../components/SettingItem';
import { SettingSection } from '../components/SettingSection';

export interface SettingNotificationsProps {
  preferences: UserPreferences;
  onUpdateNotifications: (next: UserPreferences['notifications']) => void;
  feedback?: string | null;
}

export function SettingNotifications({
  preferences,
  onUpdateNotifications,
  feedback,
}: SettingNotificationsProps) {
  const { language, t } = useLanguage();

  const items: {
    key: keyof UserPreferences['notifications'];
    label: string;
    description: string;
  }[] = [
    {
      key: 'push',
      label: language === 'en' ? 'Push notifications' : 'Notifikasi perangkat (Push)',
      description:
        language === 'en'
          ? 'Receive instant device alerts for service activity.'
          : 'Terima peringatan instan di perangkat untuk aktivitas layanan.',
    },
    {
      key: 'booking',
      label: language === 'en' ? 'Booking status updates' : 'Pembaruan status pesanan',
      description:
        language === 'en'
          ? 'Get notified when a technician accepts, proposes a time, or completes a job.'
          : 'Beritahu saat teknisi menerima, mengajukan jadwal, atau menyelesaikan pekerjaan.',
    },
    {
      key: 'messages',
      label: language === 'en' ? 'Chat message alerts' : 'Pesan koordinasi kerja',
      description:
        language === 'en'
          ? 'Alerts for new messages in active booking conversations.'
          : 'Peringatan untuk pesan baru pada percakapan pesanan aktif.',
    },
  ];

  return (
    <SettingSection
      eyebrow={language === 'en' ? 'NOTIFICATIONS' : 'NOTIFIKASI'}
      title={t('settings.notificationsTitle')}
      description={
        language === 'en'
          ? 'Control how Cepat notifies you about bookings and messages.'
          : 'Atur cara Cepat memberi tahu kamu tentang pesanan dan pesan.'
      }
      testID="setting-section-notifications"
    >
      {items.map((item) => (
        <SettingItem
          key={item.key}
          accessibilityRole="switch"
          active={preferences.notifications[item.key]}
          description={item.description}
          label={item.label}
          onPress={() =>
            onUpdateNotifications({
              ...preferences.notifications,
              [item.key]: !preferences.notifications[item.key],
            })
          }
          testID={`pref-notif-${item.key}`}
        />
      ))}
      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
    </SettingSection>
  );
}

const styles = StyleSheet.create({
  feedback: {
    color: colors.greenDark,
    fontSize: 12,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
});
