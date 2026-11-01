import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppearance } from '../../context/AppearanceContext';
import { formatRupiah } from '../../data/marketplaceRepository';
import { useLanguage } from '../../i18n/locale';
import { radii, spacing } from '../../theme/tokens';
import type { BookingRecord } from '../../types/marketplace';
import { Avatar } from '../marketplace-ui';
import { ChatDropdown } from './ChatDropdown';

export interface ChatHeaderProps {
  booking: BookingRecord;
  partnerName: string;
  partnerRoleLabel: string;
  partnerAvatarUri?: string;
  onBack: () => void;
  onClearHistory: () => void;
}

export function ChatHeader({
  booking,
  partnerName,
  partnerRoleLabel,
  partnerAvatarUri,
  onBack,
  onClearHistory,
}: ChatHeaderProps) {
  const { language, t } = useLanguage();
  const { palette } = useAppearance();
  const styles = useMemo(() => createStyles(palette), [palette]);

  return (
    <View style={styles.container}>
      {/* Top Messenger Navbar Row */}
      <View
        style={[
          styles.headerRow,
          { backgroundColor: palette.surface, borderBottomColor: palette.border },
        ]}
      >
        <Pressable
          accessibilityLabel="Back"
          accessibilityRole="button"
          onPress={onBack}
          style={({ pressed }) => [
            styles.backBtn,
            {
              backgroundColor: pressed
                ? palette.pillBg
                : palette.surfaceElevated,
            },
          ]}
          testID="chat-standalone-back-btn"
        >
          <Text style={[styles.backBtnText, { color: palette.text }]}>←</Text>
        </Pressable>

        <View style={styles.partnerInfoRow}>
          <View style={styles.avatarWrap}>
            <Avatar name={partnerName} size={42} uri={partnerAvatarUri} />
            <View style={styles.activeOnlineDot} />
          </View>
          <View style={styles.partnerTextGroup}>
            <Text numberOfLines={1} style={[styles.partnerName, { color: palette.text }]}>
              {partnerName}
            </Text>
            <Text style={[styles.partnerStatus, { color: palette.primary }]}>
              {language === 'en' ? 'Active now' : 'Aktif sekarang'} • {partnerRoleLabel}
            </Text>
          </View>
        </View>

        {/* Standalone Borderless 3-Dot Dropdown */}
        <ChatDropdown
          bookingId={booking.id}
          onClearHistory={onClearHistory}
        />
      </View>

      {/* Pinned Booking Snippet Card */}
      <View
        style={[
          styles.pinnedCard,
          { backgroundColor: palette.surfaceElevated, borderColor: palette.border },
        ]}
        testID="chat-pinned-task-snippet"
      >
        <View style={styles.pinnedTop}>
          <Text numberOfLines={1} style={[styles.pinnedServiceTitle, { color: palette.text }]}>
            {booking.serviceNameSnapshot}
          </Text>
          <View style={[styles.pinnedBadge, { backgroundColor: palette.primarySoft }]}>
            <Text style={[styles.pinnedBadgeText, { color: palette.primary }]}>
              {t(`booking.status.${booking.status}`)}
            </Text>
          </View>
        </View>
        <View style={styles.pinnedMeta}>
          <Text style={[styles.pinnedPrice, { color: palette.primary }]}>
            {booking.agreedPrice ? formatRupiah(booking.agreedPrice, language) : '-'}
          </Text>
          <Text style={[styles.pinnedAddress, { color: palette.textMuted }]} numberOfLines={1}>
            • {booking.customerAddress || 'Jakarta'}
          </Text>
        </View>
      </View>
    </View>
  );
}

function createStyles(palette: {
  border: string;
  primary: string;
  primarySoft: string;
  surface: string;
  surfaceElevated: string;
  text: string;
  textMuted: string;
}) {
  return StyleSheet.create({
    activeOnlineDot: {
      backgroundColor: '#10B981',
      borderColor: '#FFFFFF',
      borderRadius: 7,
      borderWidth: 2,
      bottom: 0,
      height: 14,
      position: 'absolute',
      right: 0,
      width: 14,
    },
    avatarWrap: {
      position: 'relative',
    },
    backBtn: {
      alignItems: 'center',
      borderRadius: radii.pill,
      borderWidth: 0,
      height: 38,
      justifyContent: 'center',
      width: 38,
    },
    backBtnText: {
      fontSize: 18,
      fontWeight: '700',
    },
    container: {
      width: '100%',
      zIndex: 10,
    },
    headerRow: {
      alignItems: 'center',
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    partnerInfoRow: {
      alignItems: 'center',
      flex: 1,
      flexDirection: 'row',
      gap: spacing.sm,
    },
    partnerName: {
      fontSize: 15,
      fontWeight: '800',
    },
    partnerStatus: {
      fontSize: 11,
      fontWeight: '600',
      marginTop: 1,
    },
    partnerTextGroup: {
      flex: 1,
    },
    pinnedAddress: {
      flex: 1,
      fontSize: 12,
    },
    pinnedBadge: {
      borderRadius: radii.pill,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    pinnedBadgeText: {
      fontSize: 11,
      fontWeight: '700',
    },
    pinnedCard: {
      borderBottomWidth: 1,
      gap: 3,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 2,
    },
    pinnedMeta: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.xs,
    },
    pinnedPrice: {
      fontSize: 13,
      fontWeight: '800',
    },
    pinnedServiceTitle: {
      flex: 1,
      fontSize: 13,
      fontWeight: '700',
    },
    pinnedTop: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
  });
}
