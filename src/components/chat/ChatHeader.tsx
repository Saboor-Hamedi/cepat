import { BadgeCheck, ChevronLeft, MapPin } from 'lucide-react-native';
import { useMemo } from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import { useAppearance } from '../../context/AppearanceContext';
import { fixtureTechnicians } from '../../data/fixtures';
import { formatRupiah } from '../../data/marketplaceRepository';
import { useLanguage } from '../../i18n/locale';
import { ICON_SIZE, ICON_STROKE } from '../../theme/icons';
import type { BookingRecord, Technician } from '../../types/marketplace';
import { Avatar } from '../marketplace-ui';
import { ChatDropdown } from './ChatDropdown';
import { createChatHeaderStyles } from './css/chatStyles';

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
  const { language } = useLanguage();
  const { palette } = useAppearance();
  const styles = useMemo(() => createChatHeaderStyles(palette), [palette]);
  const isVerifiedPartner = /verified|terverifikasi/i.test(partnerRoleLabel);
  const isCompleted = booking.status === 'completed';
  const accentColor = isCompleted ? SUCCESS : palette.primary;

  const postThumbnailUri: string = useMemo(() => {
    const tech = fixtureTechnicians.find((t: Technician) => t.id === booking.technicianUserId);
    const svc = tech?.services.find(
      (s) =>
        s.id === booking.technicianServiceId ||
        s.id === booking.serviceId ||
        s.name === booking.serviceNameSnapshot,
    );
    if (svc && 'imageUri' in svc && typeof svc.imageUri === 'string' && svc.imageUri) {
      return svc.imageUri;
    }
    const portfolioImg = tech?.portfolio?.[0]?.imageUri;
    if (portfolioImg && typeof portfolioImg === 'string') return portfolioImg;
    const name = (booking.serviceNameSnapshot || '').toLowerCase();
    if (name.includes('ac') || name.includes('hvac') || name.includes('dingin')) {
      return 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=300&auto=format&fit=crop&q=80';
    }
    if (name.includes('pipa') || name.includes('plumb') || name.includes('air') || name.includes('drain')) {
      return 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=300&auto=format&fit=crop&q=80';
    }
    if (name.includes('listrik') || name.includes('electr')) {
      return 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=300&auto=format&fit=crop&q=80';
    }
    return 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&auto=format&fit=crop&q=80';
  }, [booking.technicianUserId, booking.technicianServiceId, booking.serviceId, booking.serviceNameSnapshot]);

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
              backgroundColor: 'transparent',
              opacity: pressed ? 0.6 : 1,
            },
          ]}
          testID="chat-standalone-back-btn"
        >
          <ChevronLeft
            color={palette.text}
            size={ICON_SIZE}
            strokeWidth={ICON_STROKE}
          />
        </Pressable>

        <View style={styles.partnerInfoRow}>
          <View style={styles.avatarWrap}>
            <Avatar name={partnerName} size={40} uri={partnerAvatarUri} />
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
                  <BadgeCheck
                    color={palette.primary}
                    size={ICON_SIZE}
                    strokeWidth={ICON_STROKE}
                  />
                  <Text
                    style={[
                      styles.verifiedPillText,
                      { color: palette.primary },
                    ]}
                  >
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
        <Image
          source={{ uri: postThumbnailUri }}
          style={styles.pinnedThumb}
          resizeMode="cover"
        />
        <View style={styles.pinnedDetails}>
          <Text
            numberOfLines={1}
            style={[styles.pinnedServiceTitle, { color: palette.text }]}
          >
            {booking.serviceNameSnapshot}
          </Text>
          <View style={styles.pinnedMeta}>
            <Text style={[styles.pinnedPrice, { color: palette.text }]}>
              {booking.agreedPrice
                ? formatRupiah(booking.agreedPrice, language)
                : '—'}
            </Text>
            <View
              style={[styles.pinnedDivider, { backgroundColor: palette.border }]}
            />
            <View style={styles.pinnedAddressRow}>
              <MapPin color={palette.textMuted} size={ICON_SIZE} strokeWidth={ICON_STROKE} />
              <Text
                numberOfLines={1}
                style={[styles.pinnedAddress, { color: palette.textMuted }]}
              >
                {booking.customerAddress ||
                  (language === 'en' ? 'Location not set' : 'Lokasi belum diatur')}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
