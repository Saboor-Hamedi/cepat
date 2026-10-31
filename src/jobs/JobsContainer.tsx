import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Avatar, EmptyState, LoadingState } from '../components/marketplace-ui';
import {
  TechnicianPostCard,
  TechnicianPostComposer,
} from '../components/TechnicianPostCard';
import { useAppearance } from '../context/AppearanceContext';
import {
  createTechnicianPost,
  loadTechnicianPosts,
} from '../data/postsStore';
import { localizeArea, useLanguage } from '../i18n/locale';
import { radii, spacing } from '../theme/tokens';
import type { BookingRecord, TechnicianPost } from '../types/marketplace';
import { JobActiveCard } from './components/JobActiveCard';
import { JobHistoryCard } from './components/JobHistoryCard';
import { JobProposeTimeModal } from './components/JobProposeTimeModal';
import { JobRequestCard } from './components/JobRequestCard';
import { JobsTabBar, type JobsTabKey } from './components/JobsTabBar';

export interface JobsContainerProps {
  bookings: BookingRecord[];
  loading?: boolean;
  onBookingAction: (
    bookingId: string,
    nextStatus: BookingRecord['status'],
    proposedStartAt?: string,
  ) => Promise<void>;
}

export function JobsContainer({
  bookings,
  loading = false,
  onBookingAction,
}: JobsContainerProps) {
  const { language } = useLanguage();
  const { palette, reduceMotion } = useAppearance();
  const [tab, setTab] = useState<JobsTabKey>('requests');
  const [selectedCustomerBooking, setSelectedCustomerBooking] =
    useState<BookingRecord | null>(null);
  const [proposingBooking, setProposingBooking] = useState<BookingRecord | null>(
    null,
  );
  const [proposedTimeMap, setProposedTimeMap] = useState<Record<string, string>>({});
  const [localPosts, setLocalPosts] = useState<TechnicianPost[]>([]);

  const incomingRequests = useMemo(
    () =>
      bookings.filter(
        (b) => b.status === 'requested' || b.status === 'alternative_proposed',
      ),
    [bookings],
  );

  const activeJobs = useMemo(
    () =>
      bookings.filter(
        (b) => b.status === 'confirmed' || b.status === 'in_progress',
      ),
    [bookings],
  );

  const historyJobs = useMemo(
    () =>
      bookings.filter((b) =>
        ['completed', 'cancelled', 'declined'].includes(b.status),
      ),
    [bookings],
  );

  const handleAccept = (bookingId: string) => {
    void onBookingAction(bookingId, 'confirmed');
  };

  const handleDecline = (bookingId: string) => {
    void onBookingAction(bookingId, 'declined');
  };

  const handleProposeTime = (bookingId: string, time: string) => {
    void onBookingAction(bookingId, 'alternative_proposed', time);
  };

  const handleOpenChat = (bookingId: string) => {
    router.push({ pathname: '/booking/[id]', params: { id: bookingId } });
  };

  const handleStartJob = (bookingId: string) => {
    void onBookingAction(bookingId, 'in_progress');
  };

  const handleCompleteJob = (bookingId: string) => {
    void onBookingAction(bookingId, 'completed');
  };

  return (
    <View style={styles.container}>
      <JobsTabBar
        activeTab={tab}
        onSelectTab={setTab}
        counts={{
          requests: incomingRequests.length,
          active: activeJobs.length,
          history: historyJobs.length,
        }}
      />

      {loading ? (
        <LoadingState label={language === 'en' ? 'Loading jobs...' : 'Memuat pekerjaan...'} />
      ) : tab === 'requests' ? (
        incomingRequests.length > 0 ? (
          incomingRequests.map((req) => (
            <JobRequestCard
              key={req.id}
              request={req}
              onAccept={handleAccept}
              onDecline={handleDecline}
              onProposeTime={handleProposeTime}
              onViewCustomer={setSelectedCustomerBooking}
              proposedTime={proposedTimeMap[req.id] ?? '2026-11-05 10:00 WIB'}
              onChangeProposedTime={(txt) =>
                setProposedTimeMap((prev) => ({ ...prev, [req.id]: txt }))
              }
            />
          ))
        ) : (
          <EmptyState
            title={
              language === 'en'
                ? 'No pending booking requests'
                : 'Belum ada permintaan baru'
            }
            description={
              language === 'en'
                ? 'New customer requests will appear here.'
                : 'Permintaan jadwal baru dari pelanggan akan muncul di sini.'
            }
          />
        )
      ) : tab === 'active' ? (
        activeJobs.length > 0 ? (
          activeJobs.map((job) => (
            <JobActiveCard
              key={job.id}
              job={job}
              onOpenChat={handleOpenChat}
              onStartJob={handleStartJob}
              onCompleteJob={handleCompleteJob}
              onViewCustomer={setSelectedCustomerBooking}
            />
          ))
        ) : (
          <EmptyState
            title={
              language === 'en' ? 'No active bookings' : 'Belum ada jadwal aktif'
            }
            description={
              language === 'en'
                ? 'Accepted requests will be listed here.'
                : 'Pesanan yang telah diterima akan tampil di sini.'
            }
          />
        )
      ) : tab === 'history' ? (
        historyJobs.length > 0 ? (
          historyJobs.map((job) => <JobHistoryCard key={job.id} job={job} />)
        ) : (
          <EmptyState
            title={
              language === 'en' ? 'No job history yet' : 'Belum ada riwayat'
            }
            description={
              language === 'en'
                ? 'Completed or cancelled jobs will appear here.'
                : 'Pekerjaan yang telah selesai atau dibatalkan akan tampil di sini.'
            }
          />
        )
      ) : (
        <View style={{ gap: spacing.md }}>
          <TechnicianPostComposer
            onCreatePost={async (input) => {
              const techId = 'demo-rizky';
              await createTechnicianPost({
                actorUserId: techId,
                technicianId: techId,
                technicianName: 'Rizky Pratama',
                caption: input.caption,
                imageUri: input.imageUri,
                mediaUrls: input.mediaUrls,
                isServicePost: input.isServicePost,
                serviceArea: 'Jakarta Selatan',
                categorySlug: 'plumbing',
                published: true,
              });
              const nextPosts = await loadTechnicianPosts(techId, true);
              setLocalPosts(nextPosts);
            }}
          />
          {localPosts.map((post) => (
            <TechnicianPostCard key={post.id} post={post} />
          ))}
        </View>
      )}

      {/* Propose Time Modal */}
      <JobProposeTimeModal
        visible={proposingBooking !== null}
        request={proposingBooking}
        onClose={() => setProposingBooking(null)}
        onSubmit={handleProposeTime}
      />

      {/* Customer Profile Detail Modal */}
      <Modal
        animationType={reduceMotion ? 'none' : 'fade'}
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
                  <Avatar name={selectedCustomerBooking.customerName} size={56} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.customerModalName, { color: palette.text }]}>
                      {selectedCustomerBooking.customerName}
                    </Text>
                    <Text style={[styles.customerModalBadge, { color: palette.textMuted }]}>
                      {language === 'en'
                        ? 'Customer on Cepat'
                        : 'Pelanggan Terverifikasi'}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.customerDetailSection,
                    { backgroundColor: palette.surfaceElevated, borderColor: palette.border },
                  ]}
                >
                  <Text style={[styles.customerDetailLabel, { color: palette.textMuted }]}>
                    {language === 'en' ? 'Service Area' : 'Area Layanan'}
                  </Text>
                  <Text style={[styles.customerDetailValue, { color: palette.text }]}>
                    {localizeArea(selectedCustomerBooking.serviceArea, language)}
                  </Text>

                  <Text style={[styles.customerDetailLabel, { color: palette.textMuted }]}>
                    {language === 'en' ? 'Delivery Address' : 'Alamat Pengiriman'}
                  </Text>
                  <Text style={[styles.customerDetailValue, { color: palette.text }]}>
                    {['confirmed', 'in_progress', 'completed'].includes(
                      selectedCustomerBooking.status,
                    )
                      ? selectedCustomerBooking.customerAddress
                      : language === 'en'
                        ? 'Protected until request is accepted.'
                        : 'Alamat lengkap dirahasiakan sebelum pesanan diterima.'}
                  </Text>

                  {selectedCustomerBooking.addressNotes && (
                    <>
                      <Text style={[styles.customerDetailLabel, { color: palette.textMuted }]}>
                        {language === 'en' ? 'Address Notes' : 'Catatan Lokasi'}
                      </Text>
                      <Text style={[styles.customerDetailValue, { color: palette.text }]}>
                        {selectedCustomerBooking.addressNotes}
                      </Text>
                    </>
                  )}
                </View>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => setSelectedCustomerBooking(null)}
                  style={[styles.closeModalBtn, { borderColor: palette.border }]}
                  testID="close-customer-profile-modal"
                >
                  <Text style={[styles.closeModalBtnText, { color: palette.text }]}>
                    {language === 'en' ? 'Close' : 'Tutup'}
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

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  customerModalCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    maxWidth: 440,
    padding: spacing.xl,
    width: '100%',
  },
  customerModalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  customerModalName: {
    fontSize: 18,
    fontWeight: '800',
  },
  customerModalBadge: {
    fontSize: 12,
    marginTop: 2,
  },
  customerDetailSection: {
    borderRadius: radii.sm,
    borderWidth: 1,
    marginBottom: spacing.lg,
    padding: spacing.md,
  },
  customerDetailLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  customerDetailValue: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: spacing.xs,
    marginTop: 2,
  },
  closeModalBtn: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  closeModalBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
