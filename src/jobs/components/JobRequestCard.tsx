import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Avatar } from '../../components/marketplace-ui';
import { useAppearance } from '../../context/AppearanceContext';
import { formatRupiah } from '../../data/marketplaceRepository';
import { localizeArea, useLanguage } from '../../i18n/locale';
import { colors, radii, spacing } from '../../theme/tokens';
import type { BookingRecord } from '../../types/marketplace';

export interface JobRequestCardProps {
  request: BookingRecord;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  onProposeTime: (id: string, proposedTime: string) => void;
  onViewCustomer: (request: BookingRecord) => void;
  proposedTime?: string;
  onChangeProposedTime?: (text: string) => void;
}

export function JobRequestCard({
  request,
  onAccept,
  onDecline,
  onProposeTime,
  onViewCustomer,
  proposedTime = '2026-11-05 10:00 WIB',
  onChangeProposedTime,
}: JobRequestCardProps) {
  const { language, t } = useLanguage();
  const { palette } = useAppearance();

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
            {request.requestedStartAt.slice(0, 16).replace('T', ' ')} WIB
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
        <Text style={styles.priceBadge}>
          {request.agreedPrice ? formatRupiah(request.agreedPrice, language) : '-'}
        </Text>
      </View>

      {/* Address privacy: street address stays hidden until request is accepted */}
      <View
        style={[
          styles.maskedAddressBox,
          { backgroundColor: palette.surfaceElevated, borderColor: palette.border },
        ]}
        testID={`masked-address-notice-${request.id}`}
      >
        <Text style={[styles.maskedAddressText, { color: palette.textMuted }]}>
          {language === 'en'
            ? `Area: ${localizeArea(request.serviceArea, language)} · Exact street address unlocks after accepting this request.`
            : `Area: ${localizeArea(request.serviceArea, language)} · Alamat lengkap akan terbuka setelah permintaan diterima.`}
        </Text>
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
              style={styles.acceptBtn}
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
          <View style={styles.proposeRow}>
            <TextInput
              onChangeText={onChangeProposedTime}
              placeholder="2026-11-05 10:00 WIB"
              placeholderTextColor={palette.textMuted}
              style={[
                styles.proposeInput,
                {
                  backgroundColor: palette.inputBg,
                  borderColor: palette.border,
                  color: palette.text,
                },
              ]}
              testID={`dashboard-propose-input-${request.id}`}
              value={proposedTime}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => onProposeTime(request.id, proposedTime)}
              style={styles.proposeBtn}
              testID={`dashboard-propose-btn-${request.id}`}
            >
              <Text style={styles.proposeBtnText}>{t('booking.proposeTime')}</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <Text style={styles.proposedBadge}>
          {t('booking.status.alternative_proposed')}: {request.proposedStartAt}
        </Text>
      )}
    </View>
  );
}

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
  priceBadge: {
    color: colors.greenDark,
    fontSize: 14,
    fontWeight: '800',
  },
  maskedAddressBox: {
    borderRadius: radii.sm,
    borderWidth: 1,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  maskedAddressText: {
    fontSize: 12,
    lineHeight: 16,
  },
  cardNotes: {
    fontStyle: 'italic',
    fontSize: 12,
    marginBottom: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
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
  declineBtn: {
    alignItems: 'center',
    borderRadius: radii.sm,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: spacing.sm,
  },
  declineBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  proposeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  proposeInput: {
    borderRadius: radii.sm,
    borderWidth: 1,
    flex: 1,
    fontSize: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  proposeBtn: {
    alignItems: 'center',
    backgroundColor: colors.greenSoft,
    borderRadius: radii.sm,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  proposeBtnText: {
    color: colors.greenDark,
    fontSize: 12,
    fontWeight: '800',
  },
  proposedBadge: {
    color: colors.orange,
    fontSize: 12,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
});
