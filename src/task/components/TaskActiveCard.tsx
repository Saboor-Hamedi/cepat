import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '../../components/marketplace-ui';
import { useAppearance } from '../../context/AppearanceContext';
import { localizeArea, useLanguage } from '../../i18n/locale';
import { colors, radii, spacing } from '../../theme/tokens';
import type { BookingRecord } from '../../types/marketplace';

export interface TaskActiveCardProps {
  task?: BookingRecord;
  job?: BookingRecord;
  onOpenChat: (id: string) => void;
  onStartTask?: (id: string) => void;
  onStartJob?: (id: string) => void;
  onCompleteTask?: (id: string) => void;
  onCompleteJob?: (id: string) => void;
  onViewCustomer: (task: BookingRecord) => void;
}
export type JobActiveCardProps = TaskActiveCardProps;

export function TaskActiveCard({
  task,
  job,
  onOpenChat,
  onStartTask,
  onStartJob,
  onCompleteTask,
  onCompleteJob,
  onViewCustomer,
}: TaskActiveCardProps) {
  const item = task ?? job;
  if (!item) return null;

  const { language, t } = useLanguage();
  const { palette } = useAppearance();

  const handleStart = () => {
    if (onStartTask) onStartTask(item.id);
    else if (onStartJob) onStartJob(item.id);
  };

  const handleComplete = () => {
    if (onCompleteTask) onCompleteTask(item.id);
    else if (onCompleteJob) onCompleteJob(item.id);
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: palette.surface, borderColor: palette.border },
      ]}
      testID={`upcoming-job-card-${item.id}`}
    >
      <View style={styles.customerHeaderRow}>
        <Avatar name={item.customerName} size={42} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardCustomer, { color: palette.text }]}>
            {item.customerName}
          </Text>
          <Text style={[styles.cardMeta, { color: palette.textMuted }]}>
            {item.requestedStartAt.slice(0, 16).replace('T', ' ')} WIB
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => onViewCustomer(item)}
          style={[styles.customerProfileBtn, { borderColor: palette.border }]}
          testID={`dashboard-view-customer-${item.id}`}
        >
          <Text style={[styles.customerProfileBtnText, { color: palette.text }]}>
            {language === 'en' ? 'Customer Profile' : 'Profil Pelanggan'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.cardTop}>
        <Text style={[styles.cardTitle, { color: palette.text }]}>
          {item.serviceNameSnapshot}
        </Text>
        <Text style={styles.statusTag}>{t(`booking.status.${item.status}`)}</Text>
      </View>
      <Text
        style={[styles.unlockedAddressText, { color: palette.text }]}
        testID={`unlocked-customer-address-${item.id}`}
      >
        {item.customerAddress} ({localizeArea(item.serviceArea, language)})
      </Text>
      <View style={styles.actionRow}>
        <Pressable
          accessibilityRole="button"
          onPress={() => onOpenChat(item.id)}
          style={styles.chatActionBtn}
          testID={`dashboard-open-chat-${item.id}`}
        >
          <View style={styles.chatIconBox}>
            <View style={styles.chatIconTail} />
          </View>
          <Text style={styles.chatActionBtnText}>{t('booking.chatTitle')}</Text>
        </Pressable>
        {item.status === 'confirmed' && (
          <Pressable
            accessibilityRole="button"
            onPress={handleStart}
            style={styles.secondaryBtn}
            testID={`dashboard-start-${item.id}`}
          >
            <Text style={styles.secondaryBtnText}>
              {language === 'en' ? 'Start Task' : 'Mulai Tugas'}
            </Text>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            if (!item.customerAcceptedWorkDone) {
              Alert.alert(
                language === 'en'
                  ? 'Customer Approval Required'
                  : 'Persetujuan Pelanggan Diperlukan',
                language === 'en'
                  ? 'The customer must review and accept that the work has been done before completing this order.'
                  : 'Pelanggan harus memeriksa dan menyetujui pekerjaan selesai terlebih dahulu.',
              );
              return;
            }
            handleComplete();
          }}
          style={[styles.acceptBtn, !item.customerAcceptedWorkDone && { opacity: 0.6 }]}
          testID={`dashboard-complete-${item.id}`}
        >
          <Text style={styles.acceptBtnText}>{t('booking.completeJob')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export const JobActiveCard = TaskActiveCard;

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  customerHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  cardCustomer: {
    fontSize: 14,
    fontWeight: '800',
  },
  cardMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  customerProfileBtn: {
    borderRadius: radii.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  customerProfileBtnText: {
    fontSize: 11,
    fontWeight: '700',
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
    color: colors.greenDark,
    fontSize: 12,
    fontWeight: '700',
  },
  unlockedAddressText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  chatActionBtn: {
    alignItems: 'center',
    backgroundColor: colors.greenSoft,
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: spacing.sm,
  },
  chatActionBtnText: {
    color: colors.greenDark,
    fontSize: 12,
    fontWeight: '800',
  },
  chatIconBox: {
    borderColor: colors.greenDark,
    borderRadius: 3,
    borderWidth: 1.5,
    height: 11,
    position: 'relative',
    width: 14,
  },
  chatIconTail: {
    backgroundColor: colors.greenDark,
    bottom: -3,
    height: 3,
    left: 2,
    position: 'absolute',
    width: 3,
  },
  secondaryBtn: {
    alignItems: 'center',
    backgroundColor: colors.orange,
    borderRadius: radii.sm,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: spacing.sm,
  },
  secondaryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  acceptBtn: {
    alignItems: 'center',
    backgroundColor: colors.greenDark,
    borderRadius: radii.sm,
    flex: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: spacing.sm,
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
