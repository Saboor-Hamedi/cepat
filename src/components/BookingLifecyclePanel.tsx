import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Clock, MessageSquare } from "lucide-react-native";
import { Avatar } from "./marketplace-ui";
import { BookingParticipantsHeader } from "./BookingParticipantsHeader";
import { ChatContainer } from "./chat";

import { useAuth } from "../auth/AuthProvider";
import { useAppearance, type ThemePalette } from "../context/AppearanceContext";
import { fixtureTechnicians } from "../data/fixtures";
import { formatRupiah } from "../data/marketplaceRepository";
import {
  customerAcceptWorkDone,
  loadBookingById,
  loadBookingMessages,
  sendBookingMessage,
  submitBookingWorkForAcceptance,
  subscribeToBookings,
  subscribeToBookingMessages,
  submitBookingReview,
  transitionBookingStatus,
  updateBookingReview,
} from "../data/marketplaceStore";
import { useUserAvatar } from "../hooks/useUserAvatar";
import { localizeArea, useLanguage } from "../i18n/locale";
import {
  BOOKING_TIME_SLOTS,
  createUpcomingScheduleDates,
  formatSchedule,
  toIndonesiaDateTime,
} from "../task/schedule";
import { radii, spacing } from "../theme/tokens";
import type { BookingMessage, BookingRecord } from "../types/marketplace";
import { ICON_SIZE, ICON_STROKE } from '../theme/icons';
import { font } from '../theme/typography';

