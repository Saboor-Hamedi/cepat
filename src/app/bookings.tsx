import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AppNavigationBar,
  EmptyState,
  LoadingState,
  TechnicianCard,
} from "../components/marketplace-ui";
import { BackHeader } from "../components/BackHeader";
import { SwipeableRow } from "../components/SwipeableRow";
import {
  BookingCard,
  BookingsEmptyState,
  HubSwitcher,
  StatusFilterPills,
} from "../bookings";
import { useAppearance } from "../context/AppearanceContext";
import { loadTechnicians, shouldUseFixtures } from "../data/marketplaceRepository";
import { subscribeToReconnect } from "../services/networkStatus";
import {
  archiveBookingForUser,
  isChatEnabledForStatus,
  loadArchivedBookingIds,
  loadBookings,
  loadSavedTechnicianIds,
  loadSubmittedReports,
  loadSubmittedReviews,
  subscribeToBookings,
  transitionBookingStatus,
  updateBookingReview,
} from "../data/marketplaceStore";
import { localizeArea, useLanguage } from "../i18n/locale";
import { useFadeIn } from "../hooks/useFadeIn";
import { useAuth } from "../auth/AuthProvider";
import { TaskContainer } from "../task";
import type {
  BookingRecord,
  Technician,
  TechnicianReport,
  TechnicianReview,
} from "../types/marketplace";
import { colors, radii, spacing } from "../theme/tokens";
import { font } from '../theme/typography';

type CustomerHubTab =
  "current" | "history" | "messages" | "saved" | "reviews_reports";

