import { BadgeCheck, CheckCircle, MapPin } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppearance } from '../../../context/AppearanceContext';
import { formatRupiah } from '../../../data/marketplaceRepository';
import { localizeArea, useLanguage } from '../../../i18n/locale';
import { ICON_STROKE } from '../../../theme/icons';
import { radii, spacing } from '../../../theme/tokens';
import type { DataSource, Technician } from '../../../types/marketplace';
import { Avatar } from '../../Avatar';

const ICON_SIZE = 14;

export const TechnicianCard = memo(function TechnicianCard({
  technician,
  source,
  onPress,
}: {
  technician: Technician;
  source?: DataSource;
  onPress: () => void;
}) {
  const { language, t } = useLanguage();
  const { palette } = useAppearance();

  const firstService = technician.services[0];
  const lowestPrice = technician.services
    .map((service) => service.startingPrice)
    .filter((price): price is number => price !== undefined)
    .sort((first, second) => first - second)[0];
  const name = technician.businessName || technician.displayName;
  const localizedHeadline =
    language === 'en' ? technician.headlineEn || technician.headline : technician.headline;
  const localizedServiceName =
    firstService && language === 'en'
      ? firstService.nameEn || firstService.name
      : firstService?.name;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Lihat profil ${name}`}
      testID={`technician-card-${technician.id}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.technicianCard,
        { backgroundColor: palette.surface, borderColor: palette.border },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.avatarColumn}>
        <View style={styles.avatarWrap}>
          <Avatar uri={technician.avatarUri} name={technician.displayName} size={56} />
          {technician.available && (
            <View
              style={[
                styles.onlineAvatarBlob,
                {
                  backgroundColor: '#10B981',
                  borderColor: palette.surface,
                },
              ]}
              testID={`tech-online-blob-${technician.id}`}
            />
          )}
        </View>
      </View>

      <View style={styles.cardCopy}>
        <View style={styles.nameRow}>
          <Text
            numberOfLines={1}
            style={[styles.technicianName, { color: palette.text }]}
          >
            {technician.displayName}
          </Text>
          {technician.verified && (
            <View style={[styles.verifiedBadge, { backgroundColor: 'transparent' }]}>
              <BadgeCheck size={ICON_SIZE} color={palette.primary} strokeWidth={ICON_STROKE} />
            </View>
          )}
        </View>
        <Text
          numberOfLines={1}
          style={[styles.cardHeadline, { color: palette.textMuted }]}
        >
          {localizedHeadline || localizedServiceName || t('technician.serviceFallback')}
        </Text>

        <View style={styles.metricsRow}>
          <View
            style={[
              styles.compactRatingBadge,
              { backgroundColor: palette.surfaceElevated, borderColor: palette.border },
            ]}
          >
            <Text style={styles.goldStarSmall}>★</Text>
            <Text style={[styles.ratingValueText, { color: palette.text }]}>
              {technician.reviewCount
                ? technician.averageRating.toFixed(1)
                : technician.averageRating > 0
                ? technician.averageRating.toFixed(1)
                : '5.0'}
            </Text>
            <Text style={[styles.ratingCountText, { color: palette.textMuted }]}>
              ({technician.reviewCount || 0})
            </Text>
          </View>

          {technician.completedJobsCount > 0 && (
            <View
              style={[
                styles.compactTasksBadge,
                { backgroundColor: palette.surfaceElevated, borderColor: palette.border },
              ]}
            >
              <CheckCircle size={ICON_SIZE} color={palette.primary} strokeWidth={ICON_STROKE} />
              <Text style={[styles.tasksBadgeText, { color: palette.text }]}>
                {technician.completedJobsCount} {language === 'en' ? 'tasks' : 'tugas'}
              </Text>
            </View>
          )}
        </View>

        {technician.services.length > 0 && (
          <View style={styles.serviceTagsRow}>
            {technician.services.slice(0, 2).map((service) => (
              <View
                key={service.id}
                style={[
                  styles.serviceMiniTag,
                  { backgroundColor: palette.surfaceElevated, borderColor: palette.border },
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[styles.serviceMiniTagText, { color: palette.text }]}
                >
                  {language === 'en' ? service.nameEn || service.name : service.name}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={[styles.cardFooter, { borderTopColor: palette.border }]}>
          <View style={styles.cardAreaRow}>
            <MapPin size={ICON_SIZE} color={palette.textMuted} strokeWidth={ICON_STROKE} />
            <Text
              numberOfLines={1}
              style={[styles.cardArea, { color: palette.textMuted }]}
            >
              {technician.serviceAreas[0]
                ? localizeArea(technician.serviceAreas[0], language)
                : t('technician.areaFallback')}
              {technician.serviceAreas.length > 1 ? ` +${technician.serviceAreas.length - 1}` : ''}
            </Text>
          </View>
          <View
            style={[styles.priceBadge, { backgroundColor: palette.primarySoft }]}
          >
            <Text style={[styles.cardPrice, { color: palette.primary }]}>
              {lowestPrice !== undefined
                ? t('technician.startingPrice', { price: formatRupiah(lowestPrice, language) })
                : t('technician.askPrice')}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  technicianCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: spacing.md,
    overflow: 'hidden',
    padding: spacing.md,
  },
  pressed: {
    opacity: 0.88,
  },
  avatarColumn: {
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarWrap: {
    position: 'relative',
  },
  onlineAvatarBlob: {
    borderRadius: radii.pill,
    borderWidth: 2,
    bottom: 0,
    height: 14,
    position: 'absolute',
    right: 0,
    width: 14,
  },
  cardCopy: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginBottom: 2,
  },
  technicianName: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  verifiedBadge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeadline: {
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  metricsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  compactRatingBadge: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  goldStarSmall: {
    color: '#FBBF24',
    fontSize: 12,
  },
  ratingValueText: {
    fontSize: 12,
    fontWeight: '700',
  },
  ratingCountText: {
    fontSize: 12,
  },
  compactTasksBadge: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  tasksBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  serviceTagsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  serviceMiniTag: {
    borderRadius: radii.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 1,
  },
  serviceMiniTagText: {
    fontSize: 12,
  },
  cardFooter: {
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.xs + 2,
  },
  cardAreaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
  },
  cardArea: {
    fontSize: 12,
  },
  priceBadge: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  cardPrice: {
    fontSize: 12,
    fontWeight: '700',
  },
});
