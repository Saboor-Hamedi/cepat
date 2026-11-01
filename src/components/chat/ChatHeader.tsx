import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppearance } from '../../context/AppearanceContext';
import { formatRupiah } from '../../data/marketplaceRepository';
import { useLanguage } from '../../i18n/locale';
import type { BookingRecord } from '../../types/marketplace';
import { Avatar } from '../marketplace-ui';
import { ChatDropdown } from './ChatDropdown';

const SUCCESS = '#22C55E';

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
  const isVerifiedPartner = /verified|terverifikasi/i.test(partnerRoleLabel);
  const isCompleted = booking.status === 'completed';
  const accentColor = isCompleted ? SUCCESS : palette.primary;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.headerRow,
          {
            backgroundColor: palette.surface,
            borderBottomColor: palette.border,
          },
        ]}
      >
        <Pressable
          accessibilityLabel="Back"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onBack}
          style={({ pressed }) => [
            styles.iconButton,
            {
              backgroundColor: pressed ? palette.pillBg : palette.surfaceElevated,
            },
          ]}
          testID="chat-standalone-back-btn"
        >
          <Text style={[styles.backBtnText, { color: palette.text }]}>‹</Text>
        </Pressable>

        <View style={styles.partnerInfoRow}>
          <View style={styles.avatarWrap}>
            <Avatar name={partnerName} size={48} uri={partnerAvatarUri} />
            <View
              style={[
                styles.activeOnlineDot,
                { borderColor: palette.surface },
              ]}
            />
          </View>
          <View style={styles.partnerTextGroup}>
            <View style={styles.nameLine}>
              <Text
                numberOfLines={1}
                style={[styles.partnerName, { color: palette.text }]}
              >
                {partnerName}
              </Text>
              {isVerifiedPartner && (
                <View
                  style={[
                    styles.verifiedPill,
                    { backgroundColor: palette.primarySoft },
                  ]}
                >
                  <Text
                    style={[
                      styles.verifiedPillText,
                      { color: palette.primary },
                    ]}
                  >
                    ✓{' '}
                    {language === 'en' ? 'Verified' : 'Terverifikasi'}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.statusRow}>
              <View
                style={[styles.statusDot, { backgroundColor: SUCCESS }]}
              />
              <Text
                numberOfLines={1}
                style={[styles.partnerStatus, { color: palette.textMuted }]}
              >
                {language === 'en' ? 'Active now' : 'Aktif sekarang'}
                {isVerifiedPartner ? '' : ` · ${partnerRoleLabel}`}
              </Text>
            </View>
          </View>
        </View>

        <ChatDropdown
          bookingId={booking.id}
          onClearHistory={onClearHistory}
        />
      </View>

      <View
        style={[
          styles.pinnedCard,
          {
            backgroundColor: palette.surfaceElevated,
            borderColor: palette.border,
            borderLeftColor: accentColor,
          },
        ]}
        testID="chat-pinned-task-snippet"
      >
        <View style={styles.pinnedTop}>
          <View style={styles.pinnedTitleGroup}>
            <Text
              style={[styles.pinnedEyebrow, { color: palette.textMuted }]}
            >
              {language === 'en' ? 'CURRENT TASK' : 'TUGAS SAAT INI'}
            </Text>
            <Text
              numberOfLines={1}
              style={[styles.pinnedServiceTitle, { color: palette.text }]}
            >
              {booking.serviceNameSnapshot}
            </Text>
          </View>
          <View
            style={[
              styles.pinnedBadge,
              {
                backgroundColor: isCompleted
                  ? 'rgba(34, 197, 94, 0.14)'
                  : palette.primarySoft,
              },
            ]}
          >
            <Text
              style={[
                styles.pinnedBadgeText,
                { color: isCompleted ? SUCCESS : palette.primary },
              ]}
            >
              {t(`booking.status.${booking.status}`)}
            </Text>
          </View>
        </View>
        <View style={styles.pinnedMeta}>
          <Text style={[styles.pinnedPrice, { color: palette.text }]}>
            {booking.agreedPrice
              ? formatRupiah(booking.agreedPrice, language)
              : '—'}
          </Text>
          <View
            style={[styles.pinnedDivider, { backgroundColor: palette.border }]}
          />
          <Text
            numberOfLines={1}
            style={[styles.pinnedAddress, { color: palette.textMuted }]}
          >
            📍{' '}
            {booking.customerAddress ||
              (language === 'en' ? 'Location not set' : 'Lokasi belum diatur')}
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
      backgroundColor: SUCCESS,
      borderRadius: 8,
      borderWidth: 2.5,
      bottom: 0,
      height: 16,
      position: 'absolute',
      right: 0,
      width: 16,
    },
    avatarWrap: {
      position: 'relative',
    },
    backBtnText: {
      fontSize: 28,
      fontWeight: '600',
      lineHeight: 30,
      marginTop: -2,
    },
    container: {
      width: '100%',
      zIndex: 10,
    },
    headerRow: {
      alignItems: 'center',
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    iconButton: {
      alignItems: 'center',
      borderRadius: 22,
      height: 44,
      justifyContent: 'center',
      width: 44,
    },
    nameLine: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    partnerInfoRow: {
      alignItems: 'center',
      flex: 1,
      flexDirection: 'row',
      gap: 12,
    },
    partnerName: {
      flexShrink: 1,
      fontSize: 17,
      fontWeight: '700',
      letterSpacing: -0.2,
    },
    partnerStatus: {
      flexShrink: 1,
      fontSize: 12,
      fontWeight: '500',
    },
    partnerTextGroup: {
      flex: 1,
      gap: 3,
    },
    pinnedAddress: {
      flex: 1,
      fontSize: 11,
      fontWeight: '500',
    },
    pinnedBadge: {
      borderRadius: 8,
      paddingHorizontal: 9,
      paddingVertical: 4,
    },
    pinnedBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.2,
      textTransform: 'uppercase',
    },
    pinnedCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderLeftWidth: 3,
      gap: 8,
      marginBottom: 6,
      marginHorizontal: 12,
      marginTop: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    pinnedDivider: {
      height: 12,
      opacity: 0.7,
      width: 1,
    },
    pinnedEyebrow: {
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.8,
    },
    pinnedMeta: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 10,
    },
    pinnedPrice: {
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: -0.2,
    },
    pinnedServiceTitle: {
      fontSize: 14,
      fontWeight: '700',
      letterSpacing: -0.2,
    },
    pinnedTitleGroup: {
      flex: 1,
      gap: 2,
    },
    pinnedTop: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 10,
      justifyContent: 'space-between',
    },
    statusDot: {
      borderRadius: 3,
      height: 6,
      width: 6,
    },
    statusRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 5,
    },
    verifiedPill: {
      alignItems: 'center',
      borderRadius: 999,
      flexDirection: 'row',
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    verifiedPillText: {
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.2,
    },
  });
}