function formatMessageTime(createdAt: string): string {
  if (!createdAt) return "";
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function BookingLifecyclePanel({
  activeBooking,
  messages,
  onBookingChange,
  onMessagesChange,
}: {
  activeBooking: BookingRecord;
  messages: BookingMessage[];
  onBookingChange: (updated: BookingRecord) => void;
  onMessagesChange: Dispatch<SetStateAction<BookingMessage[]>>;
}) {
  const { language, t } = useLanguage();
  const { user, effectiveRole } = useAuth();
  const { palette, reduceMotion } = useAppearance();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [dateOptions] = useState(createUpcomingScheduleDates);
  const isTechnician =
    effectiveRole === "technician" ||
    (Boolean(user) && user?.id === activeBooking.technicianUserId);
  const isCustomer = !isTechnician;

  const [proposedDate, setProposedDate] = useState(dateOptions[0].value);
  const [proposedTime, setProposedTime] = useState(BOOKING_TIME_SLOTS[0]);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [chatInput, setChatInput] = useState<string>("");
  const [chatClientMessageId, setChatClientMessageId] = useState<string | null>(null);
  const [sendingChat, setSendingChat] = useState(false);
  const chatSenderRole: "customer" | "technician" = isTechnician
    ? "technician"
    : "customer";
  const [chatError, setChatError] = useState<string | null>(null);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [isChatMenuOpen, setIsChatMenuOpen] = useState(false);
  const [chatHistoryVisible] = useState(true);
  const [historyCleared, setHistoryCleared] = useState(false);

  const isTaskCompleted = activeBooking.status === "completed";
  const isChatClosed =
    isTaskCompleted ||
    activeBooking.status === "cancelled" ||
    activeBooking.status === "declined";

  const handleClearHistory = () => {
    Alert.alert(
      language === "en" ? "Delete Chat History?" : "Hapus Riwayat Chat?",
      language === "en"
        ? "Are you sure you want to clear this conversation from your screen?"
        : "Apakah Anda yakin ingin menghapus riwayat percakapan ini dari layar Anda?",
      [
        { text: language === "en" ? "Cancel" : "Batal", style: "cancel" },
        {
          text: language === "en" ? "Delete" : "Hapus",
          style: "destructive",
          onPress: () => setHistoryCleared(true),
        },
      ]
    );
  };

  const handleSendPhotoAttachment = async () => {
    if (sendingChat) return;
    setChatError(null);
    setSendingChat(true);
    try {
      const clientMessageId = `${user?.id ?? activeBooking.id}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}`;
      const sent = await sendBookingMessage({
        bookingId: activeBooking.id,
        senderUserId:
          chatSenderRole === "customer"
            ? activeBooking.customerUserId
            : activeBooking.technicianUserId,
        senderRole: chatSenderRole,
        senderName:
          chatSenderRole === "customer"
            ? activeBooking.customerName
            : activeBooking.technicianName,
        body: "📷 [Foto Pekerjaan / Perangkat Dilampirkan]",
        clientMessageId,
      });
      onMessagesChange((current) =>
        current.some((message) => message.id === sent.id)
          ? current
          : [...current, sent],
      );
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "upload_failed");
    } finally {
      setSendingChat(false);
    }
  };

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    const refreshMessages = () => {
      void loadBookingMessages(activeBooking.id)
        .then((loadedMessages) => {
          if (active) onMessagesChange(loadedMessages);
        })
        .catch((error: unknown) => {
          if (active) {
            setChatError(
              error instanceof Error ? error.message : "booking_messages_load_failed",
            );
          }
        });
    };

    refreshMessages();
    void subscribeToBookingMessages(
      activeBooking.id,
      refreshMessages,
      (message) => setChatError(message),
    )
      .then((stop) => {
        if (active) unsubscribe = stop;
        else stop();
      })
      .catch((error: unknown) => {
        if (active) {
          setChatError(
            error instanceof Error ? error.message : "booking_messages_realtime_failed",
          );
        }
      });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [activeBooking.id, onMessagesChange]);

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    const unsubscribe = subscribeToBookings(
      user.id,
      () => {
        void loadBookingById(activeBooking.id)
          .then((booking) => {
            if (active && booking) onBookingChange(booking);
          })
          .catch((error: unknown) => {
            if (active) {
              setStatusError(
                error instanceof Error
                  ? error.message
                  : "booking_refresh_failed",
              );
            }
          });
      },
      (message) => {
        if (active) setStatusError(message);
      },
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, [activeBooking.id, onBookingChange, user?.id]);

  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>("");
  const [reviewSubmitted, setReviewSubmitted] = useState<boolean>(
    Boolean(activeBooking.reviewRating),
  );
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);
  const [prevReviewBookingId, setPrevReviewBookingId] = useState(activeBooking.id);
  if (prevReviewBookingId !== activeBooking.id) {
    setPrevReviewBookingId(activeBooking.id);
    setReviewSubmitted(Boolean(activeBooking.reviewRating));
    setSubmittingReview(false);
  }

  const handleTransition = async (
    nextStatus: BookingRecord["status"],
    actor: "customer" | "technician",
    proposedStartAt?: string,
  ) => {
    setStatusError(null);
    try {
      const updated = await transitionBookingStatus(
        activeBooking.id,
        nextStatus,
        actor,
        {
          proposedStartAt,
        },
      );
      onBookingChange(updated);
      const msgs = await loadBookingMessages(updated.id);
      onMessagesChange(msgs);
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "Transition failed");
    }
  };

  const handleSendMessage = async () => {
    if (sendingChat) return;
    setChatError(null);
    const clientMessageId =
      chatClientMessageId ??
      `${user?.id ?? activeBooking.id}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}`;
    setChatClientMessageId(clientMessageId);
    setSendingChat(true);
    try {
      const sent = await sendBookingMessage({
        bookingId: activeBooking.id,
        senderUserId:
          chatSenderRole === "customer"
            ? activeBooking.customerUserId
            : activeBooking.technicianUserId,
        senderRole: chatSenderRole,
        senderName:
          chatSenderRole === "customer"
            ? activeBooking.customerName
            : activeBooking.technicianName,
        body: chatInput,
        clientMessageId,
      });
      onMessagesChange((current) =>
        current.some((message) => message.id === sent.id)
          ? current
          : [...current, sent],
      );
      setChatInput("");
      setChatClientMessageId(null);
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message === "url_blocked" ||
          err.message === "contact_blocked" ||
          err.message.includes("contact_sharing_blocked"))
      ) {
        setChatError(
          language === "en"
            ? "Sharing phone numbers, WhatsApp, emails, or links is prohibited for security."
            : "Berbagi nomor telepon/WhatsApp, email, atau tautan dilarang demi keamanan bersama.",
        );
      } else {
        setChatError(
          err instanceof Error ? err.message : t("booking.chatLocked"),
        );
      }
    } finally {
      setSendingChat(false);
    }
  };

  const isTechnicianUser =
    effectiveRole === "technician" ||
    (Boolean(user) && (user?.id === activeBooking.technicianUserId || (user?.id === "demo-rizky" && activeBooking.technicianUserId === "demo-rizky")));
  const isCustomerUser =
    !isTechnicianUser &&
    Boolean(user?.id) &&
    user?.id !== activeBooking.technicianUserId &&
    user?.id === activeBooking.customerUserId;
  const hasAlreadyReviewed = reviewSubmitted || Boolean(activeBooking.reviewRating);
  const [isEditingReview, setIsEditingReview] = useState(false);

  const handleSubmitReview = async () => {
    if (!reviewRating || !isCustomerUser || !user?.id || hasAlreadyReviewed || submittingReview) return;
    setSubmittingReview(true);
    try {
      await submitBookingReview({
        bookingId: activeBooking.id,
        technicianId: activeBooking.technicianUserId,
        customerUserId: user.id,
        customerName: activeBooking.customerName,
        rating: reviewRating,
        comment: reviewComment,
      });
      setReviewSubmitted(true);
      onBookingChange({
        ...activeBooking,
        reviewRating,
        reviewComment,
      });
    } catch (err) {
      if (err instanceof Error && err.message === "review_already_submitted") {
        setReviewSubmitted(true);
        onBookingChange({
          ...activeBooking,
          reviewRating: activeBooking.reviewRating ?? reviewRating,
          reviewComment: activeBooking.reviewComment ?? reviewComment,
        });
      }
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleSaveEditedReview = async () => {
    if (!reviewRating || !isCustomerUser || !user?.id || submittingReview) return;
    setSubmittingReview(true);
    try {
      const updated = await updateBookingReview({
        bookingId: activeBooking.id,
        customerUserId: user.id,
        technicianId: activeBooking.technicianUserId,
        rating: reviewRating,
        comment: reviewComment,
      });
      setIsEditingReview(false);
      setReviewSubmitted(true);
      onBookingChange({
        ...activeBooking,
        reviewRating: updated.rating,
        reviewComment: updated.comment,
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  const technicianRecord = fixtureTechnicians.find(
    (t) => t.id === activeBooking.technicianUserId
  );
  const remoteTechAvatar = useUserAvatar(
    activeBooking.technicianUserId,
    activeBooking.technicianName
  );
  const technicianAvatarUri =
    technicianRecord?.avatarUri ||
    remoteTechAvatar ||
    undefined;

  const remoteCustomerAvatar = useUserAvatar(
    activeBooking.customerUserId,
    activeBooking.customerName
  );
  const metadataAvatarUri =
    user?.id === activeBooking.customerUserId &&
    typeof user?.user_metadata?.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : undefined;
  const customerAvatarUri =
    metadataAvatarUri ||
    remoteCustomerAvatar ||
    undefined;

  return (
    <View style={styles.lifecycleWrap} testID="booking-status-view">
      <BookingParticipantsHeader
        customerAvatarUri={customerAvatarUri}
        customerName={activeBooking.customerName}
        serviceName={activeBooking.serviceNameSnapshot}
        statusLabel={t(`booking.status.${activeBooking.status}`)}
        technicianAvatarUri={technicianAvatarUri}
        technicianBusinessName={activeBooking.technicianBusinessName}
        technicianId={activeBooking.technicianUserId}
        technicianName={activeBooking.technicianName}
        technicianRating={technicianRecord?.averageRating}
        technicianReviewCount={technicianRecord?.reviewCount}
      />
      <View style={styles.statusCard}>
        <View style={styles.statusHeaderRow}>
          <View style={{ flex: 1, paddingRight: spacing.sm }}>
            <Text style={styles.statusEyebrow}>{t("booking.statusLabel")}</Text>
            <Text style={styles.statusHeadline} testID="booking-current-status">
              {t(`booking.status.${activeBooking.status}`)}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setIsChatModalOpen(true);
            }}
            style={styles.cardChatBtn}
            testID="open-booking-chat-btn"
          >
            <MessageSquare color="#FFFFFF" size={ICON_SIZE} strokeWidth={ICON_STROKE} style={{ marginRight: 4 }} />
            <Text style={styles.cardChatBtnText}>Chat</Text>
            {messages.length > 0 && (
              <View style={styles.cardChatBadge}>
                <Text style={styles.cardChatBadgeText}>{messages.length}</Text>
              </View>
            )}
          </Pressable>
        </View>
        <View style={styles.bookingMetaBox}>
          <Text style={styles.bookingMetaLine}>
            {activeBooking.serviceNameSnapshot}
            {activeBooking.agreedPrice
              ? ` · ${formatRupiah(activeBooking.agreedPrice, language)}`
              : ""}
          </Text>
          <Text style={styles.bookingMetaSub}>
            {activeBooking.customerAddress} (
            {localizeArea(activeBooking.serviceArea, language)})
          </Text>
          <Text style={styles.bookingMetaSub}>
            {language === "en" ? "Requested:" : "Jadwal diminta:"}{" "}
            {activeBooking.requestedStartAt.slice(0, 16).replace("T", " ")} WIB
          </Text>
          {activeBooking.proposedStartAt && (
            <Text style={styles.proposedScheduleNote}>
              {language === "en"
                ? "Proposed alternative:"
                : "Jadwal alternatif diajukan:"}{" "}
              {activeBooking.proposedStartAt}
            </Text>
          )}
        </View>

        {statusError && <Text style={styles.errorText}>{statusError}</Text>}

        {/* Technician-Only Actions: Customers never see "Accept Request" on their own booking */}
        {isTechnician &&
          (activeBooking.status === "requested" ||
            activeBooking.status === "confirmed" ||
            activeBooking.status === "in_progress" ||
            activeBooking.status === "completed") && (
            <View style={styles.actionGroup}>
              <Text style={styles.actionGroupTitle}>
                {t("booking.technicianActions")}
              </Text>
              {activeBooking.status === "requested" && (
                <>
                  <View style={styles.centeredActionRow}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        void handleTransition("confirmed", "technician");
                      }}
                      style={styles.smallAcceptBtn}
                      testID="tech-accept-booking"
                    >
                      <Text style={styles.smallAcceptBtnText}>
                        {t("booking.acceptRequest")}
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        void handleTransition("declined", "technician");
                      }}
                      style={styles.smallDeclineBtn}
                      testID="tech-decline-booking"
                    >
                      <Text style={styles.smallDeclineBtnText}>
                        {t("booking.declineRequest")}
                      </Text>
                    </Pressable>
                  </View>

                  <View style={styles.schedulePanel}>
                    <View style={styles.scheduleHeaderRow}>
                      <Clock size={ICON_SIZE} strokeWidth={ICON_STROKE} color={palette.primary} />
                      <Text style={styles.scheduleLabel}>
                        {language === "en"
                          ? "Choose an alternative date and time"
                          : "Pilih tanggal dan waktu alternatif"}
                      </Text>
                    </View>

                    <Text style={styles.scheduleSubSectionLabel}>
                      {language === "en" ? "DATE" : "TANGGAL"}
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.scheduleChipsRow}
                    >
                      {dateOptions.map((option) => (
                        <Pressable
                          key={option.value}
                          accessibilityRole="button"
                          accessibilityState={{
                            selected: proposedDate === option.value,
                          }}
                          onPress={() => setProposedDate(option.value)}
                          style={[
                            styles.scheduleChip,
                            proposedDate === option.value &&
                              styles.scheduleChipSelected,
                          ]}
                          testID={`propose-date-${option.value}`}
                        >
                          <Text
                            style={[
                              styles.scheduleChipText,
                              proposedDate === option.value &&
                                styles.scheduleChipTextSelected,
                            ]}
                          >
                            {language === "en"
                              ? option.labelEn
                              : option.labelId}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>

                    <Text style={styles.scheduleSubSectionLabel}>
                      {language === "en" ? "TIME" : "WAKTU"}
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.scheduleChipsRow}
                    >
                      {BOOKING_TIME_SLOTS.map((time) => (
                        <Pressable
                          key={time}
                          accessibilityRole="button"
                          accessibilityState={{ selected: proposedTime === time }}
                          onPress={() => setProposedTime(time)}
                          style={[
                            styles.scheduleChip,
                            proposedTime === time &&
                              styles.scheduleChipSelected,
                          ]}
                          testID={`propose-time-${time}`}
                        >
                          <Text
                            style={[
                              styles.scheduleChipText,
                              proposedTime === time &&
                                styles.scheduleChipTextSelected,
                            ]}
                          >
                            {time} WIB
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>

                    <View style={styles.proposeBtnWrap}>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => {
                          void handleTransition(
                            "alternative_proposed",
                            "technician",
                            toIndonesiaDateTime(proposedDate, proposedTime),
                          );
                        }}
                        style={styles.smallProposeBtn}
                        testID="tech-propose-time"
                      >
                        <Text style={styles.smallProposeBtnText}>
                          {t("booking.proposeTime")}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </>
              )}

              {activeBooking.status === "confirmed" && (
                <View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      void handleTransition("in_progress", "technician");
                    }}
                    style={styles.proposeBtn}
                    testID="tech-start-job"
                  >
                    <Text style={styles.proposeBtnText}>
                      {t("booking.startJob")}
                    </Text>
                  </Pressable>
                </View>
              )}

              {(activeBooking.status === "in_progress" ||
                activeBooking.status === "completed") && (
                <View>
                  {!activeBooking.workCompletedAt ? (
                    <View
                      style={styles.awaitingNoticeCard}
                      testID="tech-work-in-progress"
                    >
                      <Text style={styles.awaitingNoticeText}>
                        {language === "en"
                          ? "When the job is finished, send it to the customer for confirmation."
                          : "Jika pekerjaan sudah selesai, kirimkan ke pelanggan untuk dikonfirmasi."}
                      </Text>
                    </View>
                  ) : (
                    <View
                      style={styles.awaitingNoticeCard}
                      testID="tech-waiting-customer-approval"
                    >
                      <Text style={styles.awaitingNoticeText}>
                        {language === "en"
                          ? "Sent to the customer. Waiting for them to confirm the work is complete."
                          : "Terkirim ke pelanggan. Menunggu konfirmasi bahwa pekerjaan telah selesai."}
                      </Text>
                    </View>
                  )}
                  {!activeBooking.workCompletedAt && (
                    <Pressable
                      accessibilityRole="button"
                      onPress={async () => {
                        setStatusError(null);
                        try {
                          const updated =
                            await submitBookingWorkForAcceptance(
                              activeBooking.id,
                            );
                          onBookingChange(updated);
                        } catch (error) {
                          setStatusError(
                            error instanceof Error
                              ? error.message
                              : "booking_work_submit_failed",
                          );
                        }
                      }}
                      style={styles.acceptBtn}
                      testID="tech-complete-job"
                    >
                      <Text style={styles.acceptBtnText}>
                        {language === "en"
                          ? "Job finished — send for confirmation"
                          : "Pekerjaan selesai — kirim untuk konfirmasi"}
                      </Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          )}

        {/* Customer Actions & Pending State */}
        {isCustomer &&
          (activeBooking.status === "requested" ||
            activeBooking.status === "alternative_proposed" ||
            activeBooking.status === "confirmed" ||
            activeBooking.status === "in_progress" ||
            activeBooking.status === "completed") && (
            <View style={styles.actionGroup}>
              {(activeBooking.status === "in_progress" ||
                activeBooking.status === "completed") && (
                <View
                  style={styles.customerNoticeCard}
                  testID="customer-work-done-card"
                >
                  <Text style={styles.customerNoticeTitle}>
                    {activeBooking.status === "completed"
                      ? language === "en"
                        ? "✓ Work Approved"
                        : "✓ Pekerjaan Telah Disetujui"
                      : activeBooking.workCompletedAt
                        ? language === "en"
                          ? "The technician marked the job complete"
                          : "Teknisi menandai pekerjaan selesai"
                        : language === "en"
                          ? "Work in progress"
                          : "Pekerjaan sedang berlangsung"}
                  </Text>
                  <Text style={styles.customerNoticeBody}>
                    {activeBooking.status === "completed"
                      ? language === "en"
                        ? "You confirmed the work is complete."
                        : "Anda telah mengonfirmasi pekerjaan selesai."
                      : activeBooking.workCompletedAt
                        ? language === "en"
                          ? "Review the work, then confirm below to complete this booking."
                          : "Periksa pekerjaan, lalu konfirmasi di bawah untuk menyelesaikan pesanan."
                        : language === "en"
                          ? "The technician is still working. You can confirm completion here once they send the job for your approval."
                          : "Teknisi masih bekerja. Anda dapat mengonfirmasi di sini setelah teknisi mengirim pekerjaan untuk disetujui."}
                  </Text>
                  {activeBooking.workCompletedAt &&
                    activeBooking.status !== "completed" && (
                    <Pressable
                      accessibilityRole="button"
                      onPress={async () => {
                        setStatusError(null);
                        try {
                          const updated = await customerAcceptWorkDone(
                            activeBooking.id,
                          );
                          onBookingChange(updated);
                        } catch (err) {
                          setStatusError(
                            err instanceof Error ? err.message : "failed",
                          );
                        }
                      }}
                      style={styles.acceptBtn}
                      testID="customer-accept-work-done"
                    >
                      <Text style={styles.acceptBtnText}>
                        {language === "en"
                          ? "Confirm work is complete"
                          : "Konfirmasi pekerjaan selesai"}
                      </Text>
                    </Pressable>
                  )}
                </View>
              )}
              {activeBooking.status === "requested" && (
                <View
                  style={styles.customerNoticeCard}
                  testID="customer-pending-view"
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <Clock color={palette.text} size={ICON_SIZE} strokeWidth={ICON_STROKE} />
                    <Text style={styles.customerNoticeTitle}>
                      {language === "en"
                        ? "Waiting for Technician Confirmation"
                        : "Menunggu Konfirmasi Teknisi"}
                    </Text>
                  </View>
                  <Text style={styles.customerNoticeBody}>
                    {language === "en"
                      ? "Your booking request has been sent. The technician will review your schedule shortly. You can chat below."
                      : "Permintaan pesanan Anda telah dikirimkan. Teknisi akan segera mengonfirmasi jadwal. Anda dapat berdiskusi melalui chat di bawah."}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      void handleTransition("cancelled", "customer");
                    }}
                    style={styles.cancelBtn}
                    testID="customer-cancel-booking"
                  >
                    <Text style={styles.cancelBtnText}>
                      {t("booking.cancelBooking")}
                    </Text>
                  </Pressable>
                </View>
              )}

              {activeBooking.status === "alternative_proposed" && (
                <View style={styles.customerNoticeCard}>
                  <Text style={styles.customerNoticeTitle}>
                    {language === "en"
                      ? "Proposed Alternative Schedule"
                      : "Jadwal Alternatif Diajukan"}
                  </Text>
                  <Text style={styles.customerNoticeBody}>
                    {activeBooking.proposedStartAt}
                  </Text>
                  <View style={styles.centeredActionRow}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        void handleTransition("confirmed", "customer");
                      }}
                      style={styles.smallAcceptBtn}
                      testID="customer-accept-alternative"
                    >
                      <Text style={styles.smallAcceptBtnText}>
                        {t("booking.acceptAlternative")}
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        void handleTransition("cancelled", "customer");
                      }}
                      style={styles.smallDeclineBtn}
                      testID="customer-cancel-booking"
                    >
                      <Text style={styles.smallDeclineBtnText}>
                        {t("booking.cancelBooking")}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {activeBooking.status === "confirmed" && (
                <View style={styles.customerConfirmedCard}>
                  <Text style={styles.customerConfirmedTitle}>
                    {language === "en"
                      ? "✓ Booking Confirmed"
                      : "✓ Pesanan Dikonfirmasi"}
                  </Text>
                  <Text style={styles.customerConfirmedBody}>
                    {language === "en"
                      ? "Technician has accepted your booking and will arrive at the scheduled time."
                      : "Teknisi telah menerima pesanan dan akan hadir sesuai jadwal yang disepakati."}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      void handleTransition("cancelled", "customer");
                    }}
                    style={styles.cancelBtn}
                    testID="customer-cancel-booking"
                  >
                    <Text style={styles.cancelBtnText}>
                      {t("booking.cancelBooking")}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}
      </View>

      {/* Standalone Robust Facebook-style Chat Component Modal */}
      <Modal
        animationType={reduceMotion ? "none" : "slide"}
        onRequestClose={() => setIsChatModalOpen(false)}
        transparent={false}
        visible={isChatModalOpen}
      >
        <ChatContainer
          bookingId={activeBooking.id}
          initialBooking={activeBooking}
          onClose={() => setIsChatModalOpen(false)}
        />
      </Modal>

      {/* Post-completion Feedback & Review - Visible When Completed */}
      {activeBooking.status === "completed" && (
        <View
          style={[
            styles.reviewFormCard,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
          testID="booking-review-section"
        >
          <View style={styles.reviewHeaderRow}>
            <Text style={[styles.reviewHeaderTitle, { color: palette.text }]}>
              {language === "en" ? "Service Feedback & Review" : "Ulasan & Feedback Layanan"}
            </Text>
            <Text style={[styles.reviewHeaderSubtitle, { color: palette.textMuted }]}>
              {isCustomer
                ? language === "en"
                  ? "Help others by sharing your feedback"
                  : "Bantu pengguna lain dengan membagikan ulasan Anda"
                : language === "en"
                  ? "Customer review and rating for this completed service"
                  : "Ulasan dan rating dari pelanggan untuk layanan yang selesai"}
            </Text>
          </View>
          {hasAlreadyReviewed && !isEditingReview ? (
            <View style={styles.reviewSubmittedBox}>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Text
                    key={star}
                    style={{
                      fontSize: font.section,
                      color:
                        (activeBooking.reviewRating ?? reviewRating) >= star
                          ? "#F59E0B"
                          : palette.border,
                    }}
                  >
                    ★
                  </Text>
                ))}
              </View>
              {(activeBooking.reviewComment || reviewComment) ? (
                <Text style={{ color: palette.text, fontSize: font.label, marginTop: 4 }}>
                  &quot;{activeBooking.reviewComment || reviewComment}&quot;
                </Text>
              ) : null}
              <View
                style={{
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginTop: 8,
                }}
              >
                <Text
                  style={[styles.reviewDoneText, { color: palette.primary }]}
                  testID="booking-review-submitted"
                >
                  {t("booking.reviewSubmitted")}
                </Text>
                {isCustomerUser ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setReviewRating(activeBooking.reviewRating ?? reviewRating ?? 5);
                      setReviewComment(activeBooking.reviewComment ?? reviewComment ?? "");
                      setIsEditingReview(true);
                    }}
                    style={[
                      styles.smallAcceptBtn,
                      {
                        backgroundColor: palette.primarySoft,
                        borderColor: palette.primary,
                        borderWidth: 1,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                      },
                    ]}
                    testID="edit-booking-review-btn"
                  >
                    <Text style={{ color: palette.primary, fontSize: font.caption, fontWeight: "800" }}>
                      {language === "en" ? "Edit Feedback" : "Edit Ulasan"}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ) : isCustomerUser ? (
            <>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Pressable
                    key={star}
                    accessibilityRole="button"
                    onPress={() => setReviewRating(star)}
                    style={[
                      styles.starBtn,
                      reviewRating >= star && styles.starBtnActive,
                    ]}
                    testID={`review-star-${star}`}
                  >
                    <Text
                      style={[
                        styles.starBtnText,
                        reviewRating >= star && styles.starBtnTextActive,
                      ]}
                    >
                      ★
                    </Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                multiline
                onChangeText={setReviewComment}
                placeholder={t("booking.reviewPlaceholder")}
                placeholderTextColor={palette.textMuted}
                style={[
                  styles.input,
                  styles.notesArea,
                  {
                    backgroundColor: palette.surfaceElevated,
                    borderColor: palette.border,
                    color: palette.text,
                  },
                ]}
                testID="booking-review-input"
                value={reviewComment}
              />
              {isEditingReview ? (
                <View style={styles.centeredActionRow}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={submittingReview}
                    onPress={() => {
                      setIsEditingReview(false);
                      setReviewRating(activeBooking.reviewRating ?? 5);
                      setReviewComment(activeBooking.reviewComment ?? "");
                    }}
                    style={styles.smallDeclineBtn}
                    testID="cancel-edit-review-btn"
                  >
                    <Text style={styles.smallDeclineBtnText}>
                      {language === "en" ? "Cancel" : "Batal"}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: submittingReview }}
                    disabled={submittingReview}
                    onPress={() => {
                      void handleSaveEditedReview();
                    }}
                    style={[
                      styles.smallAcceptBtn,
                      { backgroundColor: palette.primary },
                      submittingReview && { opacity: 0.6 },
                    ]}
                    testID="save-edited-review-btn"
                  >
                    <Text style={styles.smallAcceptBtnText}>
                      {submittingReview
                        ? language === "en"
                          ? "Saving..."
                          : "Menyimpan..."
                        : language === "en"
                          ? "Save Feedback"
                          : "Simpan Ulasan"}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: submittingReview }}
                  disabled={submittingReview}
                  onPress={() => {
                    void handleSubmitReview();
                  }}
                  style={[
                    styles.acceptBtn,
                    { backgroundColor: palette.primary },
                    submittingReview && { opacity: 0.6 },
                  ]}
                  testID="submit-booking-review"
                >
                  <Text style={styles.acceptBtnText}>
                    {submittingReview
                      ? language === "en"
                        ? "Submitting..."
                        : "Mengirim..."
                      : t("booking.submitReview")}
                  </Text>
                </Pressable>
              )}
            </>
          ) : (
            <Text style={{ color: palette.textMuted, fontSize: font.label}}>
              {language === "en"
                ? "Waiting for customer to submit feedback."
                : "Menunggu pelanggan memberikan ulasan."}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
  lifecycleWrap: { gap: spacing.md, marginTop: spacing.sm, width: "100%" },
  statusCard: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 5,
    borderWidth: 1,
    padding: spacing.md,
    width: "100%",
  },
  statusHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  cardChatBtn: {
    alignItems: "center",
    backgroundColor: palette.primary,
    borderRadius: 5,
    flexDirection: "row",
    justifyContent: "center",
    minHeight: 30,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  cardChatBtnText: {
    color: "#FFFFFF",
    fontSize: font.body,
    fontWeight: "800",
  },
  cardChatBadge: {
    backgroundColor: "#FFFFFF",
    borderRadius: 9999,
    marginLeft: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  cardChatBadgeText: {
    color: palette.primary,
    fontSize: font.caption,
    fontWeight: "900",
  },
  statusEyebrow: {
    color: palette.primary,
    fontSize: font.caption,
    fontWeight: "800",
    letterSpacing: 1,
  },
  statusHeadline: {
    color: palette.text,
    fontSize: font.heading,
    fontWeight: "800",
    marginTop: 2,
  },
  bookingMetaBox: {
    backgroundColor: palette.surfaceElevated,
    borderRadius: 5,
    marginTop: spacing.sm,
    padding: spacing.md,
  },
  bookingMetaLine: { color: palette.text, fontSize: font.label, fontWeight: "700" },
  bookingMetaSub: { color: palette.textMuted, fontSize: font.body, marginTop: 3 },
  proposedScheduleNote: {
    color: palette.primary,
    fontSize: font.body,
    fontWeight: "700",
    marginTop: 6,
  },
  centeredActionRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginVertical: 10,
  },
  smallAcceptBtn: {
    alignItems: "center",
    backgroundColor: palette.primary,
    borderRadius: 5,
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: 18,
    paddingVertical: 6,
  },
  smallAcceptBtnText: {
    color: "#FFFFFF",
    fontSize: font.body,
    fontWeight: "800",
  },
  smallDeclineBtn: {
    alignItems: "center",
    backgroundColor: palette.surfaceElevated,
    borderColor: palette.danger,
    borderRadius: 5,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: 18,
    paddingVertical: 6,
  },
  smallDeclineBtnText: {
    color: palette.danger,
    fontSize: font.body,
    fontWeight: "800",
  },
  stepTitle: {
    color: palette.text,
    fontSize: font.title,
    fontWeight: "800",
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  chip: {
    backgroundColor: palette.inputBg,
    borderColor: palette.border,
    borderRadius: 5,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  chipSelected: {
    backgroundColor: palette.primarySoft,
    borderColor: palette.primary,
  },
  chipText: { color: palette.textMuted, fontSize: font.caption, fontWeight: "700" },
  chipTextSelected: { color: palette.primary, fontWeight: "800" },
  input: {
    backgroundColor: palette.inputBg,
    borderColor: palette.border,
    borderRadius: 5,
    borderWidth: 1,
    color: palette.text,
    fontSize: font.label,
    marginBottom: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  notesArea: { minHeight: 74, textAlignVertical: "top" },
  errorText: {
    color: palette.danger,
    fontSize: font.body,
    fontWeight: "600",
    marginVertical: spacing.xs,
  },
  actionGroup: {
    borderTopColor: palette.border,
    borderTopWidth: 1,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
  },
  actionGroupTitle: {
    color: palette.textMuted,
    fontSize: font.caption,
    fontWeight: "800",
    letterSpacing: 0.7,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
  },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  acceptBtn: {
    alignItems: "center",
    backgroundColor: palette.primary,
    borderRadius: 5,
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
  },
  acceptBtnText: { color: "#FFFFFF", fontSize: font.label, fontWeight: "800" },
  declineBtn: {
    alignItems: "center",
    backgroundColor: palette.surfaceElevated,
    borderColor: palette.danger,
    borderRadius: 5,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
  },
  declineBtnText: { color: palette.danger, fontSize: font.label, fontWeight: "800" },
  proposeBtn: {
    alignItems: "center",
    backgroundColor: palette.primarySoft,
    borderColor: palette.primary,
    borderRadius: 5,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: spacing.md,
  },
  proposeBtnText: { color: palette.primary, fontSize: font.body, fontWeight: "800" },
  schedulePanel: {
    backgroundColor: palette.surfaceElevated,
    borderColor: palette.border,
    borderRadius: 5,
    borderWidth: 1,
    gap: spacing.xs,
    marginTop: spacing.sm,
    padding: spacing.sm + 2,
  },
  scheduleHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginBottom: 4,
  },
  scheduleLabel: {
    color: palette.text,
    fontSize: font.body,
    fontWeight: "800",
  },
  scheduleSubSectionLabel: {
    color: palette.textMuted,
    fontSize: font.caption,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginTop: 6,
    marginBottom: 4,
  },
  scheduleChipsRow: {
    flexDirection: "row",
    gap: 6,
    paddingVertical: 2,
  },
  scheduleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  scheduleChip: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 5,
    borderWidth: 1,
    minHeight: 30,
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  scheduleChipSelected: {
    backgroundColor: palette.primarySoft,
    borderColor: palette.primary,
  },
  scheduleChipText: {
    color: palette.text,
    fontSize: font.caption,
    fontWeight: "700",
  },
  scheduleChipTextSelected: {
    color: palette.primary,
    fontWeight: "800",
  },
  proposeBtnWrap: {
    alignItems: "center",
    marginTop: 8,
  },
  smallProposeBtn: {
    alignItems: "center",
    backgroundColor: palette.primarySoft,
    borderColor: palette.primary,
    borderRadius: 5,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 32,
    paddingHorizontal: 18,
    paddingVertical: 6,
  },
  smallProposeBtnText: {
    color: palette.primary,
    fontSize: font.body,
    fontWeight: "800",
  },
  customerNoticeCard: {
    backgroundColor: palette.surfaceElevated,
    borderColor: palette.border,
    borderRadius: 5,
    borderWidth: 1,
    padding: spacing.md,
  },
  customerConfirmedCard: {
    backgroundColor: palette.primarySoft,
    borderColor: palette.border,
    borderRadius: 5,
    borderWidth: 1,
    padding: spacing.md,
  },
  chatHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  chatHeaderControls: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  historyControlBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  historyControlText: {
    fontSize: font.caption,
    fontWeight: '700',
  },
  pinnedBookingCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  pinnedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  pinnedTitle: {
    fontSize: font.subtitle,
    fontWeight: '800',
    flex: 1,
    marginRight: spacing.xs,
  },
  pinnedBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  pinnedBadgeText: {
    fontSize: font.caption,
    fontWeight: '700',
  },
  pinnedMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pinnedPrice: {
    fontSize: font.label,
    fontWeight: '800',
  },
  pinnedMetaText: {
    fontSize: font.body,
  },
  chatClosedBanner: {
    borderRadius: radii.sm,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  chatClosedText: {
    fontSize: font.body,
    fontWeight: '600',
    lineHeight: 17,
  },
  historyClearedBox: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  historyClearedText: {
    fontSize: font.body,
    fontStyle: 'italic',
  },
  undoClearBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  undoClearText: {
    fontSize: font.body,
    fontWeight: '700',
  },
  messageRow: {
    marginBottom: spacing.sm,
    width: '100%',
  },
  myMessageRow: {
    alignItems: 'flex-end',
  },
  theirMessageRow: {
    alignItems: 'flex-start',
  },
  myBubble: {
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: 2,
    borderBottomLeftRadius: radii.md,
    borderBottomRightRadius: radii.md,
    maxWidth: '82%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  theirBubble: {
    borderTopLeftRadius: 2,
    borderTopRightRadius: radii.md,
    borderBottomLeftRadius: radii.md,
    borderBottomRightRadius: radii.md,
    maxWidth: '82%',
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  messageTime: {
    fontSize: font.caption,
    marginTop: 4,
    textAlign: 'right',
  },
  chatAttachBtn: {
    alignItems: 'center',
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  chatTriggerCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginTop: spacing.md,
    gap: spacing.md,
  },
  chatTriggerPartnerInfo: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  chatTriggerCopy: {
    flex: 1,
  },
  chatTriggerPartnerName: {
    fontSize: font.heading,
    fontWeight: '800',
  },
  chatTriggerSubtitle: {
    fontSize: font.body,
    marginTop: 2,
  },
  chatTriggerBtn: {
    alignItems: 'center',
    borderRadius: radii.md,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  chatTriggerBtnIcon: {
    fontSize: font.heading,
  },
  chatTriggerBtnText: {
    color: '#FFFFFF',
    fontSize: font.subtitle,
    fontWeight: '800',
  },
  chatTriggerBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  chatTriggerBadgeText: {
    color: '#FFFFFF',
    fontSize: font.caption,
    fontWeight: '800',
  },
  reviewHeaderRow: {
    gap: 4,
    marginBottom: spacing.xs,
  },
  reviewHeaderTitle: {
    fontSize: font.heading,
    fontWeight: '800',
  },
  reviewHeaderSubtitle: {
    fontSize: font.body,
    lineHeight: 17,
  },
  reviewSubmittedBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  chatEntryCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.xl,
    gap: spacing.md,
  },
  chatEntryCopy: {
    gap: 4,
  },
  chatEntryTitle: {
    fontSize: font.heading,
    fontWeight: '800',
  },
  chatEntrySubtitle: {
    fontSize: font.body,
    lineHeight: 17,
  },
  openChatMainBtn: {
    alignItems: 'center',
    borderRadius: radii.md,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  messengerContainerCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  messengerHeader: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  messengerPartnerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    flex: 1,
  },
  avatarWithStatus: {
    position: 'relative',
  },
  activeOnlineDot: {
    backgroundColor: '#10B981',
    borderColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 2,
    bottom: 0,
    height: 12,
    position: 'absolute',
    right: 0,
    width: 12,
  },
  messengerPartnerText: {
    flex: 1,
  },
  messengerPartnerName: {
    fontSize: font.title,
    fontWeight: '800',
  },
  messengerPartnerStatus: {
    fontSize: font.caption,
    fontWeight: '600',
    marginTop: 1,
  },
  dropdownAnchor: {
    position: 'relative',
    zIndex: 100,
  },
  menuDotsBtn: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  menuDotsText: {
    fontSize: font.heading,
    fontWeight: '900',
    letterSpacing: -1,
  },
  chatDropdownMenu: {
    borderRadius: radii.md,
    borderWidth: 1,
    elevation: 5,
    minWidth: 180,
    padding: spacing.xs,
    position: 'absolute',
    right: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    top: 40,
    zIndex: 200,
  },
  dropdownMenuItem: {
    alignItems: 'center',
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  dropdownMenuText: {
    fontSize: font.label,
    fontWeight: '700',
  },
  messengerScrollView: {
    maxHeight: 380,
    minHeight: 180,
  },
  messengerMessagesList: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  messagePartnerAvatarWrap: {
    marginRight: spacing.xs,
    alignSelf: 'flex-end',
  },
  messengerInputRow: {
    alignItems: 'center',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  messengerInputField: {
    borderRadius: 5,
    flex: 1,
    marginBottom: 0,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  messengerSendBtn: {
    alignItems: 'center',
    borderRadius: 5,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  messengerSendBtnIcon: {
    color: '#FFFFFF',
    fontSize: font.heading,
    fontWeight: '800',
    marginLeft: 2,
  },
  openChatMainBtnIcon: {
    fontSize: font.heading,
  },
  openChatMainBtnText: {
    color: '#FFFFFF',
    fontSize: font.subtitle,
    fontWeight: '800',
  },
  chatCountPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  chatCountPillText: {
    color: '#FFFFFF',
    fontSize: font.caption,
    fontWeight: '800',
  },
  chatModalSafeArea: {
    flex: 1,
  },
  chatModalHeader: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  chatModalPartnerInfo: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  chatModalPartnerName: {
    fontSize: font.title,
    fontWeight: '800',
  },
  chatModalPartnerRole: {
    fontSize: font.caption,
    fontWeight: '700',
    marginTop: 1,
  },
  closeChatModalBtn: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  closeChatModalText: {
    fontSize: font.heading,
    fontWeight: '700',
  },
  modalPinnedCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.md,
  },
  modalSecurityBanner: {
    borderRadius: radii.sm,
    borderWidth: 1,
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  modalSecurityText: {
    fontSize: font.caption,
    fontWeight: '600',
    lineHeight: 15,
  },
  modalMessagesList: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  modalChatInputRow: {
    alignItems: 'center',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  emptyMessagesBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyMessagesTitle: {
    fontSize: font.heading,
    fontWeight: '800',
  },
  emptyMessagesSubtitle: {
    fontSize: font.body,
    marginTop: 4,
    textAlign: 'center',
  },
  chatCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.xl,
  },
  chatLockedNote: { color: palette.textMuted, fontSize: font.label, lineHeight: 19 },
  senderSwitchRow: {
    flexDirection: "row",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  messageList: { gap: spacing.xs, marginBottom: spacing.md },
  messageBubble: {
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  messageBubbleCustomer: { backgroundColor: palette.primarySoft },
  messageBubbleTechnician: { backgroundColor: palette.surfaceElevated },
  messageSender: { color: palette.primary, fontSize: font.caption, fontWeight: "800" },
  messageBody: {
    color: palette.text,
    fontSize: font.label,
    lineHeight: 19,
    marginTop: 2,
  },
  chatInputRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  chatInputField: { flex: 1, marginBottom: 0 },
  chatSendBtn: {
    alignItems: "center",
    backgroundColor: palette.primary,
    borderRadius: radii.sm,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.lg,
  },
  chatSendBtnText: { color: "#FFFFFF", fontSize: font.label, fontWeight: "800" },
  reviewFormCard: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.xl,
  },
  starsRow: { flexDirection: "row", gap: spacing.xs, marginBottom: spacing.sm },
  starBtn: {
    backgroundColor: palette.surfaceElevated,
    borderColor: palette.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 44,
    width: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  starBtnActive: {
    backgroundColor: palette.background === "#18191A" ? "rgba(245, 158, 11, 0.15)" : "#FEF3C7",
    borderColor: "#F59E0B",
  },
  starBtnText: {
    color: palette.textMuted,
    fontSize: font.section,
    fontWeight: "800",
  },
  starBtnTextActive: {
    color: "#F59E0B",
  },
  reviewDoneText: { color: palette.primary, fontSize: font.label, fontWeight: "700" },
  customerNoticeTitle: { color: palette.text, fontSize: font.subtitle, fontWeight: "800" },
  customerNoticeBody: {
    color: palette.textMuted,
    fontSize: font.body,
    lineHeight: 18,
    marginTop: 4,
  },
  customerConfirmedTitle: {
    color: palette.primary,
    fontSize: font.subtitle,
    fontWeight: "800",
  },
  customerConfirmedBody: {
    color: palette.text,
    fontSize: font.body,
    lineHeight: 18,
    marginTop: 4,
  },
  cancelBtn: {
    alignItems: "center",
    borderColor: palette.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    justifyContent: "center",
    marginTop: spacing.md,
    minHeight: 38,
    paddingHorizontal: spacing.md,
  },
  cancelBtnText: { color: palette.textMuted, fontSize: font.body, fontWeight: "700" },
  chatSecurityBanner: {
    backgroundColor: palette.surfaceElevated,
    borderColor: palette.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chatSecurityText: {
    color: palette.textMuted,
    fontSize: font.caption,
    lineHeight: 16,
    fontWeight: "600",
  },
  awaitingNoticeCard: {
    backgroundColor: palette.surfaceElevated,
    borderColor: palette.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  awaitingNoticeText: {
    color: palette.textMuted,
    fontSize: font.body,
    lineHeight: 18,
    fontWeight: "600",
  },
  approvedNoticeCard: {
    backgroundColor: palette.primarySoft,
    borderColor: palette.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  approvedNoticeText: {
    color: palette.primary,
    fontSize: font.body,
    lineHeight: 18,
    fontWeight: "700",
  },
  disabledBtn: { opacity: 0.5 },
  });
}
