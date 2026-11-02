import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '../../components/marketplace-ui';
import { useAppearance } from '../../context/AppearanceContext';
import { formatRupiah } from '../../data/marketplaceRepository';
import { localizeArea, useLanguage } from '../../i18n/locale';
import {
  BOOKING_TIME_SLOTS,
  createUpcomingScheduleDates,
  formatSchedule,
} from '../schedule';
import { radii, spacing } from '../../theme/tokens';
import type { BookingRecord } from '../../types/marketplace';
import { font } from '../../theme/typography';

export interface TaskRequestCardProps {
  request: BookingRecord;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  onProposeTime: (id: string, proposedDate: string, proposedTime: string) => void;
  onViewCustomer: (request: BookingRecord) => void;
  proposedDate?: string;
  proposedTime?: string;
  onChangeProposedDate?: (date: string) => void;
  onChangeProposedTime?: (time: string) => void;
}
export type JobRequestCardProps = TaskRequestCardProps;

export function TaskRequestCard({
  request,
  onAccept,
  onDecline,
  onProposeTime,
  onViewCustomer,
  proposedDate,
  proposedTime,
  onChangeProposedDate,
  onChangeProposedTime,
}: TaskRequestCardProps) {
  const { language, t } = useLanguage();
  const { palette } = useAppearance();
  const dateOptions = createUpcomingScheduleDates();
  const selectedDate = proposedDate || dateOptions[0].value;
  const selectedTime = proposedTime || BOOKING_TIME_SLOTS[0];

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: palette.surface, borderColor: palette.border },
      ]}
      testID={`incoming-request-card-${request.id}`}
    >
      <View style={styles.customerHeaderRow}>
        <Avatar name={request.customerName} size={42} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardCustomer, { color: palette.text }]}>
            {request.customerName}
          </Text>
          <Text style={[styles.cardMeta, { color: palette.textMuted }]}>
            {localizeArea(request.serviceArea, language)} ·{' '}
            {formatSchedule(request.requestedStartAt, language)}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => onViewCustomer(request)}
          style={[styles.customerProfileBtn, { borderColor: palette.border }]}
          testID={`dashboard-view-customer-${request.id}`}
        >
          <Text style={[styles.customerProfileBtnText, { color: palette.text }]}>
            {language === 'en' ? 'Customer Profile' : 'Profil Pelanggan'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.cardTop}>
        <Text style={[styles.cardTitle, { color: palette.text }]}>
          {request.serviceNameSnapshot}
        </Text>
        <Text style={[styles.priceBadge, { color: palette.primary }]}>
          {request.agreedPrice ? formatRupiah(request.agreedPrice, language) : '-'}
        </Text>
      </View>

      <View
        style={[
          styles.addressBox,
          { backgroundColor: palette.surfaceElevated, borderColor: palette.border },
        ]}
        testID={`customer-address-${request.id}`}
      >
        <Text style={[styles.addressLabel, { color: palette.textMuted }]}>
          {language === 'en' ? 'SERVICE ADDRESS' : 'ALAMAT LAYANAN'}
        </Text>
        <Text style={[styles.addressText, { color: palette.text }]}>
          {request.customerAddress} ({localizeArea(request.serviceArea, language)})
        </Text>
        {request.addressNotes ? (
          <Text style={[styles.addressNotes, { color: palette.textMuted }]}>
            {request.addressNotes}
          </Text>
        ) : null}
      </View>

      {request.customerNotes && (
        <Text style={[styles.cardNotes, { color: palette.textMuted }]}>
          “{request.customerNotes}”
        </Text>
      )}

      {request.status === 'requested' ? (
        <>
          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => onAccept(request.id)}
              style={[styles.acceptBtn, { backgroundColor: palette.primary }]}
              testID={`dashboard-accept-${request.id}`}
            >
              <Text style={styles.acceptBtnText}>{t('booking.acceptRequest')}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => onDecline(request.id)}
              style={[styles.declineBtn, { borderColor: palette.border }]}
              testID={`dashboard-decline-${request.id}`}
            >
              <Text style={[styles.declineBtnText, { color: palette.text }]}>
                {t('booking.declineRequest')}
              </Text>
            </Pressable>
          </View>
          <View
            style={[
              styles.schedulePanel,
              { backgroundColor: palette.surfaceElevated, borderColor: palette.border },
            ]}
          >
            <Text style={[styles.scheduleLabel, { color: palette.textMuted }]}>
              {language === 'en' ? 'SUGGEST A NEW TIME' : 'USULKAN JADWAL BARU'}
            </Text>
            <View style={styles.scheduleRow}>
              {dateOptions.map((option) => (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedDate === option.value }}
                  onPress={() => onChangeProposedDate?.(option.value)}
                  style={[
                    styles.scheduleChip,
                    {
                      backgroundColor:
                        selectedDate === option.value
                          ? palette.primarySoft
                          : palette.surface,
                      borderColor:
                        selectedDate === option.value
                          ? palette.primary
                          : palette.border,
                    },
                  ]}
                  testID={`request-date-${request.id}-${option.value}`}
                >
                  <Text
                    style={[
                      styles.scheduleChipText,
                      {
                        color:
                          selectedDate === option.value
                            ? palette.primary
                            : palette.text,
                      },
                    ]}
                  >
                    {language === 'en' ? option.labelEn : option.labelId}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.scheduleRow}>
              {BOOKING_TIME_SLOTS.map((time) => (
                <Pressable
                  key={time}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedTime === time }}
                  onPress={() => {
                    if (!proposedDate) {
                      onChangeProposedDate?.(dateOptions[0].value);
                    }
                    onChangeProposedTime?.(time);
                  }}
                  style={[
                    styles.scheduleChip,
                    {
                      backgroundColor:
                        selectedTime === time ? palette.primarySoft : palette.surface,
                      borderColor:
                        selectedTime === time ? palette.primary : palette.border,
                    },
                  ]}
                  testID={`request-time-${request.id}-${time}`}
                >
                  <Text
                    style={[
                      styles.scheduleChipText,
                      {
                        color:
                          selectedTime === time ? palette.primary : palette.text,
                      },
                    ]}
                  >
                    {time}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                onProposeTime(
                  request.id,
                  selectedDate,
                  selectedTime,
                )
              }
              style={[
                styles.proposeBtn,
                { backgroundColor: palette.primarySoft },
              ]}
              testID={`dashboard-propose-btn-${request.id}`}
            >
              <Text
                style={[styles.proposeBtnText, { color: palette.primary }]}
              >
                {t('booking.proposeTime')}
              </Text>
            </Pressable>
          </View>
        </>
      ) : (
        <Text style={[styles.proposedBadge, { color: palette.primary }]}>
          {t('booking.status.alternative_proposed')}: {request.proposedStartAt}
        </Text>
      )}
    </View>
  );
}

