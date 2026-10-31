import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../auth/AuthProvider';
import { useAppearance } from '../context/AppearanceContext';
import {
  AppNavigationBar,
  CategoryPill,
  EmptyState,
  FeaturedProfessionalCard,
  LoadingState,
  SectionTitle,
  ServiceCategoryGlyph,
  SourceBadge,
  TechnicianCard,
} from '../components/marketplace-ui';
import { InfiniteFlatList } from '../components/InfiniteFlatList';
import {
  InlineMarketplaceMapCard,
  MarketplaceMapSearchModal,
} from '../components/MarketplaceMapSearch';
import {
  TechnicianPostCard,
  TechnicianPostComposer,
} from '../components/TechnicianPostCard';
import {
  filterTechnicians,
  formatRupiah,
  getIndonesianRegions,
  getMarketplacePreviewReason,
  loadCategories,
  loadServiceAreas,
  loadTechnicians,
} from '../data/marketplaceRepository';
import {
  loadSavedAddresses,
  loadSavedTechnicianIds,
  loadSelectedArea,
  saveSelectedArea,
} from '../data/marketplaceStore';
import {
  createTechnicianPost,
  deleteTechnicianPost,
  loadMarketplacePublishedPostsPage,
  suspendTechnicianPost,
  updateTechnicianPost,
} from '../data/postsStore';
import { useInfiniteList } from '../hooks/useInfiniteList';
import { categoryName, localizeArea, useLanguage } from '../i18n/locale';
import { colors, radii, spacing } from '../theme/tokens';
import type {
  DataSource,
  SavedAddress,
  ServiceCategory,
  Technician,
  TechnicianPost,
} from '../types/marketplace';

interface PopularTaskItem {
  id: string;
  name: string;
  nameEn: string;
  categorySlug: string;
  startingPrice: number;
  technicianId: string;
  technicianName: string;
}

type MarketplaceListItem =
  | { key: string; kind: 'posts-heading' }
  | { key: string; kind: 'technicians-heading' }
  | { key: string; kind: 'post'; post: TechnicianPost }
  | { key: string; kind: 'technician'; technician: Technician };

