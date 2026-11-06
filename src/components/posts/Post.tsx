import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import {
  BadgeCheck,
  Bookmark,
  CalendarCheck,
  Eye,
  Heart,
  Share2,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "../../auth/AuthProvider";
import { useAppearance } from "../../context/AppearanceContext";
import { formatRupiah, loadTechnician } from "../../data/marketplaceRepository";
import {
  getPostEngagementSync,
  hasUserLikedPost,
  incrementPostShare,
  recordPostView,
  togglePostLike,
} from "../../data/postsStore";
import { localizeArea, useLanguage } from "../../i18n/locale";
import {
  layoutTokens,
  postRadii,
  postSpacing,
  postTypography,
} from "../../theme/designSystem";
import { ICON_STROKE } from "../../theme/icons";
import { colors, radii, spacing } from "../../theme/tokens";
import { font } from "../../theme/typography";
import type { Post as PostType } from "../../types/post";
import { buildPostSharePayload, formatCompactCount } from "../../utils/postShare";
import { Avatar } from "../marketplace-ui";
import { CORE_CATEGORY_FILTERS } from "../search/CategoryTabs";
import { PostContainer } from "./PostContainer";
import { PostDropdown } from "./PostDropdown";
import { PostMediaCarousel } from "./PostMediaCarousel";

const sessionRecordedViews = new Set<string>();
const authorAvatarMemoryCache: Record<string, string> = {};

export interface PostEditUpdates {
  caption: string;
  imageUri?: string;
  mediaUrls: string[];
  isServicePost: boolean;
  serviceArea?: string;
}

export interface PostProps {
  post: PostType;
  isOwner?: boolean;
  isAdmin?: boolean;
  onEdit?: (
    post: PostType,
    newCaption: string,
    newImageUri?: string,
    updates?: PostEditUpdates,
  ) => Promise<void>;
  onDelete?: (postId: string) => Promise<void>;
  onSuspend?: (postId: string, suspended: boolean) => Promise<void>;
  authorName?: string;
  authorAvatarUri?: string;
  flat?: boolean;
  isLastInThread?: boolean;
  authorRating?: number;
  authorReviewCount?: number;
  serviceStartingPrice?: number;
  savedTechnician?: boolean;
  onToggleSaveTechnician?: () => void;
}

function categoryChipLabel(
  slug: string | undefined,
  language: "id" | "en",
): string {
  if (!slug) return "";
  const core = CORE_CATEGORY_FILTERS[slug];
  if (core) {
    return language === "en" ? core.en : core.id;
  }
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function fixAuthorTypo(text?: string): string {
  if (!text) return "";
  return text
    .replace(/Techinician/g, "Technician")
    .replace(/techinician/g, "technician");
}

function formatPostTime(dateString: string, language: "id" | "en"): string {
  try {
    const diffMs = Date.now() - new Date(dateString).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) {
      const diffMins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
      return language === "en" ? `${diffMins}m ago` : `${diffMins}m yang lalu`;
    }
    if (diffHours < 24) {
      return language === "en"
        ? `${diffHours}h ago`
        : `${diffHours} jam yang lalu`;
    }
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) {
      return language === "en"
        ? `${diffDays}d ago`
        : `${diffDays} hari yang lalu`;
    }
    return new Date(dateString).toLocaleDateString(
      language === "en" ? "en-US" : "id-ID",
      {
        day: "numeric",
        month: "short",
      },
    );
  } catch {
    return language === "en" ? "Recently" : "Baru saja";
  }
}