export const JobRequestCard = TaskRequestCard;

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
    fontSize: font.subtitle,
    fontWeight: '800',
  },
  cardMeta: {
    fontSize: font.body,
    marginTop: 2,
  },
  customerProfileBtn: {
    borderRadius: 5,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
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
    fontSize: font.heading,
    fontWeight: '800',
  },
  priceBadge: {
    fontSize: font.subtitle,
    fontWeight: '800',
  },
  addressBox: {
    borderRadius: 5,
    borderWidth: 1,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  addressLabel: {
    fontSize: font.caption,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  addressText: {
    fontSize: font.label,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 4,
  },
  addressNotes: {
    fontSize: font.body,
    lineHeight: 17,
    marginTop: 4,
  },
  cardNotes: {
    fontStyle: 'italic',
    fontSize: font.body,
    marginBottom: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  acceptBtn: {
    alignItems: 'center',
    borderRadius: 5,
    flex: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: spacing.sm,
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontSize: font.body,
    fontWeight: '800',
  },
  declineBtn: {
    alignItems: 'center',
    borderRadius: 5,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: spacing.sm,
  },
  declineBtnText: {
    fontSize: font.body,
    fontWeight: '700',
  },
  schedulePanel: {
    borderRadius: 5,
    borderWidth: 1,
    marginTop: spacing.sm,
    padding: spacing.sm,
  },
  scheduleLabel: {
    fontSize: font.caption,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: spacing.xs,
  },
  scheduleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  scheduleChip: {
    borderRadius: 5,
    borderWidth: 1,
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  scheduleChipText: {
    fontSize: font.caption,
    fontWeight: '700',
  },
  proposeBtn: {
    alignItems: 'center',
    borderRadius: 5,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  proposeBtnText: {
    fontSize: font.body,
    fontWeight: '800',
  },
  proposedBadge: {
    fontSize: font.body,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
});
