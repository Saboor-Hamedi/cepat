import React from 'react';
import { font } from '../../theme/typography';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAppearance } from '../../context/AppearanceContext';
import { formatRupiah } from '../../data/marketplaceRepository';
import { useLanguage } from '../../i18n/locale';
import { radii, spacing } from '../../theme/tokens';
import type { BookingRecord } from '../../types/marketplace';

interface DashboardBookingsProps {
  bookings: BookingRecord[];
  onOverrideStatus: (
    bookingId: string,
    status: BookingRecord['status'],
  ) => Promise<void>;
}

export function DashboardBookings({
  bookings,
  onOverrideStatus,
}: DashboardBookingsProps) {
  const { language } = useLanguage();
  const { palette } = useAppearance();

  return (
    <View style={styles.container} testID="admin-bookings-section">
      {bookings.map((bk) => (
        <View
          key={bk.id}
          style={[
            styles.card,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
          testID={`admin-booking-card-${bk.id}`}
        >
          <View style={styles.cardTop}>
            <Text style={[styles.cardTitle, { color: palette.text }]}>
              {bk.serviceNameSnapshot}
            </Text>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    bk.status === 'completed'
                      ? '#16A34A20'
                      : ['cancelled', 'declined'].includes(bk.status)
                        ? '#DC262620'
                        : '#F59E0B20',
                },
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  {
                    color:
                      bk.status === 'completed'
                        ? '#16A34A'
                        : ['cancelled', 'declined'].includes(bk.status)
                          ? '#DC2626'
                          : '#F59E0B',
                  },
                ]}
              >
                {bk.status.toUpperCase()}
              </Text>
            </View>
          </View>

          <Text style={[styles.cardMeta, { color: palette.textMuted }]}>
            {language === 'en' ? 'Customer:' : 'Pelanggan:'} {bk.customerName} ·{' '}
            {language === 'en' ? 'Technician:' : 'Teknisi:'} {bk.technicianName}
          </Text>
          <Text style={[styles.cardMeta, { color: palette.textMuted }]}>
            {bk.customerAddress} ·{' '}
            {bk.agreedPrice ? formatRupiah(bk.agreedPrice, language) : '-'}
          </Text>

          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void onOverrideStatus(bk.id, 'completed');
              }}
              style={[styles.secondaryBtn, { backgroundColor: palette.primarySoft }]}
              testID={`admin-force-complete-${bk.id}`}
            >
              <Text style={[styles.secondaryBtnText, { color: palette.text }]}>
                {language === 'en' ? 'Force Complete' : 'Tandai Selesai'}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void onOverrideStatus(bk.id, 'cancelled');
              }}
              style={[
                styles.dangerBtn,
                { backgroundColor: `${palette.danger}15`, borderColor: palette.danger },
              ]}
              testID={`admin-force-cancel-${bk.id}`}
            >
              <Text style={[styles.dangerBtnText, { color: palette.danger }]}>
                {language === 'en' ? 'Cancel Booking' : 'Batalkan Pesanan'}
              </Text>
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  card: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  cardTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: font.title,
    fontWeight: '800',
  },
  cardMeta: {
    fontSize: font.body,
    marginTop: 4,
  },
  statusBadge: {
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: font.caption,
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  secondaryBtn: {
    alignItems: 'center',
    borderRadius: radii.sm,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  secondaryBtnText: {
    fontSize: font.caption,
    fontWeight: '800',
  },
  dangerBtn: {
    alignItems: 'center',
    borderRadius: radii.sm,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dangerBtnText: {
    fontSize: font.caption,
    fontWeight: '800',
  },
});
