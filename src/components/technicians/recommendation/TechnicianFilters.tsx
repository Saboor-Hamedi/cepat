import { Check, Star } from 'lucide-react-native';
import { memo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useAppearance } from '../../../context/AppearanceContext';
import { useLanguage } from '../../../i18n/locale';
import { radii, spacing } from '../../../theme/tokens';
import { font } from '../../../theme/typography';
import type { TechnicianFiltersState } from './technicianRecommendation.types';

interface FilterOption {
  slug: string;
  name: string;
  nameEn: string;
}

const DEFAULT_CATEGORIES: FilterOption[] = [
  { slug: 'all', name: 'Semua', nameEn: 'All' },
  { slug: 'ac-service', name: 'Servis AC', nameEn: 'AC Service' },
  { slug: 'plumbing', name: 'Pipa & Ledeng', nameEn: 'Plumbing' },
  { slug: 'electrical', name: 'Kelistrikan', nameEn: 'Electrical' },
  { slug: 'cleaning', name: 'Pembersihan', nameEn: 'Cleaning' },
  { slug: 'painting', name: 'Pengecatan', nameEn: 'Painting' },
  { slug: 'renovation', name: 'Renovasi', nameEn: 'Renovation' },
];

interface TechnicianFiltersProps {
  filters: TechnicianFiltersState;
  onUpdateFilters: (updates: Partial<TechnicianFiltersState>) => void;
  categories?: FilterOption[];
  testID?: string;
}

export const TechnicianFilters = memo(function TechnicianFilters({
  filters,
  onUpdateFilters,
  categories = DEFAULT_CATEGORIES,
  testID,
}: TechnicianFiltersProps) {
  const { language } = useLanguage();
  const { palette } = useAppearance();

  return (
    <View style={styles.container} testID={testID ?? 'technician-filters'}>
      {/* Category Pills Row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
      >
        {categories.map((cat) => {
          const isActive = filters.category === cat.slug;
          const label = language === 'en' ? cat.nameEn : cat.name;

          return (
            <TouchableOpacity
              key={cat.slug}
              activeOpacity={0.7}
              onPress={() => onUpdateFilters({ category: cat.slug })}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: isActive ? palette.primary : palette.surfaceElevated,
                  borderColor: isActive ? palette.primary : palette.border,
                },
              ]}
              testID={`tech-filter-cat-${cat.slug}`}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  {
                    color: isActive ? '#FFFFFF' : palette.text,
                    fontWeight: isActive ? '700' : '500',
                  },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Secondary Quick Filters Row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickFilterScroll}
      >
        {/* Highest Rated (4.5+) */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() =>
            onUpdateFilters({
              minRating: filters.minRating > 0 ? 0 : 4.5,
            })
          }
          style={[
            styles.quickChip,
            {
              backgroundColor:
                filters.minRating > 0 ? palette.primarySoft : palette.surface,
              borderColor: filters.minRating > 0 ? palette.primary : palette.border,
            },
          ]}
          testID="tech-filter-high-rating"
        >
          <Star
            size={12}
            color={filters.minRating > 0 ? palette.primary : '#FBBF24'}
            fill={filters.minRating > 0 ? palette.primary : '#FBBF24'}
          />
          <Text
            style={[
              styles.quickChipText,
              {
                color: filters.minRating > 0 ? palette.primary : palette.text,
                fontWeight: filters.minRating > 0 ? '700' : '500',
              },
            ]}
          >
            4.5+ ★
          </Text>
        </TouchableOpacity>

        {/* Available Now */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() =>
            onUpdateFilters({
              availableOnly: !filters.availableOnly,
            })
          }
          style={[
            styles.quickChip,
            {
              backgroundColor: filters.availableOnly
                ? palette.primarySoft
                : palette.surface,
              borderColor: filters.availableOnly ? palette.primary : palette.border,
            },
          ]}
          testID="tech-filter-available"
        >
          <View
            style={[
              styles.availableDot,
              {
                backgroundColor: filters.availableOnly
                  ? palette.primary
                  : '#10B981',
              },
            ]}
          />
          <Text
            style={[
              styles.quickChipText,
              {
                color: filters.availableOnly ? palette.primary : palette.text,
                fontWeight: filters.availableOnly ? '700' : '500',
              },
            ]}
          >
            {language === 'en' ? 'Available Now' : 'Tersedia Sekarang'}
          </Text>
        </TouchableOpacity>

        {/* Most Reviewed */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() =>
            onUpdateFilters({
              sortBy: filters.sortBy === 'reviews' ? 'recommended' : 'reviews',
            })
          }
          style={[
            styles.quickChip,
            {
              backgroundColor:
                filters.sortBy === 'reviews' ? palette.primarySoft : palette.surface,
              borderColor:
                filters.sortBy === 'reviews' ? palette.primary : palette.border,
            },
          ]}
          testID="tech-filter-reviews"
        >
          {filters.sortBy === 'reviews' && (
            <Check size={12} color={palette.primary} />
          )}
          <Text
            style={[
              styles.quickChipText,
              {
                color:
                  filters.sortBy === 'reviews' ? palette.primary : palette.text,
                fontWeight: filters.sortBy === 'reviews' ? '700' : '500',
              },
            ]}
          >
            {language === 'en' ? 'Most Reviewed' : 'Paling Banyak Diulas'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
    width: '100%',
  },
  categoryScroll: {
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.lg,
  },
  categoryChip: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  categoryChipText: {
    fontSize: font.caption,
  },
  quickFilterScroll: {
    gap: spacing.xs + 2,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  quickChip: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    height: 30,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm + 4,
  },
  quickChipText: {
    fontSize: font.caption - 1,
  },
  availableDot: {
    borderRadius: 999,
    height: 7,
    width: 7,
  },
});
