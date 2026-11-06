import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowUpDown,
  Check,
  ChevronDown,
  Clock,
  Droplets,
  Grid,
  Home,
  Layers,
  MapPin,
  Paintbrush,
  Search,
  Sparkles,
  Wind,
  Wrench,
  X,
  Zap,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppearance } from "../../context/AppearanceContext";
import {
  filterTechnicians,
  loadCategories,
  loadServiceAreas,
  loadTechnicians,
} from "../../data/marketplaceRepository";
import { loadMarketplacePublishedPostsPage } from "../../data/postsStore";
import { useInfiniteList } from "../../hooks/useInfiniteList";
import { localizeArea, useLanguage } from "../../i18n/locale";
import { getStoredJson, setStoredJson } from "../../storage/kvStorage";
import { ICON_STROKE } from "../../theme/icons";
import { colors, radii, spacing } from "../../theme/tokens";
import { font } from "../../theme/typography";
import type {
  DataSource,
  ServiceCategory,
  Technician,
} from "../../types/marketplace";
import type { Post as PostType } from "../../types/post";
import { BackHeader } from "../BackHeader";
import { InfiniteFlatList } from "../InfiniteFlatList";
import {
  EmptyState,
  LoadingState,
  SectionTitle,
  TechnicianCard,
} from "../marketplace-ui";
import { Post } from "../posts/Post";
import {
  buildCategoryFilters,
  CategoryTabs,
} from "./CategoryTabs";
import { SearchField } from "./SearchField";

const SEARCH_DEBOUNCE_MS = 220;
const RECENT_SEARCHES_KEY = "@cepat/recent-searches:v1";
const MAX_RECENT_SEARCHES = 8;

const DEFAULT_RECENT_SEARCHES = [
  "AC repair",
  "Water leak",
  "Electrician near me",
  "House cleaning",
];

const POPULAR_SEARCH_CHIPS: { id: string; en: string; labelId: string }[] = [
  { id: "ac-service", en: "AC service", labelId: "Servis AC" },
  { id: "plumbing", en: "Plumbing", labelId: "Plumbing" },
  { id: "electrical", en: "Electrical", labelId: "Kelistrikan" },
  { id: "cleaning", en: "Cleaning", labelId: "Kebersihan" },
  { id: "house-repair", en: "House repair", labelId: "Perbaikan rumah" },
  { id: "water-heater", en: "Water heater", labelId: "Water heater" },
  { id: "home-renovation", en: "Home renovation", labelId: "Renovasi rumah" },
];

interface BrowseServiceCard {
  id: string;
  slug: string;
  en: string;
  labelId: string;
  iconColor: string;
  iconBg: string;
  iconKind:
    | "ac"
    | "plumbing"
    | "electrical"
    | "cleaning"
    | "repair"
    | "painting"
    | "renovation"
    | "more";
}

const BROWSE_SERVICE_GRID: BrowseServiceCard[] = [
  {
    id: "ac-repair",
    slug: "ac-repair",
    en: "AC Service",
    labelId: "Servis AC",
    iconColor: "#3B82F6",
    iconBg: "rgba(59, 130, 246, 0.12)",
    iconKind: "ac",
  },
  {
    id: "plumbing",
    slug: "plumbing",
    en: "Plumbing",
    labelId: "Plumbing",
    iconColor: "#0EA5E9",
    iconBg: "rgba(14, 165, 233, 0.12)",
    iconKind: "plumbing",
  },
  {
    id: "electrical",
    slug: "electrical",
    en: "Electrical",
    labelId: "Kelistrikan",
    iconColor: "#F59E0B",
    iconBg: "rgba(245, 158, 11, 0.12)",
    iconKind: "electrical",
  },
  {
    id: "cleaning",
    slug: "cleaning",
    en: "Cleaning",
    labelId: "Kebersihan",
    iconColor: "#8B5CF6",
    iconBg: "rgba(139, 92, 246, 0.12)",
    iconKind: "cleaning",
  },
  {
    id: "appliance-repair",
    slug: "appliance-repair",
    en: "Home Repair",
    labelId: "Perbaikan Rumah",
    iconColor: "#F97316",
    iconBg: "rgba(249, 115, 22, 0.12)",
    iconKind: "repair",
  },
  {
    id: "painting",
    slug: "painting",
    en: "Painting",
    labelId: "Pengecatan",
    iconColor: "#A855F7",
    iconBg: "rgba(168, 85, 247, 0.12)",
    iconKind: "painting",
  },
  {
    id: "renovation",
    slug: "renovation",
    en: "Renovation",
    labelId: "Renovasi",
    iconColor: "#14B8A6",
    iconBg: "rgba(20, 184, 166, 0.12)",
    iconKind: "renovation",
  },
  {
    id: "more-services",
    slug: "locksmith",
    en: "More Services",
    labelId: "Layanan Lain",
    iconColor: "#64748B",
    iconBg: "rgba(100, 116, 139, 0.12)",
    iconKind: "more",
  },
];

