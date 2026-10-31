import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, radii, spacing } from '../theme/tokens';
import { localizeArea, useLanguage } from '../i18n/locale';
import type { DataSource, Technician } from '../types/marketplace';
import { Avatar } from './Avatar';
import { AppNavigationBar, Header } from './Header';

export { Avatar, AppNavigationBar, Header };

export function SourceBadge({ source }: { source: DataSource }) {
  const { t } = useLanguage();
  if (source === 'supabase') return null;
  return (
    <View style={styles.sampleBadge}>
      <Text style={styles.sampleBadgeText}>{t('data.previewBadge')}</Text>
    </View>
  );
}

export function ServiceCategoryGlyph({
  iconKey,
  icon,
  selected = false,
  size = 38,
}: {
  iconKey?: string;
  icon?: string;
  selected?: boolean;
  size?: number;
  color?: string;
}) {
  const normalized = (iconKey ?? icon ?? 'home-maintenance').toLowerCase();
  const palette = getGlyphPalette(normalized, selected);

  return (
    <View
      style={[
        styles.glyphContainer,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.34),
          backgroundColor: palette.bg,
          borderColor: palette.border,
        },
      ]}
    >
      {normalized.includes('plumb') || normalized.includes('water') ? (
        <View style={styles.glyphCanvas}>
          <View style={[styles.pipeHorizontal, { backgroundColor: palette.fg }]} />
          <View style={[styles.pipeVertical, { backgroundColor: palette.fg }]} />
          <View style={[styles.dropletDot, { backgroundColor: palette.accent }]} />
        </View>
      ) : normalized.includes('ac') || normalized.includes('cool') ? (
        <View style={styles.glyphCanvas}>
          <View style={[styles.acUnitBox, { borderColor: palette.fg }]} />
          <View style={styles.acWaveRow}>
            <View style={[styles.acWaveBar, { backgroundColor: palette.accent }]} />
            <View style={[styles.acWaveBar, { backgroundColor: palette.fg }]} />
            <View style={[styles.acWaveBar, { backgroundColor: palette.accent }]} />
          </View>
        </View>
      ) : normalized.includes('electr') ? (
        <View style={styles.glyphCanvas}>
          <View style={[styles.circuitRing, { borderColor: palette.fg }]}>
            <View style={[styles.circuitCore, { backgroundColor: palette.accent }]} />
          </View>
          <View style={[styles.circuitBase, { backgroundColor: palette.fg }]} />
        </View>
      ) : normalized.includes('appliance') ? (
        <View style={styles.glyphCanvas}>
          <View style={[styles.applianceFrame, { borderColor: palette.fg }]}>
            <View style={[styles.applianceDrum, { borderColor: palette.accent }]} />
          </View>
        </View>
      ) : (
        <View style={styles.glyphCanvas}>
          <View style={[styles.roofLine, { borderColor: palette.fg }]} />
          <View style={[styles.houseBase, { borderColor: palette.fg }]}>
            <View style={[styles.houseDoor, { backgroundColor: palette.accent }]} />
          </View>
        </View>
      )}
    </View>
  );
}

function getGlyphPalette(key: string, selected: boolean) {
  if (selected) {
    return { bg: colors.greenDark, fg: '#FFFFFF', accent: colors.yellow, border: colors.greenDark };
  }
  if (key.includes('plumb')) {
    return { bg: '#E7F2F5', fg: '#235A6C', accent: '#3B8EA5', border: '#CFE4EA' };
  }
  if (key.includes('ac')) {
    return { bg: '#E9F1F8', fg: '#26547C', accent: '#488AC7', border: '#D2E2F1' };
  }
  if (key.includes('electr')) {
    return { bg: '#FBF2DE', fg: '#8B5E1D', accent: '#D9764C', border: '#F0DEC8' };
  }
  if (key.includes('appliance')) {
    return { bg: '#EFEBF7', fg: '#4B3F72', accent: '#7C6C9E', border: '#DED7EE' };
  }
  return { bg: colors.greenSoft, fg: colors.greenDark, accent: colors.orange, border: '#D4E4DA' };
}


export function Rating({ value, count }: { value: number; count: number }) {
  const { language, t } = useLanguage();
  if (count < 1) {
    return <Text style={styles.mutedText}>{t('rating.none')}</Text>;
  }
  return (
    <View style={styles.inline}>
      <Text style={styles.star}>★</Text>
      <Text style={styles.ratingText}>{value.toFixed(1)}</Text>
      <Text style={styles.mutedText}>
        ({count} {language === 'en' ? 'reviews' : 'ulasan'})
      </Text>
    </View>
  );
}