export function Post({
  post,
  isOwner = false,
  isAdmin = false,
  onEdit,
  onDelete,
  onSuspend,
  authorName,
  authorAvatarUri,
  flat = true,
  authorRating,
  authorReviewCount,
  serviceStartingPrice,
  savedTechnician,
  onToggleSaveTechnician,
}: PostProps) {
  const { language } = useLanguage();
  const { user, roles, effectiveRole } = useAuth();
  const { palette, reduceMotion, scaleFont } = useAppearance();
  const [isEditing, setIsEditing] = useState(false);
  const [editedPostOverride, setEditedPostOverride] = useState<Partial<PostType> | null>(null);
  const [imageError, setImageError] = useState(false);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [likedOverride, setLikedOverride] = useState<boolean | null>(null);
  const [likeCountOverride, setLikeCountOverride] = useState<number | null>(null);
  const [viewCountOverride, setViewCountOverride] = useState<number | null>(null);
  const [asyncTech, setAsyncTech] = useState<{ averageRating: number; reviewCount: number } | null>(null);
  const [cachedAuthorAvatar, setCachedAuthorAvatar] = useState<string | undefined>(
    () => authorAvatarMemoryCache[post.technicianId],
  );

  const effectivePost: PostType = editedPostOverride
    ? { ...post, ...editedPostOverride }
    : post;

  const syncEngagement = getPostEngagementSync(effectivePost, user?.id);
  const liked = Boolean(user?.id) && (likedOverride ?? syncEngagement.liked);
  const likeCount = likeCountOverride ?? syncEngagement.likeCount;
  const viewCount = Math.max(syncEngagement.viewCount, viewCountOverride ?? 0);

  useEffect(() => {
    let active = true;
    const techId = effectivePost.technicianId;
    if (!techId) return;
    if (authorAvatarMemoryCache[techId]) {
      return;
    }
    void AsyncStorage.getItem(`@cepat_avatar_${techId}`)
      .then((savedUri) => {
        if (active && savedUri) {
          authorAvatarMemoryCache[techId] = savedUri;
          setCachedAuthorAvatar(savedUri);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [effectivePost.technicianId]);

  useEffect(() => {
    let active = true;
    const uid = user?.id;
    if (!uid) {
      return () => {
        active = false;
      };
    }
    void hasUserLikedPost(post.id, uid).then((isLiked) => {
      if (active) {
        setLikedOverride((prev) => (prev === null ? isLiked : prev));
      }
    });
    return () => {
      active = false;
    };
  }, [post.id, user?.id]);

  useEffect(() => {
    const viewSessionKey = `${post.id}:${user?.id ?? "guest"}`;
    if (sessionRecordedViews.has(viewSessionKey)) {
      return;
    }
    sessionRecordedViews.add(viewSessionKey);
    let active = true;
    void recordPostView(post.id, user?.id).then((nextViews) => {
      if (active && nextViews > 0) {
        setViewCountOverride((prev) => Math.max(prev ?? 0, nextViews));
      }
    });
    return () => {
      active = false;
    };
  }, [post.id, user?.id]);

  useEffect(() => {
    if (typeof authorRating === "number" && authorRating > 0) return;
    if (!effectivePost.technicianId) return;
    let active = true;
    void loadTechnician(effectivePost.technicianId).then((res) => {
      if (active && res?.item) {
        setAsyncTech({
          averageRating: res.item.averageRating,
          reviewCount: res.item.reviewCount,
        });
      }
    });
    return () => {
      active = false;
    };
  }, [authorRating, effectivePost.technicianId]);

  const handleToggleLike = () => {
    if (!user?.id) {
      router.push("/login");
      return;
    }
    const previousLiked = liked;
    const previousCount = likeCount;
    const optimisticLiked = !previousLiked;
    const optimisticCount = optimisticLiked
      ? previousCount + 1
      : Math.max(0, previousCount - 1);
    setLikedOverride(optimisticLiked);
    setLikeCountOverride(optimisticCount);
    void togglePostLike(post.id, user.id)
      .then((result) => {
        setLikedOverride(result.liked);
        setLikeCountOverride(result.likeCount);
      })
      .catch(() => {
        setLikedOverride(previousLiked);
        setLikeCountOverride(previousCount);
      });
  };

  const handleNativeShare = async () => {
    const priceLabel =
      typeof serviceStartingPrice === "number"
        ? formatRupiah(serviceStartingPrice, language)
        : undefined;
    const payload = buildPostSharePayload(effectivePost, language, priceLabel);
    void incrementPostShare(post.id);
    try {
      await Share.share(
        {
          title: payload.title,
          message: payload.fullShareMessage,
          url: payload.cleanImageUrl || payload.cleanUrl,
        },
        {
          dialogTitle: payload.title,
          subject: payload.title,
        },
      );
    } catch {
      // User dismissed native bottom share sheet
    }
  };

  const isAdminUser = Boolean(
    isAdmin || roles.includes("admin") || effectiveRole === "admin",
  );
  const isSelfPost = Boolean(
    user?.id &&
    (user.id === effectivePost.technicianId ||
      (user.id === "demo-rizky" && effectivePost.technicianId === "demo-rizky") ||
      (user.id === "demo-customer" && effectivePost.technicianId === "demo-customer")),
  );
  const isActualOwner = Boolean(isOwner || isSelfPost);
  const canBook = Boolean(effectivePost.isServicePost) && !isSelfPost && !isOwner;
  const isVerified = Boolean(
    effectivePost.technicianVerified ||
    effectivePost.technicianId === "demo-rizky" ||
    effectivePost.technicianId === "demo-sari" ||
    (isActualOwner &&
      (roles.includes("technician") || roles.includes("admin"))),
  );

  const images =
    effectivePost.mediaUrls && effectivePost.mediaUrls.length > 0
      ? effectivePost.mediaUrls
      : effectivePost.imageUri
        ? [effectivePost.imageUri]
        : [];
  const displayName = fixAuthorTypo(
    authorName ||
      (isSelfPost &&
        typeof user?.user_metadata?.display_name === "string" &&
        user.user_metadata.display_name.trim()) ||
      effectivePost.technicianName,
  );
  const rawAuthorHandle =
    effectivePost.technicianUsername ||
    (isActualOwner &&
      typeof user?.user_metadata?.username === "string" &&
      user.user_metadata.username.trim()) ||
    displayName.toLowerCase().replace(/[^a-z0-9_]/g, "") ||
    "technician";
  const authorHandle = `@${rawAuthorHandle.replace(/^@/, "")}`;
  const displayAvatar =
    authorAvatarUri ||
    (isSelfPost &&
      typeof user?.user_metadata?.avatar_url === "string" &&
      user.user_metadata.avatar_url) ||
    effectivePost.technicianAvatarUri ||
    cachedAuthorAvatar;
  const displayContent = fixAuthorTypo(effectivePost.content || effectivePost.caption || "");

  const displayRating =
    (typeof authorRating === "number" && authorRating > 0
      ? authorRating
      : asyncTech?.averageRating) ??
    (isVerified ? 5.0 : undefined);

  const displayReviewCount =
    typeof authorReviewCount === "number" && authorReviewCount > 0
      ? authorReviewCount
      : asyncTech?.reviewCount;

  const handleConfirmDelete = async () => {
    if (!onDelete) return;
    setConfirmDeleteVisible(false);
    try {
      await onDelete(post.id);
    } catch (err) {
      console.warn("[Post] Delete post error:", err);
    }
  };

  const handleDeletePress = () => {
    setConfirmDeleteVisible(true);
  };

  return (
    <View
      style={[
        flat ? styles.flatRoot : styles.card,
        flat
          ? { borderBottomColor: palette.border }
          : { backgroundColor: palette.surface, borderColor: palette.border },
      ]}
      testID={`post-card-${post.id}`}
    >
      {flat ? (
        <View style={styles.threadLeft}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Lihat profil ${displayName}`}
            accessibilityHint={
              language === "en" ? "Opens profile" : "Buka profil"
            }
            hitSlop={8}
            onPress={() => router.push(`/technician/${effectivePost.technicianId}`)}
            style={styles.threadAvatarBtn}
            testID={`post-avatar-link-${post.id}`}
          >
            <Avatar
              uri={displayAvatar}
              name={displayName}
              size={layoutTokens.postAvatarSize}
            />
          </Pressable>
        </View>
      ) : null}

      <View style={flat ? styles.threadRight : styles.threadRightFill}>
        {/* Unified Author Header */}
        <View style={styles.compactHeaderRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View profile of ${displayName}`}
            onPress={() => router.push(`/technician/${effectivePost.technicianId}`)}
            style={styles.authorTouchArea}
            testID={`post-author-link-${post.id}`}
          >
            <View style={styles.authorMeta}>
              <View style={styles.nameRow}>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.authorNameCompact,
                    {
                      color: palette.text,
                      fontSize: scaleFont(postTypography.authorName.fontSize),
                      lineHeight: scaleFont(postTypography.authorName.lineHeight),
                    },
                  ]}
                >
                  {displayName}
                </Text>
                {isVerified && (
                  <View
                    style={styles.verifiedBadgeTransparent}
                    testID={`post-verified-badge-${post.id}`}
                  >
                    <BadgeCheck
                      size={15}
                      color={palette.primary}
                      strokeWidth={ICON_STROKE}
                    />
                  </View>
                )}
                {typeof displayRating === "number" && displayRating > 0 ? (
                  <View
                    style={styles.ratingChip}
                    testID={`post-rating-chip-${post.id}`}
                  >
                    <Text style={styles.ratingChipStar}>★</Text>
                    <Text
                      style={[
                        styles.ratingChipText,
                        {
                          color: palette.text,
                          fontSize: scaleFont(postTypography.authorSub.fontSize),
                        },
                      ]}
                    >
                      {displayRating.toFixed(1)}
                      {typeof displayReviewCount === "number" && displayReviewCount > 0 ? (
                        <Text style={[styles.ratingChipCount, { color: palette.textMuted }]}>
                          {` (${displayReviewCount} ${language === "en" ? "rev" : "ul"})`}
                        </Text>
                      ) : null}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text
                numberOfLines={1}
                style={[
                  styles.authorSub,
                  {
                    color: palette.textMuted,
                    fontSize: scaleFont(postTypography.authorSub.fontSize),
                    lineHeight: scaleFont(postTypography.authorSub.lineHeight),
                  },
                ]}
              >
                {authorHandle}
                {effectivePost.serviceArea
                  ? ` · ${localizeArea(effectivePost.serviceArea, language)}`
                  : ""}
              </Text>
            </View>
          </Pressable>

          <View style={styles.topRightRow}>
            <Text
              style={[
                styles.timeAgoText,
                {
                  color: palette.textMuted,
                  fontSize: scaleFont(postTypography.timeAgo.fontSize),
                },
              ]}
            >
              {formatPostTime(effectivePost.createdAt, language)}
            </Text>
            {(isActualOwner && (onEdit || onDelete)) ||
            (isAdminUser && onSuspend) ? (
              <PostDropdown
                postId={post.id}
                actions={[
                  ...(isActualOwner && onEdit
                    ? [
                        {
                          label:
                            language === "en" ? "Edit post" : "Edit postingan",
                          testID: `edit-post-btn-${post.id}`,
                          onPress: () => {
                            setIsEditing(true);
                          },
                        },
                      ]
                    : []),
                  ...(isActualOwner && onDelete
                    ? [
                        {
                          label:
                            language === "en"
                              ? "Delete post"
                              : "Hapus postingan",
                          testID: `delete-post-btn-${post.id}`,
                          tone: "danger" as const,
                          onPress: handleDeletePress,
                        },
                      ]
                    : []),
                  ...(isAdminUser && !isActualOwner && onSuspend
                    ? [
                        {
                          label: effectivePost.suspended
                            ? language === "en"
                              ? "Restore post"
                              : "Pulihkan postingan"
                            : language === "en"
                              ? "Suspend post"
                              : "Tangguhkan postingan",
                          testID: effectivePost.suspended
                            ? `unsuspend-post-btn-${post.id}`
                            : `suspend-post-btn-${post.id}`,
                          onPress: () =>
                            void onSuspend(post.id, !effectivePost.suspended),
                        },
                      ]
                    : []),
                ]}
              />
            ) : isOwner ? (
              <View
                style={[
                  styles.statusPill,
                  {
                    backgroundColor: effectivePost.published
                      ? palette.primarySoft
                      : palette.surfaceElevated,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusPillText,
                    {
                      color: effectivePost.published
                        ? palette.primary
                        : palette.textMuted,
                    },
                  ]}
                >
                  {effectivePost.published
                    ? language === "en"
                      ? "Published"
                      : "Tayang"
                    : language === "en"
                      ? "Draft"
                      : "Draf"}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {effectivePost.isServicePost ? (
          <Text
            numberOfLines={2}
            style={[
              styles.serviceTitle,
              {
                color: palette.text,
                fontSize: scaleFont(postTypography.serviceCategory.fontSize),
                lineHeight: scaleFont(postTypography.serviceCategory.lineHeight),
              },
            ]}
            testID={`post-service-title-${post.id}`}
          >
            {categoryChipLabel(effectivePost.categorySlug, language)}
          </Text>
        ) : null}

        {/* Post Content Body */}
        <View style={styles.bodyContent}>
          {Boolean(displayContent) && (
            <Text
              style={[
                styles.caption,
                {
                  color: palette.text,
                  fontSize: scaleFont(postTypography.caption.fontSize),
                  lineHeight: scaleFont(postTypography.caption.lineHeight),
                },
              ]}
            >
              {/#[a-zA-Z0-9_]+/.test(displayContent)
                ? displayContent.split(/(#[a-zA-Z0-9_]+)/g).map((part, idx) =>
                    /^#[a-zA-Z0-9_]+$/.test(part) ? (
                      <Text
                        key={`${post.id}-tag-${idx}`}
                        onPress={() =>
                          router.push({
                            pathname: "/search",
                            params: { q: part },
                          } as never)
                        }
                        style={{ color: palette.primary, fontWeight: "700" }}
                        testID={`post-hashtag-${post.id}-${part.slice(1).toLowerCase()}`}
                      >
                        {part}
                      </Text>
                    ) : (
                      part
                    ),
                  )
                : displayContent}
            </Text>
          )}

          {/* Instagram-style Multi-Image Carousel with Finger Pinch-to-Zoom */}
          {images.length > 0 && !imageError ? (
            <PostMediaCarousel
              images={images}
              onAllImagesError={() => setImageError(true)}
              postId={post.id}
            />
          ) : null}
        </View>

        {/* Unified Price & Action Footer */}
        <View style={styles.footerRow} testID={`post-footer-${post.id}`}>
          <View style={styles.footerLeft}>
            {typeof serviceStartingPrice === "number" ? (
              <Text
                numberOfLines={1}
                style={[
                  styles.priceText,
                  {
                    color: palette.text,
                    fontSize: scaleFont(postTypography.price.fontSize),
                  },
                ]}
                testID={`post-price-${post.id}`}
              >
                {formatRupiah(serviceStartingPrice, language)}
                <Text
                  style={[
                    styles.priceUnit,
                    {
                      color: palette.textMuted,
                      fontSize: scaleFont(postTypography.priceUnit.fontSize),
                    },
                  ]}
                >
                  {" "}
                  / {language === "en" ? "visit" : "kunjungan"}
                </Text>
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: liked }}
              accessibilityLabel={language === "en" ? "Like" : "Suka"}
              hitSlop={8}
              onPress={handleToggleLike}
              style={styles.footerMetricBtn}
              testID={`post-like-btn-${post.id}`}
            >
              <Heart
                size={18}
                color={liked ? "#EF4444" : palette.textMuted}
                fill={liked ? "#EF4444" : "transparent"}
                strokeWidth={ICON_STROKE}
              />
              <Text
                numberOfLines={1}
                style={[
                  styles.footerMetricText,
                  {
                    color: liked ? "#EF4444" : palette.textMuted,
                    fontSize: scaleFont(postTypography.metricCount.fontSize),
                  },
                ]}
                testID={`post-like-count-${post.id}`}
              >
                {formatCompactCount(likeCount)}
              </Text>
            </Pressable>
            <View
              style={styles.footerMetricBtn}
              testID={`post-view-count-${post.id}`}
            >
              <Eye
                size={18}
                color={palette.textMuted}
                strokeWidth={ICON_STROKE}
              />
              <Text
                numberOfLines={1}
                style={[
                  styles.footerMetricText,
                  {
                    color: palette.textMuted,
                    fontSize: scaleFont(postTypography.metricCount.fontSize),
                  },
                ]}
              >
                {formatCompactCount(Math.max(1, viewCount))}
              </Text>
            </View>
          </View>
          <View style={styles.footerActions}>
            {canBook ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  language === "en"
                    ? "Book this service"
                    : "Pesan layanan ini"
                }
                onPress={() =>
                  router.push({
                    pathname: "/booking/[id]" as never,
                    params: { id: effectivePost.technicianId, postId: post.id },
                  })
                }
                style={({ pressed }) => [
                  styles.footerIconBtn,
                  {
                    backgroundColor: palette.primarySoft,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
                testID={`post-book-btn-${post.id}`}
              >
                <CalendarCheck
                  size={19}
                  color={palette.primary}
                  strokeWidth={ICON_STROKE}
                />
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={language === "en" ? "Share" : "Bagikan"}
              hitSlop={8}
              onPress={() => {
                void handleNativeShare();
              }}
              style={styles.footerIconBtn}
              testID={`post-share-btn-${post.id}`}
            >
              <Share2
                size={18}
                color={palette.textMuted}
                strokeWidth={ICON_STROKE}
              />
            </Pressable>
            {typeof onToggleSaveTechnician === "function" ? (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: Boolean(savedTechnician) }}
                accessibilityLabel={
                  language === "en"
                    ? savedTechnician
                      ? "Remove from saved"
                      : "Save technician"
                    : savedTechnician
                      ? "Hapus dari tersimpan"
                      : "Simpan teknisi"
                }
                hitSlop={8}
                onPress={onToggleSaveTechnician}
                style={styles.footerIconBtn}
                testID={`post-save-btn-${post.id}`}
              >
                <Bookmark
                  size={19}
                  color={savedTechnician ? palette.primary : palette.textMuted}
                  fill={savedTechnician ? palette.primary : "transparent"}
                  strokeWidth={ICON_STROKE}
                />
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      {/* Full-Screen Composer Modal for Updating Post (Identical to /compose) */}
      <Modal
        animationType={reduceMotion ? "none" : "slide"}
        onRequestClose={() => setIsEditing(false)}
        presentationStyle="fullScreen"
        visible={isEditing}
      >
        <PostContainer
          cancelTestID={`cancel-edit-post-btn-${post.id}`}
          headerTitle={language === "en" ? "Edit Post" : "Edit postingan"}
          initialValues={{
            caption: effectivePost.content || effectivePost.caption || "",
            images,
            isServicePost: Boolean(effectivePost.isServicePost),
            serviceArea: effectivePost.serviceArea,
          }}
          inputTestID={`edit-post-caption-input-${post.id}`}
          onCancel={() => setIsEditing(false)}
          onCreatePost={async (input) => {
            if (!onEdit) return;
            const nextMediaUrls =
              input.mediaUrls ?? (input.imageUri ? [input.imageUri] : []);
            const nextImageUri = nextMediaUrls[0];
            const updates: PostEditUpdates = {
              caption: input.caption,
              imageUri: nextImageUri,
              mediaUrls: nextMediaUrls,
              isServicePost: input.isServicePost,
              serviceArea: input.serviceArea,
            };
            await onEdit(
              effectivePost,
              input.caption,
              nextImageUri,
              updates,
            );
            setEditedPostOverride({
              caption: input.caption,
              content: input.caption,
              imageUri: nextImageUri,
              mediaUrls: nextMediaUrls,
              isServicePost: input.isServicePost,
              serviceArea: input.serviceArea || effectivePost.serviceArea,
            });
            setImageError(false);
            setIsEditing(false);
          }}
          resetOnSubmit={false}
          rootTestID={`edit-post-form-${post.id}`}
          showTitle
          submitTestID={`save-edited-post-btn-${post.id}`}
          technicianProfile={{
            id: effectivePost.technicianId,
            displayName,
            avatarUri: displayAvatar,
          }}
        />
      </Modal>

      {/* Confirmation Modal for Post Deletion */}
      <Modal
        animationType="fade"
        transparent
        visible={confirmDeleteVisible}
        onRequestClose={() => setConfirmDeleteVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.confirmDialog, { backgroundColor: palette.surface }]}
          >
            <Text style={[styles.confirmDialogTitle, { color: palette.text }]}>
              {language === "en" ? "Delete Post?" : "Hapus Postingan?"}
            </Text>
            <Text
              style={[
                styles.confirmDialogMessage,
                { color: palette.textMuted },
              ]}
            >
              {language === "en"
                ? "This post will be permanently removed from your profile and the Marketplace feed."
                : "Postingan ini akan dihapus permanen dari profil Anda dan beranda Marketplace."}
            </Text>
            <View style={styles.confirmDialogActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setConfirmDeleteVisible(false)}
                style={styles.confirmDialogCancelBtn}
              >
                <Text
                  style={[
                    styles.confirmDialogCancelText,
                    { color: palette.text },
                  ]}
                >
                  {language === "en" ? "Cancel" : "Batal"}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void handleConfirmDelete();
                }}
                style={styles.confirmDialogDeleteBtn}
              >
                <Text style={styles.confirmDialogDeleteText}>
                  {language === "en" ? "Delete" : "Hapus"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderColor: "#232F46",
    borderRadius: postRadii.card,
    borderWidth: 1,
    marginBottom: spacing.md,
    paddingHorizontal: postSpacing.cardPaddingX,
    paddingVertical: postSpacing.cardPaddingY,
    width: "100%",
  },
  flatRoot: {
    backgroundColor: "transparent",
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    marginBottom: 0,
    paddingHorizontal: postSpacing.cardPaddingX,
    paddingVertical: postSpacing.cardPaddingY,
    width: "100%",
  },
  threadLeft: {
    alignItems: "center",
    justifyContent: "flex-start",
    width: postSpacing.avatarColumnWidth,
  },
  threadRight: {
    flex: 1,
    minWidth: 0,
    paddingLeft: postSpacing.avatarToBodyGap,
  },
  threadRightFill: {
    width: "100%",
  },
  threadAvatarBtn: {
    alignItems: "center",
    justifyContent: "center",
    width: postSpacing.avatarColumnWidth,
  },
  compactHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    position: "relative",
  },
  authorTouchArea: {
    alignItems: "flex-start",
    flex: 1,
    minWidth: 0,
  },
  authorMeta: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  authorNameCompact: {
    color: colors.ink,
    fontWeight: postTypography.authorName.fontWeight,
    letterSpacing: postTypography.authorName.letterSpacing,
  },
  verifiedBadgeTransparent: {
    alignItems: "center",
    backgroundColor: "transparent",
    justifyContent: "center",
  },
  ratingChip: {
    alignItems: "center",
    flexDirection: "row",
    gap: 3,
    marginLeft: 6,
  },
  ratingChipStar: {
    color: "#F59E0B",
    fontSize: font.caption,
  },
  ratingChipText: {
    fontWeight: "700",
  },
  ratingChipCount: {
    fontWeight: "400",
  },
  authorSub: {
    color: colors.muted,
    fontWeight: postTypography.authorSub.fontWeight,
    marginTop: 2,
  },
  topRightRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  timeAgoText: {
    fontWeight: postTypography.timeAgo.fontWeight,
  },
  statusPill: {
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusPillText: {
    fontSize: font.caption,
    fontWeight: "800",
  },
  serviceTitle: {
    fontWeight: postTypography.serviceCategory.fontWeight,
    marginTop: 3,
  },
  bodyContent: {
    marginTop: postSpacing.headerToBodyGap,
  },
  caption: {
    color: colors.ink,
    fontWeight: postTypography.caption.fontWeight,
  },
  footerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: postSpacing.bodyToFooterGap,
  },
  footerLeft: {
    alignItems: "center",
    flexDirection: "row",
    gap: postSpacing.footerMetricGap,
  },
  footerActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: postSpacing.footerActionGap,
  },
  footerIconBtn: {
    alignItems: "center",
    borderRadius: postRadii.pill,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  footerMetricBtn: {
    alignItems: "center",
    borderRadius: postRadii.pill,
    flexDirection: "row",
    gap: 4,
    height: 32,
    justifyContent: "flex-start",
    paddingHorizontal: 2,
  },
  footerMetricText: {
    fontVariant: ["tabular-nums"],
    fontWeight: postTypography.metricCount.fontWeight,
    minWidth: 10,
  },
  priceText: {
    fontWeight: postTypography.price.fontWeight,
  },
  priceUnit: {
    fontWeight: postTypography.priceUnit.fontWeight,
  },
  modalOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  confirmDialog: {
    backgroundColor: "#FFFFFF",
    borderRadius: 5,
    maxWidth: 380,
    padding: spacing.lg,
    width: "100%",
  },
  confirmDialogTitle: {
    color: colors.ink,
    fontSize: font.heading,
    fontWeight: "800",
  },
  confirmDialogMessage: {
    color: colors.muted,
    fontSize: font.label,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  confirmDialogActions: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "flex-end",
    marginTop: spacing.lg,
  },
  confirmDialogCancelBtn: {
    borderRadius: radii.sm,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  confirmDialogCancelText: {
    color: colors.ink,
    fontSize: font.label,
    fontWeight: "600",
  },
  confirmDialogDeleteBtn: {
    backgroundColor: colors.danger,
    borderRadius: radii.sm,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  confirmDialogDeleteText: {
    color: "#FFFFFF",
    fontSize: font.label,
    fontWeight: "800",
  },
});
