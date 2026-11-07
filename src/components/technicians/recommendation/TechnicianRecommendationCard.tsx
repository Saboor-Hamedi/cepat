import { router } from 'expo-router';
import { BadgeCheck, MapPin, MessageSquare, Star } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppearance } from '../../../context/AppearanceContext';
import { formatRupiah } from '../../../data/marketplaceRepository';
import { localizeArea, useLanguage } from '../../../i18n/locale';
import { ICON_STROKE } from '../../../theme/icons';
import { radii } from '../../../theme/tokens';
import { Avatar } from '../../Avatar';
import type { TechnicianRecommendationCardProps } from './technicianRecommendation.types';

export const TechnicianRecommendationCard = memo(function TechnicianRecommendationCard({
  technician,
  onPress,
  onChat,
  cardWidth = 185,
  cardGap = 6,
  testID,
}: TechnicianRecommendationCardProps) {
  const { language, t } = useLanguage();
  const { palette } = useAppearance();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/technician/${encodeURIComponent(technician.id)}`);
    }
  };

  const handleChat = (e: { stopPropagation?: () => void }) => {
    e?.stopPropagation?.();
    if (onChat) {
      onChat();
    } else {
      router.push('/messages');
    }
  };

  const name = technician.displayName || technician.businessName;
  const headline =
    language === 'en'
      ? technician.headlineEn || technician.headline
      : technician.headline || technician.services[0]?.name;
  const primaryArea = technician.serviceAreas[0]
    ? localizeArea(technician.serviceAreas[0], language)
    : t('technician.areaFallback');
  const ratingText = technician.averageRating > 0 ? technician.averageRating.toFixed(1) : '5.0';
  const reviewCount = technician.reviewCount || 0;
  const startingPrice = technician.services?.find(
    (s) => typeof s.startingPrice === 'number' && s.startingPrice > 0,
  )?.startingPrice;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Rekomendasi teknisi ${name}`}
      testID={testID ?? `technician-rec-card-${technician.id}`}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        {
          width: cardWidth,
          marginRight: cardGap,
          backgroundColor: palette.surface,
          borderColor: palette.border,
          opacity: pressed ? 0.88 : 1,
        },
      ]}
    >
      {/* Top Header: Avatar + Status + Chat Button */}
      <View style={styles.cardHeader}>
        <View style={styles.avatarWrap}>
          <Avatar uri={technician.avatarUri} name={technician.displayName} size={44} />
          {technician.available && (
            <View
              style={[
                styles.onlineBlob,
                {
                  backgroundColor: palette.primary,
                  borderColor: palette.surface,
                },
              ]}
              testID={`rec-online-blob-${technician.id}`}
            />
          )}
        </View>

        <View style={styles.headerRightCol}>
          <View
            style={[
              styles.ratingBadge,
              { backgroundColor: palette.surfaceElevated },
            ]}
          >
            <Star size={11} color="#FBBF24" fill="#FBBF24" strokeWidth={1} />
            <Text style={[styles.ratingValue, { color: palette.text }]}>{ratingText}</Text>
            <Text style={[styles.reviewCount, { color: palette.textMuted }]}>
              ({reviewCount})
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Chat dengan ${name}`}
            hitSlop={8}
            onPress={handleChat}
            style={({ pressed }) => [
              styles.chatBtn,
              {
                backgroundColor: palette.primarySoft,
                borderColor: palette.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            testID={`rec-chat-btn-${technician.id}`}
          >
            <MessageSquare size={14} color={palette.primary} strokeWidth={ICON_STROKE} />
          </Pressable>
        </View>
      </View>

      {/* Technician Name & Verification */}
      <View style={styles.nameRow}>
        <Text
          numberOfLines={1}
          style={[styles.nameText, { color: palette.text }]}
        >
          {name}
        </Text>
        {technician.verified && (
          <View style={styles.verifiedIconWrap}>
            <BadgeCheck size={14} color={palette.primary} strokeWidth={ICON_STROKE} />
          </View>
        )}
      </View>

      {/* Specialization / Category */}
      <Text
        numberOfLines={1}
        style={[styles.specializationText, { color: palette.textMuted }]}
      >
        {headline || (language === 'en' ? 'Home Service Specialist' : 'Spesialis Layanan')}
      </Text>

      {/* Bottom Footer: Area + Starting Price */}
      <View style={[styles.footerRow, { borderTopColor: palette.border }]}>
        <View style={styles.locationRow}>
          <MapPin size={11} color={palette.textMuted} strokeWidth={ICON_STROKE} />
          <Text
            numberOfLines={1}
            style={[styles.locationText, { color: palette.textMuted }]}
          >
            {primaryArea}
          </Text>
        </View>
        {typeof startingPrice === 'number' && startingPrice > 0 ? (
          <Text numberOfLines={1} style={[styles.priceText, { color: palette.primary }]}>
            {formatRupiah(startingPrice, language)}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'column',
    padding: 10,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    width: '100%',
  },
  avatarWrap: {
    position: 'relative',
  },
  onlineBlob: {
    borderRadius: radii.pill,
    borderWidth: 2,
    bottom: -1,
    height: 12,
    position: 'absolute',
    right: -1,
    width: 12,
  },
  headerRightCol: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  ratingBadge: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  chatBtn: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  nameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    marginBottom: 2,
  },
  nameText: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  verifiedIconWrap: {
    flexShrink: 0,
  },
  specializationText: {
    fontSize: 12,
    marginBottom: 8,
  },
  ratingValue: {
    fontSize: 11,
    fontWeight: '700',
  },
  reviewCount: {
    fontSize: 10,
  },
  footerRow: {
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
     gap: 4,
    justifyContent: 'space-between',
    paddingTop: 6,
  },
  locationRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 3,
    minWidth: 0,
  },
  locationText: {
    flex: 1,
    fontSize: 11,
  },
  priceText: {
    fontSize: 11,
    fontWeight: '800',
  },
});