export function TechnicianCard({
  technician,
  source,
  onPress,
}: {
  technician: Technician;
  source: DataSource;
  onPress: () => void;
}) {
  const { language, t } = useLanguage();
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
      style={({ pressed }) => [styles.technicianCard, pressed && styles.pressed]}
    >
      <View style={styles.avatarColumn}>
        <Avatar uri={technician.avatarUri} name={technician.displayName} size={74} />
        <View
          style={[
            styles.statusPill,
            technician.available ? styles.statusPillOpen : styles.statusPillBusy,
          ]}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: technician.available ? colors.green : colors.muted },
            ]}
          />
          <Text style={styles.statusPillText}>
            {technician.available
              ? language === 'en'
                ? 'Active'
                : 'Aktif'
              : language === 'en'
                ? 'Busy'
                : 'Penuh'}
          </Text>
        </View>
      </View>

      <View style={styles.cardCopy}>
        <View style={styles.nameRow}>
          <Text numberOfLines={1} style={styles.technicianName}>
            {name}
          </Text>
          {technician.verified && (
            <Text style={styles.verified} accessibilityLabel="Terverifikasi">
              ✓
            </Text>
          )}
        </View>
        {technician.businessName && technician.businessName !== technician.displayName && (
          <Text numberOfLines={1} style={styles.personSubname}>
            {technician.displayName}
            {technician.yearsExperience ? ` · ${technician.yearsExperience} thn` : ''}
          </Text>
        )}
        <Text numberOfLines={1} style={styles.cardHeadline}>
          {localizedHeadline || localizedServiceName || t('technician.serviceFallback')}
        </Text>

        <View style={styles.metricsRow}>
          <Rating value={technician.averageRating} count={technician.reviewCount} />
          {technician.completedJobsCount > 0 && (
            <Text style={styles.jobsCountBadge}>
              • {technician.completedJobsCount} {language === 'en' ? 'jobs' : 'pekerjaan'}
            </Text>
          )}
        </View>

        {technician.services.length > 0 && (
          <View style={styles.serviceTagsRow}>
            {technician.services.slice(0, 2).map((service) => (
              <View key={service.id} style={styles.serviceMiniTag}>
                <Text numberOfLines={1} style={styles.serviceMiniTagText}>
                  {language === 'en' ? service.nameEn || service.name : service.name}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.cardFooter}>
          <Text numberOfLines={1} style={styles.cardArea}>
            {technician.serviceAreas[0]
              ? localizeArea(technician.serviceAreas[0], language)
              : t('technician.areaFallback')}
            {technician.serviceAreas.length > 1 ? ` +${technician.serviceAreas.length - 1}` : ''}
          </Text>
          <View style={styles.priceBadge}>
            <Text style={styles.cardPrice}>
              {lowestPrice !== undefined
                ? t('technician.startingPrice', { price: formatMoney(lowestPrice, language) })
                : t('technician.askPrice')}
            </Text>
          </View>
        </View>
        {source === 'fixtures' && technician.available && (
          <Text style={styles.sampleAvailability}>{t('technician.sampleAvailability')}</Text>
        )}
      </View>
    </Pressable>
  );
}

export function FeaturedProfessionalCard({
  technician,
  onPress,
}: {
  technician: Technician;
  onPress: () => void;
}) {
  const { language, t } = useLanguage();
  const lowestPrice = technician.services
    .map((service) => service.startingPrice)
    .filter((price): price is number => price !== undefined)
    .sort((a, b) => a - b)[0];
  const headline =
    language === 'en' ? technician.headlineEn || technician.headline : technician.headline;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      testID={`featured-pro-${technician.id}`}
      style={({ pressed }) => [styles.featuredCard, pressed && styles.pressed]}
    >
      <View style={styles.featuredTop}>
        <Avatar uri={technician.avatarUri} name={technician.displayName} size={54} />
        <View style={styles.featuredIdentity}>
          <Text numberOfLines={1} style={styles.featuredName}>
            {technician.displayName}
          </Text>
          <Text numberOfLines={1} style={styles.featuredHeadline}>
            {headline || t('technician.serviceFallback')}
          </Text>
        </View>
      </View>
      <View style={styles.featuredStats}>
        <Rating value={technician.averageRating} count={technician.reviewCount} />
        {technician.yearsExperience !== undefined && (
          <Text style={styles.featuredExp}>
            {technician.yearsExperience} {language === 'en' ? 'yrs exp' : 'thn pengalaman'}
          </Text>
        )}
      </View>
      <View style={styles.featuredBottom}>
        <Text numberOfLines={1} style={styles.featuredArea}>
          {technician.serviceAreas
            .slice(0, 2)
            .map((a) => localizeArea(a, language))
            .join(', ')}
        </Text>
        {lowestPrice !== undefined && (
          <Text style={styles.featuredPrice}>{formatMoney(lowestPrice, language)}</Text>
        )}
      </View>
    </Pressable>
  );
}

export function CategoryPill({
  icon,
  name,
  selected,
  onPress,
  testID,
}: {
  icon: string;
  name: string;
  selected?: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.categoryPill,
        selected && styles.categoryPillSelected,
        pressed && styles.pressed,
      ]}
    >
      <ServiceCategoryGlyph iconKey={icon} selected={Boolean(selected)} size={40} />
      <Text numberOfLines={2} style={[styles.categoryName, selected && styles.categoryNameSelected]}>
        {name}
      </Text>
    </Pressable>
  );
}

