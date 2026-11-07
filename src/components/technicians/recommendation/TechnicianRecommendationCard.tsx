import { router } from 'expo-router';
import { BadgeCheck, MapPin, MessageSquare, Star } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppearance } from '../../../context/AppearanceContext';
import { localizeArea, useLanguage } from '../../../i18n/locale';
import { ICON_STROKE } from '../../../theme/icons';
import { radii, spacing } from '../../../theme/tokens';
import { Avatar } from '../../Avatar';
import type { TechnicianRecommendationCardProps } from './technicianRecommendation.types';

export const TechnicianRecommendationCard = memo(function TechnicianRecommendationCard({
  technician,
  onPress,
  onChat,
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

  const handleChat = (e: any) => {
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

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Rekomendasi teknisi ${name}`}
      testID={testID ?? `technician-rec-card-${technician.id}`}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: palette.surface,
          borderColor: palette.border,
          opacity: pressed ? 0.88 : 1,
        },
      ]}
    >
      {/* Top Header: Avatar + Status + Chat Button */}
      <View style={styles.cardHeader}>
        <View style={styles.avatarWrap}>
          <Avatar uri={technician.avatarUri} name={technician.displayName} size={48} />
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
          <MessageSquare size={15} color={palette.primary} strokeWidth={ICON_STROKE} />
        </Pressable>
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

      {/* Rating & Review Count */}
      <View style={styles.ratingRow}>
        <Star size={13} color="#FBBF24" fill="#FBBF24" strokeWidth={1} />
        <Text style={[styles.ratingValue, { color: palette.text }]}>{ratingText}</Text>
        <Text style={[styles.reviewCount, { color: palette.textMuted }]}>
          ({reviewCount})
        </Text>
      </View>

      {/* Location / Service Area */}
      <View style={styles.locationRow}>
        <MapPin size={12} color={palette.textMuted} strokeWidth={ICON_STROKE} />
        <Text
          numberOfLines={1}
          style={[styles.locationText, { color: palette.textMuted }]}
        >
          {primaryArea}
        </Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'column',
    marginRight: spacing.md,
    padding: spacing.md,
    width: 200,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm + 2,
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
  chatBtn: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  nameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    marginBottom: 2,
  },
  nameText: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  verifiedIconWrap: {
    flexShrink: 0,
  },
  specializationText: {
    fontSize: 12,
    marginBottom: spacing.xs + 2,
  },
  ratingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    marginBottom: spacing.xs,
  },
  ratingValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  reviewCount: {
    fontSize: 12,
  },
  locationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
  },
  locationText: {
    flex: 1,
    fontSize: 12,
  },
});