export default function MarketplaceScreen() {
  const { language, t } = useLanguage();
  const { palette } = useAppearance();
  const { user, roles, effectiveRole } = useAuth();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [savedTechIds, setSavedTechIds] = useState<string[]>([]);
  const [source, setSource] = useState<DataSource>('fixtures');
  const [query, setQuery] = useState('');
  const [area, setArea] = useState('Semua area');
  const [areaModalVisible, setAreaModalVisible] = useState(false);
  const [pinNotice, setPinNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const refreshInFlightRef = useRef(false);

  const fetchPostPage = useCallback(
    (cursor: string | null, pageSize: number) =>
      loadMarketplacePublishedPostsPage({ area, query }, cursor, pageSize),
    [area, query],
  );
  const postFeed = useInfiniteList({
    cacheKey: `marketplace-posts:${area}:${query.trim().toLowerCase()}`,
    fetchPage: fetchPostPage,
    keyExtractor: (post: TechnicianPost) => post.id,
    pageSize: 10,
  });
  const refreshPostFeed = postFeed.refresh;
  const loadMorePosts = postFeed.loadMore;
  const hasMorePosts = postFeed.hasMore;

  const regions = useMemo(() => getIndonesianRegions(), []);

  useEffect(() => {
    let active = true;
    void Promise.all([
      loadCategories(),
      loadTechnicians(),
      loadServiceAreas(),
      loadSelectedArea(),
      loadSavedAddresses(user?.id),
      loadSavedTechnicianIds(user?.id),
    ])
      .then(
        ([
          categoryResult,
          technicianResult,
          areaResult,
          persistedArea,
          addresses,
          savedIds,
        ]) => {
          if (!active) return;
          setCategories(categoryResult.items);
          setTechnicians(technicianResult.items);
          setServiceAreas(areaResult.items);
          setSource(technicianResult.source);
          setHasMore(technicianResult.hasMore);
          setArea(persistedArea || 'Semua area');
          setSavedAddresses(addresses);
          setSavedTechIds(savedIds);
        },
      )
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reloadKey, user?.id]);

  const handleSelectArea = useCallback((nextArea: string, customNotice?: string) => {
    setArea(nextArea);
    setPinNotice(customNotice ?? null);
    void saveSelectedArea(nextArea);
  }, []);

  const visibleTechnicians = useMemo(() => {
    return filterTechnicians(technicians, query, area, undefined, { prioritizeArea: true });
  }, [technicians, query, area]);

  const featuredProfessionals = useMemo(
    () =>
      [...visibleTechnicians]
        .filter((tech) => tech.available)
        .sort((a, b) => b.averageRating - a.averageRating)
        .slice(0, 4),
    [visibleTechnicians],
  );

  const popularTasks = useMemo<PopularTaskItem[]>(() => {
    const items: PopularTaskItem[] = [];
    for (const tech of visibleTechnicians) {
      for (const srv of tech.services) {
        if (srv.startingPrice !== undefined && items.length < 4) {
          items.push({
            id: `${tech.id}-${srv.id}`,
            name: srv.name,
            nameEn: srv.nameEn ?? srv.name,
            categorySlug: srv.categorySlug,
            startingPrice: srv.startingPrice,
            technicianId: tech.id,
            technicianName: tech.businessName || tech.displayName,
          });
        }
      }
    }
    return items;
  }, [visibleTechnicians]);

  const savedTechnicians = useMemo(
    () => technicians.filter((tech) => savedTechIds.includes(tech.id)),
    [savedTechIds, technicians],
  );

  const loadMoreTechnicians = useCallback(async () => {
    if (!hasMore || isLoading || isLoadingMore || isRefreshing || error) return;
    setIsLoadingMore(true);
    try {
      const page = await loadTechnicians(technicians.length);
      setTechnicians((current) => {
        const seen = new Set(current.map((t) => t.id));
        const uniqueNext = page.items.filter((item) => !seen.has(item.id));
        return [...current, ...uniqueNext];
      });
      setHasMore(page.hasMore);
    } catch {
      setError(true);
    } finally {
      setIsLoadingMore(false);
    }
  }, [error, hasMore, isLoading, isLoadingMore, isRefreshing, technicians.length]);

  const loadMoreAll = useCallback(async () => {
    await Promise.all([
      hasMorePosts ? loadMorePosts() : Promise.resolve(),
      hasMore ? loadMoreTechnicians() : Promise.resolve(),
    ]);
  }, [hasMore, hasMorePosts, loadMorePosts, loadMoreTechnicians]);

  const marketplaceItems = useMemo<MarketplaceListItem[]>(() => {
    const items: MarketplaceListItem[] = [];
    if (postFeed.items.length > 0) {
      items.push({ key: 'posts-heading', kind: 'posts-heading' });
      for (const post of postFeed.items) {
        items.push({ key: `post-${post.id}`, kind: 'post', post });
      }
    }
    if (visibleTechnicians.length > 0) {
      items.push({ key: 'technicians-heading', kind: 'technicians-heading' });
      for (const technician of visibleTechnicians) {
        items.push({ key: `technician-${technician.id}`, kind: 'technician', technician });
      }
    }
    return items;
  }, [postFeed.items, visibleTechnicians]);

  const handlePullToRefresh = useCallback(async () => {
    if (refreshInFlightRef.current || isLoading) return;
    refreshInFlightRef.current = true;
    setIsRefreshing(true);
    setError(false);
    try {
      const [categoryResult, technicianResult, areaResult] = await Promise.all([
        loadCategories(),
        loadTechnicians(),
        loadServiceAreas(),
        refreshPostFeed(),
      ]);
      setCategories(categoryResult.items);
      setTechnicians(technicianResult.items);
      setServiceAreas(areaResult.items);
      setSource(technicianResult.source);
      setHasMore(technicianResult.hasMore);
    } catch {
      // Preserve current visible feed if background refresh fails
    } finally {
      refreshInFlightRef.current = false;
      setIsRefreshing(false);
    }
  }, [isLoading, refreshPostFeed]);

  const retry = () => {
    setIsLoading(true);
    setError(false);
    void refreshPostFeed();
    setReloadKey((key) => key + 1);
  };

  const previewReason = getMarketplacePreviewReason();

  const handleCreatePost = async (input: {
    caption: string;
    imageUri?: string;
    mediaUrls?: string[];
    isServicePost: boolean;
  }) => {
    if (!user) {
      router.push('/login');
      return;
    }
    const actorId = user.id;
    const authorName =
      (typeof user.user_metadata?.display_name === 'string' &&
        user.user_metadata.display_name.trim()) ||
      user.email?.split('@')[0] ||
      'Pengguna Cepat';
    const authorAvatar =
      typeof user.user_metadata?.avatar_url === 'string'
        ? user.user_metadata.avatar_url
        : undefined;

    await createTechnicianPost({
      actorUserId: actorId,
      technicianId: actorId,
      technicianName: authorName,
      technicianAvatarUri: authorAvatar,
      technicianVerified: roles.includes('admin') || roles.includes('technician'),
      caption: input.caption,
      imageUri: input.imageUri,
      mediaUrls: input.mediaUrls,
      isServicePost: input.isServicePost,
      serviceArea: area !== 'Semua area' ? area : 'Jakarta Selatan',
      categorySlug: 'plumbing',
      published: true,
    });
    await postFeed.refresh();
  };

  const handleEditPost = async (
    post: TechnicianPost,
    newCaption: string,
    newImageUri?: string,
  ) => {
    if (!user) return;
    await updateTechnicianPost({
      actorUserId: user.id,
      postId: post.id,
      caption: newCaption,
      imageUri: newImageUri,
    });
    await postFeed.refresh();
  };

  const handleDeletePost = async (postId: string) => {
    if (!user) return;
    await deleteTechnicianPost({ actorUserId: user.id, postId });
    await postFeed.refresh();
  };

  const handleSuspendPost = async (postId: string, suspended: boolean) => {
    if (!user) return;
    await suspendTechnicianPost({ actorUserId: user.id, postId, suspended });
    await postFeed.refresh();
  };

  const Header = (
    <View style={styles.contentWidth}>
      {/* Unified Clean Marketplace Search & Location Card */}
      <View
        style={[
          styles.heroCard,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
      >
        <View style={styles.heroTitleWrap}>
          <Text
            style={[styles.welcomeTitle, { color: palette.text }]}
            testID="marketplace-heading"
          >
            {t('home.title')}
          </Text>
          <Text style={[styles.welcomeBody, { color: palette.textMuted }]}>
            {t('home.subtitle')}
          </Text>
        </View>

        <View
          style={[
            styles.searchBox,
            { backgroundColor: palette.inputBg, borderColor: palette.border },
          ]}
        >
          <View style={styles.searchIconBox}>
            <View
              style={[styles.searchCircle, { borderColor: palette.textMuted }]}
            />
            <View
              style={[styles.searchHandle, { backgroundColor: palette.textMuted }]}
            />
          </View>
          <TextInput
            accessibilityLabel={t('home.search')}
            autoCapitalize="none"
            onChangeText={setQuery}
            placeholder={t('home.search')}
            placeholderTextColor={palette.textMuted}
            returnKeyType="search"
            style={[styles.searchInput, { color: palette.text }]}
            testID="marketplace-search"
            value={query}
          />
          {query.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('home.clearSearch')}
              onPress={() => setQuery('')}
              style={[
                styles.clearSearch,
                { backgroundColor: palette.pillBg },
              ]}
              testID="clear-search"
            >
              <Text style={[styles.clearSearchText, { color: palette.textMuted }]}>
                ×
              </Text>
            </Pressable>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t('home.areaLabel')}: ${area}`}
            onPress={() => setAreaModalVisible(true)}
            style={[
              styles.locationButton,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
            testID="area-picker-trigger"
          >
            <View
              style={[
                styles.locationPinBox,
                { backgroundColor: palette.primarySoft },
              ]}
            >
              <View
                style={[
                  styles.locationPinDot,
                  { backgroundColor: palette.primary },
                ]}
              />
            </View>
            <View style={styles.locationTextWrap}>
              <Text
                numberOfLines={1}
                style={[styles.locationValue, { color: palette.text }]}
              >
                {area === 'Semua area'
                  ? t('home.allAreasOption')
                  : localizeArea(area, language)}
              </Text>
            </View>
          </Pressable>
        </View>

        {pinNotice ? <Text style={styles.pinNoticeText}>{pinNotice}</Text> : null}
      </View>

      {/* Inline Post Creator under search input */}
      {user && (
        <View style={styles.marketplaceComposerWrap} testID="marketplace-composer-section">
          <TechnicianPostComposer
            onCreatePost={handleCreatePost}
            technicianProfile={{
              id: user.id,
              displayName:
                (typeof user.user_metadata?.display_name === 'string' &&
                  user.user_metadata.display_name.trim()) ||
                user.email?.split('@')[0] ||
                'Pengguna Cepat',
              avatarUri:
                typeof user.user_metadata?.avatar_url === 'string'
                  ? user.user_metadata.avatar_url
                  : undefined,
            }}
          />
        </View>
      )}

      {/* Clean Area & City Strip */}
      <InlineMarketplaceMapCard
        selectedArea={area}
        onSelectArea={handleSelectArea}
        onOpenFullMap={() => setAreaModalVisible(true)}
        regions={regions}
        technicians={technicians}
      />

      {source === 'fixtures' && (
        <View
          style={[
            styles.previewBanner,
            {
              backgroundColor: palette.surfaceElevated,
              borderColor: palette.border,
            },
          ]}
        >
          <SourceBadge source={source} />
          <Text style={[styles.fixtureNote, { color: palette.textMuted }]}>
            {previewReason === 'invalid'
              ? t('data.previewInvalid')
              : previewReason === 'not_configured'
                ? t('data.previewAbsent')
                : t('home.previewNote')}
          </Text>
        </View>
      )}

      {source === 'supabase' && query.length > 0 && (
        <Text style={styles.searchScopeNote}>{t('home.searchScope')}</Text>
      )}

      {/* Service Categories */}
      <SectionTitle
        eyebrow={t('home.categoryEyebrow')}
        title={t('home.categoryTitle')}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryList}
      >
        {categories.map((category) => (
          <CategoryPill
            key={category.id}
            icon={category.icon}
            name={categoryName(category.slug, category.name, t)}
            onPress={() =>
              router.push({
                pathname: '/category/[slug]',
                params: { slug: category.slug },
              })
            }
            testID={`category-${category.slug}`}
          />
        ))}
      </ScrollView>

      {/* Popular Tasks Discovery */}
      {!query && popularTasks.length > 0 && (
        <>
          <SectionTitle
            eyebrow={t('home.popularServicesEyebrow')}
            title={t('home.popularServicesTitle')}
          />
          <View style={styles.popularGrid}>
            {popularTasks.map((task) => (
              <Pressable
                key={task.id}
                accessibilityRole="button"
                onPress={() =>
                  router.push({
                    pathname: '/technician/[id]',
                    params: { id: task.technicianId },
                  })
                }
                style={[
                  styles.popularTaskCard,
                  { backgroundColor: palette.surface, borderColor: palette.border },
                ]}
                testID={`popular-task-${task.id}`}
              >
                <View style={styles.popularTaskHeader}>
                  <View
                    style={[
                      styles.popularTaskGlyph,
                      { backgroundColor: palette.primarySoft },
                    ]}
                  >
                    <ServiceCategoryGlyph
                      icon={task.categorySlug}
                      size={18}
                      color={palette.primary}
                    />
                  </View>
                  <Text style={[styles.popularTaskPrice, { color: palette.primary }]}>
                    {formatRupiah(task.startingPrice, language)}
                  </Text>
                </View>
                <Text
                  numberOfLines={1}
                  style={[styles.popularTaskTitle, { color: palette.text }]}
                >
                  {language === 'en' ? task.nameEn : task.name}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[styles.popularTaskProvider, { color: palette.textMuted }]}
                >
                  {task.technicianName}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {/* Featured Professionals */}
      {!query && featuredProfessionals.length > 0 && (
        <>
          <SectionTitle
            eyebrow={t('home.featuredProsEyebrow')}
            title={t('home.featuredProsTitle')}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredList}
          >
            {featuredProfessionals.map((tech) => (
              <FeaturedProfessionalCard
                key={tech.id}
                technician={tech}
                onPress={() =>
                  router.push({
                    pathname: '/technician/[id]',
                    params: { id: tech.id },
                  })
                }
              />
            ))}
          </ScrollView>
        </>
      )}

      {/* Bookmarked / Saved Technicians */}
      {!query && savedTechnicians.length > 0 && (
        <View style={styles.savedHighlightBar}>
          <View style={styles.savedHighlightCopy}>
            <Text style={styles.savedEyebrow}>{t('home.savedSectionEyebrow')}</Text>
            <Text style={styles.savedTitle}>
              {t('home.savedSectionTitle')} ({savedTechnicians.length})
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/bookings')}
            style={styles.savedActionBtn}
            testID="open-saved-technicians"
          >
            <Text style={styles.savedActionText}>{t('nav.bookings')} →</Text>
          </Pressable>
        </View>
      )}

    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
      <AppNavigationBar activeTab="marketplace" />
      <InfiniteFlatList
        contentContainerStyle={styles.listContent}
        data={marketplaceItems}
        hasMore={postFeed.hasMore || hasMore}
        loadingMore={postFeed.loadingMore || isLoadingMore}
        onLoadMore={() => {
          void loadMoreAll();
        }}
        keyExtractor={(item) => item.key}
        ListHeaderComponent={Header}
        ListEmptyComponent={
          isLoading || postFeed.loading ? (
            <LoadingState label={t('home.loading')} />
          ) : error || postFeed.error ? (
            <EmptyState
              title={t('profile.loadErrorTitle')}
              description={t('home.loadError')}
              actionLabel={t('home.retry')}
              onAction={retry}
            />
          ) : (
            <EmptyState
              title={
                query
                  ? hasMore || postFeed.hasMore
                    ? t('home.noSearchMoreTitle')
                    : t('home.noSearchTitle')
                  : hasMore || postFeed.hasMore
                    ? t('home.noAreaMoreTitle')
                    : t('home.noAreaTitle')
              }
              description={
                query
                  ? hasMore || postFeed.hasMore
                    ? t('home.noSearchMoreDescription')
                    : t('home.noSearchDescription')
                  : hasMore || postFeed.hasMore
                    ? t('home.noAreaMoreDescription')
                    : t('home.noAreaDescription')
              }
              actionLabel={
                hasMore || postFeed.hasMore
                  ? t('home.loadMore')
                  : query
                    ? t('home.clearSearch')
                    : t('home.allAreas')
              }
              onAction={() =>
                hasMore || postFeed.hasMore
                  ? void loadMoreAll()
                  : query
                    ? setQuery('')
                    : handleSelectArea('Semua area')
              }
            />
          )
        }
        renderItem={({ item }) => {
          if (item.kind === 'posts-heading') {
            return (
              <View style={styles.feedSectionTitle} testID="marketplace-posts-section">
                <SectionTitle
                  eyebrow={language === 'en' ? 'TECHNICIAN WORK FEED' : 'FEED PEKERJAAN TEKNISI'}
                  title={
                    language === 'en'
                      ? 'Recent Work Posts from Technicians'
                      : 'Postingan Pekerjaan Terbaru Teknisi'
                  }
                  trailing={`${postFeed.items.length}${postFeed.hasMore ? '+' : ''}`}
                />
              </View>
            );
          }
          if (item.kind === 'technicians-heading') {
            return (
              <View style={styles.feedSectionTitle}>
                <SectionTitle
                  eyebrow={
                    area === 'Semua area'
                      ? t('home.featuredEyebrow')
                      : t('home.areaEyebrow', {
                          area: localizeArea(area, language).toLocaleUpperCase(
                            language === 'id' ? 'id-ID' : 'en-US',
                          ),
                        })
                  }
                  title={query ? t('home.searchResultsTitle') : t('home.resultsTitle')}
                  trailing={`${visibleTechnicians.length}${hasMore ? '+' : ''} ${t('home.profiles')}`}
                />
              </View>
            );
          }
          if (item.kind === 'post') {
            return (
              <View style={styles.postCardWrap}>
                <TechnicianPostCard
                  post={item.post}
                  isOwner={Boolean(user?.id && user.id === item.post.technicianId)}
                  isAdmin={roles.includes('admin') || effectiveRole === 'admin'}
                  onEdit={handleEditPost}
                  onDelete={handleDeletePost}
                  onSuspend={handleSuspendPost}
                />
              </View>
            );
          }
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
        }}
        listFooter={
          <>
            {postFeed.error ? (
              <View style={styles.feedErrorWrap}>
                <Text style={styles.feedErrorText}>
                  {postFeed.error.includes('technician_posts') ||
                  postFeed.error.includes('PGRST205')
                    ? language === 'en'
                      ? `${postFeed.error} Apply the technician_posts Supabase migration, then refresh the API schema cache.`
                      : `${postFeed.error} Terapkan migrasi technician_posts di Supabase, lalu segarkan cache skema API.`
                    : postFeed.error}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    void refreshPostFeed();
                  }}
                  testID="marketplace-post-feed-retry"
                >
                  <Text style={styles.feedRetryText}>
                    {language === 'en' ? 'Try again' : 'Coba lagi'}
                  </Text>
                </Pressable>
              </View>
            ) : null}
            <View style={styles.bottomSpace} />
          </>
        }
        refreshing={isRefreshing || postFeed.refreshing}
        onRefresh={() => {
          void handlePullToRefresh();
        }}
        testID="technician-list"
      />

      <MarketplaceMapSearchModal
        visible={areaModalVisible}
        onClose={() => setAreaModalVisible(false)}
        selectedArea={area}
        onSelectArea={handleSelectArea}
        regions={regions}
        serviceAreas={serviceAreas}
        savedAddresses={savedAddresses}
        technicians={technicians}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.paper,
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
  contentWidth: {
    alignSelf: 'center',
    maxWidth: 820,
    paddingHorizontal: 5,
    paddingTop: spacing.sm,
    width: '100%',
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    marginBottom: spacing.sm,
    padding: spacing.lg,
    width: '100%',
  },
  heroTitleWrap: {
    alignItems: 'center',
    marginBottom: spacing.xs,
    width: '100%',
  },
  locationButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    height: 32,
    marginLeft: spacing.xs,
    paddingHorizontal: 8,
  },
  locationPinBox: {
    alignItems: 'center',
    backgroundColor: colors.greenSoft,
    borderRadius: 5,
    height: 16,
    justifyContent: 'center',
    width: 16,
  },
  locationPinDot: {
    backgroundColor: colors.greenDark,
    borderRadius: 2,
    height: 6,
    width: 6,
  },
  locationTextWrap: {
    maxWidth: 95,
  },
  locationValue: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '700',
  },
  welcomeTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 28,
    textAlign: 'center',
  },
  welcomeBody: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
    textAlign: 'center',
  },
  searchBox: {
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    height: 44,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    width: '100%',
  },
  searchIconBox: {
    alignItems: 'center',
    height: 20,
    justifyContent: 'center',
    marginRight: spacing.xs,
    width: 20,
  },
  searchCircle: {
    borderColor: '#65676B',
    borderRadius: 5,
    borderWidth: 2,
    height: 12,
    width: 12,
  },
  searchHandle: {
    backgroundColor: '#65676B',
    borderRadius: 1,
    height: 5,
    marginRight: -9,
    marginTop: -2,
    transform: [{ rotate: '-45deg' }],
    width: 2,
  },
  searchInput: {
    color: colors.ink,
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  clearSearch: {
    alignItems: 'center',
    backgroundColor: colors.line,
    borderRadius: 5,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  clearSearchText: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 18,
  },
  pinNoticeText: {
    color: colors.greenDark,
    fontSize: 11,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  marketplaceComposerWrap: {
    marginTop: spacing.md,
    width: '100%',
  },
  previewBanner: {
    backgroundColor: '#FFFBF2',
    borderColor: '#EDE3CC',
    borderRadius: radii.md,
    borderWidth: 1,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  fixtureNote: {
    color: '#80683F',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 6,
  },
  searchScopeNote: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: spacing.sm,
  },
  categoryList: {
    paddingBottom: 4,
    paddingRight: 20,
  },
  popularGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  popularTaskCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    flexBasis: '48%',
    flexGrow: 1,
    padding: spacing.md,
  },
  popularTaskHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  popularTaskGlyph: {
    alignItems: 'center',
    backgroundColor: colors.greenSoft,
    borderRadius: 10,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  popularTaskPrice: {
    color: colors.greenDark,
    fontSize: 12,
    fontWeight: '800',
  },
  popularTaskTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  popularTaskProvider: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  featuredList: {
    paddingBottom: 4,
    paddingRight: 20,
  },
  savedHighlightBar: {
    alignItems: 'center',
    backgroundColor: colors.greenSoft,
    borderColor: '#CBE0D4',
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    padding: spacing.md,
  },
  savedHighlightCopy: {
    flex: 1,
  },
  savedEyebrow: {
    color: colors.green,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  savedTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  savedActionBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  savedActionText: {
    color: colors.greenDark,
    fontSize: 12,
    fontWeight: '700',
  },
  cardWrap: {
    alignSelf: 'center',
    maxWidth: 820,
    paddingHorizontal: 5,
    width: '100%',
  },
  feedSectionTitle: {
    alignSelf: 'center',
    maxWidth: 820,
    paddingHorizontal: spacing.md,
    width: '100%',
  },
  postCardWrap: {
    alignSelf: 'center',
    maxWidth: 820,
    paddingHorizontal: 5,
    width: '100%',
  },
  feedErrorText: {
    color: colors.danger,
    fontSize: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  feedErrorWrap: {
    alignItems: 'center',
  },
  feedRetryText: {
    color: colors.greenDark,
    fontSize: 12,
    fontWeight: '700',
    padding: spacing.sm,
  },
  bottomSpace: {
    height: spacing.lg,
  },
});
