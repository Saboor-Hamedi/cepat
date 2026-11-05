import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AppNavigationBar,
  EmptyState,
  LoadingState,
  TechnicianCard,
} from "../components/marketplace-ui";
import { BackHeader } from "../components/BackHeader";
import {
  BookingCard,
  BookingsEmptyState,
  HubSwitcher,
  StatusFilterPills,
} from "../bookings";
import { useAppearance } from "../context/AppearanceContext";
import { loadTechnicians } from "../data/marketplaceRepository";
import {
  isChatEnabledForStatus,
  loadBookings,
  loadSavedTechnicianIds,
  loadSubmittedReports,
  loadSubmittedReviews,
  subscribeToBookings,
  transitionBookingStatus,
} from "../data/marketplaceStore";
import { localizeArea, useLanguage } from "../i18n/locale";
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

export default function CustomerBookingsScreen() {
  const { language, t } = useLanguage();
  const { palette } = useAppearance();
  const { user, roles, effectiveRole } = useAuth();
  const isTechnicianAccount = Boolean(
    user &&
      ((effectiveRole === "technician" || roles.includes("technician")) ||
        (effectiveRole === "admin" || roles.includes("admin"))),
  );
  const [hub, setHub] = useState<"bookings" | "tasks">("bookings");
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
    return () => {
      active = false;
      unsubscribe();
    };
  }, [reloadBookingsKey, user?.id]);

  const currentBookings = useMemo(
    () =>
      bookings.filter((b) =>
        [
          "requested",
          "alternative_proposed",
          "confirmed",
          "in_progress",
        ].includes(b.status),
      ),
    [bookings],
  );

  const historyBookings = useMemo(
    () =>
      bookings.filter((b) =>
        ["completed", "cancelled", "declined"].includes(b.status),
      ),
    [bookings],
  );

  const activeChatBookings = useMemo(
    () => bookings.filter((b) => isChatEnabledForStatus(b.status)),
    [bookings],
  );

  const uniqueReviews = useMemo(() => {
    const seen = new Set<string>();
    return reviews.filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
  }, [reviews]);

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

  const showTasks = isTechnicianAccount && hub === "tasks";

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.background }]}
      edges={["top", "bottom"]}
    >
      <ScrollView
        style={styles.screenContent}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.container}>
          {/* Top app header: back chevron + screen title */}
          <BackHeader
            title={t("dashboard.customerTitle")}
            backBtnTestID="customer-bookings-back-btn"
            testID="customer-bookings-header"
          />

          {/* Hidden semantic tag to preserve test compatibility */}
          <Text style={styles.srOnly} testID="bookings-heading">
            {t("dashboard.customerTitle")}
          </Text>

          {isTechnicianAccount && (
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

          {showTasks ? (
            <TaskContainer
              bookings={allBookings}
              loading={loading}
              onBookingAction={handleTechBookingAction}
              showHeader={false}
            />
          ) : null}

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
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  technicianAvatarUri={
                    technicianById.get(booking.technicianUserId)?.avatarUri
                  }
                  technicianVerified={
                    technicianById.get(booking.technicianUserId)?.verified
                  }
                />
              ))
            ) : (
              <BookingsEmptyState />
            )
          ) : tab === "history" ? (
            historyBookings.length > 0 ? (
              historyBookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  technicianAvatarUri={
                    technicianById.get(booking.technicianUserId)?.avatarUri
                  }
                  technicianVerified={
                    technicianById.get(booking.technicianUserId)?.verified
                  }
                />
              ))
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
                <Pressable
                  key={booking.id}
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
                  {uniqueReviews.map((rev) => (
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
                      <Text style={[styles.cardTitle, { color: palette.text }]}>
                        ★ {rev.rating.toFixed(1)}
                      </Text>
                      <Text
                        style={[styles.cardSub, { color: palette.textMuted }]}
                      >
                        {rev.comment}
                      </Text>
                    </View>
                  ))}
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
});
