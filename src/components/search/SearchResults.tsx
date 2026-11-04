import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  buildCategoryFilters,
  CategoryTabs,
} from './CategoryTabs';
import { InfiniteFlatList } from '../InfiniteFlatList';
import {
  EmptyState,
  LoadingState,
  SectionTitle,
  TechnicianCard,
} from '../marketplace-ui';
import { SearchField } from './SearchField';
import { TechnicianPostCard } from '../TechnicianPostCard';
import { useAppearance } from '../../context/AppearanceContext';
import {
  filterTechnicians,
  loadCategories,
  loadTechnicians,
} from '../../data/marketplaceRepository';
import { loadMarketplacePublishedPostsPage } from '../../data/postsStore';
import { useInfiniteList } from '../../hooks/useInfiniteList';
import { useLanguage } from '../../i18n/locale';
import { ICON_SIZE, ICON_STROKE } from '../../theme/icons';
import { colors, spacing } from '../../theme/tokens';
import { font } from '../../theme/typography';
import type {
  DataSource,
  ServiceCategory,
  Technician,
  TechnicianPost,
} from '../../types/marketplace';

type SearchParams = {
  area?: string;
  category?: string;
};

type SearchListItem =
  | { key: string; kind: 'technicians-heading' }
  | { key: string; kind: 'technician'; technician: Technician }
  | { key: string; kind: 'posts-heading' }
  | { key: string; kind: 'post'; post: TechnicianPost };

const SEARCH_DEBOUNCE_MS = 300;
const TOP_BAR_HEIGHT = 56;

