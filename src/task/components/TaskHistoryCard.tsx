import { router } from 'expo-router';
import { CheckCircle2, ChevronRight, LayoutGrid, XCircle } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppearance } from '../../context/AppearanceContext';
import { localizeArea, useLanguage } from '../../i18n/locale';
import { font } from '../../theme/typography';
import type { BookingRecord } from '../../types/marketplace';
import { formatRelativeTime } from '../../utils/relativeTime';

export interface TaskHistoryCardProps {
  task?: BookingRecord;
  job?: BookingRecord;
}
export type JobHistoryCardProps = TaskHistoryCardProps;

const CANCELLED_STATUSES: BookingRecord['status'][] = ['cancelled', 'declined'];

export function TaskHistoryCard({ task, job }: TaskHistoryCardProps) {
  const item = task ?? job;
  const { language } = useLanguage();
  const { palette, isDark } = useAppearance();

  if (!item) return null;

  const cancelled = CANCELLED_STATUSES.includes(item.status);
  const areaLabel = localizeArea(item.serviceArea, language);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.serviceNameSnapshot} · ${item.customerName}`}
      onPress={() =>
        router.push({
          pathname: '/booking/[id]' as never,
          params: { id: item.id },
        })
      }
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: palette.background,
          borderBottomColor: palette.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
      testID={`history-job-card-${item.id}`}
    >
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: cancelled
              ? 'rgba(148, 163, 184, 0.15)'
              : 'rgba(16, 185, 129, 0.15)',
          },
        ]}
      >
        {item.status === 'completed' ? (
          <CheckCircle2 size={20} color="#10B981" strokeWidth={1.8} />
        ) : cancelled ? (
          <XCircle size={20} color="#94A3B8" strokeWidth={1.8} />
        ) : (
          <LayoutGrid size={20} color="#94A3B8" strokeWidth={1.8} />
        )}
      </View>

      <View style={styles.meta}>
        <Text
          numberOfLines={1}
          style={[styles.title, { color: palette.text }]}
        >
          {item.serviceNameSnapshot}
        </Text>
        <Text
          numberOfLines={1}
          style={[styles.subtitle, { color: isDark ? '#94A3B8' : palette.textMuted }]}
        >
          {item.customerName} · {areaLabel}
        </Text>
      </View>

      <Text style={[styles.time, { color: isDark ? '#94A3B8' : palette.textMuted }]}>
        {formatRelativeTime(item.updatedAt || item.createdAt, language)}
      </Text>
      <ChevronRight size={17} color={isDark ? '#94A3B8' : palette.textMuted} strokeWidth={1.8} />
    </Pressable>
  );
}

export const JobHistoryCard = TaskHistoryCard;

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 2,
    paddingVertical: 12,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  meta: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  subtitle: {
    fontSize: font.label,
    fontWeight: '500',
  },
  time: {
    fontSize: font.caption,
    fontWeight: '600',
  },
});
