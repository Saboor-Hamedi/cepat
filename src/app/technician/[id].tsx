import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import {
  BadgeCheck,
  Camera,
  ChevronLeft,
  Pencil,
  Settings,
  ShieldCheck,
  Star,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
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
  Avatar,
  EmptyState,
  LoadingState,
  PrimaryButton,
  ServiceCategoryGlyph,
} from "../../components/marketplace-ui";
import { ImageSourceSheet } from "../../components/ImageSourceSheet";
import {
  PortfolioPhoto,
  ProfileAvatar,
  SectionHeader,
} from "../../profile";
import { Post } from "../../components/posts/Post";
import { PostContainer } from "../../components/posts/PostContainer";
import { formatRupiah, loadTechnician, supabase } from "../../data/marketplaceRepository";
import {
  loadAccountProfileDetails,
  loadBookings,
  loadSubmittedReviews,
  saveTechnicianWorkspaceProfile,
  submitTechnicianReport,
  updateTechnicianPortfolio,
} from "../../data/marketplaceStore";
import {
  createPost,
  deletePost,
  loadPostsPage,
  suspendPost,
  updatePost,
} from "../../data/postsStore";
import { useInfiniteList } from "../../hooks/useInfiniteList";
import { categoryName, localizeArea, useLanguage } from "../../i18n/locale";
import { useAppearance } from "../../context/AppearanceContext";
import { useAuth } from "../../auth/AuthProvider";
import type {
  DataSource,
  PortfolioItem,
  Technician,
  TechnicianReport,
  TechnicianReview,
} from "../../types/marketplace";
import type { Post as PostType } from "../../types/post";
import { colors, radii, spacing } from "../../theme/tokens";
import { ICON_SIZE, ICON_STROKE } from "../../theme/icons";
import { font } from "../../theme/typography";

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
  const [, setSource] = useState<DataSource>("fixtures");
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
  const [targetUserRoles, setTargetUserRoles] = useState<string[]>([]);

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
  const [portfolioSheetVisible, setPortfolioSheetVisible] = useState(false);

  // Review State & Permissions
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
        ? loadPostsPage(id, feedIsOwner, cursor, pageSize)
        : Promise.resolve({ items: [], nextCursor: null, hasMore: false }),
    [feedIsOwner, id],
  );
  const postFeed = useInfiniteList<PostType>({
    cacheKey: `posts:${id}:${feedIsOwner ? "owner" : "public"}`,
    enabled: Boolean(id),
    fetchPage: fetchPostPage,
    keyExtractor: (post: PostType) => post.id,
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
      if (supabase) {
        void supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", targetId)
          .then((res: { data: { role: string }[] | null }) => {
            if (active && res.data) {
              setTargetUserRoles(res.data.map((r) => r.role));
            }
          });
      }
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
        const effectiveTargetId = targetId || loadedTechnician?.id;
        const completed = allBookings.filter(
          (b) =>
            b.status === "completed" &&
            (b.technicianUserId === effectiveTargetId ||
              (loadedTechnician && b.technicianUserId === loadedTechnician.id)),
        ).length;
        setDynamicCompletedJobs(completed);

        const userHasCompletedTask = Boolean(
          user &&
            allBookings.some(
              (b) =>
                b.status === "completed" &&
                b.customerUserId === user.id &&
                (b.technicianUserId === effectiveTargetId ||
                  (loadedTechnician && b.technicianUserId === loadedTechnician.id) ||
                  (effectiveTargetId === "demo-rizky" && b.technicianUserId === "demo-rizky")),
            ),
        );
        setHasCompletedTaskWithTech(userHasCompletedTask);
      })
      .catch(() => {});

    void loadSubmittedReviews()
      .then((allReviews) => {
        if (!active) return;
        const effectiveTargetId = targetId || loadedTechnician?.id;
        const matched = allReviews.filter(
          (r) =>
            r.technicianId === effectiveTargetId ||
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

  const isTechnicianProfile = Boolean(
    (isProfileOwner && isTechnicianUser) ||
    (!isProfileOwner && (
      (loadedTechnician && (
        loadedTechnician.services.length > 0 ||
        loadedTechnician.portfolio.length > 0 ||
        loadedTechnician.id === "demo-rizky" ||
        loadedTechnician.id === "demo-sari"
      )) ||
      id === "demo-rizky" ||
      id === "demo-sari"
    ))
  );

  const currentTab = !isTechnicianProfile && (activeProfileTab === "services" || activeProfileTab === "portfolio" || activeProfileTab === "reviews")
    ? "posts"
    : activeProfileTab;

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

  const isTargetAdmin =
    targetUserRoles.includes("admin") ||
    Boolean(rawTechnician?.headline?.toLowerCase().includes("admin")) ||
    Boolean(rawTechnician?.bio?.toLowerCase().includes("admin")) ||
    Boolean(loadedTechnician?.displayName?.toLowerCase().includes("admin"));

  const hasVerifiedPost = Boolean(
    posts.some(
      (p) =>
        p.technicianVerified ||
        p.technicianId === "demo-rizky" ||
        p.technicianId === "demo-sari",
    ),
  );

  const hasPosts = Boolean(
    posts.some(
      (p) =>
        p.technicianId === id ||
        (loadedTechnician && p.technicianId === loadedTechnician.id),
    ),
  );

  const isProfileVerified = Boolean(
    loadedTechnician?.verified ||
    rawTechnician?.verified ||
    hasVerifiedPost ||
    hasPosts ||
    isTargetAdmin ||
    targetUserRoles.includes("technician") ||
    targetUserRoles.includes("admin") ||
    id === "demo-rizky" ||
    id === "demo-sari" ||
    (isProfileOwner && (isTechnicianUser || isAdminUser)) ||
    (loadedTechnician && (loadedTechnician.verified || loadedTechnician.id === "demo-rizky" || loadedTechnician.id === "demo-sari"))
  );

  const baseReviews = rawTechnician?.reviews ?? [];
  const dynamicIds = new Set(dynamicReviews.map((r) => r.id));
  const dedupedBase = baseReviews.filter((r) => !dynamicIds.has(r.id));
  const mergedReviews = isTechnicianProfile ? [...dynamicReviews, ...dedupedBase] : [];

  const effectiveReviewCount = isTechnicianProfile ? mergedReviews.length : 0;
  const effectiveAverageRating =
    isTechnicianProfile && effectiveReviewCount > 0
      ? Number(
          (
            mergedReviews.reduce((sum, r) => sum + r.rating, 0) /
            effectiveReviewCount
          ).toFixed(1),
        )
      : (isTechnicianProfile ? (rawTechnician?.averageRating ?? 0) : 0);

  const effectiveCompletedJobs = isTechnicianProfile
    ? Math.max(
        rawTechnician?.completedJobsCount ?? 0,
        dynamicCompletedJobs,
      )
    : 0;

  const postAvatarFallback =
    posts.find((p) => p.technicianId === id && p.technicianAvatarUri)
      ?.technicianAvatarUri;

  const technician: Technician | null = rawTechnician
    ? {
        ...rawTechnician,
        verified: isProfileVerified,
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
    '';
  const formattedTechHandle = rawTechUsername ? `@${rawTechUsername.replace(/^@/, '')}` : '';

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
  const canAddReview = Boolean(
    isTechnicianProfile &&
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
    try {
      const ownerId = user?.id || technician.id;
      await createPost({
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
    } catch (err) {
      console.warn('[handleCreatePost] Error creating post:', err);
    }
  };

  const handleDeletePost = async (postId: string) => {
    const ownerId = user?.id || technician.id;
    try {
      await deletePost({ actorUserId: ownerId, postId });
      await postFeed.refresh();
    } catch (err) {
      console.warn('[handleDeletePost] Failed to delete post:', err);
    }
  };

  const handleEditPost = async (
    post: PostType,
    newCaption: string,
    newImageUri?: string,
  ) => {
    const ownerId = user?.id || technician.id;
    await updatePost({
      actorUserId: ownerId,
      postId: post.id,
      caption: newCaption,
      imageUri: newImageUri,
      mediaUrls: newImageUri ? [newImageUri] : [],
    });
    await postFeed.refresh();
  };

  const handleSuspendPost = async (postId: string, suspended: boolean) => {
    const actorId = user?.id || "admin";
    await suspendPost({
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
                    {
                      backgroundColor: palette.surface,
                      borderColor: palette.border,
                    },
                  ]}
                  testID="change-cover-btn"
                >
                  <Camera color={palette.primary} size={22} strokeWidth={2.2} />
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    language === "en" ? "Settings" : "Pengaturan"
                  }
                  onPress={() => router.push("/account")}
                  style={[
                    styles.coverIconBtn,
                    {
                      backgroundColor: palette.surface,
                      borderColor: palette.border,
                    },
                  ]}
                  testID="profile-settings-btn"
                >
                  <Settings color={palette.primary} size={22} strokeWidth={2.2} />
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
                  {
                    borderColor: palette.background,
                    backgroundColor: palette.background,
                  },
                ]}
              >
                <ProfileAvatar
                  uri={technician.avatarUri}
                  name={cleanTechnicianTypo(technician.displayName)}
                  size={88}
                  editable={isProfileOwner}
                  onImageSelected={handleAvatarSelected}
                  testID="technician-profile-avatar"
                />
              </View>
              <View style={styles.profileIdentity}>
                <View style={styles.nameLine}>
                  <Text
                    style={[
                      styles.profileName,
                      { color: palette.text },
                    ]}
                  >
                    {cleanTechnicianTypo(technician.displayName)}
                  </Text>
                  {(technician.verified || isProfileVerified) ? (
                    <View
                      style={styles.verifiedTag}
                      testID="technician-verified-badge"
                    >
                      <BadgeCheck
                        size={ICON_SIZE}
                        color={palette.primary}
                        strokeWidth={ICON_STROKE}
                      />
                    </View>
                  ) : null}
                  {isTechnicianProfile && technician.services.length > 0 && (
                    <View
                      style={styles.bookableBadgeInline}
                    >
                      <Text
                        style={[
                          styles.bookableBadgeTextInline,
                          { color: palette.primary },
                        ]}
                      >
                        {language === "en" ? "Bookable Service" : "Layanan Dapat Dipesan"}
                      </Text>
                    </View>
                  )}
                </View>
                {formattedTechHandle ? (
                  <Text
                    style={[
                      styles.profileHandle,
                      { color: palette.textMuted, textAlign: "center" },
                    ]}
                    testID="technician-profile-handle"
                  >
                    {user ? formattedTechHandle : rawTechUsername}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Headline and Bio in the same line under the profile image */}
            {(headline || bio) ? (
              <View style={styles.heroBioRow}>
                <Text style={styles.heroBioText} numberOfLines={2}>
                  {headline ? (
                    <Text style={[styles.heroHeadlineText, { color: palette.primary }]}>
                      {cleanTechnicianTypo(headline)}
                    </Text>
                  ) : null}
                  {headline && bio ? (
                    <Text style={{ color: palette.textMuted }}> : </Text>
                  ) : null}
                  {bio ? (
                    <Text style={[styles.heroBioInlineText, { color: palette.text }]}>
                      {cleanTechnicianTypo(bio)}
                    </Text>
                  ) : null}
                </Text>
              </View>
            ) : null}

            <View style={styles.statsStrip} testID="technician-stats-bar">
                <View style={styles.statsItem} testID="technician-rating-badge">
                  <Text style={[styles.statsValue, { color: palette.text }]}>
                    <Text style={styles.statsStar}>★ </Text>
                    {technician.averageRating > 0
                      ? technician.averageRating.toFixed(1)
                      : '5.0'}
                    {" "}
                    <Text style={[styles.statsMuted, { color: palette.textMuted }]}>
                      ({formatCompactNumber(technician.reviewCount)} {language === "en" ? "rev" : "ul"})
                    </Text>
                  </Text>
                </View>
                <View style={[styles.statsPipe, { backgroundColor: palette.border }]} />
                <View style={styles.statsItem} testID="technician-tasks-badge">
                  <Text style={[styles.statsValue, { color: palette.text }]}>
                    {formatCompactNumber(technician.completedJobsCount)}
                    {" "}
                    <Text style={[styles.statsMuted, { color: palette.textMuted }]}>
                      {language === "en" ? "tasks" : "tugas"}
                    </Text>
                  </Text>
                </View>
                <View style={[styles.statsPipe, { backgroundColor: palette.border }]} />
                <View style={styles.statsItem} testID="posts-badge">
                  <Text style={[styles.statsValue, { color: palette.text }]}>
                    {formatCompactNumber(posts.length)}
                    {" "}
                    <Text style={[styles.statsMuted, { color: palette.textMuted }]}>
                      {language === "en" ? "posts" : "post"}
                    </Text>
                  </Text>
                </View>
                <View style={[styles.statsPipe, { backgroundColor: palette.border }]} />
                <View style={styles.statsItem} testID="technician-area-badge">
                  <Text
                    numberOfLines={1}
                    style={[styles.statsValue, styles.statsAreaValue, { color: palette.text }]}
                  >
                    {technician.serviceAreas.length > 1
                      ? `${localizeArea(technician.serviceAreas[0], language)} +${technician.serviceAreas.length - 1}`
                      : technician.serviceAreas[0]
                        ? localizeArea(technician.serviceAreas[0], language)
                        : language === "en"
                          ? "All areas"
                          : "Semua area"}
                  </Text>
                </View>
            </View>

            {/* Review quick action - other actions live in the tabs below */}
            {!isProfileOwner && isTechnicianProfile && canAddReview && (
              <View style={styles.singleLineActionsRow}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setActiveProfileTab("reviews");
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
                  <Star size={ICON_SIZE} color={palette.primary} strokeWidth={ICON_STROKE} />
                  <Text
                    numberOfLines={1}
                    style={[styles.actionBadgeText, { color: palette.primary, fontWeight: '700' }]}
                  >
                    {language === "en" ? "Review" : "Ulasan"}
                  </Text>
                </Pressable>
              </View>
            )}

            {isTechnicianProfile && technician.services.length > 0 && (
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
              backgroundColor: palette.background,
              borderBottomColor: palette.border,
            },
          ]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.profileTabBarContent}
            testID="profile-tab-bar"
          >
            {(
              isTechnicianProfile
                ? ([
                    ["posts", language === "en" ? "Posts" : "Postingan"],
                    ["services", language === "en" ? "Services" : "Layanan"],
                    ["portfolio", language === "en" ? "Portfolio" : "Portofolio"],
                    ["reviews", language === "en" ? "Reviews" : "Ulasan"],
                    ["about", language === "en" ? "About" : "Tentang"],
                  ] as const)
                : ([
                    ["posts", language === "en" ? "Posts" : "Postingan"],
                    ["about", language === "en" ? "About" : "Tentang"],
                  ] as const)
            ).map(([key, label]) => {
              const selected = currentTab === key;
              return (
                <Pressable
                  key={key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  onPress={() => setActiveProfileTab(key)}
                  style={styles.profileTabScroll}
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
          </ScrollView>
        </View>

        <View
          style={[
            styles.contentWidth,
            currentTab === "posts" && { paddingHorizontal: 0 },
          ]}
        >
          {currentTab === "posts" && (
            <View testID="public-posts">
              {/* Inline Twitter / X style Composer: visible to owner when technician or admin */}
              {canPost && (
                <View style={styles.postComposerWrap}>
                  <PostContainer
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
                  {posts.map((item, index) => (
                    <Post
                      key={item.id}
                      flat
                      isLastInThread={index === posts.length - 1}
                      post={item}
                      isOwner={isProfileOwner}
                      isAdmin={isAdminUser}
                      authorName={technician.displayName}
                      authorAvatarUri={technician.avatarUri}
                      onEdit={handleEditPost}
                      onDelete={handleDeletePost}
                      onSuspend={handleSuspendPost}
                    />
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

          {currentTab === "about" && (
            <View>
              <View style={styles.sectionHeaderRow}>
                <SectionHeader
                  title={language === "en" ? "About" : "Tentang"}
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
                title={language === "en" ? "Service Areas" : "Area Layanan"}
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

          {isTechnicianProfile && currentTab === "services" && (
            <View>
              <SectionHeader
                title={language === "en" ? "Services" : "Layanan"}
                compact
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

          {isTechnicianProfile && currentTab === "portfolio" && (
            <View>
              <View style={styles.sectionHeaderRow}>
                <SectionHeader
                  title={language === "en" ? "Portfolio" : "Portofolio"}
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
                          <X size={ICON_SIZE} color="#FFFFFF" strokeWidth={ICON_STROKE} />
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
                        onPress={() => setPortfolioSheetVisible(true)}
                        style={[
                          styles.attachPhotoBtn,
                          {
                            backgroundColor: draftPortfolioImage ? palette.primarySoft : palette.surface,
                            borderColor: palette.border,
                          },
                        ]}
                        testID="portfolio-image-picker"
                      >
                        <Camera size={ICON_SIZE} color={palette.primary} strokeWidth={ICON_STROKE} />
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
                      onPress={() => {
                        setIsAddingPortfolio(false);
                        setEditingPortfolioItem(null);
                      }}
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
                          if (editingPortfolioItem) {
                            const updatedList = (technician.portfolio || []).map((p) =>
                              p.id === editingPortfolioItem.id
                                ? {
                                    ...p,
                                    title: draftPortfolioTitle.trim(),
                                    description: draftPortfolioDesc.trim() || undefined,
                                    imageUri: draftPortfolioImage,
                                  }
                                : p,
                            );
                            await updateTechnicianPortfolio(technician.id, updatedList);
                            setLoadedTechnician((prev) =>
                              prev ? { ...prev, portfolio: updatedList } : prev,
                            );
                            setEditingPortfolioItem(null);
                          } else {
                            const newItem: PortfolioItem = {
                              id: `port-${Date.now()}`,
                              title: draftPortfolioTitle.trim(),
                              description: draftPortfolioDesc.trim() || undefined,
                              imageUri: draftPortfolioImage,
                            };
                            const updatedList = [newItem, ...(technician.portfolio || [])];
                            await updateTechnicianPortfolio(technician.id, updatedList);
                            setLoadedTechnician((prev) =>
                              prev ? { ...prev, portfolio: updatedList } : prev,
                            );
                          }
                          setIsAddingPortfolio(false);
                          setDraftPortfolioTitle('');
                          setDraftPortfolioDesc('');
                          setDraftPortfolioImage(undefined);
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
                <View style={styles.portfolioFeedWrap}>
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
                      <View
                        key={item.id}
                        style={[
                          styles.postCardLike,
                          {
                            backgroundColor: palette.surface,
                            borderColor: palette.border,
                          },
                        ]}
                        testID={`portfolio-item-${item.id}`}
                      >
                        <View style={styles.portfolioItemHeader}>
                          <View style={styles.portfolioAuthorRow}>
                            <Avatar uri={technician.avatarUri} name={technician.displayName} size={36} />
                            <View style={{ marginLeft: 8 }}>
                              <Text style={[styles.portfolioAuthorName, { color: palette.text }]}>
                                {cleanTechnicianTypo(technician.displayName)}
                              </Text>
                              <Text style={[styles.portfolioAuthorSub, { color: palette.textMuted }]}>
                                {language === "en" ? "Verified Portfolio" : "Portofolio Terverifikasi"}
                              </Text>
                            </View>
                          </View>
                          {(isProfileOwner || isAdminUser) && (
                            <Pressable
                              accessibilityRole="button"
                              onPress={() => {
                                setDraftPortfolioTitle(item.title);
                                setDraftPortfolioDesc(item.description || '');
                                setDraftPortfolioImage(item.imageUri);
                                setEditingPortfolioItem(item);
                                setIsAddingPortfolio(true);
                              }}
                              style={[styles.smallEditPortfolioBtn, { backgroundColor: palette.primarySoft }]}
                              testID={`edit-portfolio-btn-${item.id}`}
                            >
                              <Pencil size={ICON_SIZE} color={palette.primary} strokeWidth={ICON_STROKE} />
                              <Text style={[styles.smallEditPortfolioText, { color: palette.primary }]}>
                                {language === "en" ? "Edit" : "Ubah"}
                              </Text>
                            </Pressable>
                          )}
                        </View>

                        <View style={styles.portfolioTextBody}>
                          <Text style={[styles.portfolioTitleText, { color: palette.text }]}>
                            {title}
                          </Text>
                          {desc ? (
                            <Text style={[styles.portfolioDescText, { color: palette.textMuted }]}>
                              {desc}
                            </Text>
                          ) : null}
                        </View>

                        {item.imageUri ? (
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => setExpandedPortfolio(item)}
                            style={styles.portfolioPhotoWrap}
                          >
                            <Image
                              source={{ uri: item.imageUri }}
                              style={styles.portfolioLargePhoto}
                              resizeMode="cover"
                            />
                          </Pressable>
                        ) : null}
                      </View>
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

          {isTechnicianProfile && currentTab === "reviews" && (
            <View>
              <View style={styles.sectionHeaderRow}>
                <SectionHeader
                  title={language === "en" ? "Reviews" : "Ulasan"}
                  compact
                />
              </View>

              {!isProfileOwner && (
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
                  <ShieldCheck size={ICON_SIZE} color={palette.primary} strokeWidth={ICON_STROKE} />
                  <Text style={{ color: palette.textMuted, fontSize: font.body, flex: 1 }}>
                    {language === "en"
                      ? "Feedback is allowed only upon task completion by the customer."
                      : "Ulasan hanya dapat diberikan oleh pelanggan saat menyelesaikan tugas."}
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

      <ImageSourceSheet
        allowFallbackUri
        backdropTestID="portfolio-photo-sheet-backdrop"
        onClose={() => setPortfolioSheetVisible(false)}
        onImageSelected={(nextUri) => {
          setPortfolioSheetVisible(false);
          setDraftPortfolioImage(nextUri);
        }}
        subtitle={
          language === "en"
            ? "Choose a photo to showcase your work."
            : "Pilih foto untuk menampilkan hasil pekerjaan Anda."
        }
        testIDPrefix="portfolio"
        title={language === "en" ? "Select Work Photo" : "Pilih Foto Karya"}
        visible={portfolioSheetVisible}
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
  const { language, t } = useLanguage();
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
            backgroundColor: "transparent",
            borderWidth: 0,
          },
        ]}
      >
        <ChevronLeft
          size={22}
          color={palette.primary}
          strokeWidth={2.2}
        />
        <Text
          style={[
            styles.backLabelText,
            { color: palette.primary },
          ]}
        >
          {t("profile.back") || (language === "en" ? "Back" : "Kembali")}
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
  navBackGlyph: { color: colors.ink, fontSize: font.display, lineHeight: 38 },
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
  coverContainer: { height: 230, position: "relative", width: "100%" },
  coverImage: { height: 230, width: "100%" },
  coverFallback: {
    backgroundColor: "#064E3B",
    height: 230,
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
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  coverPillBtn: {
    borderRadius: 18,
    minHeight: 36,
  },
  avatarWrapper: {
    alignSelf: "center",
    borderColor: "#FFFFFF",
    borderRadius: 48,
    borderWidth: 4,
    marginTop: -52,
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
    flexDirection: "column",
    gap: spacing.xs,
  },
  profileTabBarWrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    width: "100%",
  },
  profileTabBarContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: 22,
    height: 48,
    paddingHorizontal: 16,
  },
  profileTabScroll: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 2,
    position: "relative",
  },
  profileTabText: { fontSize: font.subtitle, fontWeight: "600" },
  profileTabTextSelected: { fontWeight: "800" },
  profileTabIndicator: {
    borderRadius: 2,
    bottom: 6,
    height: 2.5,
    left: 0,
    position: "absolute",
    right: 0,
  },
  profileIdentity: {
    alignItems: "center",
    alignSelf: "stretch",
    minWidth: 0,
    width: "100%",
  },
  nameLine: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    justifyContent: "center",
    width: "100%",
  },
  profileName: {
    color: colors.ink,
    fontSize: font.section,
    fontWeight: "700",
    letterSpacing: -0.4,
    textAlign: "center",
  },
  verifiedTag: {
    backgroundColor: "transparent",
    borderRadius: radii.pill,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  bookableBadgeInline: {
    backgroundColor: "transparent",
    marginLeft: 6,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  bookableBadgeTextInline: {
    fontSize: font.caption,
    fontWeight: "700",
  },
  verifiedTagText: { color: colors.greenDark, fontSize: font.caption, fontWeight: "800" },
  profileHandle: {
    color: colors.muted,
    fontSize: font.label,
    fontWeight: "600",
    marginTop: 1,
  },
  businessName: {
    color: colors.muted,
    fontSize: font.subtitle,
    fontWeight: "500",
    marginTop: 2,
  },
  profileHeadline: {
    fontSize: font.subtitle,
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
  statValue: { color: colors.ink, fontSize: font.body, fontWeight: "700" },
  availabilityLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
    marginTop: spacing.md,
  },
  availabilityDot: { borderRadius: 4, height: 8, width: 8 },
  availabilityText: { color: colors.ink, fontSize: font.body, fontWeight: "600" },
  ownerEditBtn: {
    alignItems: "center",
    backgroundColor: colors.greenDark,
    borderRadius: radii.pill,
    marginTop: spacing.md,
    paddingVertical: 10,
  },
  ownerEditBtnText: { color: "#FFFFFF", fontSize: font.body, fontWeight: "800" },
  bio: { color: "#4B5B55", fontSize: font.subtitle, lineHeight: 22 },
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
  serviceName: { color: colors.ink, fontSize: font.subtitle, fontWeight: "800" },
  serviceCategory: {
    color: colors.greenDark,
    fontSize: font.caption,
    fontWeight: "600",
    marginTop: 2,
  },
  serviceDescription: {
    color: colors.muted,
    fontSize: font.body,
    lineHeight: 17,
    marginTop: 4,
  },
  serviceDuration: { color: colors.muted, fontSize: font.caption, marginTop: 4 },
  serviceRight: { alignItems: "flex-end", gap: 6 },
  servicePrice: {
    color: colors.greenDark,
    fontSize: font.body,
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
    fontSize: font.caption,
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
  serviceOwnerTagText: { color: colors.muted, fontSize: font.caption, fontWeight: "700" },
  sectionEmpty: { color: colors.muted, fontSize: font.label, lineHeight: 20 },
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
  areaText: { color: colors.greenDark, fontSize: font.body, fontWeight: "700" },
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
  scheduleDay: { color: colors.ink, fontSize: font.label, fontWeight: "600" },
  scheduleHours: { color: colors.greenDark, fontSize: font.body, fontWeight: "700" },
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
    fontSize: font.label,
    fontWeight: "700",
    marginTop: 8,
  },
  portfolioDescription: {
    color: colors.muted,
    fontSize: font.caption,
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
  reviewerName: { color: colors.ink, fontSize: font.label, fontWeight: "700" },
  reviewRating: { alignItems: "center", flexDirection: "row", gap: 4 },
  star: { color: "#DCA63C", fontSize: font.subtitle},
  reviewRatingText: { color: colors.ink, fontSize: font.body, fontWeight: "700" },
  reviewComment: {
    color: "#53615C",
    fontSize: font.body,
    lineHeight: 19,
    marginTop: spacing.md,
  },
  reviewDate: { color: colors.muted, fontSize: font.caption, marginTop: spacing.sm },
  reportBar: { alignItems: "flex-start", marginTop: spacing.xl },
  reportButton: {
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  reportButtonText: { color: colors.muted, fontSize: font.body, fontWeight: "600" },
  profileFooterSpace: { height: 16 },
  feedErrorText: {
    color: colors.danger,
    fontSize: font.body,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  feedErrorWrap: {
    alignItems: "center",
  },
  feedRetryText: {
    color: colors.greenDark,
    fontSize: font.body,
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
    fontSize: font.caption,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  footerPriceValue: {
    color: colors.ink,
    fontSize: font.label,
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
    fontSize: font.heading,
    fontWeight: "800",
    marginTop: spacing.md,
  },
  portfolioModalDesc: {
    color: colors.muted,
    fontSize: font.label,
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
    fontSize: font.label,
    fontWeight: "800",
  },
  reportModalCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    maxWidth: 480,
    padding: spacing.xl,
    width: "100%",
  },
  reportModalTitle: { color: colors.ink, fontSize: font.heading, fontWeight: "800" },
  reportModalSubtitle: {
    color: colors.muted,
    fontSize: font.body,
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
  reportCatChipText: { color: colors.muted, fontSize: font.caption, fontWeight: "600" },
  reportCatChipTextSelected: { color: colors.orange, fontWeight: "800" },
  reportInput: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.ink,
    fontSize: font.label,
    minHeight: 88,
    padding: spacing.md,
    textAlignVertical: "top",
  },
  reportErrorText: {
    color: colors.danger,
    fontSize: font.body,
    marginTop: spacing.sm,
  },
  reportSuccessText: {
    color: colors.greenDark,
    fontSize: font.body,
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
  modalCancelBtnText: { color: colors.muted, fontSize: font.label, fontWeight: "700" },
  reportSubmitBtn: {
    backgroundColor: colors.danger,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
  },
  reportSubmitBtnText: { color: "#FFFFFF", fontSize: font.label, fontWeight: "800" },


  statsStrip: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 4,
    marginTop: spacing.md,
    width: '100%',
  },
  statsItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 24,
  },
  statsPipe: {
    borderRadius: 999,
    height: 14,
    width: 1,
  },
  statsValue: {
    fontSize: font.label,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  statsMuted: {
    fontWeight: '500',
  },
  statsStar: {
    color: '#F59E0B',
    fontWeight: '800',
  },
  statsAreaValue: {
    maxWidth: 180,
  },
  sleekBackBtn: {
    alignItems: 'center',
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: 4,
    minHeight: 38,
    minWidth: 70,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  backLabelText: {
    fontSize: font.subtitle,
    fontWeight: '700',
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
    fontSize: font.title,
    fontWeight: '700',
  },
  statsBarValueSmall: {
    fontSize: font.body,
    fontWeight: '700',
  },
  statsBarLabel: {
    fontSize: font.caption,
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
    fontSize: font.label,
    fontWeight: '800',
  },
  singleLineActionsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 16,
    width: '100%',
  },
  heroBioRow: {
    marginTop: 10,
    paddingHorizontal: 16,
    width: "100%",
  },
  heroBioText: {
    fontSize: font.label,
    lineHeight: 18,
  },
  heroHeadlineText: {
    fontSize: font.label,
    fontWeight: "700",
  },
  heroBioInlineText: {
    fontSize: font.label,
    fontWeight: "400",
  },
  portfolioFeedWrap: {
    gap: 12,
    marginTop: spacing.sm,
    width: "100%",
  },
  postCardLike: {
    borderRadius: 5,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
    padding: spacing.md,
    width: "100%",
  },
  portfolioItemHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    width: "100%",
  },
  portfolioAuthorRow: {
    alignItems: "center",
    flexDirection: "row",
  },
  portfolioAuthorName: {
    fontSize: font.subtitle,
    fontWeight: "700",
  },
  portfolioAuthorSub: {
    fontSize: font.caption,
    fontWeight: "500",
    marginTop: 1,
  },
  smallEditPortfolioBtn: {
    alignItems: "center",
    borderRadius: 5,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  smallEditPortfolioText: {
    fontSize: font.caption,
    fontWeight: "700",
  },
  portfolioTextBody: {
    marginBottom: 8,
  },
  portfolioTitleText: {
    fontSize: font.title,
    fontWeight: "700",
    marginBottom: 3,
  },
  portfolioDescText: {
    fontSize: font.label,
    lineHeight: 19,
  },
  portfolioPhotoWrap: {
    borderRadius: 5,
    marginTop: 4,
    overflow: "hidden",
    width: "100%",
  },
  portfolioLargePhoto: {
    aspectRatio: 16 / 9,
    borderRadius: 5,
    height: 220,
    width: "100%",
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
    fontSize: font.body,
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
    fontSize: font.body,
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
    fontSize: font.subtitle,
    fontWeight: '800',
  },
  goldStarBig: {
    color: '#F59E0B',
    fontSize: font.section,
  },
  badgeIcon: {
    fontSize: font.body,
    fontWeight: '700',
  },
  badgeTextBold: {
    fontSize: font.body,
    fontWeight: '700',
  },
  badgeTextMuted: {
    fontSize: font.caption,
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
    fontSize: font.body,
    fontWeight: '700',
  },
  formCard: {
    borderRadius: 5,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  formLabel: {
    fontSize: font.body,
    fontWeight: '700',
    marginBottom: 4,
    marginTop: spacing.xs,
  },
  formInput: {
    borderRadius: 5,
    borderWidth: 1,
    fontSize: font.subtitle,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  formTextarea: {
    borderRadius: 5,
    borderWidth: 1,
    fontSize: font.subtitle,
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
    fontSize: font.label,
    fontWeight: '600',
  },
  formSaveBtnText: {
    color: '#FFFFFF',
    fontSize: font.label,
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
    fontSize: font.display,
    fontWeight: '800',
    lineHeight: 36,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
    marginVertical: 4,
  },
  performanceSubtext: {
    fontSize: font.caption,
    fontWeight: '500',
  },
  performanceBadgeText: {
    fontSize: font.caption,
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
    fontSize: font.caption,
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
    fontSize: font.caption,
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
    fontSize: font.display,
  },
  interactiveMutedStar: {
    color: '#D1D5DB',
    fontSize: font.display,
  },
  selectedRatingText: {
    fontSize: font.label,
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
    fontSize: font.subtitle,
    fontWeight: "700",
  },
  formInputModern: {
    borderRadius: 5,
    borderWidth: 1,
    fontSize: font.label,
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
    fontSize: font.label,
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
    fontSize: font.caption,
    fontWeight: "600",
  },
  charCounterText: {
    fontSize: font.caption,
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
    fontSize: font.body,
    fontWeight: "700",
  },
  formSaveBtnTextModern: {
    color: "#FFFFFF",
    fontSize: font.body,
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
    fontSize: font.title,
    fontWeight: "700",
  },
  portfolioDescModern: {
    fontSize: font.label,
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
    fontSize: font.label,
    fontWeight: "700",
  },
});
