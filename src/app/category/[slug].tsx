import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AppNavigationBar,
  EmptyState,
  LoadingState,
  ServiceCategoryGlyph,
  SourceBadge,
  TechnicianCard,
} from "../../components/marketplace-ui";
import {
  filterTechnicians,
  loadCategories,
  loadTechnicians,
} from "../../data/marketplaceRepository";
import { categoryName, useLanguage } from "../../i18n/locale";
import type {
  DataSource,
  ServiceCategory,
  Technician,
} from "../../types/marketplace";
import { colors, spacing } from "../../theme/tokens";

export default function CategoryScreen() {
  const { t } = useLanguage();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [category, setCategory] = useState<ServiceCategory | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [source, setSource] = useState<DataSource>("fixtures");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    void Promise.all([loadCategories(), loadTechnicians()])
      .then(([categoryData, technicianData]) => {
        if (!active) return;
        setCategory(
          categoryData.items.find((item) => item.slug === slug) ?? null,
        );
        setTechnicians(technicianData.items);
        setSource(technicianData.source);
        setHasMore(technicianData.hasMore);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [retryKey, slug]);

  const matches = useMemo(
    () => filterTechnicians(technicians, "", "Semua area", slug),
    [slug, technicians],
  );

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || loadingMore || error) return;
    setLoadingMore(true);
    try {
      const nextPage = await loadTechnicians(technicians.length);
      setTechnicians((current) => [...current, ...nextPage.items]);
      setHasMore(nextPage.hasMore);
    } catch {
      setError(true);
    } finally {
      setLoadingMore(false);
    }
  }, [error, hasMore, loading, loadingMore, technicians.length]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.content}
        data={matches}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("category.back")}
              onPress={() => {
                if (router.canGoBack()) router.back();
                else router.replace("/");
              }}
              style={styles.backButton}
            >
              <Text style={styles.backGlyph}>‹</Text>
              <Text style={styles.backLabel}>{t("category.back")}</Text>
            </Pressable>
            {category && (
              <View style={styles.glyphWrap}>
                <ServiceCategoryGlyph iconKey={category.icon} size={52} />
              </View>
            )}
            <Text style={styles.eyebrow}>{t("category.eyebrow")}</Text>
            <Text style={styles.title}>
              {category
                ? categoryName(category.slug, category.name, t)
                : t("home.categoryTitle")}
            </Text>
            <Text style={styles.description}>
              {category?.description ?? t("category.description")}
            </Text>
            {source === "fixtures" && (
              <View style={styles.badge}>
                <SourceBadge source={source} />
              </View>
            )}
            <View style={styles.resultsTitle}>
              <Text style={styles.resultsLabel}>{t("category.results")}</Text>
              <Text style={styles.resultsCount}>
                {matches.length} {t("category.profiles")}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <LoadingState label={t("category.loading")} />
          ) : error ? (
            <EmptyState
              title={t("category.loadErrorTitle")}
              description={t("category.loadError")}
              actionLabel={t("home.retry")}
              onAction={() => {
                setLoading(true);
                setError(false);
                setRetryKey((key) => key + 1);
              }}
            />
          ) : (
            <EmptyState
              title={
                hasMore
                  ? t("category.noTechniciansMore")
                  : t("category.noTechnicians")
              }
              description={
                hasMore
                  ? t("category.noTechniciansMoreDescription")
                  : t("category.noTechniciansDescription")
              }
              actionLabel={hasMore ? t("home.loadMore") : undefined}
              onAction={
                hasMore
                  ? () => {
                      void loadMore();
                    }
                  : undefined
              }
            />
          )
        }
        renderItem={({ item }) => (
          <TechnicianCard
            technician={item}
            source={source}
            onPress={() =>
              router.push({
                pathname: "/technician/[id]",
                params: { id: item.id },
              })
            }
          />
        )}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <LoadingState label={t("home.loadingMore")} />
          ) : (
            <View style={styles.footer} />
          )
        }
      />
      <AppNavigationBar activeTab="marketplace" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.paper, flex: 1 },
  list: { flex: 1 },
  content: {
    alignSelf: "center",
    maxWidth: 820,
    paddingBottom: spacing.xxxl,
    paddingHorizontal: spacing.xl,
    width: "100%",
  },
  header: { paddingBottom: spacing.lg },
  backButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    marginBottom: spacing.xl,
    minHeight: 42,
  },
  backGlyph: {
    color: colors.greenDark,
    fontSize: 31,
    lineHeight: 34,
    marginRight: 5,
  },
  backLabel: { color: colors.greenDark, fontSize: 13, fontWeight: "700" },
  glyphWrap: { marginBottom: spacing.sm },
  eyebrow: {
    color: colors.orange,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  title: {
    color: colors.ink,
    fontSize: 31,
    fontWeight: "800",
    letterSpacing: -1,
    marginTop: 5,
  },
  description: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
    maxWidth: 560,
  },
  badge: { marginTop: spacing.lg },
  resultsTitle: {
    alignItems: "center",
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.xxl,
    paddingBottom: spacing.md,
  },
  resultsLabel: { color: colors.ink, fontSize: 15, fontWeight: "700" },
  resultsCount: { color: colors.muted, fontSize: 12 },
  footer: { height: spacing.xl },
});
