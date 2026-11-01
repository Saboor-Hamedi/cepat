/**
 * BookingParticipantsHeader
 *
 * A shared component displaying both the Technician and Customer profile avatars,
 * names, and role badges. Used consistently across both:
 * 1. "Schedule a service" booking creation form
 * 2. "Booking request submitted" active lifecycle panel
 */

import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAppearance } from '../context/AppearanceContext';
import { useLanguage } from '../i18n/locale';
import { radii, spacing } from '../theme/tokens';
import { Avatar, Rating } from './marketplace-ui';

export interface BookingParticipantsHeaderProps {
  technicianId?: string;
  technicianName: string;
  technicianBusinessName?: string;
  technicianAvatarUri?: string;
  technicianRating?: number;
  technicianReviewCount?: number;
  customerName: string;
  customerAvatarUri?: string;
  serviceName?: string;
  statusLabel?: string;
}

export function BookingParticipantsHeader({
  technicianId,
  technicianName,
  technicianBusinessName,
  technicianAvatarUri,
  technicianRating,
  technicianReviewCount,
  customerName,
  customerAvatarUri,
  serviceName,
  statusLabel,
}: BookingParticipantsHeaderProps) {
  const { language } = useLanguage();
  const { palette } = useAppearance();
  const styles = useMemo(() => createStyles(palette), [palette]);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: palette.surface, borderColor: palette.border },
      ]}
      testID="booking-participants-header"
    >
      {technicianId ? (
        <Text style={styles.srOnly} testID="selected-technician-id">
          {technicianId}
        </Text>
      ) : null}
      {/* Top Banner / Status or Service */}
      {(serviceName || statusLabel) && (
        <View style={styles.topBar}>
          {serviceName ? (
            <Text numberOfLines={1} style={[styles.serviceTitle, { color: palette.text }]}>
              {serviceName}
            </Text>
          ) : null}
          {statusLabel ? (
            <View style={[styles.statusBadge, { backgroundColor: palette.primarySoft }]}>
              <Text style={[styles.statusBadgeText, { color: palette.primary }]}>
                {statusLabel}
              </Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Participants Dual Profile Display */}
      <View style={styles.participantsRow}>
        {/* Customer Profile Column */}
        <View style={styles.participantCol}>
          <View style={styles.avatarWrap}>
            <Avatar name={customerName || 'Pelanggan'} size={50} uri={customerAvatarUri} />
          </View>
          <Text numberOfLines={1} style={[styles.participantName, { color: palette.text }]}>
            {customerName || (language === 'en' ? 'Customer' : 'Pelanggan')}
          </Text>
          <View style={[styles.rolePill, { backgroundColor: palette.pillBg }]}>
            <Text style={[styles.roleText, { color: palette.textMuted }]}>
              {language === 'en' ? 'Customer' : 'Pelanggan'}
            </Text>
          </View>
        </View>

        {/* Center Connection Glyph */}
        <View style={styles.connectionCenter}>
          <View style={[styles.connectLine, { backgroundColor: palette.border }]} />
          <View style={[styles.connectIconWrap, { backgroundColor: palette.surfaceElevated, borderColor: palette.border }]}>
            <Text style={{ fontSize: 14 }}>⚡</Text>
          </View>
          <View style={[styles.connectLine, { backgroundColor: palette.border }]} />
        </View>

        {/* Technician Profile Column */}
        <View style={styles.participantCol}>
          <View style={styles.avatarWrap}>
            <Avatar name={technicianName || 'Teknisi'} size={50} uri={technicianAvatarUri} />
            <View style={styles.activeDot} />
          </View>
          <Text numberOfLines={1} style={[styles.participantName, { color: palette.text }]}>
            {technicianBusinessName || technicianName || (language === 'en' ? 'Technician' : 'Teknisi')}
          </Text>
          <View style={[styles.rolePill, { backgroundColor: palette.primarySoft }]}>
            <Text style={[styles.roleText, { color: palette.primary }]}>
              {language === 'en' ? 'Verified Pro' : 'Teknisi Pro'}
            </Text>
          </View>
          {technicianRating !== undefined && technicianRating > 0 && (
            <View style={styles.ratingWrap}>
              <Rating value={technicianRating} count={technicianReviewCount ?? 0} />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function createStyles(palette: {
  border: string;
  pillBg: string;
  primary: string;
  primarySoft: string;
  surface: string;
  surfaceElevated: string;
  text: string;
  textMuted: string;
}) {
  return StyleSheet.create({
    activeDot: {
      backgroundColor: '#10B981',
      borderColor: '#FFFFFF',
      borderRadius: 6,
      borderWidth: 2,
      bottom: 0,
      height: 12,
      position: 'absolute',
      right: 0,
      width: 12,
    },
    avatarWrap: {
      position: 'relative',
    },
    connectIconWrap: {
      alignItems: 'center',
      borderRadius: radii.pill,
      borderWidth: 1,
      height: 28,
      justifyContent: 'center',
      width: 28,
    },
    connectLine: {
      flex: 1,
      height: 1.5,
    },
    connectionCenter: {
      alignItems: 'center',
      flex: 0.8,
      flexDirection: 'row',
      justifyContent: 'center',
      paddingHorizontal: spacing.xs,
    },
    container: {
      borderRadius: radii.lg,
      borderWidth: 1,
      marginBottom: spacing.md,
      padding: spacing.md,
      width: '100%',
    },
    participantCol: {
      alignItems: 'center',
      flex: 1,
      gap: 3,
    },
    participantName: {
      fontSize: 13,
      fontWeight: '800',
      marginTop: 2,
      textAlign: 'center',
    },
    participantsRow: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: spacing.xs,
    },
    ratingWrap: {
      marginTop: 2,
    },
    rolePill: {
      borderRadius: radii.pill,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    roleText: {
      fontSize: 10,
      fontWeight: '700',
    },
    serviceTitle: {
      flex: 1,
      fontSize: 13,
      fontWeight: '800',
    },
    statusBadge: {
      borderRadius: radii.pill,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    statusBadgeText: {
      fontSize: 11,
      fontWeight: '800',
    },
    topBar: {
      alignItems: 'center',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: palette.border,
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
      paddingBottom: spacing.xs,
    },
    srOnly: {
      opacity: 0,
      height: 0,
      width: 0,
      position: 'absolute',
    },
  });
}
