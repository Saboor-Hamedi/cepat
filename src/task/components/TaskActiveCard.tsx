import { CheckCircle2, MessageSquare, Play } from 'lucide-react-native';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '../../components/marketplace-ui';
import { useAppearance } from '../../context/AppearanceContext';
import { useUserAvatar } from '../../hooks/useUserAvatar';
import { localizeArea, useLanguage } from '../../i18n/locale';
import { radii, spacing } from '../../theme/tokens';
import type { BookingRecord } from '../../types/marketplace';
import { ICON_SIZE, ICON_STROKE } from '../../theme/icons';
import { font } from '../../theme/typography';

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

  const remoteCustomerAvatar = useUserAvatar(item.customerUserId, item.customerName);
  const customerAvatarUri =
    remoteCustomerAvatar ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

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
        <Avatar name={item.customerName} size={44} uri={customerAvatarUri} />
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
        <Text style={[styles.statusTag, { color: palette.primary }]}>
          {t(`booking.status.${item.status}`)}
        </Text>
      </View>
      <Text
        style={[styles.unlockedAddressText, { color: palette.textMuted }]}
        testID={`unlocked-customer-address-${item.id}`}
      >
        {item.customerAddress} ({localizeArea(item.serviceArea, language)})
      </Text>
      <View style={styles.actionRow}>
        <Pressable
          accessibilityRole="button"
          onPress={() => onOpenChat(item.id)}
          style={[styles.chatActionBtn, { backgroundColor: palette.primarySoft }]}
          testID={`dashboard-open-chat-${item.id}`}
        >
          <MessageSquare color={palette.primary} size={ICON_SIZE} strokeWidth={ICON_STROKE} />
          <Text style={[styles.chatActionBtnText, { color: palette.primary }]}>
            {t('booking.chatTitle')}
          </Text>
        </Pressable>
        {item.status === 'confirmed' && (
          <Pressable
            accessibilityRole="button"
            onPress={handleStart}
            style={styles.secondaryBtn}
            testID={`dashboard-start-${item.id}`}
          >
            <Play color="#FFFFFF" size={ICON_SIZE} fill="#FFFFFF" strokeWidth={ICON_STROKE} />
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
          style={[
            styles.acceptBtn,
            { backgroundColor: palette.primary },
            !item.customerAcceptedWorkDone && { opacity: 0.6 },
          ]}
          testID={`dashboard-complete-${item.id}`}
        >
          <CheckCircle2 color="#FFFFFF" size={ICON_SIZE} strokeWidth={ICON_STROKE} />
          <Text style={styles.acceptBtnText}>{t('booking.completeJob')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export const JobActiveCard = TaskActiveCard;

const styles = StyleSheet.create({
  card: {
    borderRadius: 5,
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
    fontSize: font.title,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  cardMeta: {
    fontSize: font.body,
    marginTop: 2,
  },
  customerProfileBtn: {
    borderRadius: 5,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  customerProfileBtnText: {
    fontSize: font.caption,
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
    fontSize: font.title,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  statusTag: {
    fontSize: font.body,
    fontWeight: '700',
  },
  unlockedAddressText: {
    fontSize: font.body,
    fontWeight: '500',
    marginBottom: spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  chatActionBtn: {
    alignItems: 'center',
    borderRadius: 5,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 14,
  },
  chatActionBtnText: {
    fontSize: font.label,
    fontWeight: '800',
  },
  secondaryBtn: {
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    borderRadius: 5,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 14,
  },
  secondaryBtnText: {
    color: '#FFFFFF',
    fontSize: font.label,
    fontWeight: '800',
  },
  acceptBtn: {
    alignItems: 'center',
    borderRadius: 5,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 14,
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontSize: font.label,
    fontWeight: '800',
  },
});
