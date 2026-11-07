import { memo, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useAppearance } from '../../../context/AppearanceContext';
import { useLanguage } from '../../../i18n/locale';
import { radii, spacing } from '../../../theme/tokens';
import { font } from '../../../theme/typography';
import type { ServiceCategory } from '../../../types/marketplace';
import {
  buildCategoryFilters,
  type CategoryFilter,
} from '../../search/CategoryTabs';

export interface ServiceCategoriesProps {
  categories?: ServiceCategory[];
  categoryFilters?: CategoryFilter[];
  selected: string;
  onSelect: (slug: string) => void;
  testID?: string;
}

export const ServiceCategories = memo(function ServiceCategories({
  categories = [],
  categoryFilters,
  selected,
  onSelect,
  testID,
}: ServiceCategoriesProps) {
  const { language, t } = useLanguage();
  const { palette } = useAppearance();

  const filters = useMemo(() => {
    if (categoryFilters && categoryFilters.length > 0) {
      return categoryFilters;
    }
    return buildCategoryFilters(categories, language, t);
  }, [categoryFilters, categories, language, t]);

  return (
    <View style={styles.container} testID={testID ?? 'marketplace-service-categories'}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {filters.map((category) => {
          const isActive = selected === category.slug;
          return (
            <TouchableOpacity
              key={category.slug}
              activeOpacity={0.7}
              onPress={() => onSelect(category.slug)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`Kategori ${category.label}`}
              testID={`category-tab-${category.slug}`}
              style={[
                styles.categoryPill,
                {
                  backgroundColor: isActive
                    ? palette.primary
                    : palette.surfaceElevated,
                  borderColor: isActive ? palette.primary : palette.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.categoryText,
                  {
                    color: isActive ? '#FFFFFF' : palette.text,
                    fontWeight: isActive ? '700' : '500',
                  },
                ]}
              >
                {category.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xs,
    paddingTop: 4,
    width: '100%',
  },
  scrollContent: {
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.lg,
  },
  categoryPill: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: spacing.md + 2,
  },
  categoryText: {
    fontSize: font.body,
  },
});