export default function SearchResults() {
  const { language, t } = useLanguage();
  const { palette } = useAppearance();
  const params = useLocalSearchParams<SearchParams>();

  const area = params.area || 'Semua area';

  const [scrollY] = useState(() => new Animated.Value(0));
  const topBarHeight = scrollY.interpolate({
    inputRange: [0, 88],
    outputRange: [TOP_BAR_HEIGHT, 0],
    extrapolate: 'clamp',
  });
  const topBarOpacity = scrollY.interpolate({
    inputRange: [0, 52],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const topBarScale = scrollY.interpolate({
    inputRange: [0, 88],
    outputRange: [1, 0.92],
    extrapolate: 'clamp',
  });
  const topBarTranslateY = scrollY.interpolate({
    inputRange: [0, 88],
    outputRange: [0, -8],
    extrapolate: 'clamp',
  });

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(
    params.category || 'all',
  );
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [source, setSource] = useState<DataSource>('fixtures');
  const [techniciansLoading, setTechniciansLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let active = true;
    void Promise.all([loadCategories(), loadTechnicians(0, 50)])
      .then(([categoryResult, technicianResult]) => {
        if (!active) return;
        setCategories(categoryResult.items);
        setTechnicians(technicianResult.items);
        setSource(technicianResult.source);
      })
      .catch(() => {
        if (active) {
          setCategories([]);
          setTechnicians([]);
        }
      })
      .finally(() => {
        if (active) setTechniciansLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const categoryFilters = useMemo(
    () => buildCategoryFilters(categories, language, t),
    [categories, language, t],
  );

  const categorySlug =
    selectedCategory === 'all' ? undefined : selectedCategory;

  const matchingTechnicians = useMemo(() => {
    if (!debouncedQuery) return [];
    return filterTechnicians(
      technicians,
      debouncedQuery,
      area,
      categorySlug,
      { prioritizeArea: true },
    ).slice(0, 8);
  }, [area, categorySlug, debouncedQuery, technicians]);

  const fetchPostPage = useCallback(
    (cursor: string | null, pageSize: number) =>
      loadMarketplacePublishedPostsPage(
        {
          area,
          query: debouncedQuery,
          categorySlug,
        },
        cursor,
        pageSize,
      ),
    [area, categorySlug, debouncedQuery],
  );

  const postResults = useInfiniteList({
    cacheKey: `search-posts:${area}:${selectedCategory}:${debouncedQuery.toLowerCase()}`,
    enabled: debouncedQuery.length >= 2,
    fetchPage: fetchPostPage,
    keyExtractor: (post: TechnicianPost) => post.id,
    pageSize: 10,
  });

  const searchItems = useMemo<SearchListItem[]>(() => {
    if (!debouncedQuery) return [];

    const items: SearchListItem[] = [];

    if (matchingTechnicians.length > 0) {
      items.push({ key: 'search-technicians-heading', kind: 'technicians-heading' });
      for (const technician of matchingTechnicians) {
        items.push({
          key: `search-technician-${technician.id}`,
          kind: 'technician',
          technician,
        });
      }
    }

    if (postResults.items.length > 0) {
      items.push({ key: 'search-posts-heading', kind: 'posts-heading' });
      for (const post of postResults.items) {
        items.push({
          key: `search-post-${post.id}`,
          kind: 'post',
          post,
        });
      }
    }

    return items;
  }, [debouncedQuery, matchingTechnicians, postResults.items]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const isSearching =
    debouncedQuery.length >= 2 && (postResults.loading || techniciansLoading);
  const hasResults = searchItems.length > 0;
  const showEmpty = debouncedQuery.length > 0 && !isSearching && !hasResults;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
      testID="search-screen"
    >
      <Animated.View
        style={[
          styles.topBar,
          {
            backgroundColor: palette.background,
            height: topBarHeight,
            opacity: topBarOpacity,
            transform: [
              { translateY: topBarTranslateY },
              { scale: topBarScale },
            ],
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={language === 'en' ? 'Back' : 'Kembali'}
          onPress={handleBack}
          style={styles.backBtn}
          testID="search-back"
        >
          <ChevronLeft
            color={palette.text}
            size={ICON_SIZE + 8}
            strokeWidth={ICON_STROKE}
          />
        </Pressable>
        <SearchField
          accessibilityLabel={t('home.search')}
          autoFocus
          clearAccessibilityLabel={t('home.clearSearch')}
          onChangeText={setQuery}
          onClear={() => setQuery('')}
          placeholder={t('home.search')}
          testID="search-input"
          value={query}
        />
      </Animated.View>

      <CategoryTabs
        categories={categoryFilters}
        selected={selectedCategory}
        onSelect={setSelectedCategory}
        testID="search-category-filters"
      />

      <InfiniteFlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
        data={searchItems}
        hasMore={postResults.hasMore}
        loadingMore={postResults.loadingMore}
        onLoadMore={() => {
          void postResults.loadMore();
        }}
        keyExtractor={(item) => item.key}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          isSearching ? (
            <LoadingState label={t('home.loading')} />
          ) : showEmpty ? (
            <EmptyState
              title={t('home.noSearchTitle')}
              description={t('home.noSearchDescription')}
            />
          ) : undefined
        }
        renderItem={({ item }) => {
          if (item.kind === 'technicians-heading') {
            return (
              <View style={styles.sectionTitle}>
                <SectionTitle
                  title={language === 'en' ? 'Technicians' : 'Teknisi'}
                  trailing={`${matchingTechnicians.length}`}
                />
              </View>
            );
          }
          if (item.kind === 'posts-heading') {
            return (
              <View style={styles.sectionTitle}>
                <SectionTitle
                  title={language === 'en' ? 'Work posts' : 'Postingan pekerjaan'}
                />
              </View>
            );
          }
          if (item.kind === 'technician') {
            return (
              <View style={styles.cardWrap}>
                <TechnicianCard
                  technician={item.technician}
                  source={source}
                  onPress={() =>
                    router.push({
                      pathname: '/technician/[id]',
                      params: { id: item.technician.id },
                    })
                  }
                />
              </View>
            );
          }
          return (
            <View style={styles.cardWrap}>
              <TechnicianPostCard post={item.post} />
            </View>
          );
        }}
        listFooter={
          postResults.error ? (
            <View style={styles.errorWrap}>
              <Text style={[styles.errorText, { color: palette.textMuted }]}>
                {postResults.error}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void postResults.refresh();
                }}
                testID="search-retry"
              >
                <Text style={[styles.retryText, { color: palette.primary }]}>
                  {t('home.retry')}
                </Text>
              </Pressable>
            </View>
          ) : null
        }
        refreshing={postResults.refreshing}
        onRefresh={() => {
          void postResults.refresh();
        }}
        testID="search-results"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.paper,
    flex: 1,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  sectionTitle: {
    paddingHorizontal: spacing.md,
  },
  cardWrap: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  errorWrap: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  errorText: {
    fontSize: font.body,
    textAlign: 'center',
  },
  retryText: {
    fontSize: font.subtitle,
    fontWeight: '800',
  },
});
