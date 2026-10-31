import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useAuth } from "../auth/AuthProvider";
import { useAppearance } from "../context/AppearanceContext";
import { formatRupiah } from "../data/marketplaceRepository";
import {
  customerAcceptWorkDone,
  isChatEnabledForStatus,
  loadBookingMessages,
  sendBookingMessage,
  submitBookingReview,
  transitionBookingStatus,
} from "../data/marketplaceStore";
import { localizeArea, useLanguage } from "../i18n/locale";
import { colors, radii, spacing } from "../theme/tokens";
import type { BookingMessage, BookingRecord } from "../types/marketplace";

export function BookingLifecyclePanel({
  activeBooking,
  messages,
  onBookingChange,
  onMessagesChange,
}: {
  activeBooking: BookingRecord;
  messages: BookingMessage[];
  onBookingChange: (updated: BookingRecord) => void;
  onMessagesChange: (messages: BookingMessage[]) => void;
}) {
  const { language, t } = useLanguage();
  const { user, effectiveRole } = useAuth();
  const { palette } = useAppearance();
  const isTechnician =
    effectiveRole === "technician" ||
    (Boolean(user) && user?.id === activeBooking.technicianUserId);
  const isCustomer = !isTechnician;

  const [proposedTimeInput, setProposedTimeInput] = useState<string>(
    "2026-11-03 14:00 WIB",
  );
  const [statusError, setStatusError] = useState<string | null>(null);

  const [chatInput, setChatInput] = useState<string>("");
  const chatSenderRole: "customer" | "technician" = isTechnician
    ? "technician"
    : "customer";
  const [chatError, setChatError] = useState<string | null>(null);

  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>("");
  const [reviewSubmitted, setReviewSubmitted] = useState<boolean>(
    Boolean(activeBooking.reviewRating),
  );

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
    setChatError(null);
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
      });
      onMessagesChange([...messages, sent]);
      setChatInput("");
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message === "url_blocked" || err.message === "contact_blocked")
      ) {
        setChatError(
          language === "en"
            ? "Sharing phone numbers, WhatsApp, emails, or links is prohibited for security."
            : "Berbagi nomor telepon/WhatsApp, email, atau tautan dilarang demi keamanan bersama.",
        );
      } else {
        setChatError(t("booking.chatLocked"));
      }
    }
  };

  const handleSubmitReview = async () => {
    try {
      await submitBookingReview({
        bookingId: activeBooking.id,
        technicianId: activeBooking.technicianUserId,
        customerName: activeBooking.customerName,
        rating: reviewRating,
        comment: reviewComment,
      });
      setReviewSubmitted(true);
    } catch {
      // Ignore duplicate or invalid review error
    }
  };

  return (
    <View style={styles.lifecycleWrap} testID="booking-status-view">
      <View style={styles.statusCard}>
        <Text style={styles.statusEyebrow}>{t("booking.statusLabel")}</Text>
        <Text style={styles.statusHeadline} testID="booking-current-status">
          {t(`booking.status.${activeBooking.status}`)}
        </Text>
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
            activeBooking.status === "in_progress") && (
            <View style={styles.actionGroup}>
              <Text style={styles.actionGroupTitle}>
                {t("booking.technicianActions")}
              </Text>
              {activeBooking.status === "requested" && (
                <>
                  <View style={styles.actionRow}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        void handleTransition("confirmed", "technician");
                      }}
                      style={styles.acceptBtn}
                      testID="tech-accept-booking"
                    >
                      <Text style={styles.acceptBtnText}>
                        {t("booking.acceptRequest")}
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        void handleTransition("declined", "technician");
                      }}
                      style={styles.declineBtn}
                      testID="tech-decline-booking"
                    >
                      <Text style={styles.declineBtnText}>
                        {t("booking.declineRequest")}
                      </Text>
                    </Pressable>
                  </View>

                  <View style={styles.proposeRow}>
                    <TextInput
                      onChangeText={setProposedTimeInput}
                      placeholder="YYYY-MM-DD HH:mm WIB"
                      style={[styles.input, styles.proposeInput]}
                      testID="propose-time-input"
                      value={proposedTimeInput}
                    />
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        void handleTransition(
                          "alternative_proposed",
                          "technician",
                          proposedTimeInput,
                        );
                      }}
                      style={styles.proposeBtn}
                      testID="tech-propose-time"
                    >
                      <Text style={styles.proposeBtnText}>
                        {t("booking.proposeTime")}
                      </Text>
                    </Pressable>
                  </View>
                </>
              )}

              {activeBooking.status === "confirmed" && (
                <View style={styles.actionRow}>
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
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      void handleTransition("completed", "technician");
                    }}
                    style={styles.acceptBtn}
                    testID="tech-complete-job"
                  >
                    <Text style={styles.acceptBtnText}>
                      {t("booking.completeJob")}
                    </Text>
                  </Pressable>
                </View>
              )}

              {activeBooking.status === "in_progress" && (
                <View>
                  {!activeBooking.customerAcceptedWorkDone ? (
                    <View
                      style={styles.awaitingNoticeCard}
                      testID="tech-waiting-customer-approval"
                    >
                      <Text style={styles.awaitingNoticeText}>
                        {language === "en"
                          ? "⏳ Waiting for customer to accept that the work has been completed."
                          : "⏳ Menunggu pelanggan memeriksa dan menyetujui pekerjaan selesai."}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.approvedNoticeCard}>
                      <Text style={styles.approvedNoticeText}>
                        {language === "en"
                          ? "✓ Customer approved the work. You can now complete the job."
                          : "✓ Pelanggan telah menyetujui pekerjaan. Anda dapat menyelesaikan pesanan."}
                      </Text>
                    </View>
                  )}
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      if (!activeBooking.customerAcceptedWorkDone) {
                        setStatusError(
                          language === "en"
                            ? "Please wait for the customer to accept the completed work first."
                            : "Pelanggan harus memeriksa dan menyetujui pekerjaan selesai terlebih dahulu.",
                        );
                        return;
                      }
                      void handleTransition("completed", "technician");
                    }}
                    style={[
                      styles.acceptBtn,
                      !activeBooking.customerAcceptedWorkDone &&
                        styles.disabledBtn,
                    ]}
                    testID="tech-complete-job"
                  >
                    <Text style={styles.acceptBtnText}>
                      {t("booking.completeJob")}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}

        {/* Customer Actions & Pending State */}
        {isCustomer &&
          (activeBooking.status === "requested" ||
            activeBooking.status === "alternative_proposed" ||
            activeBooking.status === "confirmed" ||
            activeBooking.status === "in_progress") && (
            <View style={styles.actionGroup}>
              {activeBooking.status === "in_progress" && (
                <View
                  style={styles.customerNoticeCard}
                  testID="customer-work-done-card"
                >
                  <Text style={styles.customerNoticeTitle}>
                    {activeBooking.customerAcceptedWorkDone
                      ? language === "en"
                        ? "✓ Work Approved"
                        : "✓ Pekerjaan Telah Disetujui"
                      : language === "en"
                        ? "🔧 Review & Accept Completed Work"
                        : "🔧 Konfirmasi Pekerjaan Selesai"}
                  </Text>
                  <Text style={styles.customerNoticeBody}>
                    {activeBooking.customerAcceptedWorkDone
                      ? language === "en"
                        ? "You have approved that the technician completed the service. The technician can now complete the booking."
                        : "Anda telah menyetujui bahwa teknisi telah menyelesaikan perbaikan dengan baik. Teknisi sekarang dapat menutup pesanan."
                      : language === "en"
                        ? "Has the technician finished the work? Please review and confirm below so the order can be finalized."
                        : "Apakah teknisi telah menyelesaikan perbaikan dengan baik? Silakan setujui penyelesaian pekerjaan agar pesanan dapat diselesaikan."}
                  </Text>
                  {!activeBooking.customerAcceptedWorkDone && (
                    <Pressable
                      accessibilityRole="button"
                      onPress={async () => {
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
                          ? "✓ Accept Work Has Been Done"
                          : "✓ Setujui Pekerjaan Selesai"}
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
                  <Text style={styles.customerNoticeTitle}>
                    {language === "en"
                      ? "⏳ Waiting for Technician Confirmation"
                      : "⏳ Menunggu Konfirmasi Teknisi"}
                  </Text>
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
                  <View style={styles.actionRow}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        void handleTransition("confirmed", "customer");
                      }}
                      style={styles.acceptBtn}
                      testID="customer-accept-alternative"
                    >
                      <Text style={styles.acceptBtnText}>
                        {t("booking.acceptAlternative")}
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        void handleTransition("cancelled", "customer");
                      }}
                      style={styles.declineBtn}
                      testID="customer-cancel-booking"
                    >
                      <Text style={styles.declineBtnText}>
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

      {/* Booking-Specific Messaging */}
      <View
        style={[
          styles.chatCard,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
        testID="booking-chat-section"
      >
        <Text style={[styles.stepTitle, { color: palette.text }]}>
          {t("booking.chatTitle")}
        </Text>
        <View
          style={[
            styles.chatSecurityBanner,
            {
              backgroundColor: palette.surfaceElevated,
              borderColor: palette.border,
            },
          ]}
          testID="chat-security-banner"
        >
          <Text style={[styles.chatSecurityText, { color: palette.textMuted }]}>
            {language === "en"
              ? "🔒 Protected Chat: Sharing WhatsApp, phone numbers, emails, or links is strictly blocked."
              : "🔒 Chat Terlindungi: Dilarang membagikan nomor WhatsApp/telepon, email, atau tautan luar."}
          </Text>
        </View>
        {!isChatEnabledForStatus(activeBooking.status) ? (
          <Text
            style={[styles.chatLockedNote, { color: palette.textMuted }]}
            testID="booking-chat-locked"
          >
            {t("booking.chatLocked")}
          </Text>
        ) : (
          <>
            <View style={styles.messageList}>
              {messages.map((msg) => (
                <View
                  key={msg.id}
                  style={[
                    styles.messageBubble,
                    msg.senderRole === "customer"
                      ? { backgroundColor: palette.primarySoft }
                      : { backgroundColor: palette.surfaceElevated },
                  ]}
                >
                  <Text
                    style={[styles.messageSender, { color: palette.primary }]}
                  >
                    {msg.senderName}
                  </Text>
                  <Text style={[styles.messageBody, { color: palette.text }]}>
                    {msg.body}
                  </Text>
                </View>
              ))}
            </View>

            {chatError && (
              <Text
                accessibilityLiveRegion="polite"
                style={styles.errorText}
                testID="booking-chat-error"
              >
                {chatError}
              </Text>
            )}

            <View style={styles.chatInputRow}>
              <TextInput
                onChangeText={setChatInput}
                placeholder={t("booking.chatInputPlaceholder")}
                placeholderTextColor={palette.textMuted}
                style={[
                  styles.input,
                  styles.chatInputField,
                  {
                    backgroundColor: palette.surfaceElevated,
                    borderColor: palette.border,
                    color: palette.text,
                  },
                ]}
                testID="booking-chat-input"
                value={chatInput}
              />
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void handleSendMessage();
                }}
                style={styles.chatSendBtn}
                testID="booking-chat-send"
              >
                <Text style={styles.chatSendBtnText}>
                  {t("booking.sendChat")}
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </View>

      {/* Post-completion Review */}
      {activeBooking.status === "completed" && (
        <View style={styles.reviewFormCard} testID="booking-review-section">
          <Text style={styles.stepTitle}>{t("booking.reviewTitle")}</Text>
          {reviewSubmitted ? (
            <Text
              style={styles.reviewDoneText}
              testID="booking-review-submitted"
            >
              {t("booking.reviewSubmitted")}
            </Text>
          ) : (
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
                    <Text style={styles.starBtnText}>★ {star}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                multiline
                onChangeText={setReviewComment}
                placeholder={t("booking.reviewPlaceholder")}
                placeholderTextColor={colors.muted}
                style={[styles.input, styles.notesArea]}
                testID="booking-review-input"
                value={reviewComment}
              />
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void handleSubmitReview();
                }}
                style={styles.acceptBtn}
                testID="submit-booking-review"
              >
                <Text style={styles.acceptBtnText}>
                  {t("booking.submitReview")}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  lifecycleWrap: { gap: spacing.lg, marginTop: spacing.lg },
  statusCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.xl,
  },
  statusEyebrow: {
    color: colors.green,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  statusHeadline: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "800",
    marginTop: 4,
  },
  bookingMetaBox: {
    backgroundColor: colors.paper,
    borderRadius: radii.sm,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  bookingMetaLine: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  bookingMetaSub: { color: colors.muted, fontSize: 12, marginTop: 3 },
  proposedScheduleNote: {
    color: colors.orange,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 6,
  },
  stepTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  chip: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  chipSelected: {
    backgroundColor: colors.greenSoft,
    borderColor: colors.green,
  },
  chipText: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  chipTextSelected: { color: colors.greenDark, fontWeight: "800" },
  input: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 13,
    marginBottom: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  notesArea: { minHeight: 74, textAlignVertical: "top" },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "600",
    marginVertical: spacing.xs,
  },
  actionGroup: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
  },
  actionGroupTitle: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.7,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
  },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  acceptBtn: {
    alignItems: "center",
    backgroundColor: colors.greenDark,
    borderRadius: radii.sm,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: spacing.lg,
    paddingVertical: 9,
  },
  acceptBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  declineBtn: {
    alignItems: "center",
    backgroundColor: "#FBEDEA",
    borderColor: colors.danger,
    borderRadius: radii.sm,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: spacing.lg,
    paddingVertical: 9,
  },
  declineBtnText: { color: colors.danger, fontSize: 13, fontWeight: "800" },
  proposeRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  proposeInput: { flex: 1, marginBottom: 0 },
  proposeBtn: {
    alignItems: "center",
    backgroundColor: colors.orangeSoft,
    borderColor: colors.orange,
    borderRadius: radii.sm,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: spacing.md,
  },
  proposeBtnText: { color: colors.orange, fontSize: 12, fontWeight: "800" },
  chatCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.xl,
  },
  chatLockedNote: { color: colors.muted, fontSize: 13, lineHeight: 19 },
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
  messageBubbleCustomer: { backgroundColor: colors.greenSoft },
  messageBubbleTechnician: { backgroundColor: colors.paper },
  messageSender: { color: colors.greenDark, fontSize: 11, fontWeight: "800" },
  messageBody: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
  },
  chatInputRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  chatInputField: { flex: 1, marginBottom: 0 },
  chatSendBtn: {
    alignItems: "center",
    backgroundColor: colors.greenDark,
    borderRadius: radii.sm,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.lg,
  },
  chatSendBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  reviewFormCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.xl,
  },
  starsRow: { flexDirection: "row", gap: spacing.xs, marginBottom: spacing.sm },
  starBtn: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  starBtnActive: { backgroundColor: "#FFF4D6", borderColor: "#DCA63C" },
  starBtnText: { color: colors.ink, fontSize: 12, fontWeight: "800" },
  reviewDoneText: { color: colors.greenDark, fontSize: 13, fontWeight: "700" },
  customerNoticeCard: {
    backgroundColor: "#F8FAF8",
    borderColor: "#E2EBE2",
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.lg,
  },
  customerNoticeTitle: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  customerNoticeBody: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  customerConfirmedCard: {
    backgroundColor: "#F0F9F2",
    borderColor: "#C7E8CE",
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.lg,
  },
  customerConfirmedTitle: {
    color: colors.greenDark,
    fontSize: 14,
    fontWeight: "800",
  },
  customerConfirmedBody: {
    color: colors.ink,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  cancelBtn: {
    alignItems: "center",
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    justifyContent: "center",
    marginTop: spacing.md,
    minHeight: 38,
    paddingHorizontal: spacing.md,
  },
  cancelBtnText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  chatSecurityBanner: {
    backgroundColor: "#FFF8EB",
    borderColor: "#FCE7C5",
    borderRadius: radii.sm,
    borderWidth: 1,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chatSecurityText: {
    color: "#8A5A20",
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "600",
  },
  awaitingNoticeCard: {
    backgroundColor: "#FFF9E6",
    borderColor: "#FFE8A3",
    borderRadius: radii.sm,
    borderWidth: 1,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  awaitingNoticeText: {
    color: "#8A6A00",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
  },
  approvedNoticeCard: {
    backgroundColor: "#EBF7EE",
    borderColor: "#BFE7C7",
    borderRadius: radii.sm,
    borderWidth: 1,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  approvedNoticeText: {
    color: colors.greenDark,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  disabledBtn: { opacity: 0.5 },
});
