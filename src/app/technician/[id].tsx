import AsyncStorage from "@react-native-async-storage/async-storage";
import { ArrowLeft, Camera, CheckCircle, FileText, MapPin, Pencil, PlusSquare, Settings, ShieldCheck, Star, X } from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
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
import { ImageSourceSheet } from "../../components/ImageSourceSheet";
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
  loadAccountProfileDetails,
  loadBookings,
  loadSubmittedReviews,
  saveTechnicianWorkspaceProfile,
  submitDirectTechnicianReview,
  submitTechnicianReport,
  updateTechnicianPortfolio,
} from "../../data/marketplaceStore";
import { StrictImagePicker } from "../../components/StrictImagePicker";
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

function formatCompactNumber(num: number): string {
  if (!num || Number.isNaN(num)) return "0";
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  }
  return String(num);
}

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

function cleanTechnicianTypo(text?: string | null): string {
  if (!text) return "";
  return text
    .replace(/Techinician/g, "Technician")
    .replace(/techinician/g, "technician");
}

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
  const [coverMenuVisible, setCoverMenuVisible] = useState(false);
  const [accountUsername, setAccountUsername] = useState<string>('');

  // About Me Editing State
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [draftHeadline, setDraftHeadline] = useState('');
  const [draftBio, setDraftBio] = useState('');
  const [savingAbout, setSavingAbout] = useState(false);

  // Portfolio Creation & Editing State
  const [isAddingPortfolio, setIsAddingPortfolio] = useState(false);
  const [editingPortfolioItem, setEditingPortfolioItem] = useState<PortfolioItem | null>(null);
  const [draftPortfolioTitle, setDraftPortfolioTitle] = useState('');
  const [draftPortfolioDesc, setDraftPortfolioDesc] = useState('');
  const [draftPortfolioImage, setDraftPortfolioImage] = useState<string | undefined>(undefined);
  const [savingPortfolio, setSavingPortfolio] = useState(false);

  // Review State & Permissions
  const [isAddingReview, setIsAddingReview] = useState(false);
  const [draftReviewRating, setDraftReviewRating] = useState(5);
  const [draftReviewComment, setDraftReviewComment] = useState('');
  const [savingReview, setSavingReview] = useState(false);
  const [hasCompletedTaskWithTech, setHasCompletedTaskWithTech] = useState(false);
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

  const [cachedAvatarUri, setCachedAvatarUri] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const targetId = id || user?.id;
    if (targetId) {
      void AsyncStorage.getItem(`@cepat_avatar_${targetId}`).then((saved) => {
        if (active && saved) setCachedAvatarUri(saved);
      });
      void AsyncStorage.getItem(`@cepat_cover_${targetId}`).then((saved) => {
        if (active && saved) setCoverUri(saved);
      });
      void loadAccountProfileDetails(targetId).then((details) => {
        if (active && details.username) setAccountUsername(details.username);
      });
    }
    return () => {
      active = false;
    };
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
            b.status === "completed" &&
            (b.technicianUserId === targetId ||
              b.customerUserId === targetId ||
              (user &&
                (b.technicianUserId === user.id ||
                  b.customerUserId === user.id)) ||
              (loadedTechnician && b.technicianUserId === loadedTechnician.id)),
        ).length;
        setDynamicCompletedJobs(completed);

        const userHasCompletedTask = Boolean(
          user &&
            allBookings.some(
              (b) =>
                b.status === "completed" &&
                b.customerUserId === user.id &&
                (b.technicianUserId === targetId ||
                  (loadedTechnician && b.technicianUserId === loadedTechnician.id) ||
                  (targetId === "demo-rizky" && b.technicianUserId === "demo-rizky")),
            ),
        );
        setHasCompletedTaskWithTech(userHasCompletedTask);
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
          completedJobsCount: dynamicCompletedJobs,
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

  const postAvatarFallback =
    posts.find((p) => p.technicianId === id && p.technicianAvatarUri)
      ?.technicianAvatarUri;

  const technician: Technician | null = rawTechnician
    ? {
        ...rawTechnician,
        displayName:
          (isProfileOwner && accountDisplayName) || rawTechnician.displayName,
        avatarUri:
          (isProfileOwner && user?.user_metadata?.avatar_url) ||
          rawTechnician.avatarUri ||
          cachedAvatarUri ||
          postAvatarFallback,
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

  const handleCoverSelected = async (newUri: string) => {
    setCoverMenuVisible(false);
    setCoverUri(newUri);
    const targetId = id || user?.id;
    if (targetId) {
      try {
        await AsyncStorage.setItem(`@cepat_cover_${targetId}`, newUri);
      } catch {}
    }
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

  const rawTechUsername =
    (isProfileOwner && typeof user?.user_metadata?.username === "string" && user.user_metadata.username.trim()) ||
    accountUsername ||
    rawTechnician?.username ||
    (technician?.displayName ? technician.displayName.toLowerCase().replace(/[^a-z0-9_]/g, '') : '') ||
    'technician';
  const formattedTechHandle = `@${rawTechUsername.replace(/^@/, '')}`;

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
  const canAddReview = Boolean(
    user &&
      !isProfileOwner &&
      user.id !== technician.id &&
      (isAdminUser || hasCompletedTaskWithTech),
  );

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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
              <View style={styles.coverTopRightRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    language === "en" ? "Change cover photo" : "Ubah foto sampul"
                  }
                  onPress={() => setCoverMenuVisible(true)}
                  style={[
                    styles.coverIconBtn,
                    { backgroundColor: "rgba(0, 0, 0, 0.55)", borderColor: palette.primary },
                  ]}
                  testID="change-cover-btn"
                >
                  <Camera color="#FFFFFF" size={16} strokeWidth={2.2} />
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    language === "en" ? "Settings" : "Pengaturan"
                  }
                  onPress={() => router.push("/account")}
                  style={[
                    styles.coverIconBtn,
                    { backgroundColor: "rgba(0, 0, 0, 0.55)", borderColor: palette.primary },
                  ]}
                  testID="profile-settings-btn"
                >
                  <Settings color="#FFFFFF" size={16} strokeWidth={2.2} />
                </Pressable>
              </View>
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
                  { borderColor: "#FFFFFF" },
                ]}
              >
                <ProfileAvatar
                  uri={technician.avatarUri}
                  name={cleanTechnicianTypo(technician.displayName)}
                  size={80}
                  editable={isProfileOwner}
                  onImageSelected={handleAvatarSelected}
                  testID="technician-profile-avatar"
                />
              </View>
              <View style={styles.profileIdentity}>
                <View style={styles.nameLine}>
                  <Text style={[styles.profileName, { color: palette.text }]}>
                    {cleanTechnicianTypo(technician.displayName)}
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
                <Text
                  style={[styles.profileHandle, { color: palette.textMuted }]}
                  testID="technician-profile-handle"
                >
                  {user ? formattedTechHandle : rawTechUsername}
                </Text>
                {technician.businessName &&
                  cleanTechnicianTypo(technician.businessName) !== cleanTechnicianTypo(technician.displayName) && (
                    <Text
                      style={[
                        styles.businessName,
                        { color: palette.textMuted },
                      ]}
                    >
                      {cleanTechnicianTypo(technician.businessName)}
                    </Text>
                  )}
                <Text style={[styles.profileHeadline, { color: palette.primary }]}>
                  {cleanTechnicianTypo(headline || t("technician.serviceFallback"))}
                </Text>
              </View>
            </View>

            {/* 4 Badges in a single horizontal line, radius 5px */}
            <View style={styles.singleLineBadgesRow} testID="technician-stats-bar">
              {/* 1. Rating Badge */}
              <View
                style={[
                  styles.singleBadgeItem,
                  { backgroundColor: palette.surface, borderColor: palette.border },
                ]}
                testID="technician-rating-badge"
              >
                <View style={styles.badgeTopRow}>
                  <Text style={styles.badgeGoldStar}>★</Text>
                  <Text style={[styles.badgeValueText, { color: palette.text }]}>
                    {technician.reviewCount ? technician.averageRating.toFixed(1) : (technician.averageRating > 0 ? technician.averageRating.toFixed(1) : '5.0')}
                  </Text>
                </View>
                <Text numberOfLines={1} style={[styles.badgeLabelText, { color: palette.textMuted }]}>
                  {formatCompactNumber(technician.reviewCount)} {language === "en" ? "rev" : "ul"}
                </Text>
              </View>

              {/* 2. Tasks Completed Badge */}
              <View
                style={[
                  styles.singleBadgeItem,
                  { backgroundColor: palette.surface, borderColor: palette.border },
                ]}
                testID="technician-tasks-badge"
              >
                <View style={styles.badgeTopRow}>
                  <CheckCircle size={12} color={palette.primary} strokeWidth={2.2} />
                  <Text style={[styles.badgeValueText, { color: palette.text }]}>
                    {formatCompactNumber(technician.completedJobsCount)}
                  </Text>
                </View>
                <Text numberOfLines={1} style={[styles.badgeLabelText, { color: palette.textMuted }]}>
                  {language === "en" ? "tasks" : "tugas"}
                </Text>
              </View>

              {/* 3. Posts Created Badge */}
              <View
                style={[
                  styles.singleBadgeItem,
                  { backgroundColor: palette.surface, borderColor: palette.border },
                ]}
                testID="technician-posts-badge"
              >
                <View style={styles.badgeTopRow}>
                  <FileText size={12} color={palette.primary} strokeWidth={2.2} />
                  <Text style={[styles.badgeValueText, { color: palette.text }]}>
                    {formatCompactNumber(posts.length)}
                  </Text>
                </View>
                <Text numberOfLines={1} style={[styles.badgeLabelText, { color: palette.textMuted }]}>
                  {language === "en" ? "posts" : "post"}
                </Text>
              </View>

              {/* 4. Service Area Badge */}
              <View
                style={[
                  styles.singleBadgeItem,
                  { backgroundColor: palette.surface, borderColor: palette.border },
                ]}
                testID="technician-area-badge"
              >
                <View style={styles.badgeTopRow}>
                  <MapPin size={12} color={palette.primary} strokeWidth={2.2} />
                  <Text numberOfLines={1} style={[styles.badgeValueArea, { color: palette.text }]}>
                    {technician.serviceAreas[0] ? localizeArea(technician.serviceAreas[0], language).split(' ')[0] : (language === "en" ? "Area" : "Area")}
                  </Text>
                </View>
                <Text numberOfLines={1} style={[styles.badgeLabelText, { color: palette.textMuted }]}>
                  {technician.serviceAreas[0] ? localizeArea(technician.serviceAreas[0], language) : (language === "en" ? "All areas" : "Semua")}
                </Text>
              </View>
            </View>

            {/* Quick Actions Bar - 4 Equal-width Badges in a Single Line, Radius 5px */}
            <View style={styles.singleLineActionsRow}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setActiveProfileTab("posts");
                }}
                style={[
                  styles.singleActionBadge,
                  { backgroundColor: palette.surface, borderColor: palette.border },
                ]}
                testID="quick-action-post"
              >
                <PlusSquare size={12} color={palette.primary} strokeWidth={2.2} />
                <Text
                  numberOfLines={1}
                  style={[styles.actionBadgeText, { color: palette.text }]}
                >
                  {isProfileOwner || isAdminUser
                    ? (language === "en" ? "New Post" : "Buat Post")
                    : (language === "en" ? "Posts" : "Post")}
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setActiveProfileTab("portfolio");
                  if (isProfileOwner || isAdminUser) {
                    setIsAddingPortfolio(true);
                  }
                }}
                style={[
                  styles.singleActionBadge,
                  { backgroundColor: palette.surface, borderColor: palette.border },
                ]}
                testID="quick-action-portfolio"
              >
                <Camera size={12} color={palette.primary} strokeWidth={2.2} />
                <Text
                  numberOfLines={1}
                  style={[styles.actionBadgeText, { color: palette.text }]}
                >
                  {isProfileOwner || isAdminUser
                    ? (language === "en" ? "Add Work" : "+ Portofolio")
                    : (language === "en" ? "Work" : "Portofolio")}
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setActiveProfileTab("about");
                  if (isProfileOwner || isAdminUser) {
                    setIsEditingAbout(true);
                  }
                }}
                style={[
                  styles.singleActionBadge,
                  { backgroundColor: palette.surface, borderColor: palette.border },
                ]}
                testID="quick-action-about"
              >
                <Pencil size={12} color={palette.primary} strokeWidth={2.2} />
                <Text
                  numberOfLines={1}
                  style={[styles.actionBadgeText, { color: palette.text }]}
                >
                  {isProfileOwner || isAdminUser
                    ? (language === "en" ? "Edit About" : "Ubah Bio")
                    : (language === "en" ? "About" : "Bio")}
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setActiveProfileTab("reviews");
                  if (canAddReview) {
                    setIsAddingReview(true);
                  }
                }}
                style={[
                  styles.singleActionBadge,
                  {
                    backgroundColor: palette.primarySoft,
                    borderColor: palette.primarySoft,
                  },
                ]}
                testID="quick-action-review"
              >
                <Star size={12} color={palette.primary} strokeWidth={2.2} />
                <Text
                  numberOfLines={1}
                  style={[styles.actionBadgeText, { color: palette.primary, fontWeight: '700' }]}
                >
                  {language === "en" ? "Review" : "Ulasan"}
                </Text>
              </Pressable>
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
          </View>
        </View>

        <View
          style={[
            styles.profileTabBarWrap,
            {
              backgroundColor: palette.surface,
              borderBottomColor: palette.border,
            },
          ]}
        >
          <View
            style={[
              styles.profileTabBar,
              {
                backgroundColor: palette.surface,
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

              {posts.length > 0 ? (
                <>
                  {posts.map((item) => (
                    <View key={item.id} style={styles.postCardWrap}>
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
                  ))}
                  {postFeed.hasMore && (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        void postFeed.loadMore();
                      }}
                      style={[
                        styles.loadMorePostsBtn,
                        { backgroundColor: palette.surface, borderColor: palette.border },
                      ]}
                      testID="profile-post-feed-load-more"
                    >
                      <Text style={[styles.loadMorePostsText, { color: palette.primary }]}>
                        {postFeed.loadingMore
                          ? "..."
                          : language === "en"
                            ? "Load more posts"
                            : "Muat lebih banyak"}
                      </Text>
                    </Pressable>
                  )}
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
              ) : postFeed.loading ? (
                <LoadingState label={t("profile.loading")} />
              ) : postFeed.error ? (
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
              ) : (
                <EmptyState
                  title={language === "en" ? "No posts yet" : "Belum ada postingan"}
                  description={
                    language === "en"
                      ? "Work updates and useful tips will appear here."
                      : "Pembaruan pekerjaan dan tips akan tampil di sini."
                  }
                />
              )}
            </View>
          )}

          {activeProfileTab === "about" && (
            <View>
              <View style={styles.sectionHeaderRow}>
                <SectionHeader
                  eyebrow={t("profile.aboutEyebrow")}
                  title={t("profile.aboutTitle")}
                  compact
                />
                {(isProfileOwner || isAdminUser) && !isEditingAbout && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setDraftHeadline(technician.headline || '');
                      setDraftBio(technician.bio || '');
                      setIsEditingAbout(true);
                    }}
                    style={[styles.smallActionBtn, { backgroundColor: palette.primarySoft }]}
                    testID="edit-about-btn"
                  >
                    <Text style={[styles.smallActionBtnText, { color: palette.primary }]}>
                      {language === "en" ? "Edit About" : "Ubah Bio"}
                    </Text>
                  </Pressable>
                )}
              </View>

              {isEditingAbout ? (
                <View
                  style={[
                    styles.formCardModern,
                    { backgroundColor: palette.surface, borderColor: palette.border },
                  ]}
                  testID="edit-about-form"
                >
                  <View style={styles.formHeaderRow}>
                    <Text style={[styles.formTitleModern, { color: palette.text }]}>
                      {language === "en" ? "Edit About" : "Ubah Informasi Bio"}
                    </Text>
                  </View>

                  <TextInput
                    value={draftHeadline}
                    onChangeText={setDraftHeadline}
                    placeholder={
                      language === "en"
                        ? "Headline (e.g. Master AC & Electrical Specialist)"
                        : "Keahlian utama (cth. Spesialis AC & Listrik)"
                    }
                    placeholderTextColor={palette.textMuted}
                    style={[
                      styles.formInputModern,
                      {
                        backgroundColor: palette.inputBg,
                        borderColor: palette.border,
                        color: palette.text,
                      },
                    ]}
                  />

                  {/* Unified Textarea Box with Inner Footer & Live 200 Char Counter (NO image upload) */}
                  <View
                    style={[
                      styles.composerTextareaBox,
                      { backgroundColor: palette.inputBg, borderColor: palette.border },
                    ]}
                  >
                    <TextInput
                      multiline
                      maxLength={200}
                      value={draftBio}
                      onChangeText={(text) => setDraftBio(text.slice(0, 200))}
                      placeholder={
                        language === "en"
                          ? "Tell clients about your background, experience, and service guarantee..."
                          : "Ceritakan keahlian, pengalaman, dan garansi layanan Anda..."
                      }
                      placeholderTextColor={palette.textMuted}
                      style={[
                        styles.composerTextInput,
                        { color: palette.text },
                      ]}
                      testID="edit-about-bio-input"
                    />

                    {/* Footer inside the textarea box with live character countdown (NO IMAGE BUTTON) */}
                    <View
                      style={[
                        styles.composerFooterRow,
                        { borderTopColor: palette.border, justifyContent: "flex-end" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.charCounterText,
                          draftBio.length > 170
                            ? styles.charCounterWarning
                            : { color: palette.textMuted },
                        ]}
                      >
                        {200 - draftBio.length}
                      </Text>
                    </View>
                  </View>

                  {/* Save & Cancel Action Buttons */}
                  <View style={styles.formButtonRow}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setIsEditingAbout(false)}
                      style={[
                        styles.formCancelBtnModern,
                        { borderColor: palette.border, backgroundColor: palette.surfaceElevated },
                      ]}
                    >
                      <Text style={[styles.formBtnTextModern, { color: palette.text }]}>
                        {language === "en" ? "Cancel" : "Batal"}
                      </Text>
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      disabled={savingAbout}
                      onPress={async () => {
                        setSavingAbout(true);
                        try {
                          const updated = {
                            ...technician,
                            headline: draftHeadline.trim() || undefined,
                            bio: draftBio.trim() || undefined,
                          };
                          await saveTechnicianWorkspaceProfile(technician.id, updated);
                          setLoadedTechnician((prev) =>
                            prev ? { ...prev, headline: updated.headline, bio: updated.bio } : updated,
                          );
                          setIsEditingAbout(false);
                        } finally {
                          setSavingAbout(false);
                        }
                      }}
                      style={[
                        styles.formSaveBtnModern,
                        { backgroundColor: palette.primary },
                      ]}
                      testID="save-about-btn"
                    >
                      <Text style={styles.formSaveBtnTextModern}>
                        {savingAbout
                          ? "..."
                          : language === "en"
                          ? "Save About"
                          : "Simpan"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View
                  style={[
                    styles.modernCard,
                    { backgroundColor: palette.surface, borderColor: palette.border },
                  ]}
                >
                  <Text style={[styles.bio, { color: palette.text }]}>
                    {bio || t("profile.fallbackBio", { name: technician.displayName })}
                  </Text>
                </View>
              )}

              <SectionHeader
                eyebrow={t("profile.areasEyebrow")}
                title={t("profile.areasTitle")}
                compact
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
              <View style={styles.sectionHeaderRow}>
                <SectionHeader
                  eyebrow={t("profile.portfolioEyebrow")}
                  title={t("profile.portfolioTitle")}
                  trailing={t("profile.portfolioCount", {
                    count: technician.portfolio.length,
                  })}
                  compact
                />
                {(isProfileOwner || isAdminUser) && !isAddingPortfolio && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setDraftPortfolioTitle('');
                      setDraftPortfolioDesc('');
                      setDraftPortfolioImage(undefined);
                      setIsAddingPortfolio(true);
                    }}
                    style={[styles.smallActionBtn, { backgroundColor: palette.primarySoft }]}
                    testID="add-portfolio-trigger-btn"
                  >
                    <Text style={[styles.smallActionBtnText, { color: palette.primary }]}>
                      {language === "en" ? "+ Add Work" : "+ Portofolio"}
                    </Text>
                  </Pressable>
                )}
              </View>

              {isAddingPortfolio && (
                <View
                  style={[
                    styles.formCardModern,
                    { backgroundColor: palette.surface, borderColor: palette.border },
                  ]}
                  testID="add-portfolio-form"
                >
                  <View style={styles.formHeaderRow}>
                    <Text style={[styles.formTitleModern, { color: palette.text }]}>
                      {language === "en" ? "Add Work to Portfolio" : "Tambah Karya ke Portofolio"}
                    </Text>
                  </View>

                  <TextInput
                    value={draftPortfolioTitle}
                    onChangeText={setDraftPortfolioTitle}
                    placeholder={
                      language === "en"
                        ? "Work title (e.g. Master AC Installation & Repair)"
                        : "Judul pekerjaan (cth. Pemasangan & Servis AC Unit)"
                    }
                    placeholderTextColor={palette.textMuted}
                    style={[
                      styles.formInputModern,
                      {
                        backgroundColor: palette.inputBg,
                        borderColor: palette.border,
                        color: palette.text,
                      },
                    ]}
                    testID="portfolio-title-input"
                  />

                  {/* Unified Textarea Box with Inner Footer & Live 200 Char Counter */}
                  <View
                    style={[
                      styles.composerTextareaBox,
                      { backgroundColor: palette.inputBg, borderColor: palette.border },
                    ]}
                  >
                    <TextInput
                      multiline
                      maxLength={200}
                      value={draftPortfolioDesc}
                      onChangeText={(text) => setDraftPortfolioDesc(text.slice(0, 200))}
                      placeholder={
                        language === "en"
                          ? "Brief description of the work completed..."
                          : "Keterangan singkat pekerjaan yang diselesaikan..."
                      }
                      placeholderTextColor={palette.textMuted}
                      style={[
                        styles.composerTextInput,
                        { color: palette.text },
                      ]}
                      testID="portfolio-desc-input"
                    />

                    {/* Pre-upload Image Preview inside container */}
                    {draftPortfolioImage && (
                      <View style={styles.composerImagePreviewWrap}>
                        <Image
                          source={{ uri: draftPortfolioImage }}
                          style={styles.composerImageThumb}
                          resizeMode="cover"
                        />
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Remove photo"
                          onPress={() => setDraftPortfolioImage(undefined)}
                          style={styles.removeImageBadge}
                        >
                          <X size={12} color="#FFFFFF" strokeWidth={2.5} />
                        </Pressable>
                      </View>
                    )}

                    {/* Footer inside the textarea container */}
                    <View
                      style={[
                        styles.composerFooterRow,
                        { borderTopColor: palette.border },
                      ]}
                    >
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={language === "en" ? "Attach work photo" : "Lampirkan foto karya"}
                        onPress={async () => {
                          const picked = await pickImageSafely("gallery");
                          if (picked?.uri) {
                            setDraftPortfolioImage(picked.uri);
                          }
                        }}
                        style={[
                          styles.attachPhotoBtn,
                          {
                            backgroundColor: draftPortfolioImage ? palette.primarySoft : palette.surface,
                            borderColor: palette.border,
                          },
                        ]}
                        testID="portfolio-image-picker"
                      >
                        <Camera size={14} color={palette.primary} strokeWidth={2.2} />
                        <Text style={[styles.attachPhotoText, { color: palette.primary }]}>
                          {draftPortfolioImage
                            ? (language === "en" ? "Change Photo" : "Ganti Foto")
                            : (language === "en" ? "Add Photo" : "Pilih Foto")}
                        </Text>
                      </Pressable>

                      {/* Live Counter (Remaining characters out of 200) */}
                      <Text
                        style={[
                          styles.charCounterText,
                          draftPortfolioDesc.length > 170
                            ? styles.charCounterWarning
                            : { color: palette.textMuted },
                        ]}
                      >
                        {200 - draftPortfolioDesc.length}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.formButtonRow}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setIsAddingPortfolio(false)}
                      style={[
                        styles.formCancelBtnModern,
                        { borderColor: palette.border, backgroundColor: palette.surfaceElevated },
                      ]}
                    >
                      <Text style={[styles.formBtnTextModern, { color: palette.text }]}>
                        {language === "en" ? "Cancel" : "Batal"}
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      disabled={savingPortfolio || !draftPortfolioTitle.trim()}
                      onPress={async () => {
                        if (!draftPortfolioTitle.trim()) return;
                        setSavingPortfolio(true);
                        try {
                          const newItem: PortfolioItem = {
                            id: `port-${Date.now()}`,
                            title: draftPortfolioTitle.trim(),
                            description: draftPortfolioDesc.trim() || undefined,
                            imageUri: draftPortfolioImage,
                          };
                          const updatedList = [newItem, ...(technician.portfolio || [])];
                          await updateTechnicianPortfolio(technician.id, updatedList);
                          setLoadedTechnician((prev) => prev ? { ...prev, portfolio: updatedList } : prev);
                          setIsAddingPortfolio(false);
                        } finally {
                          setSavingPortfolio(false);
                        }
                      }}
                      style={[
                        styles.formSaveBtnModern,
                        {
                          backgroundColor: palette.primary,
                          opacity: draftPortfolioTitle.trim() ? 1 : 0.6,
                        },
                      ]}
                      testID="save-portfolio-btn"
                    >
                      <Text style={styles.formSaveBtnTextModern}>
                        {savingPortfolio
                          ? "..."
                          : language === "en"
                          ? "Save Work"
                          : "Simpan"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}
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
                          styles.modernPortfolioCard,
                          {
                            backgroundColor: palette.surface,
                            borderColor: palette.border,
                          },
                        ]}
                        testID={`portfolio-item-${item.id}`}
                      >
                        <View style={styles.portfolioCardPhotoFrame}>
                          <PortfolioPhoto
                            uri={item.imageUri}
                            title={title}
                            fallbackLabel={t("profile.portfolioPhoto")}
                            large
                          />
                        </View>
                        <View style={styles.portfolioCardBody}>
                          <Text
                            numberOfLines={1}
                            style={[styles.portfolioTitleModern, { color: palette.text }]}
                          >
                            {title}
                          </Text>
                          {desc && (
                            <Text
                              numberOfLines={3}
                              style={[
                                styles.portfolioDescModern,
                                { color: palette.textMuted },
                              ]}
                            >
                              {desc}
                            </Text>
                          )}
                        </View>
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
                  actionLabel={language === "en" ? "+ Add Work Photo" : "+ Tambah Foto Pekerjaan"}
                  onAction={() => {
                    setDraftPortfolioTitle('');
                    setDraftPortfolioDesc('');
                    setDraftPortfolioImage(undefined);
                    setIsAddingPortfolio(true);
                  }}
                />
              )}
            </View>
          )}

          {activeProfileTab === "reviews" && (
            <View>
              <View style={styles.sectionHeaderRow}>
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
                {!isAddingReview && canAddReview && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setDraftReviewRating(5);
                      setDraftReviewComment('');
                      setIsAddingReview(true);
                    }}
                    style={[styles.smallActionBtn, { backgroundColor: palette.primarySoft }]}
                    testID="add-review-trigger-btn"
                  >
                    <Text style={[styles.smallActionBtnText, { color: palette.primary }]}>
                      {language === "en" ? "+ Write a Review" : "+ Beri Ulasan"}
                    </Text>
                  </Pressable>
                )}
              </View>

              {!canAddReview && !isProfileOwner && (
                <View
                  style={[
                    styles.modernCard,
                    {
                      backgroundColor: palette.surface,
                      borderColor: palette.border,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 10,
                    },
                  ]}
                  testID="verified-review-only-notice"
                >
                  <ShieldCheck size={16} color={palette.primary} strokeWidth={2.2} />
                  <Text style={{ color: palette.textMuted, fontSize: 12, flex: 1 }}>
                    {language === "en"
                      ? "Feedback is allowed only after a customer completes a task with this technician."
                      : "Ulasan hanya dapat diberikan setelah pelanggan menyelesaikan tugas dengan teknisi ini."}
                  </Text>
                </View>
              )}

              {/* Performance Stars Breakdown: Shows who gave 5 stars, 4 stars, etc. */}
              <View
                style={[
                  styles.performanceCard,
                  { backgroundColor: palette.surface, borderColor: palette.border },
                ]}
                testID="performance-breakdown-card"
              >
                <View style={styles.performanceOverview}>
                  <Text style={[styles.performanceBigScore, { color: palette.text }]}>
                    {technician.reviewCount > 0 ? technician.averageRating.toFixed(1) : (technician.averageRating > 0 ? technician.averageRating.toFixed(1) : '5.0')}
                  </Text>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((starIdx) => (
                      <Text key={starIdx} style={styles.goldStarBig}>★</Text>
                    ))}
                  </View>
                  <Text style={[styles.performanceSubtext, { color: palette.textMuted }]}>
                    {formatCompactNumber(technician.reviewCount)} {language === "en" ? "reviews" : "ulasan"}
                  </Text>
                  <Text style={[styles.performanceBadgeText, { color: palette.primary }]}>
                    {formatCompactNumber(technician.completedJobsCount)} {language === "en" ? "tasks completed" : "tugas selesai"}
                  </Text>
                </View>

                {/* Rating Distribution Bars */}
                <View style={styles.distributionCol}>
                  {[5, 4, 3, 2, 1].map((starNum) => {
                    const count = technician.reviews.filter(
                      (r) => Math.round(r.rating) === starNum
                    ).length;
                    const total = Math.max(1, technician.reviews.length);
                    const pct = Math.round((count / total) * 100);

                    return (
                      <View key={starNum} style={styles.distributionRow}>
                        <Text style={[styles.distributionStarLabel, { color: palette.text }]}>
                          {starNum} ★
                        </Text>
                        <View style={[styles.distributionTrack, { backgroundColor: palette.surfaceElevated }]}>
                          <View
                            style={[
                              styles.distributionFill,
                              { backgroundColor: palette.primary, width: `${pct}%` },
                            ]}
                          />
                        </View>
                        <Text style={[styles.distributionCount, { color: palette.textMuted }]}>
                          {formatCompactNumber(count)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Add Review Form */}
              {isAddingReview && (
                <View style={[styles.formCard, { backgroundColor: palette.surface, borderColor: palette.border }]} testID="add-review-form">
                  <Text style={[styles.formLabel, { color: palette.text }]}>
                    {language === "en" ? "Your Star Rating" : "Rating Bintang Anda"}
                  </Text>
                  <View style={styles.interactiveStarsRow}>
                    {[1, 2, 3, 4, 5].map((val) => (
                      <Pressable
                        key={val}
                        accessibilityRole="button"
                        onPress={() => setDraftReviewRating(val)}
                        style={styles.starTouchBtn}
                      >
                        <Text style={val <= draftReviewRating ? styles.interactiveGoldStar : styles.interactiveMutedStar}>
                          ★
                        </Text>
                      </Pressable>
                    ))}
                    <Text style={[styles.selectedRatingText, { color: palette.text }]}>
                      {draftReviewRating}.0 / 5.0
                    </Text>
                  </View>

                  <Text style={[styles.formLabel, { color: palette.text }]}>
                    {language === "en" ? "Your Review / Feedback *" : "Ulasan / Umpan Balik *"}
                  </Text>
                  <TextInput
                    multiline
                    value={draftReviewComment}
                    onChangeText={setDraftReviewComment}
                    placeholder={language === "en" ? "Describe your service experience with this technician..." : "Tulis pengalaman dan kualitas servis teknisi ini..."}
                    placeholderTextColor={palette.textMuted}
                    style={[styles.formTextarea, { backgroundColor: palette.inputBg, borderColor: palette.border, color: palette.text }]}
                    testID="review-comment-input"
                  />

                  <View style={styles.formButtonRow}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setIsAddingReview(false)}
                      style={[styles.formCancelBtn, { borderColor: palette.border }]}
                    >
                      <Text style={[styles.formBtnText, { color: palette.textMuted }]}>
                        {language === "en" ? "Cancel" : "Batal"}
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      disabled={savingReview || !draftReviewComment.trim()}
                      onPress={async () => {
                        if (!draftReviewComment.trim()) return;
                        setSavingReview(true);
                        try {
                          const newRev = await submitDirectTechnicianReview({
                            technicianId: technician.id,
                            customerName: accountDisplayName || (language === "en" ? "Verified Customer" : "Pelanggan Terverifikasi"),
                            rating: draftReviewRating,
                            comment: draftReviewComment.trim(),
                          });
                          setDynamicReviews((prev) => [newRev, ...prev]);
                          setIsAddingReview(false);
                          setDraftReviewComment('');
                          setHasCompletedTaskWithTech(false);
                        } finally {
                          setSavingReview(false);
                        }
                      }}
                      style={[styles.formSaveBtn, { backgroundColor: palette.primary, opacity: draftReviewComment.trim() ? 1 : 0.6 }]}
                      testID="submit-direct-review-btn"
                    >
                      <Text style={styles.formSaveBtnText}>
                        {savingReview ? "..." : (language === "en" ? "Submit Review" : "Kirim Ulasan")}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}
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
                  actionLabel={language === "en" ? "+ Write the First Review" : "+ Beri Ulasan Pertama"}
                  onAction={() => {
                    setDraftReviewRating(5);
                    setDraftReviewComment('');
                    setIsAddingReview(true);
                  }}
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
        <View style={styles.profileFooterSpace} />
      </ScrollView>

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

      <ImageSourceSheet
        allowFallbackUri
        backdropTestID="cover-photo-sheet-backdrop"
        onClose={() => setCoverMenuVisible(false)}
        onImageSelected={(nextUri) => {
          void handleCoverSelected(nextUri);
        }}
        subtitle={
          language === "en"
            ? "Choose a photo for your profile banner."
            : "Pilih foto untuk sampul profil Anda."
        }
        testIDPrefix="cover"
        title={language === "en" ? "Update Cover Photo" : "Ubah Foto Sampul"}
        visible={coverMenuVisible}
      />
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
          styles.sleekBackBtn,
          {
            backgroundColor: overlay
              ? "rgba(0, 0, 0, 0.45)"
              : palette.surface,
            borderColor: overlay ? "rgba(255,255,255,0.25)" : palette.border,
          },
        ]}
      >
        <ArrowLeft
          size={18}
          color={overlay ? "#FFFFFF" : palette.text}
          strokeWidth={2.2}
        />
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
    paddingHorizontal: 5,
    paddingTop: 6,
    width: "100%",
  },
  postComposerWrap: {
    marginHorizontal: 0,
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
  coverTopRightRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    position: "absolute",
    right: 16,
    top: 16,
    zIndex: 10,
  },
  coverIconBtn: {
    alignItems: "center",
    borderRadius: 5,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  changeCoverBtn: {
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    position: "absolute",
    right: 16,
    top: 16,
  },
  changeCoverText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  avatarWrapper: {
    marginTop: -40,
    marginLeft: 16,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    borderRadius: 40,
  },
  profileHeroInner: {
    alignSelf: "center",
    maxWidth: 820,
    paddingHorizontal: 5,
    paddingBottom: spacing.md,
    paddingTop: 0,
    width: "100%",
  },
  profileTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.lg,
  },
  profileTabBarWrap: {
    borderBottomWidth: 1,
    width: "100%",
  },
  profileTabBar: {
    alignItems: "stretch",
    alignSelf: "center",
    flexDirection: "row",
    justifyContent: "space-around",
    maxWidth: 820,
    minHeight: 48,
    paddingHorizontal: 5,
    width: "100%",
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
    fontWeight: "700",
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
    fontSize: 14,
    fontWeight: "500",
    marginTop: 2,
  },
  profileHeadline: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
    marginTop: 2,
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
    paddingHorizontal: 0,
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


  singleLineBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: spacing.md,
    width: '100%',
  },
  singleBadgeItem: {
    flex: 1,
    minWidth: 0,
    borderRadius: 5,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  badgeGoldStar: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: '800',
  },
  badgeValueText: {
    fontSize: 13,
    fontWeight: '700',
  },
  badgeValueArea: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeLabelText: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
    textTransform: 'lowercase',
  },
  sleekBackBtn: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  cameraAccentBadge: {
    alignItems: 'center',
    borderRadius: 3,
    height: 18,
    justifyContent: 'center',
    width: 18,
  },
  modernStatsBar: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  statsBarCol: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  statsBarValueRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
  },
  statsBarValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  statsBarValueSmall: {
    fontSize: 12,
    fontWeight: '700',
  },
  statsBarLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
    textTransform: 'lowercase',
  },
  statsDivider: {
    height: 22,
    marginHorizontal: 2,
    width: 1,
  },
  goldStarSmall: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: '800',
  },
  singleLineActionsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    marginVertical: 12,
    width: '100%',
  },
  singleActionBadge: {
    alignItems: 'center',
    borderRadius: 5,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
    minWidth: 0,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  actionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  quickActionsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  quickActionBtn: {
    borderRadius: 5,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  quickActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: spacing.md,
  },
  badgePill: {
    alignItems: 'center',
    borderRadius: 5,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  goldStar: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '800',
  },
  goldStarBig: {
    color: '#F59E0B',
    fontSize: 20,
  },
  badgeIcon: {
    fontSize: 12,
    fontWeight: '700',
  },
  badgeTextBold: {
    fontSize: 12,
    fontWeight: '700',
  },
  badgeTextMuted: {
    fontSize: 11,
    fontWeight: '500',
  },
  sectionHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  smallActionBtn: {
    borderRadius: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  smallActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  formCard: {
    borderRadius: 5,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    marginTop: spacing.xs,
  },
  formInput: {
    borderRadius: 5,
    borderWidth: 1,
    fontSize: 14,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  formTextarea: {
    borderRadius: 5,
    borderWidth: 1,
    fontSize: 14,
    marginBottom: spacing.sm,
    minHeight: 80,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    textAlignVertical: 'top',
  },
  formButtonRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
  },
  formCancelBtn: {
    borderRadius: 5,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  formSaveBtn: {
    borderRadius: 5,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  formBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  formSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  portfolioPreviewRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  portfolioPreviewThumb: {
    borderRadius: 5,
    height: 48,
    width: 48,
  },
  performanceCard: {
    borderRadius: 5,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  performanceOverview: {
    alignItems: 'center',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: '#E5E7EB',
    justifyContent: 'center',
    paddingRight: spacing.md,
    minWidth: 110,
  },
  performanceBigScore: {
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 36,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
    marginVertical: 4,
  },
  performanceSubtext: {
    fontSize: 10,
    fontWeight: '500',
  },
  performanceBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  distributionCol: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  distributionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  distributionStarLabel: {
    fontSize: 11,
    fontWeight: '600',
    width: 24,
  },
  distributionTrack: {
    borderRadius: 4,
    flex: 1,
    height: 8,
    overflow: 'hidden',
  },
  distributionFill: {
    borderRadius: 4,
    height: '100%',
  },
  distributionCount: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'right',
    width: 16,
  },
  interactiveStarsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    marginBottom: spacing.xs,
  },
  starTouchBtn: {
    padding: 2,
  },
  interactiveGoldStar: {
    color: '#F59E0B',
    fontSize: 26,
  },
  interactiveMutedStar: {
    color: '#D1D5DB',
    fontSize: 26,
  },
  selectedRatingText: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 8,
  },
  formCardModern: {
    borderRadius: 5,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
    marginTop: 6,
    width: "100%",
  },
  formHeaderRow: {
    marginBottom: 8,
  },
  formTitleModern: {
    fontSize: 14,
    fontWeight: "700",
  },
  formInputModern: {
    borderRadius: 5,
    borderWidth: 1,
    fontSize: 13,
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    width: "100%",
  },
  composerTextareaBox: {
    borderRadius: 5,
    borderWidth: 1,
    padding: 10,
    width: "100%",
  },
  composerTextInput: {
    fontSize: 13,
    lineHeight: 18,
    minHeight: 68,
    textAlignVertical: "top",
    width: "100%",
  },
  composerImagePreviewWrap: {
    alignSelf: "flex-start",
    borderRadius: 4,
    marginTop: 8,
    overflow: "hidden",
    position: "relative",
  },
  composerImageThumb: {
    borderRadius: 4,
    height: 90,
    width: 120,
  },
  removeImageBadge: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    borderRadius: 10,
    height: 20,
    justifyContent: "center",
    position: "absolute",
    right: 4,
    top: 4,
    width: 20,
  },
  composerFooterRow: {
    alignItems: "center",
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
  },
  attachPhotoBtn: {
    alignItems: "center",
    borderRadius: 4,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  attachPhotoText: {
    fontSize: 11,
    fontWeight: "600",
  },
  charCounterText: {
    fontSize: 11,
    fontWeight: "700",
  },
  charCounterWarning: {
    color: "#E11D48",
  },
  formCancelBtnModern: {
    alignItems: "center",
    borderRadius: 5,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  formSaveBtnModern: {
    alignItems: "center",
    borderRadius: 5,
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  formBtnTextModern: {
    fontSize: 12,
    fontWeight: "700",
  },
  formSaveBtnTextModern: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  modernCard: {
    borderRadius: 5,
    borderWidth: 1,
    padding: 14,
    width: "100%",
    marginBottom: 10,
  },
  modernPortfolioCard: {
    borderRadius: 5,
    borderWidth: 1,
    overflow: "hidden",
    width: "100%",
    marginBottom: 8,
  },
  portfolioCardPhotoFrame: {
    height: 180,
    width: "100%",
    overflow: "hidden",
  },
  portfolioCardBody: {
    padding: 12,
  },
  portfolioTitleModern: {
    fontSize: 15,
    fontWeight: "700",
  },
  portfolioDescModern: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  loadMorePostsBtn: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 5,
    borderWidth: 1,
    marginVertical: 12,
  },
  loadMorePostsText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
