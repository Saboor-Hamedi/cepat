import { StyleSheet, Text, View } from 'react-native';

import { useLanguage } from '../i18n/locale';
import { font } from '../theme/typography';
import type { BookingRecord } from '../types/marketplace';

type BadgeTone = 'green' | 'amber' | 'slate';

const BADGE_STYLES: Record<BadgeTone, { backgroundColor: string; color: string }> = {
  green: { backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10B981' },
  amber: { backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' },
  slate: { backgroundColor: 'rgba(148, 163, 184, 0.15)', color: '#94A3B8' },
};

export interface BookingStatusBadgeProps {
  booking: BookingRecord;
  testID?: string;
}

export function BookingStatusBadge({ booking, testID }: BookingStatusBadgeProps) {
  const { language, t } = useLanguage();
  const isComplete =
    booking.status === 'completed' || Boolean(booking.workCompletedAt);
  const tone: BadgeTone = isComplete
    ? 'green'
    : booking.status === 'in_progress' || booking.status === 'confirmed'
      ? 'amber'
      : 'slate';
  const label = isComplete
    ? language === 'en'
      ? 'Work Completed'
      : 'Pekerjaan Selesai'
    : t(`booking.status.${booking.status}`);
  const badge = BADGE_STYLES[tone];

  return (
    <View
      style={[styles.badge, { backgroundColor: badge.backgroundColor }]}
      testID={testID}
    >
      <Text numberOfLines={1} style={[styles.badgeText, { color: badge.color }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 5,
    maxWidth: '52%',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: font.caption,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
});
