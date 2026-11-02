import { StyleSheet, Text, View } from 'react-native';

import { useAppearance } from '../../context/AppearanceContext';
import { localizeArea, useLanguage } from '../../i18n/locale';
import { colors, radii, spacing } from '../../theme/tokens';
import type { BookingRecord } from '../../types/marketplace';

export interface TaskHistoryCardProps {
  task?: BookingRecord;
  job?: BookingRecord;
}
export type JobHistoryCardProps = TaskHistoryCardProps;

export function TaskHistoryCard({ task, job }: TaskHistoryCardProps) {
  const item = task ?? job;
  if (!item) return null;

  const { language, t } = useLanguage();
  const { palette } = useAppearance();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: palette.surface, borderColor: palette.border },
      ]}
      testID={`history-job-card-${item.id}`}
    >
      <View style={styles.cardTop}>
        <Text style={[styles.cardTitle, { color: palette.text }]}>
          {item.serviceNameSnapshot}
        </Text>
        <Text style={styles.statusTag}>{t(`booking.status.${item.status}`)}</Text>
      </View>
      <Text style={[styles.cardMeta, { color: palette.textMuted }]}>
        {item.customerName} · {localizeArea(item.serviceArea, language)}
      </Text>
    </View>
  );
}

export const JobHistoryCard = TaskHistoryCard;

const styles = StyleSheet.create({
  card: {
    borderRadius: 5,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  cardTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
  },
  statusTag: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  cardMeta: {
    fontSize: 12,
    marginTop: 2,
  },
});
