import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../auth/AuthProvider';
import { useAppearance } from '../context/AppearanceContext';
import {
  AppNavigationBar,
  EmptyState,
  LoadingState,
  SectionTitle,
  ServiceCategoryGlyph,
} from '../components/marketplace-ui';
import {
  RecommendedTechnicians,
} from '../components/technicians';
import {
  MarketplaceHeader,
  ServiceCategories,
} from '../components/marketplace';
import { useMarketplaceStore } from '../components/marketplace/utils/useMarketplaceStore';
import { loadNotifications } from '../data/notifications';
import { InfiniteFlatList } from '../components/InfiniteFlatList';
import {
  buildCategoryFilters,
} from '../components/search/CategoryTabs';
import { OfflineBanner } from '../components/OfflineBanner';
import { MarketplaceMapSearchModal } from '../components/marketplace/MarketplaceSearch';
import { Post } from '../components/posts/Post';
import {
  filterTechnicians,
  formatRupiah,
  getIndonesianRegions,
  loadCategories,
  loadServiceAreas,
  loadTechnicians,
  shouldUseFixtures,
} from '../data/marketplaceRepository';
import { fixtureTechnicians } from '../data/fixtures';
import { subscribeToReconnect } from '../services/networkStatus';
import {
  loadSavedAddresses,
  loadSavedTechnicianIds,
  loadSelectedArea,
  saveSelectedArea,
} from '../data/marketplaceStore';
import {
  deletePost,
  getInitialMarketplacePostsPageSync,
  loadMarketplacePublishedPostsPage,
  suspendPost,
  updatePost,
} from '../data/postsStore';
import { useInfiniteList } from '../hooks/useInfiniteList';
import { useLanguage } from '../i18n/locale';
import { colors, radii, spacing } from '../theme/tokens';
import type {
  DataSource,
  SavedAddress,
  ServiceCategory,
  Technician,
} from '../types/marketplace';
import type { Post as PostType } from '../types/post';
import { font } from '../theme/typography';

interface PopularTaskItem {
  id: string;
  name: string;
  nameEn: string;
  categorySlug: string;
  startingPrice: number;
  technicianId: string;
  technicianName: string;
}

type MarketplaceListItem = { key: string; kind: 'post'; post: PostType };

let cachedCategories: ServiceCategory[] = [];
let cachedTechnicians: Technician[] = [];
let cachedServiceAreas: string[] = [];
let cachedSavedAddresses: SavedAddress[] = [];
let cachedSavedTechIds: string[] = [];
let cachedSelectedArea = 'Semua area';
let cachedHasMore = false;
let cachedSource: DataSource = shouldUseFixtures() ? 'fixtures' : 'supabase';
let hasInitialLoaded = false;

