import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  EmptyState,
  LoadingState,
  PrimaryButton,
  Rating,
  ServiceCategoryGlyph,
} from "../../components/marketplace-ui";
import { InfiniteFlatList } from "../../components/InfiniteFlatList";
import {
  pickImageSafely,
  PortfolioPhoto,
  ProfileAvatar,
  SectionHeader,
} from "../../profile";
import {
  TechnicianPostCard,
  TechnicianPostComposer,
} from "../../components/TechnicianPostCard";
import { formatRupiah, loadTechnician } from "../../data/marketplaceRepository";
import {
  loadBookings,
  loadSubmittedReviews,
  submitTechnicianReport,
} from "../../data/marketplaceStore";
import {
  createTechnicianPost,
  deleteTechnicianPost,
  loadTechnicianPostsPage,
  suspendTechnicianPost,
  updateTechnicianPost,
} from "../../data/postsStore";
import { useInfiniteList } from "../../hooks/useInfiniteList";
import { categoryName, localizeArea, useLanguage } from "../../i18n/locale";
import { useAppearance } from "../../context/AppearanceContext";
import { useAuth } from "../../auth/AuthProvider";
import type {
  DataSource,
  PortfolioItem,
  Technician,
  TechnicianPost,
  TechnicianReport,
  TechnicianReview,
} from "../../types/marketplace";
import { colors, getProfileTheme, radii, spacing } from "../../theme/tokens";

