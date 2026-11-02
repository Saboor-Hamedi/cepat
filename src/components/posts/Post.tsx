import { router } from "expo-router";
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
import { colors, radii, spacing } from "../../theme/tokens";
import type { TechnicianPost } from "../../types/post";
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
  const [draftImageUri, setDraftImageUri] = useState<string | undefined>(
    post.imageUri,
  );
  const [busy, setBusy] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);

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

  const images =
    post.mediaUrls && post.mediaUrls.length > 0
      ? post.mediaUrls
      : post.imageUri
        ? [post.imageUri]
        : [];
  const displayName = cleanTechnicianTypo(authorName || post.technicianName);
  const displayAvatar = authorAvatarUri || post.technicianAvatarUri;
  const displayBusinessName = cleanTechnicianTypo(post.technicianBusinessName);
  const displayContent = cleanTechnicianTypo(
    post.content || post.caption || "",
  );

  const handleSaveEdit = async () => {
    if (!onEdit || !draftCaption.trim()) return;
    setBusy(true);
    try {
      await onEdit(post, draftCaption.trim(), draftImageUri);
      setIsEditing(false);
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!onDelete) return;
    setConfirmDeleteVisible(false);
    await onDelete(post.id);
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
                {post.technicianVerified && (
                  <View
                    style={[
                      styles.verifiedBadge,
                      { backgroundColor: palette.primarySoft },
                    ]}
                  >
                    <Text
                      style={[
                        styles.verifiedBadgeText,
                        { color: palette.primary },
                      ]}
                    >
                      ✓
                    </Text>
                  </View>
                )}
              </View>
              <Text
                numberOfLines={1}
                style={[styles.authorSub, { color: palette.textMuted }]}
              >
                {displayBusinessName ? `${displayBusinessName} · ` : ""}
                {post.serviceArea
                  ? `${localizeArea(post.serviceArea, language)}`
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
                            setDraftImageUri(post.imageUri);
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
          {post.isServicePost ? (
            <View
              style={[
                styles.servicePostBadge,
                { backgroundColor: palette.primarySoft },
              ]}
            >
              <Text
                style={[
                  styles.servicePostBadgeText,
                  { color: palette.primary },
                ]}
              >
                {language === "en"
                  ? "Bookable Service"
                  : "Layanan Dapat Dipesan"}
              </Text>
            </View>
          ) : null}
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
              {language === "en" ? "Book Service" : "Pesan Layanan"} →
            </Text>
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
    borderRadius: 16,
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
    fontSize: 14,
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
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 1,
  },
  postMenu: {
    borderRadius: radii.md,
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
    fontSize: 13,
    fontWeight: "700",
  },
  verifiedBadge: {
    alignItems: "center",
    backgroundColor: colors.greenSoft,
    borderRadius: 5,
    height: 18,
    justifyContent: "center",
    width: 18,
  },
  verifiedBadgeText: {
    color: colors.greenDark,
    fontSize: 10,
    fontWeight: "900",
  },
  authorSub: {
    color: colors.muted,
    fontSize: 11,
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
    fontSize: 10,
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
    fontSize: 11,
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
    borderRadius: 12,
    marginBottom: spacing.xs,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  servicePostBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
    lineHeight: 15,
  },
  caption: {
    color: colors.ink,
    fontSize: 14,
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
    borderRadius: 12,
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
    borderRadius: 12,
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
    fontSize: 12,
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
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  postBookBtnText: {
    color: colors.greenDark,
    fontSize: 12,
    fontWeight: "800",
  },
  ownerDeleteBtn: {
    backgroundColor: "#FCE9E7",
    borderColor: "#F5C4BE",
  },
  ownerDeleteBtnText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "800",
  },
  adminSuspendBtn: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FDE68A",
  },
  adminSuspendBtnText: {
    color: "#B45309",
    fontSize: 12,
    fontWeight: "800",
  },
  adminUnsuspendBtn: {
    backgroundColor: "#DEF7EC",
    borderColor: "#BCF0DA",
  },
  adminUnsuspendBtnText: {
    color: "#03543F",
    fontSize: 12,
    fontWeight: "800",
  },
  editForm: {
    marginTop: spacing.xs,
  },
  captionInput: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 13,
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
    fontSize: 12,
    fontWeight: "700",
  },
  actionPrimaryBtn: {
    backgroundColor: colors.greenDark,
    borderColor: colors.greenDark,
  },
  actionPrimaryBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
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
    borderRadius: 16,
    maxWidth: 380,
    padding: spacing.lg,
    width: "100%",
  },
  confirmDialogTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "800",
  },
  confirmDialogMessage: {
    color: colors.muted,
    fontSize: 13,
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
    fontSize: 13,
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
    fontSize: 13,
    fontWeight: "800",
  },
});