export default function MarketplaceScreen() {
  const { language, t } = useLanguage();
  const { palette } = useAppearance();
  const { user, roles, effectiveRole } = useAuth();
  const [categories, setCategories] = useState<ServiceCategory[]>(cachedCategories);
  const [technicians, setTechnicians] = useState<Technician[]>(cachedTechnicians);
  const [serviceAreas, setServiceAreas] = useState<string[]>(cachedServiceAreas);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>(cachedSavedAddresses);
  const [savedTechIds, setSavedTechIds] = useState<string[]>(cachedSavedTechIds);
  const [source, setSource] = useState<DataSource>(cachedSource);
  const [area, setArea] = useState(cachedSelectedArea);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [areaModalVisible, setAreaModalVisible] = useState(false);
  const [pinNotice, setPinNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!hasInitialLoaded);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(cachedHasMore);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const refreshInFlightRef = useRef(false);

  const setStoreTechnicians = useMarketplaceStore((s) => s.setTechnicians);
  const appendStoreTechnicians = useMarketplaceStore((s) => s.appendTechnicians);
  const setStoreCategories = useMarketplaceStore((s) => s.setCategories);
  const setStoreServiceAreas = useMarketplaceStore((s) => s.setServiceAreas);
  const setStorePosts = useMarketplaceStore((s) => s.setPosts);
  const setStoreSelectedCategory = useMarketplaceStore((s) => s.setSelectedCategory);
  const setStoreSelectedArea = useMarketplaceStore((s) => s.setSelectedArea);
  const setStoreSavedTechIds = useMarketplaceStore((s) => s.setSavedTechIds);

  useEffect(() => {
    if (!user?.id) return;
    void loadNotifications(user.id).then((items) => {
      setUnreadCount(items.filter((n) => !n.readAt).length);
    });
  }, [user?.id]);

  const categoryFilters = useMemo(
    () => buildCategoryFilters(categories, language, t),
    [categories, language, t],
  );

  const fetchPostPage = useCallback(
    (cursor: string | null, pageSize: number) =>
      loadMarketplacePublishedPostsPage(
        {
          area,
          categorySlug: selectedCategory === 'all' ? undefined : selectedCategory,
        },
        cursor,
        pageSize,
      ),
    [area, selectedCategory],
  );
  const postFeed = useInfiniteList({
    cacheKey: `marketplace-posts:${area}:${selectedCategory}`,
    initialData: () =>
      getInitialMarketplacePostsPageSync(
        {
          area,
          categorySlug: selectedCategory === 'all' ? undefined : selectedCategory,
        },
        10,
      ),
    fetchPage: fetchPostPage,
    keyExtractor: (post: PostType) => post.id,
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
          const nextArea = persistedArea || 'Semua area';
          cachedCategories = categoryResult.items;
          cachedTechnicians = technicianResult.items;
          cachedServiceAreas = areaResult.items;
          cachedSavedAddresses = addresses;
          cachedSavedTechIds = savedIds;
          cachedSelectedArea = nextArea;
          cachedHasMore = technicianResult.hasMore;
          cachedSource = technicianResult.source;
          hasInitialLoaded = true;
          setCategories(categoryResult.items);
          setTechnicians(technicianResult.items);
          setServiceAreas(areaResult.items);
          setSource(technicianResult.source);
          setHasMore(technicianResult.hasMore);
          setArea((prev) => (prev === nextArea ? prev : nextArea));
          setSavedAddresses(addresses);
          setSavedTechIds(savedIds);

          setStoreCategories(categoryResult.items);
          setStoreTechnicians(technicianResult.items);
          setStoreServiceAreas(areaResult.items);
          setStoreSelectedArea(nextArea);
          setStoreSavedTechIds(savedIds);
        },
      )
      .catch(() => {
        if (active && !hasInitialLoaded) setError(true);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [
    reloadKey,
    setStoreCategories,
    setStoreSavedTechIds,
    setStoreSelectedArea,
    setStoreServiceAreas,
    setStoreTechnicians,
    user?.id,
  ]);

  useEffect(() => {
    if (postFeed.items.length > 0) {
      setStorePosts(postFeed.items);
    }
  }, [postFeed.items, setStorePosts]);

  useEffect(() => {
    setStoreSelectedCategory(selectedCategory);
  }, [selectedCategory, setStoreSelectedCategory]);

  const handleSelectArea = useCallback((nextArea: string, customNotice?: string) => {
    cachedSelectedArea = nextArea;
    setArea(nextArea);
    setStoreSelectedArea(nextArea);
    setPinNotice(customNotice ?? null);
    void saveSelectedArea(nextArea);
  }, [setStoreSelectedArea]);

  const technicianById = useMemo(() => {
    const map = new Map<string, Technician>();
    for (const tech of fixtureTechnicians) {
      map.set(tech.id, tech);
    }
    for (const tech of technicians) {
      map.set(tech.id, tech);
    }
    return map;
  }, [technicians]);

  const visibleTechnicians = useMemo(() => {
    return filterTechnicians(
      technicians,
      '',
      area,
      selectedCategory === 'all' ? undefined : selectedCategory,
      { prioritizeArea: true },
    );
  }, [technicians, area, selectedCategory]);

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
      appendStoreTechnicians(page.items);
      setHasMore(page.hasMore);
    } catch {
      setError(true);
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    appendStoreTechnicians,
    error,
    hasMore,
    isLoading,
    isLoadingMore,
    isRefreshing,
    technicians.length,
  ]);

  const loadMoreAll = useCallback(async () => {
    await Promise.all([
      hasMorePosts ? loadMorePosts() : Promise.resolve(),
      hasMore ? loadMoreTechnicians() : Promise.resolve(),
    ]);
  }, [hasMore, hasMorePosts, loadMorePosts, loadMoreTechnicians]);

  const marketplaceItems = useMemo<MarketplaceListItem[]>(() => {
    if (postFeed.loading && postFeed.items.length === 0) {
      return [];
    }
    if (postFeed.items.length === 0) {
      return [];
    }

    // Prioritize bookable service posts at the top of the feed
    const sortedPosts = [...postFeed.items].sort((a, b) => {
      if (a.isServicePost && !b.isServicePost) return -1;
      if (!a.isServicePost && b.isServicePost) return 1;
      return 0;
    });

    return sortedPosts.map((post) => ({
      key: `post-${post.id}`,
      kind: 'post',
      post,
    }));
  }, [postFeed.items, postFeed.loading]);

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

      setStoreCategories(categoryResult.items);
      setStoreTechnicians(technicianResult.items);
      setStoreServiceAreas(areaResult.items);
    } catch {
      // Preserve current visible feed if background refresh fails
    } finally {
      refreshInFlightRef.current = false;
      setIsRefreshing(false);
    }
  }, [
    isLoading,
    refreshPostFeed,
    setStoreCategories,
    setStoreServiceAreas,
    setStoreTechnicians,
  ]);

  useEffect(() => {
    const unsub = subscribeToReconnect(() => {
      void handlePullToRefresh();
    });
    return unsub;
  }, [handlePullToRefresh]);

  const retry = useCallback(() => {
    setIsLoading(true);
    setError(false);
    void refreshPostFeed();
    setReloadKey((key) => key + 1);
  }, [refreshPostFeed]);

  const isAdminRole = roles.includes('admin') || effectiveRole === 'admin';
  const currentUserId = user?.id;

  const handleEditPost = useCallback(
    async (
      post: PostType,
      newCaption: string,
      newImageUri?: string,
      updates?: {
        mediaUrls: string[];
        isServicePost: boolean;
        servicePrice?: number;
        serviceArea?: string;
      },
    ) => {
      if (!currentUserId) return;
      const nextMediaUrls =
        updates?.mediaUrls ?? (newImageUri ? [newImageUri] : []);
      await updatePost({
        actorUserId: currentUserId,
        postId: post.id,
        caption: newCaption,
        imageUri: nextMediaUrls[0],
        mediaUrls: nextMediaUrls,
        isServicePost: updates?.isServicePost ?? post.isServicePost,
        servicePrice: updates?.servicePrice ?? post.servicePrice,
        serviceArea: updates?.serviceArea ?? post.serviceArea,
        isAdmin: isAdminRole,
      });
    },
    [currentUserId, isAdminRole],
  );

  const handleDeletePost = useCallback(
    async (postId: string) => {
      if (!currentUserId) return;
      try {
        await deletePost({ actorUserId: currentUserId, postId, isAdmin: isAdminRole });
      } catch (err) {
        console.warn('[handleDeletePost] Failed to delete post:', err);
      }
    },
    [currentUserId, isAdminRole],
  );

  const handleSuspendPost = useCallback(
    async (postId: string, suspended: boolean) => {
      if (!currentUserId) return;
      await suspendPost({ actorUserId: currentUserId, postId, suspended });
    },
    [currentUserId],
  );

  const extractItemKey = useCallback((item: MarketplaceListItem) => item.key, []);

  const renderMarketplaceItem = useCallback(
    ({ item }: { item: MarketplaceListItem }) => {
      const matchedTech = technicianById.get(item.post.technicianId);
      const startingPrice = matchedTech?.services.find(
        (srv) => typeof srv.startingPrice === 'number',
      )?.startingPrice;

      return (
        <View style={styles.postCardWrap}>
          <Post
            post={item.post}
            flat
            isOwner={Boolean(currentUserId && currentUserId === item.post.technicianId)}
            isAdmin={isAdminRole}
            authorName={matchedTech?.displayName}
            authorAvatarUri={matchedTech?.avatarUri}
            authorVerified={matchedTech?.verified || item.post.technicianVerified}
            authorRating={matchedTech?.averageRating}
            authorReviewCount={matchedTech?.reviewCount}
            serviceStartingPrice={startingPrice}
            onEdit={handleEditPost}
            onDelete={handleDeletePost}
            onSuspend={handleSuspendPost}
          />
        </View>
      );
    },
    [
      currentUserId,
      handleDeletePost,
      handleEditPost,
      handleSuspendPost,
      isAdminRole,
      technicianById,
    ],
  );

  const Header = useMemo(
    () => (
      <View style={styles.contentWidth}>
        <OfflineBanner />
        <ServiceCategories
          categoryFilters={categoryFilters}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />
        {pinNotice ? <Text style={styles.pinNoticeText}>{pinNotice}</Text> : null}

        <RecommendedTechnicians
          technicians={technicians}
          source={source}
          selectedCategory={selectedCategory}
          selectedArea={area}
          onSeeAll={() => router.push('/technicians')}
          onSelectTechnician={(tech) =>
            router.push(`/technician/${encodeURIComponent(tech.id)}`)
          }
          onChatWithTechnician={() => router.push('/messages')}
        />

        {/* Popular Tasks Discovery */}
        {popularTasks.length > 0 && (
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

        {/* Bookmarked / Saved Technicians */}
        {savedTechnicians.length > 0 && (
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
    ),
    [
      area,
      categoryFilters,
      language,
      palette.border,
      palette.primary,
      palette.primarySoft,
      palette.surface,
      palette.text,
      palette.textMuted,
      pinNotice,
      popularTasks,
      savedTechnicians.length,
      selectedCategory,
      source,
      t,
      technicians,
    ],
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
      {/* Profile Header at the TOP */}
      <MarketplaceHeader
        unreadMessagesCount={unreadCount}
        selectedArea={area}
        onPressLocation={() => setAreaModalVisible(true)}
        onPressSearch={() =>
          router.push({
            pathname: '/search',
            params: { area, category: selectedCategory },
          } as never)
        }
        onPressChat={() => router.push('/messages')}
      />

      <View style={styles.feedRoot}>
      <InfiniteFlatList
        style={styles.feedList}
        contentContainerStyle={styles.listContent}
        data={marketplaceItems}
        hasMore={postFeed.hasMore || hasMore}
        loadingMore={postFeed.loadingMore || isLoadingMore}
        onLoadMore={() => {
          void loadMoreAll();
        }}
        keyExtractor={extractItemKey}
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
                selectedCategory !== 'all'
                  ? language === 'en'
                    ? 'No results in this category yet'
                    : 'Belum ada hasil di kategori ini'
                  : hasMore || postFeed.hasMore
                    ? t('home.noAreaMoreTitle')
                    : t('home.noAreaTitle')
              }
              description={
                selectedCategory !== 'all'
                  ? language === 'en'
                    ? 'Try another service category or return to all services.'
                    : 'Coba kategori layanan lain atau tampilkan semua layanan.'
                  : hasMore || postFeed.hasMore
                    ? t('home.noAreaMoreDescription')
                    : t('home.noAreaDescription')
              }
              actionLabel={
                hasMore || postFeed.hasMore
                  ? t('home.loadMore')
                  : selectedCategory !== 'all'
                    ? language === 'en'
                      ? 'Show all categories'
                      : 'Tampilkan semua kategori'
                    : t('home.allAreas')
              }
              onAction={() =>
                hasMore || postFeed.hasMore
                  ? void loadMoreAll()
                  : selectedCategory !== 'all'
                    ? setSelectedCategory('all')
                    : handleSelectArea('Semua area')
              }
            />
          )
        }
        renderItem={renderMarketplaceItem}
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
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing || postFeed.refreshing}
            onRefresh={() => {
              void handlePullToRefresh();
            }}
            progressViewOffset={0}
            tintColor={palette.primary}
            colors={[palette.primary]}
          />
        }
        testID="technician-list"
      />
      </View>

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
      <AppNavigationBar activeTab="marketplace" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.paper,
    flex: 1,
  },
  feedRoot: {
    flex: 1,
    position: 'relative',
  },
  feedList: {
    flex: 1,
  },
  stickySearchHeader: {
    borderBottomWidth: 0,
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 20,
  },
  searchInputShell: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    height: 40,
    overflow: 'hidden',
  },
  marketplaceSearchTrigger: {
    flex: 1,
    height: 40,
  },
  searchHeaderInner: {
    paddingBottom: 6,
  },
  listContent: {
    paddingBottom: 100,
  },
  contentWidth: {
    alignSelf: 'center',
    maxWidth: 820,
    paddingHorizontal: 5,
    paddingTop: 5,
    width: '100%',
  },
  searchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    width: '100%',
  },
  searchLocationInlineButton: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
    flexDirection: 'row',
    height: '100%',
    justifyContent: 'center',
    maxWidth: 124,
    paddingHorizontal: 10,
  },
  searchChatButton: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  chatIconCanvas: {
    alignItems: 'center',
    height: 22,
    justifyContent: 'center',
    position: 'relative',
    width: 22,
  },
  chatBubbleBody: {
    alignItems: 'flex-start',
    borderRadius: 6,
    borderWidth: 1.8,
    gap: 2.5,
    height: 15,
    justifyContent: 'center',
    paddingHorizontal: 3.5,
    width: 19,
  },
  chatLineLong: {
    borderRadius: 1,
    height: 1.8,
    width: 9,
  },
  chatLineShort: {
    borderRadius: 1,
    height: 1.8,
    width: 6,
  },
  chatBubbleTail: {
    borderBottomLeftRadius: 2,
    borderBottomWidth: 1.8,
    borderLeftWidth: 1.8,
    bottom: 2,
    height: 5,
    left: 5,
    position: 'absolute',
    transform: [{ rotate: '-35deg' }],
    width: 5,
  },
  searchLocationValue: {
    flexShrink: 1,
    fontSize: font.body,
    fontWeight: '600',
  },
  locationChevron: {
    fontSize: font.label,
    fontWeight: '800',
  },
  pinNoticeText: {
    color: colors.greenDark,
    fontSize: font.caption,
    fontWeight: '600',
    marginTop: spacing.xs,
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
    fontSize: font.caption,
    lineHeight: 16,
    marginTop: 6,
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
    fontSize: font.body,
    fontWeight: '800',
  },
  popularTaskTitle: {
    color: colors.ink,
    fontSize: font.label,
    fontWeight: '700',
  },
  popularTaskProvider: {
    color: colors.muted,
    fontSize: font.caption,
    marginTop: 2,
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
    fontSize: font.caption,
    fontWeight: '800',
    letterSpacing: 1,
  },
  savedTitle: {
    color: colors.ink,
    fontSize: font.subtitle,
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
    fontSize: font.body,
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
    paddingHorizontal: 5,
    width: '100%',
  },
  postCardWrap: {
    alignSelf: 'center',
    maxWidth: 820,
    width: '100%',
  },
  feedErrorText: {
    color: colors.danger,
    fontSize: font.body,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  feedErrorWrap: {
    alignItems: 'center',
  },
  feedRetryText: {
    color: colors.greenDark,
    fontSize: font.body,
    fontWeight: '700',
    padding: spacing.sm,
  },
  bottomSpace: {
    height: spacing.lg,
  },
});