const WEEKDAY_NAMES_ID = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];
const WEEKDAY_NAMES_EN = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function TechnicianProfileScreen() {
  const { language, t } = useLanguage();
  const { user, roles, effectiveRole, updateUserProfile } = useAuth();
  const { palette } = useAppearance();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loadedTechnician, setLoadedTechnician] = useState<Technician | null>(
    null,
  );
  const [activeProfileTab, setActiveProfileTab] = useState<
    "posts" | "services" | "portfolio" | "reviews" | "about"
  >("posts");
  const [coverUri, setCoverUri] = useState<string | undefined>(undefined);
  const [source, setSource] = useState<DataSource>("fixtures");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [expandedPortfolio, setExpandedPortfolio] =
    useState<PortfolioItem | null>(null);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportCategory, setReportCategory] =
    useState<TechnicianReport["category"]>("quality");
  const [reportDescription, setReportDescription] = useState("");
  const [reportStatusNote, setReportStatusNote] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [dynamicCompletedJobs, setDynamicCompletedJobs] = useState<number>(0);
  const [dynamicReviews, setDynamicReviews] = useState<TechnicianReview[]>([]);
  const feedIsTechnician = roles.includes("technician") || effectiveRole === "technician";
  const feedIsOwner = Boolean(
    user &&
      (user.id === id ||
        (loadedTechnician && user.id === loadedTechnician.id) ||
        (feedIsTechnician && id === "demo-rizky") ||
        (!feedIsTechnician && id === "demo-customer")),
  );
  const fetchPostPage = useCallback(
    (cursor: string | null, pageSize: number) =>
      id
        ? loadTechnicianPostsPage(id, feedIsOwner, cursor, pageSize)
        : Promise.resolve({ items: [], nextCursor: null, hasMore: false }),
    [feedIsOwner, id],
  );
  const postFeed = useInfiniteList<TechnicianPost>({
    cacheKey: `technician-posts:${id}:${feedIsOwner ? "owner" : "public"}`,
    enabled: Boolean(id),
    fetchPage: fetchPostPage,
    keyExtractor: (post: TechnicianPost) => post.id,
    pageSize: 10,
  });
  const posts = postFeed.items;

  useEffect(() => {
    let active = true;
    void loadTechnician(id)
      .then((result) => {
        if (!active) return;
        setLoadedTechnician(result.item);
        setSource(result.source);
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
  }, [id, retryKey, user?.id]);

  useEffect(() => {
    const targetId = id || user?.id;
    if (targetId) {
      void AsyncStorage.getItem(`@cepat_cover_${targetId}`).then((saved) => {
        if (saved) setCoverUri(saved);
      });
    }
  }, [id, user?.id]);

  useEffect(() => {
    let active = true;
    const targetId = id || user?.id;
    if (!targetId) return;

    void loadBookings()
      .then((allBookings) => {
        if (!active) return;
        const completed = allBookings.filter(
          (b) =>
            (b.technicianUserId === targetId ||
              (user && b.technicianUserId === user.id) ||
              (loadedTechnician && b.technicianUserId === loadedTechnician.id)) &&
            b.status === "completed",
        ).length;
        setDynamicCompletedJobs(completed);
      })
      .catch(() => {});

    void loadSubmittedReviews()
      .then((allReviews) => {
        if (!active) return;
        const matched = allReviews.filter(
          (r) =>
            r.technicianId === targetId ||
            (user && r.technicianId === user.id) ||
            (loadedTechnician && r.technicianId === loadedTechnician.id),
        );
        setDynamicReviews(matched);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [id, loadedTechnician, retryKey, user]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  const handleSubmitReport = async () => {
    if (!technician) return;
    setReportError(null);
    setReportStatusNote(null);
    try {
      await submitTechnicianReport({
        reporterUserId: user?.id,
        reportedTechnicianId: technician.id,
        technicianName: technician.displayName,
        category: reportCategory,
        description: reportDescription,
      });
      setReportDescription("");
      setReportStatusNote(t("profile.reportSuccess"));
    } catch {
      setReportError(t("profile.reportPlaceholder"));
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.centered, { backgroundColor: palette.background }]}
        edges={["top", "bottom"]}
      >
        <LoadingState label={t("profile.loading")} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: palette.background }]}
        edges={["top", "bottom"]}
      >
        <Header onBack={goBack} />
        <EmptyState
          title={t("profile.loadErrorTitle")}
          description={t("profile.loadError")}
          actionLabel={t("home.retry")}
          onAction={() => {
            setLoading(true);
            setError(false);
            setRetryKey((key) => key + 1);
          }}
        />
      </SafeAreaView>
    );
  }

  const isAdminUser = roles.includes("admin") || effectiveRole === "admin";
  const isTechnicianUser =
    roles.includes("technician") || effectiveRole === "technician";
  const isProfileOwner =
    Boolean(user) &&
    (user?.id === id ||
      (loadedTechnician && user?.id === loadedTechnician.id) ||
      (isTechnicianUser && (!id || id === user?.id || id === "demo-rizky")) ||
      (!isTechnicianUser && (!id || id === user?.id || id === "demo-customer")));
  const accountDisplayName =
    (typeof user?.user_metadata?.display_name === "string" &&
      user.user_metadata.display_name.trim()) ||
    user?.email?.split("@")[0];

  const rawTechnician: Technician | null =
    loadedTechnician ??
    (user && (user.id === id || id === "demo-customer" || !id)
      ? {
          id: id || user.id,
          displayName: accountDisplayName || "Pelanggan Cepat",
          avatarUri:
            typeof user.user_metadata?.avatar_url === "string"
              ? user.user_metadata.avatar_url
              : undefined,
          verified: isAdminUser,
          available: true,
          services: [],
          portfolio: [],
          reviews: [],
          averageRating: 0,
          reviewCount: 0,
          completedJobsCount: 0,
          serviceAreas: ["Jakarta Selatan"],
          availabilitySchedule: [],
          headline: isAdminUser
            ? language === "en"
              ? "Cepat Administrator"
              : "Administrator Cepat"
            : language === "en"
              ? "Cepat Community Member"
              : "Anggota Komunitas Cepat",
          bio: isAdminUser
            ? language === "en"
              ? "Platform Administrator."
              : "Administrator Platform."
            : language === "en"
              ? "Customer on Cepat."
              : "Pelanggan di Cepat.",
          theme: "sand",
        }
      : null);

  const baseReviews = rawTechnician?.reviews ?? [];
  const dynamicIds = new Set(dynamicReviews.map((r) => r.id));
  const dedupedBase = baseReviews.filter((r) => !dynamicIds.has(r.id));
  const mergedReviews = [...dynamicReviews, ...dedupedBase];

  const effectiveReviewCount = mergedReviews.length;
  const effectiveAverageRating =
    effectiveReviewCount > 0
      ? Number(
          (
            mergedReviews.reduce((sum, r) => sum + r.rating, 0) /
            effectiveReviewCount
          ).toFixed(1),
        )
      : rawTechnician?.averageRating ?? 0;

  const effectiveCompletedJobs = Math.max(
    rawTechnician?.completedJobsCount ?? 0,
    dynamicCompletedJobs,
  );

  const technician: Technician | null = rawTechnician
    ? {
        ...rawTechnician,
        displayName:
          (isProfileOwner && accountDisplayName) || rawTechnician.displayName,
        avatarUri:
          isProfileOwner && user?.user_metadata?.avatar_url
            ? user.user_metadata.avatar_url
            : rawTechnician.avatarUri,
        reviews: mergedReviews,
        reviewCount: effectiveReviewCount,
        averageRating: effectiveAverageRating,
        completedJobsCount: effectiveCompletedJobs,
      }
    : null;

  const handleAvatarSelected = async (newUri: string) => {
    setLoadedTechnician((prev) =>
      prev ? { ...prev, avatarUri: newUri } : prev,
    );
    if (isProfileOwner) {
      await updateUserProfile({ avatarUrl: newUri });
      if (user) {
        try {
          await AsyncStorage.setItem(`@cepat_avatar_${user.id}`, newUri);
        } catch {}
      }
    }
  };

  const handleChangeCover = async () => {
    try {
      const picked = await pickImageSafely("gallery");
      if (picked?.uri) {
        setCoverUri(picked.uri);
        const targetId = id || user?.id;
        if (targetId) {
          await AsyncStorage.setItem(`@cepat_cover_${targetId}`, picked.uri);
        }
      }
    } catch {}
  };

  if (!technician) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: palette.background }]}
        edges={["top", "bottom"]}
      >
        <Header onBack={goBack} />
        <EmptyState
          title={t("profile.notFoundTitle")}
          description={t("profile.notFound")}
          actionLabel={t("profile.back")}
          onAction={goBack}
        />
      </SafeAreaView>
    );
  }

  const theme = getProfileTheme(technician.theme);
  const startingPrice = firstPrice(technician.services);
  const headline =
    language === "en"
      ? technician.headlineEn || technician.headline
      : technician.headline;
  const bio =
    language === "en" ? technician.bioEn || technician.bio : technician.bio;
  const weekdayNames = language === "en" ? WEEKDAY_NAMES_EN : WEEKDAY_NAMES_ID;
  const availabilitySchedule = technician.availabilitySchedule ?? [];
  const canPost = isProfileOwner && (isTechnicianUser || isAdminUser);
  const canDeletePost = isProfileOwner || isAdminUser;

  const handleCreatePost = async (input: {
    caption: string;
    imageUri?: string;
    mediaUrls?: string[];
    isServicePost: boolean;
  }) => {
    const ownerId = user?.id || technician.id;
    await createTechnicianPost({
      actorUserId: ownerId,
      technicianId: ownerId,
      technicianName: technician.displayName,
      technicianBusinessName: technician.businessName,
      technicianAvatarUri: technician.avatarUri,
      technicianVerified: isAdminUser || technician.verified,
      caption: input.caption,
      imageUri: input.imageUri,
      mediaUrls: input.mediaUrls,
      isServicePost: input.isServicePost,
      serviceArea: technician.serviceAreas[0] ?? "Semua area",
      categorySlug: technician.services[0]?.categorySlug ?? "general",
      published: true,
    });
    await postFeed.refresh();
  };

  const handleDeletePost = async (postId: string) => {
    const ownerId = user?.id || technician.id;
    await deleteTechnicianPost({ actorUserId: ownerId, postId });
    await postFeed.refresh();
  };

  const handleEditPost = async (
    post: TechnicianPost,
    newCaption: string,
    newImageUri?: string,
  ) => {
    const ownerId = user?.id || technician.id;
    await updateTechnicianPost({
      actorUserId: ownerId,
      postId: post.id,
      caption: newCaption,
      imageUri: newImageUri,
    });
    await postFeed.refresh();
  };

  const handleSuspendPost = async (postId: string, suspended: boolean) => {
    const actorId = user?.id || "admin";
    await suspendTechnicianPost({
      actorUserId: actorId,
      postId,
      suspended,
    });
    await postFeed.refresh();
  };

  const navigateToBooking = (selectedServiceId?: string) => {
    if (isProfileOwner || (user && technician && user.id === technician.id)) return;
    if (!user) {
      router.push({
        pathname: "/login",
        params: {
          redirect: `/booking/${technician.id}`,
          technicianId: technician.id,
        },
      });
      return;
    }
    router.push({
      pathname: "/booking/[id]",
      params: {
        id: technician.id,
        ...(selectedServiceId ? { serviceId: selectedServiceId } : {}),
      },
    });
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.background }]}
      edges={["top", "bottom"]}
    >
      <InfiniteFlatList
        contentContainerStyle={styles.scrollContent}
        data={activeProfileTab === "posts" ? posts : []}
        hasMore={activeProfileTab === "posts" && postFeed.hasMore}
        loadingMore={activeProfileTab === "posts" && postFeed.loadingMore}
        onLoadMore={() => {
          void postFeed.loadMore();
        }}
        keyExtractor={(post) => post.id}
        ListHeaderComponent={
          <>
        <View
          style={[styles.profileHero, { backgroundColor: palette.background }]}
          testID="technician-social-profile-card"
        >
          <View style={styles.coverContainer}>
            {coverUri ? (
              <Image
                source={{ uri: coverUri }}
                style={styles.coverImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.coverFallback}>
                <View style={styles.coverGradientEnd} />
              </View>
            )}
            <Header onBack={goBack} overlay />
            {isProfileOwner && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  language === "en" ? "Change cover photo" : "Ubah foto sampul"
                }
                onPress={handleChangeCover}
                style={styles.changeCoverBtn}
                testID="change-cover-btn"
              >
                <Text style={styles.changeCoverText}>
                  📷 {language === "en" ? "Edit Cover" : "Ubah Sampul"}
                </Text>
              </Pressable>
            )}
          </View>

          <View
            style={[
              styles.profileHeroInner,
              { backgroundColor: palette.background },
            ]}
          >
            <View style={styles.profileTopRow}>
              <View
                style={[
                  styles.avatarWrapper,
                  { borderColor: palette.surface },
                ]}
              >
                <ProfileAvatar
                  uri={technician.avatarUri}
                  name={technician.displayName}
                  size={88}
                  editable={isProfileOwner}
                  onImageSelected={handleAvatarSelected}
                  testID="technician-profile-avatar"
                />
              </View>
              <View style={styles.profileIdentity}>
                <View style={styles.nameLine}>
                  <Text style={[styles.profileName, { color: palette.text }]}>
                    {technician.displayName}
                  </Text>
                  {technician.verified ? (
                    <View
                      style={[
                        styles.verifiedTag,
                        { backgroundColor: palette.primarySoft },
                      ]}
                    >
                      <Text
                        style={[
                          styles.verifiedTagText,
                          { color: palette.primary },
                        ]}
                      >
                        {t("profile.verified")}
                      </Text>
                    </View>
                  ) : null}
                </View>
                {technician.businessName &&
                  technician.businessName !== technician.displayName && (
                    <Text
                      style={[
                        styles.businessName,
                        { color: palette.textMuted },
                      ]}
                    >
                      {technician.businessName}
                    </Text>
                  )}
                <Text style={[styles.profileHeadline, { color: theme.accent }]}>
                  {headline || t("technician.serviceFallback")}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.statsBar,
                {
                  backgroundColor: palette.surfaceElevated,
                  borderColor: palette.border,
                },
              ]}
            >
              <View style={styles.statCell}>
                <Rating
                  value={technician.reviewCount ? technician.averageRating : 0}
                  count={technician.reviewCount}
                />
              </View>
              <View style={styles.statCell}>
                <Text style={[styles.statValue, { color: palette.text }]}>
                  {t("profile.completedJobs", {
                    count: technician.completedJobsCount,
                  })}
                </Text>
              </View>
              {technician.serviceAreas[0] && (
                <View style={styles.statCell}>
                  <Text style={[styles.statValue, { color: palette.text }]}>
                    {localizeArea(technician.serviceAreas[0], language)}
                  </Text>
                </View>
              )}
            </View>

            {technician.services.length > 0 && (
              <View style={styles.availabilityLine}>
                <View
                  style={[
                    styles.availabilityDot,
                    {
                      backgroundColor: technician.available
                        ? palette.primary
                        : colors.muted,
                    },
                  ]}
                />
                <Text
                  style={[styles.availabilityText, { color: palette.text }]}
                >
                  {technician.available
                    ? t("profile.accepting")
                    : t("profile.unavailable")}
                </Text>
              </View>
            )}
            {isProfileOwner && (
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  router.push(
                    isAdminUser
                      ? "/admin"
                      : "/account",
                  )
                }
                style={[
                  styles.ownerEditBtn,
                  { backgroundColor: palette.primary },
                ]}
                testID="owner-edit-profile-btn"
              >
                <Text style={styles.ownerEditBtnText}>
                  {isAdminUser
                    ? language === "en"
                      ? "Admin Console"
                      : "Konsol Admin"
                    : language === "en"
                      ? "Account Settings"
                      : "Pengaturan Akun"}
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        <View
          style={[
            styles.profileTabBar,
            {
              backgroundColor: palette.surface,
              borderBottomColor: palette.border,
            },
          ]}
          testID="profile-tab-bar"
        >
          {(
            [
              ["posts", language === "en" ? "Posts" : "Postingan"],
              ["services", language === "en" ? "Services" : "Layanan"],
              ["portfolio", language === "en" ? "Portfolio" : "Portofolio"],
              ["reviews", language === "en" ? "Reviews" : "Ulasan"],
              ["about", language === "en" ? "About" : "Tentang"],
            ] as const
          ).map(([key, label]) => {
            const selected = activeProfileTab === key;
            return (
              <Pressable
                key={key}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => setActiveProfileTab(key)}
                style={styles.profileTab}
                testID={`profile-tab-${key}`}
              >
                <Text
                  style={[
                    styles.profileTabText,
                    { color: selected ? palette.primary : palette.textMuted },
                    selected && styles.profileTabTextSelected,
                  ]}
                >
                  {label}
                </Text>
                {selected && (
                  <View
                    style={[
                      styles.profileTabIndicator,
                      { backgroundColor: palette.primary },
                    ]}
                  />
                )}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.contentWidth}>
          {activeProfileTab === "posts" && (
            <View testID="technician-public-posts">
              {/* Inline Twitter / X style Composer: visible to owner when technician or admin */}
              {canPost && (
                <View style={styles.postComposerWrap}>
                  <TechnicianPostComposer
                    onCreatePost={handleCreatePost}
                    technicianProfile={{
                      id: technician.id,
                      displayName: technician.displayName,
                      avatarUri: technician.avatarUri,
                    }}
                  />
                </View>
              )}

              {posts.length > 0 && (
                <>
                  {postFeed.error ? (
                    <View style={styles.feedErrorWrap}>
                      <Text style={styles.feedErrorText}>{postFeed.error}</Text>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => {
                          void postFeed.refresh();
                        }}
                        testID="profile-post-feed-retry"
                      >
                        <Text style={styles.feedRetryText}>
                          {language === "en" ? "Try again" : "Coba lagi"}
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}
                </>
              )}
            </View>
          )}

          {activeProfileTab === "about" && (
            <View>
              <SectionHeader
                eyebrow={t("profile.aboutEyebrow")}
                title={t("profile.aboutTitle")}
              />
              <Text style={[styles.bio, { color: palette.textMuted }]}>
                {bio ||
                  t("profile.fallbackBio", { name: technician.displayName })}
              </Text>

              <SectionHeader
                eyebrow={t("profile.areasEyebrow")}
                title={t("profile.areasTitle")}
              />
              {technician.serviceAreas.length ? (
                <View style={styles.areaList}>
                  {technician.serviceAreas.map((area) => (
                    <View
                      key={area}
                      style={[
                        styles.areaChip,
                        { backgroundColor: palette.primarySoft },
                      ]}
                    >
                      <View
                        style={[
                          styles.areaPinDot,
                          { backgroundColor: palette.primary },
                        ]}
                      />
                      <Text style={[styles.areaText, { color: palette.primary }]}>
                        {localizeArea(area, language)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text
                  style={[styles.sectionEmpty, { color: palette.textMuted }]}
                >
                  {t("profile.noAreas")}
                </Text>
              )}

              {availabilitySchedule.length > 0 && (
                  <>
                    <SectionHeader
                      eyebrow={t("profile.scheduleEyebrow")}
                      title={t("profile.scheduleTitle")}
                    />
                    <View
                      style={[
                        styles.scheduleCard,
                        {
                          backgroundColor: palette.surface,
                          borderColor: palette.border,
                        },
                      ]}
                    >
                      {availabilitySchedule.map((slot, index) => (
                        <View
                          key={slot.weekday}
                          style={[
                            styles.scheduleRow,
                            index < availabilitySchedule.length - 1 && {
                              borderBottomColor: palette.border,
                            },
                          ]}
                        >
                          <Text style={[styles.scheduleDay, { color: palette.text }]}>
                            {weekdayNames[slot.weekday] ?? ""}
                          </Text>
                          <Text
                            style={[
                              styles.scheduleHours,
                              { color: slot.isAvailable ? palette.primary : palette.textMuted },
                              !slot.isAvailable && styles.scheduleHoursClosed,
                            ]}
                          >
                            {slot.isAvailable
                              ? `${slot.startTime} – ${slot.endTime} WIB`
                              : t("profile.closedDay")}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}
            </View>
          )}

          {activeProfileTab === "services" && (
            <View>
              <SectionHeader
                eyebrow={t("profile.servicesEyebrow")}
                title={t("profile.servicesTitle")}
                trailing={t("profile.serviceCount", {
                  count: technician.services.length,
                })}
              />
              {technician.services.length ? (
                technician.services.map((service) => {
                  const serviceDisplayName =
                    language === "en"
                      ? service.nameEn || service.name
                      : service.name;
                  const serviceDesc =
                    language === "en"
                      ? service.descriptionEn || service.description
                      : service.description;

                  return (
                    <View
                      key={service.id}
                      style={[
                        styles.serviceCard,
                        {
                          backgroundColor: palette.surface,
                          borderColor: palette.border,
                        },
                      ]}
                    >
                      <View style={styles.serviceRow}>
                        <ServiceCategoryGlyph
                          iconKey={service.categorySlug}
                          size={42}
                        />
                        <View style={styles.serviceCopy}>
                          <Text
                            style={[
                              styles.serviceName,
                              { color: palette.text },
                            ]}
                          >
                            {serviceDisplayName}
                          </Text>
                          <Text style={[styles.serviceCategory, { color: palette.primary }]}>
                            {categoryName(
                              service.categorySlug,
                              language === "en"
                                ? service.categoryNameEn || service.categoryName
                                : service.categoryName,
                              t,
                            )}
                          </Text>
                          {serviceDesc && (
                            <Text
                              style={[
                                styles.serviceDescription,
                                { color: palette.textMuted },
                              ]}
                            >
                              {serviceDesc}
                            </Text>
                          )}
                          {service.estimatedDurationMinutes !== undefined && (
                            <Text
                              style={[
                                styles.serviceDuration,
                                { color: palette.textMuted },
                              ]}
                            >
                              {t("profile.duration", {
                                minutes: service.estimatedDurationMinutes,
                              })}
                            </Text>
                          )}
                        </View>
                        <View style={styles.serviceRight}>
                          {service.startingPrice !== undefined && (
                            <Text style={[styles.servicePrice, { color: palette.primary }]}>
                              {t("profile.startingPrice", {
                                price: formatRupiah(
                                  service.startingPrice,
                                  language,
                                ),
                              })}
                            </Text>
                          )}
                          {!isProfileOwner ? (
                            <Pressable
                              accessibilityRole="button"
                              onPress={() => navigateToBooking(service.id)}
                              style={[
                                styles.serviceSelectBtn,
                                { backgroundColor: palette.primarySoft },
                              ]}
                              testID={`select-service-${service.id}`}
                            >
                              <Text
                                style={[
                                  styles.serviceSelectBtnText,
                                  { color: palette.primary },
                                ]}
                              >
                                {t("profile.selectServiceAction")}
                              </Text>
                            </Pressable>
                          ) : (
                            <View
                              style={[
                                styles.serviceOwnerTag,
                                {
                                  backgroundColor: palette.surfaceElevated,
                                  borderColor: palette.border,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.serviceOwnerTagText,
                                  { color: palette.textMuted },
                                ]}
                              >
                                {language === "en" ? "Offered" : "Ditawarkan"}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })
              ) : (
                <EmptyState
                  title={t("profile.noServices")}
                  description={
                    language === "en"
                      ? "Services will be listed here when available."
                      : "Layanan akan ditampilkan di sini saat tersedia."
                  }
                />
              )}
            </View>
          )}

          {activeProfileTab === "portfolio" && (
            <View>
              <SectionHeader
                eyebrow={t("profile.portfolioEyebrow")}
                title={t("profile.portfolioTitle")}
                trailing={t("profile.portfolioCount", {
                  count: technician.portfolio.length,
                })}
              />
              {technician.portfolio.length ? (
                <View style={styles.portfolioGrid}>
                  {technician.portfolio.map((item) => {
                    const title =
                      language === "en"
                        ? item.titleEn || item.title
                        : item.title;
                    const desc =
                      language === "en"
                        ? item.descriptionEn || item.description
                        : item.description;
                    return (
                      <Pressable
                        key={item.id}
                        accessibilityRole="button"
                        onPress={() => setExpandedPortfolio(item)}
                        style={[
                          styles.portfolioCard,
                          {
                            backgroundColor: palette.surface,
                            borderColor: palette.border,
                          },
                        ]}
                        testID={`portfolio-item-${item.id}`}
                      >
                        <PortfolioPhoto
                          uri={item.imageUri}
                          title={title}
                          fallbackLabel={t("profile.portfolioPhoto")}
                        />
                        <Text
                          numberOfLines={2}
                          style={[styles.portfolioTitle, { color: palette.text }]}
                        >
                          {title}
                        </Text>
                        {desc && (
                          <Text
                            numberOfLines={2}
                            style={[
                              styles.portfolioDescription,
                              { color: palette.textMuted },
                            ]}
                          >
                            {desc}
                          </Text>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <EmptyState
                  title={t("profile.noPortfolio")}
                  description={
                    language === "en"
                      ? "Verified work photos will appear here."
                      : "Foto hasil pekerjaan terverifikasi akan tampil di sini."
                  }
                />
              )}
            </View>
          )}

          {activeProfileTab === "reviews" && (
            <View>
              <SectionHeader
                eyebrow={t("profile.reviewsEyebrow")}
                title={t("profile.reviewsTitle")}
                trailing={
                  technician.reviewCount
                    ? t("profile.reviewCount", {
                        count: technician.reviewCount,
                      })
                    : undefined
                }
              />
              {technician.reviews.length ? (
                technician.reviews.map((review) => (
                  <View
                    key={review.id}
                    style={[
                      styles.reviewCard,
                      {
                        backgroundColor: palette.surface,
                        borderColor: palette.border,
                      },
                    ]}
                  >
                    <View style={styles.reviewTop}>
                      <Text
                        style={[styles.reviewerName, { color: palette.text }]}
                      >
                        {review.customerName}
                      </Text>
                      <View style={styles.reviewRating}>
                        <Text style={styles.star}>★</Text>
                        <Text
                          style={[
                            styles.reviewRatingText,
                            { color: palette.text },
                          ]}
                        >
                          {review.rating.toFixed(1)}
                        </Text>
                      </View>
                    </View>
                    {(language === "en"
                      ? review.commentEn || review.comment
                      : review.comment) && (
                      <Text
                        style={[
                          styles.reviewComment,
                          { color: palette.textMuted },
                        ]}
                      >
                        {language === "en"
                          ? review.commentEn || review.comment
                          : review.comment}
                      </Text>
                    )}
                    {review.createdAt && (
                      <Text
                        style={[
                          styles.reviewDate,
                          { color: palette.textMuted },
                        ]}
                      >
                        {formatDate(review.createdAt, language)}
                      </Text>
                    )}
                  </View>
                ))
              ) : (
                <EmptyState
                  title={t("profile.noReviews")}
                  description={
                    language === "en"
                      ? "Customer feedback will appear here after completed jobs."
                      : "Ulasan pelanggan akan tampil setelah pekerjaan selesai."
                  }
                />
              )}

              {!isProfileOwner && (
                <View style={styles.reportBar}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setReportStatusNote(null);
                      setReportError(null);
                      setReportModalVisible(true);
                    }}
                    style={[
                      styles.reportButton,
                      { borderColor: palette.border },
                    ]}
                    testID="report-technician-button"
                  >
                    <Text
                      style={[
                        styles.reportButtonText,
                        { color: palette.textMuted },
                      ]}
                    >
                      {t("profile.reportTechnician")}
                    </Text>
                  </Pressable>
                </View>
              )}

              <View style={styles.profileFooterSpace} />
            </View>
          )}
        </View>
          </>
        }
        ListEmptyComponent={
          activeProfileTab !== "posts"
            ? undefined
            : postFeed.loading
              ? <LoadingState label={t("profile.loading")} />
              : postFeed.error
                ? (
                  <EmptyState
                    title={
                      language === "en"
                        ? "Posts could not be loaded"
                        : "Postingan tidak dapat dimuat"
                    }
                    description={
                      postFeed.error.includes("technician_posts") ||
                      postFeed.error.includes("PGRST205")
                        ? language === "en"
                          ? "Supabase cannot find technician_posts in its API schema. Apply the technician posts migration and refresh the API schema cache."
                          : "Supabase belum menemukan technician_posts di skema API. Terapkan migrasi postingan teknisi lalu segarkan cache skema API."
                        : postFeed.error
                    }
                    actionLabel={language === "en" ? "Retry" : "Coba lagi"}
                    onAction={() => {
                      void postFeed.refresh();
                    }}
                  />
                )
              : (
                <EmptyState
                  title={language === "en" ? "No posts yet" : "Belum ada postingan"}
                  description={
                    language === "en"
                      ? "Work updates and useful tips will appear here."
                      : "Pembaruan pekerjaan dan tips akan tampil di sini."
                  }
                />
              )
        }
        renderItem={({ item }) => (
          <View style={styles.postCardWrap}>
            <TechnicianPostCard
              post={item}
              isOwner={isProfileOwner}
              isAdmin={isAdminUser}
              authorName={technician.displayName}
              authorAvatarUri={technician.avatarUri}
              onEdit={handleEditPost}
              onDelete={handleDeletePost}
              onSuspend={handleSuspendPost}
            />
          </View>
        )}
        listFooter={<View style={styles.profileFooterSpace} />}
      />

      {!isProfileOwner && technician.services.length > 0 && (
        <View
          style={[
            styles.bookingFooter,
            {
              backgroundColor: palette.surface,
              borderTopColor: palette.border,
            },
          ]}
        >
          <View style={styles.footerPrice}>
            <Text style={[styles.footerPriceLabel, { color: palette.textMuted }]}>
              {t("profile.priceLabel")}
            </Text>
            <Text style={[styles.footerPriceValue, { color: palette.text }]}>
              {startingPrice !== undefined
                ? t("profile.startingPrice", {
                    price: formatRupiah(startingPrice, language),
                  })
                : t("profile.discussPrice")}
            </Text>
          </View>
          <View style={styles.bookButtonWrap}>
            <PrimaryButton
              label={t("profile.bookNow")}
              testID="book-now"
              onPress={() => navigateToBooking()}
            />
          </View>
        </View>
      )}

      <Modal
        animationType="fade"
        onRequestClose={() => setExpandedPortfolio(null)}
        transparent
        visible={Boolean(expandedPortfolio)}
      >
        <Pressable
          style={styles.modalScrim}
          onPress={() => setExpandedPortfolio(null)}
        >
          {expandedPortfolio && (
            <Pressable
              style={[
                styles.portfolioModalCard,
                { backgroundColor: palette.surface },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              <PortfolioPhoto
                uri={expandedPortfolio.imageUri}
                title={
                  language === "en"
                    ? expandedPortfolio.titleEn || expandedPortfolio.title
                    : expandedPortfolio.title
                }
                fallbackLabel={t("profile.portfolioPhoto")}
                large
              />
              <Text
                style={[
                  styles.portfolioModalTitle,
                  { color: palette.text },
                ]}
              >
                {language === "en"
                  ? expandedPortfolio.titleEn || expandedPortfolio.title
                  : expandedPortfolio.title}
              </Text>
              {(language === "en"
                ? expandedPortfolio.descriptionEn ||
                  expandedPortfolio.description
                : expandedPortfolio.description) && (
                <Text
                  style={[
                    styles.portfolioModalDesc,
                    { color: palette.textMuted },
                  ]}
                >
                  {language === "en"
                    ? expandedPortfolio.descriptionEn ||
                      expandedPortfolio.description
                    : expandedPortfolio.description}
                </Text>
              )}
              <Pressable
                accessibilityRole="button"
                onPress={() => setExpandedPortfolio(null)}
                style={[
                  styles.modalCloseBtn,
                  { backgroundColor: palette.primary },
                ]}
              >
                <Text style={styles.modalCloseBtnText}>
                  {t("profile.back")}
                </Text>
              </Pressable>
            </Pressable>
          )}
        </Pressable>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => setReportModalVisible(false)}
        transparent
        visible={reportModalVisible}
      >
        <Pressable
          style={styles.modalScrim}
          onPress={() => setReportModalVisible(false)}
        >
          <Pressable
            style={[
              styles.reportModalCard,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.reportModalTitle, { color: palette.text }]}>
              {t("profile.reportTitle")}
            </Text>
            <Text
              style={[
                styles.reportModalSubtitle,
                { color: palette.textMuted },
              ]}
            >
              {t("profile.reportDescription")}
            </Text>

            <View style={styles.reportCategoryRow}>
              {(["quality", "safety", "off_platform", "no_show"] as const).map(
                (cat) => (
                  <Pressable
                    key={cat}
                    accessibilityRole="button"
                    onPress={() => setReportCategory(cat)}
                    style={[
                      styles.reportCatChip,
                      {
                        backgroundColor:
                          reportCategory === cat
                            ? palette.primarySoft
                            : palette.surfaceElevated,
                        borderColor:
                          reportCategory === cat
                            ? palette.primary
                            : palette.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.reportCatChipText,
                        {
                          color:
                            reportCategory === cat
                              ? palette.primary
                              : palette.textMuted,
                          fontWeight: reportCategory === cat ? "800" : "600",
                        },
                      ]}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                ),
              )}
            </View>

            <TextInput
              multiline
              onChangeText={setReportDescription}
              placeholder={t("profile.reportPlaceholder")}
              placeholderTextColor={palette.textMuted}
              style={[
                styles.reportInput,
                {
                  backgroundColor: palette.inputBg,
                  borderColor: palette.border,
                  color: palette.text,
                },
              ]}
              testID="report-description-input"
              value={reportDescription}
            />

            {reportError && (
              <Text style={[styles.reportErrorText, { color: palette.danger }]}>
                {reportError}
              </Text>
            )}
            {reportStatusNote && (
              <Text style={[styles.reportSuccessText, { color: palette.primary }]}>
                {reportStatusNote}
              </Text>
            )}

            <View style={styles.reportActionsRow}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setReportModalVisible(false)}
                style={[
                  styles.modalCancelBtn,
                  { backgroundColor: palette.surfaceElevated },
                ]}
              >
                <Text
                  style={[
                    styles.modalCancelBtnText,
                    { color: palette.textMuted },
                  ]}
                >
                  {t("profile.back")}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void handleSubmitReport();
                }}
                style={[
                  styles.reportSubmitBtn,
                  { backgroundColor: palette.primary },
                ]}
                testID="submit-report-button"
              >
                <Text style={styles.reportSubmitBtnText}>
                  {t("profile.reportSubmit")}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function Header({
  onBack,
  overlay = false,
}: {
  onBack: () => void;
  overlay?: boolean;
}) {
  const { t } = useLanguage();
  const { palette } = useAppearance();
  return (
    <View
      style={[
        styles.navHeader,
        { backgroundColor: overlay ? "transparent" : palette.background },
        overlay && styles.navHeaderOverlay,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("profile.back")}
        onPress={onBack}
        style={[
          styles.navBack,
          {
            backgroundColor: overlay
              ? "rgba(255,255,255,0.22)"
              : palette.surface,
          },
          overlay && styles.navBackOverlay,
        ]}
      >
        <Text
          style={[
            styles.navBackGlyph,
            { color: overlay ? "#FFFFFF" : palette.text },
            overlay && styles.navBackGlyphOverlay,
          ]}
        >
          ‹
        </Text>
      </Pressable>
      {!overlay && <View style={styles.navBalance} />}
    </View>
  );
}

function firstPrice(services: Technician["services"]): number | undefined {
  return services
    .map((service) => service.startingPrice)
    .filter((price): price is number => price !== undefined)
    .sort((a, b) => a - b)[0];
}

function formatDate(value: string, language: "id" | "en"): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(language === "id" ? "id-ID" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.paper, flex: 1 },
  centered: {
    alignItems: "center",
    backgroundColor: colors.paper,
    flex: 1,
    justifyContent: "center",
  },
  navHeader: {
    alignItems: "center",
    backgroundColor: colors.paper,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  navHeaderOverlay: {
    backgroundColor: "transparent",
    left: 12,
    paddingHorizontal: 0,
    paddingVertical: 0,
    position: "absolute",
    top: 12,
    zIndex: 2,
  },
  navBack: {
    alignItems: "center",
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  navBackOverlay: {
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: radii.pill,
  },
  navBackGlyph: { color: colors.ink, fontSize: 34, lineHeight: 38 },
  navBackGlyphOverlay: { color: "#FFFFFF" },
  navBalance: { width: 42 },
  scrollContent: { paddingBottom: 120 },
  contentWidth: {
    alignSelf: "center",
    maxWidth: 820,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    width: "100%",
  },
  postComposerWrap: {
    marginHorizontal: -15,
  },
  profileHero: { borderRadius: 0, width: "100%" },
  coverContainer: { height: 140, position: "relative", width: "100%" },
  coverImage: { height: 140, width: "100%" },
  coverFallback: {
    backgroundColor: "#064E3B",
    height: 140,
    overflow: "hidden",
    width: "100%",
  },
  coverGradientEnd: {
    backgroundColor: "#334155",
    height: 260,
    opacity: 0.72,
    position: "absolute",
    right: -80,
    top: -50,
    transform: [{ rotate: "25deg" }],
    width: "75%",
  },
  changeCoverBtn: {
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    position: "absolute",
    right: 16,
    top: 16,
  },
  changeCoverText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  avatarWrapper: {
    marginTop: -32,
    borderWidth: 3,
    borderColor: "#fff",
    borderRadius: 48,
  },
  profileHeroInner: {
    alignSelf: "center",
    maxWidth: 820,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
    width: "100%",
  },
  profileTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.lg,
  },
  profileTabBar: {
    alignItems: "stretch",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    minHeight: 48,
    zIndex: 1,
  },
  profileTab: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
    position: "relative",
  },
  profileTabText: { fontSize: 12, fontWeight: "600" },
  profileTabTextSelected: { fontWeight: "800" },
  profileTabIndicator: {
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    bottom: 0,
    height: 3,
    left: "18%",
    position: "absolute",
    right: "18%",
  },
  profileIdentity: { flex: 1, minWidth: 0 },
  nameLine: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  profileName: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  verifiedTag: {
    backgroundColor: "#fff",
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  verifiedTagText: { color: colors.greenDark, fontSize: 10, fontWeight: "800" },
  profileHandle: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 1,
  },
  businessName: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 3,
  },
  profileHeadline: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 5,
  },
  statsBar: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: radii.md,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  statCell: { flexDirection: "row", alignItems: "center" },
  statValue: { color: colors.ink, fontSize: 12, fontWeight: "700" },
  availabilityLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
    marginTop: spacing.md,
  },
  availabilityDot: { borderRadius: 4, height: 8, width: 8 },
  availabilityText: { color: colors.ink, fontSize: 12, fontWeight: "600" },
  ownerEditBtn: {
    alignItems: "center",
    backgroundColor: colors.greenDark,
    borderRadius: radii.pill,
    marginTop: spacing.md,
    paddingVertical: 10,
  },
  ownerEditBtnText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  bio: { color: "#4B5B55", fontSize: 14, lineHeight: 22 },
  serviceCard: {
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  serviceRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
  },
  serviceCopy: { flex: 1, minWidth: 0 },
  serviceName: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  serviceCategory: {
    color: colors.greenDark,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  serviceDescription: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  serviceDuration: { color: colors.muted, fontSize: 11, marginTop: 4 },
  serviceRight: { alignItems: "flex-end", gap: 6 },
  servicePrice: {
    color: colors.greenDark,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "right",
  },
  serviceSelectBtn: {
    backgroundColor: colors.greenSoft,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  serviceSelectBtnText: {
    color: colors.greenDark,
    fontSize: 11,
    fontWeight: "800",
  },
  serviceOwnerTag: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  serviceOwnerTagText: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  sectionEmpty: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  areaList: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  areaChip: {
    alignItems: "center",
    backgroundColor: colors.greenSoft,
    borderRadius: radii.pill,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  areaPinDot: {
    backgroundColor: colors.greenDark,
    borderRadius: 3.5,
    height: 7,
    width: 7,
  },
  areaText: { color: colors.greenDark, fontSize: 12, fontWeight: "700" },
  scheduleCard: {
    backgroundColor: "#FFFFFF",
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  scheduleRow: {
    alignItems: "center",
    borderBottomColor: "#F1F2EC",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 9,
  },
  scheduleDay: { color: colors.ink, fontSize: 13, fontWeight: "600" },
  scheduleHours: { color: colors.greenDark, fontSize: 12, fontWeight: "700" },
  scheduleHoursClosed: { color: colors.muted, fontWeight: "500" },
  portfolioGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
  },
  portfolioCard: {
    marginBottom: spacing.md,
    paddingHorizontal: 6,
    width: "50%",
  },
  portfolioTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 8,
  },
  portfolioDescription: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  reviewCard: {
    backgroundColor: "#fff",
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
    padding: spacing.lg,
  },
  reviewTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  reviewerName: { color: colors.ink, fontSize: 13, fontWeight: "700" },
  reviewRating: { alignItems: "center", flexDirection: "row", gap: 4 },
  star: { color: "#DCA63C", fontSize: 14 },
  reviewRatingText: { color: colors.ink, fontSize: 12, fontWeight: "700" },
  reviewComment: {
    color: "#53615C",
    fontSize: 12,
    lineHeight: 19,
    marginTop: spacing.md,
  },
  reviewDate: { color: colors.muted, fontSize: 10, marginTop: spacing.sm },
  reportBar: { alignItems: "flex-start", marginTop: spacing.xl },
  reportButton: {
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  reportButtonText: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  profileFooterSpace: { height: 16 },
  postCardWrap: {
    alignSelf: "center",
    maxWidth: 820,
    paddingHorizontal: 5,
    width: "100%",
  },
  feedErrorText: {
    color: colors.danger,
    fontSize: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  feedErrorWrap: {
    alignItems: "center",
  },
  feedRetryText: {
    color: colors.greenDark,
    fontSize: 12,
    fontWeight: "700",
    padding: spacing.sm,
  },
  bookingFooter: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  footerPrice: { flex: 1, minWidth: 0 },
  footerPriceLabel: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  footerPriceValue: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 3,
  },
  bookButtonWrap: { width: 165 },
  modalScrim: {
    alignItems: "center",
    backgroundColor: "rgba(22, 39, 34, 0.45)",
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl,
  },
  portfolioModalCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    maxWidth: 480,
    padding: spacing.lg,
    width: "100%",
  },
  portfolioModalTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "800",
    marginTop: spacing.md,
  },
  portfolioModalDesc: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.xs,
  },
  modalCloseBtn: {
    alignItems: "center",
    backgroundColor: colors.greenSoft,
    borderRadius: radii.sm,
    marginTop: spacing.lg,
    paddingVertical: 11,
  },
  modalCloseBtnText: {
    color: colors.greenDark,
    fontSize: 13,
    fontWeight: "800",
  },
  reportModalCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    maxWidth: 480,
    padding: spacing.xl,
    width: "100%",
  },
  reportModalTitle: { color: colors.ink, fontSize: 19, fontWeight: "800" },
  reportModalSubtitle: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  reportCategoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginVertical: spacing.md,
  },
  reportCatChip: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  reportCatChipSelected: {
    backgroundColor: colors.orangeSoft,
    borderColor: colors.orange,
  },
  reportCatChipText: { color: colors.muted, fontSize: 11, fontWeight: "600" },
  reportCatChipTextSelected: { color: colors.orange, fontWeight: "800" },
  reportInput: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 13,
    minHeight: 88,
    padding: spacing.md,
    textAlignVertical: "top",
  },
  reportErrorText: {
    color: colors.danger,
    fontSize: 12,
    marginTop: spacing.sm,
  },
  reportSuccessText: {
    color: colors.greenDark,
    fontSize: 12,
    fontWeight: "700",
    marginTop: spacing.sm,
  },
  reportActionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "flex-end",
    marginTop: spacing.lg,
  },
  modalCancelBtn: {
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
  },
  modalCancelBtnText: { color: colors.muted, fontSize: 13, fontWeight: "700" },
  reportSubmitBtn: {
    backgroundColor: colors.danger,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
  },
  reportSubmitBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
});
