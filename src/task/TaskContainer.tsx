import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Animated, Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { Avatar, LoadingState } from "../components/marketplace-ui";
import { Post } from "../components/posts/Post";
import { PostContainer } from "../components/posts/PostContainer";
import { useAppearance } from "../context/AppearanceContext";
import { createPost, deletePost, loadPosts, updatePost } from "../data/postsStore";
import { archiveBookingForUser, loadArchivedBookingIds } from "../data/marketplaceStore";
import { shouldUseFixtures } from "../data/marketplaceRepository";
import { useAuth } from "../auth/AuthProvider";
import { useFadeIn } from "../hooks/useFadeIn";
import { localizeArea, useLanguage } from "../i18n/locale";
import { BOOKING_TIME_SLOTS, toIndonesiaDateTime } from "./schedule";
import { spacing } from "../theme/tokens";
import type { BookingRecord } from "../types/marketplace";
import type { Post as PostType } from "../types/post";
import { TaskActiveCard } from "./components/TaskActiveCard";
import { TaskHistoryCard } from "./components/TaskHistoryCard";
import { TaskRequestCard } from "./components/TaskRequestCard";
import { TaskEmptyState } from "./components/TaskEmptyState";
import { TaskTabBar, type TaskTabKey } from "./components/TaskTabBar";
import { ICON_SIZE, ICON_STROKE } from '../theme/icons';
import { SwipeableRow } from "../components/SwipeableRow";
import { font } from '../theme/typography';

export interface TaskContainerProps {
  bookings: BookingRecord[];
  loading?: boolean;
  onBookingAction: (
    bookingId: string,
    nextStatus: BookingRecord["status"],
    proposedStartAt?: string,
  ) => Promise<void>;
  showHeader?: boolean;
}
export type JobsContainerProps = TaskContainerProps;

