import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { useAppearance } from '../../context/AppearanceContext';
import { categoryName, type Language } from '../../i18n/locale';
import { spacing } from '../../theme/tokens';
import { font } from '../../theme/typography';
import type { ServiceCategory } from '../../types/marketplace';

export interface CategoryFilter {
  slug: string;
  label: string;
}

export const CORE_CATEGORY_FILTERS: Record<string, { id: string; en: string }> = {
  'ac-repair': { id: 'Servis AC', en: 'AC Service' },
  plumbing: { id: 'Plumbing', en: 'Plumbing' },
  electrical: { id: 'Kelistrikan', en: 'Electrical' },
  cleaning: { id: 'Kebersihan', en: 'Cleaning' },
  painting: { id: 'Pengecatan', en: 'Painting' },
  'appliance-repair': { id: 'Perbaikan Elektronik', en: 'Appliance Repair' },
  locksmith: { id: 'Tukang Kunci', en: 'Locksmith' },
  'pest-control': { id: 'Pengendalian Hama', en: 'Pest Control' },
  moving: { id: 'Pindahan', en: 'Moving' },
  renovation: { id: 'Renovasi', en: 'Renovation' },
};

export function buildCategoryFilters(
  categories: ServiceCategory[],
  language: Language,
  t: (key: string, values?: Record<string, string | number>) => string,
): CategoryFilter[] {
  const coreFilters = Object.entries(CORE_CATEGORY_FILTERS).map(([slug, labels]) => ({
    slug,
    label: language === 'en' ? labels.en : labels.id,
  }));
  const knownSlugs = new Set(coreFilters.map((category) => category.slug));
  const additionalFilters = categories
    .filter((category) => !knownSlugs.has(category.slug))
    .map((category) => ({
      slug: category.slug,
      label: categoryName(category.slug, category.name, t),
    }));
  return [
    { slug: 'all', label: language === 'en' ? 'All' : 'Semua' },
    ...coreFilters,
    ...additionalFilters,
  ];
}

export interface CategoryTabsProps {
  categories: CategoryFilter[];
  selected: string;
  onSelect: (slug: string) => void;
  testID?: string;
}

export function CategoryTabs({
  categories,
  selected,
  onSelect,
  testID = 'marketplace-category-filters',
}: CategoryTabsProps) {
  const { palette, isDark } = useAppearance();
  const inactiveFill = isDark ? '#161F2E' : palette.surfaceElevated;
  const inactiveText = isDark ? '#94A3B8' : palette.textMuted;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.container}
      testID={testID}
    >
      {categories.map((category) => {
        const isSelected = selected === category.slug;
        return (
          <Pressable
            key={category.slug}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(category.slug)}
            style={({ pressed }) => [
              styles.tab,
              {
                backgroundColor: isSelected
                  ? palette.primary
                  : inactiveFill,
                borderColor: 'transparent',
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            testID={`category-${category.slug}`}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: isSelected ? '#000000' : inactiveText,
                  fontWeight: isSelected ? '800' : '600',
                },
              ]}
            >
              {category.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  container: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: spacing.xs + 2,
    paddingRight: spacing.md,
    paddingTop: spacing.sm,
  },
  tab: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 0,
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  tabText: {
    fontSize: font.label,
  },
});
