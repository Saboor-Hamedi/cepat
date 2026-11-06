import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BadgeCheck, CheckCircle, MapPin } from 'lucide-react-native';

import { useAppearance } from '../context/AppearanceContext';
import { colors, radii, spacing } from '../theme/tokens';
import { localizeArea, useLanguage } from '../i18n/locale';
import type { DataSource, Technician } from '../types/marketplace';
import { Avatar } from './Avatar';
import { AppNavigationBar, Header } from './Header';
import { ICON_SIZE, ICON_STROKE } from '../theme/icons';
import { font } from '../theme/typography';

export { Avatar, AppNavigationBar, Header };
export { Toggle } from './toggle';

export function SourceBadge({ source }: { source: DataSource }) {
  const { t } = useLanguage();
  const { palette } = useAppearance();
  if (source === 'supabase') return null;
  return (
    <View
      style={[
        styles.sampleBadge,
        {
          backgroundColor: palette.primarySoft,
          borderColor: palette.border,
        },
      ]}
    >
      <Text style={[styles.sampleBadgeText, { color: palette.primary }]}>
        {t('data.previewBadge')}
      </Text>
    </View>
  );
}

export function ServiceCategoryGlyph({
  iconKey,
  icon,
  selected = false,
  size = 38,
  color,
}: {
  iconKey?: string;
  icon?: string;
  selected?: boolean;
  size?: number;
  color?: string;
}) {
  const { palette: appearancePalette, isDark } = useAppearance();
  const normalized = (iconKey ?? icon ?? 'home-maintenance').toLowerCase();
  const basePalette = getGlyphPalette(normalized, selected);
  const palette = selected
    ? {
        bg: appearancePalette.primary,
        fg: '#FFFFFF',
        accent: '#FFFFFF',
        border: appearancePalette.primary,
      }
    : isDark
      ? {
          bg: appearancePalette.surfaceElevated,
          fg: color ?? appearancePalette.text,
          accent: appearancePalette.primary,
          border: appearancePalette.border,
        }
      : color
        ? { ...basePalette, fg: color }
        : basePalette;

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
  const { palette } = useAppearance();
  if (count < 1) {
    return (
      <Text style={[styles.mutedText, { color: palette.textMuted }]}>
        {t('rating.none')}
      </Text>
    );
  }
  return (
    <View style={styles.inline}>
      <Text style={styles.star}>★</Text>
      <Text style={[styles.ratingText, { color: palette.text }]}>
        {value.toFixed(1)}
      </Text>
      <Text style={[styles.mutedText, { color: palette.textMuted }]}>
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
          <Avatar uri={technician.avatarUri} name={technician.displayName} size={64} />
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
          {technician.services.length > 0 && (
            <View style={styles.bookableBadgeInline}>
              <Text
                style={[
                  styles.bookableBadgeTextInline,
                  { color: palette.primary },
                ]}
              >
                {language === "en" ? "Bookable Service" : "Layanan Dapat Dipesan"}
              </Text>
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
                ? t('technician.startingPrice', { price: formatMoney(lowestPrice, language) })
                : t('technician.askPrice')}
            </Text>
          </View>
        </View>
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
  const { palette } = useAppearance();
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
      style={({ pressed }) => [
        styles.featuredCard,
        { backgroundColor: palette.surface, borderColor: palette.border },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.featuredTop}>
        <Avatar uri={technician.avatarUri} name={technician.displayName} size={54} />
        <View style={styles.featuredIdentity}>
          <Text
            numberOfLines={1}
            style={[styles.featuredName, { color: palette.text }]}
          >
            {technician.displayName}
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.featuredHeadline, { color: palette.primary }]}
          >
            {headline || t('technician.serviceFallback')}
          </Text>
        </View>
      </View>
      <View style={styles.featuredStats}>
        <Rating value={technician.averageRating} count={technician.reviewCount} />
        {technician.yearsExperience !== undefined && (
          <Text style={[styles.featuredExp, { color: palette.textMuted }]}>
            {technician.yearsExperience} {language === 'en' ? 'yrs exp' : 'thn pengalaman'}
          </Text>
        )}
      </View>
      <View style={[styles.featuredBottom, { borderTopColor: palette.border }]}>
        <Text
          numberOfLines={1}
          style={[styles.featuredArea, { color: palette.textMuted }]}
        >
          {technician.serviceAreas
            .slice(0, 2)
            .map((a) => localizeArea(a, language))
            .join(', ')}
        </Text>
        {lowestPrice !== undefined && (
          <Text style={[styles.featuredPrice, { color: palette.primary }]}>
            {formatMoney(lowestPrice, language)}
          </Text>
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
  const { palette } = useAppearance();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.categoryPill,
        { backgroundColor: palette.surface, borderColor: palette.border },
        selected && {
          backgroundColor: palette.primarySoft,
          borderColor: palette.primary,
        },
        pressed && styles.pressed,
      ]}
    >
      <ServiceCategoryGlyph iconKey={icon} selected={Boolean(selected)} size={40} />
      <Text
        numberOfLines={2}
        style={[
          styles.categoryName,
          { color: palette.text },
          selected && { color: palette.primary },
        ]}
      >
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
  const { palette } = useAppearance();
  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: palette.primarySoft }]}>
        <View style={styles.searchLensCircle} />
        <View style={styles.searchLensHandle} />
      </View>
      <Text style={[styles.emptyTitle, { color: palette.text }]}>{title}</Text>
      <Text style={[styles.emptyDescription, { color: palette.textMuted }]}>
        {description}
      </Text>
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
  const { palette } = useAppearance();
  return (
    <View style={styles.sectionTitle}>
      <View style={styles.sectionTitleCopy}>
        {eyebrow && (
          <Text style={[styles.eyebrow, { color: palette.primary }]}>
            {eyebrow}
          </Text>
        )}
        <Text style={[styles.sectionHeading, { color: palette.text }]}>
          {title}
        </Text>
      </View>
      {trailing &&
        (onTrailingPress ? (
          <Pressable accessibilityRole="button" onPress={onTrailingPress}>
            <Text style={[styles.sectionTrailingAction, { color: palette.primary }]}>
              {trailing}
            </Text>
          </Pressable>
        ) : (
          <Text style={[styles.sectionTrailing, { color: palette.textMuted }]}>
            {trailing}
          </Text>
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
  sampleBadgeText: { color: '#785824', fontSize: font.caption, fontWeight: '800', letterSpacing: 0.8 },
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
  star: { color: '#DCA63C', fontSize: font.title},
  ratingText: { color: colors.ink, fontSize: font.label, fontWeight: '700' },
  mutedText: { color: colors.muted, fontSize: font.body},
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
  avatarColumn: { alignItems: 'center' },
  avatarWrap: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  onlineAvatarBlob: {
    borderRadius: 7,
    borderWidth: 2,
    bottom: 0,
    height: 14,
    position: 'absolute',
    right: 0,
    width: 14,
    zIndex: 2,
  },
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
  statusPillText: { color: colors.ink, fontSize: font.caption, fontWeight: '700' },
  pressed: { opacity: 0.85 },
  cardCopy: { flex: 1, minWidth: 0 },
  nameRow: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  technicianName: { color: colors.ink, flexShrink: 1, fontSize: font.heading, fontWeight: '800', letterSpacing: -0.3 },
  personSubname: { color: colors.muted, fontSize: font.caption, fontWeight: '600', marginTop: 1 },
  verifiedBadge: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    justifyContent: 'center',
  },
  bookableBadgeInline: {
    backgroundColor: 'transparent',
    marginLeft: 4,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  bookableBadgeTextInline: {
    fontSize: font.caption,
    fontWeight: '700',
  },
  compactRatingBadge: {
    alignItems: 'center',
    borderRadius: 5,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  goldStarSmall: {
    color: '#F59E0B',
    fontSize: font.caption,
    fontWeight: '800',
  },
  ratingValueText: {
    fontSize: font.caption,
    fontWeight: '700',
  },
  ratingCountText: {
    fontSize: font.caption,
    fontWeight: '500',
  },
  compactTasksBadge: {
    alignItems: 'center',
    borderRadius: 5,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  tasksBadgeText: {
    fontSize: font.caption,
    fontWeight: '600',
  },
  cardAreaRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    marginRight: 8,
  },
  verified: {
    alignItems: 'center',
    backgroundColor: colors.green,
    borderRadius: 5,
    color: '#fff',
    fontSize: font.caption,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  cardHeadline: { color: '#4B5B55', fontSize: font.label, fontWeight: '500', marginBottom: 6, marginTop: 3 },
  metricsRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  jobsCountBadge: { color: colors.muted, fontSize: font.caption, fontWeight: '600' },
  serviceTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  serviceMiniTag: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 5,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  serviceMiniTagText: { color: colors.ink, fontSize: font.caption, fontWeight: '600' },
  cardFooter: {
    alignItems: 'center',
    borderTopColor: '#F0F1EB',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 9,
  },
  cardArea: { color: colors.muted, flex: 1, fontSize: font.caption, fontWeight: '600', marginRight: 8 },
  priceBadge: {
    backgroundColor: colors.greenSoft,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cardPrice: { color: colors.greenDark, fontSize: font.caption, fontWeight: '800' },
  sampleAvailability: { color: '#896D38', fontSize: font.caption, marginTop: 6 },
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
  featuredName: { color: colors.ink, fontSize: font.title, fontWeight: '800' },
  featuredHeadline: { color: colors.greenDark, fontSize: font.body, fontWeight: '600', marginTop: 2 },
  featuredStats: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  featuredExp: { color: colors.muted, fontSize: font.caption, fontWeight: '600' },
  featuredBottom: {
    alignItems: 'center',
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
  },
  featuredArea: { color: colors.muted, flex: 1, fontSize: font.caption, marginRight: 6 },
  featuredPrice: { color: colors.greenDark, fontSize: font.body, fontWeight: '800' },
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
  categoryName: { color: colors.ink, fontSize: font.caption, fontWeight: '700', textAlign: 'center' },
  categoryNameSelected: { color: colors.greenDark },
  stateBox: { alignItems: 'center', gap: spacing.md, padding: spacing.xxxl },
  stateText: { color: colors.muted, fontSize: font.subtitle},
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
  emptyTitle: { color: colors.ink, fontSize: font.heading, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  emptyDescription: {
    color: colors.muted,
    fontSize: font.label,
    lineHeight: 20,
    maxWidth: 310,
    textAlign: 'center',
  },
  textAction: { padding: spacing.lg },
  textActionLabel: { color: colors.greenDark, fontSize: font.subtitle, fontWeight: '700' },
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
    fontSize: font.caption,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  sectionHeading: { color: colors.ink, fontSize: font.section, fontWeight: '800', letterSpacing: -0.4 },
  sectionTrailing: { color: colors.muted, fontSize: font.body, fontWeight: '600', paddingBottom: 2 },
  sectionTrailingAction: { color: colors.greenDark, fontSize: font.body, fontWeight: '800', paddingBottom: 2 },
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
  primaryButtonText: { color: '#fff', fontSize: font.title, fontWeight: '700' },
});
