import { router } from 'expo-router';
import {
  BadgeCheck,
  CheckCircle,
  ChevronRight,
  MapPin,
  MessageSquare,
  Star,
} from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useAppearance } from '../../../context/AppearanceContext';
import { localizeArea, useLanguage } from '../../../i18n/locale';
import { ICON_STROKE } from '../../../theme/icons';
import { radii, spacing } from '../../../theme/tokens';
import type { Technician } from '../../../types/marketplace';
import { Avatar } from '../../Avatar';

interface TechnicianListItemProps {
  technician: Technician;
  onPress?: () => void;
  onChat?: () => void;
  testID?: string;
}

export const TechnicianListItem = memo(function TechnicianListItem({
  technician,
  onPress,
  onChat,
  testID,
}: TechnicianListItemProps) {
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
      accessibilityLabel={`Lihat profil ${name}`}
      testID={testID ?? `technician-list-item-${technician.id}`}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: palette.surface,
          borderColor: palette.border,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      {/* Left Avatar Column */}
      <View style={styles.avatarWrap}>
        <Avatar uri={technician.avatarUri} name={technician.displayName} size={54} />
        {technician.available && (
          <View
            style={[
              styles.onlineBlob,
              {
                backgroundColor: palette.primary,
                borderColor: palette.surface,
              },
            ]}
          />
        )}
      </View>

      {/* Middle Information Column */}
      <View style={styles.infoCol}>
        <View style={styles.nameRow}>
          <Text
            numberOfLines={1}
            style={[styles.nameText, { color: palette.text }]}
          >
            {name}
          </Text>
          {technician.verified && (
            <BadgeCheck size={15} color={palette.primary} strokeWidth={ICON_STROKE} />
          )}
        </View>

        <Text
          numberOfLines={1}
          style={[styles.headlineText, { color: palette.textMuted }]}
        >
          {headline || (language === 'en' ? 'Professional Technician' : 'Teknisi Profesional')}
        </Text>

        {/* Metrics Row: Rating + Tasks */}
        <View style={styles.metricsRow}>
          <View style={styles.ratingBadge}>
            <Star size={12} color="#FBBF24" fill="#FBBF24" />
            <Text style={[styles.ratingVal, { color: palette.text }]}>{ratingText}</Text>
            <Text style={[styles.reviewCnt, { color: palette.textMuted }]}>
              ({reviewCount})
            </Text>
          </View>

          {technician.completedJobsCount > 0 && (
            <View style={styles.taskBadge}>
              <CheckCircle size={12} color={palette.primary} strokeWidth={ICON_STROKE} />
              <Text style={[styles.taskCount, { color: palette.text }]}>
                {technician.completedJobsCount}{' '}
                {language === 'en' ? 'jobs' : 'pekerjaan'}
              </Text>
            </View>
          )}
        </View>

        {/* Location & Availability Status */}
        <View style={styles.footerRow}>
          <View style={styles.locationWrap}>
            <MapPin size={11} color={palette.textMuted} strokeWidth={ICON_STROKE} />
            <Text
              numberOfLines={1}
              style={[styles.locationText, { color: palette.textMuted }]}
            >
              {primaryArea}
            </Text>
          </View>

          <View
            style={[
              styles.availabilityBadge,
              {
                backgroundColor: technician.available
                  ? palette.primarySoft
                  : palette.surfaceElevated,
              },
            ]}
          >
            <Text
              style={[
                styles.availabilityText,
                {
                  color: technician.available
                    ? palette.primary
                    : palette.textMuted,
                },
              ]}
            >
              {technician.available
                ? language === 'en'
                  ? 'Available'
                  : 'Tersedia'
                : language === 'en'
                  ? 'Busy'
                  : 'Sibuk'}
            </Text>
          </View>
        </View>
      </View>

      {/* Right Action Column */}
      <View style={styles.actionCol}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleChat}
          style={[
            styles.chatBtn,
            {
              backgroundColor: palette.primarySoft,
              borderColor: palette.border,
            },
          ]}
          testID={`list-chat-btn-${technician.id}`}
        >
          <MessageSquare size={16} color={palette.primary} strokeWidth={ICON_STROKE} />
        </TouchableOpacity>

        <ChevronRight size={18} color={palette.textMuted} strokeWidth={ICON_STROKE} />
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: spacing.sm + 2,
    marginHorizontal: spacing.lg,
    padding: spacing.md,
  },
  avatarWrap: {
    alignSelf: 'flex-start',
    position: 'relative',
  },
  onlineBlob: {
    borderRadius: 999,
    borderWidth: 2,
    bottom: -1,
    height: 12,
    position: 'absolute',
    right: -1,
    width: 12,
  },
  infoCol: {
    flex: 1,
    marginLeft: spacing.md,
  },
  nameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    marginBottom: 2,
  },
  nameText: {
    fontSize: 12,
    fontWeight: '700',
  },
  headlineText: {
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  metricsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xs + 2,
  },
  ratingBadge: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
  },
  ratingVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  reviewCnt: {
    fontSize: 12,
  },
  taskBadge: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
  },
  taskCount: {
    fontSize: 12,
  },
  footerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  locationWrap: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 3,
  },
  locationText: {
    fontSize: 12,
  },
  availabilityBadge: {
    borderRadius: radii.pill,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionCol: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs + 2,
    marginLeft: spacing.sm,
  },
  chatBtn: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
});