export interface CustomerBookingsScreenProps { initialHub?: "bookings" | "tasks"; }
export default function CustomerBookingsScreen({ initialHub }: CustomerBookingsScreenProps = {}) {
  const { language, t } = useLanguage();
  const { palette } = useAppearance();
  const { user, roles, effectiveRole, applicationStatus, applicationError, refreshAccount } = useAuth();
  const params = useLocalSearchParams<{ hub?: string }>();
  const isPreview = shouldUseFixtures();
  const requestedHub = initialHub ?? (params.hub === "tasks" ? "tasks" : params.hub === "bookings" ? "bookings" : undefined);
  const isTechnicianAccount = Boolean(
    (user &&
      (effectiveRole === "technician" ||
        roles.includes("technician") ||
        effectiveRole === "admin" ||
        roles.includes("admin") ||
        user.user_metadata?.requested_account_type === "technician")) ||
      (requestedHub === "tasks" && isPreview && !user)
  );
  const [manualHub, setManualHub] = useState<{ base: typeof requestedHub; value: "bookings" | "tasks" } | null>(null);
  const hub: "bookings" | "tasks" = manualHub && manualHub.base === requestedHub ? manualHub.value : (requestedHub === "tasks" ? "tasks" : "bookings");
  const setHub = (next: "bookings" | "tasks") => setManualHub({ base: requestedHub, value: next });
  const isApprovedTechnician = (isTechnicianAccount && applicationStatus !== "rejected") || (isPreview && !user);
  const [tab, setTab] = useState<CustomerHubTab>("current");
  const [allBookings, setAllBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [reloadBookingsKey, setReloadBookingsKey] = useState(0);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [savedTechnicians, setSavedTechnicians] = useState<Technician[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [reviews, setReviews] = useState<TechnicianReview[]>([]);
  const [reports, setReports] = useState<TechnicianReport[]>([]);
  const [editingReviewKey, setEditingReviewKey] = useState<string | null>(null);
  const [editRating, setEditRating] = useState<number>(5);
  const [editComment, setEditComment] = useState<string>("");
  const [savingReviewEdit, setSavingReviewEdit] = useState(false);
  const [archivedIds, setArchivedIds] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    void loadArchivedBookingIds(user?.id)
      .then((ids) => {
        if (active) setArchivedIds(ids);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user?.id]);

  const handleArchiveBooking = (bookingId: string) => {
    setArchivedIds((prev) =>
      prev.includes(bookingId) ? prev : [...prev, bookingId],
    );
    void archiveBookingForUser(user?.id, bookingId).catch(() => {});
  };

  useEffect(() => {
    let active = true;
    const applyBookings = (raw: BookingRecord[]) => {
      setAllBookings(raw);
      const userBookings = user?.id
        ? raw.filter((booking) => booking.customerUserId === user.id)
        : [];
      setBookings(userBookings);
    };
    const refresh = async () => {
      try {
        const [allBookings, techPage, savedIds, subReviews, subReports] =
          await Promise.all([
            loadBookings(),
            loadTechnicians(),
            loadSavedTechnicianIds(user?.id),
            loadSubmittedReviews(),
            loadSubmittedReports(),
          ]);
        if (!active) return;
        applyBookings(allBookings);
        setTechnicians(techPage.items);
        setSavedTechnicians(
          techPage.items.filter((item) => savedIds.includes(item.id)),
        );
        setReviews(subReviews);
        setReports(subReports);
        setBookingsError(null);
      } catch (error) {
        if (active) {
          setBookingsError(
            error instanceof Error ? error.message : "bookings_load_failed",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void refresh();
    const unsubscribe = user?.id
      ? subscribeToBookings(
          user.id,
          () => {
            void loadBookings()
              .then((allBookings) => {
                if (active) {
                  applyBookings(allBookings);
                  setBookingsError(null);
                }
              })
              .catch((error: unknown) => {
                if (active) {
                  setBookingsError(
                    error instanceof Error
                      ? error.message
                      : "bookings_load_failed",
                  );
                }
              });
          },
          (message) => {
            if (active) setBookingsError(message);
          },
        )
      : () => {};
    const unsubscribeReconnect = subscribeToReconnect(() => {
      void refresh();
    });
    return () => {
      active = false;
      unsubscribe();
      unsubscribeReconnect();
    };
  }, [reloadBookingsKey, user?.id]);

  const currentBookings = useMemo(
    () =>
      bookings.filter(
        (b) =>
          !archivedIds.includes(b.id) &&
          [
            "requested",
            "alternative_proposed",
            "confirmed",
            "in_progress",
          ].includes(b.status),
      ),
    [archivedIds, bookings],
  );

  const historyBookings = useMemo(
    () =>
      bookings.filter(
        (b) =>
          !archivedIds.includes(b.id) &&
          ["completed", "cancelled", "declined"].includes(b.status),
      ),
    [archivedIds, bookings],
  );

  const activeChatBookings = useMemo(
    () =>
      bookings.filter(
        (b) => !archivedIds.includes(b.id) && isChatEnabledForStatus(b.status),
      ),
    [archivedIds, bookings],
  );

  const currentUserId = user?.id;
  const uniqueReviews = useMemo(() => {
    const seen = new Set<string>();
    const customerCompletedIds = new Set(
      bookings
        .filter((b) => b.status === "completed" && b.customerUserId === currentUserId)
        .map((b) => b.id),
    );
    return reviews.filter((r) => {
      if (seen.has(r.id)) return false;
      if (
        r.customerUserId &&
        currentUserId &&
        r.customerUserId !== currentUserId
      ) {
        return false;
      }
      if (
        r.bookingId &&
        currentUserId &&
        !customerCompletedIds.has(r.bookingId) &&
        r.customerUserId !== currentUserId
      ) {
        return false;
      }
      seen.add(r.id);
      return true;
    });
  }, [bookings, currentUserId, reviews]);

  const handleSaveInlineReviewEdit = async (params: {
    bookingId?: string;
    reviewId?: string;
    technicianId: string;
  }) => {
    if (!user?.id || savingReviewEdit) return;
    setSavingReviewEdit(true);
    try {
      const updated = await updateBookingReview({
        bookingId: params.bookingId,
        reviewId: params.reviewId,
        customerUserId: user.id,
        technicianId: params.technicianId,
        rating: editRating,
        comment: editComment,
      });
      setReviews((prev) => {
        const exists = prev.some(
          (r) => r.id === updated.id || (r.bookingId && r.bookingId === updated.bookingId),
        );
        return exists
          ? prev.map((r) =>
              r.id === updated.id || (r.bookingId && r.bookingId === updated.bookingId)
                ? updated
                : r,
            )
          : [updated, ...prev];
      });
      if (updated.bookingId) {
        setBookings((prev) =>
          prev.map((b) =>
            b.id === updated.bookingId
              ? { ...b, reviewRating: updated.rating, reviewComment: updated.comment }
              : b,
          ),
        );
        setAllBookings((prev) =>
          prev.map((b) =>
            b.id === updated.bookingId
              ? { ...b, reviewRating: updated.rating, reviewComment: updated.comment }
              : b,
          ),
        );
      }
      setEditingReviewKey(null);
    } finally {
      setSavingReviewEdit(false);
    }
  };

  const uniqueReports = useMemo(() => {
    const seen = new Set<string>();
    return reports.filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
  }, [reports]);

  const handleTechBookingAction = async (
    bookingId: string,
    nextStatus: BookingRecord["status"],
    proposedStartAt?: string,
  ) => {
    const updated = await transitionBookingStatus(
      bookingId,
      nextStatus,
      "technician",
      { proposedStartAt },
    );
    setAllBookings((current) =>
      current.map((b) => (b.id === bookingId ? updated : b)),
    );
    setBookings((current) =>
      current.map((b) => (b.id === bookingId ? updated : b)),
    );
  };

  const technicianById = useMemo(
    () => new Map(technicians.map((tech) => [tech.id, tech])),
    [technicians],
  );

  const showTasks = hub === "tasks";
  const showHubSwitcher = isTechnicianAccount || hub === "tasks" || Boolean(user);
  const headerTitle =
    hub === "tasks"
      ? language === "en"
        ? "Tasks & Requests"
        : "Tugas & Permintaan"
      : t("dashboard.customerTitle");
  const hubFade = useFadeIn(hub);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.background }]}
      edges={["top", "bottom"]}
    >
      <ScrollView
        style={styles.screenContent}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.container} testID="technician-social-profile-card">
          {/* Top app header: back chevron + screen title */}
          <BackHeader
            title={headerTitle}
            backBtnTestID="customer-bookings-back-btn"
            testID="customer-bookings-header"
          />

          {/* Hidden semantic tag to preserve test compatibility */}
          <Text style={styles.srOnly} testID="bookings-heading">
            {headerTitle}
          </Text>

          {showHubSwitcher && (
            <HubSwitcher<"bookings" | "tasks">
              activeTab={hub}
              onSelectTab={setHub}
              testIDPrefix="bookings-hub"
              tabs={[
                {
                  key: "bookings",
                  label: language === "en" ? "Bookings" : "Pesanan",
                },
                {
                  key: "tasks",
                  label: language === "en" ? "Tasks" : "Tugas",
                },
              ]}
            />
          )}

          <Animated.View
            style={{
              opacity: hubFade.opacity,
              transform: [{ translateY: hubFade.translateY }],
            }}
          >
          {showTasks ? (!isApprovedTechnician ? (
            <View
              style={[styles.card, { backgroundColor: palette.surfaceElevated, borderColor: palette.border }]}
              testID="unapproved-technician-banner"
            >
              <Text style={[styles.cardTitle, { color: palette.text }]}>
                {applicationStatus === "rejected"
                  ? language === "en" ? "Application Rejected" : "Pengajuan Ditolak"
                  : language === "en" ? "Application Under Review" : "Pengajuan Sedang Ditinjau"}
              </Text>
              <Text style={[styles.cardSub, { color: palette.textMuted }]}>
                {applicationStatus === "rejected"
                  ? language === "en"
                    ? "Your technician application was not approved. You can re-apply or continue as a customer."
                    : "Pengajuan teknisi Anda belum disetujui. Anda dapat mengajukan ulang atau lanjut sebagai pelanggan."
                  : language === "en"
                    ? "Your technician application is being verified by our team. You will have full access once approved."
                    : "Pengajuan teknisi Anda sedang diverifikasi oleh tim kami. Akses penuh akan terbuka setelah disetujui."}
              </Text>
              {applicationError ? (
                <View style={{ marginTop: spacing.sm }}>
                  <Text style={{ color: palette.danger, fontSize: font.body }}>{applicationError}</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => { void refreshAccount(); }}
                    style={[styles.editReviewPillBtn, { alignSelf: "flex-start", backgroundColor: palette.primary, borderColor: palette.primary, marginTop: spacing.xs }]}
                  >
                    <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>{t("home.retry")}</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ) : (
            <TaskContainer
              bookings={allBookings}
              loading={loading}
              onBookingAction={handleTechBookingAction}
              showHeader={false}
            />
          )) : null}

          {!showTasks && (<>
          <StatusFilterPills<CustomerHubTab>
            activeTab={tab}
            onSelectTab={setTab}
            testIDPrefix="customer-tab"
            tabs={[
              {
                key: "current",
                label: language === "en" ? "Current" : "Aktif",
                count: currentBookings.length,
              },
              {
                key: "history",
                label: language === "en" ? "History" : "Riwayat",
                count: historyBookings.length,
              },
              {
                key: "messages",
                label: language === "en" ? "Messages" : "Pesan",
                count: activeChatBookings.length,
              },
              {
                key: "saved",
                label: language === "en" ? "Saved" : "Tersimpan",
                count: savedTechnicians.length,
              },
              {
                key: "reviews_reports",
                label:
                  language === "en" ? "Reviews & Reports" : "Ulasan & Laporan",
              },
            ]}
          />

          {loading ? (
            <LoadingState label={t("home.loading")} />
          ) : bookingsError ? (
            <EmptyState
              title={
                language === "en"
                  ? "Could not load your bookings"
                  : "Pesanan tidak dapat dimuat"
              }
              description={bookingsError}
              actionLabel={t("home.retry")}
              onAction={() => {
                setBookingsError(null);
                setLoading(true);
                setReloadBookingsKey((current) => current + 1);
              }}
            />
          ) : tab === "current" ? (
            currentBookings.length > 0 ? (
              currentBookings.map((booking) => (
                <SwipeableRow
                  key={booking.id}
                  deleteAccessibilityLabel={
                    language === "en" ? "Delete booking" : "Hapus pesanan"
                  }
                  deleteTestID={`delete-booking-${booking.id}`}
                  onDelete={() => handleArchiveBooking(booking.id)}
                >
                  <BookingCard
                    booking={booking}
                    technicianAvatarUri={
                      technicianById.get(booking.technicianUserId)?.avatarUri
                    }
                    technicianVerified={
                      technicianById.get(booking.technicianUserId)?.verified
                    }
                  />
                </SwipeableRow>
              ))
            ) : (
              <BookingsEmptyState />
            )
          ) : tab === "history" ? (
            historyBookings.length > 0 ? (
              historyBookings.map((booking) => {
                const canCustomerEditHistoryReview = Boolean(
                  user?.id &&
                    booking.status === "completed" &&
                    booking.customerUserId === user.id &&
                    user.id !== booking.technicianUserId &&
                    typeof booking.reviewRating === "number",
                );
                const isEditingThisHistory =
                  editingReviewKey === `history-${booking.id}`;
                return (
                  <View key={booking.id}>
                    <SwipeableRow
                      deleteAccessibilityLabel={
                        language === "en" ? "Delete booking" : "Hapus pesanan"
                      }
                      deleteTestID={`delete-history-booking-${booking.id}`}
                      onDelete={() => handleArchiveBooking(booking.id)}
                    >
                      <BookingCard
                        booking={booking}
                        technicianAvatarUri={
                          technicianById.get(booking.technicianUserId)?.avatarUri
                        }
                        technicianVerified={
                          technicianById.get(booking.technicianUserId)?.verified
                        }
                      />
                    </SwipeableRow>
                    {canCustomerEditHistoryReview ? (
                      isEditingThisHistory ? (
                        <View
                          style={[
                            styles.card,
                            {
                              backgroundColor: palette.surface,
                              borderColor: palette.primary,
                              marginTop: -6,
                            },
                          ]}
                          testID={`history-edit-review-form-${booking.id}`}
                        >
                          <View style={styles.inlineStarsRow}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Pressable
                                key={star}
                                accessibilityRole="button"
                                onPress={() => setEditRating(star)}
                                style={[
                                  styles.inlineStarBtn,
                                  editRating >= star && styles.inlineStarBtnActive,
                                ]}
                                testID={`history-edit-star-${booking.id}-${star}`}
                              >
                                <Text
                                  style={[
                                    styles.inlineStarText,
                                    editRating >= star && styles.inlineStarTextActive,
                                  ]}
                                >
                                  ★
                                </Text>
                              </Pressable>
                            ))}
                          </View>
                          <TextInput
                            multiline
                            onChangeText={setEditComment}
                            placeholder={t("booking.reviewPlaceholder")}
                            placeholderTextColor={palette.textMuted}
                            style={[
                              styles.inlineReviewInput,
                              {
                                backgroundColor: palette.surfaceElevated,
                                borderColor: palette.border,
                                color: palette.text,
                              },
                            ]}
                            testID={`history-edit-comment-input-${booking.id}`}
                            value={editComment}
                          />
                          <View style={styles.inlineEditActions}>
                            <Pressable
                              accessibilityRole="button"
                              onPress={() => setEditingReviewKey(null)}
                              style={[
                                styles.inlineActionBtn,
                                { borderColor: palette.border },
                              ]}
                              testID={`history-cancel-edit-review-${booking.id}`}
                            >
                              <Text style={{ color: palette.text, fontWeight: "700" }}>
                                {language === "en" ? "Cancel" : "Batal"}
                              </Text>
                            </Pressable>
                            <Pressable
                              accessibilityRole="button"
                              disabled={savingReviewEdit}
                              onPress={() => {
                                void handleSaveInlineReviewEdit({
                                  bookingId: booking.id,
                                  technicianId: booking.technicianUserId,
                                });
                              }}
                              style={[
                                styles.inlineActionBtn,
                                {
                                  backgroundColor: palette.primary,
                                  borderColor: palette.primary,
                                },
                              ]}
                              testID={`history-save-edit-review-${booking.id}`}
                            >
                              <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>
                                {language === "en" ? "Save Feedback" : "Simpan Ulasan"}
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.historyFeedbackActionRow}>
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => {
                              setEditRating(booking.reviewRating ?? 5);
                              setEditComment(booking.reviewComment ?? "");
                              setEditingReviewKey(`history-${booking.id}`);
                            }}
                            style={[
                              styles.editReviewPillBtn,
                              {
                                backgroundColor: palette.primarySoft,
                                borderColor: palette.primary,
                              },
                            ]}
                            testID={`history-edit-review-btn-${booking.id}`}
                          >
                            <Text
                              style={[
                                styles.editReviewPillText,
                                { color: palette.primary },
                              ]}
                            >
                              {language === "en" ? "Edit Feedback" : "Edit Ulasan"}
                            </Text>
                          </Pressable>
                        </View>
                      )
                    ) : null}
                  </View>
                );
              })
            ) : (
              <EmptyState
                title={
                  language === "en"
                    ? "No past bookings yet"
                    : "Belum ada riwayat pesanan"
                }
                description={
                  language === "en"
                    ? "Completed and cancelled bookings will appear here."
                    : "Pesanan yang telah selesai atau dibatalkan akan tampil di sini."
                }
              />
            )
          ) : tab === "messages" ? (
            activeChatBookings.length > 0 ? (
              activeChatBookings.map((booking) => (
                <SwipeableRow
                  key={booking.id}
                  deleteAccessibilityLabel={
                    language === "en" ? "Delete conversation" : "Hapus percakapan"
                  }
                  deleteTestID={`delete-chat-thread-${booking.id}`}
                  onDelete={() => handleArchiveBooking(booking.id)}
                >
                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      router.push({
                        pathname: "/booking/[id]",
                        params: { id: booking.id },
                      })
                    }
                    style={[
                      styles.card,
                      {
                        backgroundColor: palette.surface,
                        borderColor: palette.border,
                      },
                    ]}
                    testID={`chat-thread-${booking.id}`}
                  >
                    <View style={styles.cardTop}>
                      <Text style={[styles.cardTitle, { color: palette.text }]}>
                        {booking.technicianBusinessName || booking.technicianName}
                      </Text>
                      <Text style={styles.chatOpenBadge}>
                        {language === "en" ? "Open Chat" : "Buka Chat"}
                      </Text>
                    </View>
                    <Text style={[styles.cardSub, { color: palette.textMuted }]}>
                      {booking.serviceNameSnapshot} ·{" "}
                      {localizeArea(booking.serviceArea, language)}
                    </Text>
                  </Pressable>
                </SwipeableRow>
              ))
            ) : (
              <EmptyState
                title={
                  language === "en"
                    ? "No open conversations"
                    : "Belum ada percakapan aktif"
                }
                description={t("booking.chatLocked")}
              />
            )
          ) : tab === "saved" ? (
            savedTechnicians.length > 0 ? (
              savedTechnicians.map((tech) => (
                <TechnicianCard
                  key={tech.id}
                  technician={tech}
                  source="fixtures"
                  onPress={() =>
                    router.push({
                      pathname: "/technician/[id]",
                      params: { id: tech.id },
                    })
                  }
                />
              ))
            ) : (
              <EmptyState
                title={
                  language === "en"
                    ? "No saved technicians"
                    : "Belum ada teknisi tersimpan"
                }
                description={
                  language === "en"
                    ? "Bookmark technicians from their profile page."
                    : "Simpan teknisi dari halaman profil mereka untuk akses cepat."
                }
              />
            )
          ) : uniqueReviews.length === 0 && uniqueReports.length === 0 ? (
            <EmptyState
              title={
                language === "en"
                  ? "No reviews or reports yet"
                  : "Belum ada ulasan atau laporan"
              }
              description={
                language === "en"
                  ? "Your submitted service reviews and dispute reports will appear here."
                  : "Ulasan layanan dan laporan pengaduan yang Anda kirim akan muncul di sini."
              }
            />
          ) : (
            <View style={styles.sectionList}>
              {uniqueReviews.length > 0 && (
                <>
                  <Text style={[styles.sectionSubheading, { color: palette.text }]}>
                    {language === "en"
                      ? "Your Submitted Reviews"
                      : "Ulasan yang Kamu Kirim"}{" "}
                    ({uniqueReviews.length})
                  </Text>
                  {uniqueReviews.map((rev) => {
                    const linkedBooking = rev.bookingId
                      ? bookings.find((b) => b.id === rev.bookingId)
                      : bookings.find(
                          (b) =>
                            b.technicianUserId === rev.technicianId &&
                            b.status === "completed" &&
                            b.customerUserId === user?.id,
                        );
                    const canEditThisReview = Boolean(
                      user?.id &&
                        linkedBooking &&
                        linkedBooking.status === "completed" &&
                        linkedBooking.customerUserId === user.id &&
                        user.id !== linkedBooking.technicianUserId,
                    );
                    const isEditingThisRev = editingReviewKey === `rev-${rev.id}`;
                    return (
                      <View
                        key={rev.id}
                        style={[
                          styles.card,
                          {
                            backgroundColor: palette.surface,
                            borderColor: palette.border,
                          },
                        ]}
                      >
                        <View style={styles.cardTop}>
                          <Text style={[styles.cardTitle, { color: palette.text }]}>
                            ★ {rev.rating.toFixed(1)}
                          </Text>
                          {canEditThisReview && !isEditingThisRev ? (
                            <Pressable
                              accessibilityRole="button"
                              onPress={() => {
                                setEditRating(rev.rating);
                                setEditComment(rev.comment ?? "");
                                setEditingReviewKey(`rev-${rev.id}`);
                              }}
                              style={[
                                styles.editReviewPillBtn,
                                {
                                  backgroundColor: palette.primarySoft,
                                  borderColor: palette.primary,
                                },
                              ]}
                              testID={`hub-edit-review-btn-${rev.id}`}
                            >
                              <Text
                                style={[
                                  styles.editReviewPillText,
                                  { color: palette.primary },
                                ]}
                              >
                                {language === "en" ? "Edit Feedback" : "Edit Ulasan"}
                              </Text>
                            </Pressable>
                          ) : null}
                        </View>
                        {isEditingThisRev && linkedBooking ? (
                          <View
                            style={{ marginTop: spacing.sm }}
                            testID={`hub-edit-review-form-${rev.id}`}
                          >
                            <View style={styles.inlineStarsRow}>
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Pressable
                                  key={star}
                                  accessibilityRole="button"
                                  onPress={() => setEditRating(star)}
                                  style={[
                                    styles.inlineStarBtn,
                                    editRating >= star && styles.inlineStarBtnActive,
                                  ]}
                                  testID={`hub-edit-star-${rev.id}-${star}`}
                                >
                                  <Text
                                    style={[
                                      styles.inlineStarText,
                                      editRating >= star && styles.inlineStarTextActive,
                                    ]}
                                  >
                                    ★
                                  </Text>
                                </Pressable>
                              ))}
                            </View>
                            <TextInput
                              multiline
                              onChangeText={setEditComment}
                              placeholder={t("booking.reviewPlaceholder")}
                              placeholderTextColor={palette.textMuted}
                              style={[
                                styles.inlineReviewInput,
                                {
                                  backgroundColor: palette.surfaceElevated,
                                  borderColor: palette.border,
                                  color: palette.text,
                                },
                              ]}
                              testID={`hub-edit-comment-input-${rev.id}`}
                              value={editComment}
                            />
                            <View style={styles.inlineEditActions}>
                              <Pressable
                                accessibilityRole="button"
                                onPress={() => setEditingReviewKey(null)}
                                style={[
                                  styles.inlineActionBtn,
                                  { borderColor: palette.border },
                                ]}
                                testID={`hub-cancel-edit-review-${rev.id}`}
                              >
                                <Text style={{ color: palette.text, fontWeight: "700" }}>
                                  {language === "en" ? "Cancel" : "Batal"}
                                </Text>
                              </Pressable>
                              <Pressable
                                accessibilityRole="button"
                                disabled={savingReviewEdit}
                                onPress={() => {
                                  void handleSaveInlineReviewEdit({
                                    bookingId: linkedBooking.id,
                                    reviewId: rev.id,
                                    technicianId: linkedBooking.technicianUserId,
                                  });
                                }}
                                style={[
                                  styles.inlineActionBtn,
                                  {
                                    backgroundColor: palette.primary,
                                    borderColor: palette.primary,
                                  },
                                ]}
                                testID={`hub-save-edit-review-${rev.id}`}
                              >
                                <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>
                                  {language === "en" ? "Save Feedback" : "Simpan Ulasan"}
                                </Text>
                              </Pressable>
                            </View>
                          </View>
                        ) : (
                          <Text
                            style={[styles.cardSub, { color: palette.textMuted }]}
                          >
                            {rev.comment}
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </>
              )}

              {uniqueReports.length > 0 && (
                <>
                  <Text style={[styles.sectionSubheading, { color: palette.text }]}>
                    {language === "en"
                      ? "Your Submitted Reports"
                      : "Laporan Kendala"}{" "}
                    ({uniqueReports.length})
                  </Text>
                  {uniqueReports.map((rep) => (
                    <View
                      key={rep.id}
                      style={[
                        styles.card,
                        {
                          backgroundColor: palette.surface,
                          borderColor: palette.border,
                        },
                      ]}
                    >
                      <Text style={[styles.cardTitle, { color: palette.text }]}>
                        {rep.technicianName} · {rep.category}
                      </Text>
                      <Text
                        style={[styles.cardSub, { color: palette.textMuted }]}
                      >
                        {rep.description}
                      </Text>
                      <Text style={styles.reportStatusBadge}>
                        {rep.status.toUpperCase()}
                      </Text>
                    </View>
                  ))}
                </>
              )}
            </View>
          )}
          </>)}
          </Animated.View>
        </View>
      </ScrollView>
      <AppNavigationBar activeTab="bookings" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screenContent: { flex: 1 },
  safeArea: { flex: 1 },
  srOnly: { height: 0, opacity: 0, position: "absolute", width: 0 },
  scrollContent: { flexGrow: 1, paddingBottom: spacing.xxxl },
  container: {
    alignSelf: "center",
    maxWidth: 820,
    paddingHorizontal: 16,
    paddingTop: spacing.sm,
    width: "100%",
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: 14,
  },
  cardTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  cardTitle: { flex: 1, fontSize: font.heading, fontWeight: "800" },
  cardSub: { fontSize: font.body, marginTop: 4 },
  chatOpenBadge: {
    backgroundColor: colors.greenDark,
    borderRadius: 5,
    color: "#FFFFFF",
    fontSize: font.caption,
    fontWeight: "800",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sectionList: { gap: spacing.sm },
  sectionSubheading: {
    fontSize: font.title,
    fontWeight: "800",
    marginTop: spacing.md,
  },
  reportStatusBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderRadius: radii.sm,
    color: "#F59E0B",
    fontSize: font.caption,
    fontWeight: "800",
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  historyFeedbackActionRow: {
    alignItems: "flex-end",
    marginBottom: spacing.sm,
    marginTop: -6,
  },
  editReviewPillBtn: {
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  editReviewPillText: {
    fontSize: font.caption,
    fontWeight: "800",
  },
  inlineStarsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: spacing.xs,
  },
  inlineStarBtn: {
    alignItems: "center",
    borderColor: "#CBD5E1",
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  inlineStarBtnActive: {
    backgroundColor: "#FEF3C7",
    borderColor: "#F59E0B",
  },
  inlineStarText: {
    color: "#94A3B8",
    fontSize: font.subtitle,
  },
  inlineStarTextActive: {
    color: "#F59E0B",
  },
  inlineReviewInput: {
    borderRadius: radii.sm,
    borderWidth: 1,
    fontSize: font.label,
    minHeight: 70,
    padding: spacing.sm,
    textAlignVertical: "top",
  },
  inlineEditActions: {
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "flex-end",
    marginTop: spacing.xs,
  },
  inlineActionBtn: {
    borderRadius: radii.sm,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
