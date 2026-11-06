import { router } from 'expo-router';
import { BadgeCheck, Calendar, ChevronRight, MapPin } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppearance } from '../context/AppearanceContext';
import { localizeArea, useLanguage } from '../i18n/locale';
import { ICON_STROKE } from '../theme/icons';
import { font } from '../theme/typography';
import type { BookingRecord } from '../types/marketplace';
import { Avatar } from '../components/Avatar';
import { formatBookingSchedule } from './formatBookingSchedule';
import { BookingStatusBadge } from './BookingStatusBadge';
import { useScreenTheme } from '../theme/screenTheme';

export interface BookingCardProps {
  booking: BookingRecord;
  technicianAvatarUri?: string;
  technicianVerified?: boolean;
  onPress?: () => void;
}

export function BookingCard({
  booking,
  technicianAvatarUri,
  technicianVerified,
  onPress,
}: BookingCardProps) {
  const { language } = useLanguage();
  const { palette } = useAppearance();
  const theme = useScreenTheme();

  const technicianName =
    booking.technicianBusinessName || booking.technicianName || 'Technician';
  const areaLabel = localizeArea(booking.serviceArea, language);
  const address = [booking.customerAddress, areaLabel]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean)
    .join(' • ');

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    router.push({
      pathname: '/booking/[id]' as never,
      params: { id: booking.id },
    });
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${booking.serviceNameSnapshot} · ${technicianName}`}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
      testID={`customer-booking-card-${booking.id}`}
    >
      <View style={styles.topRow}>
        <Text
          numberOfLines={1}
          style={[styles.serviceTitle, { color: theme.text }]}
        >
          {booking.serviceNameSnapshot}
        </Text>
        <BookingStatusBadge
          booking={booking}
          testID={`customer-booking-status-${booking.id}`}
        />
      </View>

      <View style={styles.technicianRow}>
        <Avatar uri={technicianAvatarUri} name={technicianName} size={24} />
        <Text
          numberOfLines={1}
          style={[styles.technicianName, { color: theme.text }]}
        >
          {technicianName}
        </Text>
        {technicianVerified ? (
          <BadgeCheck
            size={15}
            color={palette.primary}
            strokeWidth={ICON_STROKE}
            accessibilityLabel={language === 'en' ? 'Verified technician' : 'Teknisi terverifikasi'}
          />
        ) : null}
      </View>

      {address ? (
        <View style={styles.locationRow}>
          <MapPin size={13} color={theme.muted} strokeWidth={ICON_STROKE} />
          <Text
            numberOfLines={1}
            style={[styles.address, { color: theme.muted }]}
          >
            {address}
          </Text>
        </View>
      ) : null}

      {booking.status === 'completed' && typeof booking.reviewRating === 'number' ? (
        <View
          style={[
            styles.reviewBadgeRow,
            { backgroundColor: palette.surfaceElevated, borderColor: theme.border },
          ]}
          testID={`booking-card-review-${booking.id}`}
        >
          <Text style={styles.reviewBadgeStars}>
            ★ {booking.reviewRating.toFixed(1)}
          </Text>
          {booking.reviewComment ? (
            <Text
              numberOfLines={1}
              style={[styles.reviewBadgeComment, { color: theme.muted }]}
            >
              &ldquo;{booking.reviewComment}&rdquo;
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={[styles.footerRow, { borderTopColor: theme.border }]}>
        <View style={styles.dateGroup}>
          <Calendar size={14} color={theme.muted} strokeWidth={ICON_STROKE} />
          <Text style={[styles.dateText, { color: theme.muted }]}>
            {formatBookingSchedule(booking.requestedStartAt, language)}
          </Text>
        </View>
        <ChevronRight
          size={18}
          color={theme.muted}
          strokeWidth={ICON_STROKE}
          accessibilityLabel={language === 'en' ? 'View details' : 'Lihat detail'}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14,
    width: '100%',
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  serviceTitle: {
    flex: 1,
    fontSize: font.heading,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  technicianRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  technicianName: {
    flexShrink: 1,
    fontSize: font.label,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  locationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  address: {
    flex: 1,
    fontSize: font.body,
    fontWeight: '500',
  },
  reviewBadgeRow: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  reviewBadgeStars: {
    color: '#F59E0B',
    fontSize: font.caption,
    fontWeight: '800',
  },
  reviewBadgeComment: {
    flex: 1,
    fontSize: font.caption,
    fontStyle: 'italic',
  },
  footerRow: {
    alignItems: 'center',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
  },
  dateGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  dateText: {
    fontSize: font.body,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});