export function LoadingState({ label = 'Memuat informasi…' }: { label?: string }) {
  const { t } = useLanguage();
  return (
    <View style={styles.stateBox} accessibilityRole="progressbar" accessibilityLabel={label}>
      <ActivityIndicator color={colors.green} />
      <Text style={styles.stateText}>
        {label === 'Memuat informasi…' ? t('category.loading') : label}
      </Text>
    </View>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <View style={styles.searchLensCircle} />
        <View style={styles.searchLensHandle} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
      {actionLabel && onAction && (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.textAction}>
          <Text style={styles.textActionLabel}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  trailing,
  onTrailingPress,
}: {
  eyebrow?: string;
  title: string;
  trailing?: string;
  onTrailingPress?: () => void;
}) {
  return (
    <View style={styles.sectionTitle}>
      <View style={styles.sectionTitleCopy}>
        {eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
        <Text style={styles.sectionHeading}>{title}</Text>
      </View>
      {trailing &&
        (onTrailingPress ? (
          <Pressable accessibilityRole="button" onPress={onTrailingPress}>
            <Text style={styles.sectionTrailingAction}>{trailing}</Text>
          </Pressable>
        ) : (
          <Text style={styles.sectionTrailing}>{trailing}</Text>
        ))}
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  testID,
  disabled,
}: {
  label: string;
  onPress: () => void;
  testID?: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.primaryButton,
        pressed && !disabled && styles.primaryButtonPressed,
        disabled && styles.primaryButtonDisabled,
      ]}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function formatMoney(amount: number, language: 'id' | 'en'): string {
  return new Intl.NumberFormat(language === 'id' ? 'id-ID' : 'en-US', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

const styles = StyleSheet.create({
  sampleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF1D4',
    borderColor: '#EAD09B',
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  sampleBadgeText: { color: '#785824', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  glyphContainer: {
    alignItems: 'center',
    borderWidth: 1,
    justifyContent: 'center',
    marginBottom: 8,
  },
  glyphCanvas: {
    alignItems: 'center',
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  pipeHorizontal: { borderRadius: 2, height: 4, left: 2, position: 'absolute', top: 6, width: 13 },
  pipeVertical: { borderRadius: 2, height: 10, left: 11, position: 'absolute', top: 6, width: 4 },
  dropletDot: { borderRadius: 3, bottom: 0, height: 5, left: 10.5, position: 'absolute', width: 5 },
  acUnitBox: { borderRadius: 3, borderWidth: 2, height: 9, width: 18 },
  acWaveRow: { flexDirection: 'row', gap: 3, marginTop: 3 },
  acWaveBar: { borderRadius: 1.5, height: 5, width: 2.5 },
  circuitRing: {
    alignItems: 'center',
    borderRadius: 7,
    borderWidth: 2,
    height: 14,
    justifyContent: 'center',
    width: 14,
  },
  circuitCore: { borderRadius: 2.5, height: 5, width: 5 },
  circuitBase: { borderRadius: 1.5, height: 3, marginTop: 2, width: 8 },
  applianceFrame: {
    alignItems: 'center',
    borderRadius: 4,
    borderWidth: 2,
    height: 17,
    justifyContent: 'center',
    width: 15,
  },
  applianceDrum: { borderRadius: 4.5, borderWidth: 2, height: 9, width: 9 },
  roofLine: {
    borderLeftWidth: 2,
    borderTopWidth: 2,
    height: 10,
    marginBottom: -4,
    transform: [{ rotate: '45deg' }],
    width: 10,
  },
  houseBase: {
    alignItems: 'center',
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    height: 10,
    justifyContent: 'flex-end',
    width: 13,
  },
  houseDoor: { borderTopLeftRadius: 2, borderTopRightRadius: 2, height: 5, width: 4 },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.greenSoft,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    borderRadius: 9999,
    height: '100%',
    overflow: 'hidden',
    width: '100%',
  },
  avatarImageZoomedOut: {
    borderRadius: 9999,
    height: '100%',
    overflow: 'hidden',
    width: '100%',
  },
  avatarInitials: { color: colors.greenDark, fontWeight: '800' },
  inline: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  star: { color: '#DCA63C', fontSize: 15 },
  ratingText: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  mutedText: { color: colors.muted, fontSize: 12 },
  technicianCard: {
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  avatarColumn: { alignItems: 'center', gap: 6 },
  statusPill: {
    alignItems: 'center',
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusPillOpen: { backgroundColor: colors.greenSoft },
  statusPillBusy: { backgroundColor: '#F1EFE9' },
  statusDot: { borderRadius: 3, height: 6, width: 6 },
  statusPillText: { color: colors.ink, fontSize: 10, fontWeight: '700' },
  pressed: { opacity: 0.85 },
  cardCopy: { flex: 1, minWidth: 0 },
  nameRow: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  technicianName: { color: colors.ink, flexShrink: 1, fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  personSubname: { color: colors.muted, fontSize: 11, fontWeight: '600', marginTop: 1 },
  verified: {
    alignItems: 'center',
    backgroundColor: colors.green,
    borderRadius: 8,
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  cardHeadline: { color: '#4B5B55', fontSize: 13, fontWeight: '500', marginBottom: 6, marginTop: 3 },
  metricsRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  jobsCountBadge: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  serviceTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  serviceMiniTag: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  serviceMiniTagText: { color: colors.ink, fontSize: 11, fontWeight: '600' },
  cardFooter: {
    alignItems: 'center',
    borderTopColor: '#F0F1EB',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 9,
  },
  cardArea: { color: colors.muted, flex: 1, fontSize: 11, fontWeight: '600', marginRight: 8 },
  priceBadge: {
    backgroundColor: colors.greenSoft,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cardPrice: { color: colors.greenDark, fontSize: 11, fontWeight: '800' },
  sampleAvailability: { color: '#896D38', fontSize: 10, marginTop: 6 },
  featuredCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    marginRight: spacing.md,
    padding: spacing.md,
    width: 242,
  },
  featuredTop: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  featuredIdentity: { flex: 1, minWidth: 0 },
  featuredName: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  featuredHeadline: { color: colors.greenDark, fontSize: 12, fontWeight: '600', marginTop: 2 },
  featuredStats: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  featuredExp: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  featuredBottom: {
    alignItems: 'center',
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
  },
  featuredArea: { color: colors.muted, flex: 1, fontSize: 11, marginRight: 6 },
  featuredPrice: { color: colors.greenDark, fontSize: 12, fontWeight: '800' },
  categoryPill: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    justifyContent: 'center',
    marginRight: 10,
    minHeight: 96,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: 108,
  },
  categoryPillSelected: { backgroundColor: colors.greenSoft, borderColor: colors.green },
  categoryName: { color: colors.ink, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  categoryNameSelected: { color: colors.greenDark },
  stateBox: { alignItems: 'center', gap: spacing.md, padding: spacing.xxxl },
  stateText: { color: colors.muted, fontSize: 14 },
  emptyState: { alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.xxxl },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: colors.greenSoft,
    borderRadius: radii.pill,
    height: 56,
    justifyContent: 'center',
    marginBottom: spacing.lg,
    width: 56,
  },
  searchLensCircle: {
    borderColor: colors.greenDark,
    borderRadius: 9,
    borderWidth: 2.5,
    height: 18,
    width: 18,
  },
  searchLensHandle: {
    backgroundColor: colors.greenDark,
    borderRadius: 2,
    height: 8,
    marginRight: -14,
    marginTop: -3,
    transform: [{ rotate: '-45deg' }],
    width: 3,
  },
  emptyTitle: { color: colors.ink, fontSize: 17, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  emptyDescription: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    maxWidth: 310,
    textAlign: 'center',
  },
  textAction: { padding: spacing.lg },
  textActionLabel: { color: colors.greenDark, fontSize: 14, fontWeight: '700' },
  sectionTitle: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginTop: spacing.xl,
  },
  sectionTitleCopy: { flex: 1, marginRight: spacing.sm },
  eyebrow: {
    color: colors.green,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  sectionHeading: { color: colors.ink, fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  sectionTrailing: { color: colors.muted, fontSize: 12, fontWeight: '600', paddingBottom: 2 },
  sectionTrailingAction: { color: colors.greenDark, fontSize: 12, fontWeight: '800', paddingBottom: 2 },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.greenDark,
    borderRadius: radii.pill,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: spacing.xl,
  },
  primaryButtonPressed: { backgroundColor: colors.green },
  primaryButtonDisabled: { opacity: 0.55 },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