export type SearchSortMode = "relevance" | "recent" | "popular";

const HASHTAG_QUERY_MAP: Record<string, { query: string; category?: string }> = {
  acservice: { query: "AC", category: "ac-repair" },
  acrepair: { query: "AC", category: "ac-repair" },
  plumbing: { query: "plumbing", category: "plumbing" },
  electrician: { query: "electrical", category: "electrical" },
  electrical: { query: "electrical", category: "electrical" },
  cleaning: { query: "cleaning", category: "cleaning" },
  painting: { query: "painting", category: "painting" },
  renovation: { query: "renovation", category: "renovation" },
  homerepair: { query: "repair", category: "appliance-repair" },
};

function normalizeQueryForFilter(rawQuery: string): string {
  const trimmed = rawQuery.trim();
  if (!trimmed.startsWith("#")) {
    return trimmed;
  }
  const tag = trimmed.replace(/^#+/, "").trim().toLowerCase();
  return HASHTAG_QUERY_MAP[tag]?.query ?? tag;
}

function renderBrowseIcon(
  kind: BrowseServiceCard["iconKind"],
  color: string,
) {
  switch (kind) {
    case "ac":
      return <Wind color={color} size={20} strokeWidth={ICON_STROKE} />;
    case "plumbing":
      return <Droplets color={color} size={20} strokeWidth={ICON_STROKE} />;
    case "electrical":
      return <Zap color={color} size={20} strokeWidth={ICON_STROKE} />;
    case "cleaning":
      return <Sparkles color={color} size={20} strokeWidth={ICON_STROKE} />;
    case "repair":
      return <Wrench color={color} size={20} strokeWidth={ICON_STROKE} />;
    case "painting":
      return <Paintbrush color={color} size={20} strokeWidth={ICON_STROKE} />;
    case "renovation":
      return <Home color={color} size={20} strokeWidth={ICON_STROKE} />;
    default:
      return <Grid color={color} size={20} strokeWidth={ICON_STROKE} />;
  }
}

type SearchListItem =
  | { key: "technicians-heading"; kind: "technicians-heading" }
  | { key: string; kind: "technician"; technician: Technician }
  | { key: "posts-heading"; kind: "posts-heading" }
  | { key: string; kind: "post"; post: PostType };

export function SearchResults() {
  const { language, t } = useLanguage();
  const { palette } = useAppearance();
  const params = useLocalSearchParams<{
    area?: string;
    category?: string;
    q?: string;
  }>();

  const [query, setQuery] = useState(() =>
    typeof params.q === "string" ? params.q : "",
  );
  const [debouncedQuery, setDebouncedQuery] = useState(() =>
    typeof params.q === "string" ? params.q.trim() : "",
  );
  const [selectedCategory, setSelectedCategory] = useState(
    params.category && params.category !== "all" ? params.category : "all",
  );
  const [area, setArea] = useState(params.area || "Semua area");
  const [sortMode, setSortMode] = useState<SearchSortMode>("relevance");

  const [activeFilterModal, setActiveFilterModal] = useState<
    "location" | "category" | "sort" | null
  >(null);

  const [recentSearches, setRecentSearches] = useState<string[]>(
    DEFAULT_RECENT_SEARCHES,
  );
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [source, setSource] = useState<DataSource>("fixtures");
  const [hasMoreTechnicians, setHasMoreTechnicians] = useState(false);
  const [loadingTechnicians, setLoadingTechnicians] = useState(true);
  const [loadingMoreTechnicians, setLoadingMoreTechnicians] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const nextQ = typeof params.q === "string" ? params.q.trim() : "";
    if (!nextQ) return;
    const timer = setTimeout(() => {
      setQuery(nextQ);
      setDebouncedQuery(nextQ);
    }, 0);
    return () => clearTimeout(timer);
  }, [params.q]);

  useEffect(() => {
    let active = true;
    void getStoredJson<string[] | null>(RECENT_SEARCHES_KEY, null).then(
      (stored) => {
        if (!active) return;
        if (Array.isArray(stored)) {
          setRecentSearches(stored.slice(0, MAX_RECENT_SEARCHES));
        }
      },
    );
    return () => {
      active = false;
    };
  }, []);

  const recordRecentSearch = useCallback((rawTerm: string) => {
    const cleaned = rawTerm.trim();
    if (!cleaned) return;
    setRecentSearches((prev) => {
      const deduplicated = prev.filter(
        (item) => item.toLowerCase() !== cleaned.toLowerCase(),
      );
      const next = [cleaned, ...deduplicated].slice(0, MAX_RECENT_SEARCHES);
      void setStoredJson(RECENT_SEARCHES_KEY, next);
      return next;
    });
  }, []);

  const handleRemoveRecentSearch = useCallback((termToRemove: string) => {
    setRecentSearches((prev) => {
      const next = prev.filter((item) => item !== termToRemove);
      void setStoredJson(RECENT_SEARCHES_KEY, next);
      return next;
    });
  }, []);

  const handleClearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    void setStoredJson(RECENT_SEARCHES_KEY, []);
  }, []);

  const handleQueryChange = useCallback((nextText: string) => {
    setQuery(nextText);
    if (!nextText.trim()) {
      setDebouncedQuery("");
    }
  }, []);

  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(trimmed);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [query]);

  useEffect(() => {
    let active = true;
    void Promise.all([loadCategories(), loadTechnicians(), loadServiceAreas()])
      .then(([categoryResult, technicianResult, areaResult]) => {
        if (!active) return;
        setCategories(categoryResult.items);
        setTechnicians(technicianResult.items);
        setServiceAreas(areaResult.items);
        setSource(technicianResult.source);
        setHasMoreTechnicians(technicianResult.hasMore);
      })
      .finally(() => {
        if (active) setLoadingTechnicians(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const categoryFilters = useMemo(
    () => buildCategoryFilters(categories, language, t),
    [categories, language, t],
  );

  const effectiveQuery = useMemo(
    () => normalizeQueryForFilter(debouncedQuery),
    [debouncedQuery],
  );

  const postFilters = useMemo(
    () => ({
      area: area === "Semua area" ? undefined : area,
      categorySlug: selectedCategory === "all" ? undefined : selectedCategory,
      query: debouncedQuery || undefined,
    }),
    [area, debouncedQuery, selectedCategory],
  );

  const loadPostPage = useCallback(
    (cursor: string | null, pageSize: number) =>
      loadMarketplacePublishedPostsPage(postFilters, cursor, pageSize),
    [postFilters],
  );

  const postResults = useInfiniteList<PostType>({
    cacheKey: `search:posts:${area}:${selectedCategory}:${debouncedQuery.toLowerCase()}`,
    enabled: true,
    fetchPage: loadPostPage,
    keyExtractor: (item) => item.id,
    pageSize: 10,
  });

  const matchingTechnicians = useMemo(() => {
    const base = filterTechnicians(
      technicians,
      effectiveQuery,
      area,
      selectedCategory === "all" ? undefined : selectedCategory,
    );
    const copy = [...base];
    if (sortMode === "popular") {
      copy.sort((a, b) => {
        if (b.reviewCount !== a.reviewCount) {
          return b.reviewCount - a.reviewCount;
        }
        return b.averageRating - a.averageRating;
      });
    } else if (sortMode === "recent") {
      copy.sort((a, b) => {
        if (a.available !== b.available) {
          return a.available ? -1 : 1;
        }
        return b.completedJobsCount - a.completedJobsCount;
      });
    }
    return copy;
  }, [area, effectiveQuery, selectedCategory, sortMode, technicians]);

  const sortedPosts = useMemo(() => {
    const copy = [...postResults.items];
    if (sortMode === "popular") {
      copy.sort(
        (a, b) =>
          (b.likeCount ?? 0) * 3 +
          (b.viewCount ?? 0) -
          ((a.likeCount ?? 0) * 3 + (a.viewCount ?? 0)),
      );
    } else if (sortMode === "recent") {
      copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return copy;
  }, [postResults.items, sortMode]);

  const loadMoreTechnicians = useCallback(async () => {
    if (!hasMoreTechnicians || loadingTechnicians || loadingMoreTechnicians) {
      return;
    }
    setLoadingMoreTechnicians(true);
    try {
      const page = await loadTechnicians(technicians.length);
      setTechnicians((current) => {
        const seen = new Set(current.map((item) => item.id));
        return [
          ...current,
          ...page.items.filter((item) => !seen.has(item.id)),
        ];
      });
      setHasMoreTechnicians(page.hasMore);
    } finally {
      setLoadingMoreTechnicians(false);
    }
  }, [
    hasMoreTechnicians,
    loadingMoreTechnicians,
    loadingTechnicians,
    technicians.length,
  ]);

  const loadMore = useCallback(async () => {
    await Promise.all([
      postResults.hasMore ? postResults.loadMore() : Promise.resolve(),
      hasMoreTechnicians ? loadMoreTechnicians() : Promise.resolve(),
    ]);
  }, [hasMoreTechnicians, loadMoreTechnicians, postResults]);

  const searchItems = useMemo<SearchListItem[]>(() => {
    const items: SearchListItem[] = [];
    if (matchingTechnicians.length > 0) {
      items.push({ key: "technicians-heading", kind: "technicians-heading" });
      for (const technician of matchingTechnicians) {
        items.push({
          key: `technician-${technician.id}`,
          kind: "technician",
          technician,
        });
      }
    }
    if (sortedPosts.length > 0) {
      items.push({ key: "posts-heading", kind: "posts-heading" });
      for (const post of sortedPosts) {
        items.push({ key: `post-${post.id}`, kind: "post", post });
      }
    }
    return items;
  }, [matchingTechnicians, sortedPosts]);

  const isLoading = loadingTechnicians || postResults.loading;
  const isSearching =
    query.trim().length > 0 || selectedCategory !== "all";

  const handleExecuteQuickSearch = useCallback(
    (nextQuery: string, nextCategory?: string) => {
      const trimmed = nextQuery.trim();
      setQuery(trimmed);
      setDebouncedQuery(trimmed);
      if (nextCategory) {
        setSelectedCategory(nextCategory);
      }
      if (trimmed) {
        recordRecentSearch(trimmed);
      }
    },
    [recordRecentSearch],
  );

  const handleResetFilters = useCallback(() => {
    setQuery("");
    setDebouncedQuery("");
    setSelectedCategory("all");
    setArea("Semua area");
    setSortMode("relevance");
  }, []);

  const locationFilterLabel =
    area === "Semua area"
      ? language === "en"
        ? "All areas"
        : "Semua area"
      : localizeArea(area, language);

  const selectedCategoryObj = categoryFilters.find(
    (c) => c.slug === selectedCategory,
  );
  const categoryFilterLabel =
    selectedCategory === "all" || !selectedCategoryObj
      ? language === "en"
        ? "All services"
        : "Semua layanan"
      : selectedCategoryObj.label;

  const sortFilterLabel =
    sortMode === "popular"
      ? language === "en"
        ? "Most popular"
        : "Terpopuler"
      : sortMode === "recent"
        ? language === "en"
          ? "Most recent"
          : "Terbaru"
        : language === "en"
          ? "Relevance"
          : "Relevansi";

  const areaOptions = useMemo(() => {
    const names = new Set<string>(["Semua area"]);
    for (const sa of serviceAreas) {
      if (sa) names.add(sa);
    }
    for (const tech of technicians) {
      for (const a of tech.serviceAreas ?? []) {
        if (a) names.add(a);
      }
    }
    return Array.from(names);
  }, [serviceAreas, technicians]);

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={[styles.safeArea, { backgroundColor: palette.background }]}
    >
      {/* Top Search Header */}
      <BackHeader
        backBtnTestID="search-back"
        fallbackRoute="/"
        showBackLabel={false}
        style={[
          styles.topBar,
          {
            backgroundColor: palette.background,
          },
        ]}
        titleComponent={
          <SearchField
            accessibilityLabel={t("home.search")}
            autoFocus
            clearAccessibilityLabel={
              language === "en" ? "Clear search" : "Hapus pencarian"
            }
            onChangeText={handleQueryChange}
            onClear={() => {
              setQuery("");
              setDebouncedQuery("");
            }}
            onSubmitEditing={() => {
              if (query.trim()) {
                recordRecentSearch(query.trim());
              }
            }}
            placeholder={
              language === "en"
                ? "Search services, technicians, or posts..."
                : t("home.search")
            }
            testID="search-input"
            value={query}
          />
        }
      />

      {/* Three Compact Independent Functional Search Filters */}
      <View style={styles.filtersRow} testID="search-filters-bar">
        <Pressable
          accessibilityRole="button"
          onPress={() => setActiveFilterModal("location")}
          style={[
            styles.filterPill,
            {
              backgroundColor:
                area !== "Semua area"
                  ? palette.primarySoft
                  : palette.surfaceElevated,
              borderColor:
                area !== "Semua area" ? palette.primary : palette.border,
            },
          ]}
          testID="search-filter-location"
        >
          <MapPin
            color={area !== "Semua area" ? palette.primary : palette.textMuted}
            size={14}
            strokeWidth={ICON_STROKE}
          />
          <Text
            numberOfLines={1}
            style={[
              styles.filterPillText,
              {
                color: area !== "Semua area" ? palette.primary : palette.text,
              },
            ]}
          >
            {locationFilterLabel}
          </Text>
          <ChevronDown
            color={area !== "Semua area" ? palette.primary : palette.textMuted}
            size={13}
            strokeWidth={ICON_STROKE}
          />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => setActiveFilterModal("category")}
          style={[
            styles.filterPill,
            {
              backgroundColor:
                selectedCategory !== "all"
                  ? palette.primarySoft
                  : palette.surfaceElevated,
              borderColor:
                selectedCategory !== "all" ? palette.primary : palette.border,
            },
          ]}
          testID="search-filter-category"
        >
          <Layers
            color={
              selectedCategory !== "all" ? palette.primary : palette.textMuted
            }
            size={14}
            strokeWidth={ICON_STROKE}
          />
          <Text
            numberOfLines={1}
            style={[
              styles.filterPillText,
              {
                color:
                  selectedCategory !== "all" ? palette.primary : palette.text,
              },
            ]}
          >
            {categoryFilterLabel}
          </Text>
          <ChevronDown
            color={
              selectedCategory !== "all" ? palette.primary : palette.textMuted
            }
            size={13}
            strokeWidth={ICON_STROKE}
          />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => setActiveFilterModal("sort")}
          style={[
            styles.filterPill,
            {
              backgroundColor:
                sortMode !== "relevance"
                  ? palette.primarySoft
                  : palette.surfaceElevated,
              borderColor:
                sortMode !== "relevance" ? palette.primary : palette.border,
            },
          ]}
          testID="search-filter-sort"
        >
          <ArrowUpDown
            color={
              sortMode !== "relevance" ? palette.primary : palette.textMuted
            }
            size={14}
            strokeWidth={ICON_STROKE}
          />
          <Text
            numberOfLines={1}
            style={[
              styles.filterPillText,
              {
                color:
                  sortMode !== "relevance" ? palette.primary : palette.text,
              },
            ]}
          >
            {sortFilterLabel}
          </Text>
          <ChevronDown
            color={
              sortMode !== "relevance" ? palette.primary : palette.textMuted
            }
            size={13}
            strokeWidth={ICON_STROKE}
          />
        </Pressable>
      </View>

      {/* Discovery State (When Input Is Empty and No Category Selected) vs Search Results State */}
      {!isSearching ? (
        <ScrollView
          contentContainerStyle={styles.discoveryContent}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          testID="search-discovery-view"
        >
          {/* 1. Recent Searches Section */}
          {recentSearches.length > 0 ? (
            <View
              style={styles.discoverySection}
              testID="recent-searches-section"
            >
              <View style={styles.sectionHeaderRow}>
                <Text
                  style={[styles.discoverySectionTitle, { color: palette.text }]}
                >
                  {language === "en" ? "Recent searches" : "Pencarian terakhir"}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={handleClearRecentSearches}
                  testID="clear-recent-searches"
                >
                  <Text
                    style={[styles.clearTextBtn, { color: palette.textMuted }]}
                  >
                    {language === "en" ? "Clear" : "Hapus"}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.recentList}>
                {recentSearches.map((item, idx) => (
                  <View
                    key={`${item}-${idx}`}
                    style={[
                      styles.recentRow,
                      { borderBottomColor: palette.border },
                    ]}
                  >
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => handleExecuteQuickSearch(item)}
                      style={styles.recentItemMain}
                      testID={`recent-search-item-${idx}`}
                    >
                      <Clock
                        color={palette.textMuted}
                        size={16}
                        strokeWidth={ICON_STROKE}
                      />
                      <Text
                        numberOfLines={1}
                        style={[styles.recentItemText, { color: palette.text }]}
                      >
                        {item}
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityLabel={
                        language === "en"
                          ? `Remove ${item}`
                          : `Hapus ${item}`
                      }
                      accessibilityRole="button"
                      hitSlop={8}
                      onPress={() => handleRemoveRecentSearch(item)}
                      style={styles.recentRemoveBtn}
                      testID={`remove-recent-search-${idx}`}
                    >
                      <X
                        color={palette.textMuted}
                        size={15}
                        strokeWidth={ICON_STROKE}
                      />
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* 2. Popular Searches Section */}
          <View
            style={styles.discoverySection}
            testID="popular-searches-section"
          >
            <Text
              style={[styles.discoverySectionTitle, { color: palette.text }]}
            >
              {language === "en" ? "Popular searches" : "Pencarian populer"}
            </Text>
            <View style={styles.popularChipsWrap}>
              {POPULAR_SEARCH_CHIPS.map((chip) => {
                const label = language === "en" ? chip.en : chip.labelId;
                return (
                  <Pressable
                    key={chip.id}
                    accessibilityRole="button"
                    onPress={() => handleExecuteQuickSearch(label)}
                    style={({ pressed }) => [
                      styles.popularChip,
                      {
                        backgroundColor: palette.surfaceElevated,
                        borderColor: palette.border,
                        opacity: pressed ? 0.75 : 1,
                      },
                    ]}
                    testID={`popular-search-chip-${chip.id}`}
                  >
                    <Search
                      color={palette.textMuted}
                      size={13}
                      strokeWidth={ICON_STROKE}
                    />
                    <Text
                      style={[styles.popularChipText, { color: palette.text }]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* 3. Browse by Service Grid */}
          <View
            style={styles.discoverySection}
            testID="browse-by-service-section"
          >
            <Text
              style={[styles.discoverySectionTitle, { color: palette.text }]}
            >
              {language === "en" ? "Browse by service" : "Telusuri layanan"}
            </Text>
            <View style={styles.browseGrid}>
              {BROWSE_SERVICE_GRID.map((service) => {
                const label =
                  language === "en" ? service.en : service.labelId;
                return (
                  <Pressable
                    key={service.id}
                    accessibilityRole="button"
                    onPress={() => {
                      setSelectedCategory(service.slug);
                      recordRecentSearch(label);
                    }}
                    style={({ pressed }) => [
                      styles.browseCard,
                      {
                        backgroundColor: palette.surface,
                        borderColor: palette.border,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                    testID={`browse-service-${service.id}`}
                  >
                    <View
                      style={[
                        styles.browseIconWrap,
                        { backgroundColor: service.iconBg },
                      ]}
                    >
                      {renderBrowseIcon(service.iconKind, service.iconColor)}
                    </View>
                    <Text
                      numberOfLines={2}
                      style={[styles.browseCardLabel, { color: palette.text }]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>
      ) : (
        <InfiniteFlatList
          contentContainerStyle={styles.listContent}
          data={searchItems}
          hasMore={postResults.hasMore || hasMoreTechnicians}
          keyExtractor={(item) => item.key}
          ListEmptyComponent={
            isLoading ? (
              <LoadingState label={t("home.loading")} />
            ) : (
              <EmptyState
                actionLabel={
                  language === "en" ? "Clear filters" : t("home.resetFilter")
                }
                description={t("home.noSearchDescription")}
                onAction={handleResetFilters}
                title={t("home.noSearchTitle")}
              />
            )
          }
          ListHeaderComponent={
            <View>
              <CategoryTabs
                categories={categoryFilters}
                onSelect={setSelectedCategory}
                selected={selectedCategory}
                testID="search-category-filters"
              />
              <View style={styles.resultsSummaryRow}>
                <Text
                  style={[styles.resultsCountText, { color: palette.textMuted }]}
                  testID="search-results-count"
                >
                  {language === "en"
                    ? `${matchingTechnicians.length + sortedPosts.length} results`
                    : `${matchingTechnicians.length + sortedPosts.length} hasil`}
                  {debouncedQuery ? ` · "${debouncedQuery}"` : ""}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={handleResetFilters}
                  testID="search-clear-all-filters"
                >
                  <Text
                    style={[styles.resetFiltersLink, { color: palette.primary }]}
                  >
                    {language === "en" ? "Clear filters" : "Reset filter"}
                  </Text>
                </Pressable>
              </View>
            </View>
          }
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
                    {t("home.retry")}
                  </Text>
                </Pressable>
              </View>
            ) : null
          }
          loadingMore={postResults.loadingMore || loadingMoreTechnicians}
          onLoadMore={() => {
            void loadMore();
          }}
          onRefresh={() => {
            void postResults.refresh();
          }}
          refreshing={postResults.refreshing}
          renderItem={({ item, index }) => {
            if (item.kind === "technicians-heading") {
              return (
                <View style={styles.sectionTitle}>
                  <SectionTitle
                    title={language === "en" ? "Technicians" : "Teknisi"}
                    trailing={`${matchingTechnicians.length}`}
                  />
                </View>
              );
            }
            if (item.kind === "posts-heading") {
              return (
                <View style={styles.sectionTitle}>
                  <SectionTitle
                    title={
                      language === "en" ? "Work posts" : "Postingan pekerjaan"
                    }
                    trailing={`${sortedPosts.length}`}
                  />
                </View>
              );
            }
            if (item.kind === "technician") {
              return (
                <View style={styles.cardWrap}>
                  <TechnicianCard
                    onPress={() =>
                      router.push({
                        pathname: "/technician/[id]",
                        params: { id: item.technician.id },
                      })
                    }
                    source={source}
                    technician={item.technician}
                  />
                </View>
              );
            }
            const matchedTech = technicians.find(
              (tech) => tech.id === item.post.technicianId,
            );
            const startingPrice = matchedTech?.services.find(
              (srv) => typeof srv.startingPrice === "number",
            )?.startingPrice;
            return (
              <Post
                flat
                isLastInThread={index === searchItems.length - 1}
                post={item.post}
                authorName={matchedTech?.displayName}
                authorAvatarUri={matchedTech?.avatarUri}
                authorRating={matchedTech?.averageRating}
                authorReviewCount={matchedTech?.reviewCount}
                serviceStartingPrice={
                  item.post.isServicePost ? startingPrice : undefined
                }
              />
            );
          }}
          style={styles.list}
          testID="search-results"
        />
      )}

      {/* Filter Selection Modal (Location / Category / Sort) */}
      <Modal
        animationType="fade"
        onRequestClose={() => setActiveFilterModal(null)}
        transparent
        visible={activeFilterModal !== null}
      >
        <Pressable
          onPress={() => setActiveFilterModal(null)}
          style={styles.modalBackdrop}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.modalSheet,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: palette.text }]}>
                {activeFilterModal === "location"
                  ? language === "en"
                    ? "Select location"
                    : "Pilih lokasi"
                  : activeFilterModal === "category"
                    ? language === "en"
                      ? "Service category"
                      : "Kategori layanan"
                    : language === "en"
                      ? "Sort results"
                      : "Urutkan hasil"}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setActiveFilterModal(null)}
                testID="close-search-filter-modal"
              >
                <X
                  color={palette.textMuted}
                  size={18}
                  strokeWidth={ICON_STROKE}
                />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.modalOptionsList}
            >
              {activeFilterModal === "location" &&
                areaOptions.map((areaOpt) => {
                  const selected = area === areaOpt;
                  const label =
                    areaOpt === "Semua area"
                      ? language === "en"
                        ? "All areas"
                        : "Semua area"
                      : localizeArea(areaOpt, language);
                  return (
                    <Pressable
                      key={areaOpt}
                      accessibilityRole="button"
                      onPress={() => {
                        setArea(areaOpt);
                        setActiveFilterModal(null);
                      }}
                      style={[
                        styles.modalOptionRow,
                        { borderBottomColor: palette.border },
                      ]}
                      testID={`search-area-option-${areaOpt}`}
                    >
                      <Text
                        style={[
                          styles.modalOptionText,
                          {
                            color: selected ? palette.primary : palette.text,
                            fontWeight: selected ? "700" : "500",
                          },
                        ]}
                      >
                        {label}
                      </Text>
                      {selected ? (
                        <Check
                          color={palette.primary}
                          size={16}
                          strokeWidth={ICON_STROKE}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}

              {activeFilterModal === "category" &&
                categoryFilters.map((cat) => {
                  const selected = selectedCategory === cat.slug;
                  return (
                    <Pressable
                      key={cat.slug}
                      accessibilityRole="button"
                      onPress={() => {
                        setSelectedCategory(cat.slug);
                        setActiveFilterModal(null);
                      }}
                      style={[
                        styles.modalOptionRow,
                        { borderBottomColor: palette.border },
                      ]}
                      testID={`search-category-option-${cat.slug}`}
                    >
                      <Text
                        style={[
                          styles.modalOptionText,
                          {
                            color: selected ? palette.primary : palette.text,
                            fontWeight: selected ? "700" : "500",
                          },
                        ]}
                      >
                        {cat.slug === "all"
                          ? language === "en"
                            ? "All services"
                            : "Semua layanan"
                          : cat.label}
                      </Text>
                      {selected ? (
                        <Check
                          color={palette.primary}
                          size={16}
                          strokeWidth={ICON_STROKE}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}

              {activeFilterModal === "sort" &&
                (
                  [
                    {
                      id: "relevance" as const,
                      en: "Relevance",
                      labelId: "Relevansi",
                    },
                    {
                      id: "recent" as const,
                      en: "Most recent",
                      labelId: "Terbaru",
                    },
                    {
                      id: "popular" as const,
                      en: "Most popular",
                      labelId: "Terpopuler",
                    },
                  ] as const
                ).map((opt) => {
                  const selected = sortMode === opt.id;
                  return (
                    <Pressable
                      key={opt.id}
                      accessibilityRole="button"
                      onPress={() => {
                        setSortMode(opt.id);
                        setActiveFilterModal(null);
                      }}
                      style={[
                        styles.modalOptionRow,
                        { borderBottomColor: palette.border },
                      ]}
                      testID={`search-sort-option-${opt.id}`}
                    >
                      <Text
                        style={[
                          styles.modalOptionText,
                          {
                            color: selected ? palette.primary : palette.text,
                            fontWeight: selected ? "700" : "500",
                          },
                        ]}
                      >
                        {language === "en" ? opt.en : opt.labelId}
                      </Text>
                      {selected ? (
                        <Check
                          color={palette.primary}
                          size={16}
                          strokeWidth={ICON_STROKE}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.paper,
    flex: 1,
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 0,
    paddingBottom: 2,
    paddingLeft: 4,
    paddingRight: spacing.sm,
    paddingTop: spacing.xs,
  },
  filtersRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  filterPill: {
    alignItems: "center",
    borderRadius: radii.pill,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 5,
    height: 34,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  filterPillText: {
    flexShrink: 1,
    fontSize: font.caption,
    fontWeight: "600",
  },
  discoveryContent: {
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  discoverySection: {
    marginTop: spacing.md,
  },
  sectionHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  discoverySectionTitle: {
    fontSize: font.subtitle,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  clearTextBtn: {
    fontSize: font.caption,
    fontWeight: "600",
  },
  recentList: {
    marginTop: 2,
  },
  recentRow: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 42,
  },
  recentItemMain: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 10,
    paddingVertical: 8,
  },
  recentItemText: {
    flex: 1,
    fontSize: font.body,
    fontWeight: "500",
  },
  recentRemoveBtn: {
    alignItems: "center",
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  popularChipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  popularChip: {
    alignItems: "center",
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    height: 34,
    paddingHorizontal: 12,
  },
  popularChipText: {
    fontSize: font.caption,
    fontWeight: "600",
  },
  browseGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 6,
  },
  browseCard: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flexBasis: "22%",
    flexGrow: 1,
    justifyContent: "center",
    minHeight: 88,
    minWidth: 76,
    paddingHorizontal: 6,
    paddingVertical: 12,
  },
  browseIconWrap: {
    alignItems: "center",
    borderRadius: 12,
    height: 40,
    justifyContent: "center",
    marginBottom: 8,
    width: 40,
  },
  browseCardLabel: {
    fontSize: font.caption,
    fontWeight: "600",
    lineHeight: 15,
    textAlign: "center",
  },
  resultsSummaryRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  resultsCountText: {
    fontSize: font.caption,
    fontWeight: "600",
  },
  resetFiltersLink: {
    fontSize: font.caption,
    fontWeight: "700",
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
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  errorText: {
    fontSize: font.body,
    textAlign: "center",
  },
  retryText: {
    fontSize: font.subtitle,
    fontWeight: "800",
  },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalSheet: {
    borderRadius: 16,
    borderWidth: 1,
    maxHeight: "70%",
    padding: spacing.md,
    width: "100%",
    maxWidth: 400,
  },
  modalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontSize: font.title,
    fontWeight: "700",
  },
  modalOptionsList: {
    maxHeight: 340,
  },
  modalOptionRow: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 44,
    paddingVertical: 10,
  },
  modalOptionText: {
    fontSize: font.body,
  },
});

export default SearchResults;

