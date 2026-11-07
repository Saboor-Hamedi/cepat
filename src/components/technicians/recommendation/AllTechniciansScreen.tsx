import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppearance } from '../../../context/AppearanceContext';
import { loadCategories, loadTechnicians } from '../../../data/marketplaceRepository';
import { useLanguage } from '../../../i18n/locale';
import { spacing } from '../../../theme/tokens';
import type { ServiceCategory, Technician } from '../../../types/marketplace';
import { BackHeader } from '../../BackHeader';
import { useMarketplaceStore } from '../utils/useMarketplaceStore';
import { calculateRecommendationScore } from './RecommendedTechnicians';
import { TechnicianFilters } from './TechnicianFilters';
import { TechnicianListItem } from './TechnicianListItem';
import type {
  AllTechniciansScreenProps,
  TechnicianFiltersState,
} from './technicianRecommendation.types';

export function AllTechniciansScreen({
  initialCategory = 'all',
  initialArea = 'Semua area',
  onBack,
}: AllTechniciansScreenProps) {
  const { language } = useLanguage();
  const { palette } = useAppearance();

  const cachedTechnicians = useMarketplaceStore((s) => s.technicians);
  const cachedCategories = useMarketplaceStore((s) => s.categories);
  const setStoreTechnicians = useMarketplaceStore((s) => s.setTechnicians);
  const setStoreCategories = useMarketplaceStore((s) => s.setCategories);

  const [allTechnicians, setAllTechnicians] = useState<Technician[]>(cachedTechnicians);
  const [categories, setCategories] = useState<ServiceCategory[]>(cachedCategories);
  const [loading, setLoading] = useState(cachedTechnicians.length === 0);
  const [refreshing, setRefreshing] = useState(false);

  const [filters, setFilters] = useState<TechnicianFiltersState>({
    category: initialCategory,
    area: initialArea,
    query: '',
    minRating: 0,
    availableOnly: false,
    sortBy: 'recommended',
  });

  const fetchData = useCallback(async () => {
    try {
      const [techResult, catResult] = await Promise.all([
        loadTechnicians(0, 50),
        loadCategories(),
      ]);
      setAllTechnicians(techResult.items);
      setCategories(catResult.items);
      if (techResult.items.length > 0) {
        setStoreTechnicians(techResult.items);
      }
      if (catResult.items.length > 0) {
        setStoreCategories(catResult.items);
      }
    } catch (err) {
      console.warn('[AllTechniciansScreen] Error loading data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [setStoreCategories, setStoreTechnicians]);

  useEffect(() => {
    let active = true;
    Promise.all([loadTechnicians(0, 50), loadCategories()])
      .then(([techResult, catResult]) => {
        if (!active) return;
        setAllTechnicians(techResult.items);
        setCategories(catResult.items);
        if (techResult.items.length > 0) {
          setStoreTechnicians(techResult.items);
        }
        if (catResult.items.length > 0) {
          setStoreCategories(catResult.items);
        }
      })
      .catch((err) => {
        console.warn('[AllTechniciansScreen] Error loading data:', err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [setStoreCategories, setStoreTechnicians]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchData();
  }, [fetchData]);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const handleUpdateFilters = useCallback(
    (updates: Partial<TechnicianFiltersState>) => {
      setFilters((prev) => ({ ...prev, ...updates }));
    },
    [],
  );

  // Filter and rank best performing technicians
  const filteredTechnicians = useMemo(() => {
    let result = [...allTechnicians];

    // Category filter
    if (filters.category && filters.category !== 'all') {
      const matchSlug = filters.category.toLowerCase();
      result = result.filter((tech) =>
        tech.services?.some(
          (s) =>
            s.categorySlug?.toLowerCase() === matchSlug ||
            s.categoryName?.toLowerCase() === matchSlug,
        ),
      );
    }

    // Rating filter (e.g. 4.5+)
    if (filters.minRating > 0) {
      result = result.filter(
        (tech) => (tech.averageRating || 0) >= filters.minRating,
      );
    }

    // Available only filter
    if (filters.availableOnly) {
      result = result.filter((tech) => Boolean(tech.available));
    }

    // Sorting: best performing technicians
    if (filters.sortBy === 'reviews') {
      result.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
    } else if (filters.sortBy === 'rating') {
      result.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
    } else {
      // 'recommended': Bayesian score
      result.sort((a, b) => {
        if (a.id === 'demo-rizky') return -1;
        if (b.id === 'demo-rizky') return 1;
        return calculateRecommendationScore(b) - calculateRecommendationScore(a);
      });
    }

    return result;
  }, [allTechnicians, filters]);

  const categoryOptions = useMemo(() => {
    return [
      { slug: 'all', name: 'Semua', nameEn: 'All' },
      ...categories.map((c) => ({
        slug: c.slug,
        name: c.name,
        nameEn: c.name,
      })),
    ];
  }, [categories]);

  const ListHeader = useMemo(
    () => (
      <View style={styles.headerControls}>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.eyebrow, { color: palette.primary }]}>
            {language === 'en' ? 'TOP PERFORMANCE' : 'PERFORMA TERBAIK'}
          </Text>
          <Text style={[styles.sectionHeading, { color: palette.text }]}>
            {language === 'en'
              ? 'Best Performing Technicians'
              : 'Teknisi Terbaik'}
          </Text>
        </View>

        <TechnicianFilters
          filters={filters}
          onUpdateFilters={handleUpdateFilters}
          categories={categoryOptions}
        />
      </View>
    ),
    [categoryOptions, filters, handleUpdateFilters, language, palette.primary, palette.text],
  );

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.safeArea, { backgroundColor: palette.background }]}
    >
      {/* Standard Clean BackHeader */}
      <BackHeader
        title={language === 'en' ? 'Technicians' : 'Teknisi'}
        onPressBack={handleBack}
      />

      {/* Main List */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={[styles.loadingText, { color: palette.textMuted }]}>
            {language === 'en'
              ? 'Loading technicians...'
              : 'Memuat data teknisi...'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredTechnicians}
          keyExtractor={(item) => `all-tech-${item.id}`}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <TechnicianListItem technician={item} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={palette.primary}
              colors={[palette.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={[styles.emptyTitle, { color: palette.text }]}>
                {language === 'en'
                  ? 'No technicians found'
                  : 'Tidak ada teknisi ditemukan'}
              </Text>
              <Text style={[styles.emptyDesc, { color: palette.textMuted }]}>
                {language === 'en'
                  ? 'Try selecting another category or adjusting filters.'
                  : 'Coba pilih kategori lain atau sesuaikan filter.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerControls: {
    marginBottom: spacing.xs,
    width: '100%',
  },
  headerTitleWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  listContent: {
    paddingBottom: spacing.xxxl,
  },
  centerBox: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    fontSize: 12,
    marginTop: spacing.md,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxxl,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 12,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
});
