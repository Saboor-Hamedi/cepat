import { router } from "expo-router";
import { ArrowRight, BadgeCheck, Camera, X } from "lucide-react-native";
import { useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "../../auth/AuthProvider";
import { useAppearance } from "../../context/AppearanceContext";
import { localizeArea, useLanguage } from "../../i18n/locale";
import { ICON_SIZE, ICON_STROKE } from "../../theme/icons";
import { colors, radii, spacing } from "../../theme/tokens";
import { font } from "../../theme/typography";
import type { TechnicianPost } from "../../types/post";
import { ImageSourceSheet } from "../ImageSourceSheet";
import { Avatar } from "../marketplace-ui";
import { PostDropdown } from "./PostDropdown";

export interface TechnicianPostCardProps {
  post: TechnicianPost;
  isOwner?: boolean;
  isAdmin?: boolean;
  onEdit?: (
    post: TechnicianPost,
    newCaption: string,
    newImageUri?: string,
  ) => Promise<void>;
  onDelete?: (postId: string) => Promise<void>;
  onSuspend?: (postId: string, suspended: boolean) => Promise<void>;
  showAuthorHeader?: boolean;
  authorName?: string;
  authorAvatarUri?: string;
}

function cleanTechnicianTypo(text?: string): string {
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
  showAuthorHeader = true,
  authorName,
  authorAvatarUri,
}: TechnicianPostCardProps) {
  const { language } = useLanguage();
  const { user, roles, effectiveRole } = useAuth();
  const { palette } = useAppearance();
  const [isEditing, setIsEditing] = useState(false);
  const [draftCaption, setDraftCaption] = useState(
    post.content || post.caption || "",
  );
  const initialPostImage =
    post.imageUri || (post.mediaUrls && post.mediaUrls[0]) || undefined;
  const [draftImageUri, setDraftImageUri] = useState<string | undefined>(
    initialPostImage,
  );
  const [busy, setBusy] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [editImageMenuVisible, setEditImageMenuVisible] = useState(false);

  const isAdminUser = Boolean(
    isAdmin || roles.includes("admin") || effectiveRole === "admin",
  );
  const isSelfPost = Boolean(
    user?.id &&
    (user.id === post.technicianId ||
      (user.id === "demo-rizky" && post.technicianId === "demo-rizky") ||
      (user.id === "demo-customer" && post.technicianId === "demo-customer")),
  );
  const isActualOwner = Boolean(isOwner || isSelfPost);
  const canBook = Boolean(post.isServicePost) && !isSelfPost && !isOwner;
  const isVerified = Boolean(
    post.technicianVerified ||
    post.technicianId === "demo-rizky" ||
    post.technicianId === "demo-sari" ||
    (isActualOwner && (roles.includes("technician") || roles.includes("admin"))),
  );

  const images =
    post.mediaUrls && post.mediaUrls.length > 0
      ? post.mediaUrls
      : post.imageUri
        ? [post.imageUri]
        : [];
  const displayName = cleanTechnicianTypo(authorName || post.technicianName);
  const rawAuthorHandle =
    post.technicianUsername ||
    (isActualOwner && typeof user?.user_metadata?.username === "string" && user.user_metadata.username.trim()) ||
    displayName.toLowerCase().replace(/[^a-z0-9_]/g, "") ||
    "technician";
  const authorHandle = `@${rawAuthorHandle.replace(/^@/, "")}`;
  const displayAvatar = authorAvatarUri || post.technicianAvatarUri;
  const displayContent = cleanTechnicianTypo(
    post.content || post.caption || "",
  );

  const handleSaveEdit = async () => {
    if (!onEdit || !draftCaption.trim()) return;
    setBusy(true);
    try {
      await onEdit(post, draftCaption.trim(), draftImageUri ?? "");
      setIsEditing(false);
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!onDelete) return;
    setConfirmDeleteVisible(false);
    try {
      await onDelete(post.id);
    } catch (err) {
      console.warn('[Post] Delete post error:', err);
    }
  };

  const handleDeletePress = () => {
    // Show confirmation modal
    setConfirmDeleteVisible(true);
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: palette.surface, borderColor: palette.border },
      ]}
      testID={`technician-post-card-${post.id}`}
    >
      {/* Post Header */}
      {showAuthorHeader && (
        <View style={styles.headerRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View profile of ${displayName}`}
            onPress={() => router.push(`/technician/${post.technicianId}`)}
            style={styles.authorTouchArea}
            testID={`post-author-link-${post.id}`}
          >
            <Avatar uri={displayAvatar} name={displayName} size={40} />
            <View style={styles.authorMeta}>
              <View style={styles.nameRow}>
                <Text
                  numberOfLines={1}
                  style={[styles.authorName, { color: palette.text }]}
                >
                  {displayName}
                </Text>
                {isVerified && (
                  <View
                    style={styles.verifiedBadgeTransparent}
                    testID={`post-verified-badge-${post.id}`}
                  >
                    <BadgeCheck
                      size={ICON_SIZE}
                      color={palette.primary}
                      strokeWidth={ICON_STROKE}
                    />
                  </View>
                )}
                {post.isServicePost ? (
                  <View style={styles.servicePostBadgeInline}>
                    <Text
                      style={[
                        styles.servicePostBadgeTextInline,
                        { color: palette.primary },
                      ]}
                    >
                      {language === "en"
                        ? "Bookable Service"
                        : "Layanan Dapat Dipesan"}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text
                numberOfLines={1}
                style={[styles.authorSub, { color: palette.textMuted }]}
              >
                {authorHandle}
                {post.serviceArea
                  ? ` · ${localizeArea(post.serviceArea, language)}`
                  : ""}
              </Text>
            </View>
          </Pressable>

          <View style={styles.topRightRow}>
            <Text style={[styles.timeAgoText, { color: palette.textMuted }]}>
              {formatPostTime(post.createdAt, language)}
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
                            setDraftCaption(post.content || post.caption || "");
                            setDraftImageUri(
                              images.length > 0
                                ? images[0]
                                : (post.imageUri || (post.mediaUrls && post.mediaUrls[0]) || undefined)
                            );
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
                          label: post.suspended
                            ? language === "en"
                              ? "Restore post"
                              : "Pulihkan postingan"
                            : language === "en"
                              ? "Suspend post"
                              : "Tangguhkan postingan",
                          testID: post.suspended
                            ? `unsuspend-post-btn-${post.id}`
                            : `suspend-post-btn-${post.id}`,
                          onPress: () =>
                            void onSuspend(post.id, !post.suspended),
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
                    backgroundColor: post.published
                      ? palette.primarySoft
                      : palette.surfaceElevated,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusPillText,
                    {
                      color: post.published
                        ? palette.primary
                        : palette.textMuted,
                    },
                  ]}
                >
                  {post.published
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
      )}

      {/* Editing State or Content Body */}
      {isEditing ? (
        <View
          style={[
            styles.editForm,
            showAuthorHeader && styles.bodyContentIndented,
          ]}
          testID={`edit-post-form-${post.id}`}
        >
          <TextInput
            multiline
            maxLength={200}
            onChangeText={(text) => setDraftCaption(text.slice(0, 200))}
            placeholder={
              language === "en"
                ? "Update your post caption..."
                : "Perbarui keterangan postingan..."
            }
            placeholderTextColor={palette.textMuted}
            style={[
              styles.captionInput,
              {
                backgroundColor: palette.inputBg,
                borderColor: palette.border,
                color: palette.text,
              },
            ]}
            testID={`edit-post-caption-input-${post.id}`}
            value={draftCaption}
          />

          {/* Edit Photo Preview & Controls */}
          {draftImageUri ? (
            <View style={styles.editImageContainer}>
              <Image
                source={{ uri: draftImageUri }}
                style={styles.editImagePreview}
                resizeMode="cover"
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={language === "en" ? "Remove photo" : "Hapus foto"}
                onPress={() => setDraftImageUri(undefined)}
                style={styles.editImageRemoveBtn}
                testID={`remove-edit-image-btn-${post.id}`}
              >
                <X size={ICON_SIZE} color="#FFFFFF" strokeWidth={ICON_STROKE} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={language === "en" ? "Change photo" : "Ganti foto"}
                onPress={() => setEditImageMenuVisible(true)}
                style={[
                  styles.editImageChangeBtn,
                  { backgroundColor: palette.surface, borderColor: palette.border },
                ]}
                testID={`change-edit-image-btn-${post.id}`}
              >
                <Camera size={ICON_SIZE} color={palette.primary} strokeWidth={ICON_STROKE} />
                <Text style={[styles.editImageChangeText, { color: palette.primary }]}>
                  {language === "en" ? "Change Photo" : "Ganti Foto"}
                </Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={language === "en" ? "Add photo" : "Tambah foto"}
              onPress={() => setEditImageMenuVisible(true)}
              style={[
                styles.editAddPhotoBtn,
                { backgroundColor: palette.surface, borderColor: palette.border },
              ]}
              testID={`add-edit-image-btn-${post.id}`}
            >
              <Camera size={ICON_SIZE} color={palette.primary} strokeWidth={ICON_STROKE} />
              <Text style={[styles.editImageChangeText, { color: palette.primary }]}>
                {language === "en" ? "+ Add Photo" : "+ Tambah Foto"}
              </Text>
            </Pressable>
          )}

          <ImageSourceSheet
            allowFallbackUri
            backdropTestID={`edit-post-sheet-backdrop-${post.id}`}
            onClose={() => setEditImageMenuVisible(false)}
            onImageSelected={(nextUri) => {
              setEditImageMenuVisible(false);
              setDraftImageUri(nextUri);
            }}
            subtitle={
              language === "en"
                ? "Choose a photo to attach to your post."
                : "Pilih foto untuk dilampirkan pada postingan Anda."
            }
            testIDPrefix={`edit-post-image-${post.id}`}
            title={language === "en" ? "Select Photo" : "Pilih Foto"}
            visible={editImageMenuVisible}
          />
          <View style={styles.editActions}>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => {
                setDraftCaption(post.content || post.caption || "");
                setDraftImageUri(post.imageUri);
                setIsEditing(false);
              }}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: palette.surfaceElevated,
                  borderColor: palette.border,
                },
              ]}
              testID={`cancel-edit-post-btn-${post.id}`}
            >
              <Text style={[styles.actionBtnText, { color: palette.text }]}>
                {language === "en" ? "Cancel" : "Batal"}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={busy || !draftCaption.trim()}
              onPress={() => {
                void handleSaveEdit();
              }}
              style={[
                styles.actionBtn,
                styles.actionPrimaryBtn,
                {
                  backgroundColor: palette.primary,
                  borderColor: palette.primary,
                },
              ]}
              testID={`save-edited-post-btn-${post.id}`}
            >
              <Text style={styles.actionPrimaryBtnText}>
                {busy
                  ? language === "en"
                    ? "Saving..."
                    : "Menyimpan..."
                  : language === "en"
                    ? "Save"
                    : "Simpan"}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.bodyContent}>
          {Boolean(displayContent) && (
            <Text style={[styles.caption, { color: palette.text }]}>
              {displayContent}
            </Text>
          )}

          {/* Media Grid / Images */}
          {images.length > 0 && !imageError ? (
            <View style={styles.mediaContainer}>
              {images.length === 1 ? (
                <View
                  style={[
                    styles.singleImageFrame,
                    { backgroundColor: palette.surfaceElevated },
                  ]}
                >
                  <Image
                    source={{ uri: images[0] }}
                    style={styles.postImage}
                    resizeMode="cover"
                    onError={() => setImageError(true)}
                  />
                </View>
              ) : (
                <View style={styles.gridContainer}>
                  {images.map((imgUri, idx) => (
                    <View
                      key={`${imgUri}-${idx}`}
                      style={[
                        styles.gridImageFrame,
                        { backgroundColor: palette.surfaceElevated },
                      ]}
                    >
                      <Image
                        source={{ uri: imgUri }}
                        style={styles.postImage}
                        resizeMode="cover"
                        onError={() => setImageError(true)}
                      />
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : null}
        </View>
      )}

      {/* Direct Booking Shortcut for other users (Never show for self-technician post) */}
      {showAuthorHeader && canBook && (
        <View
          style={[
            styles.postBookingRow,
            styles.bodyContentIndented,
            { borderTopColor: palette.border },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              router.push({
                pathname: `/booking/${encodeURIComponent(post.technicianId)}` as any,
                params: {
                  id: post.technicianId,
                  postId: post.id,
                },
              })
            }
            style={[
              styles.postBookBtn,
              {
                backgroundColor: palette.primarySoft,
                borderColor: palette.primary,
              },
            ]}
            testID={`post-book-btn-${post.id}`}
          >
            <Text style={[styles.postBookBtnText, { color: palette.primary }]}>
              {language === "en" ? "Book Service" : "Pesan Layanan"}
            </Text>
            <ArrowRight
              color={palette.primary}
              size={ICON_SIZE}
              strokeWidth={ICON_STROKE}
            />
          </Pressable>
        </View>
      )}

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
    borderColor: "#E2E8F0",
    borderRadius: 5,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
    width: "100%",
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
    position: "relative",
  },
  authorTouchArea: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm,
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
  authorName: {
    color: colors.ink,
    fontSize: font.subtitle,
    fontWeight: "800",
  },
  menuAnchor: {
    alignSelf: "flex-start",
    marginLeft: spacing.xs,
    position: "relative",
    zIndex: 2,
  },
  menuTrigger: {
    alignItems: "center",
    borderRadius: radii.pill,
    height: 36,
    justifyContent: "center",
    width: 40,
  },
  menuTriggerText: {
    fontSize: font.section,
    fontWeight: "800",
    letterSpacing: 1,
  },
  postMenu: {
    borderRadius: 5,
    borderWidth: 1,
    elevation: 8,
    minWidth: 150,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    top: 36,
    zIndex: 10,
  },
  postMenuItem: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  postMenuText: {
    fontSize: font.label,
    fontWeight: "700",
  },
  verifiedBadge: {
    alignItems: "center",
    backgroundColor: "transparent",
    justifyContent: "center",
  },
  verifiedBadgeTransparent: {
    alignItems: "center",
    backgroundColor: "transparent",
    justifyContent: "center",
  },
  servicePostBadgeInline: {
    backgroundColor: "transparent",
    marginLeft: 6,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  servicePostBadgeTextInline: {
    fontSize: font.caption,
    fontWeight: "700",
  },
  verifiedBadgeText: {
    color: colors.greenDark,
    fontSize: font.caption,
    fontWeight: "900",
  },
  authorSub: {
    color: colors.muted,
    fontSize: font.caption,
    marginTop: 2,
  },
  statusPill: {
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusPillPublished: {
    backgroundColor: colors.greenSoft,
  },
  statusPillDraft: {
    backgroundColor: colors.paper,
  },
  statusPillText: {
    fontSize: font.caption,
    fontWeight: "800",
  },
  statusPillTextPublished: {
    color: colors.greenDark,
  },
  statusPillTextDraft: {
    color: colors.muted,
  },
  topRightRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  timeAgoText: {
    fontSize: font.caption,
    fontWeight: "500",
  },
  bodyContent: {
    marginTop: spacing.sm,
  },
  bodyContentIndented: {
    paddingLeft: 0,
  },
  servicePostBadge: {
    alignSelf: "flex-start",
    borderRadius: 5,
    marginBottom: spacing.xs,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  servicePostBadgeText: {
    fontSize: font.caption,
    fontWeight: "800",
    letterSpacing: 0.3,
    lineHeight: 15,
  },
  caption: {
    color: colors.ink,
    fontSize: font.subtitle,
    fontWeight: "400",
    lineHeight: 21,
  },
  mediaContainer: {
    marginTop: spacing.sm,
    width: "100%",
  },
  singleImageFrame: {
    aspectRatio: 16 / 9,
    backgroundColor: colors.paper,
    borderRadius: 5,
    overflow: "hidden",
    width: "100%",
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  gridImageFrame: {
    aspectRatio: 16 / 9,
    backgroundColor: colors.paper,
    borderRadius: 5,
    overflow: "hidden",
    width: "48%",
  },
  postImage: {
    height: "100%",
    width: "100%",
  },
  ownerActionsRow: {
    borderTopColor: "#F1F5F9",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "flex-end",
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
  },
  ownerActionBtn: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  ownerActionBtnText: {
    color: colors.ink,
    fontSize: font.body,
    fontWeight: "700",
  },
  postBookingRow: {
    borderTopColor: "#F1F5F9",
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
  },
  postBookBtn: {
    alignItems: "center",
    backgroundColor: colors.greenSoft,
    borderColor: colors.green,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  postBookBtnText: {
    color: colors.greenDark,
    fontSize: font.body,
    fontWeight: "800",
  },
  ownerDeleteBtn: {
    backgroundColor: "#FCE9E7",
    borderColor: "#F5C4BE",
  },
  ownerDeleteBtnText: {
    color: colors.danger,
    fontSize: font.body,
    fontWeight: "800",
  },
  adminSuspendBtn: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FDE68A",
  },
  adminSuspendBtnText: {
    color: "#B45309",
    fontSize: font.body,
    fontWeight: "800",
  },
  adminUnsuspendBtn: {
    backgroundColor: "#DEF7EC",
    borderColor: "#BCF0DA",
  },
  adminUnsuspendBtnText: {
    color: "#03543F",
    fontSize: font.body,
    fontWeight: "800",
  },
  editForm: {
    marginTop: spacing.xs,
  },
  editImageContainer: {
    borderRadius: 5,
    marginTop: spacing.sm,
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  editImagePreview: {
    aspectRatio: 16 / 9,
    borderRadius: 5,
    height: 200,
    width: "100%",
  },
  editImageRemoveBtn: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 14,
    height: 28,
    justifyContent: "center",
    position: "absolute",
    right: 8,
    top: 8,
    width: 28,
  },
  editImageChangeBtn: {
    alignItems: "center",
    borderRadius: 5,
    borderWidth: 1,
    bottom: 8,
    flexDirection: "row",
    gap: 5,
    left: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    position: "absolute",
  },
  editImageChangeText: {
    fontSize: font.body,
    fontWeight: "700",
  },
  editAddPhotoBtn: {
    alignItems: "center",
    borderRadius: 5,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    marginTop: spacing.sm,
    paddingVertical: 9,
    width: "100%",
  },
  captionInput: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.ink,
    fontSize: font.label,
    minHeight: 78,
    padding: spacing.md,
    textAlignVertical: "top",
  },
  editActions: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "flex-end",
    marginTop: spacing.sm,
  },
  actionBtn: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  actionBtnText: {
    color: colors.ink,
    fontSize: font.body,
    fontWeight: "700",
  },
  actionPrimaryBtn: {
    backgroundColor: colors.greenDark,
    borderColor: colors.greenDark,
  },
  actionPrimaryBtnText: {
    color: "#FFFFFF",
    fontSize: font.body,
    fontWeight: "800",
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