export function TaskContainer({
  bookings,
  loading = false,
  onBookingAction,
  showHeader = true,
}: TaskContainerProps) {
  const { language } = useLanguage();
  const { palette, reduceMotion } = useAppearance();
  const { user } = useAuth();
  const isPreview = shouldUseFixtures();
  const [archivedIds, setArchivedIds] = useState<string[]>([]);
  const [tab, setTab] = useState<TaskTabKey>("requests");
  const [selectedCustomerBooking, setSelectedCustomerBooking] =
    useState<BookingRecord | null>(null);
  const [proposedScheduleMap, setProposedScheduleMap] = useState<
    Record<string, { date: string; time: string }>
  >({});
  const [localPosts, setLocalPosts] = useState<PostType[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    void loadArchivedBookingIds(user.id)
      .then((ids) => {
        if (active) setArchivedIds(ids);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user?.id]);
  const tabFade = useFadeIn(tab);
  const handleArchiveBooking = (bookingId: string) => {
    setArchivedIds((prev) => (prev.includes(bookingId) ? prev : [...prev, bookingId]));
    void archiveBookingForUser(user?.id, bookingId).catch(() => {});
  };

  const runBookingAction = async (
    bookingId: string,
    status: BookingRecord["status"],
    proposedStartAt?: string,
  ) => {
    setActionError(null);
    try {
      await onBookingAction(bookingId, status, proposedStartAt);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "booking_update_failed",
      );
    }
  };

  const visibleBookings = useMemo(() => {
    if (isPreview) return bookings;
    const userId = user?.id;
    if (!userId) return [];
    return bookings.filter((b) => b.technicianUserId === userId);
  }, [bookings, isPreview, user?.id]);

  const activeVisibleBookings = useMemo(
    () => visibleBookings.filter((b) => !archivedIds.includes(b.id)),
    [visibleBookings, archivedIds],
  );

  const incomingRequests = useMemo(
    () =>
      activeVisibleBookings.filter(
        (b) => b.status === "requested" || b.status === "alternative_proposed",
      ),
    [activeVisibleBookings],
  );

  const activeTasks = useMemo(
    () =>
      activeVisibleBookings.filter(
        (b) => b.status === "confirmed" || b.status === "in_progress",
      ),
    [activeVisibleBookings],
  );

  const historyTasks = useMemo(
    () =>
      activeVisibleBookings.filter((b) =>
        ["completed", "cancelled", "declined"].includes(b.status),
      ),
    [activeVisibleBookings],
  );

  const customerCompletedCount = useMemo(() => {
    if (!selectedCustomerBooking) return 0;
    const cid = selectedCustomerBooking.customerUserId;
    const cname = selectedCustomerBooking.customerName;
    return bookings.filter(
      (b) =>
        b.status === "completed" &&
        ((cid && b.customerUserId === cid) ||
          (cname && b.customerName === cname)),
    ).length;
  }, [selectedCustomerBooking, bookings]);

  const handleAccept = (bookingId: string) => {
    void runBookingAction(bookingId, "confirmed");
  };

  const handleDecline = (bookingId: string) => {
    void runBookingAction(bookingId, "declined");
  };

  const handleProposeTime = (bookingId: string, date: string, time: string) => {
    void runBookingAction(
      bookingId,
      "alternative_proposed",
      toIndonesiaDateTime(date, time),
    );
  };

  const handleOpenChat = (bookingId: string) => {
    router.push({ pathname: "/booking/[id]", params: { id: bookingId } });
  };

  const handleStartTask = (bookingId: string) => {
    void runBookingAction(bookingId, "in_progress");
  };

  const handleCompleteTask = (bookingId: string) => {
    void runBookingAction(bookingId, "completed");
  };

  return (
    <View style={styles.container}>
      {showHeader ? (
      <View style={styles.headerBar} testID="tasks-screen-header">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={language === "en" ? "Back" : "Kembali"}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/");
            }
          }}
          style={[
            styles.headerBackBtn,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
          testID="tasks-header-back-btn"
        >
          <ArrowLeft size={ICON_SIZE} color={palette.text} strokeWidth={ICON_STROKE} />
        </Pressable>

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: palette.text }]}>
            {language === "en" ? "Tasks & Bookings" : "Tugas & Pesanan"}
          </Text>
        </View>

        <View style={{ width: 36 }} />
      </View>
      ) : null}

      <TaskTabBar
        activeTab={tab}
        onSelectTab={setTab}
        counts={{
          requests: incomingRequests.length,
          active: activeTasks.length,
          history: historyTasks.length,
        }}
      />

      {actionError ? (
        <Text
          accessibilityLiveRegion="polite"
          style={{ color: palette.danger, marginBottom: spacing.sm }}
          testID="booking-action-error"
        >
          {actionError}
        </Text>
      ) : null}

      <Animated.View
        style={{
          flexGrow: 1,
          opacity: tabFade.opacity,
          transform: [{ translateY: tabFade.translateY }],
        }}
      >
      {loading ? (
        <LoadingState
          label={language === "en" ? "Loading tasks..." : "Memuat tugas..."}
        />
      ) : tab === "requests" ? (
        incomingRequests.length > 0 ? (
          incomingRequests.map((req) => (
            <SwipeableRow
              key={req.id}
              deleteAccessibilityLabel={language === 'en' ? 'Delete request' : 'Hapus permintaan'}
              deleteTestID={`delete-request-${req.id}`}
              onDelete={() => handleArchiveBooking(req.id)}
            >
            <TaskRequestCard
              request={req}
              onAccept={handleAccept}
              onDecline={handleDecline}
              onProposeTime={handleProposeTime}
              onViewCustomer={setSelectedCustomerBooking}
              proposedDate={proposedScheduleMap[req.id]?.date}
              proposedTime={proposedScheduleMap[req.id]?.time}
              onChangeProposedDate={(date) =>
                setProposedScheduleMap((previous) => ({
                  ...previous,
                  [req.id]: {
                    date,
                    time: previous[req.id]?.time ?? BOOKING_TIME_SLOTS[0],
                  },
                }))
              }
              onChangeProposedTime={(time) =>
                setProposedScheduleMap((previous) => ({
                  ...previous,
                  [req.id]: {
                    date: previous[req.id]?.date ?? "",
                    time,
                  },
                }))
              }
            />
            </SwipeableRow>
          ))
        ) : (
          <TaskEmptyState variant="requests" testID="requests-empty-state" />
        )
      ) : tab === "active" ? (
        activeTasks.length > 0 ? (
          activeTasks.map((task) => (
            <TaskActiveCard
              key={task.id}
              task={task}
              onOpenChat={handleOpenChat}
              onStartTask={handleStartTask}
              onCompleteTask={handleCompleteTask}
              onViewCustomer={setSelectedCustomerBooking}
            />
          ))
        ) : (
          <TaskEmptyState variant="active" testID="active-empty-state" />
        )
      ) : tab === "history" ? (
        historyTasks.length > 0 ? (
          historyTasks.map((task) => (
          <SwipeableRow
            key={task.id}
            deleteAccessibilityLabel={language === 'en' ? 'Delete history' : 'Hapus riwayat'}
            deleteTestID={`delete-history-${task.id}`}
            onDelete={() => handleArchiveBooking(task.id)}
          >
            <TaskHistoryCard task={task} />
          </SwipeableRow>
        ))
        ) : (
          <TaskEmptyState variant="history" testID="history-empty-state" />
        )
      ) : (
        <View style={{ gap: spacing.md }}>
          <PostContainer
            onCreatePost={async (input) => {
              const techId = "demo-rizky";
              await createPost({
                actorUserId: techId,
                technicianId: techId,
                technicianName: "Rizky Pratama",
                caption: input.caption,
                imageUri: input.imageUri,
                mediaUrls: input.mediaUrls,
                isServicePost: input.isServicePost,
                serviceArea: "Jakarta Selatan",
                categorySlug: "plumbing",
                published: true,
              });
              const nextPosts = await loadPosts(techId, true);
              setLocalPosts(nextPosts);
            }}
          />
          {localPosts.map((post) => (
            <Post
              key={post.id}
              isOwner
              post={post}
              onEdit={async (targetPost, newCaption, newImageUri, updates) => {
                const techId = user?.id || "demo-rizky";
                const nextMediaUrls =
                  updates?.mediaUrls ?? (newImageUri ? [newImageUri] : []);
                await updatePost({
                  actorUserId: techId,
                  postId: targetPost.id,
                  caption: newCaption,
                  imageUri: nextMediaUrls[0],
                  mediaUrls: nextMediaUrls,
                  isServicePost:
                    updates?.isServicePost ?? targetPost.isServicePost,
                  serviceArea: updates?.serviceArea ?? targetPost.serviceArea,
                });
                const nextPosts = await loadPosts("demo-rizky", true);
                setLocalPosts(nextPosts);
              }}
              onDelete={async (postId) => {
                const techId = user?.id || "demo-rizky";
                await deletePost({ actorUserId: techId, postId });
                const nextPosts = await loadPosts("demo-rizky", true);
                setLocalPosts(nextPosts);
              }}
            />
          ))}
        </View>
      )}
      </Animated.View>

      {/* Customer Profile Detail Modal */}
      <Modal
        animationType={reduceMotion ? "none" : "fade"}
        transparent
        visible={selectedCustomerBooking !== null}
        onRequestClose={() => setSelectedCustomerBooking(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSelectedCustomerBooking(null)}
        >
          <Pressable
            style={[
              styles.customerModalCard,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
            onPress={(e) => e.stopPropagation()}
            testID="customer-profile-modal"
          >
            {selectedCustomerBooking && (
              <>
                <View style={styles.customerModalHeader}>
                  <Avatar
                    name={selectedCustomerBooking.customerName}
                    size={56}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.customerModalName,
                        { color: palette.text },
                      ]}
                    >
                      {selectedCustomerBooking.customerName}
                    </Text>
                    <Text
                      style={[
                        styles.customerModalBadge,
                        { color: palette.textMuted },
                      ]}
                    >
                      {language === "en"
                        ? `Customer • ${customerCompletedCount} orders completed`
                        : `Pelanggan • ${customerCompletedCount} pesanan selesai`}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.customerDetailSection,
                    {
                      backgroundColor: palette.surfaceElevated,
                      borderColor: palette.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.customerDetailLabel,
                      { color: palette.textMuted },
                    ]}
                  >
                    {language === "en" ? "Work Completed" : "Pekerjaan Selesai"}
                  </Text>
                  <Text
                    style={[
                      styles.customerDetailValue,
                      { color: palette.primary, fontWeight: "700" },
                    ]}
                  >
                    ✓ {customerCompletedCount} {language === "en" ? "tasks completed" : "tugas selesai"}
                  </Text>

                  <Text
                    style={[
                      styles.customerDetailLabel,
                      { color: palette.textMuted },
                    ]}
                  >
                    {language === "en" ? "Service Area" : "Area Layanan"}
                  </Text>
                  <Text
                    style={[
                      styles.customerDetailValue,
                      { color: palette.text },
                    ]}
                  >
                    {localizeArea(
                      selectedCustomerBooking.serviceArea,
                      language,
                    )}
                  </Text>

                  <Text
                    style={[
                      styles.customerDetailLabel,
                      { color: palette.textMuted },
                    ]}
                  >
                    {language === "en"
                      ? "Delivery Address"
                      : "Alamat Pengiriman"}
                  </Text>
                  <Text
                    style={[
                      styles.customerDetailValue,
                      { color: palette.text },
                    ]}
                    testID="customer-detail-address"
                  >
                    {selectedCustomerBooking.customerAddress}
                  </Text>

                  {selectedCustomerBooking.addressNotes && (
                    <>
                      <Text
                        style={[
                          styles.customerDetailLabel,
                          { color: palette.textMuted },
                        ]}
                      >
                        {language === "en" ? "Address Notes" : "Catatan Lokasi"}
                      </Text>
                      <Text
                        style={[
                          styles.customerDetailValue,
                          { color: palette.text },
                        ]}
                      >
                        {selectedCustomerBooking.addressNotes}
                      </Text>
                    </>
                  )}
                </View>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => setSelectedCustomerBooking(null)}
                  style={[
                    styles.closeModalBtn,
                    { borderColor: palette.border },
                  ]}
                  testID="close-customer-profile-modal"
                >
                  <Text
                    style={[styles.closeModalBtnText, { color: palette.text }]}
                  >
                    {language === "en" ? "Close" : "Tutup"}
                  </Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export const JobsContainer = TaskContainer;

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  headerBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md,
    paddingHorizontal: 4,
    width: "100%",
  },
  headerBackBtn: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  headerTitleWrap: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: font.heading,
    fontWeight: "700",
  },
  headerNotifBtn: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    position: "relative",
    width: 36,
  },
  notifBadge: {
    alignItems: "center",
    borderRadius: 7,
    height: 14,
    justifyContent: "center",
    minWidth: 14,
    paddingHorizontal: 3,
    position: "absolute",
    right: -2,
    top: -2,
  },
  notifBadgeText: {
    color: "#FFFFFF",
    fontSize: font.caption,
    fontWeight: "800",
  },
  modalOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  customerModalCard: {
    borderRadius: 5,
    borderWidth: 1,
    maxWidth: 440,
    padding: spacing.xl,
    width: "100%",
  },
  customerModalHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  customerModalName: {
    fontSize: font.heading,
    fontWeight: "800",
  },
  customerModalBadge: {
    fontSize: font.body,
    marginTop: 2,
  },
  customerDetailSection: {
    borderRadius: 5,
    borderWidth: 1,
    marginBottom: spacing.lg,
    padding: spacing.md,
  },
  customerDetailLabel: {
    fontSize: font.caption,
    fontWeight: "700",
    marginTop: spacing.xs,
  },
  customerDetailValue: {
    fontSize: font.label,
    fontWeight: "600",
    marginBottom: spacing.xs,
    marginTop: 2,
  },
  closeModalBtn: {
    alignItems: "center",
    borderRadius: 5,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
  },
  closeModalBtnText: {
    fontSize: font.label,
    fontWeight: "800",
  },
});
